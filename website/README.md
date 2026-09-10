# Kraftsport-Coach

Biomechanische Video-Technikanalyse für Kraftsport. Du lädst ein Video von
1–5 Wiederholungen hoch, ein KI-Coach beurteilt die Ausführung und gibt genau
einen Korrektur-Cue für den nächsten Satz.

Der Coach ist bewusst kein Motivationscoach: Er benennt ungeschönt, was
schlecht aussieht — aber nur, was im Bild tatsächlich zu sehen ist.

## Wie die Analyse abläuft

Der Browser zieht sechs Schlüsselbilder aus dem Video (Canvas, clientseitig)
und schickt sie zusammen mit dem Video an den Server. Der ruft damit Gemini auf
und lässt es in fünf Phasen arbeiten:

1. **Triage** — Kameraperspektive, Licht, sind alle Gelenke im Bild?
2. **Segmentierung** — Wiederholung für Wiederholung, tiefster Umkehrpunkt
3. **Biomechanischer Regelprüfer** — übungsspezifische Regeln für Liegestütze,
   Kniebeuge, Kreuzheben, Bankdrücken und Dips
4. **Schiedsrichter-Urteil** — `gut`, `brauchbar`, `mangelhaft` oder
   `nicht_beurteilbar`
5. **Cue- und Drill-Synthese** — ein Cue, ein Korrektur-Drill

Ist das Video größer als 10 MB oder schlägt der Call fehl, fällt der Server auf
die reinen Schlüsselbilder zurück.

## Lokal starten

Voraussetzung: Node.js (getestet mit v24 LTS).

```bash
npm install
echo 'GEMINI_API_KEY="dein-key"' > .env.local
npm run dev
```

Läuft dann auf http://localhost:3000.

Den Key gibt es unter https://aistudio.google.com/apikey. Er bleibt
serverseitig und erreicht den Browser nie — `.env*` ist in `.gitignore`.

Ohne Key startet die App trotzdem: Oberfläche und die fünf Beispiel-Analysen
unter „Beispiel-Sets" sind statische Daten. Videoanalyse und Dialog brauchen
ihn.

## Aufbau

| Datei | Rolle |
| --- | --- |
| `server.ts` | Express-Server, drei Gemini-Endpunkte |
| `src/App.tsx` | Tabs Video, Coach-Urteil, Dialog |
| `src/components/VideoRecorderAndUploader.tsx` | Upload und Keyframe-Extraktion |
| `src/components/CoachFeedbackView.tsx` | Urteil, Cue-Matrix, Drill-Timer |
| `src/components/GeminiChatBot.tsx` | Dialog mit drei Coach-Rollen |
| `src/data/exercisePresets.ts` | fünf Beispiel-Analysen |

### Endpunkte

- `POST /api/analyze-exercise-video` — die Videoanalyse
- `POST /api/agent-action` — Drill generieren, Cues variieren, Satz simulieren
- `POST /api/chat` — Multi-Turn-Dialog
- `GET /api/health` — Status, zeigt ob ein Key geladen ist

### Modelle

| Rolle | Modell |
| --- | --- |
| Head Biomechanics Coach | `gemini-3.1-pro-preview` |
| Technik-Coach, Videoanalyse | `gemini-3.5-flash` |
| Schneller Cue-Coach | `gemini-3.1-flash-lite` |

Schlägt ein Modell fehl — etwa weil das Kontingent des Keys es nicht abdeckt —
fällt der Server auf `gemini-3.5-flash` zurück und markiert das in der Antwort
als `(fallback)`.

## Hinweis

Die Analyse liefert technische Beobachtungen und biomechanische
Orientierungshilfen. Sie ersetzt keine medizinische, orthopädische oder
physiotherapeutische Befundung.
