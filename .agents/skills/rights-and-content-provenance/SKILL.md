---
name: rights-and-content-provenance
description: Use whenever footage, music, commentary, graphics, logos, fonts or third-party assets are ingested, edited, stored, monetised or published; enforce rights scope and provenance.
---

# Rights management and content provenance

A public video URL, creator permission, subscription or ability to watch a match does not by itself grant commercial reuse rights. Rights may be split between source creator, broadcaster, league, clubs, music owners, commentators and other parties.

## Rights records

Maintain separate auditable grants for original source video/creator-owned elements, broadcast footage, music/sound effects, graphics/fonts/photos/logos, and commentary/voiceover.

Each grant should include rights holder and evidence reference; asset/source IDs and SHA-256; permitted use (reproduction, editing, derivative works, commercial use); platforms, territories and languages; start/end dates and duration limits; monetisation/sublicensing permission where relevant; attribution requirements; restrictions/revocation status; reviewer and verification timestamp; audit history.

## Fail-closed policy

- Missing, ambiguous, expired, revoked or out-of-scope rights = BLOCK.
- Do not infer rights from a source channel's permission if broadcast footage belongs to a separate rights holder.
- A grant for one match/video does not automatically cover others.
- Music licence must cover platform, territory, commercial use and edited synchronisation.
- Recheck rights at render and immediately before upload/publication.
- Keep evidence for every published asset.

## Platform policy is separate

Even with a valid licence, YouTube may reject monetisation under reused-content or other monetisation rules. A licence does not guarantee monetisation. Require meaningful original contribution and keep content-policy risk visible.

## Acceptance tests

Expired grant blocks; wrong territory/platform blocks; missing broadcast grant blocks even if source-video grant exists; missing music grant blocks when music is included; revocation blocks future publication; every decision has a reason and audit event.

This is an engineering checklist, not legal advice. Obtain written commercial licences and professional legal review where needed.
