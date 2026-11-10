# Google AI Studio setup

This repository is private. Keep it private unless you deliberately decide to publish the skill library.

## Option A — AI Studio Build mode

Use this when you want Gemini to build the full web application.

1. Open Google AI Studio Build mode.
2. In the prompt box, open the Add files (+) menu and choose Import from GitHub.
3. Select or authorise the GitHub account that can access this repository.
4. Import shivangoat-sudo/football-shorts-agent-skills.
5. In the project workspace, open AI_STUDIO_BUILD_BRIEF.md and use it as the initial build instruction.
6. Ensure AGENTS.md and the .agents/skills directory are included in the imported project.
7. In the first build prompt, instruct the agent to read AGENTS.md, AI_STUDIO_BUILD_BRIEF.md, BUILD_SEQUENCE.md and the relevant .agents/skills/*/SKILL.md files before implementing Phase 0 only.
8. If you want two-way sync, use the GitHub tab in AI Studio Settings and link the app to the intended repository. Review the target repository and branch before pushing.

## Option B — AI Studio Agents playground

Use this when you specifically want an agent session with modular skills loaded into its workspace.

1. Open the Agents playground and create/configure an environment.
2. Add a GitHub Repositories source pointing to this repository.
3. For a private repository, authenticate inside the AI Studio environment UI using the supported GitHub Personal Access Token flow. Never send the token in a chat prompt or commit it to GitHub.
4. Confirm the repository is mounted in the workspace.
5. The project-level AGENTS.md defines the agent's general behaviour. Skills are mirrored under .agents/skills/<skill-name>/SKILL.md, the documented skill discovery location.
6. Ask the agent to load only the skills relevant to its current task.

## First prompt

Read AGENTS.md, AI_STUDIO_BUILD_BRIEF.md and BUILD_SEQUENCE.md. This repository contains the required project-specific skills under .agents/skills. Treat these files as requirements. Inspect the imported project, then implement Phase 0 only. Do not generate the entire application in one response. Return the architecture decisions, file changes, tests actually run, results, risks and the next phase. Keep all credentials in the platform's Secrets/environment interface. Do not publish videos publicly or process media unless rights checks pass.

## Documentation

- Build mode and GitHub import/sync: https://ai.google.dev/gemini-api/docs/aistudio-build-mode
- Agents playground, AGENTS.md and SKILL.md discovery: https://ai.google.dev/gemini-api/docs/aistudio-agents

AI Studio's import/sync features and the Agents playground skill-loading environment are distinct workflows. Choose the one that matches how you are building.
