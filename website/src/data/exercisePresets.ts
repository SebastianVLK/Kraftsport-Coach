import { ExerciseAnalysisData } from "../types";

export interface ExercisePreset {
  id: string;
  name: string;
  category: string;
  exercise: string;
  description: string;
  videoPlaceholderText: string;
  sampleAnalysis: ExerciseAnalysisData;
}

export const EXERCISE_PRESETS: ExercisePreset[] = [
  {
    id: "pushups-flaw",
    name: "Liegestütze (Push-ups) – Hüfte hängt durch & halbe Tiefe",
    category: "Oberkörper & Core",
    exercise: "Liegestütze (Push-ups)",
    description: "Hüfte sackt ins Hohlkreuz ab, Ellenbogen 90° T-Position, Umkehrpunkt vorzeitig abgebrochen.",
    videoPlaceholderText: "6 Wiederholungen Liegestütze: Verlust der Plank-Spannung, Kopf nickt nach unten.",
    sampleAnalysis: {
      exerciseName: "Liegestütze (Push-ups)",
      urteil: "mangelhaft",
      begruendung: "Bereits bei der zweiten Wiederholung geht die lumbale Rumpfspannung komplett verloren, sodass das Becken durchhängt und den Boden vor der Brust berührt. Zudem werden die Ellenbogen in einem 90-Grad-Winkel abgespreizt, was die vordere Schulterkapsel übermäßig belastet.",
      derWichtigsteFehler: "Durchhängende Hüfte mit Hyperlordose und vorzeitigem Umkehrpunkt weit vor Erreichen der Brusttiefe.",
      korrektur: "Spann Gesäß und Bauchmuskeln wie bei einer harten Plank an und führe die Ellenbogen im 45-Grad-Pfeilwinkel nach hinten.",
      gewicht: {
        empfehlung: "runtergehen",
        begruendung: "Hände auf eine Hantelbank oder Box erhöhen, um die Rumpfspannung über den vollen Bewegungsumfang zu erlernen.",
      },
      wasNichtBeurteilbar: "Die exakte Handauflagefläche und Handgelenksbeugung war durch den Bodenkontaktschatten schwer erkennbar.",
      beobachteteKriterien: {
        bewegungsumfang: "Unvollständig (Brust bleibt ca. 15 cm über dem Boden stehen, Kopf kompensiert durch Vornicken).",
        gelenkstellung: "Ellenbogen übermäßig nach außen gestellt (T-Form statt Pfeilform); LWS im Hohlkreuz.",
        tempo: "Abwärtsbewegung ruckartig nachgebend, Aufwärtsbewegung wellenförmig (Brust zuerst, Hüfte hinterher).",
        schwung: "Hüftimpuls versucht Kraftdefizit der Brust/Trizeps zu überspielen.",
        symmetrie: "Rechter Ellenbogen wandert weiter nach außen als der linke.",
        konsistenz: "Starker Verfall der Körperspannung ab Wiederholung 2.",
      },
      agentTrace: [
        {
          phaseId: "triage",
          name: "Perspektiven- & Sichtfeldprüfung",
          status: "done",
          summary: "Seitenprofil erfasst, ganzer Körper von Scheitel bis Ferse im Bild.",
          details: ["Licht ausreichend", "Bodenlinie gerade", "Handgelenk- & Schulterachse sichtbar"],
        },
        {
          phaseId: "segmentation",
          name: "Phasen- & Umkehrpunkt-Erkennung",
          status: "done",
          summary: "6 Wiederholungen erkannt. Umkehrpunkt bei Rep 2–6 stark nach oben verlagert.",
          details: ["Rep 1: 8cm Resttiefe", "Rep 2–6: 15cm Resttiefe mit Beckenkontakt"],
        },
        {
          phaseId: "biomechanics",
          name: "Biomechanischer Regelprüfer",
          status: "warning",
          summary: "Kollaps der Rumpfkette (Anterior Pelvic Tilt) & Impingement-Winkel an Schultern.",
          details: ["Hüftabsenkung > 12° unter Körperachse", "Ellenbogenabspreizung ca. 85°–90°"],
        },
        {
          phaseId: "verdict",
          name: "Schiedsrichter-Urteil",
          status: "done",
          summary: "URTEIL: MANGELHAFT. Signifikante Fehlbelastung der LWS und vorderen Schultern.",
        },
        {
          phaseId: "drill",
          name: "Korrektur-Drill Synthese",
          status: "done",
          summary: "Elevated Plank-to-Pushup + Hands-Release Cue zur Verankerung der Brusttiefe.",
        },
      ],
      drillRecommendation: {
        title: "Incline Push-up mit Brust-Stopp",
        setsAndReps: "3 Sätze à 8 saubere Wiederholungen",
        executionCue: "Hände auf Box (45cm). Körper wie ein Brett anspannen. Brust berührt die Kante für 1 Sekunde Pause vor dem Wegdrücken.",
        purpose: "Beseitigt das Durchhängen und trainiert den korrekten 45°-Ellenbogenwinkel ohne Überlastung.",
      },
      alternativeCues: {
        externalCue: "Drücke den Boden von dir weg, als wolltest du eine Wand wegschieben.",
        internalCue: "Kneife eine Münze zwischen deinen Pobacken ein.",
        visualCue: "Stell dir vor, dein Körper ist ein gerades Bügelbrett aus Stahl.",
      },
      rawOutputText: `URTEIL: mangelhaft

BEGRÜNDUNG: Bereits bei der zweiten Wiederholung geht die lumbale Rumpfspannung komplett verloren, sodass das Becken durchhängt und den Boden vor der Brust berührt. Zudem werden die Ellenbogen in einem 90-Grad-Winkel abgespreizt, was die vordere Schulterkapsel übermäßig belastet.

DER WICHTIGSTE FEHLER: Durchhängende Hüfte mit Hyperlordose und vorzeitigem Umkehrpunkt weit vor Erreichen der Brusttiefe.

KORREKTUR: Spann Gesäß und Bauchmuskeln wie bei einer harten Plank an und führe die Ellenbogen im 45-Grad-Pfeilwinkel nach hinten.

GEWICHT: runtergehen – Hände auf eine Hantelbank oder Box erhöhen, um die Rumpfspannung über den vollen Bewegungsumfang zu erlernen.

WAS ICH NICHT BEURTEILEN KONNTE: Die exakte Handauflagefläche und Handgelenksbeugung war durch den Bodenkontaktschatten schwer erkennbar.`,
    },
  },
  {
    id: "pushups-clean",
    name: "Liegestütze (Push-ups) – Saubere Brettspannung & 45° Ellenbogen",
    category: "Oberkörper & Core",
    exercise: "Liegestütze (Push-ups)",
    description: "Kerzengerade Plank-Linie von Kopf bis Ferse, Brust senkt bis 2cm vor den Boden ab.",
    videoPlaceholderText: "8 Wiederholungen Liegestütze mit kontrollierter 2-Sekunden-Kadenz und spürbarem Stopp.",
    sampleAnalysis: {
      exerciseName: "Liegestütze (Push-ups)",
      urteil: "gut",
      begruendung: "Exzellente Rumpf- und Beckenkontrolle über den gesamten Satz hinweg. Die Brust berührt kontrolliert fast den Boden, und die Ellenbogen verbleiben in einem biomechanisch sicheren 45-Grad-Winkel.",
      derWichtigsteFehler: "Minimale Vorverlagerung des Kinns bei den letzten zwei Wiederholungen gegen Satzende.",
      korrektur: "Halte den Blick konstant 20 Zentimeter vor deinen Fingerspitzen, um den Nacken in neutraler Verlängerung zu stabilisieren.",
      gewicht: {
        empfehlung: "hochgehen",
        begruendung: "Die Technik ist absolut stabil; Progression mit Gewichtsweste oder Füße erhöht ist angezeigt.",
      },
      wasNichtBeurteilbar: "Die exakte Muskelspannung der Glutealmuskulatur kann visuell nur indirekt über die Beckenposition beurteilt werden.",
      beobachteteKriterien: {
        bewegungsumfang: "Volle Tiefe erreicht; Schulterblätter bewegen sich frei in Retraktion und Protraktion.",
        gelenkstellung: "Perfekter 45-Grad-Pfeilwinkel der Oberarme zum Rumpf.",
        tempo: "Gleichmäßige 2-Sekunden-Exzentrik mit sauberem Umkehrpunkt ohne Aufprall.",
        schwung: "Reine Muskelkraft ohne Schwingen oder Beckenwelle.",
        symmetrie: "Beide Arme drücken gleichmäßig.",
        konsistenz: "Geringfügige Ermüdung bei Rep 7-8, aber keine Formauflösung.",
      },
      agentTrace: [
        {
          phaseId: "triage",
          name: "Perspektiven- & Sichtfeldprüfung",
          status: "done",
          summary: "Sehr gute 45°-Seitenansicht, Fußposition und Kopfhaltung klar erkennbar.",
        },
        {
          phaseId: "segmentation",
          name: "Phasen- & Umkehrpunkt-Erkennung",
          status: "done",
          summary: "8 Wiederholungen präzise getaktet. Umkehrpunkt jeweils bei 2,1s nach Start.",
        },
        {
          phaseId: "biomechanics",
          name: "Biomechanischer Regelprüfer",
          status: "done",
          summary: "Strikte Neutralität der Wirbelsäule, Scapula-Gleiten anatomisch einwandfrei.",
        },
        {
          phaseId: "verdict",
          name: "Schiedsrichter-Urteil",
          status: "done",
          summary: "URTEIL: GUT. Solide Kraftleistung mit vorbildlicher Ausführung.",
        },
        {
          phaseId: "drill",
          name: "Korrektur-Drill Synthese",
          status: "done",
          summary: "Deficit Push-ups oder Gewichtsweste zur weiteren Kraftprogression.",
        },
      ],
      drillRecommendation: {
        title: "Deficit Push-ups auf Griffen oder Scheiben",
        setsAndReps: "3 Sätze à 6–8 Wiederholungen",
        executionCue: "Hände auf zwei 5kg Hantelscheiben. Erhöhe den Bewegungsumfang für noch mehr Dehnung im Pectoralis.",
        purpose: "Maximiert Muskelhypertrophie und Kraft am tiefsten Umkehrpunkt.",
      },
      alternativeCues: {
        externalCue: "Schraube die Handballen nach außen in den Hallenboden.",
        internalCue: "Zieh den Bauchnabel leicht nach innen-oben zur Wirbelsäule.",
        visualCue: "Dein Körper ist ein massiver Holzpfeiler.",
      },
      rawOutputText: `URTEIL: gut

BEGRÜNDUNG: Exzellente Rumpf- und Beckenkontrolle über den gesamten Satz hinweg. Die Brust berührt kontrolliert fast den Boden, und die Ellenbogen verbleiben in einem biomechanisch sicheren 45-Grad-Winkel.

DER WICHTIGSTE FEHLER: Minimale Vorverlagerung des Kinns bei den letzten zwei Wiederholungen gegen Satzende.

KORREKTUR: Halte den Blick konstant 20 Zentimeter vor deinen Fingerspitzen, um den Nacken in neutraler Verlängerung zu stabilisieren.

GEWICHT: hochgehen – Die Technik ist absolut stabil; Progression mit Gewichtsweste oder Füße erhöht ist angezeigt.

WAS ICH NICHT BEURTEILEN KONNTE: Die exakte Muskelspannung der Glutealmuskulatur kann visuell nur indirekt über die Beckenposition beurteilt werden.`,
    },
  },
  {
    id: "squat-good",
    name: "Kniebeuge (Squat) – Saubere Form",
    category: "Unterkörper",
    exercise: "Kniebeuge (Barbell Back Squat)",
    description: "Volle Tiefe erreicht, Knie stabil über Fußmitte, neutraler Rücken.",
    videoPlaceholderText: "3 Wiederholungen Kniebeugen mit paralleler Tiefe und kontrolliertem Umkehrpunkt.",
    sampleAnalysis: {
      exerciseName: "Kniebeuge (Back Squat)",
      urteil: "gut",
      begruendung: "Die Kniebeugen zeigen durchgehend eine kontrollierte Abwärtsbewegung und erreichen zuverlässig volle Tiefe unter der Parallele. Die Wirbelsäule bleibt über alle Wiederholungen in einer stabilen, neutralen Position ohne sichtbares Einrunden am Umkehrpunkt.",
      derWichtigsteFehler: "Geringfügige Fersenentlastung bei der dritten Wiederholung im letzten Drittel der Aufwärtsbewegung.",
      korrektur: "Schraube die Füße vor dem Einleiten aktiv in den Boden und belaste das Dreieck aus Ferse, Großzehen- und Kleinzehengrundgelenk gleichmäßig.",
      gewicht: {
        empfehlung: "hochgehen",
        begruendung: "Die Bewegungskontrolle am Umkehrpunkt ist souverän und lässt eine moderate Steigerung zu.",
      },
      wasNichtBeurteilbar: "Die exakte Handgelenksstellung und Ellenbogenposition unter der Stange war aus dieser schrägen Seitenperspektive teilweise durch die Hantelscheibe verdeckt.",
      beobachteteKriterien: {
        bewegungsumfang: "Volle Tiefe (Hüftfalte unterhalb Knieoberkante) bei jeder Wiederholung.",
        gelenkstellung: "Knie spurtreu über Fußmitte, kein Knievalgus erkennbar.",
        tempo: "Kontrollierte exzentrische Phase (~2s), dynamischer Start aus dem Umkehrpunkt.",
        schwung: "Kein Nachfedern oder Ausweichen im Umkehrpunkt.",
        symmetrie: "Beide Beine und Hüftseiten arbeiten gleichmäßig.",
        konsistenz: "Form bleibt von Wiederholung 1 bis 3 stabil.",
      },
      agentTrace: [
        {
          phaseId: "triage",
          name: "Sichtfeld- & Rackprüfung",
          status: "done",
          summary: "Stange, Hüfte und Knie im Sichtbereich.",
        },
        {
          phaseId: "segmentation",
          name: "Tiefpunkt-Segmentierung",
          status: "done",
          summary: "Hüftfalte passiert Kniescheiben-Oberkante um ca. 2–3 cm.",
        },
        {
          phaseId: "biomechanics",
          name: "Wirbelsäulen-Tracking",
          status: "done",
          summary: "Thorakale und lumbale Streckung durchgehend aufrecht erhalten.",
        },
        {
          phaseId: "verdict",
          name: "Urteilsfindung",
          status: "done",
          summary: "URTEIL: GUT. Stabile Lastbewältigung.",
        },
        {
          phaseId: "drill",
          name: "Trainingsempfehlung",
          status: "done",
          summary: "Pause Squats mit 1 Sekunde Stopp im tiefsten Punkt.",
        },
      ],
      drillRecommendation: {
        title: "Pausierte Kniebeuge (Pause Squat)",
        setsAndReps: "3 Sätze à 3–5 Wiederholungen mit 70% 1RM",
        executionCue: "Am tiefsten Umkehrpunkt 2 volle Sekunden pausieren, Spannung halten, explosiv aufstehen.",
        purpose: "Festigt das Dreipunkt-Fußgefühl und eliminiert jede Hektik im Umkehrpunkt.",
      },
      alternativeCues: {
        externalCue: "Drücke den Boden wie eine Beinpresse nach unten weg.",
        internalCue: "Bauchdecke aktiv gegen den Gürtel pressen.",
        visualCue: "Stell dir vor, du setzt dich zwischen deine Beine auf einen niedrigen Hocker.",
      },
      rawOutputText: `URTEIL: gut

BEGRÜNDUNG: Die Kniebeugen zeigen durchgehend eine kontrollierte Abwärtsbewegung und erreichen zuverlässig volle Tiefe unter der Parallele. Die Wirbelsäule bleibt über alle Wiederholungen in einer stabilen, neutralen Position ohne sichtbares Einrunden am Umkehrpunkt.

DER WICHTIGSTE FEHLER: Geringfügige Fersenentlastung bei der dritten Wiederholung im letzten Drittel der Aufwärtsbewegung.

KORREKTUR: Schraube die Füße vor dem Einleiten aktiv in den Boden und belaste das Dreieck aus Ferse, Großzehen- und Kleinzehengrundgelenk gleichmäßig.

GEWICHT: hochgehen – Die Bewegungskontrolle am Umkehrpunkt ist souverän und lässt eine moderate Steigerung zu.

WAS ICH NICHT BEURTEILEN KONNTE: Die exakte Handgelenksstellung und Ellenbogenposition unter der Stange war aus dieser schrägen Seitenperspektive teilweise durch die Hantelscheibe verdeckt.`,
    },
  },
  {
    id: "deadlift-flaw",
    name: "Kreuzheben (Deadlift) – Einrundung LWS",
    category: "Ganzkörper",
    exercise: "Konventionelles Kreuzheben",
    description: "Leichte Flexion im Lendenwirbelbereich beim Anheben vom Boden.",
    videoPlaceholderText: "4 Wiederholungen Kreuzheben; ab Rep 3 sichtbare Rundung im unteren Rücken.",
    sampleAnalysis: {
      exerciseName: "Konventionelles Kreuzheben",
      urteil: "mangelhaft",
      begruendung: "Bereits beim Lösen der Stange vom Boden verliert der Athlet die lumbal neutrale Ausrichtung. Am Umkehrpunkt vom Boden knickt die Lendenwirbelsäule in eine sichtbare Beugung ein, bevor die Kniestreckung abgeschlossen ist.",
      derWichtigsteFehler: "Verlust der lumbosakralen Neutralität direkt beim Brechen der Bodenhaftung (Rundrücken unter Last).",
      korrektur: "Zieh vor dem Anheben die 'Slack' aus der Stange und spanne den Latissimus an, als wolltest du Orangen in den Achselhöhlen auspressen.",
      gewicht: {
        empfehlung: "runtergehen",
        begruendung: "Um Verletzungen der Bandscheiben zu vermeiden und das Anspannungsmuster neu zu verankern.",
      },
      wasNichtBeurteilbar: "Die Fußdruckverteilung in den Schuhen war aufgrund der dunklen Sohlen nicht differenzierbar.",
      beobachteteKriterien: {
        bewegungsumfang: "Volle Aufrichtung oben erreicht, aber fehlerhafte Startposition.",
        gelenkstellung: "Lendenwirbelsäule flektiert, Hüfte schießt zuerst nach oben.",
        tempo: "Ruckartiges Ziehen statt progressiver Kraftentwicklung.",
        schwung: "Hüftimpuls ohne ausreichende Rumpfsteifigkeit.",
        symmetrie: "Keine grobe Asymmetrie sichtbar.",
        konsistenz: "Verschlechterung ab Rep 2 deutlich erkennbar.",
      },
      agentTrace: [
        {
          phaseId: "triage",
          name: "Kamerawinkel-Check",
          status: "done",
          summary: "Seitenperspektive gut geeignet zur LWS-Beurteilung.",
        },
        {
          phaseId: "segmentation",
          name: "Startphase-Segmentierung",
          status: "warning",
          summary: "Hüfte hebt vor der Stange ab (Stripper Deadlift Muster).",
        },
        {
          phaseId: "biomechanics",
          name: "Scherspannungs-Prüfung LWS",
          status: "warning",
          summary: "Erhöhte Scherkräfte durch 18° LWS-Flexion beim Bodenabriss.",
        },
        {
          phaseId: "verdict",
          name: "Schiedsrichter-Urteil",
          status: "done",
          summary: "URTEIL: MANGELHAFT. Akute Verletzungsgefahr für Bandscheiben.",
        },
        {
          phaseId: "drill",
          name: "Korrektur-Drill",
          status: "done",
          summary: "Halting Deadlifts am Schienbein zur Fixierung der Rumpfspannung.",
        },
      ],
      drillRecommendation: {
        title: "Deadlift mit 2s Pause unter dem Knie",
        setsAndReps: "4 Sätze à 3 Wiederholungen mit 60% 1RM",
        executionCue: "Heb die Stange 3 cm vom Boden an, pausiere 2 Sekunden mit bretthartem Rücken, dann vollenden.",
        purpose: "Zwingt das Nervensystem, die LWS gegen den Bodenwiderstand stabil zu halten.",
      },
      alternativeCues: {
        externalCue: "Versuche, die Hantelstange um deine Schienbeine herum zu biegen.",
        internalCue: "Brustbein stolz vorzeigen und Latissimus unter Dauerzug setzen.",
        visualCue: "Stell dir vor, du drückst den Erdball mit deinen Fersen nach unten weg.",
      },
      rawOutputText: `URTEIL: mangelhaft

BEGRÜNDUNG: Bereits beim Lösen der Stange vom Boden verliert der Athlet die lumbal neutrale Ausrichtung. Am Umkehrpunkt vom Boden knickt die Lendenwirbelsäule in eine sichtbare Beugung ein, bevor die Kniestreckung abgeschlossen ist.

DER WICHTIGSTE FEHLER: Verlust der lumbosakralen Neutralität direkt beim Brechen der Bodenhaftung (Rundrücken unter Last).

KORREKTUR: Zieh vor dem Anheben die 'Slack' aus der Stange und spanne den Latissimus an, als wolltest du Orangen in den Achselhöhlen auspressen.

GEWICHT: runtergehen – Um Verletzungen der Bandscheiben zu vermeiden und das Anspannungsmuster neu zu verankern.

WAS ICH NICHT BEURTEILEN KONNTE: Die Fußdruckverteilung in den Schuhen war aufgrund der dunklen Sohlen nicht differenzierbar.`,
    },
  },
  {
    id: "bench-bounce",
    name: "Bankdrücken (Bench Press) – Bouncing auf Brust",
    category: "Oberkörper",
    exercise: "Flachbankdrücken",
    description: "Zu schnelles Ablassen mit Abfedern vom Brustkorb im Umkehrpunkt.",
    videoPlaceholderText: "5 Wiederholungen Bankdrücken mit schnellem Fall und Abprallen auf dem Sternum.",
    sampleAnalysis: {
      exerciseName: "Flachbankdrücken",
      urteil: "brauchbar",
      begruendung: "Die Stangenbahn und Schulterblattretraktion sind grundsätzlich passend positioniert. Jedoch fehlt im tiefsten Punkt jegliche Spannung, da die Hantel auf dem Brustbein abgefedert wird, statt kontrolliert gewendet zu werden.",
      derWichtigsteFehler: "Abprallen der Hantelstange auf dem Brustkorb (Bounce) anstelle einer kontrollierten Umkehrbewegung.",
      korrektur: "Lass die Stange in 2 Sekunden kontrolliert ab und pausiere für einen Wimpernschlag spürbar auf der Brust ohne Einsinken.",
      gewicht: {
        empfehlung: "gleich bleiben",
        begruendung: "Das Gewicht ist bewältigbar, erfordert aber striktere Kadenzkontrolle.",
      },
      wasNichtBeurteilbar: "Der Beinantrieb (Leg Drive) war im Bildausschnitt abgeschnitten, da die Kamera zu nah am Kopfende stand.",
      beobachteteKriterien: {
        bewegungsumfang: "Brustkontakt erfolgt, aber unkontrolliert.",
        gelenkstellung: "Handgelenke gerade, Ellenbogen ca. 75 Grad zum Torso.",
        tempo: "Ablassen unkontrolliert schnell, Drücken ruckartig.",
        schwung: "Deutlicher elastischer Brust-Bounce im Umkehrpunkt.",
        symmetrie: "Stange geht waagerecht nach oben.",
        konsistenz: "Bounce nimmt mit jeder Wiederholung zu.",
      },
      agentTrace: [
        {
          phaseId: "triage",
          name: "Sichtfeld- & Kameraanalyse",
          status: "done",
          summary: "Frontal-schräge Sicht auf Bank und Hantelstange.",
        },
        {
          phaseId: "segmentation",
          name: "Umkehrpunkt-Geschwindigkeit",
          status: "warning",
          summary: "Abrupter Impuls am tiefsten Punkt ohne kontrollierten Haltepunkt.",
        },
        {
          phaseId: "biomechanics",
          name: "Sternum-Kompression",
          status: "warning",
          summary: "Stange federt ca. 3cm in den Brustkorb ein.",
        },
        {
          phaseId: "verdict",
          name: "Schiedsrichter-Urteil",
          status: "done",
          summary: "URTEIL: BRAUCHBAR. Gute Kraftübertragung, aber schlechte Wettkampfgültigkeit.",
        },
        {
          phaseId: "drill",
          name: "Korrektur-Drill",
          status: "done",
          summary: "Spoto Press oder 2-Sekunden Wettkampf-Pausenbankdrücken.",
        },
      ],
      drillRecommendation: {
        title: "Spoto Press (Stopp 2cm über der Brust)",
        setsAndReps: "3 Sätze à 5 Wiederholungen mit 70% Last",
        executionCue: "Stoppe die Hantel 2 cm vor dem Shirtkontakt völlig regungslos ab, warte 1 Sekunde und drücke explosiv hoch.",
        purpose: "Baut extreme isometrische Spannung und Bar-Path-Kontrolle im Umkehrpunkt auf.",
      },
      alternativeCues: {
        externalCue: "Berühre dein T-Shirt, ohne den Stoff einzudrücken.",
        internalCue: "Zieh die Stange wie beim Rudern aktiv zur Brust.",
        visualCue: "Stell dir vor, auf deiner Brust liegt eine dünne Glasscheibe.",
      },
      rawOutputText: `URTEIL: brauchbar

BEGRÜNDUNG: Die Stangenbahn und Schulterblattretraktion sind grundsätzlich passend positioniert. Jedoch fehlt im tiefsten Punkt jegliche Spannung, da die Hantel auf dem Brustbein abgefedert wird, statt kontrolliert gewendet zu werden.

DER WICHTIGSTE FEHLER: Abprallen der Hantelstange auf dem Brustkorb (Bounce) anstelle einer kontrollierten Umkehrbewegung.

KORREKTUR: Lass die Stange in 2 Sekunden kontrolliert ab und pausiere für einen Wimpernschlag spürbar auf der Brust ohne Einsinken.

GEWICHT: gleich bleiben – Das Gewicht ist bewältigbar, erfordert aber striktere Kadenzkontrolle.

WAS ICH NICHT BEURTEILEN KONNTE: Der Beinantrieb (Leg Drive) war im Bildausschnitt abgeschnitten, da die Kamera zu nah am Kopfende stand.`,
    },
  },
  {
    id: "dips-shoulder",
    name: "Dips (Barrenstütz) – Vorstürzende Schultern am Umkehrpunkt",
    category: "Oberkörper",
    exercise: "Dips (Barrenstütz)",
    description: "Schultern rollen nach vorne-unten am tiefsten Punkt, Brustkorb sackt zusammen.",
    videoPlaceholderText: "5 Wiederholungen Dips mit Verlust der Schulterblattdepression.",
    sampleAnalysis: {
      exerciseName: "Dips (Barrenstütz)",
      urteil: "brauchbar",
      begruendung: "Die Tiefe ist ausreichend, jedoch kippen die Schulterköpfe im tiefsten Umkehrpunkt nach vorne (anteriore Translation). Dadurch wird die Last von Pectoralis und Trizeps auf die empfindliche Bizepssehne und AC-Gelenkkapsel übertragen.",
      derWichtigsteFehler: "Vorstürzen der Schulterköpfe und Kollaps der Schulterblattdepression am Umkehrpunkt.",
      korrektur: "Zieh die Schultern aktiv nach unten weg von den Ohren und halte die Brust stolz geöffnet, auch im tiefsten Punkt.",
      gewicht: {
        empfehlung: "runtergehen",
        begruendung: "Aufstützen mit Widerstandsband oder Reduktion von Zusatzgewicht empfohlen, bis die Schultern stabil hinten-unten bleiben.",
      },
      wasNichtBeurteilbar: "Die Beinposition (überkreuzt oder gerade) war unterhalb der Barrenholme verdeckt.",
      beobachteteKriterien: {
        bewegungsumfang: "Volle 90-Grad-Beugung im Ellenbogen erreicht.",
        gelenkstellung: "Schulterblätter lösen sich aus der Verankerung; Schultern rollen nach innen.",
        tempo: "Zügiges Ablassen, zögerlicher Ausstoß.",
        schwung: "Leichtes Mitschwingen der Knie am Umkehrpunkt.",
        symmetrie: "Gleichmäßige Belastung beider Holme.",
        konsistenz: "Fehler tritt ab Wiederholung 3 verstärkt auf.",
      },
      agentTrace: [
        {
          phaseId: "triage",
          name: "Barren- & Gelenkssichtbarkeit",
          status: "done",
          summary: "Schulter-, Ellenbogen- und Handgelenkswinkel gut im Profil sichtbar.",
        },
        {
          phaseId: "segmentation",
          name: "Tiefpunkt-Prüfung",
          status: "warning",
          summary: "Umkehrpunkt überschreitet aktive Schulterkontrolle.",
        },
        {
          phaseId: "biomechanics",
          name: "Skapula-Kinematik",
          status: "warning",
          summary: "Verlust der Depression, vordere Schulterkapsel überdehnt.",
        },
        {
          phaseId: "verdict",
          name: "Schiedsrichter-Urteil",
          status: "done",
          summary: "URTEIL: BRAUCHBAR. Korrektur vor Zusatzlast dringend erforderlich.",
        },
        {
          phaseId: "drill",
          name: "Korrektur-Drill",
          status: "done",
          summary: "Scapular Dips im Stütz zur Stärkung des Pectoralis Minor & Serratus.",
        },
      ],
      drillRecommendation: {
        title: "Skapuläre Dips im geraden Stütz",
        setsAndReps: "3 Sätze à 10–12 Wiederholungen (ohne Armbeugung)",
        executionCue: "Arme gestreckt halten. Körper nur durch Absenken und Hochdrücken der Schulterblätter bewegen.",
        purpose: "Aktiviert und kräftigt die Muskeln, die das Vorstürzen der Schulter verhindern.",
      },
      alternativeCues: {
        externalCue: "Drücke die Barrenholme nach unten in den Boden.",
        internalCue: "Schultern weit weg von den Ohrläppchen halten.",
        visualCue: "Stell dir vor, du trägst eine schwere Goldkette, die du stolz präsentierst.",
      },
      rawOutputText: `URTEIL: brauchbar

BEGRÜNDUNG: Die Tiefe ist ausreichend, jedoch kippen die Schulterköpfe im tiefsten Umkehrpunkt nach vorne (anteriore Translation). Dadurch wird die Last von Pectoralis und Trizeps auf die empfindliche Bizepssehne und AC-Gelenkkapsel übertragen.

DER WICHTIGSTE FEHLER: Vorstürzen der Schulterköpfe und Kollaps der Schulterblattdepression am Umkehrpunkt.

KORREKTUR: Zieh die Schultern aktiv nach unten weg von den Ohren und halte die Brust stolz geöffnet, auch im tiefsten Punkt.

GEWICHT: runtergehen – Aufstützen mit Widerstandsband oder Reduktion von Zusatzgewicht empfohlen, bis die Schultern stabil hinten-unten bleiben.

WAS ICH NICHT BEURTEILEN KONNTE: Die Beinposition (überkreuzt oder gerade) war unterhalb der Barrenholme verdeckt.`,
    },
  },
  {
    id: "unjudgeable-sample",
    name: "Testfall: Unvollständiges / verdecktes Video",
    category: "Testfall",
    exercise: "Unklare Übung",
    description: "Zu kurz, Person verdeckt, keine vollständige Wiederholung erkennbar.",
    videoPlaceholderText: "1,5 Sekunden Video; Person verdeckt hinter Rack-Pfosten.",
    sampleAnalysis: {
      exerciseName: "Nicht identifizierbar",
      urteil: "nicht_beurteilbar",
      begruendung: "Das Video bricht nach weniger als einer Sekunde ab und zeigt keine vollständige Wiederholung einer Übung. Zudem verdeckt die Positionierung der Hantelscheiben und des Racks die relevanten Gelenkketten fast vollständig.",
      derWichtigsteFehler: "Keine verwertbare Ausführung im Videomaterial sichtbar.",
      korrektur: "Platziere die Kamera im 45-Grad-Winkel auf Hüfthöhe und filme den gesamten Satz von der ersten bis zur letzten Wiederholung ohne Hindernisse im Bild.",
      gewicht: {
        empfehlung: "gleich bleiben",
        begruendung: "Ohne sichtbare Ausführung kann keine seriöse Belastungsanpassung erfolgen.",
      },
      wasNichtBeurteilbar: "Sämtliche Kriterien (Bewegungsumfang, Gelenke, Tempo, Umkehrpunkt), da der Bildausschnitt verdeckt ist und das Video vor dem ersten Umkehrpunkt abbricht.",
      agentTrace: [
        {
          phaseId: "triage",
          name: "Sichtfeld- & Vollständigkeits-Triage",
          status: "warning",
          summary: "Abbruchkriterium erfüllt: < 1s Videodauer, Gelenke verdeckt.",
        },
      ],
      rawOutputText: `URTEIL: nicht_beurteilbar

BEGRÜNDUNG: Das Video bricht nach weniger als einer Sekunde ab und zeigt keine vollständige Wiederholung einer Übung. Zudem verdeckt die Positionierung der Hantelscheiben und des Racks die relevanten Gelenkketten fast vollständig.

DER WICHTIGSTE FEHLER: Keine verwertbare Ausführung im Videomaterial sichtbar.

KORREKTUR: Platziere die Kamera im 45-Grad-Winkel auf Hüfthöhe und filme den gesamten Satz von der ersten bis zur letzten Wiederholung ohne Hindernisse im Bild.

GEWICHT: gleich bleiben – Ohne sichtbare Ausführung kann keine seriöse Belastungsanpassung erfolgen.

WAS ICH NICHT BEURTEILEN KONNTE: Sämtliche Kriterien (Bewegungsumfang, Gelenke, Tempo, Umkehrpunkt), da der Bildausschnitt verdeckt ist und das Video vor dem ersten Umkehrpunkt abbricht.`,
    },
  },
];
