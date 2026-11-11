---
name: automation-and-job-orchestration
description: Use when building durable background processing, queues, schedulers, retries, autonomous workflows, monitoring, recovery, cost budgets and emergency stop controls.
---

# Automation and job orchestration

## Design

Use durable jobs and explicit state transitions. A web request should enqueue long video processing rather than run a render synchronously.

## Extended workflow skills

The orchestration graph must use the dedicated skills for channel URL intake, authorised media acquisition, captions/commentary, music licensing, YouTube policy preflight and target-channel identity. Keep these as explicit, auditable states.

Typical job graph:
poll_source → match_authorized_asset → rights_precheck → probe_media → detect_events → rank_candidates → plan_edit → rights_recheck → render → qc → approval → upload → analytics_sync.

Each step must be independently retryable and idempotent.

## Reliability

Persist job state in PostgreSQL; do not rely only on in-memory task state. Use a queue/worker system suited to the selected host. Apply exponential backoff with jitter for transient errors and bounded retries. Send permanent failures to a dead-letter state with actionable details. Store checkpoints for long uploads/renders. Use distributed locks or unique constraints to prevent duplicate jobs. Recover incomplete jobs after worker restart. Apply timeouts and cancellation.

## Autonomy controls

Provide global pause; pause per source channel; pause publishing while allowing analysis; emergency kill switch; daily/monthly API and compute budgets; maximum clips per match; maximum render retries; alert policy; and audit log of automated decisions.

## Cost discipline

Estimate media size/render duration before queueing. Use deterministic processing before model inference. Deduplicate by hashes. Cache analysis by model/prompt/preprocessing version. Limit parallel renders to host capacity. Track storage, egress, compute, model tokens and API quota separately. Stop safely when a budget ceiling is reached.

## Acceptance tests

Worker restart resumes/requeues safely; duplicate source events create one job; failed API call does not advance state; kill switch prevents public uploads; budget exhaustion pauses the correct stage with an audit record.
