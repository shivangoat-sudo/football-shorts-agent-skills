export type ThemeId =
  | "gentleman_style"
  | "dating_attraction"
  | "mindset_discipline"
  | "social_communication"
  | "lifestyle_habits"
  | "psychology_stories";

export type MusicMoodProfile =
  | "smooth_lounge"
  | "velvet_groove"
  | "kinetic_focus"
  | "upbeat_clarity"
  | "morning_momentum"
  | "story_tension";

export type ShortHookType =
  | "Warning / Mistake"
  | "Curiosity Gap"
  | "Provocative Claim"
  | "Relatable Situation"
  | "Direct Call-Out"
  | "Flipped Insight";

export interface ThemeProfile {
  id: ThemeId;
  label: string;
  defaultSeriesTitle: string;
  accentHex: string;
  secondaryHex: string;
  musicProfile: MusicMoodProfile;
  musicDescription: string;
  tempoBpm: number;
  situations: string[];
  visualToneCue: string;
}

export const THEME_PROFILES: ThemeProfile[] = [
  {
    id: "gentleman_style",
    label: "Gentleman, Style & Quiet Confidence",
    defaultSeriesTitle: "The Composed Gentleman Code",
    accentHex: "#FACC15",
    secondaryHex: "#D4AF37",
    musicProfile: "smooth_lounge",
    musicDescription: "Warm lounge lo-fi Rhodes & subtle percussion (88 BPM)",
    tempoBpm: 88,
    situations: [
      "walking into a room with unhurried shoulders and steady eye contact",
      "clean grooming, tailored fit, understated watch, and polished shoes",
      "speaking calmly after a measured pause instead of rushing replies",
      "setting respectful standards at dinner and in social company",
    ],
    visualToneCue:
      "Crisp white vector line-art with warm gold gaze icons and calm dashed trajectory accents",
  },
  {
    id: "dating_attraction",
    label: "Dating Dynamics & Attraction",
    defaultSeriesTitle: "Attraction Without Games",
    accentHex: "#FACC15",
    secondaryHex: "#F59E0B",
    musicProfile: "velvet_groove",
    musicDescription: "Smooth R&B lo-fi groove with deep bassline (92 BPM)",
    tempoBpm: 92,
    situations: [
      "holding comfortable silence and relaxed eye contact on a first date",
      "texting with clear intent instead of seeking constant reassurance",
      "reading subtle feminine cues with grounded emotional control",
      "maintaining personal boundaries while building genuine chemistry",
    ],
    visualToneCue:
      "Composed man-woman duo choreography, warm gold eye-contact vectors, and calm contrast",
  },
  {
    id: "mindset_discipline",
    label: "Mindset, Discipline & Focus",
    defaultSeriesTitle: "Unshakeable Daily Focus",
    accentHex: "#FACC15",
    secondaryHex: "#22D3EE",
    musicProfile: "kinetic_focus",
    musicDescription: "Clean minimalist synth-pulse for deep concentration (96 BPM)",
    tempoBpm: 96,
    situations: [
      "silencing phone notifications during high-leverage deep work blocks",
      "staying composed and consistent after a setback rather than drifting",
      "keeping morning promises before checking messages",
      "making clear decisions under time and social pressure",
    ],
    visualToneCue:
      "Sharp directional focus lines, calm boundary shields, and steady upward step progression",
  },
  {
    id: "social_communication",
    label: "Social Skills & Communication",
    defaultSeriesTitle: "The Art of High-Trust Conversation",
    accentHex: "#FACC15",
    secondaryHex: "#34D399",
    musicProfile: "upbeat_clarity",
    musicDescription: "Balanced rhythmic groove with warm harmonic chords (94 BPM)",
    tempoBpm: 94,
    situations: [
      "listening with undivided presence and asking crisp follow-up questions",
      "standing apart calmly in a loud, over-animated group",
      "saying no warmly yet firmly without over-explaining",
      "using intentional pauses during high-stakes introductions",
    ],
    visualToneCue:
      "Warm gold dashed attention arcs highlighting active listening and calm vocal authority",
  },
  {
    id: "lifestyle_habits",
    label: "Lifestyle, Habits & Self-Mastery",
    defaultSeriesTitle: "One Percent Sharper Every Week",
    accentHex: "#FACC15",
    secondaryHex: "#A3E635",
    musicProfile: "morning_momentum",
    musicDescription: "Crisp lo-fi beat with steady forward chords (95 BPM)",
    tempoBpm: 95,
    situations: [
      "choosing long-term self-respect over short-term impulse scrolling",
      "protecting sleep, physical training, and an orderly environment",
      "compounding small daily habits that change how people perceive you",
      "allocating attention deliberately every morning",
    ],
    visualToneCue:
      "Clean doorway choices, balance scales, and compounding visual milestones in white & gold",
  },
  {
    id: "psychology_stories",
    label: "Psychology, Stories & Human Behavior",
    defaultSeriesTitle: "Hidden Signals of Human Behavior",
    accentHex: "#FACC15",
    secondaryHex: "#60A5FA",
    musicProfile: "story_tension",
    musicDescription: "Narrative ambient synth with understated tension (88 BPM)",
    tempoBpm: 88,
    situations: [
      "behavioral experiments showing why calm restraint signals high status",
      "micro-expressions and unspoken body language in everyday rooms",
      "breaking reactive validation loops in dating and career settings",
      "how subtle timing shifts change how people remember you",
    ],
    visualToneCue:
      "Gold observation eye icons, mirror reflection frames, and clean behavioral data panels",
  },
];

