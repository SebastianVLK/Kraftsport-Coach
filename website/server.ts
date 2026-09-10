import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { randomUUID } from "node:crypto";
import { coachings } from "./server/store";
import {
  findingsFromMetrics,
  metricsBlock,
  fewShotBlock,
  enforceVerdict,
} from "./server/poseFindings";
import {
  registerUser,
  loginUser,
  logoutUser,
  meHandler,
  updateProfile,
  requireUser,
} from "./server/auth";

dotenv.config({ path: [".env.local", ".env"] });

const app = express();
const PORT = 3000;

// Increase limit to handle base64 live camera snapshot frames and video clips
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Lazy/Safe Gemini initialization with User-Agent header as required
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is missing.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Helper to safely extract pure base64 without relying on brittle regexes
function extractPureBase64(str: string): string {
  if (!str) return "";
  if (str.includes(";base64,")) {
    return str.substring(str.indexOf(";base64,") + 8).trim();
  }
  if (str.includes(",")) {
    return str.substring(str.indexOf(",") + 1).trim();
  }
  return str.trim();
}

// Clean mime type string (remove codecs and trailing parameters)
function sanitizeMimeType(mime?: string, fallback = "video/mp4"): string {
  if (!mime || typeof mime !== "string") return fallback;
  const base = mime.split(";")[0].trim().toLowerCase();
  return base || fallback;
}

// --- Accounts -------------------------------------------------------------
app.post("/api/auth/register", registerUser);
app.post("/api/auth/login", loginUser);
app.post("/api/auth/logout", logoutUser);
app.get("/api/auth/me", meHandler);
app.patch("/api/auth/me", updateProfile);

// --- Saved coachings ------------------------------------------------------
app.post("/api/coachings", requireUser, (req, res) => {
  const user = (req as any).user;
  const analysis = req.body?.analysis;

  if (!analysis || typeof analysis !== "object" || !analysis.urteil) {
    res.status(400).json({ success: false, error: "Keine Analyse übermittelt." });
    return;
  }

  const row = {
    id: randomUUID(),
    user_id: user.id,
    created_at: new Date().toISOString(),
    exercise: String(analysis.exerciseName ?? "Kraftübung"),
    urteil: String(analysis.urteil),
    note: req.body?.note ? String(req.body.note).slice(0, 500) : null,
    payload: JSON.stringify(analysis),
  };

  try {
    coachings.insert(row);
    res.json({
      success: true,
      coaching: {
        id: row.id,
        created_at: row.created_at,
        exercise: row.exercise,
        urteil: row.urteil,
        note: row.note,
      },
    });
  } catch (err: any) {
    console.error("Coaching konnte nicht gespeichert werden:", err);
    res.status(500).json({ success: false, error: "Speichern fehlgeschlagen." });
  }
});

app.get("/api/coachings", requireUser, (req, res) => {
  const user = (req as any).user;
  res.json({ success: true, coachings: coachings.listForUser(user.id) });
});

app.get("/api/coachings/:id", requireUser, (req, res) => {
  const user = (req as any).user;
  const row = coachings.get(req.params.id, user.id);
  if (!row) {
    res.status(404).json({ success: false, error: "Coaching nicht gefunden." });
    return;
  }
  res.json({
    success: true,
    coaching: {
      id: row.id,
      created_at: row.created_at,
      exercise: row.exercise,
      urteil: row.urteil,
      note: row.note,
      analysis: JSON.parse(row.payload),
    },
  });
});

app.delete("/api/coachings/:id", requireUser, (req, res) => {
  const user = (req as any).user;
  const removed = coachings.remove(req.params.id, user.id);
  if (!removed) {
    res.status(404).json({ success: false, error: "Coaching nicht gefunden." });
    return;
  }
  res.json({ success: true });
});

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

