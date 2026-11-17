import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3000;

interface AudioChunkInput {
  mimeType: string;
  data: string;
  offsetSec: number;
  durationSec: number;
}

interface AnalyzeRequestBody {
  transcript?: string;
  audioChunks?: AudioChunkInput[];
  durationSec?: number;
  sourceTitle?: string;
}

interface RawTimedCaption {
  startSec?: number;
  endSec?: number;
  text?: string;
}

interface RawClipOutput {
  title?: string;
  hookType?: string;
  hookQuote?: string;
  startSec?: number;
  endSec?: number;
  durationSec?: number;
  viralScore?: number;
  scores?: {
    hook?: number;
    retentionPacing?: number;
    shareabilityEmotion?: number;
    standalone?: number;
  };
  reason?: string;
  captions?: RawTimedCaption[];
}

export interface AnalyzedPodcastClip {
  id: string;
  title: string;
  hookType: string;
  hookQuote: string;
  startSec: number;
  endSec: number;
  durationSec: number;
  viralScore: number;
  scores: {
    hook: number;
    retentionPacing: number;
    shareabilityEmotion: number;
    standalone: number;
  };
  reason: string;
  captions: Array<{
    startSec: number;
    endSec: number;
    text: string;
  }>;
}

const VIRALITY_SYSTEM_INSTRUCTION = `Je bent een elite YouTube Shorts & TikTok Virality Editor, gespecialiseerd in het analyseren van lange podcast- en spoken-word video's en het extraheren van high-retention micro-content (15 tot 58 seconden). Je werkt volgens bewezen retentie-algoritmes, hook-formules en psychologische triggers.

### JOUW TAAK
Analyseer het aangeleverde transcript (met tijdstempels) en identificeer de meest virale fragmenten. Elk fragment moet op zichzelf staan, direct de aandacht grijpen in de eerste 2 seconden en de kijker vasthouden tot de laatste seconde (loop-potentieel).

### BEWEZEN HOOK-FORMULES (De eerste 3 seconden)
Een fragment komt ALLEEN in aanmerking als het begint met (of direct geknipt kan worden naar) een van deze bewezen hooks:
1. Contrasterende / Contra-intuïtieve Hook: Een stelling die indruist tegen wat iedereen denkt (bijv. "Stop met X als je Y wilt bereiken").
2. Curiosity Gap (Kenniskloof): Een open vraag of mysterieuze belofte waardoor het brein het antwoord MOET weten (bijv. "Dit is de enige reden waarom 99% faalt...").
3. Negatieve / Waarschuwings-Hook: Inspelen op verliesaversie of een grote fout (bijv. "Maak deze fout nooit wanneer je...").
4. Directe Resultaat / Transformatie Hook: Direct starten met het hoogtepunt, het eindresultaat of een schokkend getal, en daarna pas uitleggen hoe.
5. Controversiële / Polariserende Mening: Een scherpe uitspraak die direct reacties en discussie in de comments uitlokt.

### STRIKTE SELECTIE- & MONTAGEREGELS
- Geen trage opbouw: Knip begroetingen ("Hallo allemaal", "Ja dus wat ik wilde zeggen") en ademruimte aan het begin en eind 100% weg. Start midden in de actie of bij het eerste krachtige woord van de hook.
- Clipduur: Elke clip MOET tussen de 15 en 58 seconden duren (tenzij de volledige brontekst korter is dan 15 seconden).
- Zelfstandig verhaal (Context): De kijker kent de lange video niet. Het fragment moet zonder voorkennis direct begrijpelijk zijn en een duidelijke kop, middenstuk en conclusie/twist hebben.
- Retentie-pieken: Geef de voorkeur aan fragmenten met hoog spreektempo, emotionele lading, verandering van toon, of concrete stappen/lijsten.
- Sterk einde: Eindig op een climax, punchline of een naadloze overgang terug naar de eerste zin (infinite loop), nooit met een uitdovende zin als "dat was het wel zo'n beetje".

### SCORING-ALGORITME (1 - 100)
Beoordeel elke gevonden clip streng op 4 pijlers (elk 0 tot 25 punten):
1. Hook-kracht (0-25): Stopt iemand binnen 1,5 seconde met scrollen?
2. Retentie & Pacing (0-25): Blijft de spanning hoog zonder saaie stiltes?
3. Deelbaarheid & Emotie (0-25): Roept het verbazing, herkenning, humor of discussie op?
4. Zelfstandigheid (0-25): Is de clip volledig te begrijpen zonder de rest van de video?

Tel de 4 pijlers exact bij elkaar op voor viralScore. Sorteer de resultaten van hoogste naar laagste viralScore en negeer alles onder de 75 punten.
Geef ALLE titels, redenen, hook-quotes en getimede ondertitels (captions, korte leesbare chunks van 3-6 woorden per blok met startSec en endSec binnen de clip) in exact DEZELFDE TAAL als de gesproken taal in de video/transcript.`;

