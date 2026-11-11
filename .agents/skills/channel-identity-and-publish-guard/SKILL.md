---
name: channel-identity-and-publish-guard
description: Use when connecting YouTube accounts, verifying the exact destination channel, selecting a target channel, authorising uploads and preventing publication to the wrong account.
---

# YouTube channel identity and publish guard

## Connect and verify

1. Use the official YouTube OAuth flow with minimum required scopes and secure state validation.
2. After authorisation, query the official API for the authenticated user's channel using the supported current method (for example channels.list with mine=true where applicable).
3. Display the resolved channel title, channel ID, avatar and account identity to the user. Require explicit confirmation before enabling uploads.
4. Store the immutable channel ID as the publishing destination. Never use a typed display name or channel URL as the sole destination identifier.
5. Re-verify that the active OAuth credential resolves to the stored target channel before each upload or after token/account changes.
6. If the token is revoked, the user switches account, multiple channels are returned or the identity is uncertain, stop publishing and require reconnection/selection.

## Publication safeguards

- Never publish to a channel simply because it was the last connected account.
- Show the exact destination channel in every approval and upload confirmation screen.
- Keep development uploads private or unlisted.
- Require explicit user opt-in before public or scheduled publication is enabled.
- Check rights, policy preflight, QC, duplicate state and publication schedule before upload.
- Use resumable uploads and reconcile uncertain outcomes before retrying.
- Provide pause, disconnect and emergency stop controls.

## YouTube API user notice

Before the user triggers an upload, display the notice required by the current YouTube API Services Terms of Service, including that clicking upload certifies compliance with YouTube Terms of Service and Community Guidelines and respect for copyright and privacy rights. Link to the applicable terms URL. Re-check the exact current wording and implementation requirements before release.

## Acceptance tests

Wrong channel identity blocks upload; revoked token pauses publishing; reconnecting to another channel requires confirmation; the destination channel is visible in the approval step; duplicate uploads are prevented; public publishing is impossible until explicitly enabled and all release gates pass.