// 0. Kraftsport Video Analysis API (Erfahrener Kraftsport-Coach KI Agent)
app.post("/api/analyze-exercise-video", async (req, res) => {
  try {
    const {
      videoBase64,
      videoFrames = [],
      mimeType = "video/webm",
      exerciseHint = "",
      poseMetrics = null,
    } = req.body;

    const measured = findingsFromMetrics(poseMetrics, exerciseHint);

    const hasVideo = typeof videoBase64 === "string" && videoBase64.length > 100;
    const hasFrames = Array.isArray(videoFrames) && videoFrames.length > 0;

    if (!hasVideo && !hasFrames) {
      res.status(400).json({
        success: false,
        error: "Kein Video oder Bildmaterial übermittelt.",
        data: {
          exerciseName: exerciseHint || "Kraftübung",
          urteil: "nicht_beurteilbar",
          begruendung: "Es wurde kein Video oder Bildmaterial der Übungsausführung übermittelt.",
          derWichtigsteFehler: "Keine Aufnahme vorhanden.",
          korrektur: "Starte die Kameraaufnahme oder lade eine Videodatei hoch.",
          gewicht: { empfehlung: "gleich bleiben", begruendung: "Ohne Sichtprüfung keine Gewichtsänderung empfohlen." },
          wasNichtBeurteilbar: "Die gesamte Übungsausführung, da kein Videomaterial vorlag.",
          rawOutputText: "URTEIL: nicht_beurteilbar\n\nBEGRÜNDUNG: Es wurde kein Video oder Bildmaterial übermittelt.\n\nDER WICHTIGSTE FEHLER: Keine Aufnahme vorhanden.\n\nKORREKTUR: Bitte starte die Aufnahme oder lade ein Video hoch.\n\nGEWICHT: Gleich bleiben. Ohne Sichtprüfung keine Änderung.\n\nWAS ICH NICHT BEURTEILEN KONNTE: Die gesamte Übung.",
        },
      });
      return;
    }

    const ai = getGeminiClient();

    // Diagnostics: without this it is guesswork whether a weak verdict came
    // from a weak model answer or from material that never arrived.
    const frameBytes = hasFrames
      ? videoFrames.reduce((n: number, f: string) => n + (f?.length ?? 0), 0)
      : 0;
    if (poseMetrics) {
      const p = poseMetrics;
      console.log(
        `[messung] Bilder=${p.frames} Abdeckung=${(p.coverage * 100).toFixed(0)}% | ` +
          `Ellenbogen ${p.elbowMin}–${p.elbowMax}° | Knie ${p.kneeMin}–${p.kneeMax}° | ` +
          `Hüfte min ${p.hipMin}° | Körperlinie ${p.bodyLineMin}–${p.bodyLineMax}° | ` +
          `Becken ${p.hipOffsetMax} bis ${p.hipOffsetMin} (>0.05 = durchhängend) | ` +
          `Knie/Fuss ${p.kneeOverFootAtDepth} Stand/Schulter ${p.footOverShoulderMedian} | ` +
          `Wdh. ${p.reps?.length ?? 0} Drift ${p.depthDrift ?? "-"}° | ` +
          `Oberarm/Rumpf max ${p.armToTorsoMax}°`
      );
      if (measured.length) {
        for (const f of measured) {
          console.log(`[messung]   -> [${f.severity}] ${f.label}: ${f.detail}`);
        }
      } else {
        console.log("[messung]   -> kein Grenzwert überschritten");
      }
    }

    console.log(
      `[analyse] Übung="${exerciseHint || "?"}" | Messung: ${
        poseMetrics ? `${poseMetrics.frames} Bilder, ${measured.length} Befund(e)` : "keine"
      } | Video: ${
        hasVideo ? `${(videoBase64.length / 1024 / 1024).toFixed(1)} MB base64, ${mimeType}` : "keins"
      } | Schlüsselbilder: ${hasFrames ? videoFrames.length : 0} (${(frameBytes / 1024 / 1024).toFixed(1)} MB)`
    );

    // Comprehensive System prompt for the Kraftsport-Coach KI Agent
    const systemPrompt = `Du bist ein autonomer, kompromisslos ehrlicher Kraftsport-Coach KI-Agent.
Du beurteilst die technische Ausführung einer Kraftsport-Übung (z.B. Liegestütze / Push-ups, Kniebeuge, Kreuzheben, Bankdrücken, Dips, Klimmzüge, Schulterdrücken, RDL, Rudern) anhand des übermittelten Videomaterials bzw. der Schlüsselbilder.

AGENTEN-ARBEITSWEISE (IN 5 PHASEN DURCHFÜHREN):
1. Triage: Prüfe Kameraperspektive (ideal: 45°-Winkel oder Seitenansicht auf Hüfthöhe), Beleuchtung und ob alle relevanten Gelenke und Hanteln im Bild sind.
2. Segmentierung: Geh das Video Wiederholung für Wiederholung durch. Finde für jede Wiederholung den tiefsten Umkehrpunkt (Bottom Turnaround Point).
3. Biomechanischer Regelprüfer:
   - Bei LIEGESTÜTZE (Push-ups):
     * Plank-Körperspannung: Kerzengerade Linie von Scheitel bis Ferse. Kein Durchhängen der Hüfte (Hyperlordose) und kein hochgestreckter Hintern.
     * Ellenbogenwinkel: Biomechanisch sichere Pfeilform (~45° zum Torso). Kein 90°-Flügeln nach außen (T-Form = Impingement-Gefahr).
     * Tiefe: Brustkorb senkt kontrolliert bis knapp über den Boden ab (Fausthöhe bzw. T-Shirt berührt Boden fast). Kopf nickt nicht nach vorne vor, um Tiefe vorzutäuschen.
     * Umkehrpunkt: Stopp ohne Nachfedern, kein wellenförmiges Aufstehen (Brust zuerst, dann Hüfte nachziehend).
   - Bei KNIEBEUGEN: Volle Tiefe (Hüftfalte unter Knieoberkante), Knie über Fußmitte, neutraler Rücken, kein Butt-Wink am Umkehrpunkt.
   - Bei KREUZHEBEN: Neutrale Wirbelsäule beim Lösen vom Boden, kein Einknicken der LWS, kein Nachfedern.
   - Bei BANKDRÜCKEN: Kein Abfedern (Bounce) auf dem Brustbein, stabile Schulterblattretraktion, kontrollierter Stopp.
   - Bei DIPS: Brust geöffnet, kein Vorstürzen der Schulterköpfe im tiefsten Punkt (Depression halten), 90°-Armbeugung.
4. Schiedsrichter-Urteil — ZUERST JEDEN BEFUND EINSTUFEN, DANN ENTSCHEIDEN:

   VERBINDLICHE EINSTUFUNG HÄUFIGER BEFUNDE — diese Liste gilt, deine Einschätzung
   darf sie nicht abschwächen:
   - Hüfte hängt durch / Hohlkreuz bei Liegestütze, Planke, Dips  -> KRITISCH
   - Hintern hochgestreckt, Körper knickt in der Hüfte ab          -> KRITISCH
   - Lendenwirbelsäule rundet bei Kreuzheben oder Kniebeuge ein    -> KRITISCH
   - Knie kippt nach innen (Valgus)                                 -> KRITISCH
   - Schulterköpfe stürzen im tiefsten Punkt vor (Dips, Bank)      -> KRITISCH
   - Nachfedern / Abprallen im Umkehrpunkt                          -> KRITISCH
   - Ellenbogen flügeln auf ~90° zum Rumpf (T-Form)                 -> KRITISCH
   - Bewegungsumfang klar verkürzt (halbe Tiefe)                    -> RELEVANT
   - Tempo bricht ein, Wiederholungen werden hektisch               -> RELEVANT
   - Sichtbare Seitenasymmetrie                                     -> RELEVANT
   - Kopfhaltung leicht vorgeneigt, Blickrichtung                   -> KOSMETISCH
   - Fussstellung minimal ungleich, Griffbreite leicht asymmetrisch -> KOSMETISCH
   - Letzte Wiederholung etwas langsamer als die erste              -> KOSMETISCH

   Stufe jeden weiteren Befund in genau eine Schwere ein:
   - KRITISCH: Verletzungsrisiko. Wirbelsäule rundet unter Last ein, Knie kippt deutlich
     nach innen, Schulter stürzt im tiefsten Punkt vor, Nachfedern aus dem Gelenk.
   - RELEVANT: Kein Risiko, kostet aber spürbar Kraft oder Bewegungsumfang.
     Beispiel: erkennbar verkürzte Tiefe, Tempo bricht ein, sichtbare Seitenasymmetrie.
   - KOSMETISCH: Schönheitsfehler ohne Wirkung auf Sicherheit oder Trainingsreiz.
     Beispiel: Kopfhaltung minimal vorgeneigt, leicht ungleiche Fussstellung, ein
     Grifffinger anders, letzte Wiederholung minimal langsamer.

   Daraus folgt das Urteil zwingend:
   - "mangelhaft": mindestens EIN kritischer Befund.
   - "brauchbar": kein kritischer, aber mindestens ZWEI relevante Befunde — oder ein
     relevanter Befund, der sich über alle Wiederholungen verschlechtert.
   - "gut": kein kritischer Befund und höchstens EIN relevanter Befund.
     KOSMETISCHE BEFUNDE VERHINDERN "gut" NIEMALS, egal wie viele.
   - "nicht_beurteilbar": Person verdeckt, Aufnahme zu kurz, oder keine vollständige
     Wiederholung erkennbar.

   ZWEI FEHLER, DIE DU NICHT MACHEN DARFST:
   a) "brauchbar" als bequemen Mittelweg wählen, weil du dich nicht festlegen willst.
      Wenn nur eine Kleinigkeit auffällt, ist das Urteil "gut" — sag die Kleinigkeit
      trotzdem unter "derWichtigsteFehler", aber urteile "gut".
   b) Einen Befund erfinden oder aufblasen, damit die Analyse gründlich wirkt.
      Eine saubere Ausführung ist ein legitimes und häufiges Ergebnis.

   Nenne im Feld "begruendung" ausdrücklich, welche Schwere du vergeben hast,
   z.B. "ein relevanter Befund, keine kritischen — daher gut".

5. Synthese von Cue & Drill: Formuliere genau EINEN prägnanten, sofort merkbaren Cue und einen gezielten Korrektur-Drill.
   Ist das Urteil "gut", richtet sich der Cue auf das Halten oder die nächste Ausbaustufe,
   nicht auf eine erfundene Korrektur.

ZEITMARKEN:
Gib in "fehlerZeitpunkte" jeden Befund mit der Sekunde an, in der er im Video sichtbar wird (Dezimalzahl ab Videostart, z.B. 2.4).
Nur Zeitpunkte angeben, die du tatsächlich im Videomaterial verorten kannst — lieber weniger Einträge als geratene Zeiten.
Wurde nur Bildmaterial ohne Video übermittelt, gib ein leeres Array zurück.
"schwere" ist "fehler" für echte Mängel und "hinweis" für Kleinigkeiten.

EHRLICHKEIT — OBERSTE REGEL:
Du bist kein Motivationscoach, aber auch kein Nörgler. Ehrlich heisst: exakt das benennen,
was zu sehen ist — Gutes wie Schlechtes. Beschönigen und Schlechtreden sind derselbe Fehler.
Formuliere alles als Beobachtung ("das Becken sinkt vor der Brust ab"), nie als physikalisch
gemessenen Messwert.

KONKRET STATT ALLGEMEIN:
Jeder Satz muss sich auf diese Aufnahme beziehen und wäre bei einem anderen Video falsch.
Nenne die Wiederholung, die Körperstelle und die Bewegungsphase.
- Gut: "In Wiederholung 3 sinkt das Becken im tiefsten Punkt etwa eine Handbreit vor der Brust ab."
- Unbrauchbar: "Achte auf deine Körperspannung." — das passt auf jedes Video und hilft niemandem.
Wiederhole keine Formulierungen aus dem Schema. Beschreibe, was DIESER Athlet tut.

AUSGABE-SCHEMA (STRENGES JSON):
Gib ausschließlich ein JSON-Objekt mit folgenden Feldern zurück:
{
  "exerciseName": "Erkannter Name der Übung (z.B. Liegestütze (Push-ups), Kniebeuge, etc.)",
  "urteil": "gut" | "brauchbar" | "mangelhaft" | "nicht_beurteilbar",
  "begruendung": "2–3 präzise Sätze zur Begründung des Urteils.",
  "wasGutWar": ["2–4 kurze Punkte, was der Athlet bereits sauber macht. Nur was im Bild belegbar ist. Leeres Array, wenn nichts überzeugt."],
  "fehlerZeitpunkte": [
    { "sekunde": 2.4, "label": "Hüfte sinkt ab", "hinweis": "Becken fällt vor der Brust", "schwere": "fehler" }
  ],
  "derWichtigsteFehler": "Nur genau ein Fehler. Der, der am meisten Kraft kostet oder am gefährlichsten ist.",
  "korrektur": "Konkreter Cue für den nächsten Satz, den man sich direkt merken kann.",
  "gewicht": {
    "empfehlung": "hochgehen" | "gleich bleiben" | "runtergehen",
    "begruendung": "Ein halber Satz Begründung."
  },
  "wasNichtBeurteilbar": "Alles was durch Perspektive, Bildausschnitt oder Videolänge verdeckt war. Leer lassen, wenn nichts.",
  "beobachteteKriterien": {
    "bewegungsumfang": "Beobachtung zum Bewegungsumfang",
    "gelenkstellung": "Beobachtung zu Gelenken und Achsen",
    "tempo": "Beobachtung zur Kadenz und Umkehrpunkt",
    "schwung": "Beobachtung zu Schwung/Nachfedern",
    "symmetrie": "Beobachtung zur Seitengleichheit",
    "konsistenz": "Beobachtung zum Verlauf über die Wiederholungen"
  },
  "repetitionDetails": [
    { "repNumber": 1, "phase": "Exzentrik & Umkehrpunkt", "umkehrpunkt": "Beschreibung", "notes": "Notiz" }
  ],
  "agentTrace": [
    { "phaseId": "triage", "name": "Perspektiven- & Sichtfeldprüfung", "status": "done", "summary": "Kurzbefund Kamera", "details": ["Detail 1"] },
    { "phaseId": "segmentation", "name": "Phasen- & Umkehrpunkt-Erkennung", "status": "done", "summary": "Anzahl Reps und Tiefpunkt", "details": ["Detail 1"] },
    { "phaseId": "biomechanics", "name": "Biomechanischer Regelprüfer", "status": "done", "summary": "Hebel- und Gelenkprüfung", "details": ["Detail 1"] },
    { "phaseId": "verdict", "name": "Schiedsrichter-Urteil", "status": "done", "summary": "Urteilsbegründung", "details": [] },
    { "phaseId": "drill", "name": "Korrektur-Drill Synthese", "status": "done", "summary": "Empfohlener Drill", "details": [] }
  ],
  "drillRecommendation": {
    "title": "Name der Korrektur-Übung",
    "setsAndReps": "Satz- und Wiederholungsangabe",
    "executionCue": "Konkrete Ausführungsvorgabe",
    "purpose": "Biomechanischer Zweck"
  },
  "alternativeCues": {
    "externalCue": "Externer Aufmerksamkeitsfokus (z.B. 'Drücke den Boden von dir weg')",
    "internalCue": "Interner Muskel-Fokus (z.B. 'Bauchdecke aktiv anspannen')",
    "visualCue": "Bildhafter Vergleich (z.B. 'Körper wie ein Stahlbrett')"
  },
  "rawOutputText": "URTEIL: ...\\n\\nBEGRÜNDUNG: ...\\n\\nDER WICHTIGSTE FEHLER: ...\\n\\nKORREKTUR: ...\\n\\nGEWICHT: ...\\n\\nWAS ICH NICHT BEURTEILEN KONNTE: ..."
}`;

    const promptText = `${systemPrompt}\n\n${fewShotBlock()}\n\n${metricsBlock(poseMetrics, measured)}\n\n${
      exerciseHint ? `Athleten-Angabe zur Übung: "${exerciseHint}"` : "Analysiere die gezeigte Kraftsport-Übung im Bild- und Videomaterial."
    }`;

    // Prepare helper to build parts
    const buildParts = (includeVideo: boolean, includeFrames: boolean) => {
      const partsList: any[] = [];

      // Only include video if requested, and check size (keep under 12MB base64)
      if (includeVideo && hasVideo) {
        const cleanData = extractPureBase64(videoBase64);
        if (cleanData.length < 12 * 1024 * 1024) {
          partsList.push({
            inlineData: {
              data: cleanData,
              mimeType: sanitizeMimeType(mimeType, "video/mp4"),
            },
          });
        }
      }

      // Include extracted high-res frames
      if (includeFrames && hasFrames) {
        for (const frame of videoFrames.slice(0, 10)) {
          const cleanFrame = extractPureBase64(frame);
          if (cleanFrame) {
            partsList.push({
              inlineData: {
                data: cleanFrame,
                mimeType: "image/jpeg",
              },
            });
          }
        }
      }

      partsList.push({ text: promptText });
      return partsList;
    };

    // Execute with resilient fallback:
    // 1st attempt: If video is <= 10MB base64 and frames present, pass both or video.
    // 2nd attempt (if 1st fails with payload or mime error): pass frames only!
    let response: any;
    let cleanVideoData = hasVideo ? extractPureBase64(videoBase64) : "";
    const isVideoWithinLimit = cleanVideoData.length > 0 && cleanVideoData.length <= 10 * 1024 * 1024;

    try {
      if (isVideoWithinLimit) {
        // Try direct video analysis with keyframes
        // Video and keyframes together: the frames are sharper than the
        // decoded video and are what fine joint angles are read from.
        const parts = buildParts(true, hasFrames);
        response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: parts,
          config: {
            responseMimeType: "application/json",
          },
        });
      } else if (hasFrames) {
        // Video was too large for inlineData or frames-focused mode
        const parts = buildParts(false, true);
        response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: parts,
          config: {
            responseMimeType: "application/json",
          },
        });
      } else {
        // Fallback with video data
        const parts = buildParts(true, false);
        response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: parts,
          config: {
            responseMimeType: "application/json",
          },
        });
      }
    } catch (primaryError: any) {
      console.warn("Primary analysis error, attempting frames-only fallback:", primaryError?.message);
      if (hasFrames) {
        const fallbackParts = buildParts(false, true);
        response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: fallbackParts,
          config: {
            responseMimeType: "application/json",
          },
        });
      } else {
        throw primaryError;
      }
    }

    const text = response?.text || "{}";
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = {
        exerciseName: exerciseHint || "Kraftübung",
        urteil: "brauchbar",
        begruendung: text.slice(0, 250),
        derWichtigsteFehler: "Siehe Coach-Bericht",
        korrektur: "Fokus auf gleichmäßiges Tempo und stabilen Umkehrpunkt",
        gewicht: { empfehlung: "gleich bleiben", begruendung: "Technik festigen." },
        wasNichtBeurteilbar: "",
        rawOutputText: text,
      };
    }

    // Default agent trace if not generated
    if (!parsed.agentTrace || !Array.isArray(parsed.agentTrace) || parsed.agentTrace.length === 0) {
      parsed.agentTrace = [
        {
          phaseId: "triage",
          name: "Perspektiven- & Sichtfeldprüfung",
          status: "done",
          summary: "Videomaterial erfolgreich verarbeitet.",
        },
        {
          phaseId: "segmentation",
          name: "Phasen- & Umkehrpunkt-Erkennung",
          status: "done",
          summary: "Wiederholungen und Umkehrpunkt analysiert.",
        },
        {
          phaseId: "biomechanics",
          name: "Biomechanischer Regelprüfer",
          status: parsed.urteil === "mangelhaft" ? "warning" : "done",
          summary: parsed.derWichtigsteFehler || "Gelenkachsen geprüft.",
        },
        {
          phaseId: "verdict",
          name: "Schiedsrichter-Urteil",
          status: "done",
          summary: `URTEIL: ${(parsed.urteil || "brauchbar").toUpperCase()}`,
        },
        {
          phaseId: "drill",
          name: "Korrektur-Drill Synthese",
          status: "done",
          summary: parsed.korrektur || "Cue formuliert.",
        },
      ];
    }

    if (!parsed.rawOutputText) {
      parsed.rawOutputText = `URTEIL: ${parsed.urteil || "brauchbar"}\n\nBEGRÜNDUNG: ${parsed.begruendung || ""}\n\nDER WICHTIGSTE FEHLER: ${parsed.derWichtigsteFehler || "Keiner identifiziert."}\n\nKORREKTUR: ${parsed.korrektur || ""}\n\nGEWICHT: ${parsed.gewicht?.empfehlung || "gleich bleiben"} – ${parsed.gewicht?.begruendung || ""}\n\nWAS ICH NICHT BEURTEILEN KONNTE: ${parsed.wasNichtBeurteilbar || ""}`;
    }

    const forced = enforceVerdict(parsed, measured);
    if (forced.changed) {
      console.log(
        `[analyse] Urteil per Messung von "${forced.from}" auf "${parsed.urteil}" korrigiert`
      );
    }

    console.log(
      `[analyse] Urteil=${parsed.urteil} | Hauptfehler="${String(
        parsed.derWichtigsteFehler ?? ""
      ).slice(0, 90)}" | Zeitmarken=${parsed.fehlerZeitpunkte?.length ?? 0} | gut daran=${
        parsed.wasGutWar?.length ?? 0
      }`
    );
    console.log(`[analyse] Begründung: ${String(parsed.begruendung ?? "").slice(0, 200)}`);

    res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error("Fehler bei Videoanalyse:", error);
    res.status(500).json({
      success: false,
      error: error?.message || "Die Video-Analyse konnte nicht durchgeführt werden.",
    });
  }
});

