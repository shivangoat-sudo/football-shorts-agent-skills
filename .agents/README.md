# AI Studio Agent Skills compatibility

The canonical skill authoring files are under skills/. For Google AI Studio's Agents playground, the same files are mirrored under .agents/skills/<skill-name>/SKILL.md, the documented discovery path.

Keep the two copies in sync. When editing a skill, update both copies in the same commit. AGENTS.md at the repository root provides the project-wide agent instructions.

In Build mode, import this repository as a project and keep AGENTS.md and the skill files in the project workspace. In Agents playground, mount this GitHub repository as a source and ensure the workspace exposes .agents/skills. The playground documentation describes AGENTS.md as preloaded and SKILL.md as the modular skill definition.

Sources:
- https://ai.google.dev/gemini-api/docs/aistudio-agents
- https://ai.google.dev/gemini-api/docs/aistudio-build-mode
