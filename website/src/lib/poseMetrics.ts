import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";

/**
 * Measures the athlete's geometry from the clip before it is sent for judging.
 *
 * The coach was being asked to eyeball whether a hip sags — a question with an
 * actual number behind it. Running the pose model over the clip turns that into
 * measurements the model cannot talk itself out of.
 */

export interface FrameMeasurement {
  t: number;
  elbow: number | null;
  knee: number | null;
  hip: number | null;
  bodyLine: number | null;
  armToTorso: number | null;
  hipOffset: number | null;
  kneeOverFoot: number | null;
  footOverShoulder: number | null;
}

export type CameraView = "seitlich" | "schräg" | "frontal";

export interface PoseMetrics {
  frames: number;
  /** Share of sampled frames where a body was found at all. */
  coverage: number;
  elbowMin: number | null;
  elbowMax: number | null;
  kneeMin: number | null;
  kneeMax: number | null;
  hipMin: number | null;
  bodyLineMin: number | null;
  bodyLineMax: number | null;
  armToTorsoMax: number | null;
  /** Most the hip sagged below the shoulder–ankle line (positive = sagging). */
  hipOffsetMax: number | null;
  /** Most the hip rose above it (negative = piking). */
  hipOffsetMin: number | null;
  /** Knee spacing over foot spacing at the deepest point; under ~0.7 the knees cave in. */
  kneeOverFootAtDepth: number | null;
  /** Stance width over shoulder width; the reference range is 1.2 to 2.8. */
  footOverShoulderMedian: number | null;
  /** Second at which the body line deviated most from straight. */
  worstBodyLineAt: number | null;
  /** Second of the deepest point, by the smaller of elbow/knee flexion. */
  deepestAt: number | null;
  /** Repetitions counted from the leading joint's angle, with each bottom. */
  reps: { at: number; bottom: number }[];
  /** How much shallower the last repetition was than the first, in degrees. */
  depthDrift: number | null;
  /**
   * Degrees the camera stood away from a pure side view: 0 is exactly from the
   * side, 90 from the front or behind. Null when the pose model gave no 3D.
   */
  viewAngle: number | null;
  view: CameraView | null;
}

type LM = { x: number; y: number; z?: number; visibility?: number };

export interface PoseSample {
  t: number;
  /** Landmarks normalised to the frame: x by its width, y by its height. */
  image: LM[];
  /** The same body in metres, centred on the hips — what the view is read from. */
  world?: LM[];
}

const V = 0.6; // landmark visibility below this is not trusted

// The gates sit past the ideal by the joint's own measurement error, so noise
// alone cannot book or drop a repetition. See docs/KALIBRIERUNG.md.
const ELBOW_SLACK = 25;
const KNEE_SLACK = 15;

// Where the view classes split, from the foreshortening table in
// docs/KALIBRIERUNG.md. Up to 30° off the side a knee reads at most 7° too
// open, well inside its tolerance. Past 60° it reads 28° or more too open, and
// undoing that means stretching the picture at least twofold — amplifying the
// pose model's own noise by as much.
const SIDE_UP_TO = 30;
const OBLIQUE_UP_TO = 60;

// Knee and stance width need the hips turned at least halfway to the camera;
// short of that both widths shrink toward the noise.
const WIDTHS_FROM = 45;

// Legs bent further than this means kneeling down or getting up, not holding a
// plank. The gate drops 0.0–0.23% of the labelled plank frames in any class.
const LEGS_STRAIGHT = 140;

/**
 * Angle at b between the segments b→a and b→c, in the image plane. Callers pass
 * landmarks already in true proportions; see measureFrame.
 *
 * Deliberately two-dimensional. Every threshold this feeds was derived from
 * implementations that measure the projected angle, and the two quantities are
 * not interchangeable: on the reference frames the 3D and 2D elbow angle differ
 * by a median of 12.9° and by up to 39.7°, which is the size of the thresholds'
 * own margins. Measuring one thing and judging it by a number derived from
 * another is worse than either choice made consistently.
 *
 * The perspective distortion that argued for world coordinates is handled by
 * measureFrame instead: the view is read from the 3D pose, and the projected
 * picture is stretched back to what a side view would have shown.
 *
 * atan2 of the cross product against the dot product, rather than acos of the
 * normalised dot: mathematically identical, better behaved near 0° and 180°
 * where a straight limb sits. The practical difference is a rounding error next
 * to the pose model's own accuracy, but it costs nothing.
 */
