# Football Shorts Agent Skills

A modular, license-aware skill library for building a rights-aware football highlight and YouTube Shorts automation system with Google AI Studio / Gemini.

This repository is a build-time knowledge pack, not a running application or a magic plugin. Each skill lives in skills/<name>/SKILL.md. A builder agent must read the relevant skill before implementing that subsystem.

## Use with Google AI Studio

Start with [AI_STUDIO_SETUP.md](AI_STUDIO_SETUP.md) to import the private repository into Build mode or mount it in the Agents playground. Use [AI_STUDIO_BUILD_BRIEF.md](AI_STUDIO_BUILD_BRIEF.md) as the initial build instruction.

The canonical skill files live under skills/. Matching copies are mirrored under .agents/skills/ for Google AI Studio's documented agent skill discovery path. GitHub Actions checks that both copies stay identical.

AI Studio does not execute arbitrary code merely because a skill file exists. The files provide instructions and references; the builder still needs to implement, configure, test and host the integrations.

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

## Included upstream skill snapshot

The original Gemini Files skill from akrindev/google-studio-skills is preserved verbatim under upstream/akrindev-google-studio-skills/gemini-files, with MIT attribution in that folder. Treat it as an upstream snapshot: old limits and examples may be stale. Verify current Gemini Files API behaviour before implementation.

## Non-negotiable boundaries

- No downloading, scraping, ripping or bypassing access controls on YouTube or broadcast sources.
- YouTube metadata access does not grant access to the underlying video file.
- A creator's permission does not necessarily cover broadcaster match footage, league marks, music or embedded rights.
- Never render or publish when a required right is missing, unclear, expired or outside the granted scope.
- A valid footage licence does not guarantee YouTube monetisation approval. Reused-content policy is separate.
- Use original analysis/commentary and substantial creative contribution.
- Never commit API keys, OAuth tokens, cookies, footage or private customer data.
- Do not claim the system is production-ready until end-to-end acceptance tests pass.

See SOURCES_AND_LICENSES.md for the upstream research and licence register. The root MIT licence covers original material; third-party snapshots retain their stated upstream licence.
