export interface YouTubeChannelInfo {
  id: string;
  title: string;
  customUrl?: string;
  thumbnailUrl?: string;
}

export type YouTubePrivacyStatus = "private" | "unlisted" | "public";

export interface UploadShortOptions {
  accessToken: string;
  expectedChannelId: string;
  blob: Blob;
  title: string;
  description: string;
  privacyStatus: YouTubePrivacyStatus;
  scheduledPublishAt?: string;
  onProgress: (percent: number) => void;
}

export interface UploadedShortResult {
  videoId: string;
  watchUrl: string;
  studioUrl: string;
  channelId: string;
  channelTitle: string;
  privacyStatus: YouTubePrivacyStatus;
  publishAt?: string;
}

interface RawChannelItem {
  id: string;
  snippet?: {
    title?: string;
    customUrl?: string;
    thumbnails?: {
      default?: { url?: string };
      medium?: { url?: string };
    };
  };
}

function mapChannelItem(item: RawChannelItem): YouTubeChannelInfo {
  return {
    id: item.id,
    title: item.snippet?.title || "Naamloos kanaal",
    customUrl: item.snippet?.customUrl,
    thumbnailUrl:
      item.snippet?.thumbnails?.medium?.url ||
      item.snippet?.thumbnails?.default?.url,
  };
}

export async function fetchAuthenticatedChannels(
  accessToken: string
): Promise<YouTubeChannelInfo[]> {
  const res = await fetch(
    "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (res.status === 401) {
    throw new Error("De YouTube-sessie is verlopen. Koppel je account opnieuw.");
  }

  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    const msg =
      errBody?.error?.message ||
      `Kon gekoppeld YouTube-kanaal niet ophalen (HTTP ${res.status}).`;
    throw new Error(msg);
  }

  const data = (await res.json()) as { items?: RawChannelItem[] };
  return (data.items || []).map(mapChannelItem);
}

export interface YouTubeVideoItem {
  id: string;
  title: string;
  publishedAt: string;
  durationSec: number;
  durationLabel: string;
  thumbnailUrl?: string;
  watchUrl: string;
}

export interface ResolvedChannelWithVideos {
  channel: YouTubeChannelInfo;
  videos: YouTubeVideoItem[];
}

export async function resolveSourceChannelByInput(
  accessToken: string,
  input: string
): Promise<YouTubeChannelInfo | null> {
  const result = await fetchChannelWithRecentVideos(accessToken, input, 0);
  return result?.channel || null;
}

function parseIso8601DurationSeconds(iso: string | undefined): number {
  if (!iso) return 0;
  const match = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i);
  if (!match) return 0;
  const hours = Number(match[1] || 0);
  const mins = Number(match[2] || 0);
  const secs = Number(match[3] || 0);
  return hours * 3600 + mins * 60 + secs;
}