function angle(a: LM, b: LM, c: LM): number | null {
  if ((a.visibility ?? 1) < V || (b.visibility ?? 1) < V || (c.visibility ?? 1) < V) {
    return null;
  }
  const v1x = a.x - b.x;
  const v1y = a.y - b.y;
  const v2x = c.x - b.x;
  const v2y = c.y - b.y;
  if ((!v1x && !v1y) || (!v2x && !v2y)) return null;
  const cross = v1x * v2y - v1y * v2x;
  const dot = v1x * v2x + v1y * v2y;
  return (Math.atan2(Math.abs(cross), dot) * 180) / Math.PI;
}

/**
 * How far the camera stood from a pure side view, in degrees: 0 exactly from
 * the side, 90 exactly from the front or behind.
 *
 * Read off the body's left–right axis in the pose model's 3D output. Filmed
 * from the side, that axis points straight at the camera; from the front it
 * lies across the picture. This is how arXiv:1609.05522 labelled its viewpoint
 * classes — the yaw between the two shoulders — and the rule-based baseline
 * that 3DPCNet (arXiv:2509.23455) measures itself against. Shoulders and hips
 * are averaged so one misplaced joint cannot swing it, and only the horizontal
 * part counts: a camera held high tilts the axis downward without making the
 * view any less a side view.
 */
function viewFrom(world: LM[] | undefined): number | null {
  if (!world || world.length < 25) return null;
  const axis = (l: LM, r: LM) => {
    const v = [r.x - l.x, r.y - l.y, (r.z ?? 0) - (l.z ?? 0)];
    const len = Math.hypot(v[0], v[1], v[2]);
    return len > 1e-6 ? v.map((c) => c / len) : null;
  };
  const shoulders = axis(world[11], world[12]);
  const hips = axis(world[23], world[24]);
  if (!shoulders || !hips) return null;
  const across = shoulders[0] + hips[0];
  const towards = shoulders[2] + hips[2];
  if (!across && !towards) return null;
  return (Math.atan2(Math.abs(across), Math.abs(towards)) * 180) / Math.PI;
}

/** Use whichever side the camera actually sees — filming is rarely symmetric. */
function pickSide(lm: LM[]): "L" | "R" {
  const idx = { L: [11, 13, 23, 25, 27], R: [12, 14, 24, 26, 28] };
  const score = (ids: number[]) =>
    ids.reduce((n, i) => n + (lm[i]?.visibility ?? 0), 0);
  return score(idx.L) >= score(idx.R) ? "L" : "R";
}

/**
 * Signed distance of the hip from the shoulder–ankle line, as a fraction of
 * that line's length. Positive means the hip hangs below it, negative means it
 * rides above.
 *
 * This replaces the shoulder–hip–ankle angle for judging a plank line. Checked
 * against 28,500 labelled frames, the angle separated correct from sagging at
 * 75% with a third of correct reps wrongly flagged; this separates them at
 * 99%. The angle also cannot tell the two errors apart — a raised hip closes
 * it just like a dropped one — while the sign here says which way it went.
 *
 * Measured in true proportions and normalised by body length, so distance from
 * the camera drops out. The thresholds were re-derived in the same proportions.
 */
function hipOffsetFrom(sh: LM, hip: LM, ankle: LM): number | null {
  if ((sh.visibility ?? 1) < V || (hip.visibility ?? 1) < V || (ankle.visibility ?? 1) < V) {
    return null;
  }
  const ax = ankle.x - sh.x;
  const ay = ankle.y - sh.y;
  const len = Math.hypot(ax, ay);
  if (len < 1e-6) return null;
  const hx = hip.x - sh.x;
  const hy = hip.y - sh.y;
  const cross = (ax * hy - ay * hx) / len;
  // facing left or right must not flip the sign
  return (cross / len) * (ax >= 0 ? 1 : -1);
}

