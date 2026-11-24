import express from "express";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";
import {
  computeUpcomingWeekSchedule,
  HOOK_TYPE_DESCRIPTIONS,
  HOOK_TYPE_SEQUENCE,
  resolveThemeForExperiment,
  resolveThemeProfile,
  THEME_PROFILES,
  type PerformanceOptimizationDirectives,
  type PostedPerformanceMetric,
  type SeriesEpisodeMemory,
  type ThemeId,
} from "./src/lib/themeProfiles";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3000;

interface FirebaseAppletConfig {
  projectId?: string;
  appId?: string;
  apiKey?: string;
  authDomain?: string;
  storageBucket?: string;
  messagingSenderId?: string;
}

function loadFirebaseAppletConfig(): FirebaseAppletConfig | null {
  try {
    const raw = fs.readFileSync(
      path.resolve(__dirname, "firebase-applet-config.json"),
      "utf8"
    );
    return JSON.parse(raw) as FirebaseAppletConfig;
  } catch {
    return null;
  }
}

interface AudioChunkInput {
  mimeType: string;
  data: string;
  offsetSec: number;
  durationSec: number;
}

interface AnalyzeRequestBody {
  transcript?: string;
  audioChunks?: AudioChunkInput[];
  durationSec?: number;
  sourceTitle?: string;
}

interface RawTimedCaption {
  startSec?: number;
  endSec?: number;
  text?: string;
}

interface RawClipOutput {
  title?: string;
  hookType?: string;
  hookQuote?: string;
  startSec?: number;
  endSec?: number;
  durationSec?: number;
  viralScore?: number;
  scores?: {
    hook?: number;
    retentionPacing?: number;
    shareabilityEmotion?: number;
    standalone?: number;
  };
  reason?: string;
  captions?: RawTimedCaption[];
}

export interface AnalyzedPodcastClip {
  id: string;
  title: string;
  hookType: string;
  hookQuote: string;
  startSec: number;
  endSec: number;
  durationSec: number;
  viralScore: number;
  scores: {
    hook: number;
    retentionPacing: number;
    shareabilityEmotion: number;
    standalone: number;
  };
  reason: string;
  captions: Array<{
    startSec: number;
    endSec: number;
    text: string;
  }>;
}

interface SeriesContextInput {
  seriesTitle?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  previousEpisodeSummary?: string;
  hookType?: string;
}

interface FacelessGenerateBody {
  topicOrScript?: string;
  targetDurationSec?: number;
  aspectRatio?: "9:16" | "16:9";
  voiceName?: string;
  visualTheme?: string;
  language?: string;
  viralStrategyContext?: {
    hookFormula?: string;
    openingHookLine?: string;
    winningPatternsUsed?: string[];
  };
  seriesContext?: SeriesContextInput;
}

interface RecentVideoStatInput {
  title?: string;
  format?: string;
  durationSec?: number;
  viewCount?: number;
  likeCount?: number;
  commentCount?: number;
  engagementRate?: number;
  viewsPerDay?: number;
  publishedAt?: string;
}

interface ViralPlanBody {
  channelTitle?: string;
  channelStats?: {
    subscriberCount?: number;
    viewCount?: number;
    videoCount?: number;
  } | null;
  recentVideosStats?: RecentVideoStatInput[];
  optimizationDirectives?: PerformanceOptimizationDirectives | null;
  targetDurationSec?: number;
  aspectRatio?: "9:16" | "16:9";
  language?: string;
  subtitleMode?: "word-highlight" | "classic" | "off";
  visualTheme?: string;
  optionalFocus?: string;
  seriesContext?: SeriesContextInput;
}

interface SeriesWeekRequestBody {
  seriesTitle?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  visualTheme?: string;
  episodeTopicFocus?: string;
  mainDurationSec?: number;
  language?: string;
  previousEpisodes?: SeriesEpisodeMemory[];
  channelTitle?: string;
  recentVideosStats?: RecentVideoStatInput[];
  optimizationDirectives?: PerformanceOptimizationDirectives | null;
}

interface PerformanceLoopBody {
  channelTitle?: string;
  visualTheme?: string;
  seriesTitle?: string;
  recentVideosStats?: RecentVideoStatInput[];
  postedMetrics?: PostedPerformanceMetric[];
}

type VectorArchetype =
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

type UniquePropTag =
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

type ContrastShiftMode = "black" | "invert_light" | "accent_flash";

type FocusCharacter = "man" | "woman" | "duo";

type ManStance = "strong" | "neutral" | "mistake";

type WomanMood = "warm" | "confident" | "curious" | "unimpressed";

