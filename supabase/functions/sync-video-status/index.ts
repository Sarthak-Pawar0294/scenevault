import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

type VideoAvailability = "available" | "unavailable" | "private";

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

async function fetchYouTubeStatuses(videoIds: string[], apiKey: string): Promise<Record<string, VideoAvailability>> {
  const url = new URL("https://www.googleapis.com/youtube/v3/videos");
  url.searchParams.append("part", "status");
  url.searchParams.append("id", videoIds.join(","));
  url.searchParams.append("key", apiKey);

  const response = await fetch(url.toString());

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = (errorData as any)?.error?.message || "Unknown error";

    if (response.status === 403 && String(errorMessage).toLowerCase().includes("quota")) {
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
    const id = item?.id;
    const privacy = item?.status?.privacyStatus;

    if (!id) continue;

    if (privacy === "private") {
      byId[id] = "private";
      continue;
    }

    byId[id] = "available";
  }

  for (const requestedId of videoIds) {
    if (!byId[requestedId]) byId[requestedId] = "unavailable";
  }

  return byId;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const expectedToken = Deno.env.get("SYNC_VIDEO_STATUS_TOKEN") || "";
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
      .select("video_id")
      .eq("platform", "YouTube")
      .not("video_id", "is", null);

    if (error) throw error;

    const allVideoIds = Array.from(
      new Set((data || []).map((r: any) => String(r.video_id || "").trim()).filter(Boolean)),
    );

    if (allVideoIds.length === 0) {
      return new Response(JSON.stringify({ checked: 0, updated: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const batches = chunk(allVideoIds, 50);

    let updated = 0;
    const nowIso = new Date().toISOString();

    for (const batch of batches) {
      const statuses = await fetchYouTubeStatuses(batch, youtubeApiKey);

      for (const videoId of batch) {
        const status = statuses[videoId] || "unavailable";

        const { error: updateError } = await supabase
          .from("scenes")
          .update({ status, updated_at: nowIso })
          .eq("platform", "YouTube")
          .eq("video_id", videoId);

        if (updateError) throw updateError;
        updated += 1;
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return new Response(
      JSON.stringify({ checked: allVideoIds.length, updated }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
