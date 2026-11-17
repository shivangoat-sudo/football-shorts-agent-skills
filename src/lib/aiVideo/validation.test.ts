import { validateAIVideoDraft } from "./validation";
import type { AIVideoDraft } from "./types";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

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

const tests: Array<[string, () => void]> = [
  ["accepts a complete draft with a continuous timeline", () => {
    assert(validateAIVideoDraft(makeDraft()).length === 0, "valid draft was rejected");
  }],
  ["rejects durations outside 10–300 whole seconds", () => {
    for (const durationSec of [9, 301, 20.5]) {
      assert(
        validateAIVideoDraft(makeDraft({ durationSec })).some((issue) => issue.path === "durationSec"),
        `duration ${durationSec} was accepted`
      );
    }
  }],
  ["rejects missing prompt, language, character reference and scenes", () => {
    const draft = makeDraft({
      prompt: " ",
      language: " ",
      characters: [{ ...makeDraft().characters[0], referenceImages: [] }],
      scenes: [],
    });
    const paths = validateAIVideoDraft(draft).map((issue) => issue.path);
    for (const path of ["prompt", "language", "characters[0].referenceImages", "scenes"]) {
      assert(paths.includes(path), `missing validation error for ${path}`);
    }
  }],
  ["rejects gaps, overlaps and incomplete scene coverage", () => {
    const base = makeDraft();
    const gap = makeDraft({
      scenes: [{ ...base.scenes[0], endSec: 7 }, { ...base.scenes[1], startSec: 8 }],
    });
    assert(validateAIVideoDraft(gap).some((issue) => issue.code === "invalid_timeline"), "gap was accepted");

    const overlap = makeDraft({
      scenes: [{ ...base.scenes[0], endSec: 9 }, { ...base.scenes[1], startSec: 8 }],
    });
    assert(validateAIVideoDraft(overlap).some((issue) => issue.code === "invalid_timeline"), "overlap was accepted");

    const incomplete = makeDraft({
      scenes: [{ ...base.scenes[0], endSec: 8 }],
    });
    assert(validateAIVideoDraft(incomplete).some((issue) => issue.code === "invalid_timeline"), "incomplete timeline was accepted");
  }],
  ["rejects scene references to unknown characters", () => {
    const draft = makeDraft({
      scenes: [{ ...makeDraft().scenes[0], endSec: 20, characterIds: ["missing"] }],
    });
    assert(validateAIVideoDraft(draft).some((issue) => issue.code === "invalid_reference"), "unknown character was accepted");
  }],
  ["rejects duplicate scene and character identifiers", () => {
    const draft = makeDraft();
    const duplicate = makeDraft({
      characters: [draft.characters[0], { ...draft.characters[0], name: "Second" }],
      scenes: [
        draft.scenes[0],
        { ...draft.scenes[1], id: draft.scenes[0].id, startSec: 8 },
      ],
    });
    assert(validateAIVideoDraft(duplicate).some((issue) => issue.code === "duplicate_id"), "duplicate ID was accepted");
  }],
];

for (const [name, run] of tests) {
  run();
  console.log(`PASS ${name}`);
}
console.log(`Passed ${tests.length} AI Video Studio validation tests.`);
