import type { ExportedShortResult } from "./shortExporter";
import { resolveThemeProfile, type MusicMoodProfile } from "./themeProfiles";
import {
  draw2DVectorSceneFrame,
  drawMinimalistBottomSubtitles,
  pickTakeawayWordIndex,
  type SceneAnimationSpec,
  type SubtitleAccentTheme,
} from "./vectorAnimationEngine";

export type {
  ContrastShiftMode,
  FocusCharacter,
  ManStance,
  SceneAnimationSpec,
  SubtitleAccentTheme,
  UniquePropTag,
  VectorArchetype,
  WomanMood,
} from "./vectorAnimationEngine";
export { VECTOR_ARCHETYPE_LABELS } from "./vectorAnimationEngine";

export interface TimedSubtitleWord {
  word: string;
  startSec: number;
  endSec: number;
}

export interface TimedSubtitleChunk {
  text: string;
  highlightWord: string;
  startSec: number;
  endSec: number;
  sceneIndex: number;
  words?: TimedSubtitleWord[];
}

export interface FacelessScene {
  id: string;
  sceneIndex: number;
  timestamp_est: string;
  startSec: number;
  endSec: number;
  durationSec: number;
  section_label: string;
  voiceover: string;
  subtitle_lines: string[];
  visual_scene: string;
  sfx_or_music_cue: string;
  animSpec: SceneAnimationSpec;
}

export interface WordTiming {
  word: string;
  startSec: number;
  endSec: number;
  sceneIndex: number;
}

export type SubtitleMode = "word-highlight" | "classic" | "off";

export interface FacelessMetadata {
  youtubeTitle: string;
  captionWithHashtags: string;
  thumbnailHook: string;
}

export interface AnimationStoryboardJson {
  video_title: string;
  thumbnail_idea: string;
  voiceover_style: string;
  subtitle_style: string;
  scenes: Array<{
    timestamp_est: string;
    section_label: string;
    voiceover: string;
    subtitle_lines: string[];
    visual_scene: string;
    sfx_or_music_cue: string;
  }>;
}

function findExactActiveWordIndex(
  timedWords: TimedSubtitleWord[],
  currentTimeSec: number
): number {
  if (timedWords.length === 0) return -1;

  // 1. Exact containment match inside active word [startSec, endSec]
  for (let i = 0; i < timedWords.length; i++) {
    if (
      currentTimeSec >= timedWords[i].startSec - 0.015 &&
      currentTimeSec <= timedWords[i].endSec + 0.015
    ) {
      return i;
    }
  }

  // 2. Between words inside the same chunk: stay on the word just spoken until the next begins
  for (let i = timedWords.length - 1; i >= 0; i--) {
    if (currentTimeSec >= timedWords[i].startSec) {
      return i;
    }
  }

  // 3. Slightly before first word (within brief lead-in)
  return 0;
}

function resolveActiveSubtitleLine(
  subtitleChunks: TimedSubtitleChunk[] | undefined,
  wordTimings: WordTiming[],
  currentTimeSec: number
): { words: string[]; highlightIdx: number } | null {
  if (subtitleChunks && subtitleChunks.length > 0) {
    let activeIdx = -1;
    for (let i = 0; i < subtitleChunks.length; i++) {
      const c = subtitleChunks[i];
      const nextStart =
        i + 1 < subtitleChunks.length ? subtitleChunks[i + 1].startSec : Infinity;
      const effectiveEnd = Math.min(nextStart - 0.005, c.endSec + 0.14);
      if (currentTimeSec >= c.startSec - 0.03 && currentTimeSec <= effectiveEnd) {
        activeIdx = i;
        break;
      }
    }

    if (activeIdx === -1) {
      // Only keep visible during true trailing breath < 0.25s if speech hasn't ended long ago
      return null;
    }

    const active = subtitleChunks[activeIdx];
    if (active.words && active.words.length > 0) {
      const wordStrings = active.words.map((w) => w.word).filter(Boolean);
      if (wordStrings.length === 0) return null;
      return {
        words: wordStrings,
        highlightIdx: findExactActiveWordIndex(active.words, currentTimeSec),
      };
    }

    const words = active.text.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return null;
    const matchedTimings = wordTimings.filter(
      (w) =>
        w.startSec >= active.startSec - 0.05 &&
        w.endSec <= active.endSec + 0.05
    );
    const highlightIdx =
      matchedTimings.length === words.length
        ? findExactActiveWordIndex(matchedTimings, currentTimeSec)
        : pickTakeawayWordIndex(words, active.highlightWord);
    return { words, highlightIdx };
  }

  if (wordTimings.length === 0) return null;

  let activeWordIdx = wordTimings.findIndex(
    (w) =>
      currentTimeSec >= w.startSec - 0.02 &&
      currentTimeSec <= w.endSec + 0.02
  );
  if (activeWordIdx === -1) {
    for (let i = wordTimings.length - 1; i >= 0; i--) {
      if (currentTimeSec >= wordTimings[i].startSec) {
        if (currentTimeSec - wordTimings[i].endSec <= 0.22) {
          activeWordIdx = i;
        }
        break;
      }
    }
  }
  if (activeWordIdx === -1) return null;

  const groupSize = 5;
  const groupStart = Math.floor(activeWordIdx / groupSize) * groupSize;
  const group = wordTimings.slice(groupStart, groupStart + groupSize);
  return {
    words: group.map((g) => g.word),
    highlightIdx: activeWordIdx - groupStart,
  };
}

