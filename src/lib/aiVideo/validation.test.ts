import assert from "node:assert/strict";
import test from "node:test";
import { validateAIVideoDraft } from "./validation";
import type { AIVideoDraft } from "./types";

function makeDraft(overrides: Partial<AIVideoDraft> = {}): AIVideoDraft {
  return {
    prompt: "A cinematic football story",
    durationSec: 20,
    aspectRatio: "9:16",
    language: "English",
    characters: [
      {
        id: "character-1",
        name: "Main character",
        appearanceNotes: "Short dark hair",
        continuityNotes: "Keep the same jacket",
        referenceImages: [
          { id: "image-1", file: {} as File, label: "Front view" },
        ],
      },
    ],
    scenes: [
      {
        id: "scene-1",
        startSec: 0,
        endSec: 8,
        action: "Walks into the stadium",
        camera: "Wide tracking shot",
        location: "Tunnel",
        characterIds: ["character-1"],
        dialogue: "",
        audioNotes: "",
      },
      {
        id: "scene-2",
        startSec: 8,
        endSec: 20,
        action: "Looks toward the pitch",
        camera: "Slow close-up",
        location: "Sideline",
        characterIds: ["character-1"],
        dialogue: "",
        audioNotes: "",
      },
    ],
    ...overrides,
  };
}

test("accepts a complete draft with a continuous timeline", () => {
  assert.deepEqual(validateAIVideoDraft(makeDraft()), []);
});

test("rejects durations outside 10–300 whole seconds", () => {
  for (const durationSec of [9, 301, 20.5]) {
    const issues = validateAIVideoDraft(makeDraft({ durationSec }));
    assert.ok(issues.some((issue) => issue.path === "durationSec"));
  }
});

test("rejects missing prompt, language, character reference and scenes", () => {
  const draft = makeDraft({
    prompt: " ",
    language: " ",
    characters: [{ ...makeDraft().characters[0], referenceImages: [] }],
    scenes: [],
  });
  const paths = validateAIVideoDraft(draft).map((issue) => issue.path);
  assert.ok(paths.includes("prompt"));
  assert.ok(paths.includes("language"));
  assert.ok(paths.includes("characters[0].referenceImages"));
  assert.ok(paths.includes("scenes"));
});

test("rejects gaps, overlaps and incomplete scene coverage", () => {
  const base = makeDraft();
  const gap = makeDraft({
    scenes: [{ ...base.scenes[0], endSec: 7 }, { ...base.scenes[1], startSec: 8 }],
  });
  assert.ok(validateAIVideoDraft(gap).some((issue) => issue.code === "invalid_timeline"));

  const overlap = makeDraft({
    scenes: [{ ...base.scenes[0], endSec: 9 }, { ...base.scenes[1], startSec: 8 }],
  });
  assert.ok(validateAIVideoDraft(overlap).some((issue) => issue.code === "invalid_timeline"));

  const incomplete = makeDraft({
    scenes: [{ ...base.scenes[0], endSec: 8 }],
  });
  assert.ok(validateAIVideoDraft(incomplete).some((issue) => issue.code === "invalid_timeline"));
});

test("rejects scene references to unknown characters", () => {
  const draft = makeDraft({
    scenes: [{ ...makeDraft().scenes[0], endSec: 20, characterIds: ["missing"] }],
  });
  assert.ok(
    validateAIVideoDraft(draft).some((issue) => issue.code === "invalid_reference")
  );
});

test("rejects duplicate scene and character identifiers", () => {
  const draft = makeDraft();
  const duplicate = makeDraft({
    characters: [draft.characters[0], { ...draft.characters[0], name: "Second" }],
    scenes: [
      draft.scenes[0],
      { ...draft.scenes[1], id: draft.scenes[0].id, startSec: 8 },
    ],
  });
  const codes = validateAIVideoDraft(duplicate).map((issue) => issue.code);
  assert.ok(codes.includes("duplicate_id"));
});
