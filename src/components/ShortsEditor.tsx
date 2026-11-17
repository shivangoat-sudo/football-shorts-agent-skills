import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
} from "react";
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Download,
  FileText,
  FileVideo2,
  Mic,
  Music,
  Pause,
  Play,
  RefreshCw,
  Scissors,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { formatTime } from "../lib/audioMoments";
import {
  drawReframedFrame,
  FILTER_PRESETS,
  resolveActiveCaption,
} from "../lib/frameRenderer";
import {
  analyzePodcastWithGemini,
  interpolateFrameState,
  probeVideoMetadata,
  trackPodcastClipKeyframes,
  type FocusKeyframe,
  type PodcastClipMoment,
  type TimedCaption,
} from "../lib/videoAnalyzer";
import {
  exportVerticalShort,
  type ExportedShortResult,
} from "../lib/shortExporter";

interface ShortsEditorProps {
  videoFile: File | null;
  videoUrl: string | null;
  sourceTitle?: string;
  exportedShort: ExportedShortResult | null;
  onSelectVideo: (file: File) => void;
  onExportComplete: (result: ExportedShortResult) => void;
  onBack: () => void;
  onNext: () => void;
  onNotice: (message: string) => void;
}

function serializeTimedCaptions(captions: TimedCaption[]): string {
  return captions
    .map(
      (c) =>
        `${c.startSec.toFixed(1)}-${c.endSec.toFixed(1)} | ${c.text}`
    )
    .join("\n");
}

function parseTimedCaptions(raw: string): TimedCaption[] {
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const parsed: TimedCaption[] = [];

  for (const line of lines) {
    const match = line.match(
      /^(\d+(?:[.,]\d+)?)\s*-\s*(\d+(?:[.,]\d+)?)\s*\|\s*(.+)$/
    );
    if (!match) continue;
    const startSec = Number(match[1].replace(",", "."));
    const endSec = Number(match[2].replace(",", "."));
    const text = match[3].trim();
    if (!Number.isNaN(startSec) && !Number.isNaN(endSec) && text) {
      parsed.push({ startSec, endSec: Math.max(startSec + 0.3, endSec), text });
    }
  }
  return parsed.sort((a, b) => a.startSec - b.startSec);
}

