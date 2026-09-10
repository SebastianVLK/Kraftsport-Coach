# Woher die Grenzwerte kommen

Die Beurteilung stützt sich auf zwei getrennte Instanzen:

1. **Gemini** liest Video und Schlüsselbilder und beurteilt, was sich nur sehen
   lässt — Rückenrundung, Nachfedern, Schulterposition, Tempo.
2. **Die Messung** in `src/lib/poseMetrics.ts` und `server/poseFindings.ts`
   berechnet Gelenkgeometrie aus dem Pose-Modell und entscheidet alles, was sich
   in Zahlen fassen lässt. Ein gemessener kritischer Befund überstimmt das
   Urteil des Modells (`enforceVerdict`).

Dieses Dokument hält fest, woher jeder Wert stammt. Ohne das wird aus einer
belegten Zahl schnell wieder eine geratene.

## Was gemessen wird

| Grösse | Herkunft |
| --- | --- |
| Gelenkwinkel (Ellenbogen, Knie, Hüfte) | 3D-Weltkoordinaten von MediaPipe |
| Beckenlage zur Linie Schulter–Sprunggelenk | 2D-Bildkoordinaten, auf Körperlänge normiert |
| Knieabstand zu Fussabstand, Standbreite | 2D-Bildkoordinaten, nur bei Frontalansicht |

Winkel kommen aus den **Weltkoordinaten**, weil ein schräg gefilmter Körper im
Bild perspektivisch verkürzt erscheint. Die Beckenlage kommt aus den
**Bildkoordinaten**, weil die Referenzdaten so gelabelt waren.

## Die Grenzwerte

### Liegestütze, Planke, Dips

| Regel | Wert | Herkunft |
| --- | --- | --- |
| Hüfte hängt durch | Beckenlage > +0.05 | 28 500 gelabelte Bilder, siehe unten |
| Hüfte steht zu hoch | Beckenlage < −0.30 | dieselbe Quelle |
| Bewegungsumfang verkürzt | Ellenbogen > 130° | Ziel 90°, plus 40° Messtoleranz |
| Ellenbogen flügeln | Oberarm–Rumpf > 85° | Ziel ~45°, konservativ gesetzt |

**Die Beckenlage ist der einzige an Daten kalibrierte Wert.** Grundlage ist der
Plank-Datensatz aus [Exercise-Correction](https://github.com/NgoQuocBao1010/Exercise-Correction)
mit 28 500 Bildern in drei Klassen (korrekt, Hüfte zu tief, Hüfte zu hoch).

Gemessen an diesen Daten:

| Trennschärfe | erkannt | Fehlalarm |
| --- | --- | --- |
| Körperlinien-**Winkel**, bester Wert | 82.7 % | 32.4 % |
| **Beckenlage**, gewählter Wert +0.05 | 98.8 % | 0.23 % |

Der Winkel wurde deshalb verworfen. Er kann die beiden Fehler ausserdem nicht
unterscheiden: Eine angehobene Hüfte schliesst ihn genauso wie eine
abgesunkene. Die Klassenmediane lagen bei 161° (korrekt), 147° (zu tief) und
87° (zu hoch).

### Kniebeuge

| Regel | Wert | Herkunft |
| --- | --- | --- |
| Knie kippen nach innen | Knie/Fuss < 0.7 im tiefsten Punkt | Referenzimplementierung; Datensatz-Median 0.80, 5 % bei 0.70 |
| Stand zu eng / zu breit | ausserhalb 1.2 – 2.8 | Referenzimplementierung |
| Nicht tief genug | Knie > 110° | Ziel 90°, plus 20° Messtoleranz |

### Klimmzüge, Ausfallschritte

| Regel | Wert | Herkunft |
| --- | --- | --- |
| Arme unten nicht gestreckt | Ellenbogen max < 130° | Referenzwert 160°, minus Toleranz |
| Ausfallschritt zu flach | Knie > 145° | Referenzbereich 60–125°, plus Toleranz |

## Messtoleranz

Aus [arXiv:2306.06117](https://arxiv.org/abs/2306.06117), einem Vergleich von
3D-Pose-Schätzung gegen Inertialsensoren:

| Gelenk | mittlere Abweichung | Maximum |
| --- | --- | --- |
| Knie, Sprunggelenk, Rücken | 1–7° | ~20° |
| **Ellenbogen** | moderat | **bis 50°** |

Deshalb liegen alle Winkelgrenzen so weit vom Idealwert entfernt, dass allein
die Messunsicherheit keinen Befund erzeugen kann. Der Ellenbogen ist das
unzuverlässigste Gelenk; die Messwerte sagen dem Modell das ausdrücklich, damit
es daraus keine knappen Schlüsse zieht.

Der Ellenbogen-Zielwert von 90° wird von
[Ultralytics](https://docs.ultralytics.com/guides/workouts-monitoring)
unabhängig bestätigt, das Liegestütze bei 90° unten und 145° oben zählt.

## Wenn nicht gemessen werden kann

Sind weniger als die Hälfte der Stichproben verwertbar, wird **kein** Befund
erzeugt. Die Breitenverhältnisse brauchen zusätzlich eine Frontalansicht; von
der Seite kollabieren beide Breiten und das Verhältnis wäre Rauschen.

Das ist Absicht: Ein erfundener Befund wäre schlimmer als ein fehlender.

## Was noch offen ist

- Die Grenzwerte für Kniebeuge, Klimmzug und Ausfallschritt stammen aus einer
  fremden Implementierung, nicht aus gelabelten Daten. Nur die Beckenlage ist
  wirklich validiert.
- Rückenrundung, Nachfedern und Schulterposition lassen sich mit diesen
  Landmarks nicht zuverlässig messen und bleiben beim Modell.
- Kreuzheben und Bankdrücken haben bisher nur grobe Regeln.
- Mit eigenen Aufnahmen liesse sich jeder Wert nachschärfen: gutes und
  schlechtes Video durchlaufen lassen, die `[messung]`-Zeilen aus dem
  Serverprotokoll vergleichen, Grenze dazwischen legen.

## Geprüfte Quellen

| Quelle | Ergebnis |
| --- | --- |
| [Exercise-Correction](https://github.com/NgoQuocBao1010/Exercise-Correction) | **Brauchbar.** 28 500 gelabelte Plank-Bilder, dazu Schwellenwerte für Kniebeuge und Ausfallschritt |
| [arXiv:2306.06117](https://arxiv.org/abs/2306.06117) | **Brauchbar.** Messgenauigkeit je Gelenk |
| [Ultralytics Workouts](https://docs.ultralytics.com/guides/workouts-monitoring) | **Bestätigend.** 90° / 145° für Liegestütze |
| [Labellerr Pull-up Counter](https://www.labellerr.com/blog/ai-pull-up-counter-yolo11-pose/) | **Bestätigend.** 160° volle Streckung |
| [arXiv:2406.17443](https://arxiv.org/abs/2406.17443) | **Methodisch bestätigend.** Kamerawinkel-unabhängige Gelenkwinkel nach ISB-Standard — dieselbe Begründung für Weltkoordinaten. Keine Grenzwerte |
| [HuggingFace TrainingDataPro](https://huggingface.co/datasets/TrainingDataPro/pose_estimation) | **Unbrauchbar.** Generische Pose-Daten ohne Qualitätslabels, kommerziell gesperrt |
