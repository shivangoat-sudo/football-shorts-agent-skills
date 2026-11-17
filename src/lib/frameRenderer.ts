import type { FocusKeyframe, TimedCaption } from "./videoAnalyzer";

export interface FilterPreset {
  id: string;
  label: string;
  cssFilter: string;
}

export const FILTER_PRESETS: FilterPreset[] = [
  {
    id: "crisp",
    label: "Helder Studio",
    cssFilter: "url(#touchline-sharpen) contrast(1.07) saturate(1.10) brightness(1.03)",
  },
  {
    id: "podcast-contrast",
    label: "Diep Contrast",
    cssFilter: "url(#touchline-sharpen) contrast(1.14) saturate(1.06) brightness(1.02)",
  },
  {
    id: "warm",
    label: "Warm Studio",
    cssFilter: "url(#touchline-sharpen) contrast(1.06) saturate(1.14) sepia(0.07)",
  },
  {
    id: "none",
    label: "Origineel",
    cssFilter: "none",
  },
];

export function resolveActiveCaption(
  timedCaptions: TimedCaption[] | undefined,
  currentTimeSec: number,
  fallbackCaption: string
): string {
  if (timedCaptions && timedCaptions.length > 0) {
    const active = timedCaptions.find(
      (c) => currentTimeSec >= c.startSec - 0.08 && currentTimeSec <= c.endSec + 0.08
    );
    return active ? active.text : "";
  }
  return fallbackCaption;
}

function wrapCaptionLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const lines: string[] = [];
  let current = words[0];

  for (let i = 1; i < words.length; i++) {
    const next = `${current} ${words[i]}`;
    if (ctx.measureText(next).width <= maxWidth) {
      current = next;
    } else {
      lines.push(current);
      current = words[i];
    }
  }
  lines.push(current);
  return lines.slice(0, 3);
}

/**
 * Shared 9:16 reframing + speaker zoom + X/Y pan + sharpening + caption renderer
 * used by both the live preview canvas and the 1080x1920 Full HD exporter.
 */
export function drawReframedFrame(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  outWidth: number,
  outHeight: number,
  focus: FocusKeyframe,
  filterCss: string,
  caption: string
): void {
  const srcW = video.videoWidth || outWidth;
  const srcH = video.videoHeight || outHeight;
  const targetAspect = outWidth / outHeight;
  const srcAspect = srcW / srcH;
  const zoom = Math.max(1, Math.min(2, focus.zoom || 1));

  let baseW = srcW;
  let baseH = srcH;
  if (srcAspect > targetAspect) {
    baseW = srcH * targetAspect;
  } else {
    baseH = srcW / targetAspect;
  }

  const sw = baseW / zoom;
  const sh = baseH / zoom;

  const targetCenterX = (focus.focusXPercent / 100) * srcW;
  const targetCenterY = (focus.focusYPercent / 100) * srcH;

  const sx = Math.max(0, Math.min(srcW - sw, targetCenterX - sw / 2));
  const sy = Math.max(0, Math.min(srcH - sh, targetCenterY - sh / 2));

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, outWidth, outHeight);

  ctx.filter = filterCss || "none";
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, outWidth, outHeight);
  ctx.filter = "none";

  if (caption.trim()) {
    const scale = outWidth / 1080;
    const fontSize = Math.round(52 * scale);
    ctx.font = `700 ${fontSize}px 'Manrope', 'DM Sans', system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const lines = wrapCaptionLines(ctx, caption, outWidth - Math.round(148 * scale));
    const lineHeight = Math.round(66 * scale);
    const padY = Math.round(20 * scale);
    const boxHeight = lines.length * lineHeight + padY * 2;
    const boxY = outHeight - Math.round(420 * scale) - boxHeight / 2;

    ctx.fillStyle = "rgba(15, 23, 42, 0.84)";
    const boxWidth = Math.min(
      outWidth - Math.round(96 * scale),
      Math.max(...lines.map((l) => ctx.measureText(l).width)) +
        Math.round(72 * scale)
    );
    const boxX = (outWidth - boxWidth) / 2;

    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxWidth, boxHeight, Math.round(16 * scale));
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    lines.forEach((line, idx) => {
      const y = boxY + padY + lineHeight * (idx + 0.5);
      ctx.fillText(line, outWidth / 2, y);
    });
  }
}
