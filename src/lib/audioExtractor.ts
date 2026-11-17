export interface ExtractedAudioChunk {
  mimeType: string;
  data: string;
  offsetSec: number;
  durationSec: number;
}

export interface AudioExtractionResult {
  durationSec: number;
  chunks: ExtractedAudioChunk[];
}

function encodeMonoWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const numSamples = samples.length;
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeString(36, "data");
  view.setUint32(40, numSamples * 2, true);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return buffer;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
}

/**
 * Decodes the audio track from a podcast/spoken-word video file in the browser,
 * downsamples to 16kHz mono PCM WAV, and splits it into compact 4-minute chunks
 * (~7.6MB raw / ~10.2MB base64 each) for server-side Gemini transcription.
 */
export async function extractPodcastAudioChunks(
  file: File,
  onProgress?: (percent: number, label: string) => void
): Promise<AudioExtractionResult> {
  if (file.size > 380 * 1024 * 1024) {
    throw new Error(
      "Dit videobestand is groter dan 380 MB voor directe browser-audio-extractie. Plak het transcript direct hiernaast of gebruik een kleiner bestand."
    );
  }

  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioCtx) {
    throw new Error("Web Audio wordt niet ondersteund door deze browser.");
  }

  onProgress?.(10, "Geluidsspoor uit video decoderen...");
  const audioCtx = new AudioCtx();

  try {
    const fileBuffer = await file.arrayBuffer();
    const decoded = await audioCtx.decodeAudioData(fileBuffer);
    const totalDurationSec = decoded.duration;

    if (totalDurationSec < 2) {
      throw new Error("Het geluidsspoor van deze video is te kort.");
    }

    onProgress?.(25, "Spraak comprimeren naar 16kHz mono...");
    const targetSampleRate = 16000;
    const totalTargetSamples = Math.max(
      1,
      Math.ceil(totalDurationSec * targetSampleRate)
    );

    const offlineCtx = new OfflineAudioContext(
      1,
      totalTargetSamples,
      targetSampleRate
    );
    const source = offlineCtx.createBufferSource();
    source.buffer = decoded;
    source.connect(offlineCtx.destination);
    source.start(0);

    const rendered = await offlineCtx.startRendering();
    const monoSamples = rendered.getChannelData(0);

    // Split into 240s (4-minute) chunks so every request stays small & fast
    const chunkDurationSec = 240;
    const samplesPerChunk = chunkDurationSec * targetSampleRate;
    const chunks: ExtractedAudioChunk[] = [];

    for (let startSample = 0; startSample < monoSamples.length; startSample += samplesPerChunk) {
      const endSample = Math.min(monoSamples.length, startSample + samplesPerChunk);
      const slice = monoSamples.subarray(startSample, endSample);
      const wavBuffer = encodeMonoWav(slice, targetSampleRate);
      chunks.push({
        mimeType: "audio/wav",
        data: arrayBufferToBase64(wavBuffer),
        offsetSec: startSample / targetSampleRate,
        durationSec: slice.length / targetSampleRate,
      });
    }

    onProgress?.(40, "Audio gereed voor transcriptie...");
    return {
      durationSec: totalDurationSec,
      chunks,
    };
  } finally {
    await audioCtx.close().catch(() => {});
  }
}
