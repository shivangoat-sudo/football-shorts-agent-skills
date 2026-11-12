---
name: video-editing-rendering-qc
description: Ingest authorised footage, extract coherent highlight scenes, render 9:16 edits and run technical QC.
---

# Video editing and quality control

## Upstream references
- Agent Video Studio (MIT): https://github.com/MM-mikolajmikolajczak/agent-video-studio
- PySceneDetect (BSD-3-Clause): https://github.com/Breakthrough/PySceneDetect
- FFmpeg documentation: https://ffmpeg.org/documentation.html

Use as implementation references; do not copy whole repositories blindly. Preserve notices. FFmpeg binaries/codecs may have separate licensing implications.

## Authorised ingest
Accept only original media supplied by a rights holder or approved licensed delivery. A YouTube watch URL is not an editable asset. Compute SHA-256, preserve the original, run ffprobe and record duration, dimensions, frame rate, codecs, audio streams and rotation. Generate a proxy; keep source, proxy, EDL and export immutable/versioned.

## Highlight-first editing
For channels publishing highlight compilations, follow `highlight-scene-segmentation`.
- Extract each complete coherent highlight as its own clip.
- One clip = one source file + one contiguous source interval. Never join unrelated timestamps or matches.
- About 20 seconds is a target, not a hard limit; preserve the full action and outcome.
- Camera cuts/replays of the same incident are related shots, not automatically new events.
- New match or unrelated incident = separate event group.
- Uncertain boundaries/replay identity => REVIEW.

## Edit decision list
Versioned JSON EDL includes source ID/hash, source in/out, event group/evidence, crop keyframes, caption timings, licensed music ID/rights, audio targets, overlays/attribution, render profile and software versions. Every export references exactly one source asset and one contiguous interval. Provide a human-readable preview/contact sheet.

## Vertical video and action containment
- Default 1080x1920, 9:16, 30 fps; configurable.
- Prefer ball/player-aware reframing over blind centre crop.
- Track ball and active players across the full event; smooth crop motion and use look-ahead.
- Measure whether ball, relevant players and goal/action area remain visible throughout.
- If a portrait crop cannot preserve action, use adaptive wider view with blurred/neutral side fill or REVIEW. Never crop away the decisive action or stretch the image.
- Keep captions in platform safe zones and away from ball/goalmouth/scoreboard.
- Preserve pre-event build-up and post-event reaction.

## Audio, captions and original contribution
Use only separately licensed music with documented commercial/derivative/YouTube/territory scope. Validate caption timing and spelling. Do not add unlicensed broadcast commentary or SFX. Cropping, captions and music alone may not be sufficient original contribution for monetisation; require meaningful original analysis/commentary or flag for review.

## Rendering and QC
Use FFmpeg via argument arrays/subprocess, never shell interpolation. Do not overwrite sources/exports silently. Validate with ffprobe and full decode. Check duration, dimensions, frame rate, pixel format, audio, clipping, black/frozen frames, subtitle coverage, crop containment, event-boundary integrity and duplicate status. Store renderer version, parameters, output hash and QC report.

## Acceptance tests
Missing/malformed/truncated input rejected; one source + one contiguous interval per clip; unrelated scenes/matches never concatenated; coherent actions not cut mid-event; output 1080x1920 without stretching; ball/player action remains visible or safe padding/review used; output fully decodes; source hash unchanged; boundary/crop/rights QC failure blocks upload.
