import "jsr:@supabase/functions-js/edge-runtime.d.ts";

declare const Deno: any;

interface PlaylistItem {
  title: string;
  videoId: string;
  thumbnail: string;
  channelName: string;
  uploadDate: string;
  url: string;
}

interface FetchPlaylistRequest {
  playlistId: string;
  apiKey: string;
  maxResults?: number;
  pageToken?: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    console.log('[fetch_youtube_playlist] Incoming request:', {
      method: req.method,
      hasAuthHeader: !!req.headers.get('authorization'),
      contentType: req.headers.get('content-type'),
    });

    const { playlistId, apiKey, maxResults = 50, pageToken } = await req.json() as FetchPlaylistRequest;

    console.log('[fetch_youtube_playlist] Parsed body:', {
      playlistId,
      apiKeyProvided: !!apiKey,
      maxResults,
      pageTokenProvided: !!pageToken,
    });

    if (!playlistId || !apiKey) {
      console.log('[fetch_youtube_playlist] Missing required parameters');
      return new Response(
        JSON.stringify({
          error: "Missing required parameters: playlistId and apiKey",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
    url.searchParams.append("part", "snippet");
    url.searchParams.append("playlistId", playlistId);
    url.searchParams.append("maxResults", Math.min(maxResults, 50).toString());
    url.searchParams.append("key", apiKey);
    if (pageToken) {
      url.searchParams.append("pageToken", pageToken);
    }

    const loggedUrl = url.toString().replace(apiKey, '***REDACTED***');
    console.log('[fetch_youtube_playlist] YouTube request URL:', loggedUrl);

    const response = await fetch(url.toString());

    console.log('[fetch_youtube_playlist] YouTube response:', {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.log('[fetch_youtube_playlist] YouTube error body (raw):', errorText);
      const errorData = (() => {
        try {
          return JSON.parse(errorText || '{}');
        } catch {
          return {};
        }
      })() as any;

      const errorMessage = errorData?.error?.message || "Failed to fetch YouTube playlist";
      console.log('[fetch_youtube_playlist] YouTube error parsed:', { errorMessage, errorData });

      if (response.status === 404) {
        return new Response(
          JSON.stringify({
            error: "Playlist not found. Please check the playlist URL or ID.",
            code: "PLAYLIST_NOT_FOUND",
          }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (response.status === 403) {
        if (errorMessage.includes("quota")) {
          return new Response(
            JSON.stringify({
              error: "YouTube API quota exceeded. Please try again later.",
              code: "QUOTA_EXCEEDED",
            }),
            {
              status: 403,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        return new Response(
          JSON.stringify({
            error: "Invalid API key or insufficient permissions.",
            code: "INVALID_API_KEY",
          }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      throw new Error(`YouTube API error: ${errorMessage}`);
    }

    const text = await response.text().catch(() => '');
    console.log('[fetch_youtube_playlist] YouTube body (raw):', text);
    const data = (() => {
      try {
        return JSON.parse(text || '{}');
      } catch {
        return {};
      }
    })() as any;
    const items: PlaylistItem[] = (data.items || []).map((item: any) => {
      const snippet = item.snippet;
      return {
        title: snippet.title || "Untitled",
        videoId: snippet.resourceId?.videoId || "",
        thumbnail: snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url || "",
        channelName: snippet.channelTitle || "Unknown Channel",
        uploadDate: snippet.publishedAt || new Date().toISOString(),
        url: `https://www.youtube.com/watch?v=${snippet.resourceId?.videoId}`,
      };
    });

    return new Response(
      JSON.stringify({
        items,
        nextPageToken: data.nextPageToken || null,
        totalResults: data.pageInfo?.totalResults || 0,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error('[fetch_youtube_playlist] Error (full details):', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
        code: "INTERNAL_ERROR",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