const dist = (a: LM, b: LM) => Math.hypot(a.x - b.x, a.y - b.y);

/**
 * Knee and stance spacing, for judging knees caving in.
 *
 * Only meaningful with the hips turned towards the camera. Turning away shrinks
 * both widths by the same factor, so the ratios themselves hold — until the
 * widths are small enough to be noise. Without a 3D view, the shoulders must be
 * far enough apart relative to the torso instead.
 */
function widthRatios(
  im: LM[],
  psi: number | null
): { kneeOverFoot: number | null; footOverShoulder: number | null } {
  const none = { kneeOverFoot: null, footOverShoulder: null };
  const need = [11, 12, 23, 24, 25, 26, 31, 32];
  if (need.some((i) => (im[i]?.visibility ?? 0) < V)) return none;
  const shoulder = dist(im[11], im[12]);
  const torso = dist(im[11], im[23]);
  if (!shoulder || !torso) return none;
  if (psi !== null ? psi < WIDTHS_FROM : shoulder / torso < 0.35) return none;
  const feet = dist(im[31], im[32]);
  const knees = dist(im[25], im[26]);
  return {
    kneeOverFoot: feet > 1e-6 ? knees / feet : null,
    footOverShoulder: feet / shoulder,
  };
}

function measureFrame(image: LM[], t: number, aspect: number, psi: number | null): FrameMeasurement {
  const s = pickSide(image);
  const j =
    s === "L"
      ? { sh: 11, el: 13, wr: 15, hip: 23, kn: 25, an: 27 }
      : { sh: 12, el: 14, wr: 16, hip: 24, kn: 26, an: 28 };

  // The pose model divides x by the frame's width and y by its height, so a
  // landscape clip squeezes every horizontal distance against the vertical
  // ones. Back to true proportions first: on the reference push-up clips that
  // alone moved the elbow at the bottom from 85° to 68°.
  const flat = image.map((l) => ({ ...l, x: l.x * aspect }));

  // Seen at an angle, everything moving forward and back in the body's own
  // plane is foreshortened along the picture's horizontal by cos(view), while
  // up and down stays whole. Stretching it back recovers the angles a side view
  // would have shown. Past OBLIQUE_UP_TO that stretch amplifies noise more than
  // it corrects, so nothing in that plane is measured at all.
  const stretch = psi === null ? 1 : 1 / Math.cos((psi * Math.PI) / 180);
  const p = psi !== null && psi > OBLIQUE_UP_TO ? null : flat.map((l) => ({ ...l, x: l.x * stretch }));

  return {
    t,
    elbow: p ? angle(p[j.sh], p[j.el], p[j.wr]) : null,
    knee: p ? angle(p[j.hip], p[j.kn], p[j.an]) : null,
    hip: p ? angle(p[j.sh], p[j.hip], p[j.kn]) : null,
    // kept for the record; the sag rule uses hipOffset, not this
    bodyLine: p ? angle(p[j.sh], p[j.hip], p[j.an]) : null,
    // how far the upper arm is swung away from the torso
    armToTorso: p ? angle(p[j.hip], p[j.sh], p[j.el]) : null,
    hipOffset: p ? hipOffsetFrom(p[j.sh], p[j.hip], p[j.an]) : null,
    ...widthRatios(flat, psi),
  };
}

const round3 = (v: number) => Number(v.toFixed(3));
const min = (xs: number[]) => (xs.length ? Math.round(Math.min(...xs)) : null);
const max = (xs: number[]) => (xs.length ? Math.round(Math.max(...xs)) : null);

