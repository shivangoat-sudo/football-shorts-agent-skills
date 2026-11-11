# Upstream repositories, official documentation and licence register

This register records upstream projects and documentation reviewed for this skill pack. The product-specific skills are curated instructions; links to upstream projects are references, not permission to copy their code, models, datasets, match footage, music or other assets.

| Capability | Upstream repository / source | Licence / status | Intended use |
|---|---|---|---|
| Google agent skills | https://github.com/google/skills | Apache-2.0 | Reference for modular skill packaging |
| Google AI Studio skills | https://github.com/akrindev/google-studio-skills | MIT | Gemini API skill reference; Gemini Files snapshot retained with attribution |
| Soccer action spotting | https://github.com/SoccerNet/sn-spotting | MIT code; dataset/video terms separate | Benchmark and candidate model evaluation |
| Video editing for agents | https://github.com/MM-mikolajmikolajczak/agent-video-studio | MIT | Inspect → edit plan → render → QC reference |
| Scene detection | https://github.com/Breakthrough/PySceneDetect | BSD-3-Clause | Scene boundary detection |
| Official YouTube API examples | https://github.com/youtube/api-samples | Verify repository licence before copying | API workflow reference |
| Google API Python client | https://github.com/googleapis/google-api-python-client | Apache-2.0; maintenance mode noted in prior review | Google API client reference |
| Google Gen AI Python SDK | https://github.com/googleapis/python-genai | Apache-2.0 | Gemini integration |
| FastAPI full-stack template | https://github.com/fastapi/full-stack-fastapi-template | MIT | Backend architecture reference |
| Google ADK docs | https://github.com/google/adk-docs | Documentation source; verify terms | Agent skills and discovery reference |

## Official documentation — verify again during implementation

- Gemini API: https://ai.google.dev/gemini-api/docs
- Gemini video understanding: https://ai.google.dev/gemini-api/docs/video-understanding
- Gemini YouTube URL video input: https://ai.google.dev/gemini-api/docs/video-understanding
- Google Gen AI SDK: https://github.com/googleapis/python-genai
- AI Studio Build mode: https://ai.google.dev/gemini-api/docs/aistudio-build-mode
- AI Studio Agents: https://ai.google.dev/gemini-api/docs/aistudio-agents
- YouTube Data API: https://developers.google.com/youtube/v3
- YouTube video upload: https://developers.google.com/youtube/v3/guides/uploading_a_video
- YouTube API Services Terms: https://developers.google.com/youtube/terms/api-services-terms-of-service
- YouTube API Developer Policies: https://developers.google.com/youtube/terms/developer-policies
- YouTube Analytics API: https://developers.google.com/youtube/analytics
- YouTube channel monetisation policies: https://support.google.com/youtube/answer/1311392
- YouTube Shorts music / creation policies: https://support.google.com/youtube/answer/10059070
- FFmpeg: https://ffmpeg.org/documentation.html
- PySceneDetect: https://www.scenedetect.com/docs/latest/
- SoccerNet: https://www.soccer-net.org/

## Copying and data policy

1. Prefer original, small adapters calling maintained libraries over copying full applications.
2. Before copying upstream source, record exact licence, copyright notice, version/commit and file path.
3. Preserve required MIT, BSD and Apache notices.
4. Do not copy GPL/AGPL code into a proprietary application without a licensing decision.
5. A code licence does not grant rights to datasets, raw match videos, model weights, logos, fonts, music or third-party APIs.
6. SoccerNet datasets and raw match videos can have separate access restrictions. A code licence is not a data licence.
7. Do not copy API keys, OAuth credentials, sample tokens, personal data or test footage.
8. Record transitive dependency licences in an SBOM before distribution.

## Critical YouTube media rule

YouTube Data API metadata access does not grant a right to download or store audiovisual files. Do not use downloaders, scraping, browser cookies, stream extraction, private endpoints, screen recording or DRM circumvention. Use separately delivered original media with documented rights. If current Gemini API features can analyse a public YouTube URL, treat that as analysis-only; it is not a downloadable source or a licence.

## Platform and monetisation risk

A valid footage licence does not guarantee YouTube monetisation or prevent Content ID claims, community-guideline enforcement, restrictions or later removals. Reused/inauthentic-content policies are distinct from copyright permission. No automated preflight can guarantee acceptance. Require substantive original contribution, evidence, conservative risk gates and human review for uncertain cases.

## Music rule

Do not assume Shorts in-app music can be attached through the Data API. Verify current official API support. Otherwise use music with a separate licence covering the exact platform, territory, commercial use, synchronisation, editing and publication period, or leave music addition to YouTube's official creation flow.

## Upstream snapshot

The original Gemini Files skill from akrindev/google-studio-skills is preserved verbatim under upstream/akrindev-google-studio-skills/gemini-files with MIT attribution in NOTICE.md. It is an old snapshot; verify all API names, limits and examples against current official docs before implementation.
