import React, { useEffect, useRef, useState } from "react";
import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";

/** BlazePose indices we care about by name, so the mapping below reads. */
const J = {
  nose: 0,
  shoulderL: 11,
  shoulderR: 12,
  elbowL: 13,
  elbowR: 14,
  wristL: 15,
  wristR: 16,
  hipL: 23,
  hipR: 24,
  kneeL: 25,
  kneeR: 26,
  ankleL: 27,
  ankleR: 28,
} as const;

/**
 * Which joints a finding is about. The coach writes prose, so the link is made
 * on the words it actually uses; anything unmatched highlights nothing rather
 * than guessing at a joint.
 */
const FAULT_JOINTS: { test: RegExp; joints: number[] }[] = [
  { test: /h(ü|ue)fte|becken|lordose|hohlkreuz|durchh(ä|ae)ng/i, joints: [J.hipL, J.hipR] },
  {
    test: /r(ü|ue)cken|wirbels(ä|ae)ule|lws|rundr(ü|ue)cken|einrund/i,
    joints: [J.shoulderL, J.shoulderR, J.hipL, J.hipR],
  },
  { test: /ell(en)?bogen|flügel|fl(ü|ue)gel|t-form/i, joints: [J.elbowL, J.elbowR] },
  { test: /schulter|impingement|retraktion/i, joints: [J.shoulderL, J.shoulderR] },
  { test: /knie|valgus|x-bein/i, joints: [J.kneeL, J.kneeR] },
  { test: /kopf|nacken|hals|blick/i, joints: [J.nose] },
  { test: /fu(ß|ss)|ferse|sprunggelenk|zehen/i, joints: [J.ankleL, J.ankleR] },
  { test: /handgelenk|hand/i, joints: [J.wristL, J.wristR] },
  { test: /tiefe|umkehrpunkt|rom|bewegungsumfang/i, joints: [J.elbowL, J.elbowR, J.kneeL, J.kneeR] },
];

function jointsForFault(label?: string | null): Set<number> {
  if (!label) return new Set();
  const hit = FAULT_JOINTS.filter((f) => f.test.test(label)).flatMap((f) => f.joints);
  return new Set(hit);
}

/** Joint whose angle is worth reading out, by exercise family. */
function measuredJoint(exercise: string): { a: number; b: number; c: number; name: string } {
  if (/kniebeuge|squat|ausfallschritt|lunge|hip thrust/i.test(exercise)) {
    return { a: J.hipR, b: J.kneeR, c: J.ankleR, name: "Knie" };
  }
  return { a: J.shoulderR, b: J.elbowR, c: J.wristR, name: "Ellenbogen" };
}

function angleAt(
  p: { x: number; y: number },
  q: { x: number; y: number },
  r: { x: number; y: number }
): number {
  const v1 = { x: p.x - q.x, y: p.y - q.y };
  const v2 = { x: r.x - q.x, y: r.y - q.y };
  const dot = v1.x * v2.x + v1.y * v2.y;
  const m1 = Math.hypot(v1.x, v1.y);
  const m2 = Math.hypot(v2.x, v2.y);
  if (!m1 || !m2) return NaN;
  return (Math.acos(Math.max(-1, Math.min(1, dot / (m1 * m2)))) * 180) / Math.PI;
}

interface PoseOverlayProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  /** Label of the finding showing right now, if any. */
  activeFaultLabel?: string | null;
  /**
   * Everything the coach faulted in this clip. These areas stay red for the
   * whole playback — a joint the coach called wrong must never read as green
   * just because its timestamp has passed.
   */
  faultTexts?: string[];
  exerciseName: string;
}

type Status = "idle" | "loading" | "ready" | "unavailable";