function formatDurationLabel(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (hours > 0) {
    return `${hours}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export async function fetchChannelWithRecentVideos(
  accessToken: string,
  input: string,
  maxResults = 8,
  minDurationSec = 181
): Promise<ResolvedChannelWithVideos | null> {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const params = new URLSearchParams({ part: "snippet,contentDetails" });

  const channelIdMatch =
    trimmed.match(/youtube\.com\/channel\/(UC[a-zA-Z0-9_-]+)/i) ||
    trimmed.match(/^(UC[a-zA-Z0-9_-]{20,})$/);

  const handleMatch =
    trimmed.match(/youtube\.com\/@([a-zA-Z0-9._-]+)/i) ||
    trimmed.match(/^@([a-zA-Z0-9._-]+)$/);

  if (channelIdMatch) {
    params.set("id", channelIdMatch[1]);
  } else if (handleMatch) {
    params.set("forHandle", `@${handleMatch[1]}`);
  } else {
    return null;
  }

  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!res.ok) {
    throw new Error(`Kanaal ophalen mislukt (HTTP ${res.status}).`);
  }

  const data = (await res.json()) as {
    items?: Array<
      RawChannelItem & {
        contentDetails?: {
          relatedPlaylists?: { uploads?: string };
        };
      }
    >;
  };

  const first = data.items?.[0];
  if (!first) return null;

  const channel = mapChannelItem(first);
  const uploadsPlaylistId = first.contentDetails?.relatedPlaylists?.uploads;

  if (!uploadsPlaylistId || maxResults <= 0) {
    return { channel, videos: [] };
  }

  const longVideos: YouTubeVideoItem[] = [];
  let pageToken: string | undefined;
  let pagesChecked = 0;

  while (longVideos.length < maxResults && pagesChecked < 4) {
    pagesChecked++;
    const plParams = new URLSearchParams({
      part: "contentDetails",
      playlistId: uploadsPlaylistId,
      maxResults: "50",
    });
    if (pageToken) {
      plParams.set("pageToken", pageToken);
    }

    const plRes = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?${plParams.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!plRes.ok) {
      break;
    }

    const plData = (await plRes.json()) as {
      nextPageToken?: string;
      items?: Array<{
        contentDetails?: { videoId?: string };
      }>;
    };

    const pageVideoIds = (plData.items || [])
      .map((item) => item.contentDetails?.videoId || "")
      .filter(Boolean);

    if (pageVideoIds.length === 0) {
      break;
    }

    const vidParams = new URLSearchParams({
      part: "snippet,contentDetails",
      id: pageVideoIds.join(","),
    });

    const vidRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?${vidParams.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (vidRes.ok) {
      const vidData = (await vidRes.json()) as {
        items?: Array<{
          id?: string;
          snippet?: {
            title?: string;
            publishedAt?: string;
            liveBroadcastContent?: string;
            thumbnails?: {
              medium?: { url?: string };
              default?: { url?: string };
            };
          };
          contentDetails?: {
            duration?: string;
          };
        }>;
      };

      for (const item of vidData.items || []) {
        if (longVideos.length >= maxResults) break;
        const videoId = item.id || "";
        if (!videoId) continue;

        const durationSec = parseIso8601DurationSeconds(
          item.contentDetails?.duration
        );
        if (durationSec < minDurationSec) continue;

        longVideos.push({
          id: videoId,
          title: item.snippet?.title || "Zonder titel",
          publishedAt: item.snippet?.publishedAt || "",
          durationSec,
          durationLabel: formatDurationLabel(durationSec),
          thumbnailUrl:
            item.snippet?.thumbnails?.medium?.url ||
            item.snippet?.thumbnails?.default?.url,
          watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
        });
      }
    }

    if (!plData.nextPageToken) {
      break;
    }
    pageToken = plData.nextPageToken;
  }

  return { channel, videos: longVideos };
}

export async function uploadShortToYouTube(
  options: UploadShortOptions
): Promise<UploadedShortResult> {
  const {
    accessToken,
    expectedChannelId,
    blob,
    title,
    description,
    privacyStatus,
    scheduledPublishAt,
    onProgress,
  } = options;

  // Channel Identity Guard: re-verify active OAuth credential resolves to expected destination channel
  const channels = await fetchAuthenticatedChannels(accessToken);
  const verifiedChannel = channels.find((c) => c.id === expectedChannelId);
  if (!verifiedChannel) {
    throw new Error(
      "Kanaalverificatie mislukt: het actieve Google-account komt niet overeen met het bevestigde doelkanaal."
    );
  }

  const effectivePrivacy: YouTubePrivacyStatus = scheduledPublishAt
    ? "private"
    : privacyStatus;

  const metadata = {
    snippet: {
      title: title.trim(),
      description: description.trim(),
      categoryId: "22", // People & Blogs / Podcast clips
    },
    status: {
      privacyStatus: effectivePrivacy,
      ...(scheduledPublishAt ? { publishAt: scheduledPublishAt } : {}),
      selfDeclaredMadeForKids: false,
    },
  };

  onProgress(5);

  const initRes = await fetch(
    "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Length": String(blob.size),
        "X-Upload-Content-Type": blob.type || "video/webm",
      },
      body: JSON.stringify(metadata),
    }
  );

  if (!initRes.ok) {
    const errBody = await initRes.json().catch(() => null);
    const msg =
      errBody?.error?.message ||
      `Upload starten mislukt (HTTP ${initRes.status}).`;
    throw new Error(msg);
  }

  const uploadUrl = initRes.headers.get("Location");
  if (!uploadUrl) {
    throw new Error("Geen upload-URL ontvangen van de YouTube API.");
  }

  const uploaded = await new Promise<{ id: string }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl, true);
    xhr.setRequestHeader("Content-Type", blob.type || "video/webm");

    xhr.upload.onprogress = (evt) => {
      if (evt.lengthComputable && evt.total > 0) {
        const pct = 5 + Math.round((evt.loaded / evt.total) * 93);
        onProgress(Math.min(98, pct));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const json = JSON.parse(xhr.responseText) as { id?: string };
          if (!json.id) {
            reject(new Error("Upload afgerond, maar geen video-ID ontvangen."));
            return;
          }
          resolve({ id: json.id });
        } catch {
          reject(new Error("Ongeldig antwoord ontvangen na upload."));
        }
      } else {
        reject(new Error(`Upload afgebroken door YouTube (HTTP ${xhr.status}).`));
      }
    };

    xhr.onerror = () => {
      reject(new Error("Netwerkfout tijdens het uploaden naar YouTube."));
    };

    xhr.send(blob);
  });

  onProgress(100);

  return {
    videoId: uploaded.id,
    watchUrl: `https://youtube.com/shorts/${uploaded.id}`,
    studioUrl: `https://studio.youtube.com/video/${uploaded.id}/edit`,
    channelId: verifiedChannel.id,
    channelTitle: verifiedChannel.title,
    privacyStatus: effectivePrivacy,
    publishAt: scheduledPublishAt,
  };
}
