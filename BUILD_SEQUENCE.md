# Staged build sequence and acceptance gates

## Phase 0 — Architecture and project baseline
Inspect the existing project and choose a stack based on the hosting target. Create module boundaries, validated configuration, logging, migrations, CI and test conventions. Record architecture decisions for media storage, queue, model usage and deployment.
Acceptance: clean install, CI green, health check, database migration test and no secrets in the repository.

## Phase 1 — Rights-aware media intake
Build source-channel registry and rights-holder records. Add authenticated upload or authorised object-storage intake, SHA-256, ffprobe metadata, immutable provenance and retention policy. Store separate grants for source footage, broadcast footage, music, graphics and commentary.
Acceptance: missing/expired/out-of-scope rights block processing; tampering is detected; audit trail is created.

## Phase 2 — Source monitoring
Use official YouTube Data API channel/video metadata polling. Store video ID, channel ID, title, published time, watch URL and poll state. Match metadata to separately supplied authorised media.
Acceptance: new videos discovered idempotently; no downloader or media URL extraction exists; quota and API errors handled.

## Phase 3 — Football event detection
Implement scene boundaries, audio energy/crowd excitement, scoreboard OCR and visual action model adapters. Evaluate SoccerNet-compatible models on licensed test footage. Fuse independent signals and calibrate confidence.
Acceptance: precision/recall and false-positive reports on held-out test data; low-confidence events require review.

## Phase 4 — Editing and rendering
Build versioned edit decision lists, smart crop, captions, licensed music and original analysis overlays. Render vertical output with configurable bitrate, codec, frame rate and audio mix.
Acceptance: decode check, no black/frozen frames, valid audio, subtitle alignment, correct duration, crop safety and preview generation.

## Phase 5 — YouTube publishing
Implement OAuth consent and minimum scopes, encrypted refresh tokens, resumable upload, metadata, thumbnail, scheduling, retries and reconciliation. Default to private/unlisted during tests.
Acceptance: duplicate uploads prevented; failed uploads resume safely; no public publish before release gates.

## Phase 6 — Analytics and learning
Pull supported first-party analytics reports. Record only metrics actually exposed by the API for the account/report. Track experiments for hook, pacing, captions, music, crop and publication windows.
Acceptance: no optimisation on tiny samples; uncertainty displayed; rollback and audit trail work.

## Phase 7 — Autonomous operation
Add durable queues, retries/backoff, dead-letter queue, scheduler, watchdog, alerts, cost caps and dashboard for sources, rights, assets, jobs, previews, publishing, analytics and pause/kill switch.
Acceptance: restart recovery, idempotency, budget ceiling, backup/restore and operational runbook tested.

## Release gates

No automatic public publishing until all required footage and asset rights are verified, QC passes, private/unlisted upload is tested, channel configuration is approved, failure alerts work and the user explicitly enables the publication policy.