export const PoseOverlay: React.FC<PoseOverlayProps> = ({
  videoRef,
  activeFaultLabel,
  faultTexts = [],
  exerciseName,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const landmarkerRef = useRef<PoseLandmarker | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number>(-1);
  const faultRef = useRef<string | null | undefined>(activeFaultLabel);
  const persistentRef = useRef<Set<number>>(new Set());
  const [status, setStatus] = useState<Status>("idle");
  const [angle, setAngle] = useState<number | null>(null);

  // The coach faulted something we could not tie to a joint. Painting the
  // skeleton green would then claim an all-clear the analysis never gave, so
  // the joints go neutral instead.
  const unmappedFault =
    faultTexts.length > 0 &&
    faultTexts.every((t) => jointsForFault(t).size === 0);
  const unmappedRef = useRef<boolean>(unmappedFault);
  unmappedRef.current = unmappedFault;

  faultRef.current = activeFaultLabel;
  persistentRef.current = new Set(faultTexts.flatMap((t) => [...jointsForFault(t)]));

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setStatus("loading");
        const fileset = await FilesetResolver.forVisionTasks("/mediapipe/wasm");
        const landmarker = await PoseLandmarker.createFromOptions(fileset, {
          baseOptions: {
            modelAssetPath: "/models/pose_landmarker_lite.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numPoses: 1,
        });
        if (cancelled) {
          landmarker.close();
          return;
        }
        landmarkerRef.current = landmarker;
        setStatus("ready");
      } catch (err) {
        console.warn("Pose-Tracking nicht verfügbar:", err);
        if (!cancelled) setStatus("unavailable");
      }
    })();

    return () => {
      cancelled = true;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (status !== "ready") return;

    const tick = () => {
      rafRef.current = requestAnimationFrame(tick);

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const landmarker = landmarkerRef.current;
      if (!video || !canvas || !landmarker) return;
      if (video.readyState < 2 || !video.videoWidth) return;

      // One detection per decoded frame; re-running on the same timestamp
      // throws in VIDEO mode.
      const ts = video.currentTime;
      if (ts === lastTsRef.current) return;
      lastTsRef.current = ts;

      let result;
      try {
        result = landmarker.detectForVideo(video, performance.now());
      } catch {
        return;
      }

      const box = video.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      if (canvas.width !== Math.round(box.width * dpr)) {
        canvas.width = Math.round(box.width * dpr);
        canvas.height = Math.round(box.height * dpr);
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, box.width, box.height);

      const lm = result.landmarks?.[0];
      if (!lm) return;

      // The video is object-contain, so the picture is letterboxed inside the
      // element — landmarks are normalised to the picture, not the box.
      const scale = Math.min(box.width / video.videoWidth, box.height / video.videoHeight);
      const drawW = video.videoWidth * scale;
      const drawH = video.videoHeight * scale;
      const offX = (box.width - drawW) / 2;
      const offY = (box.height - drawH) / 2;
      const pt = (i: number) => ({ x: offX + lm[i].x * drawW, y: offY + lm[i].y * drawH });

      const active = jointsForFault(faultRef.current);
      const persistent = persistentRef.current;
      const faulty = new Set<number>([...persistent, ...active]);

      // --- red zones over the faulted regions ---------------------------
      // Sized against the athlete's own torso so the blobs scale with the
      // framing instead of a fixed pixel radius.
      const torso =
        lm[J.shoulderR] && lm[J.hipR]
          ? Math.hypot(
              (lm[J.shoulderR].x - lm[J.hipR].x) * drawW,
              (lm[J.shoulderR].y - lm[J.hipR].y) * drawH
            )
          : drawW * 0.25;

      faulty.forEach((i) => {
        const p = lm[i];
        if (!p || (p.visibility ?? 1) < 0.5) return;
        const { x, y } = pt(i);
        const isActive = active.has(i);
        const radius = torso * (isActive ? 0.62 : 0.46);
        const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
        grad.addColorStop(0, isActive ? "rgba(255, 68, 38, 0.55)" : "rgba(255, 68, 38, 0.34)");
        grad.addColorStop(0.55, isActive ? "rgba(255, 68, 38, 0.22)" : "rgba(255, 68, 38, 0.13)");
        grad.addColorStop(1, "rgba(255, 68, 38, 0)");
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      });

      // bones
      ctx.lineWidth = Math.max(2, drawW * 0.004);
      ctx.strokeStyle = "rgba(250, 246, 239, 0.85)";
      ctx.lineCap = "round";
      for (const c of PoseLandmarker.POSE_CONNECTIONS) {
        const a = lm[c.start];
        const b = lm[c.end];
        if (!a || !b || (a.visibility ?? 1) < 0.5 || (b.visibility ?? 1) < 0.5) continue;
        const isFaulty = faulty.has(c.start) || faulty.has(c.end);
        ctx.strokeStyle = isFaulty ? "rgba(255, 68, 38, 0.95)" : "rgba(250, 246, 239, 0.85)";
        const p1 = pt(c.start);
        const p2 = pt(c.end);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }

      // joints
      const r = Math.max(3, drawW * 0.007);
      const pulse = 1 + 0.35 * Math.sin(performance.now() / 160);
      lm.forEach((p, i) => {
        if ((p.visibility ?? 1) < 0.5) return;
        const isFaulty = faulty.has(i);
        const { x, y } = pt(i);
        if (isFaulty) {
          ctx.beginPath();
          ctx.arc(x, y, r * (active.has(i) ? 2.8 * pulse : 2.1), 0, Math.PI * 2);
          ctx.fillStyle = "rgba(255, 68, 38, 0.3)";
          ctx.fill();
        }
        ctx.beginPath();
        ctx.arc(x, y, isFaulty ? r * 1.5 : r, 0, Math.PI * 2);
        ctx.fillStyle = isFaulty
          ? "#ff4426"
          : unmappedRef.current
          ? "#faf6ef"
          : "#7bd44e";
        ctx.fill();
      });

      // one measured angle, on the joint that matters for this lift
      const m = measuredJoint(exerciseName);
      const va = lm[m.a];
      const vb = lm[m.b];
      const vc = lm[m.c];
      if (
        va && vb && vc &&
        (va.visibility ?? 1) > 0.5 &&
        (vb.visibility ?? 1) > 0.5 &&
        (vc.visibility ?? 1) > 0.5
      ) {
        const deg = angleAt(va, vb, vc);
        if (!Number.isNaN(deg)) {
          setAngle(Math.round(deg));
          const at = pt(m.b);
          ctx.font = `600 ${Math.max(11, drawW * 0.026)}px system-ui, sans-serif`;
          ctx.fillStyle = "rgba(0,0,0,0.55)";
          const text = `${Math.round(deg)}°`;
          const tw = ctx.measureText(text).width;
          ctx.fillRect(at.x + r * 2, at.y - r * 3.4, tw + 10, r * 4);
          ctx.fillStyle = "#faf6ef";
          ctx.fillText(text, at.x + r * 2 + 5, at.y - r * 0.6);
        }
      } else {
        setAngle(null);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [status, videoRef, exerciseName]);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />

      {status === "loading" && (
        <span className="absolute top-3 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-full bg-[#000000]/60 backdrop-blur-md text-[10px] uppercase tracking-[0.14em] font-semibold text-[#faf6ef]">
          Skelett wird geladen…
        </span>
      )}

      {status === "unavailable" && (
        <span className="absolute top-3 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-full bg-[#000000]/60 backdrop-blur-md text-[10px] text-[#faf6ef]">
          Pose-Tracking nicht verfügbar — „npm run setup:pose"
        </span>
      )}

      {status === "ready" && unmappedFault && (
        <span className="absolute top-11 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-full bg-[#000000]/60 backdrop-blur-md text-[10px] text-[#faf6ef] text-center max-w-[90%]">
          Befund keinem Gelenk zuzuordnen — keine Freigabe der übrigen Punkte
        </span>
      )}

      {status === "ready" && angle !== null && (
        <span className="absolute bottom-16 right-3 px-2.5 py-1 rounded-full bg-[#000000]/60 backdrop-blur-md text-[10px] uppercase tracking-[0.14em] font-semibold text-[#faf6ef]">
          {measuredJoint(exerciseName).name} {angle}°
        </span>
      )}
    </>
  );
};