export const HOOK_TYPE_SEQUENCE: ShortHookType[] = [
  "Warning / Mistake",
  "Curiosity Gap",
  "Provocative Claim",
  "Relatable Situation",
  "Direct Call-Out",
  "Flipped Insight",
];

export const HOOK_TYPE_DESCRIPTIONS: Record<ShortHookType, string> = {
  "Warning / Mistake":
    "Name the exact subtle mistake of THIS Focus Point cleanly in plain English without exaggeration or copying examples—state why that specific reflex costs presence right away.",
  "Curiosity Gap":
    "Highlight one specific, overlooked micro-detail belonging strictly to THIS Focus Point so the viewer immediately wants to see the behavioral contrast.",
  "Provocative Claim":
    "State one crisp, grounded counter-intuitive observation strictly about THIS Focus Point that challenges autopilot behavior.",
  "Relatable Situation":
    "Drop the viewer straight into the exact everyday social scene of THIS Focus Point in one vivid sentence.",
  "Direct Call-Out":
    "Address the exact reflex of THIS Focus Point in second person using natural conversational phrasing—must match this specific point 100%.",
  "Flipped Insight":
    "Contrast what most people think signals strength on THIS exact Focus Point against what actually earns quiet respect.",
};

export interface WeeklySlotTemplate {
  dayIndex: number; // 1 = Mon .. 6 = Sat, 0 = Sun
  dayLabel: string;
  shortCode: string;
  time24h: string;
  windowLabel: string;
  format: "9:16" | "16:9";
  kind: "short" | "main";
  hookType?: ShortHookType;
  targetDurationSec: number;
  mappedPointNumber?: number;
}

export const WEEKLY_RELEASE_TEMPLATE: WeeklySlotTemplate[] = [
  {
    dayIndex: 1,
    dayLabel: "Monday",
    shortCode: "Mon",
    time24h: "18:15",
    windowLabel: "Evening Commute Window (18:15)",
    format: "9:16",
    kind: "short",
    hookType: "Warning / Mistake",
    targetDurationSec: 26,
    mappedPointNumber: 1,
  },
  {
    dayIndex: 2,
    dayLabel: "Tuesday",
    shortCode: "Tue",
    time24h: "12:30",
    windowLabel: "Midday Scroll Peak (12:30)",
    format: "9:16",
    kind: "short",
    hookType: "Curiosity Gap",
    targetDurationSec: 28,
    mappedPointNumber: 2,
  },
  {
    dayIndex: 3,
    dayLabel: "Wednesday",
    shortCode: "Wed",
    time24h: "19:30",
    windowLabel: "Prime Evening Feed (19:30)",
    format: "9:16",
    kind: "short",
    hookType: "Provocative Claim",
    targetDurationSec: 25,
    mappedPointNumber: 3,
  },
  {
    dayIndex: 4,
    dayLabel: "Thursday",
    shortCode: "Thu",
    time24h: "17:45",
    windowLabel: "After-Work Transition (17:45)",
    format: "9:16",
    kind: "short",
    hookType: "Relatable Situation",
    targetDurationSec: 30,
    mappedPointNumber: 4,
  },
  {
    dayIndex: 5,
    dayLabel: "Friday",
    shortCode: "Fri",
    time24h: "16:30",
    windowLabel: "Weekend Lead-In (16:30)",
    format: "9:16",
    kind: "short",
    hookType: "Direct Call-Out",
    targetDurationSec: 24,
    mappedPointNumber: 5,
  },
  {
    dayIndex: 6,
    dayLabel: "Saturday",
    shortCode: "Sat",
    time24h: "11:15",
    windowLabel: "Saturday Morning Reset (11:15)",
    format: "9:16",
    kind: "short",
    hookType: "Flipped Insight",
    targetDurationSec: 32,
    mappedPointNumber: 6,
  },
  {
    dayIndex: 0,
    dayLabel: "Sunday",
    shortCode: "Sun",
    time24h: "10:30",
    windowLabel: "Sunday Flagship Episode (10:30)",
    format: "16:9",
    kind: "main",
    targetDurationSec: 300,
  },
];

