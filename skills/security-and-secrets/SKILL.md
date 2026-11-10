---
name: security-and-secrets
description: Use when designing authentication, OAuth, API keys, refresh-token storage, upload endpoints, user permissions, audit logs, private media storage and deployment security.
---

# Security and secrets

## Identity and access

Require authentication for dashboard and upload endpoints. Use role-based access with least privilege. Separate user-facing API credentials from worker credentials. Restrict source media and render storage to authorised users/services. Use short-lived signed upload/download URLs where supported.

## Secret handling

Store Gemini API keys, YouTube OAuth client secrets, refresh tokens, database credentials and object-storage keys in the hosting provider's secret manager. Encrypt refresh tokens at rest using envelope encryption or managed KMS where available. Rotate secrets and support revocation. Never commit secrets or real environment files. Redact credentials, signed URLs and personal data from logs and model prompts. Never send OAuth tokens or private keys to Gemini.

## Upload security

Validate MIME type by probing actual file content, not filename alone. Enforce file size, duration, codec and storage limits. Generate server-side filenames; never trust client paths. Scan or sandbox untrusted media parsers where feasible. Prevent path traversal, archive bombs and overwrite attacks. Keep originals immutable and isolate processing workers.

## Application security

Use HTTPS, secure cookies, CSRF protection and strict CORS. Validate all API inputs and model outputs. Rate-limit authentication and upload endpoints. Apply dependency scanning, pinned versions, SBOM generation and vulnerability updates. Keep audit events for rights changes, OAuth changes, publication approvals and admin actions.

## Acceptance tests

Secrets do not appear in logs/frontend bundles; unauthenticated upload is denied; oversized/malformed media is rejected; user cannot access another user's assets; OAuth state/redirect validation blocks CSRF; revoked tokens disable publishing cleanly.
