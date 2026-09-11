/**
 * Turns measured joint geometry into findings the model is not allowed to
 * soften, and into a floor for the verdict.
 *
 * The model kept calling a visibly sagging hip "gut" because grading a finding
 * was left to it. An angle is not a matter of opinion, so anything measurable
 * is decided here and handed over as fact.
 */

export interface PoseMetrics {
  frames: number;
  coverage: number;
  elbowMin: number | null;
  elbowMax: number | null;
  kneeMin: number | null;
  kneeMax: number | null;
  hipMin: number | null;
  bodyLineMin: number | null;
  bodyLineMax: number | null;
  armToTorsoMax: number | null;
  hipOffsetMax: number | null;
  hipOffsetMin: number | null;
  kneeOverFootAtDepth: number | null;
  footOverShoulderMedian: number | null;
  worstBodyLineAt: number | null;
  deepestAt: number | null;
  reps: { at: number; bottom: number }[];
  depthDrift: number | null;
  /** Degrees away from a pure side view: 0 from the side, 90 from the front. */
  viewAngle?: number | null;
  view?: CameraView | null;
}

type CameraView = "seitlich" | "schräg" | "frontal";

export type Severity = "kritisch" | "relevant";

export interface MeasuredFinding {
  severity: Severity;
  label: string;
  detail: string;
  atSecond: number | null;
}

/**
 * Measurement tolerance, from a comparison of 3D pose estimation against
 * inertial motion capture (arXiv:2306.06117). Knee, ankle and back flexion
 * deviate by 1–7° on average with maxima around 20°, while elbow flexion is the
 * least dependable joint of all, with maximum deviations up to 50°.
 *
 * Thresholds therefore sit far enough past the ideal that the tolerance cannot
 * produce a finding on its own. An elbow rule in particular may only fire when
 * the range is missed by more than the instrument can plausibly be wrong by.
 */
const ELBOW_TOLERANCE = 40;
const KNEE_TOLERANCE = 20;

const PLANK_LIKE = /liegest(ü|ue)tz|push[\s-]?up|planke|plank|dip/i;
const SQUAT_LIKE = /kniebeuge|squat/i;
const LUNGE_LIKE = /ausfallschritt|lunge|split[\s-]?squat/i;
const HINGE_LIKE = /kreuzheben|deadlift|rdl|rudern|row|hip thrust/i;
const PRESS_LIKE = /bankdr(ü|ue)cken|bench|schulterdr(ü|ue)cken|overhead|press/i;
const PULL_LIKE = /klimmzug|klimmz(ü|ue)ge|pull[\s-]?up|chin[\s-]?up|latzug/i;

