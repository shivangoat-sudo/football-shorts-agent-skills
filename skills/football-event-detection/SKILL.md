---
name: football-event-detection
description: Use when building football-specific event spotting for goals, shots, saves, chances, fouls, celebrations and ball actions, including SoccerNet models, audio/visual signal fusion and confidence evaluation.
---

# Football event detection and ranking

Find engaging football moments in authorised match media and produce candidate time windows for an editor. A detector proposes moments; it does not decide legal rights or publish videos.

## Candidate signals

Use independent signals where available: action-spotting model predictions; ball/player movement; scoreboard OCR and score-state changes; replay/camera-shot boundaries; crowd/audio excitement and commentator speech; scene-change patterns; and human feedback from accepted/rejected candidates.

Do not treat one signal as proof of a goal. A crowd roar can be unrelated, OCR can be wrong and a replay can repeat the same moment.

## Model and benchmark research

Start by evaluating SoccerNet action spotting: https://github.com/SoccerNet/sn-spotting

The repository is MIT licensed, but datasets, raw broadcast video and benchmark assets have their own access terms. Confirm dataset permissions before downloading or using them. Benchmark footage is not automatically cleared for commercial publication.

## Detection pipeline

1. Probe duration, frame rate, resolution, audio streams and timestamp origin.
2. Generate low-resolution analysis proxies and scene boundaries.
3. Run model inference only on relevant windows; preserve timestamps in original-media coordinates.
4. Convert predictions to a common event schema.
5. Merge duplicate predictions for the same event; do not merge separate nearby events just because they share a class.
6. Fuse independent modalities using calibrated weights or a trained calibration model.
7. Store per-signal scores and evidence, not only one opaque total.
8. Rank by event importance, confidence, clarity, context, replay duplication and clip quality.
9. Create a candidate window with sufficient build-up and aftermath, normally around 20 seconds.
10. Route uncertain or high-impact candidates to human review.

## Evaluation

Create a held-out dataset from footage authorised for analysis. Annotate event type and exact time ranges. Report precision, recall and F1 by class; temporal localisation metrics; false positives per match-hour; duplicate-event rate; timestamp error; confidence calibration; and performance across leagues/camera styles/broadcast quality.

Do not claim reliability based on a few hand-picked clips. Avoid data leakage between train and test matches.

## Acceptance tests

Timestamps never exceed source duration; duplicate replays are linked where possible; low-confidence or single-signal candidates require review; signal fusion is deterministic for fixed versions; every candidate records model/preprocessing versions and evidence; metrics are measured on held-out authorised footage.

## Sources

- https://github.com/SoccerNet/sn-spotting
- https://github.com/orgs/SoccerNet/repositories
- https://www.soccer-net.org/
