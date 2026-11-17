import { FilesetResolver, ObjectDetector } from "@mediapipe/tasks-vision";
import { extractPodcastAudioChunks } from "./audioExtractor";

export interface FocusKeyframe {
  timeSec: number;
  focusXPercent: number;
  focusYPercent: number;
  zoom: number;
}

export interface TimedCaption {
  startSec: number;
  endSec: number;
  text: string;
}

export interface ViralityScores {
  hook: number;
  retentionPacing: number;
  shareabilityEmotion: number;
  standalone: number;
}

export interface PodcastClipMoment {
  id: string;
  title: string;
  hookType: string;
  hookQuote: string;
  startSec: number;
  endSec: number;
  durationSec: number;
  viralScore: number;
  scores: ViralityScores;
  reason: string;
  captions: TimedCaption[];
  trackingMode: "mediapipe-speaker" | "grid-motion";
  keyframes: FocusKeyframe[];
}

export interface PodcastAnalysisResult {
  language: string;
  transcript: string;
  filteredOutCount: number;
  durationSec: number;
  width: number;
  height: number;
  trackingMode: "mediapipe-speaker" | "grid-motion";
  clips: PodcastClipMoment[];
}

export interface VideoMetadata {
  durationSec: number;
  width: number;
  height: number;
}

let cachedDetector: ObjectDetector | null = null;
let detectorAttempted = false;

async function getPersonDetector(): Promise<ObjectDetector | null> {
  if (cachedDetector) return cachedDetector;
  if (detectorAttempted) return null;
  detectorAttempted = true;

  try {
    const timeoutPromise = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), 12000)
    );

    const loadPromise = (async () => {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/wasm"
      );
      return ObjectDetector.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite",
          delegate: "GPU",
        },
        runningMode: "IMAGE",
        categoryAllowlist: ["person"],
        scoreThreshold: 0.25,
        maxResults: 8,
      });
    })();

    cachedDetector = await Promise.race([loadPromise, timeoutPromise]);
    return cachedDetector;
  } catch {
    return null;
  }
}

export function interpolateFrameState(
  keyframes: FocusKeyframe[],
  currentTimeSec: number,
  fallbackX = 50,
  fallbackY = 40,
  fallbackZoom = 1.12
): FocusKeyframe {
  if (!keyframes || keyframes.length === 0) {
    return {
      timeSec: currentTimeSec,
      focusXPercent: fallbackX,
      focusYPercent: fallbackY,
      zoom: fallbackZoom,
    };
  }
  if (currentTimeSec <= keyframes[0].timeSec) return keyframes[0];
  if (currentTimeSec >= keyframes[keyframes.length - 1].timeSec) {
    return keyframes[keyframes.length - 1];
  }

  for (let i = 0; i < keyframes.length - 1; i++) {
    const a = keyframes[i];
    const b = keyframes[i + 1];
    if (currentTimeSec >= a.timeSec && currentTimeSec <= b.timeSec) {
      const span = Math.max(0.001, b.timeSec - a.timeSec);
      const t = (currentTimeSec - a.timeSec) / span;
      const eased = t * t * (3 - 2 * t);
      return {
        timeSec: currentTimeSec,
        focusXPercent: a.focusXPercent + (b.focusXPercent - a.focusXPercent) * eased,
        focusYPercent: a.focusYPercent + (b.focusYPercent - a.focusYPercent) * eased,
        zoom: a.zoom + (b.zoom - a.zoom) * eased,
      };
    }
  }

  return {
    timeSec: currentTimeSec,
    focusXPercent: fallbackX,
    focusYPercent: fallbackY,
    zoom: fallbackZoom,
  };
}

export async function probeVideoMetadata(videoUrl: string): Promise<VideoMetadata> {
  const video = document.createElement("video");
  video.src = videoUrl;
  video.muted = true;
  video.playsInline = true;
  video.preload = "metadata";

  try {
    await new Promise<void>((resolve, reject) => {
      video.addEventListener("loadedmetadata", () => resolve(), { once: true });
      video.addEventListener(
        "error",
        () => reject(new Error("Video kon niet worden gelezen.")),
        { once: true }
      );
    });

    return {
      durationSec: video.duration || 0,
      width: video.videoWidth || 1920,
      height: video.videoHeight || 1080,
    };
  } finally {
    video.removeAttribute("src");
    video.load();
  }
}

interface RawSpeakerFrame {
  timeSec: number;
  isSceneCut: boolean;
  focusXPercent: number;
  focusYPercent: number;
  zoom: number;
  personConfident: boolean;
}

const GRID_COLS = 16;
const GRID_ROWS = 9;

