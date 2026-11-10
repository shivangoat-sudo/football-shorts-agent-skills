---
name: google-ai-studio-gemini
description: Use when implementing Gemini API calls in a Google AI Studio-built application, including multimodal video/image/audio analysis, structured JSON, function calling, caching, batching and cost controls.
---

# Google AI Studio and Gemini API

Use Gemini only where semantic reasoning or multimodal understanding adds value. Keep deterministic operations such as rights decisions, media IO, hashing, transcoding, scheduling and analytics arithmetic in normal application code.

## Required approach

1. Confirm whether the app uses a Gemini API key from Google AI Studio or Google Cloud credentials. These are distinct authentication and billing configurations.
2. Use the current official Google Gen AI SDK for the selected language. Verify package and migration guidance at https://ai.google.dev/gemini-api/docs and https://github.com/googleapis/python-genai.
3. Keep model IDs configurable. Query the current model list or official documentation; never hardcode an outdated model name from an old skill.
4. Store API keys in environment variables or the hosting provider's secret manager. Never expose keys in frontend code, prompts, logs, GitHub or browser bundles.
5. Prefer structured output with a strict schema. Validate every response with application-side schemas and reject malformed output.
6. Set bounded input size, output token limit, timeout, retry policy and per-job call budget.
7. Send only the minimum necessary clip or frames. Do not send entire match files repeatedly when a few candidate frames/audio excerpts are enough.
8. Cache results by asset SHA-256, model ID, prompt version, preprocessing version and relevant parameters.
9. Use batch processing only when latency permits and the current API supports the requested model/task.
10. Treat model output as an untrusted suggestion, not authority for rights, identity, score or publication.

## Football analysis output

Use a versioned JSON contract containing event type, start/end seconds, event timestamp, confidence from 0 to 1, observable evidence, caption proposal and needs-human-review boolean.

The model must state uncertainty. Reject timestamps outside source duration. Do not invent players, teams, match facts or scores that are not visible or supplied by trusted metadata.

## Cost controls

- Do not use Gemini to inspect every frame if local CV/audio/scene detectors can narrow the search first.
- Use a fast/low-cost model for routine classification; reserve stronger models for ambiguous high-value candidates.
- Cap frames per clip, candidate count, re-analysis attempts and total calls per source video.
- Avoid regenerating captions unless content or prompt version changes.
- Log model ID, token usage where available, latency, retries and estimated cost per job.
- Add a hard monthly spend limit and pause safely when budget status cannot be verified.

## Acceptance tests

Valid JSON parses; malformed JSON and hallucinated timestamps are rejected; rate limits are retried only within a bounded policy; cache hits avoid duplicate calls; API keys are absent from client bundles/logs; budget exhaustion pauses model tasks without corrupting job state.

## Sources

- https://github.com/google/skills
- https://github.com/akrindev/google-studio-skills
- https://ai.google.dev/gemini-api/docs
- https://github.com/googleapis/python-genai
