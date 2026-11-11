---
name: youtube-publishing
description: Use when implementing official YouTube OAuth, video upload, metadata, thumbnails, scheduling, upload retries, channel connection and publication state reconciliation.
---

# YouTube publishing

## Official sources

- YouTube Data API: https://developers.google.com/youtube/v3
- Upload guide: https://developers.google.com/youtube/v3/guides/uploading_a_video
- Official sample repository: https://github.com/youtube/api-samples

Verify current sample paths and repository licence before copying sample code. Do not rely on old defaults without checking current docs.

## Required companion skills

- `channel-identity-and-publish-guard` for verifying the exact OAuth destination channel before every upload.
- `youtube-policy-preflight` for copyright, reused-content, community-guideline and advertiser-suitability risk review.

## OAuth and account connection

Use minimum OAuth scopes required for upload and channel management. Explain consent and the channel being connected. Use a secure OAuth callback and state/PKCE protections where supported. Encrypt refresh tokens at rest with managed keys; restrict access to the publishing worker. Never put refresh tokens in frontend code, GitHub, logs, prompt context or plaintext database fields. Provide disconnect/revoke and token-rotation handling.

## Upload lifecycle

Use an explicit state machine such as draft → rights_checked → rendered → qc_passed → approved → uploading → uploaded_private → scheduled/public.

- Default to private or unlisted during tests.
- Use resumable uploads for large media.
- Persist upload session state and reconcile uncertain outcomes before retrying.
- Use an idempotency key derived from render ID, target channel and publication intent.
- Do not create a duplicate upload after timeout without checking channel state.
- Validate title, description, tags, category, privacy status, scheduled time and thumbnail.
- Respect API quota and platform upload constraints.

## Publication gate

Public publishing is forbidden unless all footage/music/graphics/commentary rights pass; licence territory/platform/date scope covers the planned use; render QC passes; user-approved policy allows it; target channel is correct and connected; and no duplicate/conflicting upload exists.

## Acceptance tests

OAuth callback rejects invalid state; refresh token is encrypted and redacted; upload resumes after interruption; uncertain retry reconciles before creating a new upload; rights/QC failure blocks publication; development mode never publishes publicly.
