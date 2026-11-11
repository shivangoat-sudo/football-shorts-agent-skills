# Google AI Studio setup

This repository is a private build-time knowledge pack, not a runnable app. Keep it separate from the frontend/application repository unless you intentionally copy its instructions into the app project.

## Build mode

1. Open Google AI Studio Build mode.
2. Open the Add files (+) menu and choose Import from GitHub, or provide the extracted files if the GitHub import route is unavailable.
3. Ensure `AGENTS.md`, `BUILD_SEQUENCE.md`, `AI_STUDIO_BUILD_BRIEF.md`, `SOURCES_AND_LICENSES.md`, and the full `.agents/skills/` directory are accessible in the project workspace.
4. Ask the builder to read the project instructions and inspect every skill file before planning implementation.
5. Build one phase at a time. Do not attempt all backend, media processing and publishing features in one prompt.
6. Keep secrets in the platform's secret manager or deployment environment, never in prompts or source files.
7. Review the target GitHub repository and branch before enabling sync or pushing changes.

## Agents playground

For a dedicated skill-loading environment, use the Agents playground and mount the GitHub repository as a source if that capability is available for the account. Confirm that `AGENTS.md` and `.agents/skills/*/SKILL.md` are actually visible to the agent. Do not assume that Build mode automatically loads skill files from a separate repository.

## First instruction

Use the prompt supplied in the project handoff: read AGENTS.md, AI_STUDIO_BUILD_BRIEF.md, BUILD_SEQUENCE.md, SOURCES_AND_LICENSES.md and all 16 skills under .agents/skills. Produce a skill coverage matrix and a phased implementation plan before writing code. Then implement only the next uncompleted phase.

## Security

Never paste GitHub personal access tokens, OAuth refresh tokens, API keys or passwords into chat prompts. Authenticate through the relevant product UI and store credentials in supported secret management.
