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
npm install            # holt dabei auch das Pose-Modell (~5.5 MB)
echo 'GEMINI_API_KEY="dein-key"' > .env.local
npm run dev
```

Das Live-Skelett über dem Video braucht die MediaPipe-Runtime und ein
Pose-Modell. Beides sind grosse Binärdateien und liegen deshalb nicht im
Repository — `npm install` holt sie über `npm run setup:pose` nach. Falls der
Schritt einmal fehlschlägt, lässt er sich jederzeit einzeln nachholen:

```bash
npm run setup:pose
```

Ohne diese Dateien läuft die App normal weiter; nur das Skelett bleibt aus und
sagt es im Video an.

Die App läuft dann auf http://localhost:3000.

Den Key gibt es unter https://aistudio.google.com/apikey. Er bleibt
serverseitig und erreicht den Browser nie — `.env*` ist in `.gitignore`.

Ohne Key startet die App, aber jede Analyse schlägt fehl — Videoanalyse und
Drill-Generierung laufen beide über Gemini.

## Aufbau

| Datei | Rolle |
| --- | --- |
| `server.ts` | Express-Server, drei Gemini-Endpunkte |
| `src/App.tsx` | Kopfzeile, Eröffnungsbild, Tabs Video und Coach-Urteil |
| `src/components/VideoRecorderAndUploader.tsx` | Upload, Live-Aufnahme, Keyframes |
| `src/components/CoachFeedbackView.tsx` | Urteil, Anmerkungen, Technik-Schritte |
| `src/components/AnalysedVideoStage.tsx` | Wiedergabe der Aufnahme mit Zeitmarken |
| `src/components/PoseOverlay.tsx` | Live-Skelett per MediaPipe |
| `src/data/techniqueVideos.ts` | geprüfte YouTube-Technikvideos je Übung |

### Konto und Coachings

E-Mail und Passwort genügen. Passwörter werden mit scrypt und eigenem Salt
gehasht, die Sitzung läuft über ein httpOnly-Cookie, und vom Sitzungstoken
liegt nur ein SHA-256-Hash in der Datenbank.

Gespeicherte Analysen heissen „Coachings" und lassen sich als Kalender oder
als Liste ansehen, jeweils nach Tag gruppiert.

Die Datenbank ist eine SQLite-Datei — `node:sqlite` ist in Node enthalten, es
braucht also weder ein natives Modul noch einen laufenden Datenbankdienst.

Sie liegt bewusst **ausserhalb** des Projektordners — so überstehen Konten ein
erneutes Klonen oder Löschen des Repositories, und der Ort hängt nicht davon
ab, aus welchem Verzeichnis der Server gestartet wurde:

    ~/Desktop/Kraftsport-Coach/coach.db

Gibt es keinen Schreibtisch (Server, abgespecktes Konto), weicht die App auf
den üblichen Datenordner des Systems aus. Ein anderer Ort lässt sich über
`COACH_DATA_DIR` setzen. Beim Start schreibt der Server den tatsächlich
benutzten Pfad ins Log.

**Das Video selbst wird nicht gespeichert**, nur die Analyse. Ein wieder
geöffnetes Coaching zeigt daher das Urteil und alle Anmerkungen, aber keine
Aufnahme.

### Endpunkte

- `POST /api/auth/register` · `login` · `logout`, `GET /api/auth/me`
- `GET|POST /api/coachings`, `GET|DELETE /api/coachings/:id`
- `POST /api/analyze-exercise-video` — die Videoanalyse
- `POST /api/agent-action` — Drill generieren, Cues variieren, Satz simulieren
- `POST /api/chat` — Multi-Turn-Dialog (Endpunkt vorhanden, im UI derzeit ungenutzt)
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