function summarise(rows: FrameMeasurement[], sampled: number, psi: number | null): PoseMetrics {
  const col = (k: keyof FrameMeasurement, from = rows) =>
    from.map((r) => r[k]).filter((v): v is number => typeof v === "number");

  // A plank is only a plank with the legs straight. The kneeling down and
  // getting up that a clip nearly always ends with once turned a clean set into
  // a hip "far too high" and elbows "flared out", both critical.
  const held = rows.filter((r) => r.knee !== null && r.knee >= LEGS_STRAIGHT);
  const hipOffsets = col("hipOffset", held);

  const bodyLines = held.filter((r) => r.bodyLine !== null);
  const offsetRows = held.filter((r) => r.hipOffset !== null);
  const worst = offsetRows.length
    ? offsetRows.reduce((a, b) =>
        Math.abs(a.hipOffset as number) >= Math.abs(b.hipOffset as number) ? a : b
      )
    : bodyLines[0] ?? null;

  const flexed = rows.filter((r) => r.elbow !== null || r.knee !== null);
  const deepest = flexed.length
    ? flexed.reduce((a, b) => {
        const va = Math.min(a.elbow ?? 999, a.knee ?? 999);
        const vb = Math.min(b.elbow ?? 999, b.knee ?? 999);
        return va <= vb ? a : b;
      })
    : null;

  // Whichever joint actually moves is the one that marks out the repetitions
  const span = (k: "elbow" | "knee") => {
    const v = col(k);
    return v.length ? Math.max(...v) - Math.min(...v) : 0;
  };
  const lead = span("elbow") >= span("knee") ? "elbow" : "knee";
  const { reps, depthDrift } = countReps(rows, lead);

  return {
    frames: rows.length,
    coverage: sampled ? rows.length / sampled : 0,
    reps,
    depthDrift,
    elbowMin: min(col("elbow")),
    elbowMax: max(col("elbow")),
    kneeMin: min(col("knee")),
    kneeMax: max(col("knee")),
    hipMin: min(col("hip")),
    bodyLineMin: min(col("bodyLine", held)),
    bodyLineMax: max(col("bodyLine", held)),
    armToTorsoMax: max(col("armToTorso", held)),
    hipOffsetMax: hipOffsets.length ? round3(Math.max(...hipOffsets)) : null,
    hipOffsetMin: hipOffsets.length ? round3(Math.min(...hipOffsets)) : null,
    kneeOverFootAtDepth:
      deepest && typeof deepest.kneeOverFoot === "number"
        ? round3(deepest.kneeOverFoot)
        : null,
    footOverShoulderMedian: (() => {
      const v = col("footOverShoulder").sort((a, b) => a - b);
      return v.length ? round3(v[Math.floor(v.length / 2)]) : null;
    })(),
    worstBodyLineAt: worst ? Number(worst.t.toFixed(1)) : null,
    deepestAt: deepest ? Number(deepest.t.toFixed(1)) : null,
    viewAngle: psi === null ? null : Math.round(psi),
    view:
      psi === null
        ? null
        : psi <= SIDE_UP_TO
        ? "seitlich"
        : psi <= OBLIQUE_UP_TO
        ? "schräg"
        : "frontal",
  };
}

/**
 * Counts repetitions from the leading joint's angle with a two-state machine.
 *
 * The verdict view has always described findings "repetition by repetition",
 * but nothing counted them — the model was inventing both the number and what
 * happened in each. Segmenting the movement first is the standard opening step
 * in the rehabilitation literature (arXiv:2304.09735), and the gate values are
 * the ones an independent counter uses: below 90° is the bottom, above 145° is
 * the top. Requiring both before a repetition is booked rejects the half rep
 * that never came back up.
 */
