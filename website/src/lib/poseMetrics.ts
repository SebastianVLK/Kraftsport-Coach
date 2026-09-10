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
  /** Second at which the body line deviated most from straight. */
  worstBodyLineAt: number | null;
  /** Second of the deepest point, by the smaller of elbow/knee flexion. */
  deepestAt: number | null;
}

const V = 0.6; // landmark visibility below this is not trusted

type LM = { x: number; y: number; visibility?: number };

function angle(a: LM, b: LM, c: LM): number | null {
  if ((a.visibility ?? 1) < V || (b.visibility ?? 1) < V || (c.visibility ?? 1) < V) {
    return null;
  }
  const v1 = { x: a.x - b.x, y: a.y - b.y };
  const v2 = { x: c.x - b.x, y: c.y - b.y };
  const m1 = Math.hypot(v1.x, v1.y);
  const m2 = Math.hypot(v2.x, v2.y);
  if (!m1 || !m2) return null;
  const cos = (v1.x * v2.x + v1.y * v2.y) / (m1 * m2);
  return (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
}

/** Use whichever side the camera actually sees — filming is rarely symmetric. */
function pickSide(lm: LM[]): "L" | "R" {
  const idx = { L: [11, 13, 23, 25, 27], R: [12, 14, 24, 26, 28] };
  const score = (ids: number[]) =>
    ids.reduce((n, i) => n + (lm[i]?.visibility ?? 0), 0);
  return score(idx.L) >= score(idx.R) ? "L" : "R";
}

function measureFrame(lm: LM[], t: number): FrameMeasurement {
  const s = pickSide(lm);
  const j =
    s === "L"
      ? { sh: 11, el: 13, wr: 15, hip: 23, kn: 25, an: 27 }
      : { sh: 12, el: 14, wr: 16, hip: 24, kn: 26, an: 28 };

  return {
    t,
    elbow: angle(lm[j.sh], lm[j.el], lm[j.wr]),
    knee: angle(lm[j.hip], lm[j.kn], lm[j.an]),
    hip: angle(lm[j.sh], lm[j.hip], lm[j.kn]),
    // 180° is a straight line from shoulder through hip to ankle
    bodyLine: angle(lm[j.sh], lm[j.hip], lm[j.an]),
    // how far the upper arm is swung away from the torso
    armToTorso: angle(lm[j.hip], lm[j.sh], lm[j.el]),
  };
}

const min = (xs: number[]) => (xs.length ? Math.round(Math.min(...xs)) : null);
const max = (xs: number[]) => (xs.length ? Math.round(Math.max(...xs)) : null);

function summarise(rows: FrameMeasurement[], sampled: number): PoseMetrics {
  const col = (k: keyof FrameMeasurement) =>
    rows.map((r) => r[k]).filter((v): v is number => typeof v === "number");

  const bodyLines = rows.filter((r) => r.bodyLine !== null);
  const worst = bodyLines.length
    ? bodyLines.reduce((a, b) =>
        Math.abs(180 - (a.bodyLine as number)) >= Math.abs(180 - (b.bodyLine as number)) ? a : b
      )
    : null;

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
      const lm = result.landmarks?.[0] as LM[] | undefined;
      if (lm?.length) rows.push(measureFrame(lm, t));
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
