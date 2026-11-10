# Instructions for AI coding agents

You are building the user's football Shorts automation application. Read this file first, then read the skills relevant to the requested task.

## Product target

1. Monitor user-approved source football channels for new uploads and metadata.
2. Match each source video to a separately supplied original media file that the user is authorised to use.
3. Detect and rank promising football moments using multiple independent signals.
4. Create professional vertical edits, normally around 20 seconds, with captions, reframing, licensed music and original analysis.
5. Run technical quality checks and provide a review preview.
6. Publish to the user's connected YouTube channel only when all rights and release gates pass.
7. Retrieve supported first-party analytics and improve through controlled experiments.
8. Operate through a resilient queue with logs, alerts, cost controls, pause and kill-switch controls.

## Non-negotiable engineering rules

- Treat every SKILL.md as subsystem requirements, not permission to skip implementation or tests.
- Use modular architecture, typed interfaces, explicit state machines and auditable database records.
- Do not invent API endpoints, OAuth scopes, model capabilities, analytics metrics or quotas. Verify current official documentation.
- Prefer official SDKs and APIs. Pin dependency versions.
- Do not use YouTube downloaders, browser scraping, cookies, private endpoints, DRM bypasses or unauthorised media extraction.
- Do not infer a licence from a public URL, a creator's verbal statement or a platform's ability to play a video.
- Rights checks must fail closed. Unknown is not allowed.
- Store source media only through an approved delivery method. Preserve SHA-256 hashes and provenance.
- Never expose secrets to the browser, source code, logs, model prompts, Git history or analytics events.
- No automatic public publishing in development. Use dry-run or private/unlisted test mode until explicit release approval.
- Avoid destructive database migrations. Use reversible migrations and backups.
- Do not call the application complete because a scaffold or unit tests pass. Demonstrate end-to-end behaviour with synthetic or properly licensed media.

## AI Studio and cost discipline

- Read only the skill files relevant to the current implementation step.
- Do not repeatedly paste the entire repository into every prompt. Keep project instructions in the workspace and refer to paths.
- Use deterministic code for file handling, rendering, scheduling, rights checks and analytics calculations. Use Gemini only where model judgement adds value.
- Use structured JSON schemas and bounded outputs. Cache deterministic results and avoid re-analysing identical media.
- Prefer local/CPU processing for scene detection, transcoding, metadata and deterministic checks where feasible.
- Keep a per-job model-call budget, maximum clip count, retry limit, storage budget and render budget.
- Never promise zero cost: AI Studio, API calls, storage, egress, compute and YouTube quota may have limits or charges.

## Definition of done

A feature is complete only when acceptance criteria are written; unit tests cover normal, boundary and failure cases; integration tests exercise adapters; security and rights failure paths are tested; logs and metrics do not leak private data; docs are updated; and the feature is integrated and verified end to end.

When a request is underspecified, make safe defaults explicit. Ask only for information that blocks implementation. Do not silently weaken rights, security, quality or publication gates.