function measureBoxHeadMotion(
  frame: Uint8ClampedArray,
  prev: Uint8ClampedArray | null,
  w: number,
  h: number,
  originX: number,
  originY: number,
  boxW: number,
  boxH: number
): number {
  if (!prev) return 0;
  // Focus on upper 48% of person bounding box (face, mouth, expressive head/hands)
  const x0 = Math.max(0, Math.floor(originX + boxW * 0.15));
  const x1 = Math.min(w - 1, Math.ceil(originX + boxW * 0.85));
  const y0 = Math.max(0, Math.floor(originY));
  const y1 = Math.min(h - 1, Math.ceil(originY + boxH * 0.48));

  let diffSum = 0;
  let pixels = 0;
  for (let y = y0; y < y1; y += 3) {
    for (let x = x0; x < x1; x += 3) {
      const i = (y * w + x) * 4;
      diffSum +=
        Math.abs(frame[i] - prev[i]) +
        Math.abs(frame[i + 1] - prev[i + 1]) +
        Math.abs(frame[i + 2] - prev[i + 2]);
      pixels++;
    }
  }
  return pixels > 0 ? diffSum / pixels : 0;
}

function smoothSpeakerPath(raw: RawSpeakerFrame[]): FocusKeyframe[] {
  if (raw.length === 0) {
    return [{ timeSec: 0, focusXPercent: 50, focusYPercent: 38, zoom: 1.12 }];
  }

  const weights = [0.12, 0.22, 0.32, 0.22, 0.12];
  const out: FocusKeyframe[] = [];

  for (let i = 0; i < raw.length; i++) {
    const curr = raw[i];
    if (curr.isSceneCut) {
      out.push({
        timeSec: curr.timeSec,
        focusXPercent: Math.round(curr.focusXPercent * 10) / 10,
        focusYPercent: Math.round(curr.focusYPercent * 10) / 10,
        zoom: Math.round(curr.zoom * 100) / 100,
      });
      continue;
    }

    let sumX = 0;
    let sumY = 0;
    let sumZ = 0;
    let wTotal = 0;

    for (let offset = -2; offset <= 2; offset++) {
      const ni = i + offset;
      if (ni < 0 || ni >= raw.length) continue;
      const crossesCut =
        (offset < 0 && raw.slice(ni + 1, i + 1).some((f) => f.isSceneCut)) ||
        (offset > 0 && raw.slice(i + 1, ni + 1).some((f) => f.isSceneCut));
      if (crossesCut) continue;

      const sample = raw[ni];
      const w = weights[offset + 2] * (sample.personConfident ? 1.4 : 1);
      sumX += sample.focusXPercent * w;
      sumY += sample.focusYPercent * w;
      sumZ += sample.zoom * w;
      wTotal += w;
    }

    const avgX = wTotal > 0 ? sumX / wTotal : curr.focusXPercent;
    const avgY = wTotal > 0 ? sumY / wTotal : curr.focusYPercent;
    const avgZ = wTotal > 0 ? sumZ / wTotal : curr.zoom;

    out.push({
      timeSec: curr.timeSec,
      focusXPercent: Math.max(8, Math.min(92, Math.round(avgX * 10) / 10)),
      focusYPercent: Math.max(18, Math.min(72, Math.round(avgY * 10) / 10)),
      zoom: Math.round(avgZ * 100) / 100,
    });
  }

  return out;
}

/**
 * Tracks the active speaking person across a podcast clip window [startSec, endSec]
 * using MediaPipe person detection + upper-body/face motion scoring so the 9:16 frame
 * follows whichever host or guest is currently speaking.
 */