export function findingsFromMetrics(
  m: PoseMetrics | null | undefined,
  exercise: string
): MeasuredFinding[] {
  // Too few usable frames means the camera angle did not allow a measurement.
  // Saying nothing is correct here; inventing a finding would not be.
  if (!m || m.coverage < 0.5 || m.frames < 4) return [];

  const out: MeasuredFinding[] = [];
  const plank = PLANK_LIKE.test(exercise);
  const squat = SQUAT_LIKE.test(exercise);
  const lunge = LUNGE_LIKE.test(exercise);
  const hinge = HINGE_LIKE.test(exercise);
  const press = PRESS_LIKE.test(exercise);
  const pull = PULL_LIKE.test(exercise);

  if (plank) {
    // Thresholds read off 28,500 labelled plank frames (correct / hip low /
    // hip high) from the Exercise-Correction dataset, in true proportions. The
    // dataset stores each axis normalised to landscape footage — its body
    // proportions put the frame at about 1.64:1 — so the earlier +0.05 held for
    // landscape clips only, and a portrait clip needed three times the sag to
    // trip it. The values here hold whether that footage was 4:3 or 16:9: the
    // sag rule catches 98–99% of sagging frames at 0.16–0.25% false alarms,
    // the pike rule 96–100% at no more than 0.13%.
    const pct = (v: number) => `${Math.round(v * 100)}% der Körperlänge`;

    if (m.hipOffsetMax !== null && m.hipOffsetMax > 0.035) {
      out.push({
        severity: "kritisch",
        label: "Hüfte hängt durch",
        detail: `Das Becken sinkt ${pct(m.hipOffsetMax)} unter die Linie Schulter–Sprunggelenk.`,
        atSecond: m.worstBodyLineAt,
      });
    }
    if (m.hipOffsetMin !== null && m.hipOffsetMin < -0.2) {
      out.push({
        severity: "kritisch",
        label: "Hüfte steht zu hoch",
        detail: `Das Becken steht ${pct(Math.abs(m.hipOffsetMin))} über der Linie Schulter–Sprunggelenk.`,
        atSecond: m.worstBodyLineAt,
      });
    }
    // 90° is the target; only past 90 + tolerance is the shortfall larger than
    // the measurement can account for
    if (m.elbowMin !== null && m.elbowMin > 90 + ELBOW_TOLERANCE) {
      out.push({
        severity: "relevant",
        label: "Bewegungsumfang verkürzt",
        detail: `Der Ellenbogen beugt sich nur bis ${m.elbowMin}°; für volle Tiefe wären etwa 90° oder weniger nötig.`,
        atSecond: m.deepestAt,
      });
    }
    if (m.armToTorsoMax !== null && m.armToTorsoMax > 85) {
      out.push({
        severity: "kritisch",
        label: "Ellenbogen flügeln nach aussen",
        detail: `Oberarm steht bis zu ${m.armToTorsoMax}° vom Rumpf ab; sicher sind etwa 45°.`,
        atSecond: m.deepestAt,
      });
    }
  }

  if (squat) {
    // Knee spacing over stance width at the bottom. The reference
    // implementation treats 0.7 to 1.1 as sound at depth; below that the knees
    // are travelling inwards, which the dataset's own bottom frames agree with
    // (median 0.80, 5th percentile 0.70).
    if (m.kneeOverFootAtDepth !== null && m.kneeOverFootAtDepth < 0.7) {
      out.push({
        severity: "kritisch",
        label: "Knie kippen nach innen",
        detail: `Im tiefsten Punkt stehen die Knie nur ${Math.round(
          m.kneeOverFootAtDepth * 100
        )}% so weit auseinander wie die Füsse; ab etwa 70% aufwärts spuren sie sauber.`,
        atSecond: m.deepestAt,
      });
    }
    if (m.footOverShoulderMedian !== null && m.footOverShoulderMedian < 1.2) {
      out.push({
        severity: "relevant",
        label: "Stand zu eng",
        detail: `Die Füsse stehen nur ${m.footOverShoulderMedian}-mal schulterbreit; üblich sind 1.2 bis 2.8.`,
        atSecond: m.deepestAt,
      });
    }
    if (m.footOverShoulderMedian !== null && m.footOverShoulderMedian > 2.8) {
      out.push({
        severity: "relevant",
        label: "Stand zu breit",
        detail: `Die Füsse stehen ${m.footOverShoulderMedian}-mal schulterbreit; üblich sind 1.2 bis 2.8.`,
        atSecond: m.deepestAt,
      });
    }
    if (m.kneeMin !== null && m.kneeMin > 90 + KNEE_TOLERANCE) {
      out.push({
        severity: "relevant",
        label: "Nicht tief genug",
        detail: `Das Knie beugt sich nur bis ${m.kneeMin}°; für Parallele oder tiefer wären etwa 90° oder weniger nötig.`,
        atSecond: m.deepestAt,
      });
    }
    if (m.hipMin !== null && m.hipMin < 25) {
      out.push({
        severity: "relevant",
        label: "Sehr starke Hüftbeugung",
        detail: `Hüftwinkel bis ${m.hipMin}° — prüfen, ob der Rücken dabei neutral bleibt.`,
        atSecond: m.deepestAt,
      });
    }
  }

  if (hinge && m.hipMin !== null && m.hipMin > 140) {
    out.push({
      severity: "relevant",
      label: "Hüfte wird kaum gebeugt",
      detail: `Hüftwinkel bleibt bei ${m.hipMin}°; beim Hüftbeugemuster wäre deutlich mehr Beugung zu erwarten.`,
      atSecond: m.deepestAt,
    });
  }

  // The same reference implementation gates a lunge's front knee at 60° to
  // 125°. Past that upper bound plus the knee's own tolerance the athlete never
  // really descended.
  if (lunge && m.kneeMin !== null && m.kneeMin > 125 + KNEE_TOLERANCE) {
    out.push({
      severity: "relevant",
      label: "Ausfallschritt zu flach",
      detail: `Das vordere Knie beugt sich nur bis ${m.kneeMin}°; im tiefsten Punkt wären etwa 90° zu erwarten.`,
      atSecond: m.deepestAt,
    });
  }

  // A pull-up starts from a straight arm; reference implementations gate the
  // bottom position at 160°. With the elbow's tolerance subtracted, anything
  // under 130° is a hang that never straightened.
  if (pull && m.elbowMax !== null && m.elbowMax < 130) {
    out.push({
      severity: "relevant",
      label: "Arme werden unten nicht gestreckt",
      detail: `Der Ellenbogen öffnet sich nur bis ${m.elbowMax}°; eine volle Wiederholung beginnt nahezu gestreckt bei etwa 160° oder mehr.`,
      atSecond: null,
    });
  }

  if (press && m.elbowMin !== null && m.elbowMin > 90 + ELBOW_TOLERANCE) {
    out.push({
      severity: "relevant",
      label: "Bewegungsumfang verkürzt",
      detail: `Der Ellenbogen beugt sich nur bis ${m.elbowMin}°.`,
      atSecond: m.deepestAt,
    });
  }

  // Depth falling away across the set is what the grading rules call a relevant
  // finding that worsens over the repetitions. Fifteen degrees clears the
  // measurement noise of either joint.
  if (m.reps.length >= 2 && m.depthDrift !== null && m.depthDrift > 15) {
    const last = m.reps[m.reps.length - 1];
    out.push({
      severity: "relevant",
      label: "Tiefe nimmt über den Satz ab",
      detail: `Die letzte Wiederholung bleibt ${m.depthDrift}° flacher als die erste (${m.reps[0].bottom}° gegenüber ${last.bottom}°).`,
      atSecond: last.at,
    });
  }

  return out;
}