export default function ShortsEditor({
  videoFile,
  videoUrl,
  sourceTitle,
  exportedShort,
  onSelectVideo,
  onExportComplete,
  onBack,
  onNext,
  onNotice,
}: ShortsEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const musicInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const exportAbortRef = useRef<AbortController | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState(0);
  const [analyzeStage, setAnalyzeStage] = useState("");
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [filteredOutCount, setFilteredOutCount] = useState(0);
  const [detectedLanguage, setDetectedLanguage] = useState<string>("");
  const [trackingMode, setTrackingMode] = useState<
    "mediapipe-speaker" | "grid-motion"
  >("grid-motion");

  const [transcriptText, setTranscriptText] = useState("");
  const [showTranscriptBox, setShowTranscriptBox] = useState(false);

  const [durationSec, setDurationSec] = useState(0);
  const [dimensions, setDimensions] = useState<{ w: number; h: number } | null>(
    null
  );
  const [moments, setMoments] = useState<PodcastClipMoment[]>([]);
  const [selectedMomentId, setSelectedMomentId] = useState<string>("");

  const [startSec, setStartSec] = useState(0);
  const [clipDuration, setClipDuration] = useState(30);
  const [manualKeyframes, setManualKeyframes] = useState<FocusKeyframe[] | null>(
    null
  );
  const [retracking, setRetracking] = useState(false);
  const [autoTrack, setAutoTrack] = useState(true);
  const [manualCropX, setManualCropX] = useState(50);
  const [zoomMultiplier, setZoomMultiplier] = useState(1.0);
  const [liveFocus, setLiveFocus] = useState<FocusKeyframe>({
    timeSec: 0,
    focusXPercent: 50,
    focusYPercent: 38,
    zoom: 1.12,
  });

  const [selectedFilterId, setSelectedFilterId] = useState("crisp");
  const [captionsEnabled, setCaptionsEnabled] = useState(true);
  const [timedCaptionsRaw, setTimedCaptionsRaw] = useState("");
  const [fallbackCaption, setFallbackCaption] = useState("");
  const [musicFile, setMusicFile] = useState<File | null>(null);
  const [musicUrl, setMusicUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const activeMoment = useMemo(
    () => moments.find((m) => m.id === selectedMomentId) || null,
    [moments, selectedMomentId]
  );

  const activeTimedCaptions = useMemo(
    () => (captionsEnabled ? parseTimedCaptions(timedCaptionsRaw) : []),
    [captionsEnabled, timedCaptionsRaw]
  );

  const activeKeyframes = useMemo(
    () => manualKeyframes ?? activeMoment?.keyframes ?? [],
    [activeMoment, manualKeyframes]
  );

  const activeFilter = useMemo(
    () =>
      FILTER_PRESETS.find((f) => f.id === selectedFilterId) || FILTER_PRESETS[0],
    [selectedFilterId]
  );

  const effectiveClipDuration = useMemo(() => {
    if (durationSec <= 0) return clipDuration;
    const minBound = durationSec < 15 ? Math.max(3, Math.floor(durationSec)) : 15;
    return Math.min(Math.max(minBound, clipDuration), Math.min(58, Math.floor(durationSec)));
  }, [clipDuration, durationSec]);

  const maxStartSec = useMemo(() => {
    if (durationSec <= 0) return 0;
    return Math.max(0, Math.floor(durationSec - effectiveClipDuration));
  }, [durationSec, effectiveClipDuration]);

  const paintPreviewFrame = useCallback(() => {
    const vid = videoRef.current;
    const canvas = previewCanvasRef.current;
    if (!vid || !canvas || vid.readyState < 2) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const baseFocus =
      autoTrack && activeKeyframes.length > 0
        ? interpolateFrameState(
            activeKeyframes,
            vid.currentTime,
            manualCropX,
            38,
            1.12
          )
        : {
            timeSec: vid.currentTime,
            focusXPercent: manualCropX,
            focusYPercent: 38,
            zoom: 1,
          };

    const adjusted: FocusKeyframe = {
      ...baseFocus,
      zoom: Math.max(1, Math.min(1.9, baseFocus.zoom * zoomMultiplier)),
    };

    const captionToDraw = captionsEnabled
      ? resolveActiveCaption(activeTimedCaptions, vid.currentTime, fallbackCaption)
      : "";

    setLiveFocus(adjusted);
    drawReframedFrame(
      ctx,
      vid,
      canvas.width,
      canvas.height,
      adjusted,
      activeFilter.cssFilter,
      captionToDraw
    );
  }, [
    activeFilter.cssFilter,
    activeKeyframes,
    activeTimedCaptions,
    autoTrack,
    captionsEnabled,
    fallbackCaption,
    manualCropX,
    zoomMultiplier,
  ]);

  useEffect(() => {
    return () => {
      if (musicUrl) URL.revokeObjectURL(musicUrl);
    };
  }, [musicUrl]);

  useEffect(() => {
    return () => {
      exportAbortRef.current?.abort();
    };
  }, []);

  const runViralityAnalysis = useCallback(
    async (useTranscriptOverride?: string) => {
      if (!videoFile && !(useTranscriptOverride ?? transcriptText).trim()) return;

      setAnalyzing(true);
      setAnalyzeError(null);
      setAnalyzeProgress(6);
      setAnalyzeStage("Podcast-audio & transcript voorbereiden...");
      onNotice(
        "Gemini analyseert je podcast op hooks, retentie en virality-scores (≥ 75)..."
      );

      try {
        const res = await analyzePodcastWithGemini({
          file: videoFile,
          videoUrl,
          transcriptInput: useTranscriptOverride ?? transcriptText,
          sourceTitle,
          onProgress: (pct, label) => {
            setAnalyzeProgress(pct);
            setAnalyzeStage(label);
          },
        });

        setDurationSec(res.durationSec);
        setDimensions({ w: res.width, h: res.height });
        setTrackingMode(res.trackingMode);
        setDetectedLanguage(res.language);
        setFilteredOutCount(res.filteredOutCount);
        setMoments(res.clips);
        setManualKeyframes(null);
        if (res.transcript && !(useTranscriptOverride ?? transcriptText).trim()) {
          setTranscriptText(res.transcript);
        }

        if (res.clips.length > 0) {
          const best = res.clips[0];
          setSelectedMomentId(best.id);
          setStartSec(best.startSec);
          setClipDuration(best.durationSec);
          setTimedCaptionsRaw(serializeTimedCaptions(best.captions));
          setFallbackCaption(best.hookQuote || best.title);
          if (videoRef.current) {
            videoRef.current.currentTime = best.startSec;
          }
          onNotice(
            `${res.clips.length} virale podcast-clip(s) gevonden (score ≥ 75 · taal: ${res.language}).`
          );
        } else {
          setSelectedMomentId("");
          setTimedCaptionsRaw("");
          onNotice(
            "Geen fragmenten met viralScore ≥ 75 gevonden. Pas eventueel je transcript of tijdvenster handmatig aan."
          );
        }
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : "Gemini-analyse is mislukt.";
        setAnalyzeError(msg);
        onNotice(msg);
        if (videoUrl) {
          probeVideoMetadata(videoUrl)
            .then((meta) => {
              setDurationSec(meta.durationSec);
              setDimensions({ w: meta.width, h: meta.height });
            })
            .catch(() => {});
        }
      } finally {
        setAnalyzing(false);
      }
    },
    [onNotice, sourceTitle, transcriptText, videoFile, videoUrl]
  );

  // Automatically run Gemini podcast analysis when a new video file is loaded
  useEffect(() => {
    if (!videoFile || !videoUrl) {
      setMoments([]);
      setSelectedMomentId("");
      setDurationSec(0);
      setDimensions(null);
      setIsPlaying(false);
      setAnalyzeError(null);
      return;
    }

    setMoments([]);
    setSelectedMomentId("");
    setManualKeyframes(null);
    setFilteredOutCount(0);
    setDetectedLanguage("");
    void runViralityAnalysis("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoFile, videoUrl]);

  useEffect(() => {
    if (!isPlaying) {
      paintPreviewFrame();
    }
  }, [isPlaying, paintPreviewFrame]);

  useEffect(() => {
    if (!isPlaying) return;
    let raf = 0;

    const loop = () => {
      const vid = videoRef.current;
      if (vid && !vid.paused) {
        paintPreviewFrame();
        raf = requestAnimationFrame(loop);
      }
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, paintPreviewFrame]);

  function handleFilePicked(file: File | undefined) {
    if (!file) return;
    if (
      !file.type.startsWith("video/") &&
      !/\.(mp4|mov|webm|m4v)$/i.test(file.name)
    ) {
      onNotice("Kies een geldig videobestand (.mp4, .mov of .webm).");
      return;
    }
    onSelectVideo(file);
  }

  function handleMusicPicked(file: File | undefined) {
    if (!file) return;
    const nextUrl = URL.createObjectURL(file);
    setMusicFile(file);
    setMusicUrl(nextUrl);
    onNotice(`Achtergrondmuziek '${file.name}' toegevoegd.`);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    handleFilePicked(e.dataTransfer.files[0]);
  }

  function handleLoadedMetadata() {
    const vid = videoRef.current;
    if (!vid) return;
    if (!durationSec) setDurationSec(vid.duration || 0);
    if (!dimensions && vid.videoWidth && vid.videoHeight) {
      setDimensions({ w: vid.videoWidth, h: vid.videoHeight });
    }
  }

  function selectMoment(moment: PodcastClipMoment) {
    setSelectedMomentId(moment.id);
    setStartSec(moment.startSec);
    setClipDuration(moment.durationSec);
    setManualKeyframes(null);
    setTimedCaptionsRaw(serializeTimedCaptions(moment.captions));
    setFallbackCaption(moment.hookQuote || moment.title);
    if (videoRef.current) {
      videoRef.current.currentTime = moment.startSec;
    }
  }

  function seekPreview(timeSec: number) {
    setStartSec(timeSec);
    setManualKeyframes(null);
    if (videoRef.current) {
      videoRef.current.currentTime = timeSec;
    }
  }

  async function handleRetrackSpeakers() {
    if (!videoUrl || retracking) return;
    setRetracking(true);
    try {
      const res = await trackPodcastClipKeyframes(
        videoUrl,
        startSec,
        startSec + effectiveClipDuration,
        dimensions?.h || 1080
      );
      setTrackingMode(res.trackingMode);
      setManualKeyframes(res.keyframes);
      onNotice("Spreker-tracking bijgewerkt voor dit tijdvenster.");
    } catch (err) {
      onNotice(
        err instanceof Error ? err.message : "Spreker-tracking bijwerken mislukt."
      );
    } finally {
      setRetracking(false);
    }
  }

  function togglePlaySegment() {
    const vid = videoRef.current;
    if (!vid) return;

    if (!vid.paused) {
      vid.pause();
      setIsPlaying(false);
      return;
    }

    if (
      vid.currentTime < startSec ||
      vid.currentTime >= startSec + effectiveClipDuration
    ) {
      vid.currentTime = startSec;
    }
    vid
      .play()
      .then(() => setIsPlaying(true))
      .catch(() => setIsPlaying(false));
  }

  function handleTimeUpdate() {
    const vid = videoRef.current;
    if (!vid) return;
    if (!vid.paused && vid.currentTime >= startSec + effectiveClipDuration) {
      vid.pause();
      vid.currentTime = startSec;
      setIsPlaying(false);
    }
  }

  async function handleExport() {
    if (!videoUrl || exporting) return;

    if (videoRef.current && !videoRef.current.paused) {
      videoRef.current.pause();
      setIsPlaying(false);
    }

    const controller = new AbortController();
    exportAbortRef.current = controller;
    setExporting(true);
    setExportProgress(0);
    onNotice(
      "Full HD Podcast Short (1080×1920) wordt met spreker-tracking en ondertitels gerenderd..."
    );

    try {
      const result = await exportVerticalShort({
        videoUrl,
        startSec,
        durationSec: effectiveClipDuration,
        keyframes:
          activeKeyframes.length > 0
            ? activeKeyframes
            : [{ timeSec: startSec, focusXPercent: manualCropX, focusYPercent: 38, zoom: 1.12 }],
        fallbackCropXPercent: manualCropX,
        autoTrackEnabled: autoTrack,
        zoomMultiplier,
        filterCss: activeFilter.cssFilter,
        caption: captionsEnabled ? fallbackCaption : "",
        timedCaptions: activeTimedCaptions,
        musicUrl,
        onProgress: setExportProgress,
        signal: controller.signal,
      });
      onExportComplete({
        ...result,
        suggestedTitle: activeMoment?.title,
      });
      onNotice("Full HD Podcast Short is klaar om te downloaden of te publiceren.");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Exporteren is mislukt.";
      onNotice(msg);
    } finally {
      setExporting(false);
      exportAbortRef.current = null;
    }
  }

  return (
    <section className="card" aria-labelledby="stage-edit-title">
      <div className="card-header">
        <div className="card-icon" aria-hidden="true">
          <Mic size={18} />
        </div>
        <div>
          <h2 id="stage-edit-title">Podcast Virality Shorts-editor</h2>
          <p>
            Transcribeert de video, detecteert bewezen hooks (15–58s), scoort op
            4 pijlers (≥ 75/100) en volgt sprekers automatisch in 9:16.
          </p>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime,video/*"
        className="sr-only"
        onChange={(e) => {
          handleFilePicked(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

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

      {!videoFile || !videoUrl ? (
        <div
          className={`dropzone ${isDragging ? "is-dragging" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <div className="empty-icon" aria-hidden="true">
            <Upload size={20} />
          </div>
          <h3>Kies een podcast- of spoken-word video</h3>
          <p>
            Sleep een .mp4-, .mov- of .webm-bestand hierheen. Gemini haalt
            zelfstandige virale hooks (15–58s, score ≥ 75) eruit met getimede
            ondertitels en automatische spreker-framing.
          </p>
          <button
            type="button"
            className="btn-primary dropzone-btn"
            onClick={() => fileInputRef.current?.click()}
          >
            <FileVideo2 size={15} aria-hidden="true" />
            Podcastvideo kiezen
          </button>
        </div>
      ) : (
        <div className="editor-workspace">
          <div className="editor-filebar">
            <div className="filebar-info">
              <FileVideo2 size={16} aria-hidden="true" />
              <span className="filebar-name" title={videoFile.name}>
                {videoFile.name}
              </span>
              <span className="filebar-meta">
                {durationSec > 0 ? formatTime(durationSec) : "Laden..."}
                {dimensions ? ` · ${dimensions.w}×${dimensions.h}` : ""}
                {detectedLanguage ? ` · ${detectedLanguage}` : ""}
              </span>
            </div>
            <div className="filebar-actions">
              <button
                type="button"
                className="btn-secondary btn-compact"
                onClick={() => setShowTranscriptBox((v) => !v)}
                disabled={exporting || analyzing}
              >
                <FileText size={13} aria-hidden="true" />
                {showTranscriptBox ? "Transcript verbergen" : "Transcript / heranalyse"}
              </button>
              <button
                type="button"
                className="btn-secondary btn-compact"
                onClick={() => fileInputRef.current?.click()}
                disabled={exporting || analyzing}
              >
                Andere video
              </button>
            </div>
          </div>

          {showTranscriptBox && (
            <div className="transcript-panel">
              <div className="control-header">
                <label htmlFor="podcast-transcript">
                  Transcript met tijdstempels (optioneel voor snellere of eigen analyse)
                </label>
                <button
                  type="button"
                  className="btn-primary btn-compact"
                  disabled={analyzing || exporting}
                  onClick={() => void runViralityAnalysis(transcriptText)}
                >
                  <Sparkles size={13} aria-hidden="true" />
                  Analyseer op virale hooks
                </button>
              </div>
              <textarea
                id="podcast-transcript"
                rows={4}
                className="textarea-box"
                value={transcriptText}
                disabled={analyzing || exporting}
                onChange={(e) => setTranscriptText(e.target.value)}
                placeholder="[00:12] Stop met wachten op motivatie als je..."
              />
            </div>
          )}

          {analyzing && (
            <div className="analyze-banner" aria-live="polite">
              <div className="progress-meta">
                <span>
                  <Sparkles size={13} aria-hidden="true" /> {analyzeStage}
                </span>
                <span>{analyzeProgress}%</span>
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{ "--progress": `${analyzeProgress}%` } as CSSProperties}
                />
              </div>
            </div>
          )}

          {analyzeError && !analyzing && (
            <div className="error-banner" role="alert">
              <AlertCircle size={15} aria-hidden="true" />
              <span>{analyzeError}</span>
            </div>
          )}

          <div className="editor-grid">
            <div className="editor-controls">
              <div className="control-block">
                <div className="control-header">
                  <label>Virale fragmenten (score ≥ 75)</label>
                  <span className="control-value">
                    {moments.length > 0
                      ? `${moments.length} geselecteerd · ${
                          trackingMode === "mediapipe-speaker" ? "AI Spreker" : "Motion"
                        }`
                      : filteredOutCount > 0
                        ? `${filteredOutCount} afgekeurd (<75)`
                        : "Geen ≥ 75"}
                  </span>
                </div>

                {moments.length > 0 ? (
                  <div className="moments-list">
                    {moments.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        className={`moment-row ${
                          selectedMomentId === m.id ? "is-selected" : ""
                        }`}
                        onClick={() => selectMoment(m)}
                        disabled={exporting || analyzing}
                      >
                        <span className="moment-time">
                          {formatTime(m.startSec)} – {formatTime(m.endSec)}
                        </span>
                        <span className="moment-main">
                          <span className="moment-label">{m.title}</span>
                          <span className="moment-sub">
                            {m.hookType} · {m.durationSec}s
                          </span>
                        </span>
                        <span className="moment-score">{m.viralScore}/100</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="control-hint">
                    {analyzing
                      ? "Bezig met transcriberen en scoren op hook-kracht, retentie, deelbaarheid en zelfstandigheid..."
                      : "Geen clips met virality-score ≥ 75. Pas het transcript of het tijdvenster hieronder handmatig aan."}
                  </p>
                )}

                {activeMoment && (
                  <div className="score-breakdown">
                    <div className="score-grid">
                      <div className="score-cell">
                        <span>Hook-kracht</span>
                        <strong>{activeMoment.scores.hook}/25</strong>
                      </div>
                      <div className="score-cell">
                        <span>Retentie</span>
                        <strong>{activeMoment.scores.retentionPacing}/25</strong>
                      </div>
                      <div className="score-cell">
                        <span>Deelbaarheid</span>
                        <strong>{activeMoment.scores.shareabilityEmotion}/25</strong>
                      </div>
                      <div className="score-cell">
                        <span>Zelfstandig</span>
                        <strong>{activeMoment.scores.standalone}/25</strong>
                      </div>
                    </div>
                    {activeMoment.hookQuote && (
                      <p className="hook-quote">
                        Openingshook: “{activeMoment.hookQuote}”
                      </p>
                    )}
                    {activeMoment.reason && (
                      <p className="control-hint">{activeMoment.reason}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="control-block">
                <div className="control-header">
                  <label htmlFor="start-time-range">Tijdvenster &amp; clipduur (15–58s)</label>
                  <span className="control-value">
                    {formatTime(startSec)} –{" "}
                    {formatTime(startSec + effectiveClipDuration)} (
                    {effectiveClipDuration}s)
                  </span>
                </div>
                <input
                  id="start-time-range"
                  type="range"
                  className="range-input"
                  min={0}
                  max={maxStartSec}
                  step={1}
                  value={startSec}
                  disabled={exporting || analyzing || maxStartSec === 0}
                  onChange={(e) => seekPreview(Number(e.target.value))}
                />
                <div className="control-header control-subrow">
                  <span className="control-hint">Clipduur: {effectiveClipDuration}s</span>
                  <button
                    type="button"
                    className="link-action"
                    onClick={() => void handleRetrackSpeakers()}
                    disabled={exporting || analyzing || retracking}
                  >
                    <RefreshCw size={12} aria-hidden="true" />
                    {retracking ? "Tracking bijwerken..." : "Spreker-tracking bijwerken"}
                  </button>
                </div>
                <input
                  id="clip-dur-range"
                  type="range"
                  className="range-input"
                  min={durationSec > 0 && durationSec < 15 ? Math.max(3, Math.floor(durationSec)) : 15}
                  max={durationSec > 0 ? Math.min(58, Math.max(15, Math.floor(durationSec))) : 58}
                  step={1}
                  value={effectiveClipDuration}
                  disabled={exporting || analyzing}
                  onChange={(e) => {
                    setClipDuration(Number(e.target.value));
                    setManualKeyframes(null);
                  }}
                />
              </div>

              <div className="control-block">
                <div className="control-header">
                  <label>9:16 Spreker-framing</label>
                  <button
                    type="button"
                    className="link-action"
                    onClick={() => setAutoTrack((v) => !v)}
                    disabled={exporting || analyzing}
                  >
                    {autoTrack ? "Automatisch volgen: Aan" : "Handmatige uitsnede"}
                  </button>
                </div>

                {!autoTrack ? (
                  <input
                    id="crop-x-range"
                    type="range"
                    className="range-input"
                    min={0}
                    max={100}
                    step={1}
                    value={manualCropX}
                    disabled={exporting}
                    onChange={(e) => setManualCropX(Number(e.target.value))}
                  />
                ) : (
                  <p className="control-hint">
                    Focus: {Math.round(liveFocus.focusXPercent)}% horizontaal ·{" "}
                    {liveFocus.zoom.toFixed(2)}× zoom
                  </p>
                )}

                <div className="control-header control-subrow">
                  <label htmlFor="zoom-range">Zoom-intensiteit</label>
                  <span className="control-value">
                    {Math.round(zoomMultiplier * 100)}%
                  </span>
                </div>
                <input
                  id="zoom-range"
                  type="range"
                  className="range-input"
                  min={0.85}
                  max={1.45}
                  step={0.05}
                  value={zoomMultiplier}
                  disabled={exporting}
                  onChange={(e) => setZoomMultiplier(Number(e.target.value))}
                />
              </div>

              <div className="control-block">
                <label>Beeldkwaliteit &amp; kleur</label>
                <div className="segmented-group" role="group" aria-label="Beeldfilter">
                  {FILTER_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      className={`segmented-btn ${
                        selectedFilterId === preset.id ? "is-active" : ""
                      }`}
                      onClick={() => setSelectedFilterId(preset.id)}
                      disabled={exporting}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="control-block">
                <div className="control-header">
                  <label htmlFor="timed-captions-input">
                    Getimede ondertitels ({detectedLanguage || "zelfde taal als spraak"})
                  </label>
                  <button
                    type="button"
                    className="link-action"
                    onClick={() => setCaptionsEnabled((v) => !v)}
                    disabled={exporting}
                  >
                    {captionsEnabled ? "Ondertitels: Aan" : "Ondertitels: Uit"}
                  </button>
                </div>
                {timedCaptionsRaw.trim() ? (
                  <textarea
                    id="timed-captions-input"
                    rows={4}
                    className="textarea-box mono-textarea"
                    value={timedCaptionsRaw}
                    disabled={exporting || !captionsEnabled}
                    onChange={(e) => setTimedCaptionsRaw(e.target.value)}
                    placeholder="start-eind | korte ondertiteltekst"
                  />
                ) : (
                  <div className="input-box">
                    <input
                      id="caption-input"
                      type="text"
                      maxLength={90}
                      value={fallbackCaption}
                      disabled={exporting || !captionsEnabled}
                      onChange={(e) => setFallbackCaption(e.target.value)}
                      placeholder="Korte openingshook of ondertitel in beeld"
                    />
                  </div>
                )}
              </div>

              <div className="control-block">
                <div className="control-header">
                  <label>Achtergrondmuziek (optioneel)</label>
                  {musicFile ? (
                    <button
                      type="button"
                      className="link-action"
                      onClick={() => {
                        setMusicFile(null);
                        setMusicUrl(null);
                      }}
                      disabled={exporting}
                    >
                      Verwijderen
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="link-action"
                      onClick={() => musicInputRef.current?.click()}
                      disabled={exporting}
                    >
                      <Music size={13} aria-hidden="true" />
                      Muziekbestand kiezen
                    </button>
                  )}
                </div>
                <p className="control-hint">
                  {musicFile
                    ? `Wordt zacht meegemixt: ${musicFile.name}`
                    : "Kies een eigen .mp3/.wav om zacht onder het stemgeluid te mixen."}
                </p>
              </div>
            </div>

            <div className="editor-preview-col">
              <div className="phone-frame">
                <video
                  ref={videoRef}
                  src={videoUrl}
                  playsInline
                  className="sr-only-video"
                  onLoadedMetadata={handleLoadedMetadata}
                  onLoadedData={paintPreviewFrame}
                  onSeeked={paintPreviewFrame}
                  onTimeUpdate={handleTimeUpdate}
                  onEnded={() => setIsPlaying(false)}
                />
                <canvas
                  ref={previewCanvasRef}
                  width={540}
                  height={960}
                  className="preview-canvas"
                />
              </div>

              <div className="preview-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={togglePlaySegment}
                  disabled={exporting || analyzing}
                >
                  {isPlaying ? (
                    <>
                      <Pause size={15} aria-hidden="true" />
                      Pauzeren
                    </>
                  ) : (
                    <>
                      <Play size={15} aria-hidden="true" />
                      Voorbeeld afspelen
                    </>
                  )}
                </button>

                {!exporting ? (
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleExport}
                    disabled={analyzing}
                  >
                    <Scissors size={15} aria-hidden="true" />
                    Exporteer 1080p Short
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => exportAbortRef.current?.abort()}
                  >
                    <X size={15} aria-hidden="true" />
                    Annuleren
                  </button>
                )}
              </div>

              {exporting && (
                <div className="export-progress" aria-live="polite">
                  <div className="progress-meta">
                    <span>Full HD 9:16 opnemen (10 Mbps)...</span>
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

              {exportedShort && !exporting && (
                <div className="export-ready">
                  <div className="export-ready-info">
                    <Activity size={15} aria-hidden="true" />
                    <div>
                      <strong>{exportedShort.filename}</strong>
                      <span>
                        {Math.round(exportedShort.durationSec)}s · 1080×1920 Full HD
                      </span>
                    </div>
                  </div>
                  <a
                    href={exportedShort.url}
                    download={exportedShort.filename}
                    className="btn-primary btn-compact"
                  >
                    <Download size={14} aria-hidden="true" />
                    Downloaden
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="card-footer">
        <button
          type="button"
          className="btn-secondary"
          onClick={onBack}
          disabled={exporting}
        >
          <ArrowLeft size={15} aria-hidden="true" />
          Terug
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={onNext}
          disabled={exporting}
        >
          Naar publiceren
          <ArrowRight size={15} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
