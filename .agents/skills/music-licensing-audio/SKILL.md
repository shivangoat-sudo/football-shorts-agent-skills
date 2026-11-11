---
name: music-licensing-audio
description: Use when selecting, licensing, mixing or validating music, sound effects, broadcast audio and commentary for YouTube Shorts.
---

# Music licensing and audio compliance

## Asset eligibility

Use music and sound effects only when a documented licence covers the exact intended use: YouTube, Shorts, commercial/monetised use if applicable, territory, duration, synchronisation with video, editing/derivatives, and publication period. Record the rights holder, licence source, asset ID, evidence, attribution, restrictions and expiry.

A track being available on Spotify, TikTok, a creator's channel, a stock site preview or a YouTube video does not establish reuse rights. A source creator's footage permission does not grant music rights.

## YouTube-native music

Do not assume that a track available in the YouTube Shorts in-app music picker can be selected or embedded by the YouTube Data API during upload. Verify current official API support. If the supported API does not expose a permitted way to attach that library track, do not automate a workaround. The user may add it manually in YouTube's official Shorts creation flow, or the system may use a separately licensed music file.

## Audio mixing

- Preserve intelligible original commentary only when its reuse is licensed.
- Add original narration where useful.
- Duck music under speech and keep peaks/clipping within a tested audio profile.
- Do not alter pitch/speed to evade Content ID.
- Keep an audio-only preview and record all mix parameters.
- Respect any restrictions on attribution, territory, platforms, monetisation, duration and derivative works.

## Copyright risk checks

Content ID matches and claims may occur even with a licence. Maintain licence evidence and a human escalation process. Do not claim a track is copyright-safe merely because a tool did not detect a match. Do not auto-dispute claims or submit legal assertions without the rights holder's review.

## Acceptance tests

Unlicensed or expired tracks block render/upload; audio rights are checked separately from footage rights; licence evidence is attached to each export; clipping and speech intelligibility tests run; no evasion logic exists; unsupported Shorts-library automation is disabled.
