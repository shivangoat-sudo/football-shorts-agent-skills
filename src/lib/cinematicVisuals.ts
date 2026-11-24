const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "is",
  "are",
  "was",
  "were",
  "be",
  "to",
  "of",
  "and",
  "in",
  "on",
  "at",
  "it",
  "its",
  "it's",
  "this",
  "that",
  "for",
  "with",
  "as",
  "by",
  "or",
  "if",
  "you",
  "your",
  "they",
  "most",
  "just",
  "de",
  "het",
  "een",
  "en",
  "van",
  "in",
  "op",
  "te",
  "dat",
  "die",
  "voor",
  "met",
  "als",
  "je",
  "jij",
  "het",
  "is",
  "zijn",
]);

function normalizeToken(word: string): string {
  return word.toLowerCase().replace(/[^a-z0-9\u00c0-\u024f]/gi, "");
}

/**
 * Selects 1 key emotional/impact word per 3-5 word phrase for warm gold (#D4AF37) emphasis.
 */
export function pickEmotionalWordIndex(
  words: string[],
  preferredWord?: string
): number {
  if (words.length === 0) return -1;

  if (preferredWord) {
    const target = normalizeToken(preferredWord);
    if (target) {
      const exactIdx = words.findIndex((w) => normalizeToken(w) === target);
      if (exactIdx !== -1) return exactIdx;
      const partialIdx = words.findIndex((w) =>
        normalizeToken(w).includes(target)
      );
      if (partialIdx !== -1) return partialIdx;
    }
  }

  let bestIdx = 0;
  let bestScore = -1;
  words.forEach((w, idx) => {
    const clean = normalizeToken(w);
    if (!clean) return;
    let score = clean.length;
    if (STOP_WORDS.has(clean)) score -= 6;
    if (/[!?]$/.test(w)) score += 3;
    if (idx === words.length - 1) score += 1.2;
    if (score > bestScore) {
      bestScore = score;
      bestIdx = idx;
    }
  });

  return bestIdx;
}

let cachedGrainCanvas: HTMLCanvasElement | null = null;

function getFilmGrainCanvas(): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;
  if (cachedGrainCanvas) return cachedGrainCanvas;

  const size = 256;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const gctx = c.getContext("2d");
  if (!gctx) return null;

  const imgData = gctx.createImageData(size, size);
  const data = imgData.data;
  let seed = 133742;
  for (let i = 0; i < data.length; i += 4) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const n = (seed >>> 24) & 0xff;
    data[i] = n;
    data[i + 1] = n;
    data[i + 2] = n;
    data[i + 3] = 28;
  }
  gctx.putImageData(imgData, 0, 0);
  cachedGrainCanvas = c;
  return c;
}

/**
 * Applies the dark, moody Beyond Attraction visual treatment:
 * - Deep shadow tone (#0A0A0C)
 * - Subtle cool-blue or warm-amber atmospheric tint
 * - Heavy dark radial vignette around edges
 * - Subtle animated 35mm film grain overlay
 */
export function applyCinematicPostProcessing(params: {
  ctx: CanvasRenderingContext2D;
  outWidth: number;
  outHeight: number;
  currentTimeSec: number;
  tint?: "cool-blue" | "warm-amber";
  vignetteIntensity?: number;
}) {
  const {
    ctx,
    outWidth,
    outHeight,
    currentTimeSec,
    tint = "cool-blue",
    vignetteIntensity = 0.84,
  } = params;

  // Subtle cool-blue or warm-amber cinema tint
  ctx.save();
  ctx.fillStyle =
    tint === "warm-amber"
      ? "rgba(44, 27, 10, 0.14)"
      : "rgba(12, 24, 44, 0.16)";
  ctx.fillRect(0, 0, outWidth, outHeight);

  // Center soft reading scrim + heavy dark vignette (#0A0A0C) around edges
  const cx = outWidth / 2;
  const cy = outHeight / 2;
  const innerRadius = Math.min(outWidth, outHeight) * 0.24;
  const outerRadius = Math.hypot(cx, cy) * 1.02;

  const vignette = ctx.createRadialGradient(
    cx,
    cy,
    innerRadius,
    cx,
    cy,
    outerRadius
  );
  vignette.addColorStop(0, "rgba(10, 10, 12, 0.12)");
  vignette.addColorStop(0.55, "rgba(10, 10, 12, 0.34)");
  vignette.addColorStop(
    1,
    `rgba(10, 10, 12, ${Math.min(0.95, Math.max(0.5, vignetteIntensity))})`
  );
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, outWidth, outHeight);

  // Subtle top/bottom letterbox shadow falloff
  const edgeGrad = ctx.createLinearGradient(0, 0, 0, outHeight);
  edgeGrad.addColorStop(0, "rgba(10, 10, 12, 0.55)");
  edgeGrad.addColorStop(0.22, "rgba(10, 10, 12, 0.0)");
  edgeGrad.addColorStop(0.78, "rgba(10, 10, 12, 0.0)");
  edgeGrad.addColorStop(1, "rgba(10, 10, 12, 0.65)");
  ctx.fillStyle = edgeGrad;
  ctx.fillRect(0, 0, outWidth, outHeight);

  // Subtle 35mm film grain overlay (24fps pseudo-random tile offset)
  const grain = getFilmGrainCanvas();
  if (grain) {
    const frameIdx = Math.floor(currentTimeSec * 24);
    const ox = ((frameIdx * 73) % 128) - 128;
    const oy = ((frameIdx * 137) % 128) - 128;
    ctx.globalAlpha = 0.22;
    ctx.globalCompositeOperation = "overlay";
    for (let y = oy; y < outHeight; y += grain.height) {
      for (let x = ox; x < outWidth; x += grain.width) {
        ctx.drawImage(grain, x, y);
      }
    }
  }
  ctx.restore();
}