// 0b. Dedicated Agent Action Endpoint (Drill generator, Cue variation, Simulation)
app.post("/api/agent-action", async (req, res) => {
  try {
    const { actionType, exerciseContext } = req.body;

    if (!exerciseContext) {
      res.status(400).json({ success: false, error: "Kein Übungskontext vorhanden." });
      return;
    }

    const ai = getGeminiClient();
    let prompt = "";

    if (actionType === "generate_drill") {
      prompt = `Du bist ein Kraftsport-Coach KI-Agent.
Basierend auf folgendem Befund:
- Übung: ${exerciseContext.exerciseName}
- Urteil: ${exerciseContext.urteil}
- Wichtigster Fehler: ${exerciseContext.derWichtigsteFehler}
- Aktueller Cue: ${exerciseContext.korrektur}

Erstelle einen maßgeschneiderten, hocheffektiven 3-Schritte Korrektur-Drill für das Warm-Up oder als Zubringerübung.
Gib ein JSON-Objekt zurück mit:
{
  "title": "Name des Drills",
  "setsAndReps": "z.B. 3 Sätze à 8 Wiederholungen mit 2s Pause",
  "executionCue": "Konkrete Ausführungsanweisung Schritt für Schritt",
  "purpose": "Biomechanischer Nutzen"
}`;
    } else if (actionType === "refine_cues") {
      prompt = `Du bist ein Kraftsport-Coach KI-Agent.
Basierend auf dem Fehler "${exerciseContext.derWichtigsteFehler}" bei der Übung "${exerciseContext.exerciseName}",
generiere 3 verschiedene Varianten von mentalen Cues:
1. Externer Cue (Fokus auf Außenwirkung / Umwelt)
2. Interner Cue (Fokus auf Muskulatur / Anspannung)
3. Visualisierender Cue (Bildhafte Metapher)

Gib ein JSON-Objekt zurück mit:
{
  "externalCue": "...",
  "internalCue": "...",
  "visualCue": "..."
}`;
    } else {
      prompt = `Du bist ein Kraftsport-Coach KI-Agent.
Simuliere für den Athleten den nächsten Satz bei ${exerciseContext.exerciseName}.
Empfehlung: ${exerciseContext.gewicht?.empfehlung}.
Korrektur-Cue: ${exerciseContext.korrektur}.
Gib in 3 prägnanten Sätzen zurück, worauf beim ersten Anheben, am Umkehrpunkt und im Lockout zu achten ist.
Gib ein JSON-Objekt zurück mit:
{ "simulationPlan": "Text mit Hinweisen" }`;
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });

    const parsed = JSON.parse(response.text || "{}");
    res.json({ success: true, data: parsed });
  } catch (err: any) {
    console.error("Fehler bei Agent Action:", err);
    res.status(500).json({ success: false, error: err.message || "Aktion fehlgeschlagen." });
  }
});

