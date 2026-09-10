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
  worstBodyLineAt: number | null;
  deepestAt: number | null;
}

export type Severity = "kritisch" | "relevant";

export interface MeasuredFinding {
  severity: Severity;
  label: string;
  detail: string;
  atSecond: number | null;
}

const PLANK_LIKE = /liegest(ü|ue)tz|push[\s-]?up|planke|plank|dip/i;
const SQUAT_LIKE = /kniebeuge|squat|ausfallschritt|lunge/i;
const HINGE_LIKE = /kreuzheben|deadlift|rdl|rudern|row|hip thrust/i;
const PRESS_LIKE = /bankdr(ü|ue)cken|bench|schulterdr(ü|ue)cken|overhead|press/i;

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
  const hinge = HINGE_LIKE.test(exercise);
  const press = PRESS_LIKE.test(exercise);

  if (plank) {
    // Shoulder–hip–ankle: 180° is a straight body. Below ~163° the hip has
    // dropped clearly; above ~197° the athlete is piking upwards.
    if (m.bodyLineMin !== null && m.bodyLineMin < 163) {
      out.push({
        severity: "kritisch",
        label: "Hüfte hängt durch",
        detail: `Körperlinie Schulter–Hüfte–Sprunggelenk sinkt auf ${m.bodyLineMin}° (gerade wären ~180°).`,
        atSecond: m.worstBodyLineAt,
      });
    }
    if (m.bodyLineMax !== null && m.bodyLineMax > 197) {
      out.push({
        severity: "kritisch",
        label: "Hüfte knickt nach oben ab",
        detail: `Körperlinie erreicht ${m.bodyLineMax}° — der Hintern steht deutlich zu hoch.`,
        atSecond: m.worstBodyLineAt,
      });
    }
    if (m.elbowMin !== null && m.elbowMin > 110) {
      out.push({
        severity: "relevant",
        label: "Bewegungsumfang verkürzt",
        detail: `Der Ellenbogen beugt sich nur bis ${m.elbowMin}°; für volle Tiefe wären etwa 90° oder weniger nötig.`,
        atSecond: m.deepestAt,
      });
    }
    if (m.armToTorsoMax !== null && m.armToTorsoMax > 75) {
      out.push({
        severity: "kritisch",
        label: "Ellenbogen flügeln nach aussen",
        detail: `Oberarm steht bis zu ${m.armToTorsoMax}° vom Rumpf ab; sicher sind etwa 45°.`,
        atSecond: m.deepestAt,
      });
    }
  }

  if (squat) {
    if (m.kneeMin !== null && m.kneeMin > 100) {
      out.push({
        severity: "relevant",
        label: "Nicht tief genug",
        detail: `Das Knie beugt sich nur bis ${m.kneeMin}°; für Parallele oder tiefer wären etwa 90° oder weniger nötig.`,
        atSecond: m.deepestAt,
      });
    }
    if (m.hipMin !== null && m.hipMin < 35) {
      out.push({
        severity: "relevant",
        label: "Sehr starke Hüftbeugung",
        detail: `Hüftwinkel bis ${m.hipMin}° — prüfen, ob der Rücken dabei neutral bleibt.`,
        atSecond: m.deepestAt,
      });
    }
  }

  if (hinge && m.hipMin !== null && m.hipMin > 120) {
    out.push({
      severity: "relevant",
      label: "Hüfte wird kaum gebeugt",
      detail: `Hüftwinkel bleibt bei ${m.hipMin}°; beim Hüftbeugemuster wäre deutlich mehr Beugung zu erwarten.`,
      atSecond: m.deepestAt,
    });
  }

  if (press && m.elbowMin !== null && m.elbowMin > 100) {
    out.push({
      severity: "relevant",
      label: "Bewegungsumfang verkürzt",
      detail: `Der Ellenbogen beugt sich nur bis ${m.elbowMin}°.`,
      atSecond: m.deepestAt,
    });
  }

  return out;
}

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

  return `GEMESSENE GEOMETRIE (aus ${m.frames} Einzelbildern per Pose-Tracking, keine Schätzung):
- Ellenbogenwinkel: min ${n(m.elbowMin)}, max ${n(m.elbowMax)}
- Kniewinkel: min ${n(m.kneeMin)}, max ${n(m.kneeMax)}
- Hüftwinkel (Schulter–Hüfte–Knie): min ${n(m.hipMin)}
- Körperlinie (Schulter–Hüfte–Sprunggelenk): min ${n(m.bodyLineMin)}, max ${n(m.bodyLineMax)} — gerade wären ~180°
- Oberarm zum Rumpf: max ${n(m.armToTorsoMax)}
- Tiefster Punkt bei etwa ${n(m.deepestAt, "s")}

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