export async function trackPodcastClipKeyframes(
  videoUrl: string,
  startSec: number,
  endSec: number,
  srcHeight: number
): Promise<{
  trackingMode: "mediapipe-speaker" | "grid-motion";
  keyframes: FocusKeyframe[];
}> {
  const detector = await getPersonDetector();
  const trackingMode: "mediapipe-speaker" | "grid-motion" = detector
    ? "mediapipe-speaker"
    : "grid-motion";

  const video = document.createElement("video");
  video.src = videoUrl;
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";

  const sampleW = detector ? 640 : 256;
  const sampleH = detector ? 360 : 144;
  const canvas = document.createElement("canvas");
  canvas.width = sampleW;
  canvas.height = sampleH;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  try {
    await new Promise<void>((resolve, reject) => {
      video.addEventListener("loadedmetadata", () => resolve(), { once: true });
      video.addEventListener(
        "error",
        () => reject(new Error("Video kon niet worden gelezen voor spreker-tracking.")),
        { once: true }
      );
    });

    if (!ctx) {
      return {
        trackingMode,
        keyframes: [{ timeSec: startSec, focusXPercent: 50, focusYPercent: 38, zoom: 1.12 }],
      };
    }

    const seekTo = (t: number) =>
      new Promise<void>((resolve) => {
        const onSeeked = () => {
          video.removeEventListener("seeked", onSeeked);
          resolve();
        };
        video.addEventListener("seeked", onSeeked, { once: true });
        video.currentTime = t;
      });

    const duration = Math.max(1, endSec - startSec);
    const stepSec = duration > 35 ? 0.55 : 0.42;
    const times: number[] = [];
    for (let t = startSec; t <= endSec - 0.05; t += stepSec) {
      times.push(Number(t.toFixed(2)));
    }
    if (times.length === 0) times.push(startSec);

    const maxSafeZoom = srcHeight >= 1080 ? 1.24 : srcHeight >= 720 ? 1.15 : 1.06;
    let prevData: Uint8ClampedArray | null = null;
    let lastSpeakerX: number | null = null;
    const rawFrames: RawSpeakerFrame[] = [];

    for (const t of times) {
      await seekTo(t);
      ctx.drawImage(video, 0, 0, sampleW, sampleH);
      const frame = ctx.getImageData(0, 0, sampleW, sampleH).data;

      // Scene-cut & grid motion check
      const cellW = sampleW / GRID_COLS;
      const cellH = sampleH / GRID_ROWS;
      const cellEnergies = new Float32Array(GRID_COLS * GRID_ROWS);
      let cutCells = 0;

      if (prevData) {
        for (let gy = 0; gy < GRID_ROWS; gy++) {
          for (let gx = 0; gx < GRID_COLS; gx++) {
            const x0 = Math.floor(gx * cellW);
            const x1 = Math.floor((gx + 1) * cellW);
            const y0 = Math.floor(gy * cellH);
            const y1 = Math.floor((gy + 1) * cellH);
            let sum = 0;
            let count = 0;
            for (let y = y0; y < y1; y += 4) {
              for (let x = x0; x < x1; x += 4) {
                const i = (y * sampleW + x) * 4;
                sum +=
                  Math.abs(frame[i] - prevData[i]) +
                  Math.abs(frame[i + 1] - prevData[i + 1]) +
                  Math.abs(frame[i + 2] - prevData[i + 2]);
                count++;
              }
            }
            const avg = count > 0 ? sum / count : 0;
            cellEnergies[gy * GRID_COLS + gx] = avg;
            if (avg > 68) cutCells++;
          }
        }
      }

      const isSceneCut =
        prevData !== null && cutCells > GRID_COLS * GRID_ROWS * 0.58;
      if (isSceneCut) {
        lastSpeakerX = null;
      }

      let bestGridX = 50;
      let bestGridY = 38;
      if (prevData && !isSceneCut) {
        let bestEnergy = 0;
        for (let gy = 0; gy < Math.floor(GRID_ROWS * 0.65); gy++) {
          for (let gx = 1; gx < GRID_COLS - 1; gx++) {
            const e = cellEnergies[gy * GRID_COLS + gx];
            if (e > bestEnergy) {
              bestEnergy = e;
              bestGridX = ((gx + 0.5) / GRID_COLS) * 100;
              bestGridY = ((gy + 0.5) / GRID_ROWS) * 100;
            }
          }
        }
      }

      let focusX = bestGridX;
      let focusY = bestGridY;
      let zoom = 1.08;
      let personConfident = false;

      if (detector) {
        try {
          const detResult = detector.detect(canvas);
          const people = (detResult.detections || [])
            .filter((d) => d.categories?.[0]?.categoryName === "person" && d.boundingBox)
            .map((d) => {
              const b = d.boundingBox!;
              const xPct = ((b.originX + b.width / 2) / sampleW) * 100;
              // Aim at face / upper torso (~28% down from top of person bounding box)
              const faceYPct = ((b.originY + b.height * 0.28) / sampleH) * 100;
              const headMotion = measureBoxHeadMotion(
                frame,
                prevData,
                sampleW,
                sampleH,
                b.originX,
                b.originY,
                b.width,
                b.height
              );
              const areaPct = ((b.width * b.height) / (sampleW * sampleH)) * 100;
              const conf = d.categories?.[0]?.score || 0.3;
              const stickyBonus =
                lastSpeakerX !== null && Math.abs(xPct - lastSpeakerX) < 16 ? 8 : 0;
              const score = headMotion * 2.5 + areaPct * 0.45 + conf * 12 + stickyBonus;
              return {
                xPct,
                faceYPct,
                hPct: (b.height / sampleH) * 100,
                score,
              };
            })
            .sort((a, b) => b.score - a.score);

          if (people.length > 0) {
            const active = people[0];
            focusX = active.xPct;
            focusY = active.faceYPct;
            lastSpeakerX = active.xPct;
            personConfident = true;
            // Gentle zoom if speaker is a smaller figure in a wide multi-host studio shot
            zoom = active.hPct < 58 ? maxSafeZoom : 1.05;
          }
        } catch {
          // Fall back to upper-frame motion grid
        }
      }

      rawFrames.push({
        timeSec: t,
        isSceneCut,
        focusXPercent: focusX,
        focusYPercent: focusY,
        zoom,
        personConfident,
      });

      prevData = new Uint8ClampedArray(frame);
    }

    return {
      trackingMode,
      keyframes: smoothSpeakerPath(rawFrames),
    };
  } finally {
    video.removeAttribute("src");
    video.load();
  }
}

