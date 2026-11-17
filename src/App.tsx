import { useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";
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
  Youtube,
} from "lucide-react";
import ShortsEditor from "./components/ShortsEditor";
import YouTubePublishPanel from "./components/YouTubePublishPanel";
import AIVideoStudio from "./components/AIVideoStudio";
import type { ExportedShortResult } from "./lib/shortExporter";
import {
  fetchAuthenticatedChannels,
  fetchChannelWithRecentVideos,
  type YouTubeChannelInfo,
  type YouTubeVideoItem,
} from "./lib/youtubeApi";
import {
  initYouTubeAuth,
  signInWithYouTube,
  signOutYouTube,
} from "./lib/youtubeAuth";

type Stage = "source" | "edit" | "publish";

interface StepConfig {
  id: Stage;
  label: string;
  number: string;
  summary: string;
}

const STEPS: StepConfig[] = [
  { id: "source", label: "Bron", number: "01", summary: "Podcastbron" },
  { id: "edit", label: "Shorts-editor", number: "02", summary: "Hooks & 9:16" },
  { id: "publish", label: "Publiceren", number: "03", summary: "YouTube-koppeling" },
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

  const [stage, setStage] = useState<Stage>("source");
  const [aiStudioOpen, setAiStudioOpen] = useState(false);
  const [notice, setNotice] = useState(
    "Werkruimte gereed. Koppel een kanaalbron of open direct de Shorts-editor."
  );

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [exportedShort, setExportedShort] = useState<ExportedShortResult | null>(
    null
  );

  // YouTube OAuth state (access token cached in memory only)
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [myChannels, setMyChannels] = useState<YouTubeChannelInfo[]>([]);
  const [confirmedChannelId, setConfirmedChannelId] = useState<string | null>(
    null
  );
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    const unsubscribe = initYouTubeAuth(
      (user, token) => {
        setAuthUser(user);
        setAccessToken(token);
      },
      (user) => {
        setAuthUser(user);
        setAccessToken(null);
        setMyChannels([]);
        setConfirmedChannelId(null);
      }
    );
    return unsubscribe;
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
      /youtube\.com\/(channel\/|@|c\/)|youtu\.be\//i.test(trimmed) ||
      /^@[a-zA-Z0-9._-]{3,}$/.test(trimmed)
    );
  }, [channel]);

  const currentStepIndex = STEPS.findIndex((s) => s.id === stage);
  const currentStep = STEPS[currentStepIndex];

  const sourceCompleted = channel.trim().length > 0;
  const editCompleted = exportedShort !== null;

  function isStepDone(id: Stage): boolean {
    if (id === "source") return sourceCompleted && stage !== "source";
    if (id === "edit") return editCompleted && stage !== "edit";
    return false;
  }

  async function handleYouTubeSignIn() {
    setIsAuthenticating(true);
    try {
      const { user, accessToken: token } = await signInWithYouTube();
      setAuthUser(user);
      setAccessToken(token);
      const channels = await fetchAuthenticatedChannels(token);
      setMyChannels(channels);
      setConfirmedChannelId(null);
      if (channels.length > 0) {
        setNotice(
          `Google-account gekoppeld (${channels.length} kanaal/kanalen gevonden). Bevestig je doelkanaal.`
        );
      } else {
        setNotice("Ingelogd bij Google, maar geen YouTube-kanaal gevonden.");
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Koppelen met YouTube is mislukt.";
      setNotice(msg);
    } finally {
      setIsAuthenticating(false);
    }
  }

  async function handleYouTubeSignOut() {
    await signOutYouTube();
    setAuthUser(null);
    setAccessToken(null);
    setMyChannels([]);
    setConfirmedChannelId(null);
    setNotice("YouTube-koppeling verbroken.");
  }

  function handleConfirmChannel(channelId: string) {
    setConfirmedChannelId(channelId);
    const ch = myChannels.find((c) => c.id === channelId);
    setNotice(
      ch
        ? `Doelkanaal bevestigd: ${ch.title} (${ch.id}).`
        : "Doelkanaal bevestigd."
    );
  }

  async function handleResolveSource() {
    if (!channel.trim()) {
      setNotice("Vul eerst een YouTube-kanaal-URL of @handle in.");
      return;
    }
    if (!accessToken) {
      setNotice(
        "Koppel eerst je YouTube-account (bij Publiceren) om video's op dit kanaal te bekijken."
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
            ? `Kanaal gevonden: ${res.channel.title} (${res.videos.length} lange video's > 3 min geladen).`
            : `Kanaal gevonden: ${res.channel.title}, maar geen lange video's (> 3 min) in de recente uploads gevonden.`
        );
      } else {
        setNotice("Geen passend YouTube-kanaal gevonden voor deze invoer.");
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Kanaal controleren mislukt.";
      setNotice(msg);
    } finally {
      setResolvingSource(false);
    }
  }

  function connectSource() {
    if (!channel.trim()) {
      setNotice("Vul eerst een YouTube-kanaal-URL of @handle in.");
      return;
    }
    setNotice(
      "Bron lokaal opgeslagen voor deze sessie. Kies nu een videobestand in de editor."
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

  const confirmedChannel =
    myChannels.find((c) => c.id === confirmedChannelId) || null;

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
      <aside className="sidebar" aria-label="Werkstroomnavigatie">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            <Activity size={18} strokeWidth={2} />
          </div>
          <div className="brand-text">
            <span className="brand-name">Touchline</span>
            <span className="brand-sub">Studio</span>
          </div>
        </div>

        <div className="sidebar-section-label">Werkstroom</div>
        <nav className="sidebar-nav">
          {STEPS.map((step) => {
            const active = stage === step.id;
            const done = isStepDone(step.id);
            return (
              <button
                key={step.id}
                type="button"
                className={`nav-item ${active ? "is-active" : ""}`}
                onClick={() => { setAiStudioOpen(false); setStage(step.id); }}
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
            <span>Lokaal renderen · Gemini AI</span>
          </div>
          <div className="sidebar-meta">
            {confirmedChannel
              ? `Kanaal: ${confirmedChannel.title}`
              : "Versie 0.1.0 · Podcast Studio"}
          </div>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Projecten</span>
            <span className="sep" aria-hidden="true">
              /
            </span>
            <span className="crumb-current">{aiStudioOpen ? "AI Video Studio" : "Podcast Shorts"}</span>
          </div>
          <div className="topbar-meta">
            <span>
              {confirmedChannel
                ? `Gekoppeld: ${confirmedChannel.title}`
                : "Geen YouTube-account gekoppeld"}
            </span>
          </div>
        </header>

        <main className="main-container">
          {aiStudioOpen ? <AIVideoStudio /> : (\n            <>\n          <div className="page-header">
            <div className="step-kicker">
              Stap {currentStep.number} van 03 · {currentStep.label}
            </div>
            <h1>Elke sterke hook direct scherp</h1>
            <p className="page-subtitle">
              Extraheer high-retention podcast-fragmenten (15–58s, score ≥ 75)
              met bewezen hooks, getimede ondertitels en 9:16 spreker-tracking.
            </p>
          </div>

          {stage === "source" && (
            <section className="card" aria-labelledby="stage-source-title">
              <div className="card-header">
                <div className="card-icon" aria-hidden="true">
                  <Youtube size={18} />
                </div>
                <div>
                  <h2 id="stage-source-title">Koppel je podcastkanaal</h2>
                  <p>
                    Noteer het YouTube-kanaal dat je volgt, of open direct de
                    Podcast Shorts-editor om een aflevering te analyseren.
                  </p>
                </div>
              </div>

              <div className="field-group">
                <label htmlFor="channel-input">YouTube-kanaal-URL of @handle</label>
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
                      placeholder="https://youtube.com/@jouwkanaal of @jouwkanaal"
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
                      {resolvingSource ? "Ophalen..." : "Video's bekijken"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setStage("publish")}
                    >
                      YouTube koppelen
                    </button>
                  )}
                </div>
                <p className="field-hint">
                  {channel.trim()
                    ? validChannel
                      ? accessToken
                        ? "Klik op 'Video's bekijken' om de nieuwste uploads van dit kanaal te zien."
                        : "Koppel eerst je YouTube-account om de uploads van dit kanaal live te bekijken."
                      : "Gebruik een volledige youtube.com-kanaal-URL of een @handle."
                    : "Ondersteunt kanaal-URL's, kanaal-ID's of @handles."}
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
                      <span>Recente lange video&apos;s (&gt; 3 min)</span>
                      <span>Kies het originele videobestand hierna in de editor</span>
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
                            setNotice(
                              `Video geselecteerd: '${vid.title}'. Kies nu het videobestand in de Shorts-editor.`
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
                                ? new Date(vid.publishedAt).toLocaleDateString("nl-NL")
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
                  Geen scraping of verborgen downloads
                </span>
                <div className="footer-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setStage("edit")}
                  >
                    Direct naar editor
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={connectSource}
                  >
                    Bron opslaan
                    <ArrowRight size={15} aria-hidden="true" />
                  </button>
                </div>
              </div>
            </section>
          )}

          {stage === "edit" && (
            <ShortsEditor
              videoFile={videoFile}
              videoUrl={videoUrl}
              sourceTitle={selectedSourceVideo?.title}
              exportedShort={exportedShort}
              onSelectVideo={handleSelectVideo}
              onExportComplete={handleExportComplete}
              onBack={() => setStage("source")}
              onNext={() => setStage("publish")}
              onNotice={setNotice}
            />
          )}

          {stage === "publish" && (
            <section className="card" aria-labelledby="stage-publish-title">
              <div className="card-header">
                <div className="card-icon" aria-hidden="true">
                  <Radio size={18} />
                </div>
                <div>
                  <h2 id="stage-publish-title">YouTube-koppeling & publiceren</h2>
                  <p>
                    Verifieer je exacte doelkanaal en upload of plan je Short als
                    Privé, Verborgen of Openbaar.
                  </p>
                </div>
              </div>

              <YouTubePublishPanel
                authUser={authUser}
                accessToken={accessToken}
                channels={myChannels}
                confirmedChannelId={confirmedChannelId}
                isAuthenticating={isAuthenticating}
                exportedShort={exportedShort}
                onSignIn={handleYouTubeSignIn}
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
                  Terug naar editor
                </button>
                <span className="quiet-assurance">
                  <ShieldCheck size={15} aria-hidden="true" />
                  Upload pas na expliciete bevestiging
                </span>
              </div>
            </section>
          )}

          <div className="status-banner" role="status" aria-live="polite">
            <Info size={14} aria-hidden="true" />
            <span>{notice}</span>
          </div>

          <section className="overview-section" aria-label="Overzicht werkruimte">
            <div className="overview-row">
              <div className="overview-label">
                <Check size={14} className="icon-ready" aria-hidden="true" />
                <div>
                  <strong>Gemini Virality &amp; Browser-editor</strong>
                  <span>Hook-selectie (score ≥ 75), spreker-tracking en 1080p-export</span>
                </div>
              </div>
              <span className="overview-state is-ready">Gereed</span>
            </div>

            <div className="overview-row">
              <div className="overview-label">
                {confirmedChannel ? (
                  <Check size={14} className="icon-ready" aria-hidden="true" />
                ) : (
                  <Radio size={14} className="icon-muted" aria-hidden="true" />
                )}
                <div>
                  <strong>YouTube OAuth-koppeling</strong>
                  <span>
                    {confirmedChannel
                      ? `Bevestigd kanaal: ${confirmedChannel.title}`
                      : "Koppel in stap 3 om rechtstreeks te uploaden of in te plannen"}
                  </span>
                </div>
              </div>
              <span
                className={`overview-state ${confirmedChannel ? "is-ready" : ""}`}
              >
                {confirmedChannel ? "Gekoppeld" : "Niet gekoppeld"}
              </span>
            </div>

            <div className="overview-row">
              <div className="overview-label">
                <ShieldCheck size={14} className="icon-muted" aria-hidden="true" />
                <div>
                  <strong>Privacy &amp; opslag</strong>
                  <span>Videobestand blijft lokaal · OAuth-token alleen in geheugen</span>
                </div>
              </div>
              <span className="overview-state">Lokaal</span>
            </div>
          </section>
            </>\n          )}\n        </main>
      </div>
    </div>
  );
}
