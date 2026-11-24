import { drawReframedFrame, resolveActiveCaption } from "./frameRenderer";
import {
  interpolateFrameState,
  type FocusKeyframe,
  type TimedCaption,
} from "./videoAnalyzer";

export { FILTER_PRESETS, type FilterPreset } from "./frameRenderer";

export interface ExportShortOptions {
  videoUrl: string;
  startSec: number;
  durationSec: number;
  keyframes: FocusKeyframe[];
  fallbackCropXPercent: number;
  autoTrackEnabled: boolean;
  zoomMultiplier: number;
  filterCss: string;
  caption: string;
  timedCaptions?: TimedCaption[];
  musicUrl?: string | null;
  musicVolume?: number;
  onProgress: (percent: number) => void;
  signal: AbortSignal;
}

export interface ExportedShortResult {
  url: string;
  blob: Blob;
  filename: string;
  mimeType: string;
  durationSec: number;
  suggestedTitle?: string;
  suggestedDescription?: string;
  thumbnailHook?: string;
  scheduledPublishAt?: string;
  seriesLabel?: string;
}

function getSupportedMimeType(): string {
  const candidates = [
    "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
    "video/mp4",
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];

  for (const type of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return "";
}

/**
 * Renders a 1080x1920 Full HD 9:16 vertical Podcast Short directly in the browser
 * at 10 Mbps using the shared drawReframedFrame pipeline (speaker tracking,
 * sharpening filter, optional music mix, and timed captions).
 */
export async function exportVerticalShort(
  options: ExportShortOptions
): Promise<ExportedShortResult> {
  const {
    videoUrl,
    startSec,
    durationSec,
    keyframes,
    fallbackCropXPercent,
    autoTrackEnabled,
    zoomMultiplier,
    filterCss,
    caption,
    timedCaptions,
    musicUrl,
    musicVolume = 0.16,
    onProgress,
    signal,
  } = options;

  if (typeof MediaRecorder === "undefined") {
    throw new Error("Video-export wordt in deze browser niet ondersteund.");
  }

  const width = 1080;
  const height = 1920;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Kan geen tekencontext openen voor de video-export.");
  }

  const video = document.createElement("video");
  video.src = videoUrl;
  video.playsInline = true;
  video.preload = "auto";
  video.muted = false;

  let musicAudio: HTMLAudioElement | null = null;
  if (musicUrl) {
    musicAudio = document.createElement("audio");
    musicAudio.src = musicUrl;
    musicAudio.loop = true;
    musicAudio.preload = "auto";
  }

  const waitForEvent = (el: HTMLMediaElement, eventName: string) =>
    new Promise<void>((resolve, reject) => {
      const onDone = () => {
        cleanup();
        resolve();
      };
      const onError = () => {
        cleanup();
        reject(new Error("Mediabestand kon niet worden geladen voor export."));
      };
      const onAbort = () => {
        cleanup();
        reject(new Error("Export geannuleerd."));
      };
      const cleanup = () => {
        el.removeEventListener(eventName, onDone);
        el.removeEventListener("error", onError);
        signal.removeEventListener("abort", onAbort);
      };
      el.addEventListener(eventName, onDone, { once: true });
      el.addEventListener("error", onError, { once: true });
      signal.addEventListener("abort", onAbort, { once: true });
    });

  if (signal.aborted) {
    throw new Error("Export geannuleerd.");
  }

  await waitForEvent(video, "loadedmetadata");
  if (musicAudio) {
    await waitForEvent(musicAudio, "canplay").catch(() => {});
  }

  const safeStart = Math.max(0, Math.min(startSec, Math.max(0, video.duration - 1)));
  const endSec = Math.min(video.duration, safeStart + durationSec);
  const actualDuration = Math.max(1, endSec - safeStart);

  video.currentTime = safeStart;
  await waitForEvent(video, "seeked");

  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;

  let audioCtx: AudioContext | null = null;
  let audioTracks: MediaStreamTrack[] = [];

  if (AudioCtx) {
    try {
      audioCtx = new AudioCtx();
      await audioCtx.resume().catch(() => {});
      const dest = audioCtx.createMediaStreamDestination();

      const videoSource = audioCtx.createMediaElementSource(video);
      const videoGain = audioCtx.createGain();
      videoGain.gain.value = musicAudio ? 0.94 : 1.0;
      videoSource.connect(videoGain);
      videoGain.connect(dest);

      if (musicAudio) {
        const musicSource = audioCtx.createMediaElementSource(musicAudio);
        const musicGain = audioCtx.createGain();
        musicGain.gain.value = musicVolume;
        musicSource.connect(musicGain);
        musicGain.connect(dest);
      }

      audioTracks = dest.stream.getAudioTracks();
    } catch {
      audioTracks = [];
    }
  }

  const canvasStream = canvas.captureStream(30);
  const combinedStream = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...audioTracks,
  ]);

  const mimeType = getSupportedMimeType();
  const recorder = mimeType
    ? new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: 10_000_000,
      })
    : new MediaRecorder(combinedStream, { videoBitsPerSecond: 10_000_000 });

  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      chunks.push(e.data);
    }
  };

  const drawCurrentFrame = () => {
    const baseState = autoTrackEnabled
      ? interpolateFrameState(
          keyframes,
          video.currentTime,
          fallbackCropXPercent,
          38,
          1.12
        )
      : {
          timeSec: video.currentTime,
          focusXPercent: fallbackCropXPercent,
          focusYPercent: 38,
          zoom: 1,
        };

    const adjustedState: FocusKeyframe = {
      ...baseState,
      zoom: Math.max(1, Math.min(1.9, baseState.zoom * zoomMultiplier)),
    };

    const activeCaption = resolveActiveCaption(
      timedCaptions,
      video.currentTime,
      caption
    );

    drawReframedFrame(
      ctx,
      video,
      width,
      height,
      adjustedState,
      filterCss,
      activeCaption
    );
  };

  return new Promise<ExportedShortResult>((resolve, reject) => {
    let rafId = 0;
    let settled = false;

    const cleanup = () => {
      if (rafId) cancelAnimationFrame(rafId);
      signal.removeEventListener("abort", handleAbort);
      video.pause();
      video.removeAttribute("src");
      video.load();
      if (musicAudio) {
        musicAudio.pause();
        musicAudio.removeAttribute("src");
        musicAudio.load();
      }
      combinedStream.getTracks().forEach((t) => t.stop());
      if (audioCtx) {
        audioCtx.close().catch(() => {});
      }
    };

    const handleAbort = () => {
      if (settled) return;
      settled = true;
      if (recorder.state !== "inactive") {
        recorder.stop();
      }
      cleanup();
      reject(new Error("Export geannuleerd."));
    };

    signal.addEventListener("abort", handleAbort, { once: true });

    recorder.onstop = () => {
      if (settled) return;
      settled = true;
      const finalMime = recorder.mimeType || mimeType || "video/webm";
      const blob = new Blob(chunks, { type: finalMime });
      const ext = finalMime.includes("mp4") ? "mp4" : "webm";
      const url = URL.createObjectURL(blob);
      cleanup();
      onProgress(100);
      resolve({
        url,
        blob,
        filename: `podcast-short-${Math.round(safeStart)}s.${ext}`,
        mimeType: finalMime,
        durationSec: actualDuration,
      });
    };

    recorder.onerror = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error("Er ging iets mis tijdens het opnemen van de Short."));
    };

    const tick = () => {
      if (settled || signal.aborted) return;
      drawCurrentFrame();
      const elapsed = Math.max(0, video.currentTime - safeStart);
      const pct = Math.min(99, Math.round((elapsed / actualDuration) * 100));
      onProgress(pct);

      if (video.currentTime >= endSec || video.ended) {
        if (recorder.state === "recording") {
          recorder.stop();
        }
        return;
      }
      rafId = requestAnimationFrame(tick);
    };

    drawCurrentFrame();
    recorder.start(200);
    if (musicAudio) {
      musicAudio.currentTime = 0;
      musicAudio.play().catch(() => {});
    }
    video
      .play()
      .then(() => {
        rafId = requestAnimationFrame(tick);
      })
      .catch(() => {
        if (!settled) {
          settled = true;
          if (recorder.state !== "inactive") recorder.stop();
          cleanup();
          reject(
            new Error(
              "Video kon niet automatisch worden afgespeeld voor export. Probeer een ander MP4/WebM-bestand."
            )
          );
        }
      });
  });
}