export async function analyzePodcastWithGemini(params: {
  file: File | null;
  videoUrl: string | null;
  transcriptInput: string;
  sourceTitle?: string;
  onProgress: (percent: number, stageLabel: string) => void;
}): Promise<PodcastAnalysisResult> {
  const { file, videoUrl, transcriptInput, sourceTitle, onProgress } = params;
  const trimmedTranscript = transcriptInput.trim();

  let meta: VideoMetadata = { durationSec: 0, width: 1920, height: 1080 };
  if (videoUrl) {
    onProgress(5, "Video-eigenschappen controleren...");
    meta = await probeVideoMetadata(videoUrl);
  }

  let audioChunks: Awaited<ReturnType<typeof extractPodcastAudioChunks>>["chunks"] = [];
  if (!trimmedTranscript) {
    if (!file) {
      throw new Error(
        "Upload eerst een podcastvideo of plak een transcript met tijdstempels."
      );
    }
    const extracted = await extractPodcastAudioChunks(file, (pct, label) => {
      onProgress(pct, label);
    });
    audioChunks = extracted.chunks;
    if (meta.durationSec <= 0) {
      meta.durationSec = extracted.durationSec;
    }
  }

  onProgress(
    48,
    trimmedTranscript
      ? "Gemini analyseert hooks, retentie en virality-scores..."
      : "Gemini transcribeert spraak en scoort virale hooks..."
  );

  const response = await fetch("/api/podcast/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      transcript: trimmedTranscript || undefined,
      audioChunks: audioChunks.length > 0 ? audioChunks : undefined,
      durationSec: meta.durationSec,
      sourceTitle: sourceTitle || file?.name || "",
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
    language?: string;
    transcript?: string;
    filteredOutCount?: number;
    clips?: Array<{
      id: string;
      title: string;
      hookType: string;
      hookQuote: string;
      startSec: number;
      endSec: number;
      durationSec: number;
      viralScore: number;
      scores: ViralityScores;
      reason: string;
      captions: TimedCaption[];
    }>;
  };

  if (!response.ok) {
    throw new Error(
      payload.error || `Serverfout tijdens Gemini-analyse (${response.status}).`
    );
  }

  const rawClips = Array.isArray(payload.clips) ? payload.clips : [];
  const clipsToTrack = rawClips.slice(0, 6);
  const trackedClips: PodcastClipMoment[] = [];
  let resolvedTrackingMode: "mediapipe-speaker" | "grid-motion" = "grid-motion";

  if (videoUrl && clipsToTrack.length > 0) {
    for (let i = 0; i < clipsToTrack.length; i++) {
      const clip = clipsToTrack[i];
      onProgress(
        72 + Math.round(((i + 0.5) / clipsToTrack.length) * 26),
        `Spreker in beeld volgen voor clip ${i + 1} van ${clipsToTrack.length}...`
      );
      const tracked = await trackPodcastClipKeyframes(
        videoUrl,
        clip.startSec,
        clip.endSec,
        meta.height
      );
      resolvedTrackingMode = tracked.trackingMode;
      trackedClips.push({
        ...clip,
        trackingMode: tracked.trackingMode,
        keyframes: tracked.keyframes,
      });
    }
  } else {
    for (const clip of clipsToTrack) {
      trackedClips.push({
        ...clip,
        trackingMode: "grid-motion",
        keyframes: [
          { timeSec: clip.startSec, focusXPercent: 50, focusYPercent: 38, zoom: 1.1 },
        ],
      });
    }
  }

  onProgress(100, "Klaar");

  return {
    language: payload.language || "Nederlands",
    transcript: payload.transcript || trimmedTranscript,
    filteredOutCount: Number(payload.filteredOutCount || 0),
    durationSec: meta.durationSec,
    width: meta.width,
    height: meta.height,
    trackingMode: resolvedTrackingMode,
    clips: trackedClips,
  };
}
