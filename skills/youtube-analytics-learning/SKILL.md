---
name: youtube-analytics-learning
description: Use when retrieving supported YouTube channel analytics, comparing Shorts performance, running controlled content experiments and improving publishing strategy without overfitting.
---

# YouTube analytics and learning loop

## Official source

Use current YouTube Analytics API documentation: https://developers.google.com/youtube/analytics

Do not assume every public-facing metric is available to the API, available for Shorts or available at the same granularity. Check current report docs and connected-channel permissions.

## Ingestion

Use the connected channel's OAuth grant and least-privilege scopes. Store report query parameters, date range, retrieval time, metric definitions and API version. Distinguish zero from unavailable, delayed or not-yet-reported data. Respect freshness delays and report time zones. Do not scrape public views or infer private retention metrics from public pages.

## Learning system

Track event class and match context; hook type and first-second visual; clip duration and pacing; caption style/density; crop/reframe strategy; music category/audio mix; publication day/time; title/description format.

Use controlled experiments when possible. Change a small number of variables at a time. Keep an experiment registry and version every creative template.

## Avoid false learning

Do not rank variants from tiny or incomparable samples. Use minimum sample sizes and confidence/credible intervals. Compare like-for-like formats and audience windows. Account for publication age and traffic source differences. Do not interpret correlation as causation or change strategy based on one viral/failed Short. Preserve a holdout/baseline to detect regressions. Optimise for declared goals, not views alone; include watch time, retention where supported, subscribers and policy compliance.

## Acceptance tests

Unsupported metrics are not fabricated; missing/delayed data is explicit; experiment variants trace to render/template versions; optimiser waits for sufficient data; rollback restores a known-good strategy.
