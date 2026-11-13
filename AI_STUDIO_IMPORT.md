# Google AI Studio import guide

This repository now contains a runnable Vite + React application at its root.

## Import
1. Import this repository into Google AI Studio Build mode.
2. Allow it to install the dependencies from the root package.json.
3. Start the app with `npm run dev` (the default Vite development command).
4. Run `npm run build` to verify the production build.

## Important status
The current code is a real, runnable frontend shell. The source form and rights-gate interactions work locally in the browser. YouTube OAuth, Gemini video analysis, licensed-media upload/storage, FFmpeg processing, captions, and publishing are not connected yet. The interface deliberately labels those integrations as not connected; it does not pretend that a video has been processed.

The original `skills/`, `.agents/`, and build-planning documents remain in the repository as implementation references. Read `AGENTS.md`, `AI_STUDIO_BUILD_BRIEF.md`, `BUILD_SEQUENCE.md`, and `SOURCES_AND_LICENSES.md` before implementing backend integrations.

## Rights and safety
- Do not download or extract footage from YouTube URLs.
- Only process original footage uploaded by the user or media for which editing and publishing rights are documented.
- Keep publishing disabled until channel identity, rights, quality, and policy checks pass.
- Use private/unlisted testing first.
- Never put API keys or OAuth secrets in source files.