/**
 * Three worked examples, appended to the prompt ahead of the real measurement.
 *
 * From "Rehabilitation Exercise Quality Assessment and Feedback Generation
 * Using Large Language Models with Prompt Engineering" (arXiv:2505.18412),
 * which measured this exact trade-off on two labelled rehabilitation datasets:
 * accuracy climbed from 0.57 at zero examples to 0.68 at three, with F1 going
 * 0.64 to 0.76, then collapsed to 0.42 at four. Three is the peak, and more is
 * actively worse — hence exactly three, never a fourth.
 *
 * The numbers are the class medians from the 28,500 labelled plank frames, in
 * true proportions, and the squat reference, so the examples describe real
 * executions rather than invented ones.
 */
export function fewShotBlock(): string {
  return `BEISPIELE — SO WIRD AUS MESSWERTEN EIN URTEIL:

Beispiel 1
  Beckenlage: -5% tiefster Ausschlag | Ellenbogen min 88° | Oberarm/Rumpf max 48°
  Abgeleitete Befunde: keine
  Urteil: gut
  Begründung: Kein kritischer und kein relevanter Befund — die Linie steht, die
  Tiefe stimmt. Der Cue zielt auf Halten, nicht auf eine erfundene Korrektur.

Beispiel 2
  Beckenlage: +9% tiefster Ausschlag | Ellenbogen min 92° | Oberarm/Rumpf max 51°
  Abgeleitete Befunde: [KRITISCH] Hüfte hängt durch
  Urteil: mangelhaft
  Begründung: Ein kritischer Befund genügt. Die Tiefe war in Ordnung, das ändert
  nichts — Sicherheit geht vor Bewegungsumfang.

Beispiel 3
  Beckenlage: -4% tiefster Ausschlag | Ellenbogen min 138° | Oberarm/Rumpf max 55°
  Abgeleitete Befunde: [RELEVANT] Bewegungsumfang verkürzt
  Urteil: brauchbar
  Begründung: Kein kritischer Befund, aber die Tiefe fehlt deutlich. Ein einzelner
  relevanter Befund liesse "gut" grundsätzlich zu; hier ist der Bewegungsumfang
  aber das Trainingsziel selbst, deshalb "brauchbar".

Beurteile die folgende Aufnahme nach demselben Muster.`;
}

/**
 * What each camera view lets the measurement say, so the model knows which
 * questions are left to its own eyes.
 */
const VIEW_NOTE: Record<CameraView, string> = {
  seitlich: "Tiefe, Gelenkwinkel und Körperlinie sind direkt messbar.",
  schräg:
    "Gelenkwinkel und Körperlinie sind auf die Seitenansicht zurückgerechnet und damit etwas unsicherer als direkt von der Seite.",
  frontal: `Tiefe, Gelenkwinkel und Körperlinie lassen sich von vorn nicht messen. Beurteile sie nur am Bildmaterial und nenne die Einschränkung in "wasNichtBeurteilbar".`,
};