/**
 * Renders one frame of the minimalist Black & White 2D animation onto Canvas
 * (used for both interactive timeline preview and 30fps WebM/MP4 video export).
 */
export function drawFacelessFrame(params: {
  ctx: CanvasRenderingContext2D;
  outWidth: number;
  outHeight: number;
  currentTimeSec: number;
  totalDurationSec: number;
  scenes: FacelessScene[];
  wordTimings: WordTiming[];
  subtitleChunks?: TimedSubtitleChunk[];
  aspectRatio: "9:16" | "16:9";
  subtitleMode?: SubtitleMode;
  subtitleAccent?: SubtitleAccentTheme;
}) {
  const {
    ctx,
    outWidth,
    outHeight,
    currentTimeSec,
    scenes,
    wordTimings,
    subtitleChunks,
    aspectRatio,
    subtitleMode = "word-highlight",
    subtitleAccent = "gold",
  } = params;

  const activeScene =
    scenes.find(
      (s) => currentTimeSec >= s.startSec && currentTimeSec < s.endSec
    ) || scenes[scenes.length - 1];

  const spec: SceneAnimationSpec = activeScene?.animSpec || {
    archetype: "intro_roadmap",
    contrastShift: "black",
  };

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const { isLightBg } = draw2DVectorSceneFrame({
    ctx,
    outWidth,
    outHeight,
    currentTimeSec,
    sceneStartSec: activeScene?.startSec ?? 0,
    sceneEndSec: activeScene?.endSec ?? 4,
    sectionLabel: activeScene?.section_label || "",
    spec,
    accentTheme: subtitleAccent,
    aspectRatio,
  });

  if (subtitleMode !== "off") {
    const activeLine = resolveActiveSubtitleLine(
      subtitleChunks,
      wordTimings,
      currentTimeSec
    );
    if (activeLine && activeLine.words.length > 0) {
      drawMinimalistBottomSubtitles({
        ctx,
        outWidth,
        outHeight,
        words: activeLine.words,
        highlightIndex: activeLine.highlightIdx,
        accentTheme: subtitleAccent,
        isLightBg,
        subtitleMode,
      });
    }
  }
}

/**
 * Synthesizes a clean, forward-moving lo-fi ambient synth-pulse WAV bed
 * plus subtle UI/motion sound effects synced to calm 2.4-4.2s scene transitions.
 */
