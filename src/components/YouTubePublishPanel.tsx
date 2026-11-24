import { useEffect, useState, type CSSProperties } from "react";
import {
  AlertCircle,
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
import type { ExportedShortResult } from "../lib/shortExporter";
import {
  uploadShortToYouTube,
  type UploadedShortResult,
  type YouTubeChannelInfo,
  type YouTubePrivacyStatus,
} from "../lib/youtubeApi";
import type {
  YouTubeAuthFailureInfo,
  YouTubeAuthUser,
} from "../lib/youtubeAuth";

interface YouTubePublishPanelProps {
  authUser: YouTubeAuthUser | null;
  accessToken: string | null;
  authError: YouTubeAuthFailureInfo | null;
  channels: YouTubeChannelInfo[];
  confirmedChannelId: string | null;
  isAuthenticating: boolean;
  exportedShort: ExportedShortResult | null;
  onSignIn: () => Promise<void>;
  onRedirectSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onConfirmChannel: (channelId: string) => void;
  onNotice: (message: string) => void;
}

export default function YouTubePublishPanel({
  authUser,
  accessToken,
  authError,
  channels,
  confirmedChannelId,
  isAuthenticating,
  exportedShort,
  onSignIn,
  onRedirectSignIn,
  onSignOut,
  onConfirmChannel,
  onNotice,
}: YouTubePublishPanelProps) {
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>(
    channels[0]?.id || ""
  );
  const [title, setTitle] = useState(
    exportedShort?.suggestedTitle || "Composed Gentleman Principle #Shorts"
  );
  const [description, setDescription] = useState(
    exportedShort?.suggestedDescription || "#Shorts #Confidence #Mindset"
  );
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
    if (channels.length === 0) {
      setSelectedCandidateId("");
      return;
    }
    setSelectedCandidateId((prev) =>
      prev && channels.some((c) => c.id === prev) ? prev : channels[0].id
    );
  }, [channels]);

  useEffect(() => {
    if (exportedShort?.suggestedTitle) {
      setTitle(exportedShort.suggestedTitle);
    }
    if (exportedShort?.suggestedDescription) {
      setDescription(exportedShort.suggestedDescription);
    }
    if (exportedShort?.scheduledPublishAt) {
      const d = new Date(exportedShort.scheduledPublishAt);
      if (!Number.isNaN(d.getTime()) && d.getTime() > Date.now() + 60_000) {
        const pad = (n: number) => String(n).padStart(2, "0");
        const localStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        setPublishMode("scheduled");
        setScheduleLocal(localStr);
      }
    }
  }, [
    exportedShort?.suggestedTitle,
    exportedShort?.suggestedDescription,
    exportedShort?.scheduledPublishAt,
  ]);

  const activeCandidate =
    channels.find((c) => c.id === (confirmedChannelId || selectedCandidateId)) ||
    channels[0] ||
    null;

  const isChannelConfirmed =
    Boolean(confirmedChannelId) &&
    channels.some((c) => c.id === confirmedChannelId);

  function handleOpenConfirm() {
    if (!exportedShort) {
      onNotice("Export a video first in Step 2 before uploading.");
      return;
    }
    if (!title.trim()) {
      onNotice("Enter a video title for YouTube.");
      return;
    }
    if (publishMode === "scheduled") {
      if (!scheduleLocal) {
        onNotice("Pick a future date and time to schedule the release.");
        return;
      }
      const targetMs = new Date(scheduleLocal).getTime();
      if (Number.isNaN(targetMs) || targetMs <= Date.now() + 60_000) {
        onNotice("Choose a release timestamp at least 2 minutes in the future.");
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
    onNotice("Uploading approved video to your verified YouTube channel...");

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
        `Uploaded to '${result.channelTitle}' (Video ID: ${result.videoId}).`
      );
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Upload to YouTube failed.";
      onNotice(msg);
    } finally {
      setUploading(false);
    }
  }

  function renderModeSummary(): string {
    if (publishMode === "private") return "Private (only visible to you)";
    if (publishMode === "unlisted") return "Unlisted (accessible via link)";
    if (publishMode === "public") return "Public immediately";
    return scheduleLocal
      ? `Scheduled Public at ${new Date(scheduleLocal).toLocaleString("en-US")}`
      : "Scheduled Public at Peak Window";
  }

  return (
    <div className="publish-stack">
      {/* 1. YouTube OAuth & Channel Verification */}
      <div className="oauth-section">
        <div className="section-subhead">
          <div>
            <h3>1. YouTube Account &amp; Channel Verification</h3>
            <p>
              Connect your Google account, confirm the exact destination channel
              identity, and upload approved videos directly.
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
              Disconnect
            </button>
          )}
        </div>

        {!accessToken ? (
          <>
            <div className="oauth-connect-box">
              <div className="oauth-connect-copy">
                <strong>Not connected to YouTube yet</strong>
                <span>
                  Your OAuth access token stays strictly in page memory during this
                  session.
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
                    {isAuthenticating ? "Connecting..." : "Sign in with Google"}
                  </span>
                </div>
              </button>
            </div>
            {authError && (
              <div className="error-banner studio-error-banner" role="alert">
                <AlertCircle size={15} aria-hidden="true" />
                <div className="studio-error-copy">
                  <span>{authError.message}</span>
                  {(authError.suggestFullTab || authError.suggestRedirect) && (
                    <div className="error-banner-actions">
                      {authError.suggestFullTab && (
                        <a
                          href={typeof window !== "undefined" ? window.location.href : "/"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-primary btn-compact"
                        >
                          Open in new tab
                          <ExternalLink size={12} aria-hidden="true" />
                        </a>
                      )}
                      {authError.suggestRedirect && (
                        <button
                          type="button"
                          className="btn-primary btn-compact"
                          onClick={() => void onRedirectSignIn()}
                        >
                          Sign in via redirect
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        ) : channels.length === 0 ? (
          <div className="oauth-empty-channel">
            <p>
              Signed in as <strong>{authUser?.email || "Google account"}</strong>,
              but no directly owned YouTube channel was found. If your channel is
              on a <strong>Brand Account</strong>, click <em>Disconnect</em>, sign
              in again, and choose the target channel directly.
            </p>
          </div>
        ) : (
          <div className="channel-verify-box">
            {channels.length > 1 && (
              <div className="field-group">
                <label htmlFor="channel-select">Choose destination channel</label>
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
                    Verified
                  </span>
                ) : (
                  <button
                    type="button"
                    className="btn-primary btn-compact"
                    onClick={() => onConfirmChannel(activeCandidate.id)}
                  >
                    Confirm Channel
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Exported Video & Upload Controls */}
      <div className="oauth-section">
        <div className="section-subhead">
          <div>
            <h3>2. Exported Video &amp; Release Settings</h3>
            <p>
              Uploads default to Private or Scheduled until you explicitly choose
              otherwise in the pre-publish review gate.
            </p>
          </div>
        </div>

        {!exportedShort ? (
          <div className="empty-state">
            <div className="empty-icon" aria-hidden="true">
              <LockKeyhole size={20} />
            </div>
            <h3>No rendered video queued yet</h3>
            <p>
              Render your 9:16 Short or 16:9 Sunday Episode in the Series Studio
              first, then approve it to stage it for YouTube release.
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
                Download Local ({Math.round(exportedShort.durationSec)}s)
              </a>
              {exportedShort.thumbnailHook && (
                <div className="thumb-hook-note">
                  <span>Thumbnail Hook</span>
                  <strong>{exportedShort.thumbnailHook}</strong>
                </div>
              )}
              {exportedShort.seriesLabel && (
                <div className="thumb-hook-note">
                  <span>Series &amp; Schedule Slot</span>
                  <strong>{exportedShort.seriesLabel}</strong>
                </div>
              )}
            </div>

            <div className="publish-form-col">
              <div className="field-group">
                <label htmlFor="yt-title">YouTube Title</label>
                <div className="input-box">
                  <input
                    id="yt-title"
                    type="text"
                    maxLength={100}
                    value={title}
                    disabled={uploading}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Video title"
                  />
                </div>
              </div>

              <div className="field-group">
                <label htmlFor="yt-desc">Description &amp; Hashtags</label>
                <textarea
                  id="yt-desc"
                  rows={3}
                  maxLength={2000}
                  className="textarea-box"
                  value={description}
                  disabled={uploading}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="#Shorts #Confidence #Mindset"
                />
              </div>

              <div className="field-group">
                <label>Visibility &amp; Release Timing</label>
                <div className="segmented-group" role="group" aria-label="Visibility">
                  {(
                    [
                      { id: "scheduled", label: "Schedule Public (Peak)" },
                      { id: "public", label: "Public Now" },
                      { id: "unlisted", label: "Unlisted" },
                      { id: "private", label: "Private" },
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
                  <label htmlFor="yt-schedule">Scheduled Publish Date &amp; Time</label>
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
                    <span>Uploading to YouTube...</span>
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
                    <strong>Uploaded to {uploadedResult.channelTitle}</strong>
                    <span>
                      Video ID: {uploadedResult.videoId} ·{" "}
                      {uploadedResult.publishAt
                        ? `Scheduled for ${new Date(
                            uploadedResult.publishAt
                          ).toLocaleString("en-US")}`
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
                  {uploading ? "Uploading..." : "Upload to YouTube"}
                </button>
                {!accessToken || !isChannelConfirmed ? (
                  <span className="quiet-assurance">
                    Connect and confirm your destination channel above first.
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
              <h3 id="confirm-upload-title">Confirm YouTube Upload</h3>
            </div>
            <p className="modal-desc">
              Verify the exact destination channel and release settings before
              submitting the video file:
            </p>
            <dl className="confirm-list">
              <div>
                <dt>Destination Channel</dt>
                <dd>
                  {activeCandidate.title} ({activeCandidate.id})
                </dd>
              </div>
              <div>
                <dt>Title</dt>
                <dd>{title.trim()}</dd>
              </div>
              <div>
                <dt>Visibility</dt>
                <dd>{renderModeSummary()}</dd>
              </div>
            </dl>
            <p className="terms-notice">
              By confirming, you attest that this upload complies with the{" "}
              <a
                href="https://www.youtube.com/t/terms"
                target="_blank"
                rel="noreferrer"
              >
                YouTube Terms of Service
              </a>{" "}
              and{" "}
              <a
                href="https://www.youtube.com/howyoutubeworks/policies/community-guidelines/"
                target="_blank"
                rel="noreferrer"
              >
                Community Guidelines
              </a>
              , and that you hold full rights to all audio and visuals.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowConfirmModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleConfirmUpload}
              >
                Confirm &amp; Upload
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
