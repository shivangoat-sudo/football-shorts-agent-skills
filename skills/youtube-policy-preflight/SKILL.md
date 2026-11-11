---
name: youtube-policy-preflight
description: Use before rendering approval and every YouTube upload to assess copyright, reused or inauthentic content, community guidelines, advertiser suitability and platform policy risks.
---

# YouTube policy and monetisation preflight

## Purpose and limitation

This is a risk-control checklist, not a YouTube approval API and not legal advice. No automated system can guarantee that YouTube will accept, retain, recommend or monetise a video. Policies, enforcement, Content ID and human review can change outcomes after upload.

## Required checks

1. Rights and provenance: verify separate grants for match footage, broadcast footage, music, sound effects, graphics, fonts, logos, voice and commentary. Rights must cover the planned platform, territory, date, edits, commercial use and duration.
2. Originality and reused content: determine whether the Short adds clear, substantive original commentary, explanation, critique, educational value or a distinctive story. Minimal cropping, captions, transitions, music or compilations are not enough to guarantee monetisation eligibility.
3. Inauthentic/repetitive content: detect mass-produced templates, near-identical videos, repetitive clips and low-value automated output. Require meaningful editorial variation and an authored reason for publishing each clip.
4. Copyright: flag known third-party music, broadcast commentary, logos and other protected assets. A licence reduces rights risk but does not guarantee that automated Content ID will not claim the upload.
5. Community and advertiser suitability: screen for graphic injuries, violence, hate, harassment, dangerous acts, gambling, sexual content, misinformation and other current policy-sensitive elements. Use human review where classifier confidence is insufficient.
6. Metadata integrity: titles, descriptions, tags and thumbnails must accurately represent the video and must not use misleading claims, spam, keyword stuffing or deceptive metadata.
7. Channel and upload state: verify the authenticated target channel, visibility, duplicate status, schedule and explicit publication policy.

## Decision states

- PASS: all deterministic rights and technical checks pass; no unresolved high-risk policy flags.
- REVIEW: uncertain content, borderline editorial contribution, possible claims, unclear policy interpretation or low-confidence detection. Require human review.
- BLOCK: missing/expired/revoked rights, prohibited content, incorrect channel, failed QC, duplicate conflict or a known policy violation.

Never turn REVIEW into PASS solely to increase publishing volume. A licence does not automatically satisfy reused-content monetisation requirements.

## Release evidence

Store policy-check version, rule version, asset hashes, model/classifier versions, findings, reviewer, timestamp and final decision. Re-run time-sensitive checks immediately before upload. Keep the user's final approval and upload certification.

## Acceptance tests

Rights failures block; thinly transformed clips are flagged; repeated template output is detected; high-risk uncertain material requires review; metadata mismatch is caught; no component claims guaranteed acceptance or monetisation.
