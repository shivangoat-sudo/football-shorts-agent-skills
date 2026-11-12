# Staged build sequence and acceptance gates

Implement one phase at a time. Do not jump to public autonomous publishing before all release gates pass.

## Phase 0 — Architecture and project baseline
Inspect the existing project and choose a stack based on the hosting target. Create module boundaries, validated configuration, logging, migrations, CI and test conventions. Record architecture decisions for media storage, queue, model usage and deployment.
Acceptance: clean install, CI green, health check, database migration test and no secrets in the repository.

## Phase 1 — Source URL intake and channel identity
Accept supported YouTube channel URLs, @handles, channel IDs and optional video URLs. Resolve through official API methods, show canonical channel name/ID and require confirmation. Separately implement YouTube OAuth connection and verify the exact destination channel ID.
Acceptance: correct resolution; ambiguous/deleted/private sources fail safely; wrong destination channel blocks uploads; token revocation pauses publishing; duplicate source entries are idempotent.

## Phase 2 — Rights-aware original media intake
Build rights-holder records and authenticated upload or approved cloud/provider intake. Store SHA-256, ffprobe metadata, immutable provenance and retention policy. Store separate grants for creator footage, broadcast footage, music, sound effects, graphics, logos, fonts and commentary.
Acceptance: a YouTube watch URL can never be passed to a media-download adapter; missing/expired/out-of-scope rights block processing; mismatched files are quarantined; tampering is detected; audit trail is created.

## Phase 3 — Source monitoring and media matching
Use official YouTube Data API channel/video metadata polling. Store video ID, channel ID, title, published time, watch URL and poll state. Optionally use current Gemini public-URL video understanding for analysis-only timestamp discovery where supported. Match to separately delivered authorised media.
Acceptance: new videos discovered idempotently; no downloader or media URL extraction exists; inaccessible video analysis falls back to authorised media; quota/API errors handled.

## Phase 4 — Football event detection and highlight-scene segmentation
Classify sources as highlight compilations or full matches. For highlight channels, segment complete coherent incidents, group replay angles of the same incident, separate different matches/events and produce one contiguous source interval per output. Camera cuts are shot boundaries, not automatic event boundaries. Add audio/crowd, scoreboard/context OCR and football action-spotting adapters. Treat SoccerNet event timestamps as anchors, not clip boundaries. Fuse independent signals and calibrate confidence.
Acceptance: synthetic multi-match compilations never produce cross-match clips; replays link correctly; continuous actions survive camera cuts; no unrelated timestamps are stitched; held-out precision/recall and false-positive reports exist; uncertain events require review; timestamps stay in original-media coordinates.

## Phase 5 — Captions, commentary, music and highlight-preserving editing
Build versioned EDLs with one source asset and one contiguous interval per highlight. Preserve complete events (about 20 seconds by default, not a hard cap), track ball/players, and use safe padding or review when 9:16 cannot contain the action. Add accurate captions, original analysis/voiceover, separately licensed music and audio mix. Render vertical output with configurable bitrate, codec, frame rate and audio.
Acceptance: unrelated scenes are never concatenated; coherent actions are not cut mid-event; action containment is measured throughout; captions align; original contribution is present or flagged; all audio has rights evidence; unsupported Shorts music automation is disabled.

## Phase 6 — Technical QC and policy preflight
Validate duration, resolution, frame rate, decode, audio, captions, safe zones, black/frozen frames, duplicate/repetitive output, metadata accuracy, rights and platform-policy risk. Use PASS/REVIEW/BLOCK states.
Acceptance: rights or known policy failure blocks; uncertainty requires review; no code claims guaranteed acceptance or monetisation.

## Phase 7 — YouTube publishing
Implement OAuth, minimum scopes, encrypted refresh tokens, resumable upload, metadata, thumbnail, scheduling, retries and reconciliation. Default to private/unlisted during tests. Verify exact destination channel before every upload.
Acceptance: duplicate uploads prevented; failed uploads resume safely; wrong channel, rights failure, QC failure or policy BLOCK prevents publishing; no public publish before release gates.

## Phase 8 — Analytics and learning
Pull supported first-party analytics reports. Record only metrics actually exposed by the API for the account/report. Track experiments for hook, pacing, captions, music, crop and publication windows.
Acceptance: no optimisation on tiny samples; uncertainty displayed; unsupported/delayed metrics remain unavailable rather than fabricated.

## Phase 9 — Autonomous operation
Add durable queues, retries/backoff, dead-letter queue, scheduler, watchdog, alerts, cost caps and dashboard for sources, rights, assets, jobs, previews, publishing, analytics and pause/kill switch.
Acceptance: restart recovery, idempotency, budget ceiling, backup/restore and operational runbook tested.

## Release gates

No automatic public publishing until all required footage and asset rights are verified, policy preflight passes, QC passes, private/unlisted upload is tested, exact channel configuration is approved, failure alerts work and the user explicitly enables the publication policy. YouTube can still apply later claims, restrictions or removals; acceptance cannot be guaranteed.
