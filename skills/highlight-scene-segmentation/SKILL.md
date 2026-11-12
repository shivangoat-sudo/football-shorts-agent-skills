---
name: highlight-scene-segmentation
description: Extract each complete, coherent football highlight from edited highlight compilations as one standalone clip.
---

# Highlight scene segmentation

## Product assumption
The monitored source channel primarily publishes already-edited football highlight compilations, not full uninterrupted matches. The job is highlight extraction and reframing, not arbitrary highlight discovery across a full match. Target duration is about 20 seconds (configurable; default acceptable range 12–35 seconds), but duration is evidence-driven, never a hard trim.

## Non-negotiable clip integrity
- Every output is exactly one coherent football incident from one continuous source interval.
- Never concatenate unrelated scenes, different matches, players/actions or distant timestamps to reach a target duration.
- Each exported clip has one `source_asset_id`, one `in_time`, one `out_time`, and `out_time > in_time`.
- Preserve enough lead-in to understand the action and enough aftermath to see the outcome/reaction.
- Never cut during an ongoing dribble, shot, save, goal, tackle or celebration merely to hit 20 seconds.
- Uncertain boundaries or match identity => REVIEW, never guess or stitch.
- Rights/provenance checks remain independent and must pass before render/publish.

## Shot cuts are not automatically highlight boundaries
A highlight may contain several camera shots and replays of one incident. A camera cut alone must not split an event. Group shots only when supported by continuity, matching ball/player positions, replay transition/graphics, matching teams/kits/scoreboard, compatible event context or audio/commentary continuity. Link replay angles to the same event group; normally choose the clearest primary angle. A replay of an old incident is not a new incident.

Start a new event/match group on strong evidence of a new incident or match: title card, changed teams/kits/scoreboard, new stadium/camera context, hard transition, incompatible event timeline or long dead interval. Never merge different matches even if the transition is subtle.

## Pipeline
1. Probe authorised original media; preserve source hash, native frame rate and timestamp mapping.
2. Decode low-resolution analysis frames. Use PySceneDetect for candidate shot boundaries only, not final event boundaries.
3. Extract independent signals: shot transitions/replay graphics; scoreboard/clock/team/kit OCR; audio/crowd/commentary continuity; football action-spotting predictions; player/ball positions and motion where supported.
4. Use action predictions as event anchors. SoccerNet action spotting's 17 classes and Ball Action Spotting's 12 classes are sparse event signals, not complete clip boundaries.
5. Group replay/camera shots by event and match identity. Never cluster on temporal proximity alone.
6. Estimate start/end from meaningful build-up through final outcome/reaction; keep original-media timestamps.
7. Enforce one contiguous source interval per export. Never stitch intervals to fill gaps.
8. Link duplicate replays and normally export one primary highlight.
9. Score boundary confidence, event confidence, completeness, crop feasibility, duplicate status and rights status separately.
10. Emit a reviewable EDL with evidence, model versions and boundary confidence.

## Boundary policy
- 20 seconds is a target, not a hard cap.
- A coherent 9-second action is not padded with another event.
- A coherent 28-second action is retained if shortening it removes the outcome/reaction.
- Preserve clean source highlight boundaries unless evidence shows they are wrong.
- Split a montage of unrelated moments only at confident event boundaries, yielding separate outputs.
- Keep pre-roll/post-roll where available; never cut decisive contact, shot trajectory, save or immediate result.
- Clamp timestamps to [0, source_duration].

## Vertical reframing and action containment
Target 1080x1920, 9:16, normally 30 fps (configurable); never stretch the image.
1. Track ball and active players when confidence supports it; smooth crop motion and use look-ahead for passes, crosses and shots.
2. Build a time-varying crop path; include the ball and relevant duel/goal area, not unrelated motion.
3. Measure action containment across the whole clip: ball visibility where detectable, active-player visibility and relevant goal/trajectory context.
4. If one portrait crop cannot contain the action, use a wider adaptive crop with blurred/neutral side fill, a controlled crop transition, or REVIEW. Never cut off the ball to fill the screen.
5. Keep captions within safe areas and away from ball, goalmouth and useful scoreboard content.
6. Store crop keyframes, confidence and containment measurements.

## Candidate schema
Include candidate_id, source_asset_id/hash, event_group_id, match_group_id, replay_group_id, in_time/out_time/duration, event_type, per-signal evidence/scores, boundary/event/crop confidence, shot_ids, crop_keyframes, rights_status, review_status, model and preprocessing versions. Export only when there is one source asset and one contiguous interval, valid rights, no unresolved match/event ambiguity and acceptable crop/QC scores.

## Acceptance tests
- Synthetic compilation with three matches yields three distinct match groups; never one joined clip.
- Multiple replays/angles of one goal link to one event group.
- A camera cut during one attack does not automatically split it.
- New match/title card/scoreboard context forces a new match group.
- A 9-second action is never padded with another event; a 28-second action is not cut mid-outcome.
- Every EDL uses one source asset and one contiguous interval.
- Timestamps remain in source coordinates and within duration.
- Low-confidence boundaries/replay identity route to REVIEW.
- Crop tests verify ball/player containment over time; failed crops use safe padding or REVIEW.
- Output is 1080x1920, fully decodable, undistorted; rights failure blocks render/publish.
