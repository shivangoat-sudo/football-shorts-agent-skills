import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Check,
  Info,
  LockKeyhole,
  Radio,
  Search,
  ShieldCheck,
  Sparkles,
  Youtube,
} from "lucide-react";
import FacelessEditor from "./components/FacelessEditor";
import ShortsEditor from "./components/ShortsEditor";
import YouTubePublishPanel from "./components/YouTubePublishPanel";
import YouTubeStudioBar from "./components/YouTubeStudioBar";
import type { ExportedShortResult } from "./lib/shortExporter";
import {
  fetchAuthenticatedChannels,
  fetchChannelStudioSnapshot,
  fetchChannelWithRecentVideos,
  type YouTubeChannelInfo,
  type YouTubeStudioSnapshot,
  type YouTubeVideoItem,
} from "./lib/youtubeApi";
import {
  initYouTubeAuth,
  isEmbeddedIframe,
  signInWithYouTube,
  signInWithYouTubeRedirect,
  signOutYouTube,
  YouTubeAuthError,
  type YouTubeAuthFailureInfo,
  type YouTubeAuthUser,
} from "./lib/youtubeAuth";

type Stage = "source" | "edit" | "publish";

interface StepConfig {
  id: Stage;
  label: string;
  number: string;
  summary: string;
}

const STEPS: StepConfig[] = [
  { id: "edit", label: "Series Studio", number: "01", summary: "Make Series & 2D" },
  { id: "source", label: "Podcast Source", number: "02", summary: "Channel & Clips" },
  { id: "publish", label: "Publish", number: "03", summary: "YouTube Upload" },
];

