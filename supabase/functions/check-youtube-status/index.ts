import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4?dts";

declare const Deno: any;

type VideoAvailability = "available" | "unavailable" | "private";

type SceneRow = {
  id: string;
  video_id: string | null;
  status: string | null;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, X-Sync-Token",
};

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function normalizeStatus(raw: unknown): VideoAvailability {
  if (raw === "available") return "available";
  if (raw === "private") return "private";
  return "unavailable";
}

async function fetchYouTubeBatch(videoIds: string[], apiKey: string): Promise<Record<string, VideoAvailability>> {
  const url = new URL("https://www.googleapis.com/youtube/v3/videos");
  url.searchParams.append("part", "status");
  url.searchParams.append("id", videoIds.join(","));
  url.searchParams.append("key", apiKey);

  const response = await fetch(url.toString());

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = String((errorData as any)?.error?.message || "Unknown error");

    if (response.status === 403 && errorMessage.toLowerCase().includes("quota")) {
      throw new Error("QUOTA_EXCEEDED");
    }

    if (response.status === 403) {
      throw new Error("INVALID_API_KEY");
    }

    throw new Error(errorMessage);
  }

  const data = await response.json();
  const items = Array.isArray(data?.items) ? data.items : [];

  const byId: Record<string, VideoAvailability> = {};

  for (const item of items) {
    const id = String(item?.id || "").trim();
    if (!id) continue;

    const privacyStatus = item?.status?.privacyStatus;
    if (privacyStatus === "private") {
      byId[id] = "private";
    } else {
      byId[id] = "available";
    }
  }

  for (const requested of videoIds) {
    if (!byId[requested]) byId[requested] = "unavailable";
  }

  return byId;
}

async function tryWriteLastCheckTimestamp(supabase: any, checkedAtIso: string) {
  const runsTable = Deno.env.get("YOUTUBE_STATUS_RUNS_TABLE") || "";
  if (!runsTable) return;

  try {
    const { error } = await supabase
      .from(runsTable)
      .upsert({ id: "youtube", last_checked_at: checkedAtIso }, { onConflict: "id" });

    if (error) console.warn("Failed to write last check timestamp:", error);
  } catch (e) {
    console.warn("Failed to write last check timestamp:", e);
  }
}

async function maybeSendNotification(payload: any) {
  const webhookUrl = Deno.env.get("STATUS_ALERT_WEBHOOK_URL") || "";
  if (!webhookUrl) return;

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.warn("Notification webhook failed:", e);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const startedAt = Date.now();

  try {
    const expectedToken = Deno.env.get("CHECK_YOUTUBE_STATUS_TOKEN") || "";
    const providedToken = req.headers.get("X-Sync-Token") || "";

    if (expectedToken && providedToken !== expectedToken) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const youtubeApiKey = Deno.env.get("YOUTUBE_API_KEY") || "";

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!youtubeApiKey) {
      return new Response(JSON.stringify({ error: "Missing YOUTUBE_API_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data, error } = await supabase
      .from("scenes")
      .select("id, video_id, status")
      .eq("platform", "YouTube")
      .not("video_id", "is", null);

    if (error) throw error;

    const rows: SceneRow[] = Array.isArray(data) ? data : [];
    const uniqueVideoIds = Array.from(new Set(rows.map((r) => String(r.video_id || "").trim()).filter(Boolean)));

    console.log("check-youtube-status: fetched scenes:", rows.length, "unique videos:", uniqueVideoIds.length);

    if (uniqueVideoIds.length === 0) {
      return new Response(JSON.stringify({ checked: 0, updated: 0, durationMs: Date.now() - startedAt }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const checkedAtIso = new Date().toISOString();

    let quotaExceeded = false;
    let checkedVideos = 0;

    let becameUnavailableCount = 0;
    let becamePrivateCount = 0;

    const updates: Array<{ id: string; status: VideoAvailability; updated_at: string }> = [];

    const batches = chunk(uniqueVideoIds, 50);

    for (const batch of batches) {
      let statuses: Record<string, VideoAvailability>;

      try {
        statuses = await fetchYouTubeBatch(batch, youtubeApiKey);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg === "QUOTA_EXCEEDED") {
          quotaExceeded = true;
          console.warn("check-youtube-status: quota exceeded; stopping early");
          break;
        }
        throw e;
      }

      checkedVideos += batch.length;

      for (const row of rows) {
        const vid = String(row.video_id || "").trim();
        if (!vid) continue;
        if (!batch.includes(vid)) continue;

        const nextStatus = normalizeStatus(statuses[vid]);
        const prevStatus = normalizeStatus(row.status);

        if (prevStatus === "available" && nextStatus === "unavailable") becameUnavailableCount += 1;
        if (prevStatus === "available" && nextStatus === "private") becamePrivateCount += 1;

        updates.push({ id: row.id, status: nextStatus, updated_at: checkedAtIso });
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    if (updates.length > 0) {
      const updateBatches = chunk(updates, 500);
      for (const b of updateBatches) {
        const { error: upsertError } = await supabase.from("scenes").upsert(b, { onConflict: "id" });
        if (upsertError) throw upsertError;
      }
    }

    await tryWriteLastCheckTimestamp(supabase, checkedAtIso);

    const alertThreshold = Number(Deno.env.get("STATUS_ALERT_THRESHOLD") || "25");
    const manyBecameUnavailable = becameUnavailableCount + becamePrivateCount;

    if (manyBecameUnavailable >= alertThreshold) {
      await maybeSendNotification({
        type: "youtube_status_alert",
        checkedAt: checkedAtIso,
        checkedVideos,
        becameUnavailable: becameUnavailableCount,
        becamePrivate: becamePrivateCount,
        note: "Many videos changed from available to unavailable/private.",
      });
    }

    const result = {
      checkedVideos,
      updatedScenes: updates.length,
      quotaExceeded,
      becameUnavailable: becameUnavailableCount,
      becamePrivate: becamePrivateCount,
      checkedAt: checkedAtIso,
      durationMs: Date.now() - startedAt,
    };

    console.log("check-youtube-status summary:", result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("check-youtube-status error:", err);

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
