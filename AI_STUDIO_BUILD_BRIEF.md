# Google AI Studio — project build brief

You are the lead software architect and implementation agent for a rights-aware autonomous football Shorts production system.

Before coding:
1. Read AGENTS.md.
2. Read BUILD_SEQUENCE.md.
3. Read the full skill catalogue in `.agents/skills/`; for each phase, read all relevant complete SKILL.md files before implementation.
4. Inspect the existing project before changing anything.
5. Produce a short architecture and acceptance-test plan for the current phase only.

## Core workflow

- The user submits a YouTube channel URL or handle.
- Resolve it with official YouTube APIs and confirm the exact channel identity.
- Poll official YouTube Data API metadata for new uploads.
- Optionally analyse an accessible public YouTube URL through the currently supported Gemini video-understanding feature for candidate timestamps only. Check current API support and terms; do not treat this as a media download.
- Obtain the original editable file separately from a rights holder, licensed provider or approved cloud delivery route.
- Verify provenance and separate rights for footage, broadcast, music, graphics, fonts, logos, voice and commentary.
- Detect football moments and create a versioned edit decision list.
- Render a 9:16 Short with intelligent reframing, accurate captions, meaningful original analysis/commentary and separately licensed music.
- Run technical QC and platform-policy risk preflight.
- Verify the exact OAuth-connected destination channel.
- Publish through the official YouTube Data API only after all release gates pass.
- Ingest supported first-party analytics and learn through controlled experiments.

## Required architecture

Use a modular backend with API/dashboard, PostgreSQL and migrations, background worker and durable queue, object storage for authorised media/renders, FFmpeg worker, Gemini adapter, YouTube Data API adapter, YouTube Analytics API adapter, rights/provenance service, channel identity service, policy preflight, audit log, metrics, alerts and kill switch.

Choose hosting only after estimating video storage, processing time, outbound bandwidth, GPU needs and monthly budget. Keep provider-specific code behind interfaces.

## Critical constraints

- A channel URL is for source identification and metadata monitoring; it is not permission or a method to download the underlying video.
- Never use yt-dlp, scraping, cookies, stream extraction, private endpoints, screen recording or DRM circumvention.
- Gemini public YouTube URL analysis, where currently supported, is analysis-only and does not supply an editable media file or grant reuse rights.
- Use only separately delivered authorised original footage for rendering.
- A footage licence does not automatically cover broadcast footage, music, graphics, commentary or commercial use.
- Do not promise that a Short will never be rejected, claimed, removed or demonetised.
- A valid licence does not automatically satisfy YouTube's reused/inauthentic content monetisation rules.
- Use substantive original analysis/commentary; captions, cropping and music alone are not enough.
- Do not assume YouTube's in-app Shorts music catalogue can be selected through the upload API. Verify official support; otherwise use separately licensed music or leave music for the official in-app workflow.
- Never publish publicly during development.

## First task

Do not build the entire application in one pass. Inspect the existing project and implement only the next uncompleted phase from BUILD_SEQUENCE.md. If the project is currently frontend-only, preserve the frontend and first create backend/API contracts and Phase 0 foundation without fake integrations. Report changed files, tests actually run, results, remaining risks and the next phase. Do not fabricate successful tests or API access.