function countReps(
  rows: FrameMeasurement[],
  joint: "elbow" | "knee"
): { reps: { at: number; bottom: number }[]; depthDrift: number | null } {
  const DOWN = 90 + (joint === "elbow" ? ELBOW_SLACK : KNEE_SLACK);
  const UP = 145;

  const reps: { at: number; bottom: number }[] = [];
  let state: "up" | "down" = "up";
  let bottom = 999;
  let bottomAt = 0;

  for (const r of rows) {
    const a = r[joint];
    if (a === null) continue;
    if (state === "up" && a < DOWN) {
      state = "down";
      bottom = a;
      bottomAt = r.t;
    } else if (state === "down") {
      if (a < bottom) {
        bottom = a;
        bottomAt = r.t;
      }
      if (a > UP) {
        reps.push({ at: Number(bottomAt.toFixed(1)), bottom: Math.round(bottom) });
        state = "up";
        bottom = 999;
      }
    }
  }

  const drift =
    reps.length >= 2 ? Math.round(reps[reps.length - 1].bottom - reps[0].bottom) : null;
  return { reps, depthDrift: drift };
}

/**
 * The geometry of a clip's sampled poses, apart from any video handling so it
 * can be checked against recorded landmarks.
 *
 * The view is taken as the median over the clip: the camera does not move, and
 * a single frame's reading swings by a few degrees.
 */
export function measureFrames(
  samples: PoseSample[],
  aspect: number,
  sampled = samples.length
): PoseMetrics | null {
  if (samples.length < 3) return null;
  const views = samples
    .map((s) => viewFrom(s.world))
    .filter((v): v is number => v !== null)
    .sort((a, b) => a - b);
  const psi = views.length ? views[Math.floor(views.length / 2)] : null;
  const rows = samples.map((s) => measureFrame(s.image, s.t, aspect, psi));
  return summarise(rows, sampled, psi);
}

const seekTo = (video: HTMLVideoElement, t: number) =>
  new Promise<void>((resolve) => {
    const done = () => {
      video.removeEventListener("seeked", done);
      resolve();
    };
    video.addEventListener("seeked", done);
    video.currentTime = t;
    // A clip that refuses to seek must not hang the analysis
    setTimeout(done, 1500);
  });

/**
 * Samples the clip offscreen and returns the geometry, or null when the pose
 * runtime is unavailable or nothing recognisable was found.
 */
export async function measureClip(videoUrl: string): Promise<PoseMetrics | null> {
  let landmarker: PoseLandmarker | null = null;
  const video = document.createElement("video");

  try {
    const fileset = await FilesetResolver.forVisionTasks("/mediapipe/wasm");
    landmarker = await PoseLandmarker.createFromOptions(fileset, {
      baseOptions: {
        modelAssetPath: "/models/pose_landmarker_lite.task",
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      numPoses: 1,
    });

    video.src = videoUrl;
    video.muted = true;
    video.playsInline = true;

    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("Video nicht lesbar"));
      setTimeout(() => reject(new Error("Zeitüberschreitung")), 8000);
    });

    const duration = video.duration || 0;
    if (!duration || !video.videoWidth || !video.videoHeight) return null;

    // A repetition lasts about a second, so samples must fall well inside that
    // to catch every top and bottom. On a push-up set traced at 10 frames a
    // second, the former 26 samples over 17 seconds found 6 or 7 of its 10
    // repetitions; from 3.3 a second on, all 10 at every phase offset. Four a
    // second leaves a margin, capped so a long clip cannot stall the upload.
    const sampleCount = Math.min(120, Math.max(26, Math.round(duration * 4)));
    const samples: PoseSample[] = [];
    let stamp = 0;

    for (let i = 0; i < sampleCount; i++) {
      const t = duration * (0.04 + (i * 0.92) / (sampleCount - 1));
      await seekTo(video, t);
      stamp += 40; // must increase monotonically for VIDEO mode
      let result;
      try {
        result = landmarker.detectForVideo(video, stamp);
      } catch {
        continue;
      }
      const image = result.landmarks?.[0] as LM[] | undefined;
      const world = result.worldLandmarks?.[0] as LM[] | undefined;
      if (image?.length) samples.push({ t, image, world });
    }

    return measureFrames(samples, video.videoWidth / video.videoHeight, sampleCount);
  } catch (err) {
    console.warn("Pose-Messung nicht möglich:", err);
    return null;
  } finally {
    landmarker?.close();
    video.removeAttribute("src");
    video.load();
  }
}
