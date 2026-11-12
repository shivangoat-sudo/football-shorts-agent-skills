# Football Shorts Agent Skills

A modular, rights-aware skill library for building an autonomous football YouTube Shorts workflow with Google AI Studio / Gemini.

This repository is a build-time knowledge pack, not a running application or a magic plugin. Each skill lives in skills/<name>/SKILL.md. A builder agent must read the relevant skill before implementing that subsystem.

## Use with Google AI Studio

Start with [AI_STUDIO_SETUP.md](AI_STUDIO_SETUP.md) to import the private repository into Build mode or mount it in the Agents playground. Use [AI_STUDIO_BUILD_BRIEF.md](AI_STUDIO_BUILD_BRIEF.md) as the initial build instruction.

The canonical 17 skill files live under skills/. Matching copies are mirrored under .agents/skills/ for agent discovery. GitHub Actions checks that both copies stay identical.

AI Studio does not execute arbitrary code merely because a skill file exists. The files provide instructions and references; the builder still needs to implement, configure, test and host the integrations.

## Skill catalogue

| Skill | Responsibility |
|---|---|
| google-ai-studio-gemini | Gemini API, multimodal analysis, structured outputs and cost discipline |
| football-event-detection | Goals, chances, actions, multimodal evidence fusion and SoccerNet |
| highlight-scene-segmentation | Preserve complete highlight scenes, group replays and prevent cross-match clip stitching |
| video-editing-rendering-qc | FFmpeg, scene detection, portrait reframing, subtitles and QC |
| youtube-source-monitoring | Authorized channel monitoring and metadata intake |
| youtube-publishing | OAuth, uploads, metadata, thumbnails and scheduling |
| youtube-analytics-learning | First-party analytics, experiments and safe optimisation |
| rights-and-content-provenance | Rights evidence, scope, provenance and fail-closed policy |
| automation-and-job-orchestration | Queues, retries, recovery, observability and cost controls |
| security-and-secrets | OAuth token handling, least privilege and secret management |
| quality-engineering | Unit, integration, end-to-end tests and release gates |
| channel-url-intake | Resolve submitted channel/video URLs and confirm source identity |
| authorized-media-acquisition | Obtain original editable footage through authorised delivery only |
| captions-commentary-localization | Accurate subtitles, original analysis, voiceover and localisation |
| music-licensing-audio | Separate music rights, audio mixing and Shorts music limitations |
| youtube-policy-preflight | Copyright, reused-content, community and advertiser-suitability risk checks |
| channel-identity-and-publish-guard | Verify exact OAuth destination channel and prevent wrong-channel uploads |

## Included upstream skill snapshot

The original Gemini Files skill from akrindev/google-studio-skills is preserved verbatim under upstream/akrindev-google-studio-skills/gemini-files, with MIT attribution in that folder. Treat it as an upstream snapshot: old limits and examples may be stale. Verify current Gemini Files API behaviour before implementation.

## Non-negotiable boundaries

- No downloading, scraping, ripping or bypassing access controls on YouTube or broadcast sources.
- YouTube metadata access or analysis of a public video URL does not grant access to an editable/downloadable underlying media file.
- A YouTube channel URL resolves a source; original media must arrive through a separate authorised delivery route.
- Verify the exact OAuth destination channel before every upload.
- Run separate footage/music rights checks and platform-policy preflight; never guarantee YouTube acceptance or monetisation.
- A creator's permission does not necessarily cover broadcaster match footage, league marks, music or embedded rights.
- Never render or publish when a required right is missing, unclear, expired or outside the granted scope.
- A valid footage licence does not guarantee YouTube monetisation approval. Reused/inauthentic-content policy and Content ID are separate.
- Do not assume the Shorts in-app music catalogue can be automated through the upload API; use a separately licensed track unless official API support is verified.
- Use original analysis/commentary and substantial creative contribution.
- Never commit API keys, OAuth tokens, cookies, footage or private customer data.
- Do not claim the system is production-ready until end-to-end acceptance tests pass.

See SOURCES_AND_LICENSES.md for the upstream research and licence register. The root MIT licence covers original material; third-party snapshots retain their stated upstream licence.
