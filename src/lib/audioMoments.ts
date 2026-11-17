export interface DetectedMoment {
  id: string;
  startSec: number;
  durationSec: number;
  intensity: number;
  label: string;
}

export function formatTime(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

/**
 * Scans the video's audio track in the browser using Web Audio API
 * to locate high-energy crowd/commentary peaks as candidate Shorts moments.
 */
export async function detectAudioMoments(
  file: File,
  clipDurationSec: number
): Promise<DetectedMoment[]> {
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;

  if (!AudioCtx) {
    throw new Error("Audio-analyse wordt niet ondersteund door deze browser.");
  }

  const buffer = await file.arrayBuffer();
  const audioCtx = new AudioCtx();

  try {
    const audioBuffer = await audioCtx.decodeAudioData(buffer);
    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    const totalSeconds = Math.floor(audioBuffer.duration);

    if (totalSeconds < 3) {
      return [];
    }

    const rmsPerSecond: number[] = [];
    for (let sec = 0; sec < totalSeconds; sec++) {
      const startSample = sec * sampleRate;
      const endSample = Math.min(channelData.length, (sec + 1) * sampleRate);
      let sumSquares = 0;
      const step = Math.max(1, Math.floor((endSample - startSample) / 1000));
      let count = 0;

      for (let i = startSample; i < endSample; i += step) {
        const val = channelData[i];
        sumSquares += val * val;
        count++;
      }

      rmsPerSecond.push(count > 0 ? Math.sqrt(sumSquares / count) : 0);
    }

    const avgRms =
      rmsPerSecond.reduce((acc, v) => acc + v, 0) / Math.max(1, rmsPerSecond.length);

    if (avgRms <= 0.0001) {
      return [];
    }

    const candidates = rmsPerSecond
      .map((rms, second) => ({ second, rms, ratio: rms / avgRms }))
      .sort((a, b) => b.rms - a.rms);

    const selected: DetectedMoment[] = [];
    const minSpacingSec = Math.max(12, Math.floor(clipDurationSec * 0.75));

    for (const candidate of candidates) {
      if (selected.length >= 4) break;

      // Start ~4 seconds before the audio peak so the build-up is included
      const maxStart = Math.max(0, totalSeconds - clipDurationSec);
      const proposedStart = Math.min(maxStart, Math.max(0, candidate.second - 4));

      const overlaps = selected.some(
        (m) => Math.abs(m.startSec - proposedStart) < minSpacingSec
      );
      if (overlaps) continue;

      const intensityPct = Math.min(100, Math.round(candidate.ratio * 45));
      selected.push({
        id: `moment-${proposedStart}`,
        startSec: proposedStart,
        durationSec: Math.min(clipDurationSec, totalSeconds - proposedStart),
        intensity: intensityPct,
        label:
          selected.length === 0
            ? "Sterkste geluidspiek"
            : `Geluidspiek ${selected.length + 1}`,
      });
    }

    return selected.sort((a, b) => a.startSec - b.startSec);
  } finally {
    await audioCtx.close().catch(() => {});
  }
}
