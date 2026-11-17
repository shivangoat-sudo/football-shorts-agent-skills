import { useMemo, useState } from "react";
import { ImagePlus, Plus, Trash2, ArrowUp, ArrowDown, Film, ShieldAlert } from "lucide-react";
import {
  AI_VIDEO_ASPECT_RATIOS,
  AI_VIDEO_MAX_DURATION_SEC,
  AI_VIDEO_MIN_DURATION_SEC,
  type AIVideoDraft,
  type AIVideoSceneDraft,
} from "../lib/aiVideo/types";
import { validateAIVideoDraft } from "../lib/aiVideo/validation";

const makeId = () => globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const initialDraft: AIVideoDraft = {
  prompt: "",
  durationSec: 30,
  aspectRatio: "16:9",
  language: "English",
  characters: [],
  scenes: [{
    id: makeId(),
    startSec: 0,
    endSec: 30,
    action: "",
    camera: "Cinematic medium shot",
    location: "",
    characterIds: [],
    dialogue: "",
    audioNotes: "",
  }],
};

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export default function AIVideoStudio() {
  const [draft, setDraft] = useState<AIVideoDraft>(initialDraft);
  const [selectedSceneId, setSelectedSceneId] = useState(initialDraft.scenes[0].id);
  const [workerConfigured] = useState(false);
  const issues = useMemo(() => validateAIVideoDraft(draft), [draft]);
  const selectedScene = draft.scenes.find((scene) => scene.id === selectedSceneId) ?? draft.scenes[0];

  function updateScene(id: string, patch: Partial<AIVideoSceneDraft>) {
    setDraft((current) => ({
      ...current,
      scenes: current.scenes.map((scene) => scene.id === id ? { ...scene, ...patch } : scene),
    }));
  }

  function updateDuration(value: number) {
    const durationSec = Math.max(AI_VIDEO_MIN_DURATION_SEC, Math.min(AI_VIDEO_MAX_DURATION_SEC, value));
    setDraft((current) => {
      const scenes = [...current.scenes];
      if (scenes.length) scenes[scenes.length - 1] = { ...scenes[scenes.length - 1], endSec: durationSec };
      return { ...current, durationSec, scenes };
    });
  }

  function addScene() {
    const last = draft.scenes[draft.scenes.length - 1];
    const split = last ? Math.floor((last.startSec + last.endSec) / 2) : 0;
    if (last && split <= last.startSec) return;
    const next: AIVideoSceneDraft = {
      id: makeId(),
      startSec: split,
      endSec: draft.durationSec,
      action: "",
      camera: "Cinematic medium shot",
      location: "",
      characterIds: [],
      dialogue: "",
      audioNotes: "",
    };
    setDraft((current) => ({
      ...current,
      scenes: last
        ? [...current.scenes.slice(0, -1), { ...last, endSec: split }, next]
        : [next],
    }));
    setSelectedSceneId(next.id);
  }

  function removeScene(id: string) {
    if (draft.scenes.length <= 1) return;
    const index = draft.scenes.findIndex((scene) => scene.id === id);
    const next = draft.scenes.filter((scene) => scene.id !== id);
    if (index > 0) next[index - 1] = { ...next[index - 1], endSec: next[index]?.startSec ?? draft.durationSec };
    else next[0] = { ...next[0], startSec: 0 };
    setDraft((current) => ({ ...current, scenes: next }));
    setSelectedSceneId(next[Math.max(0, index - 1)].id);
  }

  function moveScene(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= draft.scenes.length) return;
    setDraft((current) => {
      const scenes = [...current.scenes];
      [scenes[index], scenes[target]] = [scenes[target], scenes[index]];
      return { ...current, scenes };
    });
  }

  function addCharacter(file?: File) {
    const character = {
      id: makeId(),
      name: `Personage ${draft.characters.length + 1}`,
      appearanceNotes: "",
      continuityNotes: "",
      referenceImages: file ? [{ id: makeId(), file, label: file.name }] : [],
    };
    setDraft((current) => ({ ...current, characters: [...current.characters, character] }));
  }

  return (
    <section className="ai-studio" aria-labelledby="ai-studio-title">
      <header className="ai-studio-header">
        <div>
          <div className="ai-studio-kicker">TOUCHLINE / GENERATIVE VIDEO</div>
          <h1 id="ai-studio-title">AI Video Studio</h1>
          <p>Ontwerp een video met personages, referentiebeelden en een scène-voor-scène tijdlijn.</p>
        </div>
        <span className="ai-studio-status">Studio · Preview</span>
      </header>

      <div className="ai-studio-grid">
        <div className="ai-studio-main">
          <section className="ai-panel">
            <div className="ai-panel-title"><Film size={17} /> Projectinstellingen</div>
            <label className="ai-field">Hoofdprompt
              <textarea value={draft.prompt} onChange={(event) => setDraft((current) => ({ ...current, prompt: event.target.value }))} placeholder="Beschrijf de film, visuele stijl, sfeer en het gewenste verhaal..." rows={4} />
            </label>
            <div className="ai-settings-grid">
              <label className="ai-field">Duur (seconden)
                <input type="number" min={AI_VIDEO_MIN_DURATION_SEC} max={AI_VIDEO_MAX_DURATION_SEC} step={1} value={draft.durationSec} onChange={(event) => updateDuration(Number(event.target.value) || AI_VIDEO_MIN_DURATION_SEC)} />
              </label>
              <label className="ai-field">Beeldverhouding
                <select value={draft.aspectRatio} onChange={(event) => setDraft((current) => ({ ...current, aspectRatio: event.target.value as AIVideoDraft["aspectRatio"] }))}>
                  {AI_VIDEO_ASPECT_RATIOS.map((ratio) => <option key={ratio} value={ratio}>{ratio}</option>)}
                </select>
              </label>
              <label className="ai-field">Taal
                <select value={draft.language} onChange={(event) => setDraft((current) => ({ ...current, language: event.target.value }))}>
                  <option>English</option><option>Nederlands</option><option>Español</option><option>Deutsch</option><option>Français</option>
                </select>
              </label>
            </div>
          </section>

          <section className="ai-panel">
            <div className="ai-panel-heading">
              <div><div className="ai-panel-title"><ImagePlus size={17} /> Personages</div><p>Voeg referentiebeelden toe om het uiterlijk per scène te beschrijven.</p></div>
              <label className="ai-button ai-button-secondary"> <Plus size={15} /> Personage
                <input type="file" accept="image/*" hidden onChange={(event) => { addCharacter(event.target.files?.[0]); event.currentTarget.value = ""; }} />
              </label>
            </div>
            {draft.characters.length === 0 ? <div className="ai-empty">Nog geen personages. Voeg een personage met een referentieafbeelding toe.</div> : draft.characters.map((character) => (
              <div className="ai-character" key={character.id}>
                <div className="ai-character-preview">{character.referenceImages[0] ? <img src={URL.createObjectURL(character.referenceImages[0].file)} alt={character.name} /> : <ImagePlus size={20} />}</div>
                <div className="ai-character-fields">
                  <input aria-label="Naam personage" value={character.name} onChange={(event) => setDraft((current) => ({ ...current, characters: current.characters.map((item) => item.id === character.id ? { ...item, name: event.target.value } : item) }))} />
                  <input aria-label="Uiterlijk personage" placeholder="Uiterlijk, kleding en herkenbare details" value={character.appearanceNotes} onChange={(event) => setDraft((current) => ({ ...current, characters: current.characters.map((item) => item.id === character.id ? { ...item, appearanceNotes: event.target.value } : item) }))} />
                  <input aria-label="Continuïteit personage" placeholder="Continuïteit: wat moet in iedere scène hetzelfde blijven?" value={character.continuityNotes} onChange={(event) => setDraft((current) => ({ ...current, characters: current.characters.map((item) => item.id === character.id ? { ...item, continuityNotes: event.target.value } : item) }))} />
                </div>
                <button className="ai-icon-button" type="button" aria-label="Verwijder personage" onClick={() => setDraft((current) => ({ ...current, characters: current.characters.filter((item) => item.id !== character.id), scenes: current.scenes.map((scene) => ({ ...scene, characterIds: scene.characterIds.filter((id) => id !== character.id) })) }))}><Trash2 size={16} /></button>
              </div>
            ))}
          </section>

          <section className="ai-panel">
            <div className="ai-panel-heading">
              <div><div className="ai-panel-title">Scènes & tijdlijn</div><p>{draft.scenes.length} scènes · totale lengte {formatTime(draft.durationSec)}</p></div>
              <button className="ai-button ai-button-secondary" type="button" onClick={addScene}><Plus size={15} /> Scène toevoegen</button>
            </div>
            <div className="ai-timeline">
              {draft.scenes.map((scene, index) => (
                <button type="button" key={scene.id} className={`ai-timeline-scene ${selectedSceneId === scene.id ? "is-selected" : ""}`} style={{ flexGrow: Math.max(1, scene.endSec - scene.startSec) }} onClick={() => setSelectedSceneId(scene.id)}>
                  <strong>SCÈNE {index + 1}</strong><span>{formatTime(scene.startSec)} – {formatTime(scene.endSec)}</span>
                </button>
              ))}
            </div>
            {selectedScene && <div className="ai-scene-editor">
              <div className="ai-scene-top"><strong>Scène {draft.scenes.findIndex((scene) => scene.id === selectedScene.id) + 1}</strong><div className="ai-scene-actions">
                <button type="button" className="ai-icon-button" aria-label="Scène omhoog" onClick={() => moveScene(draft.scenes.findIndex((scene) => scene.id === selectedScene.id), -1)}><ArrowUp size={15} /></button>
                <button type="button" className="ai-icon-button" aria-label="Scène omlaag" onClick={() => moveScene(draft.scenes.findIndex((scene) => scene.id === selectedScene.id), 1)}><ArrowDown size={15} /></button>
                <button type="button" className="ai-icon-button" aria-label="Scène verwijderen" onClick={() => removeScene(selectedScene.id)} disabled={draft.scenes.length <= 1}><Trash2 size={15} /></button>
              </div></div>
              <div className="ai-settings-grid">
                <label className="ai-field">Start (sec)<input type="number" min="0" max={draft.durationSec} value={selectedScene.startSec} onChange={(event) => updateScene(selectedScene.id, { startSec: Number(event.target.value) })} /></label>
                <label className="ai-field">Einde (sec)<input type="number" min="1" max={draft.durationSec} value={selectedScene.endSec} onChange={(event) => updateScene(selectedScene.id, { endSec: Number(event.target.value) })} /></label>
              </div>
              <label className="ai-field">Actie / scènebeschrijving<textarea rows={3} value={selectedScene.action} onChange={(event) => updateScene(selectedScene.id, { action: event.target.value })} placeholder="Wat gebeurt er precies in beeld?" /></label>
              <div className="ai-settings-grid">
                <label className="ai-field">Camera<input value={selectedScene.camera} onChange={(event) => updateScene(selectedScene.id, { camera: event.target.value })} placeholder="Close-up, tracking shot..." /></label>
                <label className="ai-field">Locatie<input value={selectedScene.location} onChange={(event) => updateScene(selectedScene.id, { location: event.target.value })} placeholder="Waar speelt de scène zich af?" /></label>
              </div>
              <label className="ai-field">Personages in deze scène
                <select multiple value={selectedScene.characterIds} onChange={(event) => updateScene(selectedScene.id, { characterIds: Array.from(event.target.selectedOptions, (option) => option.value) })}>
                  {draft.characters.map((character) => <option key={character.id} value={character.id}>{character.name}</option>)}
                </select>
              </label>
              <label className="ai-field">Dialoog<input value={selectedScene.dialogue} onChange={(event) => updateScene(selectedScene.id, { dialogue: event.target.value })} placeholder="Gesproken tekst (optioneel)" /></label>
              <label className="ai-field">Audio / geluid<input value={selectedScene.audioNotes} onChange={(event) => updateScene(selectedScene.id, { audioNotes: event.target.value })} placeholder="Omgevingsgeluid, muziek, effecten..." /></label>
            </div>}
          </section>
        </div>

        <aside className="ai-studio-side">
          <section className="ai-panel ai-validation-panel">
            <div className="ai-panel-title"><ShieldAlert size={17} /> Projectcontrole</div>
            <div className={issues.length ? "ai-validation-count has-issues" : "ai-validation-count"}>{issues.length ? `${issues.length} aandachtspunten` : "Concept is geldig"}</div>
            {issues.length ? <ul>{issues.map((issue, index) => <li key={`${issue.path}-${index}`}>{issue.message}</li>)}</ul> : <p>De prompt, personages en tijdlijn voldoen aan de basiscontroles.</p>}
          </section>
          <section className="ai-panel">
            <div className="ai-panel-title">Generatie</div>
            <div className="ai-worker-status"><span className="ai-status-dot" /> GPU-worker niet gekoppeld</div>
            <p>De editor is beschikbaar. Videogeneratie wordt pas ingeschakeld nadat een echte GPU-worker en de modelmogelijkheden zijn geverifieerd.</p>
            <button type="button" className="ai-button ai-button-primary" disabled title="Worker nog niet geconfigureerd">Genereer video</button>
            <p className="ai-small-note">Geen nep-opdracht of fictieve voortgang. Je project wordt op dit moment lokaal in deze sessie bewerkt.</p>
          </section>
        </aside>
      </div>
    </section>
  );
}
