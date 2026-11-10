# Football Shorts Agent Skills

A modular, license-aware skill library for building a rights-aware football highlight and YouTube Shorts automation system with Google AI Studio / Gemini.

This repository is a build-time knowledge pack, not a running application or a magic plugin. Each skill lives in skills/<name>/SKILL.md. A builder agent must read the relevant skill before implementing that subsystem.

## Use with Google AI Studio

1. Make this repository available to the AI Studio project. For a private repository, use an authenticated GitHub import/clone route or provide the skill files to the project.
2. Start with AI_STUDIO_BUILD_BRIEF.md.
3. Ask the builder to read AGENTS.md and then the relevant SKILL.md files.
4. Require it to follow BUILD_SEQUENCE.md and its acceptance tests.
5. Keep the skills in the project and refer to them during future changes.

Google AI Studio does not automatically execute arbitrary Agent Skills just because they exist in GitHub. These files are instructions and references. Executable integrations still need to be implemented, configured, tested and hosted.

## Skill catalogue

| Skill | Responsibility |
|---|---|
| google-ai-studio-gemini | Gemini API, multimodal analysis, structured outputs and cost discipline |
| football-event-detection | Goals, chances, actions, multimodal evidence fusion and SoccerNet |
| video-editing-rendering-qc | FFmpeg, scene detection, portrait reframing, subtitles and QC |
| youtube-source-monitoring | Authorized channel monitoring and metadata intake |
| youtube-publishing | OAuth, uploads, metadata, thumbnails and scheduling |
| youtube-analytics-learning | First-party analytics, experiments and safe optimisation |
| rights-and-content-provenance | Rights evidence, scope, provenance and fail-closed policy |
| automation-and-job-orchestration | Queues, retries, recovery, observability and cost controls |
| security-and-secrets | OAuth token handling, least privilege and secret management |
| quality-engineering | Unit, integration, end-to-end tests and release gates |

## Non-negotiable boundaries

- No downloading, scraping, ripping or bypassing access controls on YouTube or broadcast sources.
- YouTube metadata access does not grant access to the underlying video file.
- A creator's permission does not necessarily cover broadcaster match footage, league marks, music or embedded rights.
- Never render or publish when a required right is missing, unclear, expired or outside the granted scope.
- A valid footage licence does not guarantee YouTube monetisation approval. Reused-content policy is separate.
- Use original analysis/commentary and substantial creative contribution.
- Never commit API keys, OAuth tokens, cookies, footage or private customer data.
- Do not claim the system is production-ready until end-to-end acceptance tests pass.

## Sources and licences

See SOURCES_AND_LICENSES.md. This repository contains curated original instructions and references. It does not bundle upstream model weights, match footage, datasets or third-party source trees. Upstream code and assets remain governed by their own licences and terms.

## Build order

See BUILD_SEQUENCE.md. Implement one subsystem at a time, with tests and a working integration at each stage.