/** Human-readable block for the prompt. */
export function metricsBlock(
  m: PoseMetrics | null | undefined,
  findings: MeasuredFinding[]
): string {
  if (!m || m.coverage < 0.5) {
    return `GEMESSENE GEOMETRIE: keine verwertbare Messung (Kamerawinkel oder Verdeckung).
Urteile allein nach dem Bildmaterial und sage im Feld "wasNichtBeurteilbar", dass keine Winkelmessung möglich war.`;
  }

  const n = (v: number | null, unit = "°") => (v === null ? "nicht messbar" : `${v}${unit}`);
  const frontal = m.view === "frontal";

  return `GEMESSENE GEOMETRIE (aus ${m.frames} Einzelbildern per Pose-Tracking, keine Schätzung):
- Kameraperspektive: ${
    m.view
      ? `${m.view}, etwa ${m.viewAngle}° von der reinen Seitenansicht entfernt. ${VIEW_NOTE[m.view]}`
      : "nicht bestimmbar"
  }
- Ellenbogenwinkel: min ${n(m.elbowMin)}, max ${n(m.elbowMax)} (unsicherste Messung, bis zu 40° Abweichung möglich — daraus keine knappen Schlüsse ziehen)
- Kniewinkel: min ${n(m.kneeMin)}, max ${n(m.kneeMax)}
- Hüftwinkel (Schulter–Hüfte–Knie): min ${n(m.hipMin)}
- Körperlinie (Schulter–Hüfte–Sprunggelenk): min ${n(m.bodyLineMin)}, max ${n(m.bodyLineMax)}
- Beckenlage zur Linie Schulter–Sprunggelenk: ${
    m.hipOffsetMax === null
      ? "nicht messbar"
      : `${(m.hipOffsetMax * 100).toFixed(0)}% tiefster, ${((m.hipOffsetMin ?? 0) * 100).toFixed(0)}% höchster Ausschlag (0% = exakt auf der Linie, positiv = durchhängend; nur Bilder mit gestreckten Beinen)`
  }
- Oberarm zum Rumpf: max ${n(m.armToTorsoMax)}
- Knieabstand zu Fussabstand im tiefsten Punkt: ${
    m.kneeOverFootAtDepth === null
      ? "nicht messbar (dafür muss die Kamera mindestens halb von vorn filmen)"
      : m.kneeOverFootAtDepth
  }
- Standbreite zu Schulterbreite: ${
    m.footOverShoulderMedian === null ? "nicht messbar" : m.footOverShoulderMedian
  }
- Tiefster Punkt bei etwa ${n(m.deepestAt, "s")}
- Gezählte Wiederholungen: ${
    frontal
      ? "aus der Frontalansicht nicht zählbar"
      : m.reps.length === 0
      ? "keine vollständige erkannt"
      : m.reps
          .map((r, i) => `Wdh. ${i + 1} bei ${r.at}s, tiefster Winkel ${r.bottom}°`)
          .join("; ")
  }
${
  frontal
    ? `Beschreibe in "repetitionDetails" nur, was im Bildmaterial eindeutig zu sehen
ist, und nenne dort keine Winkel.`
    : `Diese Wiederholungen sind gezählt, nicht geschätzt. Beziehe dich in
"repetitionDetails" ausschliesslich auf sie und erfinde keine weiteren.`
}

${
  findings.length
    ? `DARAUS ABGELEITETE BEFUNDE — DIESE SIND VERBINDLICH UND DÜRFEN NICHT ABGESCHWÄCHT WERDEN:
${findings
  .map((f) => `- [${f.severity.toUpperCase()}] ${f.label}: ${f.detail}`)
  .join("\n")}

Übernimm diese Befunde in deine Beurteilung. Mindestens einer davon gehört in
"derWichtigsteFehler", und jeder gehört mit seiner Sekunde in "fehlerZeitpunkte".`
    : `Aus den Messwerten ergibt sich kein Grenzwertverstoss. Das schliesst Befunde
nicht aus, die man nur sehen und nicht messen kann (Rückenrundung, Nachfedern,
Schulterposition) — prüfe diese weiterhin am Bildmaterial.`
}`;
}

/**
 * A measured critical finding outranks the model's verdict. Without this the
 * grading rules are only a suggestion.
 */
export function enforceVerdict(
  parsed: any,
  findings: MeasuredFinding[]
): { changed: boolean; from?: string } {
  const worst = findings.some((f) => f.severity === "kritisch")
    ? "kritisch"
    : findings.some((f) => f.severity === "relevant")
    ? "relevant"
    : null;
  if (!worst || parsed?.urteil === "nicht_beurteilbar") return { changed: false };

  const floor = worst === "kritisch" ? "mangelhaft" : "brauchbar";
  const rank: Record<string, number> = { gut: 0, brauchbar: 1, mangelhaft: 2 };
  const current = rank[parsed?.urteil] ?? 0;

  if (current >= rank[floor]) return { changed: false };

  const from = parsed.urteil;
  parsed.urteil = floor;
  const measured = findings.map((f) => `${f.label} (${f.detail})`).join(" ");
  parsed.begruendung = `${parsed.begruendung ?? ""} Messung: ${measured}`.trim();
  return { changed: true, from };
}
