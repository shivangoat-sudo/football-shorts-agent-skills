---
name: authorized-media-acquisition
description: Use when obtaining original football video files for editing, matching a YouTube source URL to separately delivered footage, and validating delivery permissions and provenance.
---

# Authorised original media acquisition

## Non-negotiable distinction

A YouTube channel URL or public video URL can be used for metadata discovery and, where currently supported, Gemini analysis-only video understanding. It is not a permission or mechanism to download the YouTube audiovisual file.

The YouTube API developer policies prohibit downloading, importing, backing up, caching or storing copies of YouTube audiovisual content without YouTube's prior written approval. Do not use yt-dlp, stream extraction, browser downloads, cookies, unofficial endpoints, screen recording, DRM circumvention or any workaround.

## Supported acquisition routes

Accept original media only through a separately authorised delivery route, such as:
- upload by the verified rights holder or an explicitly authorised operator;
- a rights-holder-provided direct file transfer or documented delivery API;
- an approved cloud-storage folder/bucket where access and reuse rights are documented;
- a licensed media-provider API or asset portal whose terms explicitly permit download, editing and the intended publication.

Do not fetch a file from a URL merely because it is reachable. Before transfer, record the provider, delivery method, asset identifier, licence evidence, allowed uses, expiry, territories, platforms, monetisation scope and responsible account. If access is via a signed URL, keep it server-side, short-lived and out of logs.

## Matching a source video to a delivered file

1. Match using explicit rights-holder asset mapping, event/match identifiers, duration, timestamps and media metadata.
2. Treat title similarity, channel name, thumbnail similarity or model recognition as insufficient proof of identity or rights.
3. Record SHA-256, immutable original path/object ID, file size, MIME detected from content, duration, streams, frame rate and resolution.
4. Preserve the original unchanged. Create analysis proxies and edit derivatives separately.
5. Keep provenance from source record → rights grant → delivered original → analysis → edit decision list → rendered output → YouTube upload.
6. If mapping is uncertain or the file is not the authorised original, quarantine it and require review.

## Gemini URL analysis versus editing

If the current Gemini API supports public YouTube URL video understanding, it may inspect the public video and propose candidate timestamps. This is an analysis-only convenience and may be preview-limited or unavailable for some videos. It does not provide an editable original file. The actual render must use the separately delivered authorised media file. Re-check current Gemini documentation and YouTube terms before enabling this path.

## Fail-closed behaviour

No original file, no verified delivery authority, missing rights evidence, mismatch, expired/revoked grant or unclear ownership means BLOCK. Never use a detected moment to infer permission.

## Acceptance tests

YouTube watch URLs cannot enter the media-download adapter; approved direct delivery is auditable; hashes are stable; mismatch quarantines; revoked or expired delivery rights block processing; Gemini URL analysis never creates a local media asset or bypasses the separate media requirement.