export function buildLofiSynthSoundtrackUrl(params: {
  durationSec: number;
  scenes: FacelessScene[];
  musicProfile?: MusicMoodProfile;
  visualTheme?: string;
}): string {
  const durationSec = Math.max(2, params.durationSec);
  const sampleRate = 22050;
  const totalSamples = Math.round(durationSec * sampleRate);
  const pcm = new Int16Array(totalSamples);

  const profile =
    params.musicProfile || resolveThemeProfile(params.visualTheme).musicProfile;

  const THEME_MUSIC: Record<
    MusicMoodProfile,
    { bpm: number; chords: number[][]; pulseMix: number }
  > = {
    smooth_lounge: {
      bpm: 88,
      chords: [
        [174.61, 220.0, 261.63, 329.63],
        [146.83, 220.0, 261.63, 349.23],
        [196.0, 246.94, 293.66, 349.23],
        [130.81, 196.0, 246.94, 329.63],
      ],
      pulseMix: 0.042,
    },
    velvet_groove: {
      bpm: 94,
      chords: [
        [174.61, 220.0, 261.63, 392.0],
        [196.0, 246.94, 293.66, 329.63],
        [164.81, 246.94, 293.66, 392.0],
        [220.0, 261.63, 329.63, 493.88],
      ],
      pulseMix: 0.055,
    },
    kinetic_focus: {
      bpm: 100,
      chords: [
        [146.83, 220.0, 293.66, 349.23],
        [164.81, 246.94, 329.63, 392.0],
        [174.61, 261.63, 349.23, 440.0],
        [130.81, 196.0, 293.66, 392.0],
      ],
      pulseMix: 0.072,
    },
    upbeat_clarity: {
      bpm: 96,
      chords: [
        [196.0, 246.94, 293.66, 370.0],
        [164.81, 246.94, 293.66, 392.0],
        [220.0, 277.18, 329.63, 440.0],
        [146.83, 220.0, 277.18, 370.0],
      ],
      pulseMix: 0.06,
    },
    morning_momentum: {
      bpm: 98,
      chords: [
        [130.81, 196.0, 246.94, 329.63],
        [174.61, 220.0, 261.63, 349.23],
        [196.0, 246.94, 293.66, 392.0],
        [164.81, 196.0, 246.94, 329.63],
      ],
      pulseMix: 0.064,
    },
    story_tension: {
      bpm: 90,
      chords: [
        [164.81, 196.0, 246.94, 329.63],
        [146.83, 196.0, 261.63, 349.23],
        [130.81, 196.0, 246.94, 311.13],
        [146.83, 220.0, 261.63, 329.63],
      ],
      pulseMix: 0.048,
    },
  };

  const chosen = THEME_MUSIC[profile] || THEME_MUSIC.velvet_groove;
  const beatSec = 60 / chosen.bpm;
  const chords = chosen.chords;
  const barSec = beatSec * 4;

  // Map each scene's sfx_or_music_cue into tasteful low-volume UI/motion SFX
  const sfxEvents = params.scenes
    .map((sc) => {
      const cue = (sc.sfx_or_music_cue || "").toLowerCase();
      if (!cue || cue === "none" || cue === "geen") return null;
      const isPop =
        cue.includes("pop") ||
        cue.includes("click") ||
        cue.includes("tick") ||
        cue.includes("ui") ||
        cue.includes("chime");
      const isThud =
        cue.includes("thud") ||
        cue.includes("drop") ||
        cue.includes("bass") ||
        cue.includes("hit");
      return {
        timeSec: sc.startSec,
        kind: isPop ? ("pop" as const) : isThud ? ("thud" as const) : ("whoosh" as const),
      };
    })
    .filter(
      (e): e is { timeSec: number; kind: "pop" | "thud" | "whoosh" } => e !== null
    );

  let noiseState = 4242429;
  const nextWhite = () => {
    noiseState = (noiseState * 1664525 + 1013904223) >>> 0;
    return (noiseState >>> 16) / 32768 - 1;
  };
  let lpNoise = 0;

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;

    // Subtle warm synth pad + soft 8th-note synth pulse
    const chordIdx = Math.floor(t / barSec) % chords.length;
    const chord = chords[chordIdx];
    const barLocal = t % barSec;
    const chordEnv = Math.min(1, barLocal / 0.28) * (0.72 + 0.28 * Math.sin(2 * Math.PI * (t / beatSec) * 0.5));

    let pad = 0;
    for (let n = 0; n < chord.length; n++) {
      pad += Math.sin(2 * Math.PI * chord[n] * t) * (0.042 / chord.length);
    }

    const pulseLocal = t % (beatSec / 2);
    const pulseEnv = Math.exp(-pulseLocal * 9.5);
    const synthPulse =
      Math.sin(2 * Math.PI * (chord[0] * 0.5) * t) * chosen.pulseMix * pulseEnv;

    // Gentle UI / motion SFX
    lpNoise = lpNoise * 0.91 + nextWhite() * 0.09;
    let sfx = 0;
    for (let e = 0; e < sfxEvents.length; e++) {
      const dt = t - sfxEvents[e].timeSec;
      if (dt >= 0 && dt < 0.45) {
        const kind = sfxEvents[e].kind;
        if (kind === "pop") {
          const freq = 720 + 280 * Math.exp(-dt * 28);
          const env = Math.min(1, dt / 0.008) * Math.exp(-dt * 22);
          sfx += Math.sin(2 * Math.PI * freq * dt) * 0.14 * env;
        } else if (kind === "thud") {
          const freq = 90 * Math.exp(-dt * 4.5) + 42;
          const env = Math.min(1, dt / 0.01) * Math.exp(-dt * 7.5);
          sfx += Math.sin(2 * Math.PI * freq * dt) * 0.22 * env;
        } else {
          const env = Math.sin(Math.PI * Math.min(1, dt / 0.36));
          sfx += lpNoise * 0.2 * env;
        }
      }
    }

    const fadeIn = Math.min(1, t / 0.5);
    const fadeOut = Math.min(1, (durationSec - t) / 0.7);
    const mixed = (pad * chordEnv + synthPulse + sfx) * fadeIn * fadeOut;
    pcm[i] = Math.round(Math.max(-0.8, Math.min(0.8, mixed)) * 32767);
  }

  const wavBuffer = new ArrayBuffer(44 + pcm.byteLength);
  const view = new DataView(wavBuffer);
  const writeStr = (offset: number, s: string) => {
    for (let j = 0; j < s.length; j++) view.setUint8(offset + j, s.charCodeAt(j));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + pcm.byteLength, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, pcm.byteLength, true);
  new Uint8Array(wavBuffer, 44).set(new Uint8Array(pcm.buffer));

  return URL.createObjectURL(new Blob([wavBuffer], { type: "audio/wav" }));
}

