import {
  AI_VIDEO_ASPECT_RATIOS,
  AI_VIDEO_MAX_DURATION_SEC,
  AI_VIDEO_MIN_DURATION_SEC,
  type AIVideoDraft,
  type AIVideoValidationIssue,
} from "./types";

export function validateAIVideoDraft(
  draft: AIVideoDraft
): AIVideoValidationIssue[] {
  const issues: AIVideoValidationIssue[] = [];
  const add = (
    path: string,
    code: AIVideoValidationIssue["code"],
    message: string
  ) => issues.push({ path, code, message });

  if (!draft.prompt.trim()) {
    add("prompt", "required", "Vul een hoofdprompt in.");
  }

  if (
    !Number.isInteger(draft.durationSec) ||
    draft.durationSec < AI_VIDEO_MIN_DURATION_SEC ||
    draft.durationSec > AI_VIDEO_MAX_DURATION_SEC
  ) {
    add(
      "durationSec",
      "out_of_range",
      `De videoduur moet een geheel aantal seconden tussen ${AI_VIDEO_MIN_DURATION_SEC} en ${AI_VIDEO_MAX_DURATION_SEC} zijn.`
    );
  }

  if (!AI_VIDEO_ASPECT_RATIOS.includes(draft.aspectRatio)) {
    add("aspectRatio", "invalid_value", "Deze beeldverhouding wordt niet ondersteund.");
  }

  if (!draft.language.trim()) {
    add("language", "required", "Kies een taal.");
  }

  const characterIds = new Set<string>();
  for (const [index, character] of draft.characters.entries()) {
    const path = `characters[${index}]`;
    if (!character.id.trim() || characterIds.has(character.id)) {
      add(`${path}.id`, "duplicate_id", "Personage-ID ontbreekt of is dubbel.");
    }
    characterIds.add(character.id);

    if (!character.name.trim()) {
      add(`${path}.name`, "required", "Geef ieder personage een naam.");
    }
    if (character.referenceImages.length === 0) {
      add(
        `${path}.referenceImages`,
        "required",
        "Voeg minimaal één referentieafbeelding toe aan ieder personage."
      );
    }
    const imageIds = new Set<string>();
    for (const image of character.referenceImages) {
      if (!image.id.trim() || imageIds.has(image.id)) {
        add(
          `${path}.referenceImages`,
          "duplicate_id",
          "Referentieafbeelding-ID ontbreekt of is dubbel."
        );
      }
      imageIds.add(image.id);
    }
  }

  if (draft.scenes.length === 0) {
    add("scenes", "required", "Voeg minimaal één scène toe.");
    return issues;
  }

  let expectedStart = 0;
  const sceneIds = new Set<string>();
  for (const [index, scene] of draft.scenes.entries()) {
    const path = `scenes[${index}]`;

    if (!scene.id.trim() || sceneIds.has(scene.id)) {
      add(`${path}.id`, "duplicate_id", "Scène-ID ontbreekt of is dubbel.");
    }
    sceneIds.add(scene.id);

    if (
      !Number.isFinite(scene.startSec) ||
      !Number.isFinite(scene.endSec) ||
      scene.startSec < 0 ||
      scene.endSec <= scene.startSec ||
      scene.endSec > draft.durationSec
    ) {
      add(
        `${path}.time`,
        "invalid_timeline",
        "De scène moet een geldige start- en eindtijd binnen de totale videoduur hebben."
      );
    }

    if (Math.abs(scene.startSec - expectedStart) > 0.001) {
      add(
        `${path}.startSec`,
        "invalid_timeline",
        "Scènes moeten chronologisch aansluiten, zonder overlap of tijdsgat."
      );
    }
    expectedStart = scene.endSec;

    if (!scene.action.trim()) {
      add(`${path}.action`, "required", "Beschrijf de actie in deze scène.");
    }

    for (const characterId of scene.characterIds) {
      if (!characterIds.has(characterId)) {
        add(
          `${path}.characterIds`,
          "invalid_reference",
          `Scène verwijst naar een onbekend personage: ${characterId}.`
        );
      }
    }
  }

  if (Math.abs(expectedStart - draft.durationSec) > 0.001) {
    add(
      "scenes",
      "invalid_timeline",
      "De scènes moeten samen exact de volledige gevraagde videoduur afdekken."
    );
  }

  return issues;
}
