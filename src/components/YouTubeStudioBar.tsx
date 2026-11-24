import { useState } from "react";
import {
  AlertCircle,
  BarChart3,
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  LogOut,
  Radio,
  RefreshCw,
  Sparkles,
  Youtube,
} from "lucide-react";
import type {
  YouTubeChannelInfo,
  YouTubeStudioSnapshot,
} from "../lib/youtubeApi";
import type {
  YouTubeAuthFailureInfo,
  YouTubeAuthUser,
} from "../lib/youtubeAuth";

interface YouTubeStudioBarProps {
  authUser: YouTubeAuthUser | null;
  accessToken: string | null;
  authError: YouTubeAuthFailureInfo | null;
  channels: YouTubeChannelInfo[];
  activeChannel: YouTubeChannelInfo | null;
  confirmedChannelId: string | null;
  studioSnapshot: YouTubeStudioSnapshot | null;
  loadingSnapshot: boolean;
  isAuthenticating: boolean;
  onSignIn: () => Promise<void>;
  onRedirectSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onSelectChannel: (channelId: string) => void;
  onConfirmChannel: (channelId: string) => void;
  onRefreshStats: () => void;
  onStartViralVideo: () => void;
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(Math.round(n));
}

export default function YouTubeStudioBar({
  authUser,
  accessToken,
  authError,
  channels,
  activeChannel,
  confirmedChannelId,
  studioSnapshot,
  loadingSnapshot,
  isAuthenticating,
  onSignIn,
  onRedirectSignIn,
  onSignOut,
  onSelectChannel,
  onConfirmChannel,
  onRefreshStats,
  onStartViralVideo,
}: YouTubeStudioBarProps) {
  const [showRecentVideos, setShowRecentVideos] = useState(false);
  const currentUrl =
    typeof window !== "undefined" ? window.location.href : "/";

  function renderAuthErrorBanner() {
    if (!authError) return null;
    return (
      <div className="error-banner studio-error-banner" role="alert">
        <AlertCircle size={15} aria-hidden="true" />
        <div className="studio-error-copy">
          <span>{authError.message}</span>
          {(authError.suggestFullTab || authError.suggestRedirect) && (
            <div className="error-banner-actions">
              {authError.suggestFullTab && (
                <a
                  href={currentUrl}
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
    );
  }

  if (!accessToken) {
    return (
      <section className="studio-bar" aria-label="YouTube Studio account">
        <div className="studio-bar-head">
          <div className="studio-account-id">
            <div className="studio-avatar-fallback" aria-hidden="true">
              <Youtube size={18} />
            </div>
            <div>
              <strong>YouTube Studio Account</strong>
              <span>
                Connect your Google account to pull channel metrics into the
                Performance Loop and publish approved series uploads.
              </span>
            </div>
          </div>

          <div className="studio-bar-actions">
            <button
              type="button"
              className="btn-secondary btn-compact"
              onClick={onStartViralVideo}
            >
              <Sparkles size={14} aria-hidden="true" />
              Make Viral Video
            </button>
            <button
              type="button"
              className="gsi-material-button"
              onClick={() => void onSignIn()}
              disabled={isAuthenticating}
            >
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
                  {isAuthenticating ? "Connecting..." : "Sign in to YouTube Studio"}
                </span>
              </div>
            </button>
          </div>
        </div>

        {renderAuthErrorBanner()}
      </section>
    );
  }

  const stats = activeChannel?.statistics;
  const summary = studioSnapshot?.summary;
  const recentVideos = studioSnapshot?.recentVideos || [];
  const isConfirmed =
    Boolean(activeChannel?.id) && confirmedChannelId === activeChannel?.id;

  return (
    <section className="studio-bar is-connected" aria-label="YouTube Studio account">
      <div className="studio-bar-head">
        <div className="studio-account-id">
          {activeChannel?.thumbnailUrl ? (
            <img
              src={activeChannel.thumbnailUrl}
              alt={activeChannel.title}
              className="studio-avatar-img"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="studio-avatar-fallback" aria-hidden="true">
              <Radio size={18} />
            </div>
          )}
          <div className="studio-identity-copy">
            <div className="studio-name-line">
              <strong>
                {activeChannel ? activeChannel.title : "No channel found on this profile"}
              </strong>
              {activeChannel && (
                <a
                  href={`https://studio.youtube.com/channel/${activeChannel.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="link-action"
                >
                  YouTube Studio
                  <ExternalLink size={12} aria-hidden="true" />
                </a>
              )}
            </div>
            <span className="studio-sub-meta">
              {authUser?.email || "Google account"}
              {activeChannel?.customUrl ? ` · ${activeChannel.customUrl}` : ""}
              {activeChannel ? ` · ${activeChannel.id}` : ""}
            </span>
          </div>
        </div>

        <div className="studio-bar-actions">
          {channels.length > 1 && activeChannel && (
            <select
              aria-label="Select YouTube channel"
              className="select-input studio-channel-select"
              value={activeChannel.id}
              onChange={(e) => onSelectChannel(e.target.value)}
            >
              {channels.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  {ch.title}
                </option>
              ))}
            </select>
          )}

          {activeChannel && !isConfirmed && (
            <button
              type="button"
              className="btn-secondary btn-compact"
              onClick={() => onConfirmChannel(activeChannel.id)}
            >
              <Check size={13} aria-hidden="true" />
              Confirm Channel
            </button>
          )}

          {activeChannel && isConfirmed && (
            <span className="confirmed-text">
              <Check size={14} aria-hidden="true" />
              Verified
            </span>
          )}

          <button
            type="button"
            className="btn-secondary btn-compact"
            onClick={onRefreshStats}
            disabled={loadingSnapshot || !activeChannel}
            title="Refresh recent channel statistics"
          >
            <RefreshCw size={13} aria-hidden="true" />
            {loadingSnapshot ? "Loading..." : "Stats"}
          </button>

          <button
            type="button"
            className="btn-primary btn-compact"
            onClick={onStartViralVideo}
          >
            <Sparkles size={13} aria-hidden="true" />
            Make Viral Video
          </button>

          <button
            type="button"
            className="btn-secondary btn-compact"
            onClick={() => void onSignOut()}
            title="Disconnect YouTube account"
          >
            <LogOut size={13} aria-hidden="true" />
          </button>
        </div>
      </div>

      {renderAuthErrorBanner()}

      {!activeChannel && !authError && (
        <div className="oauth-empty-channel">
          <p>
            Signed in as <strong>{authUser?.email || "Google account"}</strong>,
            but no directly owned YouTube channel was found. If your channel sits
            under a <strong>Brand Account</strong>, disconnect above, sign in
            again, and choose your channel/Brand Account directly after your
            email address.
          </p>
        </div>
      )}

      {activeChannel && (
        <>
          <div className="studio-metrics-grid">
            <div className="studio-metric-cell">
              <span>Subscribers</span>
              <strong>
                {stats
                  ? stats.hiddenSubscriberCount
                    ? "Hidden"
                    : formatNumber(stats.subscriberCount)
                  : "—"}
              </strong>
            </div>
            <div className="studio-metric-cell">
              <span>Channel Views</span>
              <strong>{stats ? formatNumber(stats.viewCount) : "—"}</strong>
            </div>
            <div className="studio-metric-cell">
              <span>Avg Recent Views</span>
              <strong>
                {loadingSnapshot
                  ? "Loading..."
                  : summary && summary.sampleSize > 0
                    ? `${formatNumber(summary.avgViews)} (${summary.sampleSize} videos)`
                    : "No recent uploads"}
              </strong>
            </div>
            <div className="studio-metric-cell">
              <span>Avg Engagement</span>
              <strong>
                {loadingSnapshot
                  ? "Loading..."
                  : summary && summary.sampleSize > 0
                    ? `${summary.avgEngagementRate}% · ${formatNumber(summary.avgViewsPerDay)}/day`
                    : "—"}
              </strong>
            </div>
          </div>

          {summary && summary.sampleSize > 0 && (
            <div className="studio-recent-bar">
              <div className="studio-recent-summary">
                <BarChart3 size={14} aria-hidden="true" />
                <span>
                  Top Video:{" "}
                  <strong>
                    {summary.topVideo?.title || "—"} (
                    {formatNumber(summary.topVideo?.viewCount || 0)} views)
                  </strong>
                  {summary.shortsCount > 0 && summary.longVideosCount > 0
                    ? ` · Shorts avg ${formatNumber(summary.shortsAvgViews)} vs Main avg ${formatNumber(summary.longVideosAvgViews)}`
                    : ""}
                </span>
              </div>
              <button
                type="button"
                className="link-action"
                onClick={() => setShowRecentVideos((v) => !v)}
              >
                {showRecentVideos
                  ? "Hide recent videos"
                  : `View ${recentVideos.length} recent videos`}
                {showRecentVideos ? (
                  <ChevronUp size={13} aria-hidden="true" />
                ) : (
                  <ChevronDown size={13} aria-hidden="true" />
                )}
              </button>
            </div>
          )}

          {showRecentVideos && recentVideos.length > 0 && (
            <div className="studio-recent-table">
              {recentVideos.slice(0, 8).map((vid) => (
                <a
                  key={vid.id}
                  href={vid.watchUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="studio-recent-row"
                >
                  <span className="studio-recent-format">{vid.format}</span>
                  <span className="studio-recent-title">{vid.title}</span>
                  <span className="studio-recent-stat">
                    {formatNumber(vid.viewCount)} views ·{" "}
                    {formatNumber(vid.likeCount)} likes · {vid.engagementRate}%
                  </span>
                </a>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
