export type VectorArchetype =
  | "intro_roadmap"
  | "chapter_card"
  | "dynamic_duo"
  | "reaction_contrast"
  | "mirror_self"
  | "data_insight"
  | "message_thread"
  | "scale_balance"
  | "spotlight_focus"
  | "momentum_steps"
  | "brain_signal"
  | "doorway_choice"
  | "crowd_standout"
  | "orbit_gravity"
  | "shield_boundary"
  | "outro_takeaway";

export type UniquePropTag =
  | "none"
  | "chart"
  | "heart"
  | "message"
  | "timer"
  | "key"
  | "compass"
  | "trophy"
  | "target"
  | "flame"
  | "microphone"
  | "book"
  | "bolt"
  | "eye"
  | "check"
  | "question";

export type ContrastShiftMode = "black" | "invert_light" | "accent_flash";

export type SubtitleAccentTheme = "gold" | "cyan";

export type FocusCharacter = "man" | "woman" | "duo";

export type ManStance = "strong" | "neutral" | "mistake";

export type WomanMood = "warm" | "confident" | "curious" | "unimpressed";

export interface SceneAnimationSpec {
  archetype: VectorArchetype;
  contrastShift: ContrastShiftMode;
  isSectionCard?: boolean;
  leftLabel?: string;
  rightLabel?: string;
  badgeText?: string;
  propTag?: UniquePropTag;
  statValue?: string;
  pointNumber?: number;
  accentHex?: string;
  focusCharacter?: FocusCharacter;
  manStance?: ManStance;
  womanMood?: WomanMood;
}

export const VECTOR_ARCHETYPE_LABELS: Record<VectorArchetype, string> = {
  intro_roadmap: "Intro & 6-Point Roadmap",
  chapter_card: "Focus Point Title Card",
  dynamic_duo: "Man & Woman Dynamic",
  reaction_contrast: "Mistake vs Composed Stance",
  mirror_self: "Self-Reflection Mirror",
  data_insight: "Fact, Study & Data Metric",
  message_thread: "Message & Reply Timing",
  scale_balance: "Value Balance Scale",
  spotlight_focus: "Focused Presence & Eye Contact",
  momentum_steps: "Upward Mastery Steps",
  brain_signal: "Mental Shift & Observation",
  doorway_choice: "Intentional Direction",
  crowd_standout: "Calm Standout Among Crowd",
  orbit_gravity: "Attraction Orbit & Attention",
  shield_boundary: "Personal Boundary & Restraint",
  outro_takeaway: "Sunday Episode Bridge / Takeaway",
};

const STOP_WORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "to", "of",
  "and", "in", "on", "at", "it", "its", "this", "that", "for", "with", "as",
  "by", "or", "if", "you", "your", "they", "them", "we", "most", "just",
  "but", "so", "do", "don't",
]);

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function easeOutCubic(t: number): number {
  const x = clamp01(t);
  return 1 - Math.pow(1 - x, 3);
}

function easeInOutSine(t: number): number {
  return -(Math.cos(Math.PI * clamp01(t)) - 1) / 2;
}

function normalizeToken(word: string): string {
  return word.toLowerCase().replace(/[^a-z0-9\u00c0-\u024f]/gi, "");
}

export function resolveSubtitleAccentHex(
  theme: SubtitleAccentTheme,
  _isLightCanvas?: boolean
): string {
  if (theme === "cyan") {
    return "#22D3EE";
  }
  return "#FACC15";
}

function resolveSceneAccent(
  theme: SubtitleAccentTheme,
  customHex?: string
): string {
  if (theme === "cyan") return "#22D3EE";
  if (customHex && /^#[0-9a-f]{6}$/i.test(customHex.trim())) {
    const clean = customHex.trim().toUpperCase();
    // Preserve warm gold/yellow family or subtle secondary highlight without neon overload
    if (clean === "#D4AF37" || clean === "#FACC15" || clean === "#F59E0B" || clean === "#FBBF24") {
      return "#FACC15";
    }
    return clean;
  }
  return "#FACC15";
}

export function pickTakeawayWordIndex(
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
    if (STOP_WORDS.has(clean)) score -= 7;
    if (/[!?]$/.test(w)) score += 3;
    if (/^\d+/.test(clean)) score += 4;
    if (idx === words.length - 1) score += 1.4;
    if (score > bestScore) {
      bestScore = score;
      bestIdx = idx;
    }
  });
  return bestIdx;
}

type CharacterPose =
  | "confident_talk"
  | "relaxed_stand"
  | "thinking_chin"
  | "walking_stride"
  | "leaning_eager"
  | "crossed_arms"
  | "open_welcome"
  | "pointing_up";

type FaceMood =
  | "calm"
  | "warm"
  | "curious"
  | "focused"
  | "skeptical"
  | "confident"
  | "unimpressed";

/**
 * Draws a clean warm-gold Eye / Gaze icon + subtle dashed observation arc,
 * anchoring the visual language smoothly without distracting flicker.
 */
function drawWarmGoldEyeIcon(params: {
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  size: number;
  accentColor: string;
  inkColor: string;
  tSec: number;
}) {
  const { ctx, x, y, size, accentColor, tSec } = params;
  const r = size * 0.48;
  const pupilShift = Math.sin(tSec * 1.1) * r * 0.14;

  ctx.save();
  ctx.translate(x, y);

  // Outer calm dashed halo
  ctx.strokeStyle = accentColor;
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = Math.max(2, size * 0.04);
  ctx.setLineDash([6, 6]);
  ctx.lineDashOffset = -tSec * 12;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.35, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;

  // Crisp almond eye silhouette
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = Math.max(3, size * 0.08);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(-r, 0);
  ctx.quadraticCurveTo(0, -r * 0.72, r, 0);
  ctx.quadraticCurveTo(0, r * 0.72, -r, 0);
  ctx.stroke();

  // Golden iris + inner pinpoint
  ctx.beginPath();
  ctx.arc(pupilShift, 0, r * 0.28, 0, Math.PI * 2);
  ctx.fillStyle = accentColor;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(pupilShift, 0, r * 0.11, 0, Math.PI * 2);
  ctx.fillStyle = "#000000";
  ctx.fill();

  ctx.restore();
}

/**
 * Renders crisp white minimalist vector/line-art characters with consistent proportions across scenes:
 * - Confident Man: broad structured shoulders, crisp tailored lapels & pocket-square gold accent,
 *   sharp jawline, calm composed brows, warm gold wrist watch accent, grounded spine.
 * - Attractive, Graceful Woman: slender contoured silhouette, layered flowing hair line-art curves,
 *   almond eyes with subtle lashes, warm lips with gold accent, delicate gold earring & waist belt.
 */
