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

Alles wird in der **Bildebene** gerechnet, in echten Pixelproportionen und mit
`atan2` von Kreuz- gegen Skalarprodukt. Vorher wird aus der 3D-Pose bestimmt,
von wo die Kamera filmt (siehe „Kameraperspektive").

| Grösse | Berechnung | messbar |
| --- | --- | --- |
| Gelenkwinkel (Ellenbogen, Knie, Hüfte) | Winkel in der Bildebene, auf Seitenansicht zurückgerechnet | seitlich, schräg |
| Beckenlage zur Linie Schulter–Sprunggelenk | vorzeichenbehaftet, auf Körperlänge normiert, nur mit gestreckten Beinen | seitlich, schräg |
| Knieabstand zu Fussabstand, Standbreite | Verhältnis zweier Breiten | ab 45° von der Seite weg |

**Warum 2D und nicht 3D:** MediaPipe liefert auch Weltkoordinaten, und ein
schräg gefilmter Körper erscheint im Bild perspektivisch verkürzt — das spricht
zunächst für 3D. Aber **jeder** Grenzwert unten stammt aus einer Quelle, die den
projizierten Winkel misst. Auf denselben Bildern unterscheiden sich 2D- und
3D-Winkel erheblich:

| Gelenk | Median | 95 % | Maximum |
| --- | --- | --- | --- |
| Ellenbogen | 12.9° | 29.3° | 39.7° |
| Knie | 1.7° | 10.8° | 21.2° |
| Hüfte | 1.7° | 12.0° | 26.9° |

Beim Ellenbogen liegt die Abweichung damit in der Grössenordnung der
Grenzwert-Sicherheitsabstände selbst. Eine Grösse zu messen und sie an einer
Zahl zu beurteilen, die aus einer anderen stammt, ist schlechter als jede der
beiden Konventionen konsequent durchzuhalten.

Das Perspektiv-Argument betraf ohnehin vor allem die Körperlinie — und die wird
gar nicht mehr als Winkel gemessen, sondern als vorzeichenbehafteter Abstand,
kalibriert an gelabelten Daten.

## Seitenverhältnis

MediaPipe teilt x durch die Bildbreite und y durch die Bildhöhe. Wer damit
direkt Winkel rechnet, staucht im Querformat jede waagrechte Strecke auf 56 %
— als filmte man 56° schräg. Im Hochformat ist es umgekehrt. Bis `89cedbf`
wurde genau so gerechnet.

An den beiden Liegestütz-Aufnahmen (1920×1080) gemessen:

| | normiert (alt) | echte Proportionen (neu) |
| --- | --- | --- |
| Ellenbogen im tiefsten Punkt | 85° | 68° |
| Ellenbogen, halbe Tiefe | 116° | 90° |
| Beckenlage, stärkster Durchhang | +14 % | +8 % |

Dasselbe betrifft die Kalibrierung. Der Plank-Datensatz ist ebenfalls normiert
gespeichert, aus Querformat-Videos: Das Verhältnis von senkrechtem Arm zu
waagrechtem Bein liegt dort bei 0.612, im bekannt 16:9 aufgenommenen
Demo-Video desselben Projekts bei 0.663 — ein Seitenverhältnis von etwa 1.64.
Der alte Grenzwert +0.05 galt damit nur für Querformat; ein Hochformat-Video
brauchte den dreifachen Durchhang, um ihn zu reissen. Die Werte unten sind in
echten Proportionen neu erhoben und so gewählt, dass sie für 4:3 wie für 16:9
halten.

## Kameraperspektive

Ein Winkel in der Bildebene stimmt nur, wenn die Bewegung parallel zum Bild
läuft. Wie weit er sonst danebenliegt, ist reine Geometrie (Kamera auf
Körperhöhe):

| Kamera von der Seite weg | Knie, echt 85° | Ellenbogen, echt 130° | Beckenlage, echt 3 % |
| --- | --- | --- | --- |
| 0° | 85° | 130° | 3.0 % |
| 15° | 86° | 131° | 3.1 % |
| 30° | 91° | 134° | 3.5 % |
| 45° | 99° | 140° | 4.2 % |
| 60° | 113° | 149° | 6.0 % |
| 75° | 138° | 163° | 11.6 % |

Bei 60° liest sich eine korrekte Kniebeuge also als „nicht tief genug" und ein
Durchhang doppelt so gross, wie er ist.

**Wie die Perspektive bestimmt wird:** aus der Links-rechts-Achse von Schultern
und Hüften in MediaPipes 3D-Ausgabe. Von der Seite zeigt diese Achse auf die
Kamera, von vorn liegt sie quer im Bild. So beschriftet
[arXiv:1609.05522](https://arxiv.org/abs/1609.05522) seine Blickwinkel-Klassen,
und es ist die geometrische Baseline von
[3DPCNet](https://arxiv.org/abs/2509.23455). Gezählt wird nur der waagrechte
Anteil, damit eine erhöht gehaltene Kamera nicht als schräg gilt. Über den Clip
wird der Median genommen.

| Perspektive | Winkel | was passiert |
| --- | --- | --- |
| seitlich | bis 30° | gemessen wie gehabt; die Rückrechnung ist vernachlässigbar |
| schräg | 30–60° | waagrechte Strecken um 1/cos(Winkel) gestreckt, zurück auf Seitenansicht |
| frontal | über 60° | Tiefe, Gelenkwinkel, Körperlinie und Wiederholungen **nicht** gemessen; Gemini beurteilt sie am Bild und muss die Einschränkung nennen |

Die Grenzen folgen aus der Tabelle: Bis 30° bleibt der Fehler innerhalb der
Gelenktoleranz; ab 60° müsste das Bild mindestens auf das Doppelte gestreckt
werden, und das verstärkt das Rauschen des Pose-Modells ebenso.

Die Breitenverhältnisse (Knie, Stand) brauchen keine Rückrechnung: Dreht sich
der Körper weg, schrumpfen beide Breiten um denselben Faktor. Gemessen werden
sie erst ab 45°, weil beide Breiten darunter ins Rauschen fallen.

**Geprüft:** An den beiden Liegestütz-Clips erkennt die Messung „seitlich" mit
4° und 2°, von Bild zu Bild um 2–3° schwankend — passend zu dem, was auf den
Bildern zu sehen ist. Dieselben Posen, synthetisch aus der Seitenansicht
weggedreht: Die Beckenlage bleibt bis 55° auf ±0.01 stabil, bei 68° schaltet die
Messung korrekt auf „frontal".

**Was die Rückrechnung nicht kann:** Sie korrigiert nur Bewegung in der
Körperebene. Der Ellenbogen im Liegestütz wandert teils seitlich nach aussen;
im synthetischen Test lag er bei 55° deshalb bis zu 24° zu hoch. Die
Ellenbogen-Toleranz von 40° fängt das ab, aber knapp.

**Kamerahöhe:** Eine von oben filmende Kamera lässt die Kniebeuge tiefer und den
Durchhang kleiner erscheinen — sie verschweigt Fehler, erfindet aber keine.
[MoViD](https://arxiv.org/abs/2604.03299) misst bei erhöhten Seitenansichten die
grössten Fehler aller Blickwinkel. Deshalb bleibt der Hinweis in der App: auf
Hüfthöhe filmen.

## Die Grenzwerte

### Liegestütze, Planke, Dips

| Regel | Wert | Herkunft |
| --- | --- | --- |
| Hüfte hängt durch | Beckenlage > +0.035 | 28 500 gelabelte Bilder, siehe unten |
| Hüfte steht zu hoch | Beckenlage < −0.20 | dieselbe Quelle |
| Bewegungsumfang verkürzt | Ellenbogen > 130° | Ziel 90°, plus 40° Messtoleranz |
| Ellenbogen flügeln | Oberarm–Rumpf > 85° | Ziel ~45°, konservativ gesetzt |

**Die Beckenlage ist der einzige an Daten kalibrierte Wert.** Grundlage ist der
Plank-Datensatz aus [Exercise-Correction](https://github.com/NgoQuocBao1010/Exercise-Correction)
mit 28 500 Bildern in drei Klassen (korrekt, Hüfte zu tief, Hüfte zu hoch).

Gemessen an diesen Daten:

| Trennschärfe | erkannt | Fehlalarm |
| --- | --- | --- |
| Körperlinien-**Winkel**, bester Wert | 82.7 % | 32.4 % |
| Beckenlage +0.05, normiert (bis `89cedbf`) | 98.8 % | 0.23 % |
| **Beckenlage +0.035**, echte Proportionen | 98.2–99.1 % | 0.16–0.25 % |
| **Hüfte zu hoch −0.20**, echte Proportionen | 96.0–100 % | 0.00–0.13 % |

Die Spannen reichen von 16:9 bis 4:3, je nachdem, welches Seitenverhältnis der
Datensatz tatsächlich hatte. Gezählt werden nur Bilder mit dem Knie über 140°:
Das verwirft Hinknien und Aufstehen und trifft 0.0–0.23 % der gelabelten Bilder
jeder Klasse. Ohne diese Sperre erzeugte das Aufstehen am Ende eines sauberen
Satzes zwei kritische Befunde auf einmal — „Hüfte steht zu hoch" (62 %) und
„Ellenbogen flügeln" (111°).

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

## Wiederholungen

Gezählt mit einem Zwei-Zustands-Automaten über das führende Gelenk (Ellenbogen
oder Knie, je nachdem welches sich in dieser Übung tatsächlich bewegt):

| Tor | Wert | Herkunft |
| --- | --- | --- |
| unten | < 90° + Gelenktoleranz | Ultralytics-Zähler |
| oben | > 145° | Ultralytics-Zähler |

Beide Tore müssen durchlaufen werden, sonst zählt die Wiederholung nicht — das
verwirft die halbe Wiederholung, die nie wieder hochkam. Aus den Tiefstwerten
je Wiederholung folgt ausserdem der Befund „Tiefe nimmt über den Satz ab" ab
15° Unterschied zwischen erster und letzter.

**Stichprobendichte:** Eine Wiederholung dauert rund eine Sekunde. Mit den
früheren 26 Bildern pro Clip fand der Zähler in einem 17-Sekunden-Satz nur 6
oder 7 von 10 Wiederholungen — und der Prompt verbot Gemini, weitere zu nennen.
Am 10-fps-Verlauf nachgerechnet, zählt der Automat ab 3.3 Bildern pro Sekunde
bei jeder Phasenlage alle 10. Gemessen wird deshalb mit 4 Bildern pro Sekunde,
mindestens 26 und höchstens 120.

Vorher beschrieb das Modell Wiederholungen, die niemand gezählt hatte. Der
Prompt sagt jetzt ausdrücklich, dass diese Zahlen gemessen sind und keine
weiteren erfunden werden dürfen.

## Drei Beispiele im Prompt

Aus [arXiv:2505.18412](https://arxiv.org/abs/2505.18412) (IJCAI 2025), das
genau diese Aufgabe untersucht — Bewegungsqualität per LLM aus Skelettmerkmalen:

| Beispiele im Prompt | Genauigkeit | F1 |
| --- | --- | --- |
| keine | 0.57 | 0.64 |
| **drei** | **0.68** | **0.76** |
| vier | 0.42 | 0.46 |

Deshalb genau drei — ein viertes verschlechtert das Ergebnis deutlich. Die
Beispielwerte sind Klassenmediane aus den gelabelten Daten, keine erfundenen
Zahlen. Dasselbe Paper bestätigt, dass Merkmale (Winkel) besser funktionieren
als rohe Gelenkkoordinaten, was hier ohnehin schon so gemacht wurde.

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
erzeugt. Von vorn (über 60°) werden Tiefe, Gelenkwinkel, Körperlinie und
Wiederholungen nicht gemessen, von der Seite (unter 45°) die
Breitenverhältnisse nicht. Der Prompt sagt Gemini jeweils, was aus der
gemessenen Perspektive offenbleibt.

Das ist Absicht: Ein erfundener Befund wäre schlimmer als ein fehlender.

## Was noch offen ist

- **Schräge Perspektiven sind nur synthetisch geprüft.** „Seitlich" ist an
  echten Aufnahmen bestätigt, 30–60° nur an gedrehten Posen. Nächster Schritt:
  denselben Satz einmal von der Seite und einmal 45° schräg filmen und die
  `[messung]`-Zeilen vergleichen.
- Das Seitenverhältnis des Plank-Datensatzes ist geschätzt (1.64), nicht
  bekannt. Die Grenzwerte sind deshalb so gewählt, dass sie für 4:3 und 16:9
  halten.
- **Flache Wiederholungen werden nicht gezählt.** Das untere Tor (115° am
  Ellenbogen) verwirft jede Wiederholung, die es nicht erreicht — im zweiten
  Liegestütz-Clip 3 von 7. Ein Zähler über die Schwingungsweite statt über feste
  Tore (25° hinunter und wieder hinauf) fand dort alle 7 und im sauberen Clip
  dieselben 10. Zwei Clips sind zu wenig, um ihn schon einzubauen.
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
| [arXiv:2406.17443](https://arxiv.org/abs/2406.17443) | **Methodisch.** Gelenkwinkel nach ISB-Standard, unabhängig von Kamerawinkel und Person. Keine Grenzwerte; der beschriebene Weg wäre die saubere Ablösung der Bildebene, wenn die Grenzwerte dazu passend neu erhoben würden |
| [HuggingFace TrainingDataPro](https://huggingface.co/datasets/TrainingDataPro/pose_estimation) | **Unbrauchbar.** Generische Pose-Daten ohne Qualitätslabels, kommerziell gesperrt |
| [ExerciseLLM / arXiv:2505.18412](https://github.com/jessicaxtang/ExerciseLLM) | **Sehr brauchbar.** Drei Beispiele im Prompt sind das Optimum; Merkmale schlagen Rohkoordinaten |
| [arXiv:2304.09735](https://arxiv.org/abs/2304.09735) | **Brauchbar.** Wiederholungs-Segmentierung als erster Schritt — führte zum Zähler |
| [avakanski Rehab-Framework](https://github.com/avakanski/A-Deep-Learning-Framework-for-Assessing-Physical-Rehabilitation-Exercises) | **Nicht übertragbar.** Trainiert ein neuronales Netz auf Qualitätsnoten; braucht gelabelte Trainingsdaten, die wir nicht haben |
| [REHAB24-6 / Zenodo](https://zenodo.org/records/13305826) | **Möglicher Kalibrierungsvorrat.** Reha-Übungen inkl. Kniebeugen mit mehreren Ansichten; noch nicht ausgewertet |
| [mm-fit](https://github.com/KDMStromback/mm-fit) | **Nicht ausgewertet.** Multimodale Fitnessdaten, Schwerpunkt Aktivitätserkennung |
| [UI-PRMD-Port](https://github.com/tejas1904/UI-PRMD-Visualize-python-port) | **Nur Visualisierung.** Keine Grenzwerte |
| [arXiv:1609.05522](https://arxiv.org/abs/1609.05522) | **Brauchbar, ohne das Netz.** Blickwinkel in 45°-Klassen, Gier-Winkel aus beiden Schultern — die Idee hinter der Perspektiven-Erkennung. Das CNN selbst ist überflüssig, weil MediaPipe die 3D-Schultern schon liefert; es irrte sich zwischen Personen in 20 % der Fälle |
| [3DPCNet / arXiv:2509.23455](https://arxiv.org/abs/2509.23455) | **Brauchbar als Referenz.** Seine geometrische Baseline (Ebene aus Schultern und Hüften) ist das hier eingebaute Verfahren; dort ~21° Fehler für die volle 3D-Rotation. Das gelernte Netz (3.6°) braucht PyTorch, nicht im Browser lauffähig |
| [MoViD / arXiv:2604.03299](https://arxiv.org/abs/2604.03299) | **Bestätigend.** Fehler je Blickwinkel 57.6–81.7 mm, erhöhte Seitenansichten am schlechtesten — daher „auf Hüfthöhe filmen". Das Modell braucht eine GPU |
| [V-VIPE / arXiv:2407.07092](https://arxiv.org/abs/2407.07092) | **Nicht übertragbar.** Blickunabhängige Einbettung für die Suche nach ähnlichen Posen; liefert weder Winkel noch Grenzwerte |
| [Heliyon 2024, e27596](https://pmc.ncbi.nlm.nih.gov/articles/PMC10951609/) | **Massstab.** 3D-Winkel auf 2–6° genau, aber nur mit eigens trainiertem Modell und Vicon-Daten; das Augenmass von Physiotherapeuten liegt bei ~12°. Keine Ergebnisse je Blickwinkel |