export default function App() {
  const [channel, setChannel] = useState("");
  const [resolvedSource, setResolvedSource] = useState<YouTubeChannelInfo | null>(
    null
  );
  const [sourceVideos, setSourceVideos] = useState<YouTubeVideoItem[]>([]);
  const [selectedSourceVideo, setSelectedSourceVideo] =
    useState<YouTubeVideoItem | null>(null);
  const [resolvingSource, setResolvingSource] = useState(false);

  const [stage, setStage] = useState<Stage>("edit");
  const [editorMode, setEditorMode] = useState<"faceless" | "podcast">("faceless");
  const [notice, setNotice] = useState(
    "Series Studio ready. Trigger Make Series to build a 5-min Sunday video + 6 point-mapped Mon–Sat Shorts."
  );

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [exportedShort, setExportedShort] = useState<ExportedShortResult | null>(
    null
  );

  // YouTube OAuth & Studio stats state (access token cached in memory only)
  const [authUser, setAuthUser] = useState<YouTubeAuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [myChannels, setMyChannels] = useState<YouTubeChannelInfo[]>([]);
  const [activeStudioChannelId, setActiveStudioChannelId] = useState<string | null>(
    null
  );
  const [confirmedChannelId, setConfirmedChannelId] = useState<string | null>(
    null
  );
  const [studioSnapshot, setStudioSnapshot] =
    useState<YouTubeStudioSnapshot | null>(null);
  const [loadingSnapshot, setLoadingSnapshot] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<YouTubeAuthFailureInfo | null>(
    null
  );
  const [viralLaunchTrigger, setViralLaunchTrigger] = useState(0);

  async function hydrateYouTubeSession(user: YouTubeAuthUser, token: string) {
    setAuthError(null);
    setAuthUser(user);
    setAccessToken(token);
    try {
      const channels = await fetchAuthenticatedChannels(token);
      setMyChannels(channels);
      setConfirmedChannelId(null);
      if (channels.length > 0) {
        const primary = channels[0];
        setActiveStudioChannelId(primary.id);
        setNotice(
          `YouTube Studio connected: ${primary.title}. Loading recent metrics...`
        );
        await loadStudioSnapshotForChannel(token, primary);
        setNotice(
          `YouTube Studio active (${primary.title}). Confirm your channel or run the Performance Loop.`
        );
      } else {
        setActiveStudioChannelId(null);
        setStudioSnapshot(null);
        setNotice("Signed in to Google, but no YouTube channel was found.");
      }
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Could not load your connected YouTube channel.";
      setAuthError({
        message: msg,
        suggestFullTab: false,
        suggestRedirect: false,
      });
      setNotice(msg);
    }
  }

  useEffect(() => {
    const unsubscribe = initYouTubeAuth(
      (user, token) => {
        void hydrateYouTubeSession(user, token);
      },
      (user) => {
        setAuthUser(user);
        setAccessToken(null);
        setMyChannels([]);
        setActiveStudioChannelId(null);
        setConfirmedChannelId(null);
        setStudioSnapshot(null);
      },
      (err) => {
        setAuthError({
          message: err.message,
          code: err.code,
          suggestFullTab: err.suggestFullTab,
          suggestRedirect: err.suggestRedirect,
        });
        setNotice(err.message);
      }
    );
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, [videoUrl]);

  useEffect(() => {
    return () => {
      if (exportedShort?.url) URL.revokeObjectURL(exportedShort.url);
    };
  }, [exportedShort]);

  const validChannel = useMemo(() => {
    const trimmed = channel.trim();
    if (!trimmed) return false;
    return (
      /youtube\.com\/(channel\/|@|c\/|user\/)|youtu\.be\//i.test(trimmed) ||
      /^@[a-zA-Z0-9._-]{3,}$/.test(trimmed) ||
      /^UC[a-zA-Z0-9_-]{20,}$/.test(trimmed)
    );
  }, [channel]);

  const currentStepIndex = STEPS.findIndex((s) => s.id === stage);
  const currentStep = STEPS[currentStepIndex] || STEPS[0];

  const sourceCompleted = channel.trim().length > 0;
  const editCompleted = exportedShort !== null;

  function isStepDone(id: Stage): boolean {
    if (id === "source") return sourceCompleted && stage !== "source";
    if (id === "edit") return editCompleted && stage !== "edit";
    return false;
  }

  async function loadStudioSnapshotForChannel(
    token: string,
    targetChannel: YouTubeChannelInfo
  ) {
    setLoadingSnapshot(true);
    try {
      const snapshot = await fetchChannelStudioSnapshot(token, targetChannel, 20);
      setStudioSnapshot(snapshot);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Could not load recent YouTube metrics.";
      setNotice(msg);
    } finally {
      setLoadingSnapshot(false);
    }
  }

  async function handleYouTubeSignIn() {
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      const { user, accessToken: token } = await signInWithYouTube();
      await hydrateYouTubeSession(user, token);
    } catch (err) {
      if (err instanceof YouTubeAuthError) {
        setAuthError({
          message: err.message,
          code: err.code,
          suggestFullTab: err.suggestFullTab,
          suggestRedirect: err.suggestRedirect,
        });
        setNotice(err.message);
      } else {
        const msg =
          err instanceof Error
            ? err.message
            : "Connecting to YouTube failed.";
        setAuthError({
          message: msg,
          suggestFullTab: isEmbeddedIframe(),
          suggestRedirect: !isEmbeddedIframe(),
        });
        setNotice(msg);
      }
    } finally {
      setIsAuthenticating(false);
    }
  }

  async function handleYouTubeRedirectSignIn() {
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      await signInWithYouTubeRedirect();
    } catch (err) {
      setIsAuthenticating(false);
      if (err instanceof YouTubeAuthError) {
        setAuthError({
          message: err.message,
          code: err.code,
          suggestFullTab: err.suggestFullTab,
          suggestRedirect: err.suggestRedirect,
        });
        setNotice(err.message);
      } else {
        const msg =
          err instanceof Error ? err.message : "Redirect sign-in failed.";
        setAuthError({ message: msg });
        setNotice(msg);
      }
    }
  }

  async function handleYouTubeSignOut() {
    await signOutYouTube();
    setAuthUser(null);
    setAccessToken(null);
    setMyChannels([]);
    setActiveStudioChannelId(null);
    setConfirmedChannelId(null);
    setStudioSnapshot(null);
    setAuthError(null);
    setNotice("Disconnected from YouTube.");
  }

  function handleSelectStudioChannel(channelId: string) {
    setActiveStudioChannelId(channelId);
    const ch = myChannels.find((c) => c.id === channelId);
    if (ch && accessToken) {
      void loadStudioSnapshotForChannel(accessToken, ch);
    }
  }

  function handleRefreshStudioStats() {
    const ch =
      myChannels.find((c) => c.id === (activeStudioChannelId || confirmedChannelId)) ||
      myChannels[0];
    if (ch && accessToken) {
      void loadStudioSnapshotForChannel(accessToken, ch);
    }
  }

  function handleConfirmChannel(channelId: string) {
    setConfirmedChannelId(channelId);
    setActiveStudioChannelId(channelId);
    const ch = myChannels.find((c) => c.id === channelId);
    setNotice(
      ch
        ? `Destination channel verified: ${ch.title} (${ch.id}).`
        : "Destination channel verified."
    );
  }

  function handleStartViralVideo() {
    setEditorMode("faceless");
    setStage("edit");
    setViralLaunchTrigger((n) => n + 1);
  }

  async function handleResolveSource() {
    if (!channel.trim()) {
      setNotice("Enter a YouTube channel URL or @handle first.");
      return;
    }
    if (!accessToken) {
      setNotice(
        "Connect your YouTube account first (under Publish) to browse uploads."
      );
      return;
    }
    setResolvingSource(true);
    try {
      const res = await fetchChannelWithRecentVideos(accessToken, channel, 8, 181);
      setResolvedSource(res?.channel || null);
      setSourceVideos(res?.videos || []);
      setSelectedSourceVideo(null);
      if (res?.channel) {
        setNotice(
          res.videos.length > 0
            ? `Channel resolved: ${res.channel.title} (${res.videos.length} videos > 3 min loaded).`
            : `Channel resolved: ${res.channel.title}, no long-form uploads (> 3 min) found recently.`
        );
      } else {
        setNotice("No matching YouTube channel found.");
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Channel resolution failed.";
      setNotice(msg);
    } finally {
      setResolvingSource(false);
    }
  }

  function connectSource() {
    if (!channel.trim()) {
      setNotice("Enter a YouTube channel URL or @handle first.");
      return;
    }
    setNotice(
      "Source reference saved for this session. Load the licensed local file in the editor."
    );
    setStage("edit");
  }

  function handleSelectVideo(file: File) {
    const nextUrl = URL.createObjectURL(file);
    setVideoFile(file);
    setVideoUrl(nextUrl);
    setExportedShort(null);
  }

  function handleExportComplete(result: ExportedShortResult) {
    setExportedShort(result);
  }

  function handleFacelessApproved(result: ExportedShortResult) {
    setExportedShort(result);
    setNotice(
      "Video and English metadata approved. Confirm destination channel to upload."
    );
    setStage("publish");
  }

  const confirmedChannel =
    myChannels.find((c) => c.id === confirmedChannelId) || null;
  const activeStudioChannel =
    myChannels.find((c) => c.id === (activeStudioChannelId || confirmedChannelId)) ||
    myChannels[0] ||
    null;

  return (
    <div className="app-shell">
      <svg className="sr-only" aria-hidden="true">
        <defs>
          <filter id="touchline-sharpen" x="0%" y="0%" width="100%" height="100%">
            <feConvolveMatrix
              order="3"
              kernelMatrix="0 -0.25 0 -0.25 2.0 -0.25 0 -0.25 0"
              preserveAlpha="true"
            />
          </filter>
        </defs>
      </svg>
      <aside className="sidebar" aria-label="Workflow navigation">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            <Activity size={18} strokeWidth={2} />
          </div>
          <div className="brand-text">
            <span className="brand-name">Touchline</span>
            <span className="brand-sub">Studio</span>
          </div>
        </div>

        <div className="sidebar-section-label">Production Pipeline</div>
        <nav className="sidebar-nav">
          {STEPS.map((step) => {
            const active = stage === step.id;
            const done = isStepDone(step.id);
            return (
              <button
                key={step.id}
                type="button"
                className={`nav-item ${active ? "is-active" : ""}`}
                onClick={() => setStage(step.id)}
                aria-current={active ? "step" : undefined}
              >
                <span className={`nav-index ${done ? "is-done" : ""}`}>
                  {done ? <Check size={12} strokeWidth={2.5} /> : step.number}
                </span>
                <span className="nav-copy">
                  <span className="nav-label">{step.label}</span>
                  <span className="nav-summary">{step.summary}</span>
                </span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-policy">
            <LockKeyhole size={14} aria-hidden="true" />
            <span>Local 2D Render · Gemini AI</span>
          </div>
          <div className="sidebar-meta">
            {confirmedChannel
              ? `Channel: ${confirmedChannel.title}`
              : "English Series Producer"}
          </div>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Touchline Studio</span>
            <span className="sep" aria-hidden="true">
              /
            </span>
            <span className="crumb-current">{currentStep.label}</span>
          </div>
          <div className="topbar-meta">
            <span>
              {confirmedChannel
                ? `Verified: ${confirmedChannel.title}`
                : "Pre-publish confirmation enforced"}
            </span>
          </div>
        </header>

        <main className="main-container">
          <YouTubeStudioBar
            authUser={authUser}
            accessToken={accessToken}
            authError={authError}
            channels={myChannels}
            activeChannel={activeStudioChannel}
            confirmedChannelId={confirmedChannelId}
            studioSnapshot={studioSnapshot}
            loadingSnapshot={loadingSnapshot}
            isAuthenticating={isAuthenticating}
            onSignIn={handleYouTubeSignIn}
            onRedirectSignIn={handleYouTubeRedirectSignIn}
            onSignOut={handleYouTubeSignOut}
            onSelectChannel={handleSelectStudioChannel}
            onConfirmChannel={handleConfirmChannel}
            onRefreshStats={handleRefreshStudioStats}
            onStartViralVideo={handleStartViralVideo}
          />

          <div className="page-header">
            <div className="step-kicker">
              Step {currentStep.number} of 03 · {currentStep.label}
            </div>
            <h1>Autonomous English Series &amp; 2D Animation Director</h1>
            <p className="page-subtitle">
              Generate cohesive 5-minute Sunday episodes and 6 point-mapped
              Mon–Sat Shorts in calm white &amp; warm gold line-art on pitch black,
              then refine every season through the Performance Feedback Loop.
            </p>
          </div>

          {stage === "source" && (
            <section className="card" aria-labelledby="stage-source-title">
              <div className="card-header">
                <div className="card-icon" aria-hidden="true">
                  <Youtube size={18} />
                </div>
                <div>
                  <h2 id="stage-source-title">Connect Podcast Channel Source</h2>
                  <p>
                    Resolve an official YouTube channel identity or switch straight
                    to the Series Studio to build 2D animations.
                  </p>
                </div>
              </div>

              <div className="field-group">
                <label htmlFor="channel-input">YouTube Channel URL or @handle</label>
                <div className="input-row-with-btn">
                  <div className="input-box input-flex">
                    <Youtube size={16} className="input-icon" aria-hidden="true" />
                    <input
                      id="channel-input"
                      type="text"
                      value={channel}
                      onChange={(e) => {
                        setChannel(e.target.value);
                        setResolvedSource(null);
                        setSourceVideos([]);
                        setSelectedSourceVideo(null);
                      }}
                      placeholder="https://youtube.com/@yourchannel or @yourchannel"
                    />
                  </div>
                  {accessToken ? (
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={handleResolveSource}
                      disabled={resolvingSource}
                    >
                      <Search size={14} aria-hidden="true" />
                      {resolvingSource ? "Loading..." : "Inspect Videos"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setStage("publish")}
                    >
                      Connect YouTube
                    </button>
                  )}
                </div>
                <p className="field-hint">
                  {channel.trim()
                    ? validChannel
                      ? accessToken
                        ? "Click 'Inspect Videos' to view recent long-form uploads."
                        : "Connect your YouTube account first to resolve channel uploads."
                      : "Use a valid youtube.com channel URL, ID, or @handle."
                    : "Supports channel URLs, channel IDs, and @handles via official YouTube API."}
                </p>

                {resolvedSource && (
                  <div className="resolved-source-row">
                    {resolvedSource.thumbnailUrl && (
                      <img
                        src={resolvedSource.thumbnailUrl}
                        alt={resolvedSource.title}
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <div>
                      <strong>{resolvedSource.title}</strong>
                      <span>
                        {resolvedSource.customUrl
                          ? `${resolvedSource.customUrl} · `
                          : ""}
                        {resolvedSource.id}
                      </span>
                    </div>
                  </div>
                )}

                {sourceVideos.length > 0 && (
                  <div className="source-videos-block">
                    <div className="source-videos-head">
                      <span>Recent long-form videos (&gt; 3 min)</span>
                      <span>Load your authorized local file in the editor next</span>
                    </div>
                    <div className="source-videos-list">
                      {sourceVideos.map((vid) => (
                        <button
                          key={vid.id}
                          type="button"
                          className={`source-video-row ${
                            selectedSourceVideo?.id === vid.id ? "is-selected" : ""
                          }`}
                          onClick={() => {
                            setSelectedSourceVideo(vid);
                            setEditorMode("podcast");
                            setNotice(
                              `Selected video: '${vid.title}'. Load the authorized media file in Podcast Clips.`
                            );
                            setStage("edit");
                          }}
                        >
                          {vid.thumbnailUrl && (
                            <img
                              src={vid.thumbnailUrl}
                              alt={vid.title}
                              referrerPolicy="no-referrer"
                            />
                          )}
                          <div className="source-video-meta">
                            <strong>{vid.title}</strong>
                            <span>
                              {vid.durationLabel ? `${vid.durationLabel} · ` : ""}
                              {vid.publishedAt
                                ? new Date(vid.publishedAt).toLocaleDateString("en-US")
                                : "YouTube upload"}
                            </span>
                          </div>
                          <ArrowRight size={14} aria-hidden="true" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="card-footer">
                <span className="quiet-assurance">
                  <ShieldCheck size={15} aria-hidden="true" />
                  Official YouTube APIs only · No scraping
                </span>
                <div className="footer-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setEditorMode("faceless");
                      setStage("edit");
                    }}
                  >
                    <Sparkles size={15} aria-hidden="true" />
                    Open Series Studio
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={connectSource}
                  >
                    Save Source
                    <ArrowRight size={15} aria-hidden="true" />
                  </button>
                </div>
              </div>
            </section>
          )}

          <div hidden={stage !== "edit"}>
            <div className="editor-mode-shell">
              <div className="mode-switcher-bar">
                <div className="segmented-group" role="tablist" aria-label="Editor mode">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={editorMode === "faceless"}
                    className={`segmented-btn ${
                      editorMode === "faceless" ? "is-active" : ""
                    }`}
                    onClick={() => setEditorMode("faceless")}
                  >
                    Series &amp; 2D Animation Studio
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={editorMode === "podcast"}
                    className={`segmented-btn ${
                      editorMode === "podcast" ? "is-active" : ""
                    }`}
                    onClick={() => setEditorMode("podcast")}
                  >
                    Podcast Virality Clips
                  </button>
                </div>
                <span className="control-hint">
                  {editorMode === "faceless"
                    ? "English Scripts → Calm 2D White & Warm Gold Vector Animation (9:16 & 16:9)"
                    : "Authorized podcast file → viral hooks (score ≥ 75) & 9:16 framing"}
                </span>
              </div>

              <div hidden={editorMode !== "faceless"}>
                <section className="card" aria-labelledby="faceless-stage-title">
                  <div className="card-header">
                    <div className="card-icon" aria-hidden="true">
                      <Sparkles size={18} />
                    </div>
                    <div>
                      <h2 id="faceless-stage-title">Minimalist 2D Series Studio</h2>
                      <p>
                        Produce calm, composed 9:16 Shorts and 16:9 Sunday flagship
                        episodes on pure black canvas with crisp white line-art,
                        warm gold gaze accents, speech-synced captions, and JSON
                        storyboards.
                      </p>
                    </div>
                  </div>

                  <FacelessEditor
                    studioSnapshot={studioSnapshot}
                    isYouTubeConnected={Boolean(accessToken && activeStudioChannel)}
                    onRequestYouTubeLogin={handleYouTubeSignIn}
                    viralLaunchTrigger={viralLaunchTrigger}
                    isActive={stage === "edit" && editorMode === "faceless"}
                    onApproveAndPublish={handleFacelessApproved}
                    onNotice={setNotice}
                  />

                  <div className="card-footer">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setStage("source")}
                    >
                      <ArrowLeft size={15} aria-hidden="true" />
                      Source
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setStage("publish")}
                    >
                      Go to Publish Agent
                      <ArrowRight size={15} aria-hidden="true" />
                    </button>
                  </div>
                </section>
              </div>

              <div hidden={editorMode !== "podcast"}>
                <ShortsEditor
                  videoFile={videoFile}
                  videoUrl={videoUrl}
                  sourceTitle={selectedSourceVideo?.title}
                  exportedShort={exportedShort}
                  isActive={stage === "edit" && editorMode === "podcast"}
                  onSelectVideo={handleSelectVideo}
                  onExportComplete={handleExportComplete}
                  onBack={() => setStage("source")}
                  onNext={() => setStage("publish")}
                  onNotice={setNotice}
                />
              </div>
            </div>
          </div>

          {stage === "publish" && (
            <section className="card" aria-labelledby="stage-publish-title">
              <div className="card-header">
                <div className="card-icon" aria-hidden="true">
                  <Radio size={18} />
                </div>
                <div>
                  <h2 id="stage-publish-title">YouTube Verification &amp; Release</h2>
                  <p>
                    Verify the destination channel and upload or schedule your
                    approved video as Private, Unlisted, Scheduled, or Public.
                  </p>
                </div>
              </div>

              <YouTubePublishPanel
                authUser={authUser}
                accessToken={accessToken}
                authError={authError}
                channels={myChannels}
                confirmedChannelId={confirmedChannelId}
                isAuthenticating={isAuthenticating}
                exportedShort={exportedShort}
                onSignIn={handleYouTubeSignIn}
                onRedirectSignIn={handleYouTubeRedirectSignIn}
                onSignOut={handleYouTubeSignOut}
                onConfirmChannel={handleConfirmChannel}
                onNotice={setNotice}
              />

              <div className="card-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setStage("edit")}
                >
                  <ArrowLeft size={15} aria-hidden="true" />
                  Back to Studio
                </button>
                <span className="quiet-assurance">
                  <ShieldCheck size={15} aria-hidden="true" />
                  Human confirmation required before every upload
                </span>
              </div>
            </section>
          )}

          <div className="status-banner" role="status" aria-live="polite">
            <Info size={14} aria-hidden="true" />
            <span>{notice}</span>
          </div>

          <section className="overview-section" aria-label="Workspace overview">
            <div className="overview-row">
              <div className="overview-label">
                <Check size={14} className="icon-ready" aria-hidden="true" />
                <div>
                  <strong>2D Vector Studio &amp; Performance Loop</strong>
                  <span>
                    5-min Sunday episode + 6 Mon–Sat Shorts · Bold 9:16 &amp; 16:9
                    line-art export
                  </span>
                </div>
              </div>
              <span className="overview-state is-ready">Ready</span>
            </div>

            <div className="overview-row">
              <div className="overview-label">
                {confirmedChannel ? (
                  <Check size={14} className="icon-ready" aria-hidden="true" />
                ) : (
                  <Radio size={14} className="icon-muted" aria-hidden="true" />
                )}
                <div>
                  <strong>YouTube OAuth Connection</strong>
                  <span>
                    {confirmedChannel
                      ? `Verified channel: ${confirmedChannel.title}`
                      : "Connect in Publish step to upload or schedule directly"}
                  </span>
                </div>
              </div>
              <span
                className={`overview-state ${confirmedChannel ? "is-ready" : ""}`}
              >
                {confirmedChannel ? "Verified" : "Not linked"}
              </span>
            </div>

            <div className="overview-row">
              <div className="overview-label">
                <ShieldCheck size={14} className="icon-muted" aria-hidden="true" />
                <div>
                  <strong>Privacy &amp; Release Guard</strong>
                  <span>
                    Local browser canvas export · OAuth tokens stored in memory only
                  </span>
                </div>
              </div>
              <span className="overview-state">Protected</span>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
