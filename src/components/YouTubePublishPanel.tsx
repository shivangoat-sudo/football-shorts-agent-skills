import { useEffect, useState, type CSSProperties } from "react";
import {
  CalendarClock,
  Check,
  Download,
  ExternalLink,
  LockKeyhole,
  LogOut,
  Radio,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";
import type { User } from "firebase/auth";
import type { ExportedShortResult } from "../lib/shortExporter";
import {
  uploadShortToYouTube,
  type UploadedShortResult,
  type YouTubeChannelInfo,
  type YouTubePrivacyStatus,
} from "../lib/youtubeApi";

interface YouTubePublishPanelProps {
  authUser: User | null;
  accessToken: string | null;
  channels: YouTubeChannelInfo[];
  confirmedChannelId: string | null;
  isAuthenticating: boolean;
  exportedShort: ExportedShortResult | null;
  onSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onConfirmChannel: (channelId: string) => void;
  onNotice: (message: string) => void;
}

export default function YouTubePublishPanel({
  authUser,
  accessToken,
  channels,
  confirmedChannelId,
  isAuthenticating,
  exportedShort,
  onSignIn,
  onSignOut,
  onConfirmChannel,
  onNotice,
}: YouTubePublishPanelProps) {
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>(
    channels[0]?.id || ""
  );
  const [title, setTitle] = useState(
    exportedShort?.suggestedTitle
      ? `${exportedShort.suggestedTitle} #Shorts`
      : "Podcast Highlight #Shorts"
  );
  const [description, setDescription] = useState("#Shorts #Podcast");
  const [publishMode, setPublishMode] = useState<
    "private" | "unlisted" | "scheduled" | "public"
  >("private");
  const [scheduleLocal, setScheduleLocal] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedResult, setUploadedResult] = useState<UploadedShortResult | null>(
    null
  );

  useEffect(() => {
    if (exportedShort?.suggestedTitle) {
      setTitle(`${exportedShort.suggestedTitle} #Shorts`);
    }
  }, [exportedShort?.suggestedTitle]);

  const activeCandidate =
    channels.find((c) => c.id === (confirmedChannelId || selectedCandidateId)) ||
    channels[0] ||
    null;

  const isChannelConfirmed =
    Boolean(confirmedChannelId) &&
    channels.some((c) => c.id === confirmedChannelId);

  function handleOpenConfirm() {
    if (!exportedShort) {
      onNotice("Exporteer eerst een Short in stap 2 voordat je uploadt.");
      return;
    }
    if (!title.trim()) {
      onNotice("Vul een videotitel in voor YouTube.");
      return;
    }
    if (publishMode === "scheduled") {
      if (!scheduleLocal) {
        onNotice("Kies een datum en tijd om de Short in te plannen.");
        return;
      }
      const targetMs = new Date(scheduleLocal).getTime();
      if (Number.isNaN(targetMs) || targetMs <= Date.now() + 60_000) {
        onNotice("Kies een tijdstip in de toekomst (minstens 2 minuten vooruit).");
        return;
      }
    }
    setShowConfirmModal(true);
  }

  async function handleConfirmUpload() {
    if (!accessToken || !activeCandidate || !exportedShort || !isChannelConfirmed) {
      return;
    }
    setShowConfirmModal(false);
    setUploading(true);
    setUploadProgress(0);
    setUploadedResult(null);
    onNotice("Short wordt geüpload naar je bevestigde YouTube-kanaal...");

    try {
      const scheduledIso =
        publishMode === "scheduled" && scheduleLocal
          ? new Date(scheduleLocal).toISOString()
          : undefined;

      const privacy: YouTubePrivacyStatus =
        publishMode === "scheduled" ? "private" : publishMode;

      const result = await uploadShortToYouTube({
        accessToken,
        expectedChannelId: activeCandidate.id,
        blob: exportedShort.blob,
        title,
        description,
        privacyStatus: privacy,
        scheduledPublishAt: scheduledIso,
        onProgress: setUploadProgress,
      });

      setUploadedResult(result);
      onNotice(
        `Geüpload naar '${result.channelTitle}' (ID: ${result.videoId}).`
      );
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Uploaden naar YouTube is mislukt.";
      onNotice(msg);
    } finally {
      setUploading(false);
    }
  }

  function renderModeSummary(): string {
    if (publishMode === "private") return "Privé (alleen voor jou zichtbaar)";
    if (publishMode === "unlisted") return "Verborgen (alleen via link)";
    if (publishMode === "public") return "Direct openbaar";
    return scheduleLocal
      ? `Ingepland voor ${new Date(scheduleLocal).toLocaleString("nl-NL")}`
      : "Ingepland";
  }

  return (
    <div className="publish-stack">
      {/* 1. YouTube OAuth & Channel Verification */}
      <div className="oauth-section">
        <div className="section-subhead">
          <div>
            <h3>1. YouTube-account & kanaalverificatie</h3>
            <p>
              Koppel je Google-account om je doelkanaal te bevestigen en Shorts
              rechtstreeks te uploaden.
            </p>
          </div>
          {accessToken && (
            <button
              type="button"
              className="btn-secondary btn-compact"
              onClick={onSignOut}
              disabled={uploading}
            >
              <LogOut size={14} aria-hidden="true" />
              Koppeling verbreken
            </button>
          )}
        </div>

        {!accessToken ? (
          <div className="oauth-connect-box">
            <div className="oauth-connect-copy">
              <strong>Nog niet gekoppeld aan YouTube</strong>
              <span>
                Je toegangstoken wordt alleen tijdelijk in het geheugen van deze
                pagina bewaard.
              </span>
            </div>
            <button
              type="button"
              className="gsi-material-button"
              onClick={onSignIn}
              disabled={isAuthenticating}
            >
              <div className="gsi-material-button-state" />
              <div className="gsi-material-button-content-wrapper">
                <div className="gsi-material-button-icon">
                  <svg
                    version="1.1"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 48 48"
                    className="gsi-svg"
                  >
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    />
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    />
                    <path fill="none" d="M0 0h48v48H0z" />
                  </svg>
                </div>
                <span className="gsi-material-button-contents">
                  {isAuthenticating ? "Bezig met koppelen..." : "Inloggen met Google"}
                </span>
              </div>
            </button>
          </div>
        ) : channels.length === 0 ? (
          <div className="oauth-empty-channel">
            <p>
              Ingelogd als <strong>{authUser?.email || "Google-account"}</strong>,
              maar dit profiel heeft geen direct gekoppeld YouTube-kanaal. Staat
              je kanaal op een <strong>Merkaccount (Brand Account)</strong>? Klik
              dan op <em>Koppeling verbreken</em>, log opnieuw in en kies na je
              e-mailadres je kanaal/Merkaccount (let op: kanalen met alleen
              Studio-machtigingen zonder eigenaarschap werken niet via de YouTube
              API).
            </p>
          </div>
        ) : (
          <div className="channel-verify-box">
            {channels.length > 1 && (
              <div className="field-group">
                <label htmlFor="channel-select">Kies doelkanaal</label>
                <select
                  id="channel-select"
                  className="select-input"
                  value={activeCandidate?.id || ""}
                  disabled={uploading}
                  onChange={(e) => {
                    setSelectedCandidateId(e.target.value);
                  }}
                >
                  {channels.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      {ch.title} ({ch.id})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {activeCandidate && (
              <div className="channel-identity-row">
                <div className="channel-avatar">
                  {activeCandidate.thumbnailUrl ? (
                    <img
                      src={activeCandidate.thumbnailUrl}
                      alt={activeCandidate.title}
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <Radio size={18} aria-hidden="true" />
                  )}
                </div>
                <div className="channel-details">
                  <strong>{activeCandidate.title}</strong>
                  <span>
                    {activeCandidate.customUrl
                      ? `${activeCandidate.customUrl} · `
                      : ""}
                    ID: {activeCandidate.id}
                    {authUser?.email ? ` · ${authUser.email}` : ""}
                  </span>
                </div>
                {isChannelConfirmed && confirmedChannelId === activeCandidate.id ? (
                  <span className="confirmed-text">
                    <Check size={14} aria-hidden="true" />
                    Bevestigd
                  </span>
                ) : (
                  <button
                    type="button"
                    className="btn-primary btn-compact"
                    onClick={() => onConfirmChannel(activeCandidate.id)}
                  >
                    Kanaal bevestigen
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Exported Short & Upload Controls */}
      <div className="oauth-section">
        <div className="section-subhead">
          <div>
            <h3>2. Gemaakte Short & upload-instellingen</h3>
            <p>
              Standaard worden uploads als Privé ingesteld zodat je het resultaat
              eerst rustig kunt controleren.
            </p>
          </div>
        </div>

        {!exportedShort ? (
          <div className="empty-state">
            <div className="empty-icon" aria-hidden="true">
              <LockKeyhole size={20} />
            </div>
            <h3>Nog geen Short geëxporteerd</h3>
            <p>
              Maak eerst een 9:16-uitsnede in de Shorts-editor en klik op
              ‘Short exporteren’. Daarna kun je hier downloaden of uploaden naar YouTube.
            </p>
          </div>
        ) : (
          <div className="publish-ready-grid">
            <div className="publish-video-col">
              <video
                src={exportedShort.url}
                controls
                playsInline
                className="publish-preview-video"
              />
              <a
                href={exportedShort.url}
                download={exportedShort.filename}
                className="btn-secondary btn-compact download-fallback"
              >
                <Download size={14} aria-hidden="true" />
                Lokaal downloaden ({Math.round(exportedShort.durationSec)}s)
              </a>
            </div>

            <div className="publish-form-col">
              <div className="field-group">
                <label htmlFor="yt-title">Titel</label>
                <div className="input-box">
                  <input
                    id="yt-title"
                    type="text"
                    maxLength={100}
                    value={title}
                    disabled={uploading}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Titel van je Short"
                  />
                </div>
              </div>

              <div className="field-group">
                <label htmlFor="yt-desc">Beschrijving</label>
                <textarea
                  id="yt-desc"
                  rows={2}
                  maxLength={2000}
                  className="textarea-box"
                  value={description}
                  disabled={uploading}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="#Shorts #Podcast"
                />
              </div>

              <div className="field-group">
                <label>Zichtbaarheid & planning</label>
                <div className="segmented-group" role="group" aria-label="Zichtbaarheid">
                  {(
                    [
                      { id: "private", label: "Privé" },
                      { id: "unlisted", label: "Verborgen" },
                      { id: "scheduled", label: "Inplannen" },
                      { id: "public", label: "Openbaar" },
                    ] as const
                  ).map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      className={`segmented-btn ${
                        publishMode === mode.id ? "is-active" : ""
                      }`}
                      disabled={uploading}
                      onClick={() => setPublishMode(mode.id)}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              {publishMode === "scheduled" && (
                <div className="field-group">
                  <label htmlFor="yt-schedule">Publicatiedatum & tijdstip</label>
                  <div className="input-box">
                    <CalendarClock size={16} className="input-icon" aria-hidden="true" />
                    <input
                      id="yt-schedule"
                      type="datetime-local"
                      value={scheduleLocal}
                      disabled={uploading}
                      onChange={(e) => setScheduleLocal(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {uploading && (
                <div className="export-progress" aria-live="polite">
                  <div className="progress-meta">
                    <span>Uploaden naar YouTube...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{ "--progress": `${uploadProgress}%` } as CSSProperties}
                    />
                  </div>
                </div>
              )}

              {uploadedResult && (
                <div className="upload-success-box">
                  <div>
                    <strong>Geüpload naar {uploadedResult.channelTitle}</strong>
                    <span>
                      Video-ID: {uploadedResult.videoId} ·{" "}
                      {uploadedResult.publishAt
                        ? `Ingepland voor ${new Date(
                            uploadedResult.publishAt
                          ).toLocaleString("nl-NL")}`
                        : uploadedResult.privacyStatus}
                    </span>
                  </div>
                  <a
                    href={uploadedResult.studioUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-secondary btn-compact"
                  >
                    Open in Studio
                    <ExternalLink size={13} aria-hidden="true" />
                  </a>
                </div>
              )}

              <div className="upload-trigger-row">
                <button
                  type="button"
                  className="btn-primary"
                  disabled={!accessToken || !isChannelConfirmed || uploading}
                  onClick={handleOpenConfirm}
                >
                  <UploadCloud size={15} aria-hidden="true" />
                  {uploading ? "Bezig met uploaden..." : "Uploaden naar YouTube"}
                </button>
                {!accessToken || !isChannelConfirmed ? (
                  <span className="quiet-assurance">
                    Koppel en bevestig eerst je doelkanaal hierboven.
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Explicit Upload Confirmation Modal */}
      {showConfirmModal && activeCandidate && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-upload-title"
        >
          <div className="modal-card">
            <div className="modal-head">
              <ShieldCheck size={18} aria-hidden="true" />
              <h3 id="confirm-upload-title">Upload naar YouTube bevestigen</h3>
            </div>
            <p className="modal-desc">
              Controleer het exacte doelkanaal en de instellingen voordat het
              videobestand wordt verzonden:
            </p>
            <dl className="confirm-list">
              <div>
                <dt>Doelkanaal</dt>
                <dd>
                  {activeCandidate.title} ({activeCandidate.id})
                </dd>
              </div>
              <div>
                <dt>Titel</dt>
                <dd>{title.trim()}</dd>
              </div>
              <div>
                <dt>Zichtbaarheid</dt>
                <dd>{renderModeSummary()}</dd>
              </div>
            </dl>
            <p className="terms-notice">
              Door te bevestigen verklaar je dat deze upload voldoet aan de{" "}
              <a
                href="https://www.youtube.com/t/terms"
                target="_blank"
                rel="noreferrer"
              >
                YouTube-servicevoorwaarden
              </a>{" "}
              en{" "}
              <a
                href="https://www.youtube.com/howyoutubeworks/policies/community-guidelines/"
                target="_blank"
                rel="noreferrer"
              >
                Communityrichtlijnen
              </a>
              , en dat je over de benodigde rechten beschikt.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowConfirmModal(false)}
              >
                Annuleren
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleConfirmUpload}
              >
                Bevestig en upload
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