function captureDownscaledFrameDataUrl(
  canvas: HTMLCanvasElement,
  maxWidth = 480
): string {
  const scale = Math.min(1, maxWidth / Math.max(1, canvas.width));
  const thumbCanvas = document.createElement("canvas");
  thumbCanvas.width = Math.max(120, Math.round(canvas.width * scale));
  thumbCanvas.height = Math.max(120, Math.round(canvas.height * scale));
  const tctx = thumbCanvas.getContext("2d");
  if (!tctx) return canvas.toDataURL("image/png");
  tctx.drawImage(canvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
  return thumbCanvas.toDataURL("image/jpeg", 0.84);
}

function getSupportedExportMime(): string {
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

export async function exportFacelessVideo(options: {
  aspectRatio: "9:16" | "16:9";
  voiceoverUrl: string;
  musicUrl?: string | null;
  scenes: FacelessScene[];
  wordTimings: WordTiming[];
  subtitleChunks?: TimedSubtitleChunk[];
  durationSec: number;
  subtitleMode?: SubtitleMode;
  subtitleAccent?: SubtitleAccentTheme;
  onProgress: (percent: number) => void;
  signal: AbortSignal;
}): Promise<{
  exported: ExportedShortResult;
  frameBase64Png: string;
  metadataFrameDataUrl: string;
}> {
  const {
    aspectRatio,
    voiceoverUrl,
    musicUrl,
    scenes,
    wordTimings,
    subtitleChunks,
    durationSec,
    subtitleMode = "word-highlight",
    subtitleAccent = "gold",
    onProgress,
    signal,
  } = options;

  if (typeof MediaRecorder === "undefined") {
    throw new Error("Video export is not supported in this browser.");
  }

  if (typeof document !== "undefined" && document.fonts?.ready) {
    await document.fonts.ready.catch(() => {});
  }

  const outWidth = aspectRatio === "9:16" ? 1080 : 1920;
  const outHeight = aspectRatio === "9:16" ? 1920 : 1080;

  const canvas = document.createElement("canvas");
  canvas.width = outWidth;
  canvas.height = outHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 2D drawing context is unavailable.");
  }

  const voiceAudio = document.createElement("audio");
  voiceAudio.src = voiceoverUrl;
  voiceAudio.preload = "auto";
  await new Promise<void>((resolve, reject) => {
    const onDone = () => {
      voiceAudio.removeEventListener("canplaythrough", onDone);
      voiceAudio.removeEventListener("error", onErr);
      resolve();
    };
    const onErr = () => {
      voiceAudio.removeEventListener("canplaythrough", onDone);
      voiceAudio.removeEventListener("error", onErr);
      reject(new Error("Voice-over audio could not be loaded."));
    };
    voiceAudio.addEventListener("canplaythrough", onDone, { once: true });
    voiceAudio.addEventListener("error", onErr, { once: true });
    voiceAudio.load();
  });

  let musicAudio: HTMLAudioElement | null = null;
  if (musicUrl) {
    musicAudio = document.createElement("audio");
    musicAudio.src = musicUrl;
    musicAudio.loop = true;
    musicAudio.preload = "auto";
    await new Promise<void>((resolve) => {
      const done = () => resolve();
      musicAudio?.addEventListener("canplaythrough", done, { once: true });
      musicAudio?.addEventListener("error", done, { once: true });
      window.setTimeout(done, 3000);
      musicAudio?.load();
    });
  }

  const AudioCtxClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext;
  const audioCtx = new AudioCtxClass();
  if (audioCtx.state === "suspended") {
    await audioCtx.resume();
  }

  const dest = audioCtx.createMediaStreamDestination();
  const voiceSource = audioCtx.createMediaElementSource(voiceAudio);
  const voiceGain = audioCtx.createGain();
  voiceGain.gain.value = 1.0;
  voiceSource.connect(voiceGain);
  voiceGain.connect(dest);

  if (musicAudio) {
    const musicSource = audioCtx.createMediaElementSource(musicAudio);
    const musicGain = audioCtx.createGain();
    musicGain.gain.value = 0.16;
    musicSource.connect(musicGain);
    musicGain.connect(dest);
  }

  const canvasStream = canvas.captureStream(30);
  const combinedStream = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...dest.stream.getAudioTracks(),
  ]);

  const mimeType = getSupportedExportMime();
  const recorder = new MediaRecorder(
    combinedStream,
    mimeType
      ? { mimeType, videoBitsPerSecond: 10_000_000 }
      : { videoBitsPerSecond: 10_000_000 }
  );

  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (ev) => {
    if (ev.data.size > 0) chunks.push(ev.data);
  };

  let capturedFrameDataUrl = "";
  let metadataFrameDataUrl = "";

  const cleanupAll = () => {
    voiceAudio.pause();
    musicAudio?.pause();
    combinedStream.getTracks().forEach((t) => t.stop());
    audioCtx.close().catch(() => {});
  };

  const actualDuration = Number.isFinite(voiceAudio.duration)
    ? Math.max(1, voiceAudio.duration)
    : Math.max(1, durationSec);

  return new Promise((resolve, reject) => {
    let rafId = 0;
    let stopped = false;

    const finishExport = () => {
      if (stopped) return;
      stopped = true;
      cancelAnimationFrame(rafId);
      if (recorder.state !== "inactive") recorder.stop();
    };

    const onAbort = () => {
      if (stopped) return;
      stopped = true;
      cancelAnimationFrame(rafId);
      if (recorder.state !== "inactive") recorder.stop();
      cleanupAll();
      reject(new Error("Rendering cancelled."));
    };

    signal.addEventListener("abort", onAbort, { once: true });

    recorder.onstop = () => {
      signal.removeEventListener("abort", onAbort);
      if (signal.aborted) return;
      cleanupAll();
      const finalMime = recorder.mimeType || mimeType || "video/webm";
      const blob = new Blob(chunks, { type: finalMime });
      const url = URL.createObjectURL(blob);
      const ext = finalMime.includes("mp4") ? "mp4" : "webm";
      onProgress(100);
      resolve({
        exported: {
          url,
          blob,
          filename: `minimalist-2d-${aspectRatio.replace(":", "x")}-${Math.round(actualDuration)}s.${ext}`,
          mimeType: finalMime,
          durationSec: actualDuration,
        },
        frameBase64Png: capturedFrameDataUrl,
        metadataFrameDataUrl: metadataFrameDataUrl || capturedFrameDataUrl,
      });
    };

    recorder.onerror = () => {
      cleanupAll();
      reject(new Error("Error recording the video stream."));
    };

    const renderTick = () => {
      if (stopped) return;
      const t = voiceAudio.currentTime;
      const frac = Math.min(1, Math.max(0, t / actualDuration));
      onProgress(Math.round(frac * 98));

      drawFacelessFrame({
        ctx,
        outWidth,
        outHeight,
        currentTimeSec: t,
        totalDurationSec: actualDuration,
        scenes,
        wordTimings,
        subtitleChunks,
        aspectRatio,
        subtitleMode,
        subtitleAccent,
      });

      if (!capturedFrameDataUrl && t >= Math.min(1.6, actualDuration * 0.25)) {
        capturedFrameDataUrl = canvas.toDataURL("image/png");
        metadataFrameDataUrl = captureDownscaledFrameDataUrl(canvas, 480);
      }

      if (t >= actualDuration - 0.04 || voiceAudio.ended) {
        finishExport();
        return;
      }

      rafId = requestAnimationFrame(renderTick);
    };

    drawFacelessFrame({
      ctx,
      outWidth,
      outHeight,
      currentTimeSec: 0,
      totalDurationSec: actualDuration,
      scenes,
      wordTimings,
      subtitleChunks,
      aspectRatio,
      subtitleMode,
      subtitleAccent,
    });

    recorder.start(200);
    voiceAudio.currentTime = 0;
    if (musicAudio) {
      musicAudio.currentTime = 0;
      musicAudio.play().catch(() => {});
    }
    voiceAudio
      .play()
      .then(() => {
        rafId = requestAnimationFrame(renderTick);
      })
      .catch((err) => {
        cleanupAll();
        reject(err);
      });
  });
}
