---
name: quality-engineering
description: Use when defining tests, evaluation datasets, CI, release gates, observability, regression testing and end-to-end validation for the football Shorts system.
---

# Quality engineering and release validation

## Test pyramid

- Unit tests: rights scope, state transitions, clip windows, timestamp math, schema validation, ranking and cost calculations.
- Integration tests: database, queue, object storage, Gemini adapter, YouTube adapters and FFmpeg.
- End-to-end tests: authorised synthetic media from intake through QC and private/unlisted upload sandbox.
- Model evaluations: held-out licensed clips with annotated event timestamps/classes.

## Synthetic fixtures

Create short synthetic football-like test media with colour bars, moving shapes, generated crowd-like audio and test subtitles. Do not use copyrighted match footage as a CI fixture unless documented rights exist.

## Required negative tests

Rights missing/expired/revoked; file hash mismatch; unsupported codec/corrupt media; model hallucinated timestamp; API quota exhausted; YouTube upload timeout and uncertain completion; OAuth token revoked; duplicate job/upload; queue restart during render; storage budget exceeded; QC failure.

## CI

Run formatting, lint, type checks, unit tests, dependency checks and licence inventory on every pull request. Run heavier media/model tests on controlled scheduled or manual workflows.

## Release checklist

CI green on clean environment; migrations tested against empty and previous supported schemas; backup/restore demonstrated; security and rights negative tests pass; render QC passes on representative authorised test files; YouTube upload tested as private/unlisted; analytics match official API reports; monitoring/alerts/pause/kill switch verified; user explicitly approves public autonomous publishing.

Never claim zero defects. Report tested scope, known limitations and unresolved risks.