interface SceneAnimationSpec {
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

interface RawFacelessScene {
  sceneIndex?: number;
  timestamp_est?: string;
  section_label?: string;
  durationSec?: number;
  voiceover?: string;
  narrationText?: string;
  visual_scene?: string;
  sfx_or_music_cue?: string;
  archetype?: VectorArchetype;
  contrast_shift?: ContrastShiftMode;
  is_section_card?: boolean;
  left_label?: string;
  right_label?: string;
  badge_text?: string;
  prop_tag?: UniquePropTag;
  stat_value?: string;
  point_number?: number;
  accent_hex?: string;
  focus_character?: FocusCharacter;
  man_stance?: ManStance;
  woman_mood?: WomanMood;
}

export interface SubtitleWordOutput {
  word: string;
  startSec: number;
  endSec: number;
}

export interface SubtitleChunkOutput {
  text: string;
  highlightWord: string;
  startSec: number;
  endSec: number;
  sceneIndex: number;
  words: SubtitleWordOutput[];
}

export interface FacelessSceneOutput {
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

interface FacelessMetadataBody {
  frameBase64Png?: string;
  script?: string;
  visualTheme?: string;
  aspectRatio?: string;
  language?: string;
}

const VIRALITY_SYSTEM_INSTRUCTION = `Je bent een elite YouTube Shorts & TikTok Virality Editor, gespecialiseerd in het analyseren van lange podcast- en spoken-word video's en het extraheren van high-retention micro-content (15 tot 58 seconden). Je werkt volgens bewezen retentie-algoritmes, hook-formules en psychologische triggers.

### JOUW TAAK
Analyseer het aangeleverde transcript (met tijdstempels) en identificeer de meest virale fragmenten. Elk fragment moet op zichzelf staan, direct de aandacht grijpen in de eerste 2 seconden en de kijker vasthouden tot de laatste seconde (loop-potentieel).

### BEWEZEN HOOK-FORMULES (De eerste 3 seconden)
Een fragment komt ALLEEN in aanmerking als het begint met (of direct geknipt kan worden naar) een van deze bewezen hooks:
1. Contrasterende / Contra-intuïtieve Hook: Een stelling die indruist tegen wat iedereen denkt (bijv. "Stop met X als je Y wilt bereiken").
2. Curiosity Gap (Kenniskloof): Een open vraag of mysterieuze belofte waardoor het brein het antwoord MOET weten (bijv. "Dit is de enige reden waarom 99% faalt...").
3. Negatieve / Waarschuwings-Hook: Inspelen op verliesaversie of een grote fout (bijv. "Maak deze fout nooit wanneer je...").
4. Directe Resultaat / Transformatie Hook: Direct starten met het hoogtepunt, het eindresultaat of een schokkend getal, en daarna pas uitleggen hoe.
5. Controversiële / Polariserende Mening: Een scherpe uitspraak die direct reacties en discussie in de comments uitlokt.

### STRIKTE SELECTIE- & MONTAGEREGELS
- Geen trage opbouw: Knip begroetingen ("Hallo allemaal", "Ja dus wat ik wilde zeggen") en ademruimte aan het begin en eind 100% weg. Start midden in de actie of bij het eerste krachtige woord van de hook.
- Clipduur: Elke clip MOET tussen de 15 en 58 seconden duren (tenzij de volledige brontekst korter is dan 15 seconden).
- Zelfstandig verhaal (Context): De kijker kent de lange video niet. Het fragment moet zonder voorkennis direct begrijpelijk zijn en een duidelijke kop, middenstuk en conclusie/twist hebben.
- Retentie-pieken: Geef de voorkeur aan fragmenten met hoog spreektempo, emotionele lading, verandering van toon, of concrete stappen/lijsten.
- Sterk einde: Eindig op een climax, punchline of een naadloze overgang terug naar de eerste zin (infinite loop), nooit met een uitdovende zin als "dat was het wel zo'n beetje".

### SCORING-ALGORITME (1 - 100)
Beoordeel elke gevonden clip streng op 4 pijlers (elk 0 tot 25 punten):
1. Hook-kracht (0-25): Stopt iemand binnen 1,5 seconde met scrollen?
2. Retentie & Pacing (0-25): Blijft de spanning hoog zonder saaie stiltes?
3. Deelbaarheid & Emotie (0-25): Roept het verbazing, herkenning, humor of discussie op?
4. Zelfstandigheid (0-25): Is de clip volledig te begrijpen zonder de rest van de video?

Tel de 4 pijlers exact bij elkaar op voor viralScore. Sorteer de resultaten van hoogste naar laagste viralScore en negeer alles onder de 75 punten.
Geef ALLE titels, redenen, hook-quotes en getimede ondertitels (captions, korte leesbare chunks van 3-6 woorden per blok met startSec en endSec binnen de clip) in exact DEZELFDE TAAL als de gesproken taal in de video/transcript.`;

const LEAD_2D_DIRECTOR_RULES = `You are an autonomous English-language Faceless Series Producer & 2D Motion Graphics Director for a high-retention YouTube channel specializing in minimalist vector/line-art animation (crisp white characters and warm gold accents on a pure #000000 black backdrop, strictly speech-synced bottom-center subtitles).

### HARD LANGUAGE, VISUAL & SYNCHRONIZATION RULES (NON-NEGOTIABLE)
1. STRICT ENGLISH OUTPUT ONLY:
   - ALL scripts, spoken narration, hooks, titles, captions, section labels, badge texts, left/right comparison labels, and visual scene descriptions MUST ALWAYS be written in natural, fluent ENGLISH. Never output Dutch or any non-English words.
2. CRYSTAL-CLEAR INTRODUCTION & STANDALONE FOCUS:
   - For multi-point long-form videos (>= 120s, such as Sunday's 6-point video), keep the introduction strictly <= 30 seconds and explicitly state:
     (a) what the video is about right away,
     (b) the 6 concrete focus points covered,
     (c) key behavioral facts or psychological insights the viewer will gain.
   - For short standalone Shorts (15–45s), do NOT list multiple steps or over-promote Sunday's long video; open directly with ONE natural, scenario-fitting hook and deliver ONE distinct, satisfying insight cleanly. You may close briefly with a subtle 1-line nod to tomorrow's Short topic.
3. CALM, COMPOSED ACTION & 100% SPEECH-SYNCHRONIZED VISUALS (NO STROBING OR JITTER):
   - Every visual action, movement, and graphic MUST stay strictly synchronized with what is spoken at that exact instant.
   - Write ONE clean, complete spoken clause per 2.4 to 4.2 second scene (~5 to 9 spoken words per scene) so scenes transition smoothly and legibly WITHOUT rapid jittery cuts, flickering, glitching, or strobing.
   - Use "contrast_shift": "black" as the default calm pure #000000 canvas, and sparingly use "accent_flash" (a subtle warm gold radial highlight, NEVER a strobe) only for major emphasis beats. Avoid harsh full-screen flashes.
   - EVERY animation, visual gag, character pose, "archetype", "prop_tag", "left_label", "right_label", and "stat_value" MUST logically illustrate the exact advice, concrete situation, or human dynamic being spoken in that scene. Keep labels short (1-3 English words max) so typography remains large, bold, and readable in both 9:16 Shorts and 16:9 videos.
   - Available archetypes:
     * intro_roadmap: intro overview (used on multi-point main videos or framing cards)
     * chapter_card: crisp part/chapter transition card (set is_section_card: true and point_number)
     * dynamic_duo: distinct man and attractive woman interacting in a real conversation or attraction moment
     * reaction_contrast: side-by-side comparison contrasting left_label (common mistake) vs right_label (composed action)
     * mirror_self: character reflecting on mindset/self-awareness
     * data_insight: sharp fact, study result, or metric growth (set stat_value e.g. "78%" or "3x")
     * message_thread: realistic chat/text timing & response dynamic (short English phrases in left_label & right_label)
     * scale_balance: weighing two behaviors or priorities on a balance scale (left_label vs right_label)
     * spotlight_focus: focused spotlight isolating the exact recommended trait or focal person
     * momentum_steps: ascending steps showing progress across actionable tips (set point_number)
     * brain_signal: cognitive trigger, realization, or mental shift
     * doorway_choice: character decisively taking the new recommended direction
     * crowd_standout: composed person standing apart calmly from reactive crowd behavior
     * orbit_gravity: interpersonal attention balance & attraction pull (use focus_character: "duo" for man-woman dynamic)
     * shield_boundary: calm personal boundary deflecting distractions or low-value pressure
     * outro_takeaway: sharp closing summary & concrete takeaway step
   - Available unique prop_tag values (pick ONLY if genuinely relevant to the spoken sentence, otherwise "none"): "chart", "heart", "message", "timer", "key", "compass", "trophy", "target", "flame", "microphone", "book", "bolt", "eye", "check", "question", "none".
4. DISTINCT CONFIDENT MAN & GRACEFUL ATTRACTIVE WOMAN:
   - Set "focus_character" accurately per scene: "duo" whenever describing interaction, dating, conversation, or attraction between a man and a woman; "woman" when highlighting her perspective or response; "man" when focusing on his composure or mindset.
   - Set "man_stance": "strong" on EVERY scene where the man follows good advice, stays calm, speaks clearly, sets boundaries, or leads with quiet authority (upright posture, composed expression, capable look). Set "man_stance": "mistake" ONLY for explicit negative contrast beats.
   - Set "woman_mood": "warm" | "confident" | "curious" | "unimpressed" matching her genuine reaction; keep her graceful, stylish, and clearly distinct across every scene.
5. BLACK IS STRICTLY THE BACKDROP CANVAS, WARM GOLD IS THE SIGNATURE ACCENT:
   - #000000 pitch black is used purely as high-contrast backdrop clarity paired with crisp white (#FFFFFF) line-art and warm gold/yellow (#FACC15 / #D4AF37) accents (gaze eye icons, dashed sightlines, subtle highlights). Never force a gloomy tone onto the script.
6. STRICT WORD-SYNCED SUBTITLES & CLEAN PLAIN SPOKEN TEXT:
   - NEVER put markdown formatting (* or **) inside "voiceover" or "fullScript"—write clean spoken English words with natural [pause] cues only.
   - Subtitles stay in the clean bottom-center Poppins SemiBold layout (3-7 words per block), strictly synced to spoken audio with the active spoken word in WARM GOLD/YELLOW (#FACC15) and other words crisp WHITE (#FFFFFF).`;

const FACELESS_SCRIPT_SYSTEM_INSTRUCTION = `${LEAD_2D_DIRECTOR_RULES}

### OUTPUT CONTRACT
Return ONLY valid JSON in ENGLISH matching the schema:
- video_title: clear, curiosity-driven English title tailored to the real topic
- thumbnail_idea: clean high-contrast #000000 + white & gold 2D visual concept + punchy 2-4 word text
- voiceover_style: pacing, calm confident English conversational tone, and understated music notes
- subtitle_style: Poppins SemiBold bottom-center layout, strictly audio-synced with active spoken word in WARM GOLD (#FACC15) and remaining words in WHITE (#FFFFFF)
- youtubeTitle & captionWithHashtags & thumbnailHook: concise English publishing metadata matching video_title & thumbnail_idea
- scenes: calm, composed ordered array covering the full target duration with durationSec smoothly 2.4 to 4.2 per scene, containing English fields: section_label, voiceover (clean plain spoken English + [pause] cues), visual_scene (logically matching 2D character action/dynamic), sfx_or_music_cue, archetype, prop_tag, focus_character, man_stance, woman_mood, contrast_shift, is_section_card, left_label, right_label, badge_text, stat_value, point_number, accent_hex.`;

const VIRAL_STRATEGY_SYSTEM_INSTRUCTION = `${LEAD_2D_DIRECTOR_RULES}

### YOUR MISSION AS ENGLISH VIRALITY & RETENTION DIRECTOR
The user clicked "Make Viral Video" with exact constraints (duration, aspect ratio, subtitles, optional channel analytics, and performance loop directives).
1. Compare the channel's real recent video statistics IF provided and honor any Performance Loop directives. Never invent missing stats.
2. Decide WHAT exact English angle will perform best for the chosen topic/niche and WHY.
3. Score strictly across the 4 Virality pillars (hook 0-25, retentionPacing 0-25, shareabilityEmotion 0-25, standalone 0-25; total >= 80).
4. Write the complete clear, engaging English fullScript as CLEAN SPOKEN PLAIN TEXT (NO ** or markdown) WITH [pause] markers hitting the exact spoken word count (~2.05 spoken words per second).
5. CRITICAL FORMAT CHECK: If duration >= 120s, keep the intro <= 30s and explicitly state topic, point count, and key facts. If duration < 60s (Short), dive straight into ONE authentic, situation-fitting hook and ONE clean point with zero filler or multi-step listing.`;

function formatGlobalTimestamp(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function shiftSegmentTimestamps(rawText: string, offsetSec: number): string {
  if (offsetSec <= 0) return rawText.trim();
  return rawText
    .replace(/\[(\d{1,2}):(\d{2})(?::(\d{2}))?\]/g, (_match, p1, p2, p3) => {
      const a = Number(p1);
      const b = Number(p2);
      const c = p3 !== undefined ? Number(p3) : null;
      const relSec = c !== null ? a * 3600 + b * 60 + c : a * 60 + b;
      return `[${formatGlobalTimestamp(offsetSec + relSec)}]`;
    })
    .trim();
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function normalizeAndFilterClips(
  rawClips: RawClipOutput[],
  maxDurationSec: number
): { clips: AnalyzedPodcastClip[]; filteredOutCount: number } {
  const hasKnownDuration = maxDurationSec > 0;
  const minAllowedDur =
    hasKnownDuration && maxDurationSec < 15 ? Math.max(3, maxDurationSec) : 15;
  const maxAllowedDur = hasKnownDuration ? Math.min(58, maxDurationSec) : 58;

  const scored: AnalyzedPodcastClip[] = [];
  let filteredOutCount = 0;

  rawClips.forEach((raw, idx) => {
    const sHook = Math.round(clamp(Number(raw.scores?.hook ?? 0), 0, 25));
    const sRet = Math.round(clamp(Number(raw.scores?.retentionPacing ?? 0), 0, 25));
    const sShare = Math.round(
      clamp(Number(raw.scores?.shareabilityEmotion ?? 0), 0, 25)
    );
    const sStand = Math.round(clamp(Number(raw.scores?.standalone ?? 0), 0, 25));

    const computedTotal = sHook + sRet + sShare + sStand;
    const viralScore =
      computedTotal > 0
        ? computedTotal
        : Math.round(clamp(Number(raw.viralScore ?? 0), 0, 100));

    if (viralScore < 75) {
      filteredOutCount++;
      return;
    }

    let startSec = Math.max(0, Number(raw.startSec ?? 0));
    let endSec = Number(raw.endSec ?? startSec + (raw.durationSec ?? 30));

    if (hasKnownDuration) {
      startSec = clamp(startSec, 0, Math.max(0, maxDurationSec - minAllowedDur));
      endSec = clamp(endSec, startSec + minAllowedDur, maxDurationSec);
    }

    let dur = endSec - startSec;
    if (dur < minAllowedDur) {
      endSec = hasKnownDuration
        ? Math.min(maxDurationSec, startSec + minAllowedDur)
        : startSec + minAllowedDur;
      dur = endSec - startSec;
    }
    if (dur > maxAllowedDur) {
      endSec = startSec + maxAllowedDur;
      dur = maxAllowedDur;
    }

    const captions = Array.isArray(raw.captions)
      ? raw.captions
          .map((c) => {
            const text = String(c.text ?? "").trim();
            if (!text) return null;
            const cStart = clamp(Number(c.startSec ?? startSec), startSec, endSec);
            const cEnd = clamp(
              Number(c.endSec ?? cStart + 2),
              cStart + 0.3,
              endSec
            );
            return {
              startSec: Number(cStart.toFixed(2)),
              endSec: Number(cEnd.toFixed(2)),
              text,
            };
          })
          .filter(
            (c): c is { startSec: number; endSec: number; text: string } =>
              c !== null
          )
          .sort((a, b) => a.startSec - b.startSec)
      : [];

    scored.push({
      id: `viral-clip-${idx + 1}`,
      title: String(raw.title ?? `Viraal fragment ${idx + 1}`).trim(),
      hookType: String(raw.hookType ?? "Curiosity Gap").trim(),
      hookQuote: String(raw.hookQuote ?? "").trim(),
      startSec: Number(startSec.toFixed(1)),
      endSec: Number(endSec.toFixed(1)),
      durationSec: Math.round(dur),
      viralScore,
      scores: {
        hook: sHook,
        retentionPacing: sRet,
        shareabilityEmotion: sShare,
        standalone: sStand,
      },
      reason: String(raw.reason ?? "").trim(),
      captions,
    });
  });

  scored.sort((a, b) => b.viralScore - a.viralScore);
  return { clips: scored, filteredOutCount };
}

function createGenAIClient(
  apiKey: string,
  apiVersion?: string,
  timeoutMs = 24000
): GoogleGenAI {
  return new GoogleGenAI({
    apiKey,
    ...(apiVersion ? { apiVersion } : {}),
    httpOptions: {
      timeout: timeoutMs,
      headers: { "User-Agent": "aistudio-build" },
    },
  });
}

function parseGoogleApiErrorPayload(rawMessage: string): {
  code?: number;
  status?: string;
  message?: string;
} | null {
  const trimmed = rawMessage.trim();
  if (!trimmed.startsWith("{")) return null;
  try {
    const parsed = JSON.parse(trimmed) as {
      error?: { code?: number; status?: string; message?: string };
      code?: number;
      status?: string;
      message?: string;
    };
    if (parsed.error && typeof parsed.error === "object") {
      return parsed.error;
    }
    return parsed;
  } catch {
    return null;
  }
}

function isTransientUpstreamError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  const lower = msg.toLowerCase();
  if (
    lower.includes("fetch failed") ||
    lower.includes("econnreset") ||
    lower.includes("etimedout") ||
    lower.includes("eai_again") ||
    lower.includes("enotfound") ||
    lower.includes("socket hang up") ||
    lower.includes("network") ||
    lower.includes("timeout") ||
    lower.includes("aborted") ||
    lower.includes("unavailable") ||
    lower.includes("high demand") ||
    lower.includes("resource_exhausted") ||
    lower.includes("overloaded")
  ) {
    return true;
  }

  const parsed = parseGoogleApiErrorPayload(msg);
  if (parsed?.code && [408, 429, 500, 502, 503, 504].includes(parsed.code)) {
    return true;
  }
  const statusUpper = String(parsed?.status ?? "").toUpperCase();
  return [
    "UNAVAILABLE",
    "RESOURCE_EXHAUSTED",
    "INTERNAL",
    "DEADLINE_EXCEEDED",
  ].includes(statusUpper);
}

function summarizeTransientCondition(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  const parsed = parseGoogleApiErrorPayload(msg);
  if (parsed?.code) return `upstream-${parsed.code}`;
  const lower = msg.toLowerCase();
  if (lower.includes("timeout") || lower.includes("abort")) return "upstream-timeout";
  if (lower.includes("high demand") || lower.includes("overloaded")) return "upstream-demand";
  return "transient-network";
}

async function withGeminiRetry<T>(
  label: string,
  fn: () => Promise<T>,
  maxAttempts = 5
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const shouldRetry = attempt < maxAttempts && isTransientUpstreamError(err);
      if (!shouldRetry) throw err;

      const baseDelayMs = 1100 * Math.pow(1.75, attempt - 1);
      const jitterMs = Math.floor(Math.random() * 450);
      const waitMs = Math.min(7000, Math.round(baseDelayMs + jitterMs));
      const reason = summarizeTransientCondition(err);
      console.log(
        `[retry] ${label} attempt ${attempt}/${maxAttempts} (${reason}); waiting ${waitMs}ms`
      );
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }
  throw lastError;
}

async function callWithTimeout<T>(
  label: string,
  timeoutMs: number,
  fn: (signal: AbortSignal) => Promise<T>
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort(new Error(`${label} timeout after ${timeoutMs}ms`));
  }, timeoutMs);
  try {
    return await fn(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

let hydrogenCooldownUntil = 0;

async function generateWithHydrogenOrLiteFallback(
  ai: GoogleGenAI,
  label: string,
  buildParams: (
    model: string,
    useLiteDefaults: boolean,
    abortSignal: AbortSignal
  ) => Parameters<GoogleGenAI["models"]["generateContent"]>[0],
  perCallTimeoutMs = 15000
) {
  const now = Date.now();
  const skipHydrogen = now < hydrogenCooldownUntil;

  if (!skipHydrogen) {
    const t0 = Date.now();
    try {
      const resp = await callWithTimeout(
        `${label}-hydrogen`,
        Math.min(perCallTimeoutMs, 10000),
        (signal) =>
          ai.models.generateContent(buildParams("gemini-4-hydrogen", false, signal))
      );
      console.log(
        `[timing] ${label} completed in ${Date.now() - t0}ms (gemini-4-hydrogen)`
      );
      return resp;
    } catch (err) {
      if (!isTransientUpstreamError(err)) {
        throw err;
      }
      hydrogenCooldownUntil = Date.now() + 300_000;
      const reason = summarizeTransientCondition(err);
      console.log(
        `[fallback] ${label}: switching to gemini-3.1-flash-lite after ${Date.now() - t0}ms (${reason}; 5m cooldown)`
      );
    }
  } else {
    console.log(
      `[fallback-fast] ${label}: hydrogen in cooldown; routing directly to gemini-3.1-flash-lite`
    );
  }

  const t1 = Date.now();
  try {
    const resp = await withGeminiRetry(
      `${label}-lite-fallback`,
      () =>
        callWithTimeout(`${label}-lite`, Math.max(perCallTimeoutMs, 22000), (signal) =>
          ai.models.generateContent(buildParams("gemini-3.1-flash-lite", true, signal))
        ),
      5
    );
    console.log(
      `[timing] ${label} completed in ${Date.now() - t1}ms (gemini-3.1-flash-lite)`
    );
    return resp;
  } catch (liteErr) {
    if (!skipHydrogen || !isTransientUpstreamError(liteErr)) {
      throw liteErr;
    }
    hydrogenCooldownUntil = 0;
    const t2 = Date.now();
    const resp = await callWithTimeout(
      `${label}-hydrogen-recovery`,
      15000,
      (signal) =>
        ai.models.generateContent(buildParams("gemini-4-hydrogen", false, signal))
    );
    console.log(
      `[timing] ${label} recovered in ${Date.now() - t2}ms (gemini-4-hydrogen)`
    );
    return resp;
  }
}

function normalizeServerError(err: unknown, fallback: string): string {
  const raw = err instanceof Error ? err.message : String(err ?? "");
  const trimmed = raw.trim();
  if (!trimmed) return fallback;

  const parsed = parseGoogleApiErrorPayload(trimmed);
  const effectiveMsg = parsed?.message ? String(parsed.message) : trimmed;
  const lower = effectiveMsg.toLowerCase();
  const statusUpper = String(parsed?.status ?? "").toUpperCase();

  if (
    parsed?.code === 403 ||
    statusUpper === "PERMISSION_DENIED" ||
    lower.includes("api_key_invalid") ||
    lower.includes("api key not valid")
  ) {
    return "De Gemini API-sleutel heeft onvoldoende rechten of is ongeldig. Controleer de sleutel in Instellingen > Secrets.";
  }

  if (parsed?.code === 429 || statusUpper === "RESOURCE_EXHAUSTED") {
    return "De aanvraaglimiet van Gemini is tijdelijk bereikt. Wacht enkele seconden of controleer je API-limiet in Instellingen > Secrets.";
  }

  if (
    parsed?.code === 503 ||
    parsed?.code === 502 ||
    parsed?.code === 504 ||
    statusUpper === "UNAVAILABLE" ||
    lower.includes("high demand") ||
    lower.includes("overloaded")
  ) {
    return "De Gemini AI-dienst ervaart tijdelijk hoge drukte. Probeer het over enkele seconden opnieuw.";
  }

  if (
    lower.includes("fetch failed") ||
    lower.includes("econnreset") ||
    lower.includes("etimedout") ||
    lower.includes("eai_again") ||
    lower.includes("enotfound") ||
    lower.includes("socket hang up") ||
    lower.includes("aborterror") ||
    lower.includes("this operation was aborted") ||
    lower.includes("the operation was aborted") ||
    lower.includes("timeout after")
  ) {
    return "De netwerkverbinding of spreeksynthese duurde te lang en werd onderbroken. Probeer het opnieuw.";
  }

  return effectiveMsg.length > 260 ? `${effectiveMsg.slice(0, 257)}...` : effectiveMsg;
}

function extractWavPcmInfo(wavBuffer: Buffer): {
  pcm: Buffer;
  sampleRate: number;
} {
  if (
    wavBuffer.length >= 44 &&
    wavBuffer.toString("ascii", 0, 4) === "RIFF" &&
    wavBuffer.toString("ascii", 8, 12) === "WAVE"
  ) {
    let offset = 12;
    let sampleRate = 24000;
    while (offset + 8 <= wavBuffer.length) {
      const chunkId = wavBuffer.toString("ascii", offset, offset + 4);
      const chunkSize = wavBuffer.readUInt32LE(offset + 4);
      const dataStart = offset + 8;
      if (chunkId === "fmt " && chunkSize >= 16 && dataStart + 8 <= wavBuffer.length) {
        sampleRate = wavBuffer.readUInt32LE(dataStart + 4) || 24000;
      }
      if (chunkId === "data") {
        const end = Math.min(wavBuffer.length, dataStart + chunkSize);
        return { pcm: wavBuffer.subarray(dataStart, end), sampleRate };
      }
      offset = dataStart + chunkSize + (chunkSize % 2);
    }
  }
  return {
    pcm: wavBuffer.length > 44 ? wavBuffer.subarray(44) : wavBuffer,
    sampleRate: 24000,
  };
}

function stripPauseMarkersForTts(text: string): string {
  return text
    .replace(/\[pause\]/gi, " ... ")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripMarkersForWords(text: string): string[] {
  return text
    .replace(/\[[^\]]*\]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Calibrates a concatenated 16-bit mono PCM buffer so its exact duration matches targetDurationSec.
 * Uses bounded ffmpeg atempo (preserving natural pitch) + clean silence breathing tail / trim,
 * ensuring final exported video duration matches user's requested duration to the second.
 */
async function calibratePcmToExactDuration(
  pcmBuffer: Buffer,
  sampleRate: number,
  targetDurationSec: number
): Promise<Buffer> {
  const targetSamples = Math.max(sampleRate, Math.round(targetDurationSec * sampleRate));
  const targetBytes = targetSamples * 2;
  const rawSamples = Math.floor(pcmBuffer.length / 2);
  const rawDurationSec = rawSamples / sampleRate;

  let workingPcm = pcmBuffer;

  if (Math.abs(rawDurationSec - targetDurationSec) > 0.25 && rawSamples > sampleRate) {
    const ratio = rawDurationSec / targetDurationSec;
    // Allow natural tempo shift within [0.88, 1.32] via chained atempo filters if needed
    const boundedRatio = clamp(ratio, 0.88, 1.32);

    const buildAtempoChain = (r: number): string => {
      const filters: string[] = [];
      let rem = r;
      while (rem > 2.0) {
        filters.push("atempo=2.0");
        rem /= 2.0;
      }
      while (rem < 0.5) {
        filters.push("atempo=0.5");
        rem /= 0.5;
      }
      filters.push(`atempo=${rem.toFixed(5)}`);
      return filters.join(",");
    };

    const jobId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const inPcm = path.join(os.tmpdir(), `voice-in-${jobId}.pcm`);
    const outPcm = path.join(os.tmpdir(), `voice-out-${jobId}.pcm`);

    try {
      fs.writeFileSync(inPcm, workingPcm);
      await execFileAsync(
        "ffmpeg",
        [
          "-nostdin",
          "-y",
          "-f",
          "s16le",
          "-ar",
          String(sampleRate),
          "-ac",
          "1",
          "-i",
          inPcm,
          "-af",
          buildAtempoChain(boundedRatio),
          "-f",
          "s16le",
          "-ar",
          String(sampleRate),
          "-ac",
          "1",
          outPcm,
        ],
        { timeout: 25000 }
      );
      if (fs.existsSync(outPcm)) {
        const resampled = fs.readFileSync(outPcm);
        if (resampled.length > 0) {
          workingPcm = resampled;
        }
      }
    } catch {
      // Fall back to deterministic byte padding/trimming below if ffmpeg is busy
    } finally {
      try {
        if (fs.existsSync(inPcm)) fs.unlinkSync(inPcm);
      } catch {
        // ignore
      }
      try {
        if (fs.existsSync(outPcm)) fs.unlinkSync(outPcm);
      } catch {
        // ignore
      }
    }
  }

  // Exact byte alignment to targetDurationSec
  if (workingPcm.length === targetBytes) {
    return workingPcm;
  }

  if (workingPcm.length > targetBytes) {
    const trimmed = Buffer.from(workingPcm.subarray(0, targetBytes));
    const fadeSamples = Math.min(Math.round(sampleRate * 0.06), Math.floor(trimmed.length / 2));
    for (let i = 0; i < fadeSamples; i++) {
      const sampleIdx = Math.floor(trimmed.length / 2) - fadeSamples + i;
      const gain = 1 - i / fadeSamples;
      const val = Math.round(trimmed.readInt16LE(sampleIdx * 2) * gain);
      trimmed.writeInt16LE(val, sampleIdx * 2);
    }
    return trimmed;
  }

  // Zero-pad subtle room-tone tail up to exact targetDurationSec
  const padded = Buffer.alloc(targetBytes);
  workingPcm.copy(padded, 0);
  return padded;
}

/**
 * Computes deterministic word-by-word timings aligned to real speech energy
 * inside a calibrated 16-bit mono PCM WAV buffer.
 */
function alignWordsToWavSpeech(
  wavBuffer: Buffer,
  scenes: Array<{ sceneIndex: number; narrationText: string }>
): {
  totalDurationSec: number;
  wordTimings: WordTiming[];
  sceneRanges: Array<{ sceneIndex: number; startSec: number; endSec: number }>;
  pcm: Buffer;
  sampleRate: number;
} {
  const { pcm, sampleRate } = extractWavPcmInfo(wavBuffer);
  const totalSamples = Math.floor(pcm.length / 2);
  const totalDurationSec = Math.max(1, totalSamples / sampleRate);

  const frameSamples = Math.max(160, Math.round(sampleRate * 0.02));
  const frameCount = Math.max(1, Math.floor(totalSamples / frameSamples));
  const frameRms = new Float32Array(frameCount);
  let maxRms = 0;

  for (let f = 0; f < frameCount; f++) {
    let sumSq = 0;
    const baseSample = f * frameSamples;
    for (let s = 0; s < frameSamples; s += 2) {
      const byteIdx = (baseSample + s) * 2;
      if (byteIdx + 1 >= pcm.length) break;
      const sample = pcm.readInt16LE(byteIdx) / 32768;
      sumSq += sample * sample;
    }
    const rms = Math.sqrt(sumSq / (frameSamples / 2));
    frameRms[f] = rms;
    if (rms > maxRms) maxRms = rms;
  }

  const threshold = Math.max(0.008, maxRms * 0.055);
  const rawActive = new Uint8Array(frameCount);
  let firstActiveFrame = 0;
  let lastActiveFrame = frameCount - 1;
  let foundFirst = false;

  for (let f = 0; f < frameCount; f++) {
    if (frameRms[f] > threshold) {
      rawActive[f] = 1;
      if (!foundFirst) {
        firstActiveFrame = f;
        foundFirst = true;
      }
      lastActiveFrame = f;
    }
  }

  // Bridge brief intra-word consonantal/stop dips (< 140ms) while preserving real breath pauses (>= 160ms)
  const bridgedActive = new Uint8Array(rawActive);
  let zeroRun = 0;
  let zeroStart = -1;
  for (let f = firstActiveFrame; f <= lastActiveFrame; f++) {
    if (rawActive[f] === 0) {
      if (zeroStart === -1) zeroStart = f;
      zeroRun++;
    } else {
      if (zeroStart !== -1 && zeroRun <= 6) {
        for (let z = zeroStart; z < f; z++) bridgedActive[z] = 1;
      }
      zeroStart = -1;
      zeroRun = 0;
    }
  }

  const cumVoiced = new Float64Array(frameCount + 1);
  for (let f = 0; f < frameCount; f++) {
    cumVoiced[f + 1] = cumVoiced[f] + (bridgedActive[f] === 1 ? 1 : 0);
  }
  const totalVoiced = cumVoiced[frameCount];

  const speechStartSec = (firstActiveFrame * frameSamples) / sampleRate;
  const speechEndSec = Math.max(
    speechStartSec + 0.5,
    ((lastActiveFrame + 1) * frameSamples) / sampleRate
  );

  const flatWords: Array<{ word: string; sceneIndex: number; weight: number }> = [];
  for (const sc of scenes) {
    const rawTokens = sc.narrationText.trim().split(/\s+/).filter(Boolean);
    for (let tIdx = 0; tIdx < rawTokens.length; tIdx++) {
      const tok = rawTokens[tIdx];
      if (/^\[.*\]$/.test(tok)) {
        continue;
      }
      const cleanWord = tok.replace(/\*\*|__/g, "");
      if (!cleanWord) continue;
      const cleanLen = Math.max(2, cleanWord.replace(/[^a-zA-Z0-9\u00C0-\u024F]/g, "").length);
      const syllableWeight = Math.pow(cleanLen, 0.72) + 1.35;
      const tailBreath = /[.!?]$/.test(cleanWord) ? 0.65 : /[,;:]$/.test(cleanWord) ? 0.35 : 0;
      flatWords.push({
        word: cleanWord,
        sceneIndex: sc.sceneIndex,
        weight: syllableWeight + tailBreath,
      });
    }
  }

  const totalWeight = flatWords.reduce((acc, w) => acc + w.weight, 0) || 1;
  const activeSpanSec = Math.max(0.5, speechEndSec - speechStartSec);

  const findStartSecForVoicedTarget = (target: number): number => {
    if (totalVoiced <= 0) {
      return speechStartSec;
    }
    const clamped = Math.max(0, Math.min(totalVoiced - 0.0001, target));
    for (let f = 0; f < frameCount; f++) {
      if (bridgedActive[f] === 1 && cumVoiced[f + 1] > clamped) {
        return (f * frameSamples) / sampleRate;
      }
    }
    return speechEndSec;
  };

  const findEndSecForVoicedTarget = (target: number): number => {
    if (totalVoiced <= 0) {
      return speechEndSec;
    }
    const clamped = Math.max(0, Math.min(totalVoiced, target));
    for (let f = 0; f <= frameCount; f++) {
      if (cumVoiced[f] >= clamped) {
        return (f * frameSamples) / sampleRate;
      }
    }
    return speechEndSec;
  };

  const wordTimings: WordTiming[] = [];
  let cursorWeight = 0;
  let prevEndSec = 0;

  for (let i = 0; i < flatWords.length; i++) {
    const item = flatWords[i];
    const startFrac = cursorWeight / totalWeight;
    cursorWeight += item.weight;
    const endFrac = cursorWeight / totalWeight;

    let wStart =
      totalVoiced > 0
        ? findStartSecForVoicedTarget(startFrac * totalVoiced)
        : speechStartSec + startFrac * activeSpanSec;
    let wEnd =
      totalVoiced > 0
        ? findEndSecForVoicedTarget(endFrac * totalVoiced)
        : speechStartSec + endFrac * activeSpanSec;

    wStart = Math.max(prevEndSec, Math.min(totalDurationSec - 0.06, wStart));
    wEnd = Math.max(wStart + 0.07, Math.min(totalDurationSec, wEnd));
    prevEndSec = wEnd;

    wordTimings.push({
      word: item.word,
      startSec: Number(wStart.toFixed(3)),
      endSec: Number(wEnd.toFixed(3)),
      sceneIndex: item.sceneIndex,
    });
  }

  const sceneRanges: Array<{ sceneIndex: number; startSec: number; endSec: number }> =
    [];
  for (let i = 0; i < scenes.length; i++) {
    const sc = scenes[i];
    const wordsInScene = wordTimings.filter((w) => w.sceneIndex === sc.sceneIndex);
    const prevEnd = i === 0 ? 0 : sceneRanges[i - 1].endSec;
    const isLast = i === scenes.length - 1;
    let endSec = isLast
      ? totalDurationSec
      : wordsInScene.length > 0
        ? wordsInScene[wordsInScene.length - 1].endSec
        : prevEnd + totalDurationSec / Math.max(1, scenes.length);
    endSec = clamp(endSec, prevEnd + 0.5, totalDurationSec);

    sceneRanges.push({
      sceneIndex: sc.sceneIndex,
      startSec: Number(prevEnd.toFixed(2)),
      endSec: Number((isLast ? totalDurationSec : endSec).toFixed(2)),
    });
  }

  return {
    totalDurationSec: Number(totalDurationSec.toFixed(2)),
    wordTimings,
    sceneRanges,
    pcm,
    sampleRate,
  };
}

function wrapPcmAsMonoWav(pcmBuffer: Buffer, sampleRate = 24000): Buffer {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcmBuffer.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcmBuffer.length, 40);
  return Buffer.concat([header, pcmBuffer]);
}

async function createApp() {
  const app = express();
  const firebaseCfg = loadFirebaseAppletConfig();
  const upstreamAuthDomain = firebaseCfg?.authDomain?.trim() || "";

  // Same-origin Firebase Auth proxy so popup & redirect flows never break
  // on Chrome third-party storage partitioning between *.run.app and *.firebaseapp.com
  if (
    upstreamAuthDomain &&
    (upstreamAuthDomain.endsWith(".firebaseapp.com") ||
      upstreamAuthDomain.endsWith(".web.app"))
  ) {
    app.get("/__/firebase/init.json", (req, res) => {
      const host = req.get("host") || upstreamAuthDomain;
      res.json({
        apiKey: firebaseCfg?.apiKey || "",
        authDomain: host,
        projectId: firebaseCfg?.projectId || "",
        storageBucket: firebaseCfg?.storageBucket || "",
        messagingSenderId: firebaseCfg?.messagingSenderId || "",
        appId: firebaseCfg?.appId || "",
      });
    });

    app.use(
      "/__/auth",
      express.raw({ type: "*/*", limit: "1mb" }),
      async (req, res) => {
        try {
          const targetUrl = `https://${upstreamAuthDomain}${req.originalUrl}`;
          const forwardHeaders: Record<string, string> = {};
          for (const h of [
            "accept",
            "accept-language",
            "content-type",
            "cookie",
            "user-agent",
          ]) {
            const val = req.get(h);
            if (val) forwardHeaders[h] = val;
          }

          const hasBody =
            req.method !== "GET" &&
            req.method !== "HEAD" &&
            Buffer.isBuffer(req.body) &&
            req.body.length > 0;

          const upstream = await fetch(targetUrl, {
            method: req.method,
            headers: forwardHeaders,
            body: hasBody ? new Uint8Array(req.body) : undefined,
            redirect: "manual",
            signal: AbortSignal.timeout(10000),
          });

          res.status(upstream.status);

          const ct = upstream.headers.get("content-type");
          if (ct) res.setHeader("Content-Type", ct);

          const cc = upstream.headers.get("cache-control");
          if (cc) res.setHeader("Cache-Control", cc);

          const location = upstream.headers.get("location");
          if (location) {
            const host = req.get("host");
            const protoHeader = req.get("x-forwarded-proto");
            const proto = protoHeader
              ? protoHeader.split(",")[0].trim()
              : req.protocol || "https";
            const rewritten =
              host && location.startsWith(`https://${upstreamAuthDomain}`)
                ? `${proto}://${host}${location.slice(`https://${upstreamAuthDomain}`.length)}`
                : location;
            res.setHeader("Location", rewritten);
          }

          const getSetCookie = (
            upstream.headers as unknown as { getSetCookie?: () => string[] }
          ).getSetCookie;
          if (typeof getSetCookie === "function") {
            const cookies = getSetCookie.call(upstream.headers);
            if (cookies.length > 0) {
              res.setHeader("Set-Cookie", cookies);
            }
          }

          const buf = Buffer.from(await upstream.arrayBuffer());
          res.send(buf);
        } catch {
          res
            .status(502)
            .json({ error: "Firebase Auth proxy kon niet verbinden." });
        }
      }
    );
  }

  app.use(express.json({ limit: "35mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({
      ok: true,
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
      animationEngineReady: true,
    });
  });

  app.post("/api/podcast/analyze", async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(500).json({
        error:
          "GEMINI_API_KEY ontbreekt op de server. Voeg je Gemini API-sleutel toe in Instellingen > Secrets en herstart de server.",
      });
      return;
    }

    const body = (req.body ?? {}) as AnalyzeRequestBody;
    const rawTranscript =
      typeof body.transcript === "string" ? body.transcript.trim() : "";
    const audioChunks = Array.isArray(body.audioChunks) ? body.audioChunks : [];
    const durationSec = Number(body.durationSec ?? 0);
    const sourceTitle =
      typeof body.sourceTitle === "string" ? body.sourceTitle.trim() : "";

    if (!rawTranscript && audioChunks.length === 0) {
      res.status(400).json({
        error:
          "Lever een transcript of audiofragment aan om virale clips te analyseren.",
      });
      return;
    }

    try {
      const ai = createGenAIClient(apiKey);

      let workingTranscript = rawTranscript;

      if (!workingTranscript && audioChunks.length > 0) {
        const transcriptParts: string[] = [];
        for (let i = 0; i < audioChunks.length; i++) {
          const chunk = audioChunks[i];
          if (!chunk?.data || !chunk?.mimeType) continue;

          const transcribeResp = await withGeminiRetry(
            `podcast-transcribe-${i + 1}`,
            () =>
              ai.models.generateContent({
                model: "gemini-3.5-transcribe",
                contents: {
                  parts: [
                    {
                      inlineData: {
                        mimeType: chunk.mimeType,
                        data: chunk.data,
                      },
                    },
                    {
                      text: `Transcribe this spoken-word/podcast audio verbatim in the exact spoken language. Put [MM:SS] timestamps relative to the start of this audio segment (00:00 to ${formatGlobalTimestamp(chunk.durationSec)}) before sentences and speaker turns. Do not translate or summarize.`,
                    },
                  ],
                },
              })
          );

          const text = (transcribeResp.text ?? "").trim();
          if (text) {
            const shifted = shiftSegmentTimestamps(
              text,
              Number(chunk.offsetSec ?? 0)
            );
            const header = `--- Segment ${formatGlobalTimestamp(chunk.offsetSec)} - ${formatGlobalTimestamp(chunk.offsetSec + chunk.durationSec)} ---`;
            transcriptParts.push(`${header}\n${shifted}`);
          }
        }

        workingTranscript = transcriptParts.join("\n\n").trim();
        if (!workingTranscript) {
          res.status(422).json({
            error:
              "Er is geen verstaanbare spraak herkend in deze video. Plak eventueel handmatig een transcript.",
          });
          return;
        }
      }

      const durationContext =
        durationSec > 0
          ? `Totale videoduur: ${Math.round(durationSec)} seconden (${formatGlobalTimestamp(durationSec)}).`
          : "Totale videoduur: onbekend (leid tijdstempels af uit het transcript).";

      const analysisResp = await generateWithHydrogenOrLiteFallback(
        ai,
        "podcast-virality",
        (model, isLite, abortSignal) => ({
          model,
          contents: [
            sourceTitle ? `Bron / Aflevering: ${sourceTitle}` : "",
            durationContext,
            "Analyseer onderstaand transcript en retourneer ALLEEN de beste virale fragmenten (15 tot 58 seconden, viralScore >= 75, aflopend gesorteerd):",
            workingTranscript,
          ]
            .filter(Boolean)
            .join("\n\n"),
          config: {
            abortSignal,
            systemInstruction: VIRALITY_SYSTEM_INSTRUCTION,
            ...(isLite
              ? {}
              : { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }),
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                language: {
                  type: Type.STRING,
                  description:
                    "De gesproken taal in de video (bijv. Nederlands of Engels).",
                },
                clips: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      hookType: {
                        type: Type.STRING,
                        enum: [
                          "Contrasterend",
                          "Curiosity Gap",
                          "Negatief / Waarschuwing",
                          "Direct Resultaat",
                          "Controversieel",
                        ],
                      },
                      hookQuote: {
                        type: Type.STRING,
                        description:
                          "De eerste pakkende openingszin van de clip (eerste 2-3 seconden).",
                      },
                      startSec: { type: Type.NUMBER },
                      endSec: { type: Type.NUMBER },
                      durationSec: { type: Type.NUMBER },
                      viralScore: { type: Type.NUMBER },
                      scores: {
                        type: Type.OBJECT,
                        properties: {
                          hook: { type: Type.NUMBER },
                          retentionPacing: { type: Type.NUMBER },
                          shareabilityEmotion: { type: Type.NUMBER },
                          standalone: { type: Type.NUMBER },
                        },
                        required: [
                          "hook",
                          "retentionPacing",
                          "shareabilityEmotion",
                          "standalone",
                        ],
                      },
                      reason: {
                        type: Type.STRING,
                        description:
                          "Korte uitleg in dezelfde taal waarom dit fragment viraal gaat.",
                      },
                      captions: {
                        type: Type.ARRAY,
                        description:
                          "Getimede ondertitels in dezelfde taal, verdeeld in korte leesbare blokjes van 3-6 woorden.",
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            startSec: { type: Type.NUMBER },
                            endSec: { type: Type.NUMBER },
                            text: { type: Type.STRING },
                          },
                          required: ["startSec", "endSec", "text"],
                        },
                      },
                    },
                    required: [
                      "title",
                      "hookType",
                      "hookQuote",
                      "startSec",
                      "endSec",
                      "durationSec",
                      "viralScore",
                      "scores",
                      "reason",
                      "captions",
                    ],
                  },
                },
              },
              required: ["language", "clips"],
            },
          },
        })
      );

      const rawJson = (analysisResp.text ?? "").trim();
      if (!rawJson) {
        res.status(502).json({
          error:
            "Gemini gaf geen JSON-antwoord terug voor de viraliteitsanalyse.",
        });
        return;
      }

      const parsed = JSON.parse(rawJson) as {
        language?: string;
        clips?: RawClipOutput[];
      };

      const { clips, filteredOutCount } = normalizeAndFilterClips(
        Array.isArray(parsed.clips) ? parsed.clips : [],
        durationSec
      );

      res.json({
        language: String(parsed.language ?? "Nederlands"),
        transcript: workingTranscript,
        clips,
        filteredOutCount,
      });
    } catch (err) {
      const message = normalizeServerError(
        err,
        "Onbekende fout tijdens Gemini-analyse."
      );
      console.error("Podcast virality analysis failed:", message);
      res.status(500).json({ error: message });
    }
  });

  app.post("/api/faceless/viral-plan", async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(500).json({
        error:
          "GEMINI_API_KEY is missing on the server. Add your key in Settings > Secrets.",
      });
      return;
    }

    const body = (req.body ?? {}) as ViralPlanBody;
    const targetDurationSec = Math.round(
      clamp(Number(body.targetDurationSec ?? 30), 15, 480)
    );
    const aspectRatio = body.aspectRatio === "16:9" ? "16:9" : "9:16";
    const language = "English";
    const subtitleMode =
      body.subtitleMode === "off" || body.subtitleMode === "classic"
        ? body.subtitleMode
        : "word-highlight";
    const optDirectives = body.optimizationDirectives ?? null;
    const visualThemeInput = String(
      body.visualTheme ?? "Gentleman, Style & Quiet Confidence"
    ).trim();
    const themeResolution = resolveThemeForExperiment(
      visualThemeInput,
      [],
      optDirectives
    );
    const themeProfile = themeResolution.profile;
    const visualTheme = themeProfile.label;
    const optionalFocus = String(body.optionalFocus ?? "").trim();
    const seriesCtx = body.seriesContext;
    const channelTitle = String(body.channelTitle ?? "").trim();
    const channelStats = body.channelStats ?? null;
    const recentVideosStats = Array.isArray(body.recentVideosStats)
      ? body.recentVideosStats.slice(0, 15)
      : [];

    const hasChannelData = recentVideosStats.length > 0;
    const approxWords = Math.max(25, Math.round(targetDurationSec * 2.05));

    const statsBlock = hasChannelData
      ? [
          `Connected YouTube channel: ${channelTitle || "Unknown channel"}`,
          channelStats
            ? `Channel overview: ${channelStats.subscriberCount ?? 0} subscribers, ${channelStats.viewCount ?? 0} total views, ${channelStats.videoCount ?? 0} videos.`
            : "",
          "Recent videos from this channel (live YouTube Data API stats):",
          ...recentVideosStats.map(
            (v, idx) =>
              `${idx + 1}. "${String(v.title || "").trim()}" | ${v.format || "Video"} (${v.durationSec || 0}s) | ${v.viewCount ?? 0} views | ${v.likeCount ?? 0} likes | ${v.commentCount ?? 0} comments | engagement: ${v.engagementRate ?? 0}% | ${v.viewsPerDay ?? 0} views/day`
          ),
        ]
          .filter(Boolean)
          .join("\n")
      : channelTitle
        ? `Connected channel '${channelTitle}' has 0 recent public uploads yet. Apply proven retention benchmarks for theme '${visualTheme}'.`
        : `No YouTube channel connected yet; apply proven English retention benchmarks for theme '${visualTheme}'.`;

    const directivesBlock = optDirectives
      ? [
          "PERFORMANCE FEEDBACK LOOP DIRECTIVES (apply these learnings):",
          `- Winning hooks to lean into: ${optDirectives.winningHookTypes.join(", ") || "All"}`,
          `- Weak hooks/patterns to avoid: ${optDirectives.avoidHookTypes.join(", ") || "None"}`,
          `- Pacing guidance: ${optDirectives.pacingDirective}`,
          `- Visual clarity notes: ${optDirectives.visualClarityNotes}`,
          `- High-performing topic angles: ${optDirectives.topTopicAngles.join("; ")}`,
        ].join("\n")
      : "";

    const subtitleDescription =
      subtitleMode === "word-highlight"
        ? "Clean Poppins SemiBold bottom-center subtitles (3-7 words per line, STRICTLY audio-synced with active spoken word in WARM GOLD #FACC15 and remaining words WHITE #FFFFFF)"
        : subtitleMode === "classic"
          ? "Crisp bottom-center Poppins SemiBold white subtitles (3-7 words per line)"
          : "No subtitles (pure #000000 2D vector animation stage + clear English voice-over)";

    try {
      const ai = createGenAIClient(apiKey);

      const planResp = await generateWithHydrogenOrLiteFallback(
        ai,
        "faceless-viral-plan",
        (model, isLite, abortSignal) => ({
          model,
          contents: [
            statsBlock,
            directivesBlock,
            `User constraints:\n- Spoken & metadata language: STRICTLY ${language} ONLY\n- Exact target duration: ${targetDurationSec} seconds (REQUIRED spoken word count: ${approxWords} words, strictly between ${Math.round(approxWords * 0.9)} and ${Math.round(approxWords * 1.1)} spoken words excluding [pause] markers)\n- Intro limit: MAX ${Math.min(28, Math.max(6, Math.round(targetDurationSec * 0.25)))} seconds (<=30s hard cap), explicitly naming: (1) what the video is about, (2) exact count of concrete points/tips, (3) relevant facts/insights covered.\n- Aspect ratio: ${aspectRatio}\n- Subtitles: ${subtitleDescription}\n- Theme Profile: ${visualTheme} (Accent: ${themeProfile.accentHex}, Music: ${themeProfile.musicDescription}, Grounded Situations: ${themeProfile.situations.join("; ")})\n${seriesCtx?.seriesTitle ? `- Ongoing Series Continuity: "${seriesCtx.seriesTitle}" (Season ${seriesCtx.seasonNumber || 1}, Episode ${seriesCtx.episodeNumber || 1}). ${seriesCtx.previousEpisodeSummary ? `Builds directly on previous episode: ${seriesCtx.previousEpisodeSummary}.` : ""} ${seriesCtx.hookType ? `Preferred Hook Type: ${seriesCtx.hookType}.` : ""}` : ""}\n- Optional focus: ${optionalFocus || "None specified — choose the sharpest, highest-retention topic fitting the series & theme"}\n- Visual & Tone rule: Pure #000000 black backdrop for clarity + white line-art & warm gold (#FACC15) accents; calm composed pacing (2.4-4.2s beats), NO glitching or strobing.`,
            `Generate the English Viral Strategy + Channel Stats comparison + complete clear, engaging English fullScript WITH [pause] markers.`,
          ]
            .filter(Boolean)
            .join("\n\n"),
          config: {
            abortSignal,
            systemInstruction: VIRAL_STRATEGY_SYSTEM_INSTRUCTION,
            ...(isLite
              ? {}
              : { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }),
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                chosenTopic: { type: Type.STRING },
                hookFormula: {
                  type: Type.STRING,
                  enum: HOOK_TYPE_SEQUENCE,
                },
                openingHookLine: { type: Type.STRING },
                whyItWillGoViral: { type: Type.STRING },
                statsComparison: {
                  type: Type.OBJECT,
                  properties: {
                    benchmarkSummary: { type: Type.STRING },
                    topReferenceVideo: { type: Type.STRING },
                    winningPatternsUsed: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    avoidedWeaknesses: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                  },
                  required: [
                    "benchmarkSummary",
                    "topReferenceVideo",
                    "winningPatternsUsed",
                    "avoidedWeaknesses",
                  ],
                },
                predictedViralScore: {
                  type: Type.OBJECT,
                  properties: {
                    hook: { type: Type.NUMBER },
                    retentionPacing: { type: Type.NUMBER },
                    shareabilityEmotion: { type: Type.NUMBER },
                    standalone: { type: Type.NUMBER },
                  },
                  required: [
                    "hook",
                    "retentionPacing",
                    "shareabilityEmotion",
                    "standalone",
                  ],
                },
                appliedEditingRules: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                recommendedTheme: { type: Type.STRING },
                fullScript: { type: Type.STRING },
              },
              required: [
                "chosenTopic",
                "hookFormula",
                "openingHookLine",
                "whyItWillGoViral",
                "statsComparison",
                "predictedViralScore",
                "appliedEditingRules",
                "recommendedTheme",
                "fullScript",
              ],
            },
          },
        })
      );

      const raw = (planResp.text ?? "").trim();
      if (!raw) {
        res.status(502).json({
          error: "Gemini did not return a valid viral strategy.",
        });
        return;
      }

      const parsed = JSON.parse(raw) as {
        chosenTopic?: string;
        hookFormula?: string;
        openingHookLine?: string;
        whyItWillGoViral?: string;
        statsComparison?: {
          benchmarkSummary?: string;
          topReferenceVideo?: string;
          winningPatternsUsed?: string[];
          avoidedWeaknesses?: string[];
        };
        predictedViralScore?: {
          hook?: number;
          retentionPacing?: number;
          shareabilityEmotion?: number;
          standalone?: number;
        };
        appliedEditingRules?: string[];
        recommendedTheme?: string;
        fullScript?: string;
      };

      const finalScript = String(parsed.fullScript ?? "")
        .replace(/\*\*|__/g, "")
        .trim();

      const hookScore = Math.round(
        clamp(Number(parsed.predictedViralScore?.hook ?? 21), 0, 25)
      );
      const retScore = Math.round(
        clamp(Number(parsed.predictedViralScore?.retentionPacing ?? 21), 0, 25)
      );
      const shareScore = Math.round(
        clamp(Number(parsed.predictedViralScore?.shareabilityEmotion ?? 20), 0, 25)
      );
      const standScore = Math.round(
        clamp(Number(parsed.predictedViralScore?.standalone ?? 21), 0, 25)
      );

      res.json({
        chosenTopic: String(parsed.chosenTopic ?? "").trim(),
        hookFormula: String(parsed.hookFormula ?? "Curiosity Gap").trim(),
        openingHookLine: String(parsed.openingHookLine ?? "").trim(),
        whyItWillGoViral: String(parsed.whyItWillGoViral ?? "").trim(),
        statsComparison: {
          hasChannelData,
          benchmarkSummary: String(
            parsed.statsComparison?.benchmarkSummary ?? ""
          ).trim(),
          topReferenceVideo: String(
            parsed.statsComparison?.topReferenceVideo ?? ""
          ).trim(),
          winningPatternsUsed: Array.isArray(
            parsed.statsComparison?.winningPatternsUsed
          )
            ? parsed.statsComparison.winningPatternsUsed.slice(0, 5)
            : [],
          avoidedWeaknesses: Array.isArray(
            parsed.statsComparison?.avoidedWeaknesses
          )
            ? parsed.statsComparison.avoidedWeaknesses.slice(0, 5)
            : [],
        },
        predictedViralScore: {
          total: hookScore + retScore + shareScore + standScore,
          hook: hookScore,
          retentionPacing: retScore,
          shareabilityEmotion: shareScore,
          standalone: standScore,
        },
        appliedEditingRules: Array.isArray(parsed.appliedEditingRules)
          ? parsed.appliedEditingRules.slice(0, 6)
          : [],
        recommendedTheme: String(parsed.recommendedTheme ?? visualTheme).trim(),
        fullScript: finalScript,
      });
    } catch (err) {
      const message = normalizeServerError(
        err,
        "Viral strategy generation failed."
      );
      console.error("Viral plan generation failed:", message);
      res.status(500).json({ error: message });
    }
  });

  app.post("/api/faceless/performance-loop", async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(500).json({
        error: "GEMINI_API_KEY is missing on the server.",
      });
      return;
    }

    const body = (req.body ?? {}) as PerformanceLoopBody;
    const themeProfile = resolveThemeProfile(body.visualTheme);
    const seriesTitle =
      String(body.seriesTitle ?? "").trim() || themeProfile.defaultSeriesTitle;
    const recentVideos = Array.isArray(body.recentVideosStats)
      ? body.recentVideosStats.slice(0, 15)
      : [];
    const postedMetrics = Array.isArray(body.postedMetrics)
      ? body.postedMetrics.slice(0, 25)
      : [];

    const totalSample = recentVideos.length + postedMetrics.length;
    const themeListStr = THEME_PROFILES.map((t) => `${t.id}: "${t.label}"`).join(" | ");

    const metricsSummary = [
      postedMetrics.length > 0
        ? "User-logged Shorts & Main Video performance metrics:\n" +
          postedMetrics
            .map(
              (m, i) =>
                `${i + 1}. "${m.title}" [${m.format}] | Theme: ${m.themeLabel || "General"} | Hook Type: ${m.hookType || "Unspecified"} | Views: ${m.views} | Subscribers Gained: ${m.subscribersGained ?? 0} | Retention: ${m.avgRetentionPct}% | CTR/Swipe: ${m.ctrOrSwipePct}% | Likes: ${m.likes}${m.notes ? ` | Notes: ${m.notes}` : ""}`
            )
            .join("\n")
        : "No manual posted metrics logged yet.",
      recentVideos.length > 0
        ? "Live YouTube Studio recent uploads:\n" +
          recentVideos
            .map(
              (v, i) =>
                `${i + 1}. "${String(v.title || "").trim()}" | ${v.format || "Video"} (${v.durationSec || 0}s) | Views: ${v.viewCount ?? 0} | Likes: ${v.likeCount ?? 0} | Engagement: ${v.engagementRate ?? 0}% | Views/day: ${v.viewsPerDay ?? 0}`
            )
            .join("\n")
        : "No connected YouTube Studio upload metrics available yet.",
    ].join("\n\n");

    try {
      const ai = createGenAIClient(apiKey, undefined, 25000);
      const loopResp = await generateWithHydrogenOrLiteFallback(
        ai,
        "faceless-performance-loop",
        (model, isLite, abortSignal) => ({
          model,
          contents: [
            `Series: "${seriesTitle}" · Current Theme Setting: ${String(body.visualTheme || themeProfile.label)}`,
            `Available Themes in Studio: ${themeListStr}`,
            `Analyze the available performance data across ALL themes tested so far and identify which themes, hook formulas, Short runtimes (20-35s), pacing shifts, and topic angles generate BOTH the most VIEWS and the most NEW SUBSCRIBERS.`,
            metricsSummary,
            totalSample === 0
              ? "Note: Sample size is currently 0. Establish calibrated baseline rules to test all themes fairly with calm, high-clarity minimalist 2D vector animation on #000000 black canvas."
              : "Compare themes & hooks rigorously on Views AND Subscribers Gained. Promote what converts viewers into subscribers and flag low-performing angles.",
          ].join("\n\n"),
          config: {
            abortSignal,
            systemInstruction:
              "You are an autonomous English YouTube Growth Analyst & Retention Producer. Always respond strictly in English valid JSON. Never fabricate views or subscriber numbers that were not provided; reference the provided numbers directly.",
            ...(isLite
              ? {}
              : { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }),
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                winningThemes: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                underperformingThemes: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                recommendedNextThemeId: {
                  type: Type.STRING,
                  enum: THEME_PROFILES.map((t) => t.id),
                },
                winningHookTypes: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                avoidHookTypes: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                recommendedShortDurationSec: { type: Type.NUMBER },
                pacingDirective: { type: Type.STRING },
                topTopicAngles: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                visualClarityNotes: { type: Type.STRING },
                loopSummary: { type: Type.STRING },
              },
              required: [
                "winningThemes",
                "underperformingThemes",
                "recommendedNextThemeId",
                "winningHookTypes",
                "avoidHookTypes",
                "recommendedShortDurationSec",
                "pacingDirective",
                "topTopicAngles",
                "visualClarityNotes",
                "loopSummary",
              ],
            },
          },
        })
      );

      const rawText = (loopResp.text ?? "").trim();
      if (!rawText) {
        res.status(502).json({
          error: "Gemini did not return valid performance directives.",
        });
        return;
      }

      const parsed = JSON.parse(rawText) as {
        winningThemes?: string[];
        underperformingThemes?: string[];
        recommendedNextThemeId?: string;
        winningHookTypes?: string[];
        avoidHookTypes?: string[];
        recommendedShortDurationSec?: number;
        pacingDirective?: string;
        topTopicAngles?: string[];
        visualClarityNotes?: string;
        loopSummary?: string;
      };

      const resolvedWinner = resolveThemeProfile(parsed.recommendedNextThemeId);

      const directives: PerformanceOptimizationDirectives = {
        updatedAtIso: new Date().toISOString(),
        sampleSize: totalSample,
        winningThemes: Array.isArray(parsed.winningThemes)
          ? parsed.winningThemes.slice(0, 4)
          : [resolvedWinner.label],
        underperformingThemes: Array.isArray(parsed.underperformingThemes)
          ? parsed.underperformingThemes.slice(0, 3)
          : [],
        recommendedNextThemeId: resolvedWinner.id as ThemeId,
        winningHookTypes: Array.isArray(parsed.winningHookTypes)
          ? parsed.winningHookTypes.slice(0, 4)
          : ["Warning / Mistake", "Curiosity Gap"],
        avoidHookTypes: Array.isArray(parsed.avoidHookTypes)
          ? parsed.avoidHookTypes.slice(0, 3)
          : [],
        recommendedShortDurationSec: Math.round(
          clamp(Number(parsed.recommendedShortDurationSec ?? 27), 20, 35)
        ),
        pacingDirective: String(
          parsed.pacingDirective ??
            "Maintain calm 2.4-4.2s spoken-clause visual transitions with zero strobing or jitter."
        ).trim(),
        topTopicAngles: Array.isArray(parsed.topTopicAngles)
          ? parsed.topTopicAngles.slice(0, 4)
          : themeProfile.situations.slice(0, 3),
        visualClarityNotes: String(
          parsed.visualClarityNotes ??
            "Keep white line-art figures bold and warm gold gaze lines unobstructed above bottom-center captions."
        ).trim(),
        loopSummary: String(parsed.loopSummary ?? "").trim(),
      };

      res.json(directives);
    } catch (err) {
      const message = normalizeServerError(
        err,
        "Performance feedback analysis failed."
      );
      console.error("Performance loop failed:", message);
      res.status(500).json({ error: message });
    }
  });

  app.post("/api/faceless/series-week", async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(500).json({
        error:
          "GEMINI_API_KEY is missing on the server. Add your key in Settings > Secrets.",
      });
      return;
    }

    const body = (req.body ?? {}) as SeriesWeekRequestBody;
    const previousEpisodes = Array.isArray(body.previousEpisodes)
      ? body.previousEpisodes.slice(-8)
      : [];
    const optDirectives = body.optimizationDirectives ?? null;
    const themeResolution = resolveThemeForExperiment(
      body.visualTheme,
      previousEpisodes,
      optDirectives
    );
    const themeProfile = themeResolution.profile;
    const seasonNumber = 1;
    const episodeNumber = Math.max(1, previousEpisodes.length + 1);
    const rawSeriesTitle = String(body.seriesTitle ?? "").trim();
    const seriesTitle =
      !rawSeriesTitle ||
      rawSeriesTitle.toLowerCase().includes("all themes")
        ? themeProfile.defaultSeriesTitle
        : rawSeriesTitle;
    const language = "English";
    const episodeTopicFocus = String(body.episodeTopicFocus ?? "").trim();
    const mainDurationSec = Math.round(
      clamp(Number(body.mainDurationSec ?? 300), 120, 480)
    );

    const weekSchedule = computeUpcomingWeekSchedule(mainDurationSec);
    const mondayToSatSlots = weekSchedule.slice(0, 6);
    const sundaySlot = weekSchedule[6];

    const mainWordsTarget = Math.max(240, Math.round(mainDurationSec * 2.05));
    const continuityBlock =
      previousEpisodes.length > 0
        ? [
            "PREVIOUSLY PUBLISHED WEEKS (AVOID REPEATING TOPICS & CONTINUE NATURAL MOMENTUM):",
            ...previousEpisodes.map(
              (ep) =>
                `- "${ep.episodeTitle}" [${ep.themeId}]: Takeaways: ${ep.keyTakeaways.join("; ")}. Bridge: ${ep.endingBridge}`
            ),
            themeResolution.experimentNote || "",
          ]
            .filter(Boolean)
            .join("\n")
        : themeResolution.experimentNote ||
          "Establish high-clarity, memorable series momentum from Week 1 without referencing season or episode numbers in spoken dialogue.";

    const optimizationBlock = optDirectives
      ? [
          "APPLIED PERFORMANCE FEEDBACK LOOP LEARNINGS (VIEWS + SUBSCRIBERS):",
          `- Top Subscriber/View Themes: ${(optDirectives.winningThemes || []).join(", ") || themeProfile.label}`,
          `- Prioritize Hook Angles: ${optDirectives.winningHookTypes.join(", ") || "All balanced"}`,
          `- Avoid Weak Angles: ${optDirectives.avoidHookTypes.join(", ") || "None"}`,
          `- Target Short Timing Sweet Spot: ~${optDirectives.recommendedShortDurationSec}s`,
          `- Pacing & Visual Clarity: ${optDirectives.pacingDirective} ${optDirectives.visualClarityNotes}`,
          `- Top Topic Angles: ${optDirectives.topTopicAngles.join("; ")}`,
        ].join("\n")
      : "";

    const hookScheduleBlock = mondayToSatSlots
      .map(
        (slot, idx) =>
          `${idx + 1}. Short #${idx + 1} -> FOCUS POINT ${idx + 1} | ${slot.template.dayLabel} (${slot.dateDisplayEn} at ${slot.template.time24h}, duration ${slot.template.targetDurationSec}s, ~${Math.round(slot.template.targetDurationSec * 2.05)} spoken words) -> MANDATORY HOOK TYPE: "${slot.template.hookType}" (${HOOK_TYPE_DESCRIPTIONS[slot.template.hookType!]})`
      )
      .join("\n");

    try {
      const ai = createGenAIClient(apiKey, undefined, 34000);

      const weekResp = await generateWithHydrogenOrLiteFallback(
        ai,
        "faceless-series-week",
        (model, isLite, abortSignal) => ({
          model,
          contents: [
            `SERIES & THEME ("MAKE SERIES" ENGLISH PRODUCTION PACKAGE):
- Series Title: "${seriesTitle}"
- Selected Theme: ${themeProfile.label}
- Aesthetic Signature: Clean #000000 black backdrop, crisp white minimalist vector line-art characters, warm gold (#FACC15 / #D4AF37) eye-contact icons & dashed accents (${themeProfile.visualToneCue})
- Grounded Situations: ${themeProfile.situations.join("; ")}
- Required Output Language: STRICTLY ${language} ONLY (zero non-English copy anywhere)
- Optional User Topic Focus: ${episodeTopicFocus || "Proactively propose the strongest high-retention weekly topic fitting the theme."}`,
            continuityBlock,
            optimizationBlock,
            `6 DISTINCT, SEPARATE PARTS / FOCUS POINTS (1 PER SHORT MON–SAT + ALL 6 COMBINED ON SUNDAY):
- Design exactly 6 genuinely separate, non-overlapping focus points (Point 1 through Point 6). Each must stand alone as its own distinct behavioral part (NOT overlapping variations of the same tip).
- Point N maps 1-to-1 to Short N (Point 1 -> Monday Short 1, ..., Point 6 -> Saturday Short 6).
- Each Focus Point must include a crisp title, coreInsight, and one concrete behavioral/psychological keyFact.`,
            `SUNDAY COMBINED 6-POINT MAIN VIDEO (16:9, ${Math.round(mainDurationSec / 60)} minutes = ${mainDurationSec}s, ~${mainWordsTarget} spoken words):
- INTRO MAX 30 SECONDS (strictly <= 30s): Explicitly state (a) what the video is about, (b) the 6 distinct focus points covered, and (c) the key facts/insights viewers will walk away with.
- Structure the main video cleanly into 6 distinct parts (Part 1 through Part 6) in fluent plain spoken English (NO ** or markdown, use [pause] markers), showing the confident composed man applying good behavior alongside the graceful, attractive woman, and close cleanly without mentioning season or episode numbers.`,
            `THE 6 MON–SAT SHORTS (9:16, 20–35 seconds each, 1 distinct part per Short):
${hookScheduleBlock}
STRICT RULES FOR EVERY SHORT:
- SEPARATE PART ONLY: Each Short N covers ONLY its own Focus Point N in full, tight clarity—NEVER explain, summarize, or list the other 5 steps/points inside a Short!
- DO NOT OVER-PROMOTE SUNDAY: NEVER push or hard-sell Sunday's video inside the Shorts (no "watch Sunday's full video!", no "don't miss Sunday's 5-minute breakdown!", no channel nagging). Let each Short satisfy completely on its own!
- BRIEF MENTION OF TOMORROW'S SHORT: On Monday–Friday Shorts (Short 1 through Short 5), close the Short naturally with ONE brief, low-key line teasing what TOMORROW's Short is about (matching that point's actual topic, e.g., "Tomorrow: why the pause before you answer changes how people hear you."). Store this same crisp preview line in "teaseNote". On Saturday (Short 6), close on a crisp standalone takeaway (and at most a brief natural mention that all six principles tie together tomorrow).
- MORE FITTING HOOKS: Craft "openingHookLine" in the first 1.5–2.5 seconds so it fits the exact human situation of Focus Point N organically—sharp, conversational, specific, and grounded (zero generic cliché openers, and NO two consecutive Shorts may share the same opening structure or starting words). Write "fullScript" in clean plain spoken English with [pause] markers.`,
          ]
            .filter(Boolean)
            .join("\n\n"),
          config: {
            abortSignal,
            systemInstruction: `${LEAD_2D_DIRECTOR_RULES}
You are acting as autonomous English Producer, Retention Strategist, and 2D Animation Director executing "Make Series". Return ONLY valid JSON in English containing 6 distinct, separate focusPoints, the 5-minute (300s default) Sunday Main Video combining those 6 points with a <=30s intro, and 6 standalone Mon-Sat Shorts (20-35s) where each Short has a situation-fitting hook, stays strictly on its own single part without listing all 6 steps or promoting Sunday, and briefly notes what tomorrow's Short covers.`,
            ...(isLite
              ? {}
              : { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }),
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                episodeTitle: { type: Type.STRING },
                seriesArcNote: { type: Type.STRING },
                episodeEndingBridge: { type: Type.STRING },
                introVerification: {
                  type: Type.OBJECT,
                  properties: {
                    estimatedIntroSec: { type: Type.NUMBER },
                    pointCount: { type: Type.INTEGER },
                    keyFactsAndInsights: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                  },
                  required: [
                    "estimatedIntroSec",
                    "pointCount",
                    "keyFactsAndInsights",
                  ],
                },
                focusPoints: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      pointNumber: { type: Type.INTEGER },
                      title: { type: Type.STRING },
                      coreInsight: { type: Type.STRING },
                      keyFact: { type: Type.STRING },
                    },
                    required: ["pointNumber", "title", "coreInsight", "keyFact"],
                  },
                },
                sundayMainVideo: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    openingHookLine: { type: Type.STRING },
                    teaseNote: { type: Type.STRING },
                    fullScript: { type: Type.STRING },
                    youtubeTitle: { type: Type.STRING },
                    captionWithHashtags: { type: Type.STRING },
                    thumbnailHook: { type: Type.STRING },
                  },
                  required: [
                    "title",
                    "openingHookLine",
                    "teaseNote",
                    "fullScript",
                    "youtubeTitle",
                    "captionWithHashtags",
                    "thumbnailHook",
                  ],
                },
                weeklyShorts: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      pointNumber: { type: Type.INTEGER },
                      dayLabel: { type: Type.STRING },
                      hookType: { type: Type.STRING },
                      title: { type: Type.STRING },
                      openingHookLine: { type: Type.STRING },
                      teaseNote: { type: Type.STRING },
                      fullScript: { type: Type.STRING },
                      youtubeTitle: { type: Type.STRING },
                      captionWithHashtags: { type: Type.STRING },
                      thumbnailHook: { type: Type.STRING },
                    },
                    required: [
                      "pointNumber",
                      "dayLabel",
                      "hookType",
                      "title",
                      "openingHookLine",
                      "teaseNote",
                      "fullScript",
                      "youtubeTitle",
                      "captionWithHashtags",
                      "thumbnailHook",
                    ],
                  },
                },
              },
              required: [
                "episodeTitle",
                "seriesArcNote",
                "episodeEndingBridge",
                "introVerification",
                "focusPoints",
                "sundayMainVideo",
                "weeklyShorts",
              ],
            },
          },
        }),
        32000
      );

      const rawText = (weekResp.text ?? "").trim();
      if (!rawText) {
        res.status(502).json({
          error: "Gemini did not return a valid series week plan.",
        });
        return;
      }

      const parsed = JSON.parse(rawText) as {
        episodeTitle?: string;
        seriesArcNote?: string;
        episodeEndingBridge?: string;
        introVerification?: {
          estimatedIntroSec?: number;
          pointCount?: number;
          keyFactsAndInsights?: string[];
        };
        focusPoints?: Array<{
          pointNumber?: number;
          title?: string;
          coreInsight?: string;
          keyFact?: string;
        }>;
        sundayMainVideo?: {
          title?: string;
          openingHookLine?: string;
          teaseNote?: string;
          fullScript?: string;
          youtubeTitle?: string;
          captionWithHashtags?: string;
          thumbnailHook?: string;
        };
        weeklyShorts?: Array<{
          pointNumber?: number;
          dayLabel?: string;
          hookType?: string;
          title?: string;
          openingHookLine?: string;
          teaseNote?: string;
          fullScript?: string;
          youtubeTitle?: string;
          captionWithHashtags?: string;
          thumbnailHook?: string;
        }>;
      };

      const cleanPlain = (s: unknown) =>
        String(s ?? "")
          .replace(/\*\*|__/g, "")
          .trim();

      const rawFocusPoints = Array.isArray(parsed.focusPoints)
        ? parsed.focusPoints
        : [];
      const rawShorts = Array.isArray(parsed.weeklyShorts)
        ? parsed.weeklyShorts
        : [];

      const focusPoints = mondayToSatSlots.map((slot, idx) => {
        const fp = rawFocusPoints[idx] || {};
        const pointNum = idx + 1;
        return {
          pointNumber: pointNum,
          title:
            cleanPlain(fp.title) ||
            cleanPlain(rawShorts[idx]?.title) ||
            `Focus Point ${pointNum}`,
          coreInsight:
            cleanPlain(fp.coreInsight) ||
            "Practical composure shift backed by behavioral observation.",
          keyFact:
            cleanPlain(fp.keyFact) ||
            cleanPlain(parsed.introVerification?.keyFactsAndInsights?.[idx]) ||
            "Measured pacing increases perceived confidence immediately.",
          mappedDayLabel: slot.template.dayLabel,
          mappedShortId: `s${seasonNumber}e${episodeNumber}-${slot.template.shortCode.toLowerCase()}`,
        };
      });

      const weeklyShorts = mondayToSatSlots.map((slot, idx) => {
        const aiShort = rawShorts[idx] || {};
        const point = focusPoints[idx];
        const enforcedHookType =
          slot.template.hookType || HOOK_TYPE_SEQUENCE[idx % HOOK_TYPE_SEQUENCE.length];
        return {
          id: `s${seasonNumber}e${episodeNumber}-${slot.template.shortCode.toLowerCase()}`,
          dayIndex: slot.template.dayIndex,
          dayLabel: slot.template.dayLabel,
          shortCode: slot.template.shortCode,
          kind: "short" as const,
          format: "9:16" as const,
          targetDurationSec: clamp(slot.template.targetDurationSec, 20, 35),
          recommendedTime24h: slot.template.time24h,
          windowLabel: `${slot.dateDisplayEn} · ${slot.template.windowLabel}`,
          scheduledPublishAtIso: slot.scheduledPublishAtIso,
          scheduledLocalInput: slot.scheduledLocalInput,
          pointNumber: point.pointNumber,
          focusPointTitle: point.title,
          title: cleanPlain(aiShort.title) || `${slot.template.dayLabel}: ${point.title}`,
          hookType: enforcedHookType,
          openingHookLine: cleanPlain(aiShort.openingHookLine),
          teaseNote: cleanPlain(aiShort.teaseNote),
          fullScript: cleanPlain(aiShort.fullScript),
          youtubeTitle: cleanPlain(aiShort.youtubeTitle || aiShort.title).slice(0, 96),
          captionWithHashtags: cleanPlain(aiShort.captionWithHashtags),
          thumbnailHook: cleanPlain(aiShort.thumbnailHook).slice(0, 56),
          approvedForPublish: false,
          renderedAndReady: false,
        };
      });

      const sunRaw = parsed.sundayMainVideo || {};
      const sundayMainVideo = {
        id: `s${seasonNumber}e${episodeNumber}-sun-main`,
        dayIndex: 0,
        dayLabel: "Sunday",
        shortCode: "Sun",
        kind: "main" as const,
        format: "16:9" as const,
        targetDurationSec: mainDurationSec,
        recommendedTime24h: sundaySlot.template.time24h,
        windowLabel: `${sundaySlot.dateDisplayEn} · ${sundaySlot.template.windowLabel}`,
        scheduledPublishAtIso: sundaySlot.scheduledPublishAtIso,
        scheduledLocalInput: sundaySlot.scheduledLocalInput,
        title:
          cleanPlain(sunRaw.title || parsed.episodeTitle) ||
          `Episode ${episodeNumber}`,
        hookType: "Sunday Flagship (Intro <= 30s · 6 Points)",
        openingHookLine: cleanPlain(sunRaw.openingHookLine),
        teaseNote: cleanPlain(sunRaw.teaseNote),
        fullScript: cleanPlain(sunRaw.fullScript),
        youtubeTitle: cleanPlain(
          sunRaw.youtubeTitle || parsed.episodeTitle || `S0${seasonNumber}E0${episodeNumber}`
        ).slice(0, 96),
        captionWithHashtags: cleanPlain(sunRaw.captionWithHashtags),
        thumbnailHook: cleanPlain(sunRaw.thumbnailHook).slice(0, 56),
        approvedForPublish: false,
        renderedAndReady: false,
      };

      res.json({
        seriesTitle,
        seasonNumber,
        episodeNumber,
        themeId: themeProfile.id,
        themeLabel: themeProfile.label,
        experimentModeNote: themeResolution.experimentNote,
        episodeTitle: cleanPlain(parsed.episodeTitle) || sundayMainVideo.title,
        seriesArcNote: cleanPlain(parsed.seriesArcNote),
        episodeEndingBridge: cleanPlain(parsed.episodeEndingBridge),
        introVerification: {
          estimatedIntroSec: Math.min(
            30,
            Math.max(12, Math.round(Number(parsed.introVerification?.estimatedIntroSec ?? 24)))
          ),
          pointCount: 6,
          keyFactsAndInsights: Array.isArray(parsed.introVerification?.keyFactsAndInsights)
            ? parsed.introVerification.keyFactsAndInsights.map(cleanPlain).slice(0, 6)
            : focusPoints.map((fp) => fp.keyFact),
        },
        focusPoints,
        sundayMainVideo,
        weeklyShorts,
        appliedOptimizationSummary: optDirectives
          ? `Refined via Performance Loop (${optDirectives.sampleSize} items): leaning into ${(optDirectives.winningThemes || []).join(", ") || themeProfile.label} · hooks: ${optDirectives.winningHookTypes.join(", ")}`
          : undefined,
      });
    } catch (err) {
      const message = normalizeServerError(
        err,
        "Generating series week plan failed."
      );
      console.error("Series week generation failed:", message);
      res.status(500).json({ error: message });
    }
  });

  app.post("/api/faceless/generate", async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(500).json({
        error:
          "GEMINI_API_KEY ontbreekt op de server. Voeg je sleutel toe in Instellingen > Secrets.",
      });
      return;
    }

    const body = (req.body ?? {}) as FacelessGenerateBody;
    const topicOrScript = String(body.topicOrScript ?? "").trim();
    const targetDurationSec = Math.round(
      clamp(Number(body.targetDurationSec ?? 45), 15, 480)
    );
    const aspectRatio = body.aspectRatio === "16:9" ? "16:9" : "9:16";
    const allowedVoices = ["Puck", "Charon", "Kore", "Fenrir", "Zephyr"];
    const voiceName = allowedVoices.includes(String(body.voiceName))
      ? String(body.voiceName)
      : "Charon";
    const themeProfile = resolveThemeProfile(body.visualTheme);
    const visualTheme = themeProfile.label;
    const language = "English";
    const viralContext = body.viralStrategyContext;
    const seriesCtx = body.seriesContext;

    if (!topicOrScript) {
      res.status(400).json({
        error: "Please provide a topic or script first to build the video.",
      });
      return;
    }

    try {
      const reqStartMs = Date.now();
      const ai = createGenAIClient(apiKey, undefined, 28000);
      const aiTts = createGenAIClient(apiKey, "v1beta", 45000);

      const targetSceneCount = Math.max(5, Math.round(targetDurationSec / 3.1));
      const targetWords = Math.max(25, Math.round(targetDurationSec * 2.05));
      const introMaxSec = Math.min(28, Math.max(8, Math.round(targetDurationSec * 0.25)));

      const ALL_ARCHETYPES: VectorArchetype[] = [
        "intro_roadmap",
        "chapter_card",
        "dynamic_duo",
        "reaction_contrast",
        "mirror_self",
        "data_insight",
        "message_thread",
        "scale_balance",
        "spotlight_focus",
        "momentum_steps",
        "brain_signal",
        "doorway_choice",
        "crowd_standout",
        "orbit_gravity",
        "shield_boundary",
        "outro_takeaway",
      ];

      const ROTATABLE_ARCHETYPES: VectorArchetype[] = [
        "dynamic_duo",
        "reaction_contrast",
        "mirror_self",
        "data_insight",
        "message_thread",
        "scale_balance",
        "spotlight_focus",
        "momentum_steps",
        "brain_signal",
        "doorway_choice",
        "crowd_standout",
        "orbit_gravity",
        "shield_boundary",
      ];

      const ALL_PROP_TAGS: UniquePropTag[] = [
        "none",
        "chart",
        "heart",
        "message",
        "timer",
        "key",
        "compass",
        "trophy",
        "target",
        "flame",
        "microphone",
        "book",
        "bolt",
        "eye",
        "check",
        "question",
      ];

      const ROTATABLE_PROPS: UniquePropTag[] = ALL_PROP_TAGS.filter(
        (p) => p !== "none"
      );

      const scriptSchema = {
        type: Type.OBJECT,
        properties: {
          video_title: { type: Type.STRING },
          thumbnail_idea: { type: Type.STRING },
          voiceover_style: { type: Type.STRING },
          subtitle_style: { type: Type.STRING },
          youtubeTitle: { type: Type.STRING },
          captionWithHashtags: { type: Type.STRING },
          thumbnailHook: { type: Type.STRING },
          scenes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                sceneIndex: { type: Type.INTEGER },
                section_label: { type: Type.STRING },
                durationSec: { type: Type.NUMBER },
                voiceover: { type: Type.STRING },
                visual_scene: { type: Type.STRING },
                sfx_or_music_cue: { type: Type.STRING },
                archetype: {
                  type: Type.STRING,
                  enum: ALL_ARCHETYPES,
                },
                prop_tag: {
                  type: Type.STRING,
                  enum: ALL_PROP_TAGS,
                },
                contrast_shift: {
                  type: Type.STRING,
                  enum: ["black", "invert_light", "accent_flash"],
                },
                is_section_card: { type: Type.BOOLEAN },
                left_label: { type: Type.STRING },
                right_label: { type: Type.STRING },
                badge_text: { type: Type.STRING },
                stat_value: { type: Type.STRING },
                point_number: { type: Type.INTEGER },
                accent_hex: { type: Type.STRING },
                focus_character: {
                  type: Type.STRING,
                  enum: ["man", "woman", "duo"],
                },
                man_stance: {
                  type: Type.STRING,
                  enum: ["strong", "neutral", "mistake"],
                },
                woman_mood: {
                  type: Type.STRING,
                  enum: ["warm", "confident", "curious", "unimpressed"],
                },
              },
              required: [
                "sceneIndex",
                "section_label",
                "durationSec",
                "voiceover",
                "visual_scene",
                "sfx_or_music_cue",
                "archetype",
                "prop_tag",
                "focus_character",
                "man_stance",
                "contrast_shift",
                "is_section_card",
              ],
            },
          },
        },
        required: [
          "video_title",
          "thumbnail_idea",
          "voiceover_style",
          "subtitle_style",
          "youtubeTitle",
          "captionWithHashtags",
          "thumbnailHook",
          "scenes",
        ],
      };

      const inferSemanticVisuals = (
        text: string,
        visualDesc: string,
        sectionLabel: string
      ): {
        archetypes: VectorArchetype[];
        props: UniquePropTag[];
        focusCharacter: FocusCharacter;
        manStance: ManStance;
      } => {
        const hay = `${text} ${visualDesc} ${sectionLabel}`.toLowerCase();
        const isDuo =
          /\b(vrouw|zij|haar|date|gesprek|aantrekk|relatie|woman|she|her|girl|attract|conversation|flirt)\b/.test(
            hay
          );
        const focusCharacter: FocusCharacter = isDuo
          ? /\b(haar reactie|zij denkt|zij kijkt|her reaction|woman alone)\b/.test(hay)
            ? "woman"
            : "duo"
          : "man";
        const manStance: ManStance =
          /\b(fout|valkuil|never|don't|stop met|niet doen|mistake|desperate|over-eager)\b/.test(
            hay
          ) && !/\b(instead|beter|sterk|zelfverzekerd|confident|calm)\b/.test(hay)
            ? "mistake"
            : "strong";

        if (/\b(bericht|app|chat|dm|text|reply|reageer|telefoon|phone|message)\b/.test(hay)) {
          return {
            archetypes: ["message_thread", "dynamic_duo", "spotlight_focus"],
            props: ["message", "timer", "check"],
            focusCharacter,
            manStance,
          };
        }
        if (/\b(%|procent|onderzoek|studie|feiten|data|cijfer|wetenschap|resultaat|research|study|percent|\d+x)\b/.test(hay)) {
          return {
            archetypes: ["data_insight", "momentum_steps", "spotlight_focus"],
            props: ["chart", "target", "check"],
            focusCharacter,
            manStance,
          };
        }
        if (/\b(fout|valkuil|contrast|verschil|in plaats van|vs|instead|before|wrong)\b/.test(hay)) {
          return {
            archetypes: ["reaction_contrast", "scale_balance", "dynamic_duo"],
            props: ["compass", "check", "target"],
            focusCharacter,
            manStance: "strong",
          };
        }
        if (/\b(grens|nee|ruimte|rust|druk|afleiding|focus|boundary|calm|noise|shield)\b/.test(hay)) {
          return {
            archetypes: ["shield_boundary", "crowd_standout", "spotlight_focus"],
            props: ["target", "compass", "check"],
            focusCharacter,
            manStance,
          };
        }
        if (/\b(brein|gedacht|mindset|spiegel|zelf|overdenken|mental|mind|reflect|habit|gewoonte)\b/.test(hay)) {
          return {
            archetypes: ["brain_signal", "mirror_self", "momentum_steps"],
            props: ["bolt", "eye", "book"],
            focusCharacter,
            manStance,
          };
        }
        if (/\b(keuze|stap|richting|actie|doel|groei|step|choice|action|goal)\b/.test(hay)) {
          return {
            archetypes: ["doorway_choice", "momentum_steps", "crowd_standout"],
            props: ["compass", "key", "trophy"],
            focusCharacter,
            manStance,
          };
        }
        if (isDuo) {
          return {
            archetypes: ["dynamic_duo", "orbit_gravity", "spotlight_focus"],
            props: ["eye", "heart", "compass"],
            focusCharacter: "duo",
            manStance,
          };
        }
        return {
          archetypes: ["spotlight_focus", "momentum_steps", "doorway_choice", "crowd_standout"],
          props: ["target", "check", "compass", "bolt"],
          focusCharacter,
          manStance,
        };
      };

      const buildScriptPrompt = (extraCalibrationNote = "") =>
        [
          `Topic or source script:\n${topicOrScript}`,
          viralContext
            ? `Applied Viral Strategy:\n- Hook formula: ${viralContext.hookFormula || "Curiosity Gap"}\n- Opening hook: ${viralContext.openingHookLine || ""}\n- Winning patterns: ${(viralContext.winningPatternsUsed || []).join("; ")}`
            : "",
          `EXACT ENGLISH, INTRO & CALM PACING REQUIREMENTS:
- Output language: STRICTLY ENGLISH ONLY for voiceover, section_label, visual_scene, left_label, right_label, badge_text, titles, and hashtags.
- Target video length: EXACTLY ${targetDurationSec} seconds
- Target scene count: ~${targetSceneCount} calm, composed scenes (each 2.4 to 4.2 seconds; ~5-9 clean spoken English words per scene; NO rapid strobing or jittery cuts)
- Total spoken word count across all scenes MUST be ~${targetWords} words (strictly between ${Math.round(targetWords * 0.9)} and ${Math.round(targetWords * 1.1)} spoken words, excluding [pause] markers; NO markdown asterisks like **bold**)
- ${targetDurationSec >= 120 ? `INTRO RULE (MAX ${introMaxSec}s, STRICTLY <= 30s): Open cleanly with intro_roadmap. Explicitly state: (a) what the video is about, (b) the 6 concrete focus points covered, and (c) the key facts/insights covered.` : `STANDALONE SHORT RULE: Open immediately in the first scene with a fitting hook directly tied to this single point (use an authentic scene archetype like dynamic_duo, reaction_contrast, or spotlight_focus—NOT a multi-step roadmap), and avoid listing all 6 steps or pitching Sunday's video.`}
- LOGICAL SPEECH-SYNCED ANIMATIONS: Every archetype, prop_tag, focus_character, man_stance, woman_mood, left_label/right_label (1-3 English words), and visual_scene MUST directly match what is spoken at that exact instant.
- CONFIDENT MAN & GRACEFUL WOMAN: Make man and woman clearly distinct with bold, readable line-art sizing in BOTH 9:16 and 16:9. Keep the woman graceful and attractive. Keep man_stance="strong" whenever the man applies good advice or leads calmly (NO weak look!).
- BACKDROP & ACCENTS: Pure #000000 black backdrop for clarity ("contrast_shift": "black", optionally "accent_flash" warm gold aura for major insights; NEVER rapid strobing or harsh inversion). Pair with warm gold (#FACC15 / #D4AF37) eye icons and dashed sightlines.`,
          `Aspect ratio: ${aspectRatio}`,
          `Theme Profile: ${visualTheme} (Primary Accent: ${themeProfile.accentHex}, Visual Tone: ${themeProfile.visualToneCue}, Situations: ${themeProfile.situations.join("; ")})`,
          seriesCtx?.seriesTitle
            ? `Series Continuity: "${seriesCtx.seriesTitle}" (Season ${seriesCtx.seasonNumber || 1}, Episode ${seriesCtx.episodeNumber || 1})${seriesCtx.hookType ? ` · Hook Type: ${seriesCtx.hookType}` : ""}`
            : "",
          `Language for voice-over & metadata: STRICTLY ${language}`,
          `Minimalist Black & White + Warm Gold 2D Vector Line-Art Animation ONLY — NO stock video queries.`,
          extraCalibrationNote,
        ]
          .filter(Boolean)
          .join("\n\n");

      const allowedArchetypes = new Set<VectorArchetype>(ALL_ARCHETYPES);
      const allowedPropTags = new Set<UniquePropTag>(ALL_PROP_TAGS);

      const parseGeneratedStoryboard = (rawJsonText: string) => {
        const parsedObj = JSON.parse(rawJsonText) as {
          video_title?: string;
          thumbnail_idea?: string;
          voiceover_style?: string;
          subtitle_style?: string;
          fullScript?: string;
          youtubeTitle?: string;
          captionWithHashtags?: string;
          thumbnailHook?: string;
          scenes?: RawFacelessScene[];
        };

        const rawList = Array.isArray(parsedObj.scenes) ? parsedObj.scenes : [];
        const mappedScenes = rawList
          .map((sc, idx) => {
            const voiceText = String(sc.voiceover ?? sc.narrationText ?? "")
              .replace(/\*\*|__/g, "")
              .trim();
            const visualDesc = String(
              sc.visual_scene ??
                "Composed 2D vector character illustration on high-contrast black backdrop with warm gold accents."
            ).trim();
            const secLabel = String(sc.section_label ?? `Part ${idx + 1}`).trim();
            const semantic = inferSemanticVisuals(voiceText, visualDesc, secLabel);

            const isLast = idx === rawList.length - 1;
            const fallbackArch: VectorArchetype =
              idx === 0
                ? "intro_roadmap"
                : isLast
                  ? "outro_takeaway"
                  : semantic.archetypes[0];
            const arch = allowedArchetypes.has(sc.archetype as VectorArchetype)
              ? (sc.archetype as VectorArchetype)
              : fallbackArch;
            const rawProp = sc.prop_tag as UniquePropTag;
            const propTag: UniquePropTag = allowedPropTags.has(rawProp)
              ? rawProp
              : semantic.props[0];
            const shift: ContrastShiftMode =
              sc.contrast_shift === "accent_flash"
                ? "accent_flash"
                : "black";
            const isSectionCard =
              Boolean(sc.is_section_card) || arch === "chapter_card";
            const pointNum =
              typeof sc.point_number === "number" &&
              Number.isFinite(sc.point_number) &&
              sc.point_number > 0
                ? Math.round(sc.point_number)
                : undefined;
            const accentHex =
              typeof sc.accent_hex === "string" &&
              /^#[0-9a-f]{6}$/i.test(sc.accent_hex.trim())
                ? sc.accent_hex.trim()
                : themeProfile.accentHex;
            const focusCharacter: FocusCharacter =
              sc.focus_character === "man" ||
              sc.focus_character === "woman" ||
              sc.focus_character === "duo"
                ? sc.focus_character
                : semantic.focusCharacter;
            const manStance: ManStance =
              sc.man_stance === "strong" ||
              sc.man_stance === "neutral" ||
              sc.man_stance === "mistake"
                ? sc.man_stance
                : semantic.manStance;
            const womanMood: WomanMood =
              sc.woman_mood === "warm" ||
              sc.woman_mood === "confident" ||
              sc.woman_mood === "curious" ||
              sc.woman_mood === "unimpressed"
                ? sc.woman_mood
                : "warm";

            const animSpec: SceneAnimationSpec = {
              archetype: arch,
              contrastShift: shift,
              isSectionCard,
              leftLabel: sc.left_label ? String(sc.left_label).trim() : undefined,
              rightLabel: sc.right_label
                ? String(sc.right_label).trim()
                : undefined,
              badgeText: sc.badge_text ? String(sc.badge_text).trim() : undefined,
              propTag,
              statValue: sc.stat_value ? String(sc.stat_value).trim() : undefined,
              pointNumber: pointNum,
              accentHex,
              focusCharacter,
              manStance,
              womanMood,
            };
            return {
              sceneIndex: idx + 1,
              section_label: secLabel,
              durationSec: clamp(Number(sc.durationSec ?? 3.1), 2.4, 4.2),
              voiceover: voiceText,
              narrationText: voiceText,
              visual_scene: visualDesc,
              sfx_or_music_cue: String(
                sc.sfx_or_music_cue ?? "soft chime"
              ).trim(),
              animSpec,
            };
          })
          .filter((sc) => stripMarkersForWords(sc.narrationText).length > 0);

        // Enforce variety ONLY using semantically matching alternatives (never random unrelated picks!)
        for (let i = 0; i < mappedScenes.length; i++) {
          const cur = mappedScenes[i];
          const spec = cur.animSpec;
          if (i === 0 && spec.archetype !== "intro_roadmap" && !spec.isSectionCard) {
            spec.archetype = "intro_roadmap";
          }
          if (i > 0 && !spec.isSectionCard) {
            const prevArch = mappedScenes[i - 1].animSpec.archetype;
            if (spec.archetype === prevArch) {
              const sem = inferSemanticVisuals(
                cur.voiceover,
                cur.visual_scene,
                cur.section_label
              );
              const altArch = sem.archetypes.find((a) => a !== prevArch);
              if (altArch) spec.archetype = altArch;
            }
            const prevProp = mappedScenes[i - 1].animSpec.propTag;
            if (spec.propTag && spec.propTag !== "none" && spec.propTag === prevProp) {
              const sem = inferSemanticVisuals(
                cur.voiceover,
                cur.visual_scene,
                cur.section_label
              );
              spec.propTag = sem.props.find((p) => p !== prevProp) || "none";
            }
          }
        }

        return { parsedObj, mappedScenes };
      };

      const scriptResp = await generateWithHydrogenOrLiteFallback(
        ai,
        "faceless-script",
        (model, isLite, abortSignal) => ({
          model,
          contents: buildScriptPrompt(),
          config: {
            abortSignal,
            systemInstruction: FACELESS_SCRIPT_SYSTEM_INSTRUCTION,
            ...(isLite
              ? {}
              : { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }),
            responseMimeType: "application/json",
            responseSchema: scriptSchema,
          },
        })
      );

      const rawScriptJson = (scriptResp.text ?? "").trim();
      if (!rawScriptJson) {
        res.status(502).json({
          error: "Gemini gaf geen geldig 2D storyboard-script terug.",
        });
        return;
      }

      let { parsedObj: parsed, mappedScenes: rawScenes } =
        parseGeneratedStoryboard(rawScriptJson);

      const currentWordCount = rawScenes.reduce(
        (acc, s) => acc + stripMarkersForWords(s.narrationText).length,
        0
      );
      const minExpectedWords = Math.round(targetWords * 0.58);
      const maxExpectedWords = Math.round(targetWords * 1.55);

      if (
        rawScenes.length > 0 &&
        (currentWordCount < minExpectedWords ||
          currentWordCount > maxExpectedWords ||
          rawScenes.length < Math.max(4, Math.floor(targetDurationSec / 4.4)))
      ) {
        try {
          const calibrateResp = await generateWithHydrogenOrLiteFallback(
            ai,
            "faceless-script-calibrate",
            (model, isLite, abortSignal) => ({
              model,
              contents: buildScriptPrompt(
                `LENGTH & CALM PACING CORRECTION REQUIRED: Your previous draft produced ${currentWordCount} spoken words across ${rawScenes.length} scenes, which does NOT match the required ${targetDurationSec}s runtime or calm 2.4-4.2s pacing. Rewrite it strictly in ENGLISH to EXACTLY ~${targetWords} spoken words (between ${Math.round(targetWords * 0.85)} and ${Math.round(targetWords * 1.15)}) spread smoothly across ~${targetSceneCount} calm scenes of 2.4 to 4.2 seconds each, keeping the intro <= ${introMaxSec}s with topic, exact point count, and key insights stated clearly. Previous draft:\n${rawScenes.map((s) => s.voiceover).join(" ")}`
              ),
              config: {
                abortSignal,
                systemInstruction: FACELESS_SCRIPT_SYSTEM_INSTRUCTION,
                ...(isLite
                  ? {}
                  : { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }),
                responseMimeType: "application/json",
                responseSchema: scriptSchema,
              },
            })
          );
          const calibratedRaw = (calibrateResp.text ?? "").trim();
          if (calibratedRaw) {
            const calibrated = parseGeneratedStoryboard(calibratedRaw);
            const calWords = calibrated.mappedScenes.reduce(
              (acc, s) => acc + stripMarkersForWords(s.narrationText).length,
              0
            );
            if (
              calibrated.mappedScenes.length > 0 &&
              Math.abs(calWords - targetWords) < Math.abs(currentWordCount - targetWords)
            ) {
              parsed = calibrated.parsedObj;
              rawScenes = calibrated.mappedScenes;
            }
          }
        } catch {
          // Proceed with initial draft + ffmpeg audio duration calibration
        }
      }

      if (rawScenes.length === 0) {
        res.status(422).json({
          error: "Kon geen bruikbare scènes genereren uit deze invoer.",
        });
        return;
      }

      const afterScriptMs = Date.now();
      const narrationDisplay = rawScenes.map((s) => s.voiceover).join(" ");

      const scenesPerTtsBatch = 16;
      const sceneBatches: Array<typeof rawScenes> = [];
      for (let i = 0; i < rawScenes.length; i += scenesPerTtsBatch) {
        sceneBatches.push(rawScenes.slice(i, i + scenesPerTtsBatch));
      }

      const generateBatchWav = async (
        batchIndex: number,
        batchText: string
      ): Promise<Buffer> => {
        return withGeminiRetry(`faceless-tts-${batchIndex + 1}`, async () => {
          const ttsInputText = stripPauseMarkersForTts(batchText);
          const ttsResp = await callWithTimeout(
            `faceless-tts-${batchIndex + 1}`,
            42000,
            (abortSignal) =>
              aiTts.models.generateContent({
                model: "gemini-3.8-flash-lite-tts",
                contents: [
                  {
                    role: "user",
                    parts: [{ text: ttsInputText }],
                  },
                ],
                config: {
                  abortSignal,
                  responseModalities: ["AUDIO"],
                  speechConfig: {
                    voiceConfig: {
                      prebuiltVoiceConfig: { voiceName },
                    },
                  },
                },
              })
          );

          const parts = ttsResp.candidates?.[0]?.content?.parts ?? [];
          const chunkBase64 = parts.find((p) => p.inlineData?.data)?.inlineData
            ?.data;
          if (!chunkBase64) {
            throw new Error("Voice-over genereren via TTS gaf geen audio terug.");
          }
          return Buffer.from(chunkBase64, "base64");
        });
      };

      const batchWavs: Buffer[] = new Array(sceneBatches.length);
      for (let idx = 0; idx < sceneBatches.length; idx++) {
        if (idx > 0) {
          await new Promise((r) => setTimeout(r, 300));
        }
        const batchText = sceneBatches[idx]
          .map((s) => s.voiceover)
          .join(" ");
        batchWavs[idx] = await generateBatchWav(idx, batchText);
      }
      const afterTtsMs = Date.now();

      const rawPcmChunks: Buffer[] = [];
      let resolvedSampleRate = 24000;
      for (const wav of batchWavs) {
        const info = extractWavPcmInfo(wav);
        resolvedSampleRate = info.sampleRate;
        if (info.pcm.length > 0) rawPcmChunks.push(info.pcm);
      }

      const rawCombinedPcm = Buffer.concat(rawPcmChunks);
      const calibratedPcm = await calibratePcmToExactDuration(
        rawCombinedPcm,
        resolvedSampleRate,
        targetDurationSec
      );
      const fullWavBuffer = wrapPcmAsMonoWav(calibratedPcm, resolvedSampleRate);
      const base64Audio = fullWavBuffer.toString("base64");
      const afterFfmpegMs = Date.now();

      const calibratedAligned = alignWordsToWavSpeech(fullWavBuffer, rawScenes);
      const allWordTimings = calibratedAligned.wordTimings;
      const totalAlignedDuration = calibratedAligned.totalDurationSec;

      const visualSlots: Array<{
        source: (typeof rawScenes)[number];
        subIndex: number;
        startSec: number;
        endSec: number;
      }> = [];

      calibratedAligned.sceneRanges.forEach((range, idx) => {
        const src = rawScenes[idx];
        const span = range.endSec - range.startSec;
        if (span > 4.2) {
          const parts = Math.min(
            Math.floor(span / 2.4),
            Math.max(2, Math.ceil(span / 3.6))
          );
          const subDur = span / parts;
          for (let s = 0; s < parts; s++) {
            const subStart = Number((range.startSec + s * subDur).toFixed(2));
            const subEnd =
              s === parts - 1
                ? Number(range.endSec.toFixed(2))
                : Number((range.startSec + (s + 1) * subDur).toFixed(2));
            visualSlots.push({
              source: src,
              subIndex: s,
              startSec: subStart,
              endSec: subEnd,
            });
          }
        } else {
          visualSlots.push({
            source: src,
            subIndex: 0,
            startSec: range.startSec,
            endSec: range.endSec,
          });
        }
      });

      let guard = 0;
      while (guard++ < 60 && visualSlots.length > 1) {
        const badIdx = visualSlots.findIndex((s) => {
          const d = Math.round((s.endSec - s.startSec) * 100) / 100;
          return d < 2.2 || d > 4.2;
        });
        if (badIdx === -1) break;

        const badDur =
          Math.round(
            (visualSlots[badIdx].endSec - visualSlots[badIdx].startSec) * 100
          ) / 100;
        if (badDur > 4.2) {
          const slot = visualSlots[badIdx];
          const parts = Math.min(
            Math.floor(badDur / 2.4),
            Math.max(2, Math.ceil(badDur / 3.6))
          );
          const partDur = badDur / parts;
          const replacements = Array.from({ length: parts }, (_, k) => ({
            source: slot.source,
            subIndex: slot.subIndex + k,
            startSec: Number((slot.startSec + k * partDur).toFixed(2)),
            endSec:
              k === parts - 1
                ? slot.endSec
                : Number((slot.startSec + (k + 1) * partDur).toFixed(2)),
          }));
          visualSlots.splice(badIdx, 1, ...replacements);
          continue;
        }

        const targetIdx =
          badIdx === 0
            ? 0
            : badIdx === visualSlots.length - 1
              ? badIdx - 1
              : visualSlots[badIdx - 1].endSec - visualSlots[badIdx - 1].startSec <=
                  visualSlots[badIdx + 1].endSec - visualSlots[badIdx + 1].startSec
                ? badIdx - 1
                : badIdx;

        const left = visualSlots[targetIdx];
        const right = visualSlots[targetIdx + 1];
        const combinedStart = left.startSec;
        const combinedEnd = right.endSec;
        const combinedDur = Math.round((combinedEnd - combinedStart) * 100) / 100;

        if (combinedDur <= 4.2) {
          visualSlots.splice(targetIdx, 2, {
            source: left.source,
            subIndex: left.subIndex,
            startSec: combinedStart,
            endSec: combinedEnd,
          });
        } else {
          const parts = Math.min(
            Math.floor(combinedDur / 2.4),
            Math.max(2, Math.ceil(combinedDur / 3.6))
          );
          const partDur = combinedDur / parts;
          const replacements = Array.from({ length: parts }, (_, k) => ({
            source: k === 0 ? left.source : right.source,
            subIndex: k === 0 ? left.subIndex : right.subIndex + k,
            startSec: Number((combinedStart + k * partDur).toFixed(2)),
            endSec:
              k === parts - 1
                ? combinedEnd
                : Number((combinedStart + (k + 1) * partDur).toFixed(2)),
          }));
          visualSlots.splice(targetIdx, 2, ...replacements);
        }
      }

      // Build deterministic timed 3-7 word subtitle_lines aligned to calibrated WAV wordTimings
      const timedSubtitleChunks: SubtitleChunkOutput[] = [];
      let wordCursor = 0;
      const pickTakeaway = (words: string[]): string => {
        const stop = new Set([
          "the", "a", "an", "is", "to", "of", "and", "in", "on", "it", "you", "your",
          "de", "het", "een", "en", "van", "op", "je", "dat", "die", "for", "with",
        ]);
        let best = words[0] || "";
        let bestScore = -1;
        for (const w of words) {
          const clean = w.toLowerCase().replace(/[^a-z0-9\u00c0-\u024f]/gi, "");
          const score = clean.length + (stop.has(clean) ? -6 : 0) + (/[!?]$/.test(w) ? 3 : 0);
          if (score > bestScore) {
            bestScore = score;
            best = w;
          }
        }
        return best;
      };

      for (let i = 0; i < rawScenes.length; i++) {
        const sc = rawScenes[i];
        const sceneWords = allWordTimings.filter((w) => w.sceneIndex === sc.sceneIndex);
        if (sceneWords.length === 0) continue;

        let localCursor = 0;
        while (localCursor < sceneWords.length) {
          const remaining = sceneWords.length - localCursor;
          // 3 to 7 words per subtitle line
          const size = remaining <= 7 ? remaining : remaining <= 10 ? Math.ceil(remaining / 2) : 5;
          const slice = sceneWords.slice(localCursor, localCursor + size);
          localCursor += size;
          const wordsArr = slice.map((w) => w.word);
          timedSubtitleChunks.push({
            text: wordsArr.join(" "),
            highlightWord: pickTakeaway(wordsArr),
            startSec: slice[0].startSec,
            endSec: slice[slice.length - 1].endSec,
            sceneIndex: sc.sceneIndex,
            words: slice.map((w) => ({
              word: w.word,
              startSec: w.startSec,
              endSec: w.endSec,
            })),
          });
        }
        wordCursor += sceneWords.length;
      }

      console.log(
        `[timing] faceless/generate total=${afterFfmpegMs - reqStartMs}ms script=${afterScriptMs - reqStartMs}ms tts=${afterTtsMs - afterScriptMs}ms ffmpeg=${afterFfmpegMs - afterTtsMs}ms words=${currentWordCount}/${targetWords} scenes=${visualSlots.length}`
      );

      const scenes: FacelessSceneOutput[] = visualSlots.map((slot, idx) => {
        const src = slot.source;
        const startSec = idx === 0 ? 0 : visualSlots[idx - 1].endSec;
        const endSec =
          idx === visualSlots.length - 1 ? totalAlignedDuration : slot.endSec;
        const tsLabel = `${formatGlobalTimestamp(startSec)} - ${formatGlobalTimestamp(endSec)}`;

        const slotLines = timedSubtitleChunks
          .filter((c) => c.startSec >= startSec - 0.05 && c.startSec < endSec)
          .map((c) => c.text);

        // Keep animation strictly grounded in what is spoken in this scene;
        // if a single spoken scene splits into 2 fast visual cuts, transition smoothly within its semantic domain.
        const specCopy: SceneAnimationSpec = { ...src.animSpec };
        if (slot.subIndex > 0) {
          const sem = inferSemanticVisuals(
            src.voiceover,
            src.visual_scene,
            src.section_label
          );
          const nextArch = sem.archetypes.find((a) => a !== specCopy.archetype);
          if (nextArch) {
            specCopy.archetype = nextArch;
          } else if (specCopy.contrastShift === "black") {
            specCopy.contrastShift = "accent_flash";
          }
          const nextProp = sem.props.find((p) => p !== specCopy.propTag);
          if (nextProp) specCopy.propTag = nextProp;
        } else if (idx > 0 && !specCopy.isSectionCard) {
          const prevSpec = visualSlots[idx - 1].source.animSpec;
          if (specCopy.archetype === prevSpec.archetype) {
            const sem = inferSemanticVisuals(
              src.voiceover,
              src.visual_scene,
              src.section_label
            );
            const alt = sem.archetypes.find((a) => a !== prevSpec.archetype);
            if (alt) specCopy.archetype = alt;
          }
        }

        return {
          id: `scene-${idx + 1}`,
          sceneIndex: idx + 1,
          timestamp_est: tsLabel,
          startSec,
          endSec,
          durationSec: Number((endSec - startSec).toFixed(2)),
          section_label: src.section_label,
          voiceover: src.voiceover,
          subtitle_lines: slotLines,
          visual_scene: src.visual_scene,
          sfx_or_music_cue: src.sfx_or_music_cue,
          animSpec: specCopy,
        };
      });

      const videoTitle = String(
        parsed.video_title ?? parsed.youtubeTitle ?? visualTheme
      ).trim();
      const thumbnailIdea = String(
        parsed.thumbnail_idea ??
          "High-contrast 2D character illustration on pure #000000 backdrop with sharp topic accent & 3-word hook"
      ).trim();
      const voiceoverStyle = String(
        parsed.voiceover_style ??
          "Clear, engaging, human conversational pacing matched to the video's subject over a crisp ~94 BPM lo-fi groove"
      ).trim();
      const subtitleStyle = String(
        parsed.subtitle_style ??
          "Poppins SemiBold bottom-center layout, strictly synced to voice-over audio with active spoken word in YELLOW (#FACC15) and remaining words in WHITE (#FFFFFF)"
      ).trim();

      const fullScriptClean = String(parsed.fullScript ?? narrationDisplay)
        .replace(/\*\*|__/g, "")
        .trim();

      const storyboard = {
        video_title: videoTitle,
        thumbnail_idea: thumbnailIdea,
        voiceover_style: voiceoverStyle,
        subtitle_style: subtitleStyle,
        scenes: scenes.map((sc) => ({
          timestamp_est: sc.timestamp_est,
          section_label: sc.section_label,
          voiceover: sc.voiceover,
          subtitle_lines: sc.subtitle_lines,
          visual_scene: sc.visual_scene,
          sfx_or_music_cue: sc.sfx_or_music_cue,
        })),
      };

      res.json({
        fullScript: fullScriptClean,
        voiceoverBase64Wav: base64Audio,
        durationSec: totalAlignedDuration,
        targetDurationSec,
        wordCount: wordCursor,
        scenes,
        wordTimings: allWordTimings,
        subtitleChunks: timedSubtitleChunks,
        storyboard,
        initialMetadata: {
          youtubeTitle: String(parsed.youtubeTitle ?? videoTitle).trim(),
          captionWithHashtags: String(parsed.captionWithHashtags ?? "").trim(),
          thumbnailHook: String(parsed.thumbnailHook ?? "").trim(),
        },
      });
    } catch (err) {
      const message = normalizeServerError(
        err,
        "Onbekende fout tijdens 2D animatie-generatie."
      );
      console.error("Faceless 2D generation failed:", message);
      res.status(500).json({ error: message });
    }
  });

  app.post("/api/faceless/metadata", async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(500).json({
        error: "GEMINI_API_KEY ontbreekt op de server.",
      });
      return;
    }

    const body = (req.body ?? {}) as FacelessMetadataBody;
    const rawDataUri = String(body.frameBase64Png ?? "").trim();
    const mimeMatch = rawDataUri.match(/^data:(image\/(?:png|jpeg|webp));base64,/);
    const frameMimeType = mimeMatch ? mimeMatch[1] : "image/png";
    const frameBase64Png = rawDataUri
      .replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, "")
      .trim();
    const script = String(body.script ?? "").trim();
    const visualTheme = String(body.visualTheme ?? "").trim();
    const aspectRatio = String(body.aspectRatio ?? "9:16").trim();
    const language = "English";

    if (!script) {
      res.status(400).json({ error: "Script is missing for metadata generation." });
      return;
    }

    try {
      const ai = createGenAIClient(apiKey);

      const promptText = [
        `Analyze the provided 2D vector animation frame and script to generate high-CTR YouTube metadata STRICTLY in ${language}.`,
        `Theme: ${visualTheme} · Aspect Ratio: ${aspectRatio}`,
        `Script:\n${script}`,
        `Provide:\n1. youtubeTitle: punchy English title (max 68 chars)\n2. captionWithHashtags: concise English description + 4-6 focused English hashtags (include #Shorts if 9:16)\n3. thumbnailHook: 2 to 5 bold English words tailored for high click-through rate.`,
      ].join("\n\n");

      const runMetadataGeneration = (includeImage: boolean) => {
        const parts: Array<
          { inlineData: { mimeType: string; data: string } } | { text: string }
        > = [];
        if (includeImage && frameBase64Png.length > 200) {
          parts.push({
            inlineData: {
              mimeType: frameMimeType,
              data: frameBase64Png,
            },
          });
        }
        parts.push({ text: promptText });

        return generateWithHydrogenOrLiteFallback(
          ai,
          includeImage ? "faceless-metadata" : "faceless-metadata-text",
          (model, isLite, abortSignal) => ({
            model,
            contents: { parts },
            config: {
              abortSignal,
              ...(isLite
                ? {}
                : { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }),
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  youtubeTitle: { type: Type.STRING },
                  captionWithHashtags: { type: Type.STRING },
                  thumbnailHook: { type: Type.STRING },
                },
                required: [
                  "youtubeTitle",
                  "captionWithHashtags",
                  "thumbnailHook",
                ],
              },
            },
          })
        );
      };

      const hasSubstantialImage = frameBase64Png.length > 200;
      let metaResp;
      if (hasSubstantialImage) {
        try {
          metaResp = await runMetadataGeneration(true);
        } catch (imgErr) {
          if (!isTransientUpstreamError(imgErr)) {
            throw imgErr;
          }
          metaResp = await runMetadataGeneration(false);
        }
      } else {
        metaResp = await runMetadataGeneration(false);
      }

      const raw = (metaResp.text ?? "").trim();
      if (!raw) {
        res.status(502).json({ error: "Geen metadata ontvangen van Gemini." });
        return;
      }

      const parsed = JSON.parse(raw) as {
        youtubeTitle?: string;
        captionWithHashtags?: string;
        thumbnailHook?: string;
      };

      res.json({
        youtubeTitle: String(parsed.youtubeTitle ?? "").trim(),
        captionWithHashtags: String(parsed.captionWithHashtags ?? "").trim(),
        thumbnailHook: String(parsed.thumbnailHook ?? "").trim(),
      });
    } catch (err) {
      const message = normalizeServerError(
        err,
        "Metadata genereren mislukt."
      );
      console.error("Faceless metadata failed:", message);
      res.status(500).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vitePromise = import("vite").then(({ createServer: createViteServer }) =>
      createViteServer({
        server: { middlewareMode: true, hmr: false },
        appType: "spa",
      })
    );
    app.use((req, res, next) => {
      vitePromise
        .then((vite) => vite.middlewares(req, res, next))
        .catch(next);
    });
  } else {
    const distDir = path.resolve(__dirname, "dist");
    app.use(express.static(distDir));
    app.get("/{*path}", (_req, res) => {
      res.sendFile(path.join(distDir, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Touchline Studio server running on http://0.0.0.0:${PORT}`);
  });
}

createApp();
