# Instructions for AI coding agents

You are building the user's rights-aware autonomous football Shorts application. Read this file first, then read the relevant skills under `.agents/skills/<name>/SKILL.md` before changing a subsystem.

## Product target

1. Let the user submit a YouTube channel URL, handle, channel ID or supported video URL.
2. Resolve it through official YouTube APIs, show the exact channel identity and require confirmation.
3. Monitor new uploads and metadata through the official YouTube Data API.
4. Optionally analyse a public YouTube URL with the currently supported Gemini video-understanding feature for candidate timestamps only. This is analysis, not a download, copy or editing source; verify current API support and terms before enabling.
5. Obtain the original editable media separately through a rights-holder-authorised upload, licensed provider API or approved cloud delivery.
6. Verify separate rights for creator footage, broadcast footage, music, sound effects, graphics, logos, fonts and voice/commentary.
7. Detect and rank football moments using multiple signals and calibrated confidence.
8. Create professional vertical edits, normally around 20 seconds, with smart reframing, accurate captions, substantive original analysis/commentary and properly licensed music.
9. Run technical QC and a YouTube policy/monetisation risk preflight; uncertain cases require human review.
10. Verify the exact OAuth-connected destination channel and publish through the official YouTube Data API only after every release gate passes.
11. Retrieve supported first-party analytics and improve through controlled experiments.
12. Operate through a durable queue with logs, alerts, cost controls, pause and kill-switch controls.

## Critical media boundary

A YouTube watch URL is not a downloadable media asset. Do not use yt-dlp, scraping, browser cookies, stream extraction, private endpoints, screen recording, DRM bypasses or other circumvention. YouTube API metadata access and Gemini URL analysis do not grant reproduction or editing rights. The editor must use a separately delivered original file with documented rights.

## Non-negotiable engineering rules

- Treat every SKILL.md as subsystem requirements, not permission to skip implementation or tests.
- Use modular architecture, typed interfaces, explicit state machines and auditable database records.
- Do not invent API endpoints, OAuth scopes, model capabilities, analytics metrics, quotas or policy guarantees. Verify current official documentation.
- Prefer official SDKs and APIs. Pin dependency versions.
- Rights checks must fail closed. Unknown is not allowed.
- Store source media only through an approved delivery method. Preserve SHA-256 hashes and provenance.
- Never expose secrets to the browser, source code, logs, model prompts, Git history or analytics events.
- No automatic public publishing in development. Use dry-run or private/unlisted test mode until explicit release approval.
- A valid licence does not guarantee YouTube monetisation, Content ID clearance or platform acceptance. Never promise "without rejection".
- Do not use YouTube-native Shorts music through an unsupported API workaround. Use separately licensed music files unless the official API explicitly supports the desired action.
- Avoid destructive database migrations. Use reversible migrations and backups.

## AI Studio and cost discipline

- Read only skills relevant to the current implementation step, but load the complete skill catalogue before architecture decisions.
- Do not repeatedly paste the entire repository into every prompt. Keep project instructions in the workspace and refer to paths.
- Use deterministic code for URL parsing, media IO, hashing, rights decisions, rendering, scheduling, identity checks and analytics calculations.
- Use Gemini only where model judgement adds value. Treat model output as untrusted.
- Use structured JSON schemas and bounded outputs. Cache deterministic results and avoid re-analysing identical media.
- Keep per-job model-call, clip, retry, storage and render budgets.
- Never promise zero cost: AI Studio, API calls, storage, egress, compute and YouTube quota may have limits or charges.

## Definition of done

A feature is complete only when acceptance criteria are written; unit tests cover normal, boundary and failure cases; integration tests exercise adapters; security and rights failure paths are tested; logs and metrics do not leak private data; docs are updated; and the relevant end-to-end workflow is demonstrated using synthetic or properly licensed media.

When a request is underspecified, make safe defaults explicit. Ask only for information that blocks implementation. Do not silently weaken rights, security, quality or publication gates.