// 3. Multi-turn Chat API
// Text block mandate: "You MUST add a multi-turn chat interface to the app using Gemini. The chat must maintain conversation history, display messages in a scrollable thread, and include a system instruction to give the chatbots specific roles. Use gemini-3.1-pro-preview for particularly complex tasks, gemini-3.5-flash for general tasks, and gemini-3.1-flash-lite for tasks that should happen fast."
app.post("/api/chat", async (req, res) => {
  try {
    const {
      messages = [],
      roleType = "technique_coach", // 'head_coach' | 'technique_coach' | 'quick_cue'
      modelOverride,
      exerciseAnalysisContext,
    } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: "Keine Chat-Nachrichten übermittelt." });
      return;
    }

    // Model selection per instruction:
    // - gemini-3.1-pro-preview: particularly complex tasks (Head Biomechanics Coach)
    // - gemini-3.5-flash: general tasks (Technique Coach)
    // - gemini-3.1-flash-lite: tasks that should happen fast (Quick Cue / Instant Fix)
    let selectedModel = "gemini-3.5-flash";
    let systemInstruction = "";

    if (roleType === "head_coach") {
      selectedModel = "gemini-3.1-pro-preview";
      systemInstruction = `Du bist ein erfahrener Headcoach für Kraftsport und Biomechanik.
Du bist spezialisiert auf komplexe Hebelverhältnisse, Drehmomente an Knie-, Hüft- und Schultergelenk, Lastpfade, physiologische Schwachstellen und Periodisierung.
Wichtigste Regel: Du bist kein Motivationscoach. Sag klar und analytisch, was fehlerhaft ist, und begründe es biomechanisch. Formuliere Beobachtungen präzise auf Deutsch.`;
    } else if (roleType === "quick_cue") {
      selectedModel = "gemini-3.1-flash-lite";
      systemInstruction = `Du bist der Schnelle Cue-Coach für Kraftsportler direkt am Rack.
Dein Ziel: Maximale Geschwindigkeit und sofort einprägsame Cues für den nächsten Satz.
Keine langen Erklärungen, sondern 1 bis maximal 2 griffige mentale Cues (z.B. "Schraub die Füße in den Boden", "Stange in den Rücken ziehen"). Antworte direkt auf Deutsch.`;
    } else {
      // Default / Technique Coach
      selectedModel = "gemini-3.5-flash";
      systemInstruction = `Du bist ein erfahrener Kraftsport-Coach. Du beurteilst und diskutierst die technische Ausführung von Kraftübungen (Kniebeuge, Kreuzheben, Bankdrücken, Schulterdrücken, Rudern, Klimmzüge).
Achte besonders auf den Umkehrpunkt, Bewegungsumfang, neutrale Wirbelsäule, Knieposition, Tempo und Schwung.
Ehrlichkeit ist deine oberste Maxime: Du bist kein Motivationscoach. Sag klar, was schlecht ist, aber nur was begründbar ist.`;
    }

    if (modelOverride) {
      selectedModel = modelOverride;
    }

    if (exerciseAnalysisContext) {
      systemInstruction += `\n\nAktueller Befund der Videoanalyse des Athleten:
- Übung: ${exerciseAnalysisContext.exerciseName || "Kraftübung"}
- Urteil: ${exerciseAnalysisContext.urteil}
- Begründung: ${exerciseAnalysisContext.begruendung}
- Wichtigster Fehler: ${exerciseAnalysisContext.derWichtigsteFehler}
- Empfohlene Korrektur/Cue: ${exerciseAnalysisContext.korrektur}
- Gewichtsempfehlung: ${exerciseAnalysisContext.gewicht?.empfehlung} (${exerciseAnalysisContext.gewicht?.begruendung})
- Was nicht beurteilbar war: ${exerciseAnalysisContext.wasNichtBeurteilbar || "Keine Einschränkungen"}
Beziehe dich bei Fragen des Athleten direkt auf diesen Befund!`;
    }

    const ai = getGeminiClient();

    // Format conversation history for Gemini API
    const formattedContents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === "assistant" || m.role === "model" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    // Generate content
    let response: any;
    try {
      response = await ai.models.generateContent({
        model: selectedModel,
        contents: formattedContents,
        config: {
          systemInstruction,
        },
      });
    } catch (modelErr: any) {
      // If gemini-3.1-pro-preview or regional restriction fails, fallback gracefully to gemini-3.5-flash
      console.warn(`Model ${selectedModel} encountered error: ${modelErr.message}. Falling back to gemini-3.5-flash.`);
      response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: formattedContents,
        config: {
          systemInstruction,
        },
      });
      selectedModel = "gemini-3.5-flash (fallback)";
    }

    const replyText = response.text || "Es konnte keine Antwort erzeugt werden.";

    res.json({
      success: true,
      reply: replyText,
      modelUsed: selectedModel,
      roleType,
    });
  } catch (error: any) {
    console.error("Fehler im Chat:", error);
    res.status(500).json({
      error: error?.message || "Chat-Anfrage fehlgeschlagen. Bitte erneut versuchen.",
    });
  }
});

// Vite middleware integration
async function setupServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Kraftsport-Coach server running on http://0.0.0.0:${PORT}`);
  });
}

setupServer();
