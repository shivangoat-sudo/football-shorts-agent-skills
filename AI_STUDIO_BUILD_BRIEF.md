# Google AI Studio — project build brief

You are the lead software architect and implementation agent for a rights-aware, autonomous football Shorts production system.

Before coding:
1. Read AGENTS.md.
2. Read BUILD_SEQUENCE.md.
3. Read the skill files for the current phase.
4. Inspect the existing project before changing anything.
5. Produce a short architecture and acceptance-test plan for the current phase only.

## Core workflow

- The user configures source football channels.
- The service polls the official YouTube Data API for new video metadata.
- It does not download the source video from YouTube.
- A rights holder separately supplies the original media file through an authorised upload or approved cloud storage integration.
- The service verifies file hash, media metadata, source-video mapping and rights evidence.
- Event analysis identifies candidate moments using multiple signals and calibrated confidence.
- An editing planner produces a versioned edit decision list.
- FFmpeg renders a vertical video with intelligent crop, subtitles, audio mix, licensed assets and optional original commentary/analysis.
- Automated QC validates duration, resolution, frame rate, audio, decoding and subtitle timing.
- The user can review the candidate; automatic publication remains disabled until explicitly enabled after successful release tests.
- The service publishes through the official YouTube Data API using OAuth and resumable uploads.
- Analytics ingestion uses supported YouTube Analytics API reports for the connected channel.
- An experiment engine compares variants only when sample sizes are adequate and records uncertainty.

## Required architecture

Use a modular backend with API/dashboard, PostgreSQL and migrations, background worker and durable queue, object storage for authorised media/renders, FFmpeg worker, Gemini adapter, YouTube Data API adapter, YouTube Analytics API adapter, rights/provenance service, audit log, metrics, alerts and kill switch.

Choose hosting only after estimating video storage, processing time, outbound bandwidth, GPU needs and monthly budget. Keep provider-specific code behind interfaces.

## First task

Do not build the entire application in one pass. Start with Phase 0 and Phase 1 from BUILD_SEQUENCE.md: project skeleton, database design, rights records, authenticated media intake, provenance hashes and tests. Report changed files, test results, remaining risks and the next phase. Do not fabricate successful tests or API access.
