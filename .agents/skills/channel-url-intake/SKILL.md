---
name: channel-url-intake
description: Use when a user submits a YouTube channel URL, handle, channel ID, playlist or video URL and the application must resolve, validate, monitor and safely analyse that source.
---

# YouTube channel and video URL intake

## Goal

Allow a user to paste a YouTube channel URL or handle and have the system create a verified source configuration. Accept supported canonical channel URLs, @handles, channel IDs, and video URLs only where the UI clearly identifies the input type.

## Resolve and validate

1. Parse the URL without scraping HTML or relying on undocumented endpoints.
2. Resolve handles and channel identifiers through supported official YouTube Data API methods and current documentation.
3. Store the immutable channel ID as the source key; keep the submitted URL and display name as metadata.
4. Show the resolved channel name, handle, channel ID and URL to the user for confirmation before monitoring starts.
5. For a video URL, resolve its video ID and owning channel ID through the official API, then apply the same confirmation flow.
6. Reject malformed, ambiguous, unsupported, deleted, private or inaccessible sources with an actionable status. Never silently select a similarly named channel.
7. Support channel changes, source disablement, re-authorisation and removal with an audit trail.

## Video discovery and viewing

- Use the official YouTube Data API to discover uploads and retrieve permitted metadata.
- For public videos, the Gemini API currently documents YouTube URL video input as a preview feature. It can analyse public videos and return timestamped observations; confirm current model/API support, preview status, account eligibility, rate limits and pricing before enabling. This is analysis-only, not a media download or editing source. Default video sampling may be 1 frame per second and can miss fast football actions, so use its output only to propose approximate windows. Precise event detection and all rendering must use the separately delivered authorised original file at its native timestamps/frame rate.
- Gemini's public-YouTube-URL input does not grant rights to reproduce, edit, store, distribute or monetise the footage.
- If direct URL analysis is unavailable, private/unlisted video, age-restricted, region-blocked or otherwise inaccessible, mark analysis as unavailable and request authorised media delivery.
- Do not use browser automation, scraping, yt-dlp, cookies, stream extraction, private endpoints or DRM circumvention to obtain a media file.

## Output

Create a source record with channel ID, submitted URL, canonical URL, display title, source type, confirmation status, monitoring status, polling cursor, rights-holder mapping and audit metadata. A discovered video enters waiting_for_analysis or waiting_for_authorized_media; discovery never triggers a download.

## Acceptance tests

Handle and channel URLs resolve to the correct channel ID; ambiguous names are rejected; video URLs map to the correct owner; duplicate submissions are idempotent; disabled channels stop polling; inaccessible videos fail safely; no source URL is treated as a downloadable media asset.
