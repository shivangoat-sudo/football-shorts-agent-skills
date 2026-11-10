---
name: youtube-source-monitoring
description: Use when monitoring approved YouTube channels for new football uploads, retrieving metadata through the official YouTube Data API and matching source videos to separately authorised media files.
---

# YouTube source-channel monitoring

## Critical distinction

YouTube Data API metadata access is not permission to download the underlying video. This subsystem discovers uploads and metadata only. The original video file must arrive separately through a rights-holder-provided upload, approved cloud folder or other explicitly authorised delivery route.

Never use yt-dlp, scraping, browser cookies, private endpoints, embedded-player extraction or access-control circumvention.

## Official API workflow

1. Register a source channel ID explicitly; do not rely on fuzzy display-name matching.
2. Use official YouTube Data API endpoints and current docs: https://developers.google.com/youtube/v3
3. Use the channel uploads playlist and supported list methods to detect new video IDs.
4. Store video ID, channel ID, title, published timestamp, watch URL, metadata snapshot and last checked time.
5. Use pagination and persist page tokens/checkpoints safely.
6. Respect API quota, retry guidance and transient errors.
7. Use idempotent upserts keyed by video ID.
8. Emit an event when a new video is found; set state to waiting_for_authorized_media.
9. Match separately uploaded original media using a rights-holder mapping and content verification. Do not assume a file is identical because its title matches.

## Data and privacy

Store only metadata needed for monitoring and audit. Keep channel configuration and OAuth credentials private. Avoid storing unrelated comments or personal information. Allow a channel to be disabled and stop polling immediately.

## Acceptance tests

Duplicate polling creates no duplicate records; pagination finds new videos within API limits; quota exhaustion pauses safely and alerts; new metadata never triggers media download; missing authorised media leaves the job waiting rather than processing a YouTube watch URL.