export const AUTO_EXPLORE_THEME_LABEL =
  "All Themes (Auto-Test & Analyze Views + Subscribers)";

export interface SeriesFocusPoint {
  pointNumber: number;
  title: string;
  coreInsight: string;
  keyFact: string;
  mappedDayLabel: string;
  mappedShortId: string;
}

export interface SeriesEpisodeMemory {
  id: string;
  seasonNumber: number;
  episodeNumber: number;
  seriesTitle: string;
  episodeTitle: string;
  themeId: ThemeId;
  keyTakeaways: string[];
  endingBridge: string;
  createdAtIso: string;
}

export interface PostedPerformanceMetric {
  id: string;
  title: string;
  themeLabel?: string;
  format: "Short" | "Video";
  hookType?: string;
  views: number;
  subscribersGained: number;
  avgRetentionPct: number;
  ctrOrSwipePct: number;
  likes: number;
  notes?: string;
  recordedAtIso: string;
}

export interface PerformanceOptimizationDirectives {
  updatedAtIso: string;
  sampleSize: number;
  winningThemes: string[];
  underperformingThemes: string[];
  recommendedNextThemeId: ThemeId;
  winningHookTypes: string[];
  avoidHookTypes: string[];
  recommendedShortDurationSec: number;
  pacingDirective: string;
  topTopicAngles: string[];
  visualClarityNotes: string;
  loopSummary: string;
}

export interface PlannedWeekItem {
  id: string;
  dayIndex: number;
  dayLabel: string;
  shortCode: string;
  kind: "short" | "main";
  format: "9:16" | "16:9";
  targetDurationSec: number;
  recommendedTime24h: string;
  windowLabel: string;
  scheduledPublishAtIso: string;
  scheduledLocalInput: string;
  pointNumber?: number;
  focusPointTitle?: string;
  title: string;
  hookType: string;
  openingHookLine: string;
  teaseNote: string;
  fullScript: string;
  youtubeTitle: string;
  captionWithHashtags: string;
  thumbnailHook: string;
  approvedForPublish: boolean;
  renderedAndReady?: boolean;
}

export interface SeriesWeekPlan {
  seriesTitle: string;
  seasonNumber: number;
  episodeNumber: number;
  themeId: ThemeId;
  themeLabel: string;
  experimentModeNote?: string;
  episodeTitle: string;
  seriesArcNote: string;
  episodeEndingBridge: string;
  introVerification: {
    estimatedIntroSec: number;
    pointCount: number;
    keyFactsAndInsights: string[];
  };
  focusPoints: SeriesFocusPoint[];
  sundayMainVideo: PlannedWeekItem;
  weeklyShorts: PlannedWeekItem[];
  appliedOptimizationSummary?: string;
}

export function isAutoExploreThemeInput(input?: string | null): boolean {
  const raw = (input || "").trim().toLowerCase();
  if (!raw) return false;
  return (
    raw === "auto_explore" ||
    raw.startsWith("all themes") ||
    raw.includes("auto-test") ||
    raw.includes("alle opties")
  );
}

