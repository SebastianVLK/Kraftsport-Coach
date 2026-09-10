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
}

const V = 0.6; // landmark visibility below this is not trusted

type LM = { x: number; y: number; z?: number; visibility?: number };

/**
 * Angle at b between the segments b→a and b→c, in the image plane.
 *
 * Deliberately two-dimensional. Every threshold this feeds was derived from
 * implementations that measure the projected angle, and the two quantities are
 * not interchangeable: on the reference frames the 3D and 2D elbow angle differ
 * by a median of 12.9° and by up to 39.7°, which is the size of the thresholds'
 * own margins. Measuring one thing and judging it by a number derived from
 * another is worse than either choice made consistently.
 *
 * The perspective distortion that argued for world coordinates concerned the
 * body line, and that is no longer measured as an angle at all — hipOffsetFrom
 * replaced it with a signed distance, calibrated on labelled data.
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
 * Measured in image coordinates, which is what the reference data was labelled
 * in, and normalised by body length so distance from the camera drops out.
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
 * Only meaningful from the front: seen from the side both widths collapse and
 * the ratio is noise, so the shoulders must be far enough apart relative to the
 * torso for the view to count as frontal at all.
 */
function widthRatios(im: LM[]): { kneeOverFoot: number | null; footOverShoulder: number | null } {
  const need = [11, 12, 23, 24, 25, 26, 31, 32];
  if (need.some((i) => (im[i]?.visibility ?? 0) < V)) {
    return { kneeOverFoot: null, footOverShoulder: null };
  }
  const shoulder = dist(im[11], im[12]);
  const torso = dist(im[11], im[23]);
  if (!shoulder || !torso || shoulder / torso < 0.35) {
    return { kneeOverFoot: null, footOverShoulder: null };
  }
  const feet = dist(im[31], im[32]);
  const knees = dist(im[25], im[26]);
  return {
    kneeOverFoot: feet > 1e-6 ? knees / feet : null,
    footOverShoulder: feet / shoulder,
  };
}

function measureFrame(image: LM[], t: number): FrameMeasurement {
  const s = pickSide(image);
  const j =
    s === "L"
      ? { sh: 11, el: 13, wr: 15, hip: 23, kn: 25, an: 27 }
      : { sh: 12, el: 14, wr: 16, hip: 24, kn: 26, an: 28 };

  return {
    t,
    elbow: angle(image[j.sh], image[j.el], image[j.wr]),
    knee: angle(image[j.hip], image[j.kn], image[j.an]),
    hip: angle(image[j.sh], image[j.hip], image[j.kn]),
    // kept for the record; the sag rule uses hipOffset, not this
    bodyLine: angle(image[j.sh], image[j.hip], image[j.an]),
    // how far the upper arm is swung away from the torso
    armToTorso: angle(image[j.hip], image[j.sh], image[j.el]),
    hipOffset: hipOffsetFrom(image[j.sh], image[j.hip], image[j.an]),
    ...widthRatios(image),
  };
}

const round3 = (v: number) => Number(v.toFixed(3));
const min = (xs: number[]) => (xs.length ? Math.round(Math.min(...xs)) : null);
const max = (xs: number[]) => (xs.length ? Math.round(Math.max(...xs)) : null);

function summarise(rows: FrameMeasurement[], sampled: number): PoseMetrics {
  const col = (k: keyof FrameMeasurement) =>
    rows.map((r) => r[k]).filter((v): v is number => typeof v === "number");

  const hipOffsets = rows
    .map((r) => r.hipOffset)
    .filter((v): v is number => typeof v === "number");

  const bodyLines = rows.filter((r) => r.bodyLine !== null);
  const offsetRows = rows.filter((r) => r.hipOffset !== null);
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

  return {
    frames: rows.length,
    coverage: sampled ? rows.length / sampled : 0,
    elbowMin: min(col("elbow")),
    elbowMax: max(col("elbow")),
    kneeMin: min(col("knee")),
    kneeMax: max(col("knee")),
    hipMin: min(col("hip")),
    bodyLineMin: min(col("bodyLine")),
    bodyLineMax: max(col("bodyLine")),
    armToTorsoMax: max(col("armToTorso")),
    hipOffsetMax: hipOffsets.length ? round3(Math.max(...hipOffsets)) : null,
    hipOffsetMin: hipOffsets.length ? round3(Math.min(...hipOffsets)) : null,
    kneeOverFootAtDepth:
      deepest && typeof deepest.kneeOverFoot === "number"
        ? round3(deepest.kneeOverFoot)
        : null,
    footOverShoulderMedian: (() => {
      const v = rows
        .map((r) => r.footOverShoulder)
        .filter((x): x is number => typeof x === "number")
        .sort((a, b) => a - b);
      return v.length ? round3(v[Math.floor(v.length / 2)]) : null;
    })(),
    worstBodyLineAt: worst ? Number(worst.t.toFixed(1)) : null,
    deepestAt: deepest ? Number(deepest.t.toFixed(1)) : null,
  };
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
export async function measureClip(
  videoUrl: string,
  sampleCount = 14
): Promise<PoseMetrics | null> {
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
    if (!duration || !video.videoWidth) return null;

    const rows: FrameMeasurement[] = [];
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
      if (image?.length) rows.push(measureFrame(image, t));
    }

    if (rows.length < 3) return null;
    return summarise(rows, sampleCount);
  } catch (err) {
    console.warn("Pose-Messung nicht möglich:", err);
    return null;
  } finally {
    landmarker?.close();
    video.removeAttribute("src");
    video.load();
  }
}
