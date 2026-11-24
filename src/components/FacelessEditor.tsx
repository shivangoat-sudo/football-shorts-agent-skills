import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  AlertCircle,
  BarChart3,
  CalendarClock,
  Check,
  Code2,
  Copy,
  Download,
  Film,
  Layers,
  Music,
  Pause,
  Play,
  RefreshCw,
  Scissors,
  Sparkles,
  Square,
  Trash2,
  TrendingUp,
  Volume2,
  X,
  Youtube,
} from "lucide-react";
import {
  buildLofiSynthSoundtrackUrl,
  drawFacelessFrame,
  exportFacelessVideo,
  VECTOR_ARCHETYPE_LABELS,
  type AnimationStoryboardJson,
  type ContrastShiftMode,
  type FacelessMetadata,
  type FacelessScene,
  type SubtitleAccentTheme,
  type SubtitleMode,
  type TimedSubtitleChunk,
  type VectorArchetype,
  type WordTiming,
} from "../lib/facelessRenderer";
import type { ExportedShortResult } from "../lib/shortExporter";
import {
  AUTO_EXPLORE_THEME_LABEL,
  HOOK_TYPE_SEQUENCE,
  isAutoExploreThemeInput,
  resolveThemeProfile,
  THEME_PROFILES,
  type PerformanceOptimizationDirectives,
  type PlannedWeekItem,
  type PostedPerformanceMetric,
  type SeriesEpisodeMemory,
  type SeriesWeekPlan,
} from "../lib/themeProfiles";
import type { YouTubeStudioSnapshot } from "../lib/youtubeApi";

function formatClientError(err: unknown, fallback: string): string {
  const raw = err instanceof Error ? err.message : String(err ?? "");
  const trimmed = raw.trim();
  if (!trimmed) return fallback;

  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as {
        error?: { message?: string; code?: number };
        message?: string;
      };
      const inner = parsed.error?.message || parsed.message;
      if (inner) return inner;
    } catch {
      // ignore parse failure
    }
  }

  const lower = trimmed.toLowerCase();
  if (
    lower === "failed to fetch" ||
    lower === "fetch failed" ||
    lower === "load failed" ||
    lower.includes("networkerror")
  ) {
    return "Connection to the server was interrupted. Check your network and try again.";
  }

  return trimmed;
}

interface FacelessEditorProps {
  studioSnapshot: YouTubeStudioSnapshot | null;
  isYouTubeConnected: boolean;
  onRequestYouTubeLogin: () => Promise<void>;
  viralLaunchTrigger?: number;
  isActive?: boolean;
  onApproveAndPublish: (result: ExportedShortResult) => void;
  onNotice: (message: string) => void;
}

interface ViralPlanReport {
  chosenTopic: string;
  hookFormula: string;
  openingHookLine: string;
  whyItWillGoViral: string;
  statsComparison: {
    hasChannelData: boolean;
    benchmarkSummary: string;
    topReferenceVideo: string;
    winningPatternsUsed: string[];
    avoidedWeaknesses: string[];
  };
  predictedViralScore: {
    total: number;
    hook: number;
    retentionPacing: number;
    shareabilityEmotion: number;
    standalone: number;
  };
  appliedEditingRules: string[];
  recommendedTheme: string;
  fullScript: string;
}

const DURATION_OPTIONS = [
  { value: 15, label: "15 sec" },
  { value: 25, label: "25 sec" },
  { value: 30, label: "30 sec (Short)" },
  { value: 45, label: "45 sec" },
  { value: 60, label: "60 sec" },
  { value: 120, label: "2 min" },
  { value: 180, label: "3 min" },
  { value: 300, label: "5 min (Sunday Main)" },
  { value: 480, label: "8 min" },
];

const VOICE_OPTIONS = [
  { id: "Charon", label: "Charon (Calm, Deep & Authoritative)" },
  { id: "Fenrir", label: "Fenrir (Grounded & Command Presence)" },
  { id: "Zephyr", label: "Zephyr (Modern & Measured)" },
  { id: "Kore", label: "Kore (Crisp & Warm)" },
  { id: "Puck", label: "Puck (Conversational & Agile)" },
];

const THEME_OPTIONS = [
  AUTO_EXPLORE_THEME_LABEL,
  ...THEME_PROFILES.map((t) => t.label),
];
const SERIES_STORAGE_KEY = "touchline_series_episodes_v2";
const PERF_METRICS_STORAGE_KEY = "touchline_posted_metrics_v1";
const PERF_DIRECTIVES_STORAGE_KEY = "touchline_perf_directives_v1";

function loadSavedEpisodes(): SeriesEpisodeMemory[] {
  try {
    const raw = localStorage.getItem(SERIES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SeriesEpisodeMemory[]) : [];
  } catch {
    return [];
  }
}

function loadPostedMetrics(): PostedPerformanceMetric[] {
  try {
    const raw = localStorage.getItem(PERF_METRICS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PostedPerformanceMetric[]) : [];
  } catch {
    return [];
  }
}

function loadPerfDirectives(): PerformanceOptimizationDirectives | null {
  try {
    const raw = localStorage.getItem(PERF_DIRECTIVES_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PerformanceOptimizationDirectives;
  } catch {
    return null;
  }
}

const ARCHETYPE_ENTRIES = Object.entries(VECTOR_ARCHETYPE_LABELS) as Array<
  [VectorArchetype, string]
>;

function base64WavToObjectUrl(base64: string): string {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: "audio/wav" });
  return URL.createObjectURL(blob);
}