function formatGlobalTimestamp(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function shiftSegmentTimestamps(rawText: string, offsetSec: number): string {
  if (offsetSec <= 0) return rawText.trim();
  return rawText
    .replace(/\[(\d{1,2}):(\d{2})(?::(\d{2}))?\]/g, (_match, p1, p2, p3) => {
      const a = Number(p1);
      const b = Number(p2);
      const c = p3 !== undefined ? Number(p3) : null;
      const relSec = c !== null ? a * 3600 + b * 60 + c : a * 60 + b;
      return `[${formatGlobalTimestamp(offsetSec + relSec)}]`;
    })
    .trim();
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function normalizeAndFilterClips(
  rawClips: RawClipOutput[],
  maxDurationSec: number
): { clips: AnalyzedPodcastClip[]; filteredOutCount: number } {
  const hasKnownDuration = maxDurationSec > 0;
  const minAllowedDur = hasKnownDuration && maxDurationSec < 15 ? Math.max(3, maxDurationSec) : 15;
  const maxAllowedDur = hasKnownDuration ? Math.min(58, maxDurationSec) : 58;

  const scored: AnalyzedPodcastClip[] = [];
  let filteredOutCount = 0;

  rawClips.forEach((raw, idx) => {
    const sHook = Math.round(clamp(Number(raw.scores?.hook ?? 0), 0, 25));
    const sRet = Math.round(clamp(Number(raw.scores?.retentionPacing ?? 0), 0, 25));
    const sShare = Math.round(clamp(Number(raw.scores?.shareabilityEmotion ?? 0), 0, 25));
    const sStand = Math.round(clamp(Number(raw.scores?.standalone ?? 0), 0, 25));

    const computedTotal = sHook + sRet + sShare + sStand;
    const viralScore = computedTotal > 0 ? computedTotal : Math.round(clamp(Number(raw.viralScore ?? 0), 0, 100));

    if (viralScore < 75) {
      filteredOutCount++;
      return;
    }

    let startSec = Math.max(0, Number(raw.startSec ?? 0));
    let endSec = Number(raw.endSec ?? startSec + (raw.durationSec ?? 30));

    if (hasKnownDuration) {
      startSec = clamp(startSec, 0, Math.max(0, maxDurationSec - minAllowedDur));
      endSec = clamp(endSec, startSec + minAllowedDur, maxDurationSec);
    }

    let dur = endSec - startSec;
    if (dur < minAllowedDur) {
      endSec = hasKnownDuration
        ? Math.min(maxDurationSec, startSec + minAllowedDur)
        : startSec + minAllowedDur;
      dur = endSec - startSec;
    }
    if (dur > maxAllowedDur) {
      endSec = startSec + maxAllowedDur;
      dur = maxAllowedDur;
    }

    const captions = Array.isArray(raw.captions)
      ? raw.captions
          .map((c) => {
            const text = String(c.text ?? "").trim();
            if (!text) return null;
            const cStart = clamp(Number(c.startSec ?? startSec), startSec, endSec);
            const cEnd = clamp(Number(c.endSec ?? cStart + 2), cStart + 0.3, endSec);
            return {
              startSec: Number(cStart.toFixed(2)),
              endSec: Number(cEnd.toFixed(2)),
              text,
            };
          })
          .filter((c): c is { startSec: number; endSec: number; text: string } => c !== null)
          .sort((a, b) => a.startSec - b.startSec)
      : [];

    scored.push({
      id: `viral-clip-${idx + 1}`,
      title: String(raw.title ?? `Viraal fragment ${idx + 1}`).trim(),
      hookType: String(raw.hookType ?? "Curiosity Gap").trim(),
      hookQuote: String(raw.hookQuote ?? "").trim(),
      startSec: Number(startSec.toFixed(1)),
      endSec: Number(endSec.toFixed(1)),
      durationSec: Math.round(dur),
      viralScore,
      scores: {
        hook: sHook,
        retentionPacing: sRet,
        shareabilityEmotion: sShare,
        standalone: sStand,
      },
      reason: String(raw.reason ?? "").trim(),
      captions,
    });
  });

  scored.sort((a, b) => b.viralScore - a.viralScore);
  return { clips: scored, filteredOutCount };
}

async function createApp() {
  const app = express();
  app.use(express.json({ limit: "35mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({
      ok: true,
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    });
  });

  app.post("/api/podcast/analyze", async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(500).json({
        error:
          "GEMINI_API_KEY ontbreekt op de server. Voeg je Gemini API-sleutel toe in Instellingen > Secrets en herstart de server.",
      });
      return;
    }

    const body = (req.body ?? {}) as AnalyzeRequestBody;
    const rawTranscript = typeof body.transcript === "string" ? body.transcript.trim() : "";
    const audioChunks = Array.isArray(body.audioChunks) ? body.audioChunks : [];
    const durationSec = Number(body.durationSec ?? 0);
    const sourceTitle = typeof body.sourceTitle === "string" ? body.sourceTitle.trim() : "";

    if (!rawTranscript && audioChunks.length === 0) {
      res.status(400).json({
        error: "Lever een transcript of audiofragment aan om virale clips te analyseren.",
      });
      return;
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { "User-Agent": "aistudio-build" } },
      });

      let workingTranscript = rawTranscript;

      if (!workingTranscript && audioChunks.length > 0) {
        const transcriptParts: string[] = [];
        for (let i = 0; i < audioChunks.length; i++) {
          const chunk = audioChunks[i];
          if (!chunk?.data || !chunk?.mimeType) continue;

          const transcribeResp = await ai.models.generateContent({
            model: "gemini-3.5-transcribe",
            contents: {
              parts: [
                {
                  inlineData: {
                    mimeType: chunk.mimeType,
                    data: chunk.data,
                  },
                },
                {
                  text: `Transcribe this spoken-word/podcast audio verbatim in the exact spoken language. Put [MM:SS] timestamps relative to the start of this audio segment (00:00 to ${formatGlobalTimestamp(chunk.durationSec)}) before sentences and speaker turns. Do not translate or summarize.`,
                },
              ],
            },
          });

          const text = (transcribeResp.text ?? "").trim();
          if (text) {
            const shifted = shiftSegmentTimestamps(text, Number(chunk.offsetSec ?? 0));
            const header = `--- Segment ${formatGlobalTimestamp(chunk.offsetSec)} - ${formatGlobalTimestamp(chunk.offsetSec + chunk.durationSec)} ---`;
            transcriptParts.push(`${header}\n${shifted}`);
          }
        }

        workingTranscript = transcriptParts.join("\n\n").trim();
        if (!workingTranscript) {
          res.status(422).json({
            error:
              "Er is geen verstaanbare spraak herkend in deze video. Plak eventueel handmatig een transcript.",
          });
          return;
        }
      }

      const durationContext =
        durationSec > 0
          ? `Totale videoduur: ${Math.round(durationSec)} seconden (${formatGlobalTimestamp(durationSec)}).`
          : "Totale videoduur: onbekend (leid tijdstempels af uit het transcript).";

      const analysisResp = await ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: [
          sourceTitle ? `Bron / Aflevering: ${sourceTitle}` : "",
          durationContext,
          "Analyseer onderstaand transcript en retourneer ALLEEN de beste virale fragmenten (15 tot 58 seconden, viralScore >= 75, aflopend gesorteerd):",
          workingTranscript,
        ]
          .filter(Boolean)
          .join("\n\n"),
        config: {
          systemInstruction: VIRALITY_SYSTEM_INSTRUCTION,
          thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              language: {
                type: Type.STRING,
                description: "De gesproken taal in de video (bijv. Nederlands of Engels).",
              },
              clips: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    hookType: {
                      type: Type.STRING,
                      enum: [
                        "Contrasterend",
                        "Curiosity Gap",
                        "Negatief / Waarschuwing",
                        "Direct Resultaat",
                        "Controversieel",
                      ],
                    },
                    hookQuote: {
                      type: Type.STRING,
                      description: "De eerste pakkende openingszin van de clip (eerste 2-3 seconden).",
                    },
                    startSec: { type: Type.NUMBER },
                    endSec: { type: Type.NUMBER },
                    durationSec: { type: Type.NUMBER },
                    viralScore: { type: Type.NUMBER },
                    scores: {
                      type: Type.OBJECT,
                      properties: {
                        hook: { type: Type.NUMBER },
                        retentionPacing: { type: Type.NUMBER },
                        shareabilityEmotion: { type: Type.NUMBER },
                        standalone: { type: Type.NUMBER },
                      },
                      required: ["hook", "retentionPacing", "shareabilityEmotion", "standalone"],
                    },
                    reason: {
                      type: Type.STRING,
                      description: "Korte uitleg in dezelfde taal waarom dit fragment viraal gaat.",
                    },
                    captions: {
                      type: Type.ARRAY,
                      description: "Getimede ondertitels in dezelfde taal, verdeeld in korte leesbare blokjes van 3-6 woorden.",
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          startSec: { type: Type.NUMBER },
                          endSec: { type: Type.NUMBER },
                          text: { type: Type.STRING },
                        },
                        required: ["startSec", "endSec", "text"],
                      },
                    },
                  },
                  required: [
                    "title",
                    "hookType",
                    "hookQuote",
                    "startSec",
                    "endSec",
                    "durationSec",
                    "viralScore",
                    "scores",
                    "reason",
                    "captions",
                  ],
                },
              },
            },
            required: ["language", "clips"],
          },
        },
      });

      const rawJson = (analysisResp.text ?? "").trim();
      if (!rawJson) {
        res.status(502).json({
          error: "Gemini gaf geen JSON-antwoord terug voor de viraliteitsanalyse.",
        });
        return;
      }

      const parsed = JSON.parse(rawJson) as {
        language?: string;
        clips?: RawClipOutput[];
      };

      const { clips, filteredOutCount } = normalizeAndFilterClips(
        Array.isArray(parsed.clips) ? parsed.clips : [],
        durationSec
      );

      res.json({
        language: String(parsed.language ?? "Nederlands"),
        transcript: workingTranscript,
        clips,
        filteredOutCount,
      });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Onbekende fout tijdens Gemini-analyse.";
      console.error("Podcast virality analysis failed:", message);
      res.status(500).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, "dist");
    app.use(express.static(distDir));
    app.get("/{*path}", (_req, res) => {
      res.sendFile(path.join(distDir, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Touchline Studio server running on http://0.0.0.0:${PORT}`);
  });
}

createApp();