function drawExpressiveCharacter(params: {
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  unit: number;
  variant: "man" | "woman";
  pose: CharacterPose;
  mood?: FaceMood;
  stance?: ManStance;
  inkColor: string;
  bgColor: string;
  accentColor: string;
  tSec: number;
  flipX?: boolean;
}) {
  const {
    ctx,
    x,
    y,
    unit,
    variant,
    pose,
    mood = "calm",
    stance = "strong",
    inkColor,
    bgColor,
    accentColor,
    tSec,
    flipX = false,
  } = params;

  const isMan = variant === "man";
  const effectivePose: CharacterPose =
    isMan && stance === "strong" && pose === "leaning_eager"
      ? "confident_talk"
      : pose;

  ctx.save();
  ctx.translate(x, y);
  if (flipX) ctx.scale(-1, 1);

  // Calm, natural breathing & subtle poise (zero rapid jitter)
  const breathe = Math.sin(tSec * 1.55) * unit * 0.022;
  const gentleSway = Math.sin(tSec * 0.95) * unit * 0.014;
  const talkBeat = Math.sin(tSec * 3.1);

  const bodyLean =
    isMan && stance === "mistake" && effectivePose === "leaning_eager"
      ? 0.11 + Math.sin(tSec * 1.8) * 0.015
      : effectivePose === "walking_stride"
        ? 0.035
        : effectivePose === "thinking_chin"
          ? -0.018
          : Math.sin(tSec * 1.0) * 0.009;

  ctx.translate(gentleSway, breathe);
  ctx.rotate(bodyLean);

  const limbW = Math.max(3, unit * (isMan ? 0.12 : 0.088));
  const outlineW = Math.max(2.2, unit * 0.026);
  ctx.strokeStyle = inkColor;
  ctx.fillStyle = inkColor;
  ctx.lineWidth = limbW;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const headR = unit * (isMan ? 0.345 : 0.32);
  const torsoH = unit * (isMan ? 1.32 : 1.2);
  const shoulderHalf = isMan ? unit * 0.56 : unit * 0.35;
  const waistHalf = isMan ? unit * 0.32 : unit * 0.195;
  const hipHalf = isMan ? unit * 0.35 : unit * 0.365;

  // --- Articulated Legs ---
  const hipY = -unit * 0.04;
  const kneeDrop = unit * (isMan ? 0.58 : 0.6);
  const ankleDrop = unit * (isMan ? 1.15 : 1.18);
  const stridePhase = effectivePose === "walking_stride" ? Math.sin(tSec * 3.0) : 0;

  const drawLeg = (hipX: number, phaseSign: number) => {
    const swing = stridePhase * phaseSign;
    const kneeX =
      hipX +
      (effectivePose === "walking_stride"
        ? swing * unit * 0.24
        : phaseSign * unit * (isMan ? 0.055 : 0.022));
    const kneeY = hipY + kneeDrop - Math.abs(swing) * unit * 0.04;
    const footX =
      hipX +
      (effectivePose === "walking_stride"
        ? swing * unit * 0.4
        : phaseSign * unit * (isMan ? 0.13 : 0.06));
    const footY = hipY + ankleDrop - Math.max(0, swing) * unit * 0.06;

    ctx.strokeStyle = inkColor;
    ctx.lineWidth = limbW;
    ctx.beginPath();
    ctx.moveTo(hipX, hipY);
    ctx.lineTo(kneeX, kneeY);
    ctx.lineTo(footX, footY);
    ctx.stroke();

    if (isMan) {
      ctx.beginPath();
      ctx.roundRect(
        footX - unit * 0.05,
        footY - limbW * 0.18,
        unit * 0.26,
        limbW * 0.78,
        limbW * 0.32
      );
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(footX - unit * 0.06, footY);
      ctx.lineTo(footX + unit * 0.18, footY + limbW * 0.38);
      ctx.lineTo(footX - unit * 0.04, footY + limbW * 0.42);
      ctx.closePath();
      ctx.fill();
      ctx.lineWidth = Math.max(2, limbW * 0.48);
      ctx.beginPath();
      ctx.moveTo(footX - unit * 0.04, footY + limbW * 0.18);
      ctx.lineTo(footX - unit * 0.05, footY + limbW * 0.62);
      ctx.stroke();
      ctx.lineWidth = limbW;
    }
  };

  drawLeg(-hipHalf * (isMan ? 0.44 : 0.32), -1);
  drawLeg(hipHalf * (isMan ? 0.44 : 0.32), 1);

  // --- Torso Silhouette (Tailored Jacket vs Graceful Hourglass Line-Art) ---
  const neckY = -torsoH;
  ctx.beginPath();
  ctx.moveTo(-unit * (isMan ? 0.13 : 0.09), neckY - unit * 0.06);
  ctx.bezierCurveTo(
    -shoulderHalf * 0.78,
    neckY - unit * 0.04,
    -shoulderHalf,
    neckY + unit * 0.12,
    -shoulderHalf * 0.96,
    neckY + unit * 0.3
  );
  ctx.bezierCurveTo(
    -waistHalf * 1.02,
    neckY + torsoH * 0.55,
    -hipHalf,
    hipY - unit * (isMan ? 0.08 : 0.18),
    -hipHalf * (isMan ? 0.94 : 1.06),
    hipY + unit * (isMan ? 0.06 : 0.16)
  );
  ctx.quadraticCurveTo(
    0,
    hipY + unit * (isMan ? 0.1 : 0.22),
    hipHalf * (isMan ? 0.94 : 1.06),
    hipY + unit * (isMan ? 0.06 : 0.16)
  );
  ctx.bezierCurveTo(
    hipHalf,
    hipY - unit * (isMan ? 0.08 : 0.18),
    waistHalf * 1.02,
    neckY + torsoH * 0.55,
    shoulderHalf * 0.96,
    neckY + unit * 0.3
  );
  ctx.bezierCurveTo(
    shoulderHalf,
    neckY + unit * 0.12,
    shoulderHalf * 0.78,
    neckY - unit * 0.04,
    unit * (isMan ? 0.13 : 0.09),
    neckY - unit * 0.06
  );
  ctx.closePath();
  ctx.fill();

  // Crisp line-art inner tailoring & warm gold accents
  ctx.save();
  ctx.strokeStyle = bgColor;
  ctx.lineWidth = Math.max(2, outlineW * 1.45);
  if (isMan) {
    // Sharp suit lapels & V collar
    ctx.beginPath();
    ctx.moveTo(-unit * 0.16, neckY + unit * 0.02);
    ctx.lineTo(0, neckY + unit * 0.36);
    ctx.lineTo(unit * 0.16, neckY + unit * 0.02);
    ctx.moveTo(-unit * 0.23, neckY + unit * 0.14);
    ctx.lineTo(-unit * 0.08, neckY + unit * 0.22);
    ctx.moveTo(unit * 0.23, neckY + unit * 0.14);
    ctx.lineTo(unit * 0.08, neckY + unit * 0.22);
    ctx.stroke();

    // Subtle warm gold pocket square line when demonstrating confident composure
    if (stance !== "mistake") {
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = Math.max(2, unit * 0.042);
      ctx.beginPath();
      ctx.moveTo(shoulderHalf * 0.28, neckY + unit * 0.44);
      ctx.lineTo(shoulderHalf * 0.54, neckY + unit * 0.44);
      ctx.stroke();
    }
  } else {
    // Graceful collarbone line & golden waist accent
    ctx.beginPath();
    ctx.moveTo(-unit * 0.14, neckY + unit * 0.03);
    ctx.quadraticCurveTo(0, neckY + unit * 0.26, unit * 0.14, neckY + unit * 0.03);
    ctx.stroke();

    ctx.strokeStyle = accentColor;
    ctx.lineWidth = Math.max(2.2, unit * 0.048);
    ctx.beginPath();
    ctx.moveTo(-waistHalf * 0.95, neckY + torsoH * 0.58);
    ctx.quadraticCurveTo(0, neckY + torsoH * 0.63, waistHalf * 0.95, neckY + torsoH * 0.58);
    ctx.stroke();
  }
  ctx.restore();

  // --- Articulated Arms (Smooth, Composed Gestures) ---
  const shoulderY = neckY + unit * 0.18;
  const drawArm = (
    sx: number,
    ex: number,
    ey: number,
    hx: number,
    hy: number,
    armColor = inkColor,
    showWatch = false
  ) => {
    ctx.save();
    ctx.strokeStyle = armColor;
    ctx.fillStyle = armColor;
    ctx.lineWidth = limbW * (isMan ? 0.94 : 0.78);
    ctx.beginPath();
    ctx.moveTo(sx, shoulderY);
    ctx.quadraticCurveTo(ex, ey, hx, hy);
    ctx.stroke();

    if (showWatch && isMan && stance !== "mistake") {
      const wx = ex * 0.22 + hx * 0.78;
      const wy = ey * 0.22 + hy * 0.78;
      ctx.fillStyle = accentColor;
      ctx.beginPath();
      ctx.arc(wx, wy, limbW * 0.46, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = armColor;
    }

    ctx.beginPath();
    ctx.arc(hx, hy, limbW * (isMan ? 0.56 : 0.44), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  if (effectivePose === "confident_talk") {
    const gL = Math.sin(tSec * 1.9) * unit * 0.08;
    const gR = Math.cos(tSec * 1.7) * unit * 0.1;
    drawArm(
      -shoulderHalf * 0.86,
      -shoulderHalf * 1.22,
      shoulderY + unit * 0.44,
      -shoulderHalf * 0.88,
      shoulderY + unit * 0.22 + gL
    );
    drawArm(
      shoulderHalf * 0.86,
      shoulderHalf * 1.38,
      shoulderY + unit * 0.34,
      shoulderHalf * 1.46,
      shoulderY - unit * 0.05 + gR,
      inkColor,
      true
    );
  } else if (effectivePose === "thinking_chin") {
    drawArm(
      -shoulderHalf * 0.86,
      -shoulderHalf * 1.12,
      shoulderY + unit * 0.48,
      -hipHalf * 0.58,
      hipY - unit * 0.04
    );
    drawArm(
      shoulderHalf * 0.86,
      shoulderHalf * 1.24,
      shoulderY + unit * 0.26,
      unit * 0.16,
      neckY - headR * 0.36 + Math.sin(tSec * 1.4) * unit * 0.02,
      inkColor,
      true
    );
  } else if (effectivePose === "leaning_eager") {
    const reach = Math.sin(tSec * 2.2) * unit * 0.06;
    drawArm(
      -shoulderHalf * 0.82,
      shoulderHalf * 0.4,
      shoulderY + unit * 0.18,
      shoulderHalf * 1.35,
      shoulderY - unit * 0.16 + reach
    );
    drawArm(
      shoulderHalf * 0.82,
      shoulderHalf * 1.3,
      shoulderY + unit * 0.08,
      shoulderHalf * 1.56,
      shoulderY - unit * 0.3 - reach
    );
  } else if (effectivePose === "crossed_arms") {
    ctx.save();
    ctx.strokeStyle = bgColor;
    ctx.lineWidth = limbW * 1.05;
    ctx.beginPath();
    ctx.moveTo(-shoulderHalf * 0.78, shoulderY + unit * 0.28);
    ctx.quadraticCurveTo(0, shoulderY + unit * 0.42, shoulderHalf * 0.65, shoulderY + unit * 0.22);
    ctx.stroke();
    ctx.restore();
    drawArm(
      -shoulderHalf * 0.86,
      -shoulderHalf * 1.12,
      shoulderY + unit * 0.34,
      shoulderHalf * 0.35,
      shoulderY + unit * 0.32
    );
    drawArm(
      shoulderHalf * 0.86,
      shoulderHalf * 1.12,
      shoulderY + unit * 0.34,
      -shoulderHalf * 0.35,
      shoulderY + unit * 0.26,
      inkColor,
      true
    );
  } else if (effectivePose === "open_welcome") {
    const lift = Math.sin(tSec * 1.8) * unit * 0.05;
    drawArm(
      -shoulderHalf * 0.86,
      -shoulderHalf * 1.34,
      shoulderY + unit * 0.28,
      -shoulderHalf * 1.56,
      shoulderY - unit * 0.08 + lift
    );
    drawArm(
      shoulderHalf * 0.86,
      shoulderHalf * 1.34,
      shoulderY + unit * 0.28,
      shoulderHalf * 1.56,
      shoulderY - unit * 0.08 + lift,
      inkColor,
      true
    );
  } else if (effectivePose === "pointing_up") {
    drawArm(
      -shoulderHalf * 0.86,
      -shoulderHalf * 1.1,
      shoulderY + unit * 0.46,
      -hipHalf * 0.68,
      hipY - unit * 0.05
    );
    drawArm(
      shoulderHalf * 0.86,
      shoulderHalf * 1.32,
      shoulderY - unit * 0.1,
      shoulderHalf * 1.12,
      neckY - headR * 1.15 + Math.sin(tSec * 2.0) * unit * 0.025,
      accentColor,
      true
    );
  } else if (effectivePose === "walking_stride") {
    drawArm(
      -shoulderHalf * 0.86,
      -shoulderHalf * 1.05 - stridePhase * unit * 0.18,
      shoulderY + unit * 0.4,
      -shoulderHalf * 0.9 - stridePhase * unit * 0.36,
      shoulderY + unit * 0.78
    );
    drawArm(
      shoulderHalf * 0.86,
      shoulderHalf * 1.05 + stridePhase * unit * 0.18,
      shoulderY + unit * 0.4,
      shoulderHalf * 0.9 + stridePhase * unit * 0.36,
      shoulderY + unit * 0.78,
      inkColor,
      true
    );
  } else {
    drawArm(
      -shoulderHalf * 0.86,
      -shoulderHalf * (isMan ? 1.08 : 1.18),
      shoulderY + unit * 0.38,
      -hipHalf * (isMan ? 0.75 : 0.9),
      hipY - unit * (isMan ? 0.04 : 0.24)
    );
    drawArm(
      shoulderHalf * 0.86,
      shoulderHalf * 1.16,
      shoulderY + unit * 0.36,
      shoulderHalf * 1.02,
      shoulderY + unit * 0.48 + Math.sin(tSec * 1.4) * unit * 0.025,
      inkColor,
      true
    );
  }

  // --- Expressive Head, Sculpted Hair Line-Art, Eyes, Lashes & Lips ---
  const headTilt =
    effectivePose === "thinking_chin"
      ? 0.06
      : effectivePose === "confident_talk"
        ? talkBeat * 0.025
        : Math.sin(tSec * 1.2) * (isMan ? 0.015 : 0.028);
  const headY = neckY - headR * (isMan ? 1.38 : 1.48);

  ctx.save();
  ctx.translate(0, headY);
  ctx.rotate(headTilt);

  ctx.fillStyle = inkColor;
  const neckW = unit * (isMan ? 0.22 : 0.14);
  ctx.fillRect(-neckW / 2, headR * 0.65, neckW, unit * 0.38);

  if (!isMan) {
    // Flowing layered back hair behind head with smooth gentle wave
    const hairSway = Math.sin(tSec * 1.35) * headR * 0.06;
    ctx.beginPath();
    ctx.moveTo(-headR * 1.06, -headR * 0.15);
    ctx.bezierCurveTo(
      -headR * 1.48,
      headR * 0.45,
      -headR * 1.35 + hairSway,
      headR * 1.55,
      -headR * 0.65 + hairSway,
      headR * 2.12
    );
    ctx.quadraticCurveTo(
      0,
      headR * 1.72,
      headR * 0.62 + hairSway,
      headR * 2.05
    );
    ctx.bezierCurveTo(
      headR * 1.24 + hairSway,
      headR * 1.35,
      headR * 1.12,
      headR * 0.35,
      headR * 0.94,
      -headR * 0.22
    );
    ctx.arc(0, -headR * 0.18, headR * 1.08, 0, Math.PI, true);
    ctx.closePath();
    ctx.fill();
  }

  // Head contour (sculpted masculine jaw vs soft graceful oval)
  ctx.beginPath();
  if (isMan) {
    ctx.moveTo(0, -headR * 1.04);
    ctx.bezierCurveTo(
      headR * 0.96,
      -headR * 1.02,
      headR * 0.98,
      -headR * 0.15,
      headR * 0.86,
      headR * 0.56
    );
    ctx.quadraticCurveTo(headR * 0.52, headR * 1.02, 0.12 * headR, headR * 1.04);
    ctx.quadraticCurveTo(-headR * 0.72, headR * 0.98, -headR * 0.94, headR * 0.42);
    ctx.bezierCurveTo(
      -headR * 1.02,
      -headR * 0.2,
      -headR * 0.92,
      -headR * 1.04,
      0,
      -headR * 1.04
    );
    ctx.closePath();
  } else {
    ctx.ellipse(0, 0, headR * 0.9, headR * 1.02, 0, 0, Math.PI * 2);
  }
  ctx.fill();

  if (isMan) {
    ctx.beginPath();
    ctx.moveTo(-headR * 0.92, -headR * 0.28);
    ctx.bezierCurveTo(
      -headR * 0.74,
      -headR * 1.48,
      headR * 0.55,
      -headR * 1.56,
      headR * 1.02,
      -headR * 0.48
    );
    ctx.quadraticCurveTo(headR * 0.32, -headR * 0.78, -headR * 0.92, -headR * 0.28);
    ctx.closePath();
    ctx.fill();

    ctx.save();
    ctx.strokeStyle = bgColor;
    ctx.lineWidth = Math.max(1.8, headR * 0.08);
    ctx.beginPath();
    ctx.moveTo(-headR * 0.62, -headR * 0.65);
    ctx.quadraticCurveTo(headR * 0.15, -headR * 0.92, headR * 0.84, -headR * 0.54);
    ctx.stroke();
    ctx.restore();
  } else {
    ctx.beginPath();
    ctx.moveTo(-headR * 1.0, -headR * 0.28);
    ctx.bezierCurveTo(
      -headR * 0.62,
      -headR * 1.32,
      headR * 0.56,
      -headR * 1.28,
      headR * 0.98,
      -headR * 0.32
    );
    ctx.quadraticCurveTo(headR * 0.28, -headR * 0.78, -headR * 0.38, -headR * 0.38);
    ctx.quadraticCurveTo(-headR * 0.78, -headR * 0.18, -headR * 1.0, -headR * 0.28);
    ctx.closePath();
    ctx.fill();

    ctx.save();
    ctx.strokeStyle = bgColor;
    ctx.lineWidth = Math.max(1.6, headR * 0.072);
    ctx.beginPath();
    ctx.moveTo(-headR * 0.82, -headR * 0.38);
    ctx.quadraticCurveTo(-headR * 1.15, headR * 0.55, -headR * 0.78, headR * 1.65);
    ctx.moveTo(-headR * 0.52, -headR * 0.72);
    ctx.quadraticCurveTo(headR * 0.25, -headR * 0.95, headR * 0.82, -headR * 0.36);
    ctx.stroke();
    ctx.restore();

    // Subtle warm gold earring accent
    ctx.save();
    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.arc(-headR * 0.8, headR * 0.35, headR * 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // --- Calm Natural Blinking Eyes & Expressive Brows ---
  const blinkCycle = tSec % 4.2;
  const isBlinking = blinkCycle > 4.06;
  const eyeX1 = headR * 0.11;
  const eyeX2 = headR * 0.49;
  const eyeY = -headR * 0.04;

  ctx.fillStyle = bgColor;
  ctx.strokeStyle = bgColor;
  ctx.lineWidth = Math.max(1.8, headR * 0.1);

  if (isBlinking) {
    ctx.beginPath();
    ctx.moveTo(eyeX1 - headR * 0.11, eyeY);
    ctx.quadraticCurveTo(eyeX1, eyeY + headR * 0.04, eyeX1 + headR * 0.11, eyeY);
    ctx.moveTo(eyeX2 - headR * 0.11, eyeY);
    ctx.quadraticCurveTo(eyeX2, eyeY + headR * 0.04, eyeX2 + headR * 0.11, eyeY);
    ctx.stroke();
  } else if (!isMan) {
    const eyeRy = mood === "curious" ? headR * 0.125 : headR * 0.098;
    ctx.beginPath();
    ctx.ellipse(eyeX1, eyeY, headR * 0.1, eyeRy, -0.08, 0, Math.PI * 2);
    ctx.ellipse(eyeX2, eyeY, headR * 0.1, eyeRy, 0.08, 0, Math.PI * 2);
    ctx.fill();

    ctx.lineWidth = Math.max(1.5, headR * 0.078);
    ctx.beginPath();
    ctx.moveTo(eyeX1 - headR * 0.1, eyeY - headR * 0.02);
    ctx.lineTo(eyeX1 - headR * 0.17, eyeY - headR * 0.09);
    ctx.moveTo(eyeX2 + headR * 0.1, eyeY - headR * 0.02);
    ctx.lineTo(eyeX2 + headR * 0.17, eyeY - headR * 0.09);
    ctx.stroke();
  } else {
    const eyeRy = mood === "curious" ? headR * 0.11 : headR * 0.085;
    ctx.beginPath();
    ctx.ellipse(eyeX1, eyeY, headR * 0.095, eyeRy, 0, 0, Math.PI * 2);
    ctx.ellipse(eyeX2, eyeY, headR * 0.095, eyeRy, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.lineWidth = Math.max(1.6, headR * (isMan ? 0.105 : 0.075));
  ctx.beginPath();
  if (mood === "skeptical" || mood === "unimpressed") {
    ctx.moveTo(eyeX1 - headR * 0.12, eyeY - headR * 0.24);
    ctx.lineTo(eyeX1 + headR * 0.11, eyeY - headR * 0.19);
    ctx.moveTo(eyeX2 - headR * 0.11, eyeY - headR * 0.28);
    ctx.lineTo(eyeX2 + headR * 0.13, eyeY - headR * 0.25);
  } else if (mood === "focused" || mood === "confident") {
    ctx.moveTo(eyeX1 - headR * 0.12, eyeY - headR * 0.25);
    ctx.lineTo(eyeX1 + headR * 0.12, eyeY - headR * 0.21);
    ctx.moveTo(eyeX2 - headR * 0.1, eyeY - headR * 0.21);
    ctx.lineTo(eyeX2 + headR * 0.12, eyeY - headR * 0.25);
  } else {
    ctx.moveTo(eyeX1 - headR * 0.12, eyeY - headR * 0.24);
    ctx.quadraticCurveTo(eyeX1, eyeY - headR * 0.33, eyeX1 + headR * 0.12, eyeY - headR * 0.24);
    ctx.moveTo(eyeX2 - headR * 0.12, eyeY - headR * 0.24);
    ctx.quadraticCurveTo(eyeX2, eyeY - headR * 0.33, eyeX2 + headR * 0.12, eyeY - headR * 0.24);
  }
  ctx.stroke();

  const mouthY = headR * 0.43;
  const mouthOpen =
    effectivePose === "confident_talk" ? (0.4 + 0.45 * talkBeat) * headR * 0.07 : 0;

  if (!isMan) {
    ctx.strokeStyle = bgColor;
    ctx.lineWidth = Math.max(1.6, headR * 0.08);
    ctx.beginPath();
    if (mood === "unimpressed") {
      ctx.moveTo(headR * 0.15, mouthY + headR * 0.03);
      ctx.lineTo(headR * 0.44, mouthY);
    } else {
      ctx.moveTo(headR * 0.12, mouthY);
      ctx.quadraticCurveTo(
        headR * 0.31,
        mouthY + headR * 0.15 + mouthOpen,
        headR * 0.5,
        mouthY - headR * 0.02
      );
    }
    ctx.stroke();

    ctx.strokeStyle = accentColor;
    ctx.lineWidth = Math.max(1.2, headR * 0.055);
    ctx.beginPath();
    ctx.moveTo(headR * 0.16, mouthY - headR * 0.03);
    ctx.lineTo(headR * 0.31, mouthY - headR * 0.06);
    ctx.lineTo(headR * 0.46, mouthY - headR * 0.03);
    ctx.stroke();
  } else {
    ctx.beginPath();
    if (mood === "warm" || mood === "confident" || effectivePose === "open_welcome") {
      ctx.moveTo(headR * 0.12, mouthY);
      ctx.quadraticCurveTo(headR * 0.31, mouthY + headR * 0.11 + mouthOpen, headR * 0.5, mouthY);
    } else {
      ctx.moveTo(headR * 0.14, mouthY);
      ctx.quadraticCurveTo(headR * 0.31, mouthY + mouthOpen, headR * 0.48, mouthY);
    }
    ctx.stroke();
  }

  ctx.restore();
  ctx.restore();
}

function drawUniquePropBadge(params: {
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  size: number;
  propTag: UniquePropTag;
  inkColor: string;
  bgColor: string;
  accentColor: string;
  tSec: number;
}) {
  const { ctx, x, y, size, propTag, inkColor, bgColor, accentColor, tSec } = params;
  if (!propTag || propTag === "none") return;

  if (propTag === "eye") {
    drawWarmGoldEyeIcon({ ctx, x, y, size: size * 1.15, accentColor, inkColor, tSec });
    return;
  }

  const bob = Math.sin(tSec * 1.8) * size * 0.04;
  ctx.save();
  ctx.translate(x, y + bob);

  ctx.fillStyle = bgColor;
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = Math.max(2.5, size * 0.055);
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.56, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = inkColor;
  ctx.fillStyle = accentColor;
  ctx.lineWidth = Math.max(2.5, size * 0.065);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const r = size * 0.29;
  switch (propTag) {
    case "chart": {
      ctx.beginPath();
      ctx.moveTo(-r, r * 0.8);
      ctx.lineTo(-r * 0.3, r * 0.15);
      ctx.lineTo(r * 0.2, r * 0.4);
      ctx.lineTo(r, -r * 0.65);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(r, -r * 0.65, r * 0.18, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "heart": {
      ctx.beginPath();
      ctx.moveTo(0, r * 0.85);
      ctx.bezierCurveTo(-r * 1.2, r * 0.1, -r * 1.1, -r * 0.9, 0, -r * 0.25);
      ctx.bezierCurveTo(r * 1.1, -r * 0.9, r * 1.2, r * 0.1, 0, r * 0.85);
      ctx.fill();
      break;
    }
    case "message": {
      ctx.strokeRect(-r, -r * 0.68, r * 2, r * 1.36);
      ctx.beginPath();
      ctx.moveTo(-r * 0.9, -r * 0.6);
      ctx.lineTo(0, r * 0.15);
      ctx.lineTo(r * 0.9, -r * 0.6);
      ctx.stroke();
      break;
    }
    case "timer": {
      ctx.beginPath();
      ctx.arc(0, r * 0.08, r * 0.85, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = accentColor;
      ctx.beginPath();
      ctx.moveTo(0, r * 0.08);
      ctx.lineTo(r * 0.45, -r * 0.35);
      ctx.stroke();
      break;
    }
    case "key": {
      ctx.beginPath();
      ctx.arc(-r * 0.45, 0, r * 0.38, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-r * 0.07, 0);
      ctx.lineTo(r * 0.95, 0);
      ctx.lineTo(r * 0.95, r * 0.35);
      ctx.moveTo(r * 0.55, 0);
      ctx.lineTo(r * 0.55, r * 0.28);
      ctx.stroke();
      break;
    }
    case "compass": {
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.95, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.62);
      ctx.lineTo(r * 0.26, 0);
      ctx.lineTo(0, r * 0.62);
      ctx.lineTo(-r * 0.26, 0);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "trophy": {
      ctx.beginPath();
      ctx.moveTo(-r * 0.6, -r * 0.65);
      ctx.lineTo(r * 0.6, -r * 0.65);
      ctx.lineTo(r * 0.4, r * 0.2);
      ctx.lineTo(-r * 0.4, r * 0.2);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, r * 0.2);
      ctx.lineTo(0, r * 0.72);
      ctx.moveTo(-r * 0.45, r * 0.72);
      ctx.lineTo(r * 0.45, r * 0.72);
      ctx.stroke();
      break;
    }
    case "target": {
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.92, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.46, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.16, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "bolt": {
      ctx.beginPath();
      ctx.moveTo(r * 0.18, -r * 0.95);
      ctx.lineTo(-r * 0.55, r * 0.08);
      ctx.lineTo(r * 0.05, r * 0.08);
      ctx.lineTo(-r * 0.18, r * 0.95);
      ctx.lineTo(r * 0.55, -r * 0.08);
      ctx.lineTo(-r * 0.05, -r * 0.08);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "check": {
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = Math.max(3.2, size * 0.088);
      ctx.beginPath();
      ctx.moveTo(-r * 0.72, r * 0.05);
      ctx.lineTo(-r * 0.15, r * 0.62);
      ctx.lineTo(r * 0.8, -r * 0.55);
      ctx.stroke();
      break;
    }
    case "question": {
      ctx.font = `700 ${Math.round(size * 0.55)}px 'Poppins', sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("?", 0, 2);
      break;
    }
    default: {
      ctx.beginPath();
      ctx.moveTo(-r * 0.75, -r * 0.6);
      ctx.lineTo(0, -r * 0.35);
      ctx.lineTo(r * 0.75, -r * 0.6);
      ctx.lineTo(r * 0.75, r * 0.65);
      ctx.lineTo(0, r * 0.4);
      ctx.lineTo(-r * 0.75, r * 0.65);
      ctx.closePath();
      ctx.stroke();
      break;
    }
  }

  ctx.restore();
}

export function draw2DVectorSceneFrame(params: {
  ctx: CanvasRenderingContext2D;
  outWidth: number;
  outHeight: number;
  currentTimeSec: number;
  sceneStartSec: number;
  sceneEndSec: number;
  sectionLabel: string;
  spec: SceneAnimationSpec;
  accentTheme: SubtitleAccentTheme;
  aspectRatio: "9:16" | "16:9";
}): { isLightBg: boolean } {
  const {
    ctx,
    outWidth,
    outHeight,
    currentTimeSec,
    sceneStartSec,
    sceneEndSec,
    sectionLabel,
    spec,
    accentTheme,
  } = params;

  const sceneDur = Math.max(0.5, sceneEndSec - sceneStartSec);
  const elapsed = Math.max(0, currentTimeSec - sceneStartSec);
  const progress = clamp01(elapsed / sceneDur);
  // Calm, smooth eased entry & settling curves — ZERO rapid strobing or bouncy jitter
  const enter = easeOutCubic(Math.min(1, elapsed / 0.45));

  // Pitch-black (#000000) strictly as clean high-contrast backdrop (never flashing white/strobing)
  const isLightBg = false;
  const bgColor = "#000000";
  const inkColor = "#FFFFFF";
  const mutedInk = "rgba(255,255,255,0.28)";
  const softCardBg = "rgba(255,255,255,0.06)";
  const accentColor = resolveSceneAccent(accentTheme, spec.accentHex);

  ctx.save();
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, outWidth, outHeight);

  // Subtle calm warm gold radial aura on accent moments (never harsh flicker/strobe)
  if (spec.contrastShift === "accent_flash" || spec.contrastShift === "invert_light") {
    const grad = ctx.createRadialGradient(
      outWidth / 2,
      outHeight * 0.42,
      Math.min(outWidth, outHeight) * 0.04,
      outWidth / 2,
      outHeight * 0.42,
      Math.max(outWidth, outHeight) * 0.48
    );
    grad.addColorStop(0, "rgba(250, 204, 21, 0.08)");
    grad.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, outWidth, outHeight);
  }

  // Bold, generous scaling so figures & elements read loudly on BOTH 9:16 mobile & 16:9 desktop
  const isPortrait = outHeight > outWidth;
  const minDim = Math.min(outWidth, outHeight);
  const unit = isPortrait ? outWidth * 0.136 : outHeight * 0.145;
  const stageCenterY = outHeight * (isPortrait ? 0.425 : 0.45);

  // Very gentle calm camera float
  const camDriftX = Math.sin(currentTimeSec * 0.7) * unit * 0.028;
  const camDriftY = Math.cos(currentTimeSec * 0.6) * unit * 0.02;

  // Clean minimalist top section kicker
  if (sectionLabel && !spec.isSectionCard && spec.archetype !== "chapter_card") {
    ctx.save();
    ctx.font = `600 ${Math.round(minDim * 0.024)}px 'Plus Jakarta Sans', 'Poppins', sans-serif`;
    ctx.fillStyle = mutedInk;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const prefix = spec.pointNumber ? `0${spec.pointNumber} · ` : "";
    ctx.fillText(
      `${prefix}${sectionLabel.toUpperCase()}`,
      outWidth / 2,
      outHeight * 0.068
    );
    ctx.restore();
  }

  // Smooth thin top accent hairline
  ctx.fillStyle = accentColor;
  ctx.globalAlpha = 0.72;
  ctx.fillRect(0, 0, outWidth * progress, Math.max(4, minDim * 0.004));
  ctx.globalAlpha = 1;

  ctx.translate(camDriftX, camDriftY);
  // Smooth composed scene fade-in
  ctx.globalAlpha = 0.35 + 0.65 * enter;

  const arch = spec.isSectionCard ? "chapter_card" : spec.archetype;
  const focusChar: FocusCharacter = spec.focusCharacter || "man";
  const manStance: ManStance = spec.manStance || "strong";
  const womanMood: FaceMood = spec.womanMood || "warm";
  const primaryVariant: "man" | "woman" = focusChar === "woman" ? "woman" : "man";
  const primaryMood: FaceMood =
    primaryVariant === "woman"
      ? womanMood
      : manStance === "mistake"
        ? "skeptical"
        : "confident";

  const duoSpread = isPortrait ? unit * 1.42 : unit * 2.05;

  switch (arch) {
    case "intro_roadmap": {
      const pointTotal = Math.max(2, Math.min(6, Number(spec.pointNumber || 6)));
      const cardY = stageCenterY - unit * 1.65;
      const spacing = isPortrait ? unit * 0.88 : unit * 1.18;
      const nodesOffsetX = isPortrait ? 0 : unit * 0.9;
      const startX = outWidth / 2 + nodesOffsetX - ((pointTotal - 1) * spacing) / 2;

      drawExpressiveCharacter({
        ctx,
        x: isPortrait ? outWidth / 2 : outWidth / 2 - unit * 2.25,
        y: isPortrait ? stageCenterY + unit * 0.92 : stageCenterY + unit * 0.68,
        unit: unit * 0.96,
        variant: primaryVariant,
        pose: "open_welcome",
        mood: primaryVariant === "woman" ? womanMood : "confident",
        stance: manStance === "mistake" ? "neutral" : manStance,
        inkColor,
        bgColor,
        accentColor,
        tSec: currentTimeSec,
      });

      for (let i = 0; i < pointTotal; i++) {
        const nx = startX + i * spacing;
        const lit = progress >= i / pointTotal;
        ctx.save();
        ctx.translate(nx, cardY);
        ctx.fillStyle = lit ? accentColor : softCardBg;
        ctx.strokeStyle = lit ? accentColor : inkColor;
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.arc(0, 0, unit * 0.34, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = lit ? "#000000" : inkColor;
        ctx.font = `700 ${Math.round(unit * 0.34)}px 'Poppins', sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(i + 1), 0, 1);
        ctx.restore();

        if (i < pointTotal - 1) {
          ctx.strokeStyle = mutedInk;
          ctx.setLineDash([5, 5]);
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(nx + unit * 0.38, cardY);
          ctx.lineTo(nx + spacing - unit * 0.38, cardY);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      if (spec.badgeText || spec.statValue) {
        ctx.fillStyle = inkColor;
        ctx.font = `700 ${Math.round(minDim * 0.04)}px 'Poppins', sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText(
          spec.statValue || spec.badgeText || `${pointTotal} KEY SHIFTS`,
          outWidth / 2 + nodesOffsetX,
          cardY + unit * 0.78
        );
      }
      break;
    }

    case "chapter_card": {
      const slideY = (1 - enter) * unit * 0.35;
      const lineW = minDim * 0.48 * enter;
      ctx.save();
      ctx.translate(outWidth / 2, stageCenterY - unit * 0.25 + slideY);

      if (spec.pointNumber) {
        ctx.font = `700 ${Math.round(minDim * 0.056)}px 'JetBrains Mono', monospace`;
        ctx.fillStyle = accentColor;
        ctx.textAlign = "center";
        ctx.fillText(`0${spec.pointNumber}`, 0, -unit * 1.25);
      }

      ctx.strokeStyle = accentColor;
      ctx.lineWidth = Math.max(3.5, minDim * 0.005);
      ctx.beginPath();
      ctx.moveTo(-lineW / 2, -unit * 0.74);
      ctx.lineTo(lineW / 2, -unit * 0.74);
      ctx.stroke();

      const titleFont = Math.round(minDim * (isPortrait ? 0.072 : 0.068));
      ctx.font = `700 ${titleFont}px 'Poppins', 'Plus Jakarta Sans', sans-serif`;
      ctx.fillStyle = inkColor;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const label = (sectionLabel || spec.badgeText || "FOCUS POINT").trim();
      ctx.fillText(label, 0, 0, outWidth * 0.86);

      if (spec.badgeText && spec.badgeText !== label) {
        ctx.font = `600 ${Math.round(titleFont * 0.44)}px 'Plus Jakarta Sans', sans-serif`;
        ctx.fillStyle = accentColor;
        ctx.fillText(spec.badgeText, 0, unit * 0.9, outWidth * 0.82);
      }
      ctx.restore();
      break;
    }

    case "dynamic_duo": {
      const gap = duoSpread * (1 - easeInOutSine(progress) * 0.12);
      drawExpressiveCharacter({
        ctx,
        x: outWidth / 2 - gap,
        y: stageCenterY + unit * 0.62,
        unit: unit * 0.98,
        variant: "man",
        pose: manStance === "mistake" ? "leaning_eager" : "confident_talk",
        mood: manStance === "mistake" ? "skeptical" : "confident",
        stance: manStance,
        inkColor,
        bgColor,
        accentColor,
        tSec: currentTimeSec,
      });
      drawExpressiveCharacter({
        ctx,
        x: outWidth / 2 + gap,
        y: stageCenterY + unit * 0.62,
        unit: unit * 0.95,
        variant: "woman",
        pose: womanMood === "unimpressed" ? "crossed_arms" : "relaxed_stand",
        mood: womanMood,
        inkColor,
        bgColor,
        accentColor,
        tSec: currentTimeSec,
        flipX: true,
      });

      // Calm dashed gold gaze line & centered Eye motif matching visual language
      ctx.save();
      ctx.strokeStyle = womanMood === "unimpressed" ? mutedInk : accentColor;
      ctx.setLineDash([8, 8]);
      ctx.lineDashOffset = -currentTimeSec * 16;
      ctx.lineWidth = Math.max(2.4, unit * 0.025);
      ctx.beginPath();
      ctx.moveTo(outWidth / 2 - gap * 0.62, stageCenterY - unit * 1.15);
      ctx.quadraticCurveTo(
        outWidth / 2,
        stageCenterY - unit * 1.95,
        outWidth / 2 + gap * 0.62,
        stageCenterY - unit * 1.15
      );
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      if (womanMood !== "unimpressed") {
        drawWarmGoldEyeIcon({
          ctx,
          x: outWidth / 2,
          y: stageCenterY - unit * 1.85,
          size: unit * 0.95,
          accentColor,
          inkColor,
          tSec: currentTimeSec,
        });
      }
      break;
    }

    case "reaction_contrast": {
      const splitOffset = isPortrait ? outWidth * 0.255 : outWidth * 0.22;
      const headerY = stageCenterY - unit * 2.25;
      const figY = stageCenterY + unit * 0.62;

      ctx.strokeStyle = mutedInk;
      ctx.setLineDash([7, 7]);
      ctx.lineWidth = Math.max(2.2, minDim * 0.003);
      ctx.beginPath();
      ctx.moveTo(outWidth / 2, stageCenterY - unit * 2.4 * enter);
      ctx.lineTo(outWidth / 2, stageCenterY + unit * 1.9 * enter);
      ctx.stroke();
      ctx.setLineDash([]);

      const labelSize = Math.round(minDim * 0.036);
      ctx.font = `700 ${labelSize}px 'Poppins', 'Plus Jakarta Sans', sans-serif`;
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.fillText(spec.leftLabel || "OLD HABIT", outWidth / 2 - splitOffset, headerY);
      ctx.fillStyle = accentColor;
      ctx.fillText(spec.rightLabel || "COMPOSED", outWidth / 2 + splitOffset, headerY);

      drawExpressiveCharacter({
        ctx,
        x: outWidth / 2 - splitOffset,
        y: figY,
        unit: unit * 0.9,
        variant: "man",
        pose: "leaning_eager",
        mood: "skeptical",
        stance: "mistake",
        inkColor: "rgba(255,255,255,0.55)",
        bgColor,
        accentColor,
        tSec: currentTimeSec,
      });

      drawExpressiveCharacter({
        ctx,
        x: outWidth / 2 + splitOffset,
        y: figY,
        unit: unit * 0.98,
        variant: "man",
        pose: "confident_talk",
        mood: "confident",
        stance: "strong",
        inkColor,
        bgColor,
        accentColor,
        tSec: currentTimeSec,
        flipX: true,
      });
      break;
    }

    case "mirror_self": {
      const spread = isPortrait ? unit * 1.25 : unit * 1.55;
      const charX = outWidth / 2 - spread;
      const mirX = outWidth / 2 + spread;
      const fy = stageCenterY + unit * 0.6;

      ctx.save();
      ctx.strokeStyle = accentColor;
      ctx.fillStyle = softCardBg;
      ctx.lineWidth = Math.max(3, unit * 0.05);
      ctx.beginPath();
      ctx.roundRect(
        mirX - unit * 0.88,
        stageCenterY - unit * 1.95,
        unit * 1.76,
        unit * 2.95,
        unit * 0.2
      );
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      drawExpressiveCharacter({
        ctx,
        x: charX,
        y: fy,
        unit: unit * 0.96,
        variant: primaryVariant,
        pose: "thinking_chin",
        mood: "curious",
        stance: "strong",
        inkColor,
        bgColor,
        accentColor,
        tSec: currentTimeSec,
      });

      ctx.save();
      ctx.globalAlpha = 0.88 * enter;
      drawExpressiveCharacter({
        ctx,
        x: mirX,
        y: fy,
        unit: unit * 0.9,
        variant: primaryVariant,
        pose: "confident_talk",
        mood: "confident",
        stance: "strong",
        inkColor: accentColor,
        bgColor,
        accentColor,
        tSec: currentTimeSec,
        flipX: true,
      });
      ctx.restore();
      break;
    }

    case "data_insight": {
      const chartX = outWidth / 2 - (isPortrait ? unit * 1.15 : unit * 0.65);
      const chartY = stageCenterY + unit * 0.45;
      const chartW = isPortrait ? unit * 3.1 : unit * 3.9;
      const chartH = unit * 2.05;

      drawExpressiveCharacter({
        ctx,
        x: outWidth / 2 - (isPortrait ? unit * 1.9 : unit * 2.3),
        y: stageCenterY + unit * 0.72,
        unit: unit * 0.92,
        variant: primaryVariant,
        pose: "pointing_up",
        mood: "focused",
        stance: "strong",
        inkColor,
        bgColor,
        accentColor,
        tSec: currentTimeSec,
      });

      ctx.strokeStyle = mutedInk;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(chartX, chartY - chartH);
      ctx.lineTo(chartX, chartY);
      ctx.lineTo(chartX + chartW, chartY);
      ctx.stroke();

      const bars = [0.34, 0.56, 0.48, 0.86];
      const barW = chartW / 6.2;
      bars.forEach((hFrac, idx) => {
        const bx = chartX + unit * 0.34 + idx * (barW * 1.42);
        const bh = chartH * hFrac * easeOutCubic(clamp01((elapsed - idx * 0.1) / 0.55));
        ctx.fillStyle = idx === bars.length - 1 ? accentColor : inkColor;
        ctx.fillRect(bx, chartY - bh, barW, bh);
      });

      const statText = spec.statValue || spec.badgeText || "3x PRESENCE";
      ctx.fillStyle = accentColor;
      ctx.font = `700 ${Math.round(minDim * 0.056)}px 'Poppins', sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(statText, chartX + chartW * 0.52, chartY - chartH - unit * 0.4);
      break;
    }

    case "message_thread": {
      const hasDuo = focusChar === "duo";
      drawExpressiveCharacter({
        ctx,
        x: outWidth / 2 - (hasDuo ? duoSpread * 1.05 : unit * 1.45),
        y: stageCenterY + unit * 0.65,
        unit: unit * 0.95,
        variant: primaryVariant,
        pose: "confident_talk",
        mood: primaryMood,
        stance: manStance,
        inkColor,
        bgColor,
        accentColor,
        tSec: currentTimeSec,
      });

      if (hasDuo) {
        drawExpressiveCharacter({
          ctx,
          x: outWidth / 2 + duoSpread * 1.05,
          y: stageCenterY + unit * 0.65,
          unit: unit * 0.92,
          variant: "woman",
          pose: "relaxed_stand",
          mood: womanMood,
          inkColor,
          bgColor,
          accentColor,
          tSec: currentTimeSec,
          flipX: true,
        });
      }

      const bubbles = [
        {
          text: spec.leftLabel || "Over-explaining text...",
          xOff: hasDuo ? -0.1 : 0.72,
          yOff: -1.45,
          accent: false,
        },
        {
          text: spec.rightLabel || "Hold your frame.",
          xOff: hasDuo ? 0.15 : 1.1,
          yOff: -0.45,
          accent: true,
        },
      ];
      bubbles.forEach((b, idx) => {
        const appear = easeOutCubic(clamp01((elapsed - idx * 0.25) / 0.42));
        if (appear <= 0) return;
        const bx = outWidth / 2 + unit * b.xOff;
        const by = stageCenterY + unit * b.yOff;
        const bw = unit * (isPortrait ? 2.25 : 2.65);
        const bh = unit * 0.68;
        ctx.save();
        ctx.globalAlpha = appear;
        ctx.fillStyle = b.accent ? accentColor : softCardBg;
        ctx.strokeStyle = b.accent ? accentColor : inkColor;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.roundRect(bx - bw / 2, by - bh / 2, bw, bh, bh * 0.34);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = b.accent ? "#000000" : inkColor;
        ctx.font = `600 ${Math.round(unit * 0.24)}px 'Poppins', sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(b.text, bx, by, bw * 0.86);
        ctx.restore();
      });
      break;
    }

    case "scale_balance": {
      const tilt = Math.sin(currentTimeSec * 1.5) * 0.1 - enter * 0.12;
      const pivotX = outWidth / 2;
      const pivotY = stageCenterY - unit * 0.8;
      const armLen = unit * (isPortrait ? 1.75 : 2.1);

      ctx.strokeStyle = inkColor;
      ctx.lineWidth = Math.max(3.2, unit * 0.075);
      ctx.beginPath();
      ctx.moveTo(pivotX, pivotY);
      ctx.lineTo(pivotX, pivotY + unit * 2.1);
      ctx.moveTo(pivotX - unit * 0.72, pivotY + unit * 2.1);
      ctx.lineTo(pivotX + unit * 0.72, pivotY + unit * 2.1);
      ctx.stroke();

      const lx = pivotX - Math.cos(tilt) * armLen;
      const ly = pivotY - Math.sin(tilt) * armLen;
      const rx = pivotX + Math.cos(tilt) * armLen;
      const ry = pivotY + Math.sin(tilt) * armLen;

      ctx.strokeStyle = accentColor;
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(rx, ry);
      ctx.stroke();

      [
        { px: lx, py: ly, label: spec.leftLabel || "NOISE", fill: mutedInk },
        { px: rx, py: ry, label: spec.rightLabel || "PRESENCE", fill: accentColor },
      ].forEach((side) => {
        ctx.strokeStyle = inkColor;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(side.px, side.py);
        ctx.lineTo(side.px, side.py + unit * 0.75);
        ctx.stroke();

        ctx.fillStyle = side.fill;
        ctx.beginPath();
        ctx.roundRect(side.px - unit * 0.78, side.py + unit * 0.75, unit * 1.56, unit * 0.44, 8);
        ctx.fill();

        ctx.fillStyle = side.fill === accentColor ? "#000000" : inkColor;
        ctx.font = `700 ${Math.round(unit * 0.21)}px 'Poppins', sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText(side.label, side.px, side.py + unit * 1.02, unit * 1.44);
      });
      break;
    }

    case "spotlight_focus": {
      const sweep = Math.sin(currentTimeSec * 1.2) * unit * 0.25 * (1 - enter);
      ctx.save();
      const beamGrad = ctx.createLinearGradient(0, 0, 0, stageCenterY + unit * 2.0);
      beamGrad.addColorStop(0, "rgba(255,255,255,0.2)");
      beamGrad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = beamGrad;
      ctx.beginPath();
      ctx.moveTo(outWidth / 2 - unit * 0.5 + sweep, 0);
      ctx.lineTo(outWidth / 2 + unit * 0.5 + sweep, 0);
      ctx.lineTo(outWidth / 2 + unit * 2.4, stageCenterY + unit * 2.0);
      ctx.lineTo(outWidth / 2 - unit * 2.4, stageCenterY + unit * 2.0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      if (focusChar === "duo") {
        drawExpressiveCharacter({
          ctx,
          x: outWidth / 2 - duoSpread * 0.82,
          y: stageCenterY + unit * 0.62,
          unit: unit * 0.98,
          variant: "man",
          pose: "confident_talk",
          mood: "confident",
          stance: "strong",
          inkColor,
          bgColor,
          accentColor,
          tSec: currentTimeSec,
        });
        drawExpressiveCharacter({
          ctx,
          x: outWidth / 2 + duoSpread * 0.82,
          y: stageCenterY + unit * 0.62,
          unit: unit * 0.95,
          variant: "woman",
          pose: "relaxed_stand",
          mood: womanMood,
          inkColor,
          bgColor,
          accentColor,
          tSec: currentTimeSec,
          flipX: true,
        });
      } else {
        drawExpressiveCharacter({
          ctx,
          x: outWidth / 2,
          y: stageCenterY + unit * 0.62,
          unit: unit * 1.04,
          variant: primaryVariant,
          pose: "confident_talk",
          mood: primaryVariant === "woman" ? womanMood : "confident",
          stance: "strong",
          inkColor,
          bgColor,
          accentColor,
          tSec: currentTimeSec,
        });
      }
      break;
    }

    case "momentum_steps": {
      const stepCount = 4;
      const baseX = outWidth / 2 - unit * 1.75;
      const baseY = stageCenterY + unit * 1.4;
      const stepW = unit * 0.88;
      const stepH = unit * 0.54;

      for (let i = 0; i < stepCount; i++) {
        const sx = baseX + i * stepW;
        const sy = baseY - (i + 1) * stepH;
        const active = progress >= i / stepCount;
        ctx.fillStyle = active ? accentColor : softCardBg;
        ctx.strokeStyle = active ? accentColor : inkColor;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.roundRect(sx, sy, stepW * 0.92, (i + 1) * stepH, 4);
        ctx.fill();
        ctx.stroke();
      }

      const climbFrac = easeInOutSine(progress);
      drawExpressiveCharacter({
        ctx,
        x: baseX + unit * 0.25 + climbFrac * stepW * 2.65,
        y: baseY - stepH * (1 + climbFrac * 2.55) - unit * 0.92,
        unit: unit * 0.88,
        variant: primaryVariant,
        pose: "walking_stride",
        mood: "confident",
        stance: "strong",
        inkColor,
        bgColor,
        accentColor,
        tSec: currentTimeSec,
      });
      break;
    }

    case "brain_signal": {
      drawExpressiveCharacter({
        ctx,
        x: outWidth / 2,
        y: stageCenterY + unit * 0.78,
        unit: unit * 1.0,
        variant: primaryVariant,
        pose: "thinking_chin",
        mood: primaryVariant === "woman" ? womanMood : "focused",
        stance: "strong",
        inkColor,
        bgColor,
        accentColor,
        tSec: currentTimeSec,
      });

      const hx = outWidth / 2;
      const hy = stageCenterY - unit * 1.4;
      for (let r = 1; r <= 3; r++) {
        const pulse = (currentTimeSec * 0.65 + r * 0.33) % 1;
        ctx.strokeStyle = r === 1 ? accentColor : inkColor;
        ctx.globalAlpha = (1 - pulse) * 0.7;
        ctx.setLineDash([7, 6]);
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.arc(hx, hy, unit * (0.45 + pulse * 1.25), -Math.PI * 0.85, -Math.PI * 0.15);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      break;
    }

    case "doorway_choice": {
      const doorW = unit * 1.65;
      const doorH = unit * 2.9;
      const doorX = outWidth / 2 + unit * 1.2;
      const doorY = stageCenterY - doorH * 0.42;

      ctx.strokeStyle = accentColor;
      ctx.lineWidth = Math.max(3, unit * 0.08);
      ctx.strokeRect(doorX - doorW / 2, doorY, doorW, doorH);

      ctx.fillStyle = accentColor;
      ctx.globalAlpha = 0.2 + 0.08 * Math.sin(currentTimeSec * 1.8);
      ctx.fillRect(doorX - doorW / 2 + 6, doorY + 6, doorW * 0.35, doorH - 12);
      ctx.globalAlpha = 1;

      drawExpressiveCharacter({
        ctx,
        x: outWidth / 2 - unit * 1.55 + easeInOutSine(progress) * unit * 1.15,
        y: stageCenterY + unit * 0.62,
        unit: unit * 0.96,
        variant: primaryVariant,
        pose: "walking_stride",
        mood: "confident",
        stance: "strong",
        inkColor,
        bgColor,
        accentColor,
        tSec: currentTimeSec,
      });
      break;
    }

    case "crowd_standout": {
      const bgOffsets = isPortrait
        ? [-1.95, -1.05, 1.05, 1.95]
        : [-2.4, -1.3, 1.3, 2.4];
      ctx.save();
      ctx.globalAlpha = 0.24;
      bgOffsets.forEach((off, idx) => {
        drawExpressiveCharacter({
          ctx,
          x: outWidth / 2 + unit * off,
          y: stageCenterY + unit * 0.4,
          unit: unit * 0.78,
          variant: idx % 2 === 0 ? "man" : "woman",
          pose: "relaxed_stand",
          stance: "neutral",
          inkColor,
          bgColor,
          accentColor,
          tSec: currentTimeSec + idx * 0.7,
        });
      });
      ctx.restore();

      drawExpressiveCharacter({
        ctx,
        x: outWidth / 2,
        y: stageCenterY + unit * 0.78,
        unit: unit * 1.04,
        variant: primaryVariant,
        pose: "confident_talk",
        mood: "confident",
        stance: "strong",
        inkColor,
        bgColor,
        accentColor,
        tSec: currentTimeSec,
      });
      break;
    }

    case "orbit_gravity": {
      const cx = outWidth / 2;
      const cy = stageCenterY - unit * 0.1;

      ctx.strokeStyle = accentColor;
      ctx.setLineDash([9, 8]);
      ctx.lineDashOffset = -currentTimeSec * 14;
      ctx.globalAlpha = 0.65;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.ellipse(cx, cy, unit * (isPortrait ? 1.95 : 2.35), unit * 0.85, -0.12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;

      if (focusChar === "duo") {
        const pull = easeInOutSine(progress) * unit * 0.28;
        drawExpressiveCharacter({
          ctx,
          x: cx - duoSpread * 0.95 + pull,
          y: stageCenterY + unit * 0.62,
          unit: unit * 0.96,
          variant: "man",
          pose: "confident_talk",
          mood: "confident",
          stance: "strong",
          inkColor,
          bgColor,
          accentColor,
          tSec: currentTimeSec,
        });
        drawExpressiveCharacter({
          ctx,
          x: cx + duoSpread * 0.95 - pull,
          y: stageCenterY + unit * 0.62,
          unit: unit * 0.94,
          variant: "woman",
          pose: "relaxed_stand",
          mood: womanMood,
          inkColor,
          bgColor,
          accentColor,
          tSec: currentTimeSec,
          flipX: true,
        });
      } else {
        drawExpressiveCharacter({
          ctx,
          x: cx,
          y: stageCenterY + unit * 0.62,
          unit: unit * 1.0,
          variant: primaryVariant,
          pose: "open_welcome",
          mood: primaryVariant === "woman" ? womanMood : "confident",
          stance: "strong",
          inkColor,
          bgColor,
          accentColor,
          tSec: currentTimeSec,
        });
      }
      break;
    }

    case "shield_boundary": {
      const shieldX = outWidth / 2 + unit * 0.95;
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = Math.max(3.5, unit * 0.085);
      ctx.beginPath();
      ctx.arc(outWidth / 2 - unit * 0.4, stageCenterY, unit * 1.75 * enter, -0.85, 0.85);
      ctx.stroke();

      for (let k = 0; k < 2; k++) {
        const fly = (currentTimeSec * 0.95 + k * 0.5) % 1;
        const px = outWidth / 2 + unit * (2.8 - fly * 1.35);
        const py = stageCenterY - unit * (0.4 - k * 0.7);
        ctx.fillStyle = inkColor;
        ctx.globalAlpha = 1 - fly;
        ctx.beginPath();
        ctx.arc(px, py, unit * 0.13, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      drawExpressiveCharacter({
        ctx,
        x: shieldX - unit * 1.45,
        y: stageCenterY + unit * 0.62,
        unit: unit * 0.98,
        variant: primaryVariant,
        pose: "crossed_arms",
        mood: "confident",
        stance: "strong",
        inkColor,
        bgColor,
        accentColor,
        tSec: currentTimeSec,
      });
      break;
    }

    case "outro_takeaway":
    default: {
      for (let c = 0; c < 3; c++) {
        const shift = ((currentTimeSec * 1.1 + c * 0.33) % 1) * unit * 1.15;
        ctx.strokeStyle = c === 2 ? accentColor : mutedInk;
        ctx.lineWidth = Math.max(2.8, unit * 0.07);
        const cx = outWidth / 2 + unit * 0.45 + shift;
        const cy = stageCenterY - unit * 0.25;
        ctx.beginPath();
        ctx.moveTo(cx - unit * 0.25, cy - unit * 0.32);
        ctx.lineTo(cx + unit * 0.18, cy);
        ctx.lineTo(cx - unit * 0.25, cy + unit * 0.32);
        ctx.stroke();
      }

      drawExpressiveCharacter({
        ctx,
        x: outWidth / 2 - unit * 0.85,
        y: stageCenterY + unit * 0.65,
        unit: unit * 0.98,
        variant: primaryVariant,
        pose: "pointing_up",
        mood: "confident",
        stance: "strong",
        inkColor,
        bgColor,
        accentColor,
        tSec: currentTimeSec,
      });
      break;
    }
  }

  // Unique prop badge anchored cleanly above/right without colliding with head or subtitle
  if (spec.propTag && spec.propTag !== "none" && arch !== "chapter_card") {
    drawUniquePropBadge({
      ctx,
      x: outWidth / 2 + unit * (isPortrait ? 1.85 : 2.65),
      y: stageCenterY - unit * 1.88,
      size: unit * 1.08,
      propTag: spec.propTag,
      inkColor,
      bgColor,
      accentColor,
      tSec: currentTimeSec,
    });
  }

  ctx.restore();
  return { isLightBg };
}

/**
 * Renders crisp bottom-center subtitles in Poppins SemiBold / Plus Jakarta Sans Bold:
 * - Cleanly positioned near bottom center with bold legibility in both 9:16 and 16:9
 * - 3 to 7 words per line
 * - Active spoken word strictly bright warm gold/yellow (#FACC15), remaining words crisp white (#FFFFFF)
 */
export function drawMinimalistBottomSubtitles(params: {
  ctx: CanvasRenderingContext2D;
  outWidth: number;
  outHeight: number;
  words: string[];
  highlightIndex: number;
  accentTheme: SubtitleAccentTheme;
  isLightBg: boolean;
  subtitleMode: "word-highlight" | "classic" | "off";
}) {
  const {
    ctx,
    outWidth,
    outHeight,
    words,
    highlightIndex,
    accentTheme,
    subtitleMode,
  } = params;

  if (subtitleMode === "off" || words.length === 0) return;

  const isPortrait = outHeight > outWidth;
  const scale = outWidth / (isPortrait ? 1080 : 1920);
  const fontSize = Math.round((isPortrait ? 50 : 52) * scale);
  const maxWidth = outWidth * (isPortrait ? 0.86 : 0.8);
  const baseY = outHeight * (isPortrait ? 0.835 : 0.86);

  const primaryText = "#FFFFFF";
  const activeWordText = accentTheme === "cyan" ? "#22D3EE" : "#FACC15";
  const spaceW = Math.round(fontSize * 0.28);

  ctx.save();
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";

  const setFont = (isAccent: boolean) => {
    ctx.font = `${isAccent ? 700 : 600} ${fontSize}px 'Poppins', 'Plus Jakarta Sans', system-ui, sans-serif`;
  };

  type Item = { word: string; idx: number; width: number; isAccent: boolean };
  const measured: Item[] = words.map((word, idx) => {
    const isAccent = subtitleMode === "word-highlight" && idx === highlightIndex;
    setFont(isAccent);
    return {
      word,
      idx,
      width: ctx.measureText(word).width,
      isAccent,
    };
  });

  const lines: Item[][] = [];
  let curr: Item[] = [];
  let currW = 0;

  for (const item of measured) {
    const add = curr.length === 0 ? item.width : spaceW + item.width;
    if (curr.length > 0 && currW + add > maxWidth) {
      lines.push(curr);
      curr = [item];
      currW = item.width;
    } else {
      curr.push(item);
      currW += add;
    }
  }
  if (curr.length > 0) lines.push(curr);

  if (lines.length > 2) {
    const rest = lines.slice(1).flat();
    lines.splice(1, lines.length - 1, rest);
  }

  const lineHeight = Math.round(fontSize * 1.32);
  const startY = baseY - ((lines.length - 1) * lineHeight) / 2;

  ctx.shadowColor = "rgba(0,0,0,0.92)";
  ctx.shadowBlur = Math.round(14 * scale);
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = Math.round(3 * scale);

  lines.forEach((line, lIdx) => {
    const totalW =
      line.reduce((a, b) => a + b.width, 0) +
      spaceW * Math.max(0, line.length - 1);
    let cursorX = (outWidth - totalW) / 2;
    const y = startY + lIdx * lineHeight;

    for (const item of line) {
      setFont(item.isAccent);
      ctx.fillStyle = item.isAccent ? activeWordText : primaryText;
      ctx.fillText(item.word, cursorX, y);
      cursorX += item.width + spaceW;
    }
  });

  ctx.restore();
}