export default function FacelessEditor({
  studioSnapshot,
  isYouTubeConnected,
  onRequestYouTubeLogin,
  viralLaunchTrigger = 0,
  isActive = true,
  onApproveAndPublish,
  onNotice,
}: FacelessEditorProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const musicInputRef = useRef<HTMLInputElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const voiceAudioRef = useRef<HTMLAudioElement | null>(null);
  const ambientAudioRef = useRef<HTMLAudioElement | null>(null);
  const exportAbortRef = useRef<AbortController | null>(null);
  const batchAbortRef = useRef(false);

  // 1. Input, Series & Theme State (Strictly English generation)
  const [creationMode, setCreationMode] = useState<
    "series-week" | "viral-auto" | "custom"
  >("series-week");
  const [topicOrScript, setTopicOrScript] = useState("");
  const [optionalFocus, setOptionalFocus] = useState("");
  const [targetDurationSec, setTargetDurationSec] = useState(30);
  const [aspectRatio, setAspectRatio] = useState<"9:16" | "16:9">("9:16");
  const [subtitleMode, setSubtitleMode] =
    useState<SubtitleMode>("word-highlight");
  const [subtitleAccent, setSubtitleAccent] =
    useState<SubtitleAccentTheme>("gold");
  const [voiceName, setVoiceName] = useState("Charon");
  const [visualTheme, setVisualTheme] = useState(AUTO_EXPLORE_THEME_LABEL);
  const [language] = useState("English");
  const [musicFile, setMusicFile] = useState<File | null>(null);
  const [musicUrl, setMusicUrl] = useState<string | null>(null);
  const [autoAmbientEnabled, setAutoAmbientEnabled] = useState(true);
  const [autoAmbientUrl, setAutoAmbientUrl] = useState<string | null>(null);

  // Make Series State (5-Min Sunday Main Video + 6 Mon-Sat 20-35s Shorts mapped 1-to-1)
  const [savedEpisodes, setSavedEpisodes] = useState<SeriesEpisodeMemory[]>(() =>
    loadSavedEpisodes()
  );
  const [seriesTitle, setSeriesTitle] = useState(
    THEME_PROFILES[0].defaultSeriesTitle
  );
  const [seasonNumber] = useState(1);
  const [episodeNumber, setEpisodeNumber] = useState(() =>
    Math.max(1, loadSavedEpisodes().length + 1)
  );
  const [mainEpisodeDurationSec, setMainEpisodeDurationSec] = useState(300);
  const [generatingWeek, setGeneratingWeek] = useState(false);
  const [seriesWeekPlan, setSeriesWeekPlan] = useState<SeriesWeekPlan | null>(
    null
  );
  const [activeWeekItemId, setActiveWeekItemId] = useState<string | null>(null);
  const [scheduledPublishAtIso, setScheduledPublishAtIso] = useState<string>("");
  const [activeSeriesLabel, setActiveSeriesLabel] = useState<string>("");
  const [batchQueueStatus, setBatchQueueStatus] = useState<{
    running: boolean;
    completed: number;
    total: number;
    currentLabel: string;
  }>({ running: false, completed: 0, total: 0, currentLabel: "" });

  // Performance Feedback Loop State
  const [postedMetrics, setPostedMetrics] = useState<PostedPerformanceMetric[]>(
    () => loadPostedMetrics()
  );
  const [perfDirectives, setPerfDirectives] =
    useState<PerformanceOptimizationDirectives | null>(() => loadPerfDirectives());
  const [analyzingLoop, setAnalyzingLoop] = useState(false);
  const [metricFormOpen, setMetricFormOpen] = useState(false);
  const [metricTitle, setMetricTitle] = useState("");
  const [metricTheme, setMetricTheme] = useState<string>(THEME_PROFILES[0].label);
  const [metricFormat, setMetricFormat] = useState<"Short" | "Video">("Short");
  const [metricHookType, setMetricHookType] = useState<string>(
    HOOK_TYPE_SEQUENCE[0]
  );
  const [metricViews, setMetricViews] = useState("1200");
  const [metricSubscribers, setMetricSubscribers] = useState("18");
  const [metricRetention, setMetricRetention] = useState("74");
  const [metricCtr, setMetricCtr] = useState("68");
  const [metricLikes, setMetricLikes] = useState("92");

  // 2. Viral Strategy + Generated Scenes + Voice-over + 2D Storyboard JSON
  const [analyzingViral, setAnalyzingViral] = useState(false);
  const [viralPlan, setViralPlan] = useState<ViralPlanReport | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [fullScript, setFullScript] = useState("");
  const [scenes, setScenes] = useState<FacelessScene[]>([]);
  const [wordTimings, setWordTimings] = useState<WordTiming[]>([]);
  const [subtitleChunks, setSubtitleChunks] = useState<TimedSubtitleChunk[]>([]);
  const [storyboardJson, setStoryboardJson] =
    useState<AnimationStoryboardJson | null>(null);
  const [showStoryboardJson, setShowStoryboardJson] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [voiceoverUrl, setVoiceoverUrl] = useState<string | null>(null);
  const [totalDurationSec, setTotalDurationSec] = useState(0);

  // 3. Preview + Export + Metadata Approval State
  const [isPlaying, setIsPlaying] = useState(false);
  const [previewTimeSec, setPreviewTimeSec] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportedVideo, setExportedVideo] =
    useState<ExportedShortResult | null>(null);
  const [capturedFrameUrl, setCapturedFrameUrl] = useState<string>("");
  const [generatingMetadata, setGeneratingMetadata] = useState(false);
  const [metadata, setMetadata] = useState<FacelessMetadata>({
    youtubeTitle: "",
    captionWithHashtags: "",
    thumbnailHook: "",
  });

  useEffect(() => {
    try {
      localStorage.setItem(SERIES_STORAGE_KEY, JSON.stringify(savedEpisodes));
    } catch {
      // ignore storage quota errors
    }
  }, [savedEpisodes]);

  useEffect(() => {
    try {
      localStorage.setItem(
        PERF_METRICS_STORAGE_KEY,
        JSON.stringify(postedMetrics)
      );
    } catch {
      // ignore storage quota errors
    }
  }, [postedMetrics]);

  useEffect(() => {
    try {
      if (perfDirectives) {
        localStorage.setItem(
          PERF_DIRECTIVES_STORAGE_KEY,
          JSON.stringify(perfDirectives)
        );
      }
    } catch {
      // ignore storage quota errors
    }
  }, [perfDirectives]);

  useEffect(() => {
    if (viralLaunchTrigger > 0) {
      setCreationMode("viral-auto");
      rootRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [viralLaunchTrigger]);

  useEffect(() => {
    return () => {
      if (musicUrl) URL.revokeObjectURL(musicUrl);
    };
  }, [musicUrl]);

  useEffect(() => {
    return () => {
      if (voiceoverUrl) URL.revokeObjectURL(voiceoverUrl);
    };
  }, [voiceoverUrl]);

  useEffect(() => {
    return () => {
      if (autoAmbientUrl) URL.revokeObjectURL(autoAmbientUrl);
    };
  }, [autoAmbientUrl]);

  useEffect(() => {
    return () => {
      exportAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!isActive) {
      if (voiceAudioRef.current && !voiceAudioRef.current.paused) {
        voiceAudioRef.current.pause();
      }
      if (ambientAudioRef.current && !ambientAudioRef.current.paused) {
        ambientAudioRef.current.pause();
      }
      setIsPlaying(false);
    }
  }, [isActive]);

  const paintPreviewAt = useCallback(
    (tSec: number) => {
      const canvas = previewCanvasRef.current;
      if (!canvas || scenes.length === 0) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      drawFacelessFrame({
        ctx,
        outWidth: canvas.width,
        outHeight: canvas.height,
        currentTimeSec: tSec,
        totalDurationSec: Math.max(1, totalDurationSec),
        scenes,
        wordTimings,
        subtitleChunks,
        aspectRatio,
        subtitleMode,
        subtitleAccent,
      });
    },
    [
      aspectRatio,
      scenes,
      subtitleAccent,
      subtitleChunks,
      subtitleMode,
      totalDurationSec,
      wordTimings,
    ]
  );

  useEffect(() => {
    if (!isPlaying) {
      paintPreviewAt(previewTimeSec);
    }
  }, [isPlaying, paintPreviewAt, previewTimeSec]);

  useEffect(() => {
    if (!isPlaying) return;
    let raf = 0;
    let lastUiSyncSec = -1;
    let lastActiveSceneIdx = -1;

    const loop = () => {
      const audio = voiceAudioRef.current;
      if (audio && !audio.paused) {
        const t = audio.currentTime;
        const currScene = scenes.find((s) => t >= s.startSec && t < s.endSec);
        const currSceneIdx = currScene?.sceneIndex ?? -1;

        if (
          currSceneIdx !== lastActiveSceneIdx ||
          Math.abs(t - lastUiSyncSec) >= 0.14
        ) {
          lastUiSyncSec = t;
          lastActiveSceneIdx = currSceneIdx;
          setPreviewTimeSec(t);
        }

        paintPreviewAt(t);
        raf = requestAnimationFrame(loop);
      }
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, paintPreviewAt, scenes]);

  async function runSceneAndVoiceGeneration(params: {
    scriptInput: string;
    themeToUse: string;
    durationOverrideSec?: number;
    aspectOverride?: "9:16" | "16:9";
    presetMetadata?: FacelessMetadata;
    seriesContext?: {
      seriesTitle?: string;
      seasonNumber?: number;
      episodeNumber?: number;
      hookType?: string;
    };
    viralContext?: {
      hookFormula?: string;
      openingHookLine?: string;
      winningPatternsUsed?: string[];
    };
  }): Promise<boolean> {
    const effectiveDur = params.durationOverrideSec ?? targetDurationSec;
    const effectiveRatio = params.aspectOverride ?? aspectRatio;
    const themeProfile = resolveThemeProfile(params.themeToUse);

    setGenerating(true);
    setGenError(null);
    setExportedVideo(null);
    setCapturedFrameUrl("");
    setIsPlaying(false);
    onNotice(
      "Generating synchronized 2D line-art scenes, English voice-over, and captions..."
    );

    try {
      const res = await fetch("/api/faceless/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicOrScript: params.scriptInput,
          targetDurationSec: effectiveDur,
          aspectRatio: effectiveRatio,
          voiceName,
          visualTheme: params.themeToUse,
          language,
          subtitleAccent,
          viralStrategyContext: params.viralContext,
          seriesContext: params.seriesContext,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        fullScript?: string;
        voiceoverBase64Wav?: string;
        durationSec?: number;
        scenes?: FacelessScene[];
        wordTimings?: WordTiming[];
        subtitleChunks?: TimedSubtitleChunk[];
        storyboard?: AnimationStoryboardJson;
        initialMetadata?: FacelessMetadata;
      };

      if (!res.ok) {
        throw new Error(data.error || `Server error (${res.status}).`);
      }

      if (voiceoverUrl) URL.revokeObjectURL(voiceoverUrl);
      const nextVoiceUrl = data.voiceoverBase64Wav
        ? base64WavToObjectUrl(data.voiceoverBase64Wav)
        : null;

      const generatedScenes = data.scenes || [];
      const exactDur = data.durationSec || effectiveDur;

      if (autoAmbientUrl) URL.revokeObjectURL(autoAmbientUrl);
      const nextAmbientUrl =
        generatedScenes.length > 0
          ? buildLofiSynthSoundtrackUrl({
              durationSec: exactDur,
              scenes: generatedScenes,
              musicProfile: themeProfile.musicProfile,
              visualTheme: themeProfile.label,
            })
          : null;

      setFullScript(data.fullScript || "");
      setScenes(generatedScenes);
      setWordTimings(data.wordTimings || []);
      setSubtitleChunks(data.subtitleChunks || []);
      setStoryboardJson(data.storyboard || null);
      setVoiceoverUrl(nextVoiceUrl);
      setAutoAmbientUrl(nextAmbientUrl);
      setTotalDurationSec(exactDur);
      setPreviewTimeSec(0);

      if (params.presetMetadata) {
        setMetadata(params.presetMetadata);
      } else if (data.initialMetadata) {
        setMetadata(data.initialMetadata);
      }

      onNotice(
        `${generatedScenes.length} calm 2D scenes, English voice-over (${exactDur.toFixed(1)}s), and JSON storyboard ready.`
      );
      return true;
    } catch (err) {
      const msg = formatClientError(
        err,
        "2D animation generation failed."
      );
      setGenError(msg);
      onNotice(msg);
      return false;
    } finally {
      setGenerating(false);
    }
  }

  async function handleRunPerformanceLoop() {
    setAnalyzingLoop(true);
    setGenError(null);
    onNotice("Running Performance Feedback Loop across recent videos and logged metrics...");

    try {
      const res = await fetch("/api/faceless/performance-loop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelTitle: studioSnapshot?.channel.title,
          visualTheme,
          seriesTitle,
          recentVideosStats: studioSnapshot?.recentVideos || [],
          postedMetrics,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as PerformanceOptimizationDirectives & {
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error || `Server error (${res.status}).`);
      }

      setPerfDirectives(data);
      onNotice(
        `Performance Loop updated (${data.sampleSize} items analyzed). Top hook styles: ${data.winningHookTypes.join(", ")}.`
      );
    } catch (err) {
      const msg = formatClientError(err, "Performance Feedback Loop failed.");
      setGenError(msg);
      onNotice(msg);
    } finally {
      setAnalyzingLoop(false);
    }
  }

  function handleLogPostedMetric() {
    if (!metricTitle.trim()) {
      onNotice("Enter a Short or Video title before logging performance metrics.");
      return;
    }
    const nextMetric: PostedPerformanceMetric = {
      id: `metric-${Date.now()}`,
      title: metricTitle.trim(),
      themeLabel: metricTheme,
      format: metricFormat,
      hookType: metricHookType,
      views: Math.max(0, Math.round(Number(metricViews) || 0)),
      subscribersGained: Math.max(0, Math.round(Number(metricSubscribers) || 0)),
      avgRetentionPct: Math.min(100, Math.max(0, Number(metricRetention) || 0)),
      ctrOrSwipePct: Math.min(100, Math.max(0, Number(metricCtr) || 0)),
      likes: Math.max(0, Math.round(Number(metricLikes) || 0)),
      recordedAtIso: new Date().toISOString(),
    };
    setPostedMetrics((prev) => [nextMetric, ...prev].slice(0, 25));
    setMetricTitle("");
    setMetricFormOpen(false);
    onNotice(`Logged '${nextMetric.title}' (${nextMetric.views} views, +${nextMetric.subscribersGained} subs) for the Performance Loop.`);
  }

  async function handleMakeSeries() {
    setGeneratingWeek(true);
    setGenError(null);
    onNotice(
      isAutoExploreThemeInput(visualTheme)
        ? "Make Series: rotating across all 6 themes & building 6 Mon–Sat Shorts + Sunday 6-Point Main Video..."
        : `Make Series: building 6 Mon–Sat Shorts + Sunday 6-Point Main Video for '${visualTheme}'...`
    );

    try {
      const res = await fetch("/api/faceless/series-week", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seriesTitle,
          visualTheme,
          episodeTopicFocus: optionalFocus,
          mainDurationSec: mainEpisodeDurationSec,
          language,
          previousEpisodes: savedEpisodes,
          channelTitle: studioSnapshot?.channel.title,
          recentVideosStats: studioSnapshot?.recentVideos || [],
          optimizationDirectives: perfDirectives,
        }),
      });

      const plan = (await res.json().catch(() => ({}))) as SeriesWeekPlan & {
        error?: string;
      };
      if (!res.ok) {
        throw new Error(plan.error || `Server error (${res.status}).`);
      }

      setSeriesWeekPlan(plan);
      setActiveWeekItemId(null);
      onNotice(
        `Weekly Series Ready (${plan.themeLabel}): 6 Focus Points mapped 1-to-1 to Mon–Sat Shorts + ${Math.round(plan.sundayMainVideo.targetDurationSec / 60)}-min Sunday Combined Video.`
      );
    } catch (err) {
      const msg = formatClientError(
        err,
        "Make Series package generation failed."
      );
      setGenError(msg);
      onNotice(msg);
    } finally {
      setGeneratingWeek(false);
    }
  }

  function handleSaveEpisodeToSeasonMemory() {
    if (!seriesWeekPlan) return;
    const record: SeriesEpisodeMemory = {
      id: `week-${Date.now()}`,
      seasonNumber: 1,
      episodeNumber: savedEpisodes.length + 1,
      seriesTitle: seriesWeekPlan.seriesTitle,
      episodeTitle: seriesWeekPlan.episodeTitle,
      themeId: seriesWeekPlan.themeId,
      keyTakeaways: seriesWeekPlan.introVerification.keyFactsAndInsights.slice(0, 6),
      endingBridge: seriesWeekPlan.episodeEndingBridge,
      createdAtIso: new Date().toISOString(),
    };
    setSavedEpisodes((prev) => [...prev.slice(-11), record]);
    setEpisodeNumber((n) => n + 1);
    onNotice(
      `Saved "${seriesWeekPlan.episodeTitle}" (${seriesWeekPlan.themeLabel}) to topic & theme test history.`
    );
  }

  function updateWeekItem(
    itemId: string,
    patch: Partial<PlannedWeekItem>
  ) {
    setSeriesWeekPlan((prev) => {
      if (!prev) return prev;
      if (prev.sundayMainVideo.id === itemId) {
        return {
          ...prev,
          sundayMainVideo: { ...prev.sundayMainVideo, ...patch },
        };
      }
      return {
        ...prev,
        weeklyShorts: prev.weeklyShorts.map((item) =>
          item.id === itemId ? { ...item, ...patch } : item
        ),
      };
    });
  }

  async function handleBuildWeekItemVideo(item: PlannedWeekItem): Promise<boolean> {
    setActiveWeekItemId(item.id);
    setTargetDurationSec(item.targetDurationSec);
    setAspectRatio(item.format);
    setTopicOrScript(item.fullScript);
    setScheduledPublishAtIso(item.scheduledPublishAtIso);
    const activeThemeLabel = seriesWeekPlan?.themeLabel || visualTheme;
    setActiveSeriesLabel(
      `${seriesWeekPlan?.seriesTitle || seriesTitle} · ${item.dayLabel} ${item.recommendedTime24h}`
    );

    const ok = await runSceneAndVoiceGeneration({
      scriptInput: item.fullScript,
      themeToUse: activeThemeLabel,
      durationOverrideSec: item.targetDurationSec,
      aspectOverride: item.format,
      presetMetadata: {
        youtubeTitle: item.youtubeTitle || item.title,
        captionWithHashtags: item.captionWithHashtags,
        thumbnailHook: item.thumbnailHook,
      },
      seriesContext: {
        seriesTitle: seriesWeekPlan?.seriesTitle || seriesTitle,
        hookType: item.hookType,
      },
      viralContext: {
        hookFormula: item.hookType,
        openingHookLine: item.openingHookLine,
      },
    });
    if (ok) {
      updateWeekItem(item.id, { renderedAndReady: true });
    }
    return ok;
  }

  async function handleAutoBuildQueue() {
    if (!seriesWeekPlan || batchQueueStatus.running) return;
    const allItems = [
      ...seriesWeekPlan.weeklyShorts,
      seriesWeekPlan.sundayMainVideo,
    ];
    const pending = allItems.filter((item) => !item.renderedAndReady);
    const targets = pending.length > 0 ? pending : allItems;

    batchAbortRef.current = false;
    setBatchQueueStatus({
      running: true,
      completed: 0,
      total: targets.length,
      currentLabel: targets[0].dayLabel,
    });

    let doneCount = 0;
    for (const item of targets) {
      if (batchAbortRef.current) break;
      setBatchQueueStatus({
        running: true,
        completed: doneCount,
        total: targets.length,
        currentLabel: `${item.dayLabel} (${item.format})`,
      });
      const ok = await handleBuildWeekItemVideo(item);
      if (ok) {
        doneCount++;
      } else {
        break;
      }
    }

    setBatchQueueStatus({
      running: false,
      completed: doneCount,
      total: targets.length,
      currentLabel: "",
    });
    onNotice(
      batchAbortRef.current
        ? `Queue stopped after ${doneCount}/${targets.length} builds.`
        : `Series pipeline built ${doneCount}/${targets.length} releases. Review and approve any slot before publishing to YouTube.`
    );
  }

  async function handleCreateViralVideo() {
    setAnalyzingViral(true);
    setGenError(null);
    setViralPlan(null);
    setExportedVideo(null);
    setCapturedFrameUrl("");
    setIsPlaying(false);
    setScheduledPublishAtIso("");
    setActiveSeriesLabel("");
    onNotice(
      studioSnapshot?.recentVideos.length
        ? `Comparing live metrics from '${studioSnapshot.channel.title}' with the Performance Loop...`
        : `Building an English viral strategy for '${visualTheme}'...`
    );

    try {
      const latestSaved = savedEpisodes
        .filter((e) => e.seasonNumber === seasonNumber)
        .slice(-1)[0];

      const planRes = await fetch("/api/faceless/viral-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelTitle: studioSnapshot?.channel.title,
          channelStats: studioSnapshot?.channel.statistics || null,
          recentVideosStats: studioSnapshot?.recentVideos || [],
          optimizationDirectives: perfDirectives,
          targetDurationSec,
          aspectRatio,
          language,
          subtitleMode,
          subtitleAccent,
          visualTheme,
          optionalFocus,
          seriesContext: {
            seriesTitle,
            seasonNumber,
            episodeNumber,
            previousEpisodeSummary: latestSaved
              ? `${latestSaved.episodeTitle} (${latestSaved.endingBridge})`
              : undefined,
          },
        }),
      });

      const planData = (await planRes.json().catch(() => ({}))) as ViralPlanReport & {
        error?: string;
      };

      if (!planRes.ok) {
        throw new Error(planData.error || `Server error (${planRes.status}).`);
      }

      setViralPlan(planData);
      setTopicOrScript(planData.fullScript);
      setAnalyzingViral(false);

      await runSceneAndVoiceGeneration({
        scriptInput: planData.fullScript,
        themeToUse: visualTheme,
        viralContext: {
          hookFormula: planData.hookFormula,
          openingHookLine: planData.openingHookLine,
          winningPatternsUsed: planData.statsComparison?.winningPatternsUsed,
        },
        seriesContext: {
          seriesTitle,
          seasonNumber,
          episodeNumber,
          hookType: planData.hookFormula,
        },
      });
    } catch (err) {
      const msg = formatClientError(err, "Viral strategy analysis failed.");
      setGenError(msg);
      onNotice(msg);
      setAnalyzingViral(false);
    }
  }

  async function handleGeneratePackage() {
    if (!topicOrScript.trim()) {
      onNotice("Enter an English topic or script first.");
      return;
    }
    setScheduledPublishAtIso("");
    setActiveSeriesLabel("");
    await runSceneAndVoiceGeneration({
      scriptInput: topicOrScript,
      themeToUse: visualTheme,
    });
  }

  function seekPreviewTo(sec: number) {
    const clamped = Math.max(0, Math.min(totalDurationSec || sec, sec));
    if (voiceAudioRef.current) {
      voiceAudioRef.current.currentTime = clamped;
    }
    if (ambientAudioRef.current) {
      ambientAudioRef.current.currentTime = clamped;
    }
    setPreviewTimeSec(clamped);
    paintPreviewAt(clamped);
  }

  function updateSceneAnimSpec(
    sceneIndex: number,
    patch: { archetype?: VectorArchetype; contrastShift?: ContrastShiftMode }
  ) {
    let jumpSec: number | null = null;
    setScenes((prev) =>
      prev.map((sc) => {
        if (sc.sceneIndex !== sceneIndex) return sc;
        jumpSec = sc.startSec + Math.min(0.9, sc.durationSec * 0.45);
        return {
          ...sc,
          animSpec: {
            ...sc.animSpec,
            ...patch,
          },
        };
      })
    );
    if (jumpSec !== null && !isPlaying) {
      seekPreviewTo(jumpSec);
    }
  }

  function togglePlayPreview() {
    const audio = voiceAudioRef.current;
    const ambient = ambientAudioRef.current;
    if (!audio) return;

    if (!audio.paused) {
      audio.pause();
      if (ambient && !ambient.paused) ambient.pause();
      setIsPlaying(false);
      return;
    }

    if (audio.ended || audio.currentTime >= totalDurationSec) {
      audio.currentTime = 0;
    }
    if (ambient) {
      ambient.volume = 0.18;
      ambient.currentTime = audio.currentTime;
      ambient.play().catch(() => {});
    }
    audio
      .play()
      .then(() => setIsPlaying(true))
      .catch(() => setIsPlaying(false));
  }

  function handleMusicPicked(file: File | undefined) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setMusicFile(file);
    setMusicUrl(url);
    onNotice(`Added background audio '${file.name}'.`);
  }

  async function handleExportAndGenerateMetadata() {
    if (!voiceoverUrl || scenes.length === 0 || exporting) return;

    if (voiceAudioRef.current && !voiceAudioRef.current.paused) {
      voiceAudioRef.current.pause();
      if (ambientAudioRef.current && !ambientAudioRef.current.paused) {
        ambientAudioRef.current.pause();
      }
      setIsPlaying(false);
    }

    const activeMusicUrl =
      musicUrl || (autoAmbientEnabled ? autoAmbientUrl : null);

    const controller = new AbortController();
    exportAbortRef.current = controller;
    setExporting(true);
    setExportProgress(0);
    onNotice(
      `Rendering minimalist white & gold 2D animation (${aspectRatio === "9:16" ? "1080×1920" : "1920×1080"} · ${Math.round(totalDurationSec)}s)...`
    );

    try {
      const { exported, frameBase64Png, metadataFrameDataUrl } =
        await exportFacelessVideo({
          aspectRatio,
          voiceoverUrl,
          musicUrl: activeMusicUrl,
          scenes,
          wordTimings,
          subtitleChunks,
          durationSec: totalDurationSec,
          subtitleMode,
          subtitleAccent,
          onProgress: setExportProgress,
          signal: controller.signal,
        });

      setExportedVideo(exported);
      setCapturedFrameUrl(frameBase64Png);
      setExporting(false);

      setGeneratingMetadata(true);
      onNotice(
        "2D video exported! Generating high-CTR English YouTube metadata..."
      );

      const metaRes = await fetch("/api/faceless/metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          frameBase64Png: metadataFrameDataUrl,
          script: fullScript,
          visualTheme,
          aspectRatio,
          language,
        }),
      });

      if (metaRes.ok) {
        const metaData = (await metaRes.json()) as FacelessMetadata;
        setMetadata(metaData);
        onNotice("2D animation & English metadata ready for pre-publish approval.");
      } else {
        onNotice(
          "Video exported; review title and hashtags below before approving."
        );
      }
    } catch (err) {
      onNotice(formatClientError(err, "Exporting 2D animation failed."));
    } finally {
      setExporting(false);
      setGeneratingMetadata(false);
      exportAbortRef.current = null;
    }
  }

  function handleCopyStoryboardJson() {
    if (!storyboardJson) return;
    navigator.clipboard
      .writeText(JSON.stringify(storyboardJson, null, 2))
      .then(() => {
        setCopiedJson(true);
        setTimeout(() => setCopiedJson(false), 2000);
      })
      .catch(() => {});
  }

  function handleDownloadStoryboardJson() {
    if (!storyboardJson) return;
    const blob = new Blob([JSON.stringify(storyboardJson, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const slug = (storyboardJson.video_title || "storyboard")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48);
    a.href = url;
    a.download = `${slug || "storyboard"}-2d-animation.json`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function handleApprove() {
    if (!exportedVideo) return;
    if (activeWeekItemId) {
      updateWeekItem(activeWeekItemId, { approvedForPublish: true });
    }
    onApproveAndPublish({
      ...exportedVideo,
      suggestedTitle:
        metadata.youtubeTitle.trim() || exportedVideo.suggestedTitle,
      suggestedDescription: metadata.captionWithHashtags.trim(),
      thumbnailHook: metadata.thumbnailHook.trim(),
      scheduledPublishAt: scheduledPublishAtIso || undefined,
      seriesLabel: activeSeriesLabel || undefined,
    });
  }

  const effectiveMusicUrl =
    musicUrl || (autoAmbientEnabled ? autoAmbientUrl : null);
  const canvasW = aspectRatio === "9:16" ? 540 : 640;
  const canvasH = aspectRatio === "9:16" ? 960 : 360;
  const allBusy =
    analyzingViral || generating || generatingWeek || exporting || batchQueueStatus.running;

  return (
    <div ref={rootRef} className="faceless-stack">
      <input
        ref={musicInputRef}
        type="file"
        accept="audio/mpeg,audio/mp3,audio/wav,audio/*"
        className="sr-only"
        onChange={(e) => {
          handleMusicPicked(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      {voiceoverUrl && (
        <audio
          ref={voiceAudioRef}
          src={voiceoverUrl}
          className="sr-only"
          onEnded={() => {
            setIsPlaying(false);
            setPreviewTimeSec(0);
            if (ambientAudioRef.current && !ambientAudioRef.current.paused) {
              ambientAudioRef.current.pause();
            }
          }}
        />
      )}

      {effectiveMusicUrl && (
        <audio
          ref={ambientAudioRef}
          src={effectiveMusicUrl}
          loop
          className="sr-only"
        />
      )}

      {/* 1. Make Series, Self-Improving Performance Loop & Direction */}
      <div className="faceless-section">
        <div className="section-subhead">
          <div>
            <h3>1. Make Series, Hooks &amp; 2D Direction</h3>
            <p>
              Produce a structured 5-minute Sunday Main Video (6 focus points,
              intro ≤ 30s) paired 1-to-1 with 6 Mon–Sat Shorts (20–35s each), or
              launch a single English viral edit.
            </p>
          </div>
          <div
            className="segmented-group"
            role="tablist"
            aria-label="Creation mode"
          >
            <button
              type="button"
              role="tab"
              aria-selected={creationMode === "series-week"}
              className={`segmented-btn ${
                creationMode === "series-week" ? "is-active" : ""
              }`}
              disabled={allBusy}
              onClick={() => setCreationMode("series-week")}
            >
              Make Series
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={creationMode === "viral-auto"}
              className={`segmented-btn ${
                creationMode === "viral-auto" ? "is-active" : ""
              }`}
              disabled={allBusy}
              onClick={() => setCreationMode("viral-auto")}
            >
              Make Viral Video
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={creationMode === "custom"}
              className={`segmented-btn ${
                creationMode === "custom" ? "is-active" : ""
              }`}
              disabled={allBusy}
              onClick={() => setCreationMode("custom")}
            >
              Custom Script
            </button>
          </div>
        </div>

        {/* Performance Feedback Loop Bar */}
        <div className="perf-loop-panel">
          <div className="perf-loop-head">
            <div>
              <strong>Self-Improving Performance Loop</strong>
              <span>
                Analyzes YouTube Studio uploads ({studioSnapshot?.recentVideos.length ?? 0})
                {" + "}logged post metrics ({postedMetrics.length}) to sharpen
                hooks, Short runtimes, and visual clarity.
              </span>
            </div>
            <div className="perf-loop-actions">
              <button
                type="button"
                className="btn-secondary btn-compact"
                onClick={() => setMetricFormOpen((v) => !v)}
                disabled={analyzingLoop}
              >
                {metricFormOpen ? "Close Metric Form" : "+ Log Post Metric"}
              </button>
              <button
                type="button"
                className="btn-primary btn-compact"
                onClick={() => void handleRunPerformanceLoop()}
                disabled={analyzingLoop}
              >
                <RefreshCw size={13} aria-hidden="true" />
                {analyzingLoop ? "Analyzing..." : "Run Optimization Loop"}
              </button>
            </div>
          </div>

          {metricFormOpen && (
            <div className="perf-log-grid">
              <div className="field-group">
                <label htmlFor="metric-title">Video / Short Title</label>
                <div className="input-box">
                  <input
                    id="metric-title"
                    type="text"
                    value={metricTitle}
                    onChange={(e) => setMetricTitle(e.target.value)}
                    placeholder="e.g., Mon: Never Rush the First Pause"
                  />
                </div>
              </div>
              <div className="field-group">
                <label htmlFor="metric-theme">Theme Tested</label>
                <select
                  id="metric-theme"
                  className="select-input"
                  value={metricTheme}
                  onChange={(e) => setMetricTheme(e.target.value)}
                >
                  {THEME_PROFILES.map((t) => (
                    <option key={t.id} value={t.label}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field-group">
                <label htmlFor="metric-format">Format</label>
                <select
                  id="metric-format"
                  className="select-input"
                  value={metricFormat}
                  onChange={(e) =>
                    setMetricFormat(e.target.value === "Video" ? "Video" : "Short")
                  }
                >
                  <option value="Short">Short (9:16)</option>
                  <option value="Video">Main Video (16:9)</option>
                </select>
              </div>
              <div className="field-group">
                <label htmlFor="metric-hook">Hook Type</label>
                <select
                  id="metric-hook"
                  className="select-input"
                  value={metricHookType}
                  onChange={(e) => setMetricHookType(e.target.value)}
                >
                  {HOOK_TYPE_SEQUENCE.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field-group">
                <label htmlFor="metric-views">Views</label>
                <div className="input-box">
                  <input
                    id="metric-views"
                    type="number"
                    min={0}
                    value={metricViews}
                    onChange={(e) => setMetricViews(e.target.value)}
                  />
                </div>
              </div>
              <div className="field-group">
                <label htmlFor="metric-subs">Subscribers Gained</label>
                <div className="input-box">
                  <input
                    id="metric-subs"
                    type="number"
                    min={0}
                    value={metricSubscribers}
                    onChange={(e) => setMetricSubscribers(e.target.value)}
                  />
                </div>
              </div>
              <div className="field-group">
                <label htmlFor="metric-retention">Avg Retention %</label>
                <div className="input-box">
                  <input
                    id="metric-retention"
                    type="number"
                    min={0}
                    max={100}
                    value={metricRetention}
                    onChange={(e) => setMetricRetention(e.target.value)}
                  />
                </div>
              </div>
              <div className="field-group">
                <label htmlFor="metric-ctr">Viewed / CTR %</label>
                <div className="input-box">
                  <input
                    id="metric-ctr"
                    type="number"
                    min={0}
                    max={100}
                    value={metricCtr}
                    onChange={(e) => setMetricCtr(e.target.value)}
                  />
                </div>
              </div>
              <div className="field-group">
                <label htmlFor="metric-likes">Likes</label>
                <div className="input-box">
                  <input
                    id="metric-likes"
                    type="number"
                    min={0}
                    value={metricLikes}
                    onChange={(e) => setMetricLikes(e.target.value)}
                  />
                </div>
              </div>
              <div className="perf-save-cell">
                <button
                  type="button"
                  className="btn-primary btn-compact"
                  onClick={handleLogPostedMetric}
                >
                  <Check size={13} aria-hidden="true" />
                  Save Metric
                </button>
              </div>
            </div>
          )}

          {perfDirectives && (
            <div className="perf-directives-summary">
              <div>
                <strong>Active Directives ({perfDirectives.sampleSize} items):</strong>{" "}
                <span>{perfDirectives.loopSummary}</span>
              </div>
              <div className="perf-directives-meta">
                {perfDirectives.winningThemes?.length > 0 && (
                  <span>
                    Winning themes (views &amp; subs):{" "}
                    <strong>{perfDirectives.winningThemes.join(", ")}</strong>
                  </span>
                )}
                <span>
                  Winning hooks: <strong>{perfDirectives.winningHookTypes.join(", ")}</strong>
                </span>
                <span>
                  Sweet spot: <strong>{perfDirectives.recommendedShortDurationSec}s Shorts</strong>
                </span>
                <span>
                  Pacing: <strong>{perfDirectives.pacingDirective}</strong>
                </span>
              </div>
            </div>
          )}
        </div>

        {creationMode === "viral-auto" ? (
          <div className="viral-stats-context-box">
            {isYouTubeConnected && studioSnapshot ? (
              <div className="viral-stats-context-inner">
                <BarChart3 size={16} aria-hidden="true" />
                <div>
                  <strong>
                    Channel Data Active: {studioSnapshot.channel.title} (
                    {studioSnapshot.summary.sampleSize} recent videos)
                  </strong>
                  <span>
                    {studioSnapshot.summary.sampleSize > 0
                      ? `Average ${new Intl.NumberFormat("en-US").format(studioSnapshot.summary.avgViews)} views · ${studioSnapshot.summary.avgEngagementRate}% engagement. Top video: "${studioSnapshot.summary.topVideo?.title || ""}".`
                      : "Channel connected, 0 recent uploads yet. Proven retention benchmarks and Performance Loop directives will be applied."}
                  </span>
                </div>
              </div>
            ) : (
              <div className="viral-stats-context-inner is-unlinked">
                <Youtube size={16} aria-hidden="true" />
                <div>
                  <strong>YouTube Studio Not Connected</strong>
                  <span>
                    Sign in to compare live channel upload metrics, or generate now
                    using English retention benchmarks and Performance Loop rules.
                  </span>
                </div>
                <button
                  type="button"
                  className="btn-secondary btn-compact"
                  onClick={() => void onRequestYouTubeLogin()}
                >
                  Connect YouTube
                </button>
              </div>
            )}
          </div>
        ) : null}

        <div className="faceless-options-grid">
          <div className="field-group">
            <label htmlFor="faceless-duration">Clip Length (up to 8 min)</label>
            <select
              id="faceless-duration"
              className="select-input"
              value={targetDurationSec}
              disabled={allBusy}
              onChange={(e) => setTargetDurationSec(Number(e.target.value))}
            >
              {DURATION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="field-group">
            <label>Aspect Ratio (9:16 &amp; 16:9)</label>
            <div
              className="segmented-group"
              role="group"
              aria-label="Aspect ratio"
            >
              {(["9:16", "16:9"] as const).map((ratio) => (
                <button
                  key={ratio}
                  type="button"
                  className={`segmented-btn ${
                    aspectRatio === ratio ? "is-active" : ""
                  }`}
                  disabled={allBusy}
                  onClick={() => setAspectRatio(ratio)}
                >
                  {ratio === "9:16" ? "9:16 Shorts" : "16:9 Main"}
                </button>
              ))}
            </div>
          </div>

          <div className="field-group">
            <label htmlFor="faceless-lang">Script &amp; Narration Language</label>
            <select
              id="faceless-lang"
              className="select-input"
              value={language}
              disabled
              aria-readonly="true"
            >
              <option value="English">English (Strict English Only)</option>
            </select>
          </div>

          <div className="field-group">
            <label htmlFor="faceless-subtitles">Subtitles (Bottom-Center)</label>
            <select
              id="faceless-subtitles"
              className="select-input"
              value={subtitleMode}
              disabled={allBusy}
              onChange={(e) => setSubtitleMode(e.target.value as SubtitleMode)}
            >
              <option value="word-highlight">
                Poppins Active Word Gold / Rest White (3–7 words)
              </option>
              <option value="classic">Poppins Crisp White (3–7 words)</option>
              <option value="off">Subtitles Off</option>
            </select>
          </div>

          <div className="field-group">
            <label>Keyword &amp; Gaze Accent</label>
            <div
              className="segmented-group"
              role="group"
              aria-label="Accent color"
            >
              <button
                type="button"
                className={`segmented-btn accent-choice-btn ${
                  subtitleAccent === "gold" ? "is-active" : ""
                }`}
                disabled={allBusy || subtitleMode === "off"}
                onClick={() => setSubtitleAccent("gold")}
              >
                <span className="accent-swatch is-gold" aria-hidden="true" />
                Warm Gold
              </button>
              <button
                type="button"
                className={`segmented-btn accent-choice-btn ${
                  subtitleAccent === "cyan" ? "is-active" : ""
                }`}
                disabled={allBusy || subtitleMode === "off"}
                onClick={() => setSubtitleAccent("cyan")}
              >
                <span className="accent-swatch is-cyan" aria-hidden="true" />
                Electric Cyan
              </button>
            </div>
          </div>

          <div className="field-group">
            <label htmlFor="faceless-voice">English Voice-Over</label>
            <select
              id="faceless-voice"
              className="select-input"
              value={voiceName}
              disabled={allBusy}
              onChange={(e) => setVoiceName(e.target.value)}
            >
              {VOICE_OPTIONS.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>

          <div className="field-group">
            <label htmlFor="faceless-theme">Series Theme Mode (Test All or Focus One)</label>
            <select
              id="faceless-theme"
              className="select-input"
              value={visualTheme}
              disabled={allBusy}
              onChange={(e) => {
                const nextTheme = e.target.value;
                const oldDefault = resolveThemeProfile(visualTheme).defaultSeriesTitle;
                const nextProfile = resolveThemeProfile(nextTheme);
                setVisualTheme(nextTheme);
                if (!seriesTitle.trim() || seriesTitle === oldDefault) {
                  setSeriesTitle(nextProfile.defaultSeriesTitle);
                }
              }}
            >
              {THEME_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <p className="field-hint">
              {isAutoExploreThemeInput(visualTheme)
                ? "Auto-tests across all 6 themes and shifts focus toward what drives the highest views & subscribers."
                : resolveThemeProfile(visualTheme).musicDescription}
            </p>
          </div>

          <div className="field-group">
            <label>Lo-Fi Synth &amp; Subtle SFX</label>
            <div className="music-picker-row">
              {musicFile ? (
                <button
                  type="button"
                  className="btn-secondary btn-compact"
                  onClick={() => {
                    setMusicFile(null);
                    setMusicUrl(null);
                  }}
                  disabled={allBusy}
                >
                  <X size={13} aria-hidden="true" />
                  {musicFile.name.slice(0, 18)}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className={`btn-secondary btn-compact ${
                      autoAmbientEnabled ? "is-active" : ""
                    }`}
                    onClick={() => setAutoAmbientEnabled((v) => !v)}
                    disabled={allBusy}
                  >
                    <Music size={13} aria-hidden="true" />
                    {autoAmbientEnabled ? "Theme Synth + SFX (On)" : "Ambient Off"}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary btn-compact"
                    onClick={() => musicInputRef.current?.click()}
                    disabled={allBusy}
                  >
                    Upload MP3
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {creationMode === "series-week" ? (
          <div className="series-planner-shell">
            <div className="series-meta-grid">
              <div className="field-group">
                <label htmlFor="series-title-input">Series Title (Optional)</label>
                <div className="input-box">
                  <input
                    id="series-title-input"
                    type="text"
                    value={seriesTitle}
                    disabled={allBusy}
                    onChange={(e) => setSeriesTitle(e.target.value)}
                    placeholder="Auto-named per theme or type a title"
                  />
                </div>
              </div>

              <div className="field-group">
                <label htmlFor="series-main-dur">Sunday 6-Point Main Video (16:9)</label>
                <select
                  id="series-main-dur"
                  className="select-input"
                  value={mainEpisodeDurationSec}
                  disabled={allBusy}
                  onChange={(e) =>
                    setMainEpisodeDurationSec(Number(e.target.value))
                  }
                >
                  <option value={180}>3 min (16:9)</option>
                  <option value={300}>5 min Flagship (16:9)</option>
                  <option value={420}>7 min (16:9)</option>
                  <option value={480}>8 min max (16:9)</option>
                </select>
              </div>
            </div>

            {savedEpisodes.length > 0 && (
              <div className="series-memory-bar">
                <div className="series-memory-copy">
                  <Layers size={14} aria-hidden="true" />
                  <span>
                    Published / Tested Weeks ({savedEpisodes.length}):{" "}
                    {savedEpisodes
                      .slice(-3)
                      .map((e) => `${e.episodeTitle}`)
                      .join(" · ")}
                  </span>
                </div>
                <button
                  type="button"
                  className="btn-secondary btn-compact"
                  onClick={() => {
                    setSavedEpisodes([]);
                    setEpisodeNumber(1);
                    onNotice("Theme & topic test history cleared.");
                  }}
                >
                  <Trash2 size={12} aria-hidden="true" />
                  Clear History
                </button>
              </div>
            )}

            <div className="field-group viral-focus-field">
              <label htmlFor="series-topic-focus">
                Weekly Topic Angle (Optional — auto-selected from theme &amp; analytics if blank)
              </label>
              <div className="input-box">
                <input
                  id="series-topic-focus"
                  type="text"
                  value={optionalFocus}
                  disabled={allBusy}
                  onChange={(e) => setOptionalFocus(e.target.value)}
                  placeholder="Leave blank to let the Producer select the highest-growth weekly angle..."
                />
              </div>
            </div>

            <div className="faceless-generate-row">
              <button
                type="button"
                className="btn-primary"
                onClick={() => void handleMakeSeries()}
                disabled={allBusy}
              >
                <Sparkles size={15} aria-hidden="true" />
                {generatingWeek
                  ? "Building 6 Mon–Sat Shorts + Sunday Main Video..."
                  : "Make Series (6 Shorts Mon–Sat + Sunday 6-Point Video)"}
              </button>
              <span className="quiet-assurance">
                <CalendarClock size={14} aria-hidden="true" />
                Scheduled directly as Public at Mon–Sun peak windows after your approval
              </span>
            </div>

            {seriesWeekPlan && (
              <div className="series-week-output">
                <div className="series-arc-header">
                  <div>
                    <span className="series-arc-kicker">
                      {seriesWeekPlan.seriesTitle} · {seriesWeekPlan.themeLabel}
                    </span>
                    <h4>{seriesWeekPlan.episodeTitle}</h4>
                    <p>{seriesWeekPlan.seriesArcNote}</p>
                    {seriesWeekPlan.experimentModeNote && (
                      <p className="series-opt-note">
                        {seriesWeekPlan.experimentModeNote}
                      </p>
                    )}
                    <p className="series-intro-verify">
                      Intro: {seriesWeekPlan.introVerification.estimatedIntroSec}s
                      (≤30s) · {seriesWeekPlan.introVerification.pointCount}{" "}
                      focus points ·{" "}
                      {seriesWeekPlan.introVerification.keyFactsAndInsights.join(
                        " · "
                      )}
                    </p>
                    <p className="series-bridge-note">
                      Next Week Momentum: {seriesWeekPlan.episodeEndingBridge}
                    </p>
                    {seriesWeekPlan.appliedOptimizationSummary && (
                      <p className="series-opt-note">
                        {seriesWeekPlan.appliedOptimizationSummary}
                      </p>
                    )}
                  </div>
                  <div className="series-header-actions">
                    <button
                      type="button"
                      className="btn-secondary btn-compact"
                      onClick={handleSaveEpisodeToSeasonMemory}
                    >
                      <Check size={13} aria-hidden="true" />
                      Save Week to Analytics History
                    </button>
                    {batchQueueStatus.running ? (
                      <button
                        type="button"
                        className="btn-secondary btn-compact"
                        onClick={() => {
                          batchAbortRef.current = true;
                        }}
                      >
                        <Square size={12} aria-hidden="true" />
                        Stop Queue ({batchQueueStatus.completed}/
                        {batchQueueStatus.total})
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn-primary btn-compact"
                        disabled={allBusy}
                        onClick={() => void handleAutoBuildQueue()}
                      >
                        <Sparkles size={13} aria-hidden="true" />
                        Auto-Build All 7 Videos
                      </button>
                    )}
                  </div>
                </div>

                {batchQueueStatus.running && (
                  <div className="week-queue-bar" aria-live="polite">
                    Building {batchQueueStatus.completed + 1} of{" "}
                    {batchQueueStatus.total}: {batchQueueStatus.currentLabel}...
                  </div>
                )}

                {seriesWeekPlan.focusPoints?.length > 0 && (
                  <div className="focus-points-shell">
                    <div className="focus-points-head">
                      <strong>
                        6 Separate Parts (1 Standalone Short per Day Mon–Sat)
                      </strong>
                      <span>
                        Each Short teaches its own part cleanly (brief tomorrow preview); Sunday brings all 6 together
                      </span>
                    </div>
                    <div className="focus-points-grid">
                      {seriesWeekPlan.focusPoints.map((fp) => (
                        <div key={fp.pointNumber} className="focus-point-card">
                          <span className="focus-point-kicker">
                            Point {fp.pointNumber} · {fp.mappedDayLabel} Short
                          </span>
                          <strong>{fp.title}</strong>
                          <p>{fp.coreInsight}</p>
                          <span className="focus-point-fact">
                            Key Fact: {fp.keyFact}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="week-items-grid">
                  {[
                    ...seriesWeekPlan.weeklyShorts,
                    seriesWeekPlan.sundayMainVideo,
                  ].map((item) => {
                    const isSelected = activeWeekItemId === item.id;
                    return (
                      <div
                        key={item.id}
                        className={`week-slot-card ${
                          item.kind === "main" ? "is-sunday-main" : ""
                        } ${isSelected ? "is-selected" : ""}`}
                      >
                        <div className="week-slot-head">
                          <span className="week-day-title">
                            {item.dayLabel}
                            {item.pointNumber ? ` · Point ${item.pointNumber}` : ""}{" "}
                            · {item.format} ·{" "}
                            {item.kind === "main"
                              ? `${Math.round(item.targetDurationSec / 60)} min`
                              : `${item.targetDurationSec}s`}
                          </span>
                          <span className="week-hook-type">{item.hookType}</span>
                        </div>

                        <strong className="week-item-title">{item.title}</strong>
                        <p className="week-item-hook">
                          Hook: &ldquo;{item.openingHookLine}&rdquo;
                        </p>
                        <p className="week-item-tease">{item.teaseNote}</p>

                        <div className="week-slot-controls">
                          <label className="week-approve-check">
                            <input
                              type="checkbox"
                              checked={item.approvedForPublish}
                              onChange={(e) =>
                                updateWeekItem(item.id, {
                                  approvedForPublish: e.target.checked,
                                })
                              }
                            />
                            <span>Approved for YouTube</span>
                          </label>
                          <input
                            type="datetime-local"
                            aria-label={`Publish timestamp for ${item.dayLabel}`}
                            className="week-time-input"
                            value={item.scheduledLocalInput}
                            onChange={(e) => {
                              const val = e.target.value;
                              const d = new Date(val);
                              updateWeekItem(item.id, {
                                scheduledLocalInput: val,
                                scheduledPublishAtIso: !Number.isNaN(d.getTime())
                                  ? d.toISOString()
                                  : item.scheduledPublishAtIso,
                              });
                            }}
                          />
                        </div>

                        <div className="week-slot-actions">
                          <button
                            type="button"
                            className="btn-primary btn-compact"
                            disabled={generating || exporting}
                            onClick={() => void handleBuildWeekItemVideo(item)}
                          >
                            <Sparkles size={13} aria-hidden="true" />
                            {generating && isSelected
                              ? "Building 2D Video..."
                              : item.renderedAndReady
                                ? "Rebuild 2D Video"
                                : "Build 2D Video"}
                          </button>
                          <span className="week-window-label">
                            {item.windowLabel}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : creationMode === "viral-auto" ? (
          <>
            <div className="field-group viral-focus-field">
              <label htmlFor="viral-optional-focus">
                Topic Angle Within Selected Theme (Optional)
              </label>
              <div className="input-box">
                <input
                  id="viral-optional-focus"
                  type="text"
                  value={optionalFocus}
                  disabled={allBusy}
                  onChange={(e) => setOptionalFocus(e.target.value)}
                  placeholder="Leave blank to let the Director select the sharpest English topic..."
                />
              </div>
            </div>

            <div className="faceless-generate-row">
              <button
                type="button"
                className="btn-primary"
                onClick={() => void handleCreateViralVideo()}
                disabled={allBusy}
              >
                <Sparkles size={15} aria-hidden="true" />
                {analyzingViral
                  ? "Analyzing Channel & Performance Loop..."
                  : generating
                    ? "Building 2D Line-Art & English Voice..."
                    : "Make Viral Video"}
              </button>
              <span className="quiet-assurance">
                <TrendingUp size={14} aria-hidden="true" />
                Intro ≤30s · Calm 2.4–4.2s Beats · Synced Gold/White Captions
              </span>
            </div>
          </>
        ) : (
          <>
            <div className="field-group viral-focus-field">
              <label htmlFor="faceless-script-input">
                English Topic or Full Spoken Script
              </label>
              <textarea
                id="faceless-script-input"
                rows={4}
                className="textarea-box"
                value={topicOrScript}
                disabled={allBusy}
                onChange={(e) => setTopicOrScript(e.target.value)}
                placeholder="e.g. 'Stop filling every quiet pause when speaking with a woman' — or paste a complete English script."
              />
            </div>

            <div className="faceless-generate-row">
              <button
                type="button"
                className="btn-primary"
                onClick={() => void handleGeneratePackage()}
                disabled={allBusy || !topicOrScript.trim()}
              >
                <Sparkles size={15} aria-hidden="true" />
                {generating
                  ? "Generating 2D Scenes, Voice & JSON..."
                  : "Generate 2D Animation & Script"}
              </button>
              <span className="quiet-assurance">
                <Volume2 size={14} aria-hidden="true" />
                Confident Male &amp; Graceful Female Vectors + Word-Synced Captions
              </span>
            </div>
          </>
        )}

        {genError && (
          <div className="error-banner" role="alert">
            <AlertCircle size={15} aria-hidden="true" />
            <span>{genError}</span>
          </div>
        )}

        {viralPlan && (
          <div className="viral-blueprint-card" aria-label="Viral Strategy Analysis">
            <div className="viral-blueprint-head">
              <div>
                <span className="viral-hook-tag">
                  {viralPlan.hookFormula} · Virality Prediction:{" "}
                  {viralPlan.predictedViralScore.total}/100
                </span>
                <h4>{viralPlan.chosenTopic}</h4>
              </div>
            </div>

            <p className="viral-opening-hook">
              <strong>Opening Hook (first 2s):</strong> &ldquo;
              {viralPlan.openingHookLine}&rdquo;
            </p>

            <p className="viral-why-text">
              <strong>Why it converts:</strong> {viralPlan.whyItWillGoViral}
            </p>

            <div className="score-grid">
              <div className="score-cell">
                <span>Hook Strength</span>
                <strong>{viralPlan.predictedViralScore.hook}/25</strong>
              </div>
              <div className="score-cell">
                <span>Retention &amp; Pacing</span>
                <strong>
                  {viralPlan.predictedViralScore.retentionPacing}/25
                </strong>
              </div>
              <div className="score-cell">
                <span>Shareability</span>
                <strong>
                  {viralPlan.predictedViralScore.shareabilityEmotion}/25
                </strong>
              </div>
              <div className="score-cell">
                <span>Standalone</span>
                <strong>{viralPlan.predictedViralScore.standalone}/25</strong>
              </div>
            </div>

            <div className="viral-comparison-grid">
              <div className="viral-compare-col">
                <strong>
                  {viralPlan.statsComparison.hasChannelData
                    ? "Comparison With Recent Channel Metrics"
                    : "Applied Retention Benchmarks"}
                </strong>
                <p>{viralPlan.statsComparison.benchmarkSummary}</p>
                {viralPlan.statsComparison.topReferenceVideo && (
                  <p className="viral-ref-line">
                    Reference:{" "}
                    <em>{viralPlan.statsComparison.topReferenceVideo}</em>
                  </p>
                )}
                {viralPlan.statsComparison.winningPatternsUsed.length > 0 && (
                  <ul className="viral-bullets">
                    {viralPlan.statsComparison.winningPatternsUsed.map(
                      (p, i) => (
                        <li key={i}>{p}</li>
                      )
                    )}
                  </ul>
                )}
              </div>

              <div className="viral-compare-col">
                <strong>Applied in This 2D Edit</strong>
                {viralPlan.appliedEditingRules.length > 0 && (
                  <ul className="viral-bullets">
                    {viralPlan.appliedEditingRules.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                )}
                {viralPlan.statsComparison.avoidedWeaknesses.length > 0 && (
                  <>
                    <strong className="viral-avoid-title">
                      Avoided Weaknesses
                    </strong>
                    <ul className="viral-bullets">
                      {viralPlan.statsComparison.avoidedWeaknesses.map(
                        (w, i) => (
                          <li key={i}>{w}</li>
                        )
                      )}
                    </ul>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. 2D White & Gold Line-Art Storyboard, Live Canvas Preview & Export */}
      {scenes.length > 0 && (
        <div className="faceless-section">
          <div className="section-subhead">
            <div>
              <h3>2. Calm 2D Vector Canvas Preview &amp; Storyboard JSON</h3>
              <p>
                Click any scene to inspect the bold white &amp; warm gold line-art
                staging in {aspectRatio} framing. Adjust the visual metaphor or
                subtle warm gold aura per beat.
              </p>
            </div>
            <div className="scene-btn-group">
              <span className="control-value">
                {scenes.length} scenes · Target: {targetDurationSec}s · Exact:{" "}
                {totalDurationSec.toFixed(1)}s
              </span>
              {storyboardJson && (
                <button
                  type="button"
                  className="btn-secondary btn-compact"
                  onClick={() => setShowStoryboardJson((v) => !v)}
                >
                  <Code2 size={13} aria-hidden="true" />
                  {showStoryboardJson ? "Hide JSON" : "Storyboard JSON"}
                </button>
              )}
            </div>
          </div>

          {showStoryboardJson && storyboardJson && (
            <div className="storyboard-json-panel">
              <div className="storyboard-json-head">
                <div>
                  <strong>{storyboardJson.video_title}</strong>
                  <span>
                    Voiceover: {storyboardJson.voiceover_style} · Subtitles:{" "}
                    {storyboardJson.subtitle_style} · Thumbnail:{" "}
                    {storyboardJson.thumbnail_idea}
                  </span>
                </div>
                <div className="storyboard-json-actions">
                  <button
                    type="button"
                    className="btn-secondary btn-compact"
                    onClick={handleCopyStoryboardJson}
                  >
                    {copiedJson ? (
                      <>
                        <Check size={13} aria-hidden="true" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy size={13} aria-hidden="true" />
                        Copy JSON
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary btn-compact"
                    onClick={handleDownloadStoryboardJson}
                  >
                    <Download size={13} aria-hidden="true" />
                    Download .json
                  </button>
                </div>
              </div>
              <pre className="storyboard-json-pre">
                {JSON.stringify(storyboardJson, null, 2)}
              </pre>
            </div>
          )}

          <div className="editor-grid">
            <div className="scenes-list">
              {scenes.map((sc) => {
                const isActiveScene =
                  previewTimeSec >= sc.startSec && previewTimeSec < sc.endSec;
                const shift =
                  sc.animSpec?.contrastShift === "accent_flash"
                    ? "accent_flash"
                    : "black";
                return (
                  <div
                    key={sc.id}
                    role="button"
                    tabIndex={0}
                    className={`scene-card ${isActiveScene ? "is-active" : ""}`}
                    onClick={() =>
                      seekPreviewTo(
                        sc.startSec + Math.min(0.8, sc.durationSec * 0.4)
                      )
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        seekPreviewTo(
                          sc.startSec + Math.min(0.8, sc.durationSec * 0.4)
                        );
                      }
                    }}
                  >
                    <div className="scene-card-head">
                      <span className="moment-time">
                        Scene {sc.sceneIndex} · {sc.section_label || "Chapter"}{" "}
                        · {sc.timestamp_est} ({sc.durationSec.toFixed(1)}s)
                      </span>
                      <span className="scene-keyword">
                        {sc.sfx_or_music_cue && sc.sfx_or_music_cue !== "none"
                          ? sc.sfx_or_music_cue
                          : shift === "accent_flash"
                            ? "Gold Glow"
                            : "Black Backdrop"}
                      </span>
                    </div>

                    <p className="scene-narration">{sc.voiceover}</p>

                    <p className="scene-visual-desc">
                      <strong>2D Direction:</strong> {sc.visual_scene}
                    </p>

                    <div
                      className="scene-controls-row"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <select
                        aria-label={`2D animation archetype for scene ${sc.sceneIndex}`}
                        className="select-input scene-mini-select"
                        disabled={exporting}
                        value={sc.animSpec?.archetype || "intro_roadmap"}
                        onChange={(e) =>
                          updateSceneAnimSpec(sc.sceneIndex, {
                            archetype: e.target.value as VectorArchetype,
                          })
                        }
                      >
                        {ARCHETYPE_ENTRIES.map(([key, label]) => (
                          <option key={key} value={key}>
                            {label}
                          </option>
                        ))}
                      </select>

                      <select
                        aria-label={`Backdrop accent for scene ${sc.sceneIndex}`}
                        className="select-input scene-mini-select"
                        disabled={exporting}
                        value={shift}
                        onChange={(e) =>
                          updateSceneAnimSpec(sc.sceneIndex, {
                            contrastShift: e.target.value as ContrastShiftMode,
                          })
                        }
                      >
                        <option value="black">Pure Black (#000000)</option>
                        <option value="accent_flash">Subtle Warm Gold Aura</option>
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="editor-preview-col">
              <div
                className={
                  aspectRatio === "9:16" ? "phone-frame" : "landscape-frame"
                }
              >
                <canvas
                  ref={previewCanvasRef}
                  width={canvasW}
                  height={canvasH}
                  className="preview-canvas"
                />
              </div>

              <div className="preview-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={togglePlayPreview}
                  disabled={exporting || !voiceoverUrl}
                >
                  {isPlaying ? (
                    <>
                      <Pause size={15} aria-hidden="true" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play size={15} aria-hidden="true" />
                      Play Preview
                    </>
                  )}
                </button>

                {!exporting ? (
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => void handleExportAndGenerateMetadata()}
                    disabled={!voiceoverUrl}
                  >
                    <Scissors size={15} aria-hidden="true" />
                    Render 2D Video &amp; Generate Metadata
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => exportAbortRef.current?.abort()}
                  >
                    <X size={15} aria-hidden="true" />
                    Cancel
                  </button>
                )}
              </div>

              {exporting && (
                <div className="export-progress" aria-live="polite">
                  <div className="progress-meta">
                    <span>
                      Rendering (
                      {aspectRatio === "9:16" ? "1080×1920" : "1920×1080"} · 30
                      fps · 10 Mbps)...
                    </span>
                    <span>{exportProgress}%</span>
                  </div>
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{ "--progress": `${exportProgress}%` } as CSSProperties}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. Pre-Publish Approval Gate -> YouTube Publish Agent */}
      {exportedVideo && !exporting && (
        <div className="faceless-section">
          <div className="section-subhead">
            <div>
              <h3>3. Pre-Publish Approval &amp; English Metadata</h3>
              <p>
                {generatingMetadata
                  ? "Analyzing frame and script for high-CTR English title and hashtags..."
                  : "Review the rendered 2D video, English title, hashtags, and thumbnail hook before approving for YouTube release."}
              </p>
            </div>
          </div>

          <div className="approval-grid">
            <div className="approval-media-col">
              <video
                src={exportedVideo.url}
                controls
                playsInline
                className={
                  aspectRatio === "9:16"
                    ? "publish-preview-video"
                    : "publish-preview-landscape"
                }
              />
              {capturedFrameUrl && (
                <div className="thumbnail-hook-card">
                  <div className="thumbnail-hook-preview">
                    <img
                      src={capturedFrameUrl}
                      alt="Rendered 2D frame preview"
                    />
                    {metadata.thumbnailHook && (
                      <span className="thumbnail-hook-overlay">
                        {metadata.thumbnailHook}
                      </span>
                    )}
                  </div>
                  <span className="control-hint">
                    Thumbnail Hook Overlay Preview
                  </span>
                </div>
              )}
            </div>

            <div className="publish-form-col">
              <div className="field-group">
                <label htmlFor="auto-yt-title">YouTube Title (English)</label>
                <div className="input-box">
                  <input
                    id="auto-yt-title"
                    type="text"
                    maxLength={100}
                    value={metadata.youtubeTitle}
                    onChange={(e) =>
                      setMetadata((m) => ({
                        ...m,
                        youtubeTitle: e.target.value,
                      }))
                    }
                    placeholder="High-CTR English YouTube title"
                  />
                </div>
              </div>

              <div className="field-group">
                <label htmlFor="auto-thumb-hook">Thumbnail Hook (2–5 words)</label>
                <div className="input-box">
                  <Film size={15} className="input-icon" aria-hidden="true" />
                  <input
                    id="auto-thumb-hook"
                    type="text"
                    maxLength={60}
                    value={metadata.thumbnailHook}
                    onChange={(e) =>
                      setMetadata((m) => ({
                        ...m,
                        thumbnailHook: e.target.value,
                      }))
                    }
                    placeholder="2–5 bold English words"
                  />
                </div>
              </div>

              <div className="field-group">
                <label htmlFor="auto-yt-caption">Caption &amp; Hashtags</label>
                <textarea
                  id="auto-yt-caption"
                  rows={3}
                  maxLength={2000}
                  className="textarea-box"
                  value={metadata.captionWithHashtags}
                  onChange={(e) =>
                    setMetadata((m) => ({
                      ...m,
                      captionWithHashtags: e.target.value,
                    }))
                  }
                  placeholder="English description and hashtags..."
                />
              </div>

              {activeSeriesLabel && (
                <div className="thumb-hook-note">
                  <span>Scheduled Series Slot (Approval Required)</span>
                  <strong>
                    {activeSeriesLabel}
                    {scheduledPublishAtIso
                      ? ` · ${new Date(scheduledPublishAtIso).toLocaleString("en-US")}`
                      : ""}
                  </strong>
                </div>
              )}

              <div className="upload-trigger-row">
                <button
                  type="button"
                  className="btn-primary"
                  disabled={generatingMetadata}
                  onClick={handleApprove}
                >
                  <Check size={15} aria-hidden="true" />
                  Approve &amp; Send to YouTube Publish
                </button>
                <a
                  href={exportedVideo.url}
                  download={exportedVideo.filename}
                  className="btn-secondary"
                >
                  <Download size={14} aria-hidden="true" />
                  Download Video ({Math.round(exportedVideo.durationSec)}s)
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
