---
name: video-editing-rendering-qc
description: Use when ingesting authorised footage, detecting scenes, planning vertical edits, rendering 9:16 videos, generating subtitles, mixing licensed music and running technical video quality checks.
---

# Video editing, rendering and quality control

## Upstream references

- Agent Video Studio (MIT): https://github.com/MM-mikolajmikolajczak/agent-video-studio
- PySceneDetect (BSD-3-Clause): https://github.com/Breakthrough/PySceneDetect
- FFmpeg documentation: https://ffmpeg.org/documentation.html

Use these as implementation references. Do not copy whole repositories blindly. Preserve licence notices if source files are reused. FFmpeg binaries and codecs can have separate licensing implications.

## Ingest

Accept only a file supplied through an authorised rights-holder/user workflow. Compute SHA-256 before processing and preserve the original unchanged. Run ffprobe and record duration, dimensions, frame rate, codecs, audio streams and rotation metadata. Generate a low-resolution proxy. Keep source, proxy, edit decision list and export as separate immutable/versioned assets.

## Edit plan

Represent each clip as a versioned JSON edit decision list containing source asset ID/hash, source in/out timestamps, event candidate ID, crop/reframe keyframes, caption segments/timing, licensed music asset ID and permitted-use record, audio ducking/loudness targets, overlays/attribution, render profile and software versions.

A human-readable preview must be available before publication.

## Vertical video

- Default target: 1080x1920, 9:16, 30 fps; make configurable.
- Prefer subject-aware reframing over blind centre crop.
- Track the ball, active players and scoreboard when feasible.
- Keep captions inside platform safe zones and avoid covering the ball or score.
- Preserve enough pre-event build-up and post-event reaction for context.
- Do not crop away context merely to fill the screen.

## Required companion skills

- `captions-commentary-localization` for timestamp-accurate subtitles and substantive original commentary.
- `music-licensing-audio` for separate music rights and safe mixing.

## Audio and captions

Use only music licensed for commercial use, derivative editing, YouTube, territories and intended duration. Keep proof of licence attached to the music asset. Generate captions from speech/transcription, then validate timing and spelling. Duck music under commentary and normalise output using a tested loudness policy. Do not add unlicensed broadcast commentary or sound effects.

## Rendering and QC

Use FFmpeg via argument arrays/subprocess without shell interpolation. Never overwrite source files or an existing export silently. Validate output with ffprobe and a full decode pass. Check duration, dimensions, frame rate, pixel format, audio presence, clipping, black/frozen frames and subtitle coverage. Produce contact sheets and an audio preview; automated QC does not replace visual/audio review. Store renderer version, parameters, output SHA-256 and QC report.

## Acceptance tests

Missing/malformed/truncated input is rejected; output collision is safely rejected/versioned; output matches configured profile and duration; render fully decodes; audio/captions are valid; source hash remains unchanged; QC failure blocks upload.