/**
 * Renders minimalist kinetic subtitles:
 * - Center-screen placement
 * - Clean Montserrat Bold / Inter Bold
 * - Pure white (#F4F4F6) with soft dark drop-shadow
 * - 1 key emotional word highlighted in warm gold (#D4AF37)
 * - ZERO blocky colored background boxes
 */
export function drawKineticBeyondSubtitles(params: {
  ctx: CanvasRenderingContext2D;
  outWidth: number;
  outHeight: number;
  words: string[];
  highlightIndex: number;
  fontSize: number;
  centerY?: number;
  entranceProgress?: number;
}) {
  const {
    ctx,
    outWidth,
    outHeight,
    words,
    highlightIndex,
    fontSize,
    centerY = outHeight * 0.5,
    entranceProgress = 1,
  } = params;

  if (words.length === 0) return;

  const clampedIn = Math.max(0, Math.min(1, entranceProgress));
  const ease = 1 - Math.pow(1 - clampedIn, 3);
  const kineticScale = 0.96 + ease * 0.04;
  const alpha = 0.35 + ease * 0.65;

  const scale = outWidth / (outHeight > outWidth ? 1080 : 1920);
  const maxWidth = outWidth * 0.84;
  const spaceW = Math.round(fontSize * 0.28);

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `700 ${fontSize}px 'Montserrat', 'Inter', system-ui, sans-serif`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";

  // Split words cleanly into at most 2 centered lines when needed
  type IndexedWord = { word: string; idx: number; width: number };
  const measured: IndexedWord[] = words.map((word, idx) => ({
    word,
    idx,
    width: ctx.measureText(word).width,
  }));

  const lines: IndexedWord[][] = [];
  let currentLine: IndexedWord[] = [];
  let currentLineWidth = 0;

  for (const item of measured) {
    const added =
      currentLine.length === 0 ? item.width : spaceW + item.width;
    if (currentLine.length > 0 && currentLineWidth + added > maxWidth) {
      lines.push(currentLine);
      currentLine = [item];
      currentLineWidth = item.width;
    } else {
      currentLine.push(item);
      currentLineWidth += added;
    }
  }
  if (currentLine.length > 0) lines.push(currentLine);

  // Merge extra lines into line 2 if > 2 lines so center typography stays minimal
  if (lines.length > 2) {
    const secondAndRest = lines.slice(1).flat();
    lines.splice(1, lines.length - 1, secondAndRest);
  }

  const lineHeight = Math.round(fontSize * 1.28);
  const totalHeight = lines.length * lineHeight;
  const startY = centerY - totalHeight / 2 + lineHeight / 2;

  ctx.translate(outWidth / 2, centerY);
  ctx.scale(kineticScale, kineticScale);
  ctx.translate(-outWidth / 2, -centerY);

  ctx.shadowColor = "rgba(0, 0, 0, 0.92)";
  ctx.shadowBlur = Math.round(20 * scale);
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = Math.round(4 * scale);

  lines.forEach((line, lineIdx) => {
    const lineW =
      line.reduce((acc, w) => acc + w.width, 0) +
      spaceW * Math.max(0, line.length - 1);
    let cursorX = (outWidth - lineW) / 2;
    const y = startY + lineIdx * lineHeight;

    for (const item of line) {
      ctx.fillStyle = item.idx === highlightIndex ? "#D4AF37" : "#F4F4F6";
      ctx.fillText(item.word, cursorX, y);
      cursorX += item.width + spaceW;
    }
  });

  ctx.restore();
}