export function resolveThemeForExperiment(
  input?: string | null,
  previousEpisodes: SeriesEpisodeMemory[] = [],
  directives?: PerformanceOptimizationDirectives | null
): { profile: ThemeProfile; isAutoExplore: boolean; experimentNote?: string } {
  if (!isAutoExploreThemeInput(input)) {
    return {
      profile: resolveThemeProfile(input),
      isAutoExplore: false,
    };
  }

  const testedThemeIds = new Set(previousEpisodes.map((e) => e.themeId));
  const untested = THEME_PROFILES.find((t) => !testedThemeIds.has(t.id));

  if (directives && directives.sampleSize >= 3 && untested && testedThemeIds.size < THEME_PROFILES.length) {
    return {
      profile: untested,
      isAutoExplore: true,
      experimentNote: `Theme Explorer (${testedThemeIds.size + 1}/${THEME_PROFILES.length}): Testing "${untested.label}" next while tracking views & subscribers against prior themes.`,
    };
  }

  if (directives && directives.sampleSize >= 3 && directives.recommendedNextThemeId) {
    const winner = resolveThemeProfile(directives.recommendedNextThemeId);
    return {
      profile: winner,
      isAutoExplore: true,
      experimentNote: `Data-Selected Winner: "${winner.label}" led in views & subscriber conversions (${directives.sampleSize} items analyzed).`,
    };
  }

  if (untested) {
    return {
      profile: untested,
      isAutoExplore: true,
      experimentNote: `Theme Explorer (${testedThemeIds.size + 1}/${THEME_PROFILES.length}): Testing "${untested.label}" across Mon–Sat Shorts + Sunday 6-Point Main Video to benchmark views & subscribers.`,
    };
  }

  const fallbackNext =
    THEME_PROFILES[previousEpisodes.length % THEME_PROFILES.length];
  return {
    profile: fallbackNext,
    isAutoExplore: true,
    experimentNote: `Theme Explorer Cycle: Rotating "${fallbackNext.label}" for fresh view & subscriber comparison.`,
  };
}

export function resolveThemeProfile(input?: string | null): ThemeProfile {
  const raw = (input || "").trim().toLowerCase();
  if (!raw) return THEME_PROFILES[0];

  const byId = THEME_PROFILES.find((t) => t.id === raw);
  if (byId) return byId;

  const byExact = THEME_PROFILES.find((t) => t.label.toLowerCase() === raw);
  if (byExact) return byExact;

  if (
    raw.includes("gentleman") ||
    raw.includes("style") ||
    raw.includes("stijl") ||
    raw.includes("confidence") ||
    raw.includes("zelfbeheersing")
  ) {
    return THEME_PROFILES[0];
  }
  if (raw.includes("dating") || raw.includes("attract") || raw.includes("aantrek")) {
    return THEME_PROFILES[1];
  }
  if (raw.includes("mindset") || raw.includes("discipline") || raw.includes("focus")) {
    return THEME_PROFILES[2];
  }
  if (
    raw.includes("social") ||
    raw.includes("communicat") ||
    raw.includes("communicatie") ||
    raw.includes("onderhandel")
  ) {
    return THEME_PROFILES[3];
  }
  if (
    raw.includes("lifestyle") ||
    raw.includes("habit") ||
    raw.includes("gewoont") ||
    raw.includes("mastery") ||
    raw.includes("zelfverbetering")
  ) {
    return THEME_PROFILES[4];
  }
  if (
    raw.includes("psycholog") ||
    raw.includes("stor") ||
    raw.includes("verhal") ||
    raw.includes("behavior") ||
    raw.includes("gedrag")
  ) {
    return THEME_PROFILES[5];
  }
  return THEME_PROFILES[0];
}

function toLocalDatetimeInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Computes strictly future release timestamps for Monday–Saturday Shorts
 * followed sequentially by Sunday's 5-minute Main Episode.
 */
export function computeUpcomingWeekSchedule(
  mainDurationSec = 300,
  now: Date = new Date()
): Array<{
  template: WeeklySlotTemplate;
  scheduledPublishAtIso: string;
  scheduledLocalInput: string;
  dateDisplayEn: string;
}> {
  const base = new Date(now);
  base.setSeconds(0, 0);
  const currentDay = base.getDay(); // 0=Sun..6=Sat

  let daysUntilMonday = (1 - currentDay + 7) % 7;
  if (daysUntilMonday === 0 && base.getHours() >= 17) {
    daysUntilMonday = 7;
  }

  const monday = new Date(base);
  monday.setDate(base.getDate() + daysUntilMonday);

  return WEEKLY_RELEASE_TEMPLATE.map((tpl, idx) => {
    const slotDate = new Date(monday);
    slotDate.setDate(monday.getDate() + idx);
    const [hh, mm] = tpl.time24h.split(":").map((n) => Number(n));
    slotDate.setHours(hh, mm, 0, 0);

    if (slotDate.getTime() <= now.getTime() + 15 * 60_000) {
      slotDate.setDate(slotDate.getDate() + 7);
    }

    const effectiveDuration =
      tpl.kind === "main"
        ? Math.max(120, Math.min(480, Math.round(mainDurationSec)))
        : tpl.targetDurationSec;

    return {
      template: { ...tpl, targetDurationSec: effectiveDuration },
      scheduledPublishAtIso: slotDate.toISOString(),
      scheduledLocalInput: toLocalDatetimeInputValue(slotDate),
      dateDisplayEn: slotDate.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
    };
  });
}
