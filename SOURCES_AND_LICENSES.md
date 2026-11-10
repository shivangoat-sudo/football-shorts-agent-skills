# Upstream repositories and licence register

This register records upstream projects reviewed for this skill pack. The skill files in this repository are curated instructions written for this football Shorts product. They link to upstream projects rather than silently copying entire codebases.

| Capability | Upstream repository | Licence / status | Intended use |
|---|---|---|---|
| Google agent skills | https://github.com/google/skills | Apache-2.0 | Reference for modular skill packaging, Gemini and evaluation workflows |
| Google AI Studio Gemini skills | https://github.com/akrindev/google-studio-skills | MIT | Reference for Gemini API skill structure and AI Studio API-key workflows; verify current SDK/model docs |
| Soccer action spotting | https://github.com/SoccerNet/sn-spotting | MIT | Benchmark/evaluation and candidate model integration |
| Video editing for agents | https://github.com/MM-mikolajmikolajczak/agent-video-studio | MIT | Inspect → edit plan → render → QC, SHA-256 provenance, subtitles and audio mix |
| Scene detection | https://github.com/Breakthrough/PySceneDetect | BSD-3-Clause | Scene boundary detection adapter |
| Official YouTube API examples | https://github.com/youtube/api-samples | Check repository-level licence and each sample before copying | Reference examples; prefer official API docs |
| Google API Python client | https://github.com/googleapis/google-api-python-client | Apache-2.0 | Official Google API client library |
| Google ADK skills documentation | https://github.com/google/adk-docs | Check page/repository terms before reproducing | Explains modular skill layout and progressive loading |

## Copying policy

1. Prefer original, small adapters that call maintained libraries over copying a full application.
2. Before copying upstream source code, fetch and record its exact licence, copyright notice, version/commit and file path.
3. Preserve required notices for MIT, BSD and Apache-2.0 material.
4. Do not copy GPL/AGPL code into a proprietary/commercial application without an explicit architecture/licensing decision.
5. A repository licence does not grant rights to datasets, match footage, logos, fonts, audio, model weights or third-party APIs.
6. SoccerNet datasets and raw match videos can have separate access restrictions and terms. A code licence is not a data licence.
7. Do not copy API keys, OAuth credentials, sample tokens, personal data or test footage.
8. Record transitive dependency licences in an SBOM before distribution.

## Official documentation to verify at implementation time

- Gemini API: https://ai.google.dev/gemini-api/docs
- Google Gen AI SDK: https://github.com/googleapis/python-genai
- YouTube Data API: https://developers.google.com/youtube/v3
- YouTube Analytics API: https://developers.google.com/youtube/analytics
- YouTube API Services policies: https://developers.google.com/youtube/terms/api-services-terms-of-service
- YouTube monetisation policies: https://support.google.com/youtube/answer/1311392
- FFmpeg: https://ffmpeg.org/documentation.html
- PySceneDetect: https://www.scenedetect.com/docs/latest/
- SoccerNet: https://www.soccer-net.org/

Model names, SDK APIs, scopes, quotas, pricing and policies change. Do not treat examples in old READMEs as current facts.
