import React, { useEffect, useRef, useState } from "react";
import { Pause, Play, AlertTriangle } from "lucide-react";
import { ExerciseAnalysisData, FaultMoment } from "../types";
import { PoseOverlay } from "./PoseOverlay";
import { useT } from "../i18n";

interface AnalysedVideoStageProps {
  videoUrl: string;
  data: ExerciseAnalysisData;
}

/** A finding stays on screen for this long once its moment is reached. */
const MARKER_HOLD_SECONDS = 1.2;

export const AnalysedVideoStage: React.FC<AnalysedVideoStageProps> = ({
  videoUrl,
  data,
}) => {
  const t = useT();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ratio, setRatio] = useState<number | null>(null);
  const [duration, setDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [ended, setEnded] = useState<boolean>(false);

  const moments: FaultMoment[] = (data.fehlerZeitpunkte ?? [])
    .filter((m) => typeof m.sekunde === "number" && m.sekunde >= 0)
    .sort((a, b) => a.sekunde - b.sekunde);

  useEffect(() => {
    setRatio(null);
    setCurrentTime(0);
    setDuration(0);
  }, [videoUrl]);

  // Whichever finding the playhead is sitting on right now
  const activeMoment =
    moments.find(
      (m) => currentTime >= m.sekunde && currentTime < m.sekunde + MARKER_HOLD_SECONDS
    ) ?? null;

  const isPortrait = ratio !== null && ratio < 1;

  // Everything the coach faulted, so those regions stay red for the whole clip
  // rather than only while their timestamp is on screen. A clean verdict marks
  // nothing — there is no problem area to point at.
  const faultTexts =
    data.urteil === "gut"
      ? []
      : [
          data.derWichtigsteFehler,
          ...moments.map((m) => `${m.label} ${m.hinweis ?? ""}`),
        ].filter(Boolean);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      // Once it has run to the end, play starts the clip over
      if (ended || v.currentTime >= (v.duration || 0) - 0.05) v.currentTime = 0;
      v.play();
      setIsPlaying(true);
      setEnded(false);
    } else {
      v.pause();
      setIsPlaying(false);
    }
  };

  const seekTo = (seconds: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(seconds, v.duration || seconds));
    setEnded(false);
    if (v.paused) {
      v.play();
      setIsPlaying(true);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8">
      {/* Portrait clips stay narrow, landscape ones get more room — the frame
          follows the footage rather than forcing it into a banner. */}
      <div className={`mx-auto ${isPortrait ? "max-w-sm" : "max-w-3xl"}`}>
        <div className="relative rounded-3xl overflow-hidden bg-[#000000] border border-[#2e2c27]/10 shadow-sm">
          <video
            ref={videoRef}
            src={videoUrl}
            autoPlay
            muted
            playsInline
            onLoadedMetadata={(e) => {
              const v = e.currentTarget;
              if (v.videoWidth && v.videoHeight) setRatio(v.videoWidth / v.videoHeight);
              setDuration(v.duration || 0);
            }}
            onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
            onPlay={() => {
              setIsPlaying(true);
              setEnded(false);
            }}
            onPause={() => setIsPlaying(false)}
            onEnded={() => {
              setIsPlaying(false);
              setEnded(true);
            }}
            className="w-full h-auto max-h-[62svh] object-contain bg-[#000000]"
          />

          {/* live skeleton, joints of the current finding lit up */}
          <PoseOverlay
            videoRef={videoRef}
            activeFaultLabel={activeMoment ? `${activeMoment.label} ${activeMoment.hinweis ?? ""}` : null}
            faultTexts={faultTexts}
            exerciseName={data.exerciseName}
          />

          {/* corner badge, like a live readout */}
          <div className="absolute top-3 left-3 flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#000000]/60 backdrop-blur-md">
            <span className="w-1.5 h-1.5 rounded-full bg-[#7bd44e] animate-pulse" />
            <span className="text-[10px] uppercase tracking-[0.14em] font-semibold text-[#faf6ef]">
              {t("Analyse", "Analysis")}
            </span>
          </div>

          <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-[#000000]/60 backdrop-blur-md">
            <span className="text-[10px] uppercase tracking-[0.14em] font-semibold text-[#faf6ef]">
              {data.exerciseName}
            </span>
          </div>

          {/* the finding for this instant */}
          {activeMoment && (
            <div className="absolute left-3 right-3 bottom-16 sm:bottom-20">
              <div className="inline-flex max-w-full items-start gap-2.5 px-3.5 py-2.5 rounded-2xl bg-[#000000]/75 backdrop-blur-md border border-[#faf6ef]/15">
                <AlertTriangle
                  className={`w-4 h-4 shrink-0 mt-0.5 ${
                    activeMoment.schwere === "hinweis" ? "text-[#e3b355]" : "text-[#ff7a5c]"
                  }`}
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#faf6ef] leading-snug">
                    {activeMoment.label}
                  </p>
                  {activeMoment.hinweis && (
                    <p className="text-xs text-[#faf6ef]/80 leading-relaxed mt-0.5">
                      {activeMoment.hinweis}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {ended && (
            <button
              type="button"
              onClick={togglePlay}
              aria-label={t("Erneut abspielen", "Play again")}
              className="absolute inset-0 flex items-center justify-center bg-[#000000]/45 group"
            >
              <span className="w-16 h-16 rounded-full bg-[#faf6ef] flex items-center justify-center shadow-xl group-hover:scale-105 transition">
                <Play className="w-7 h-7 text-[#2e2c27] fill-[#2e2c27] ml-1" />
              </span>
            </button>
          )}

          {/* transport: play/pause plus a scrub bar carrying the findings */}
          <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-[#000000]/80 to-transparent">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={togglePlay}
                aria-label={isPlaying ? t("Pausieren", "Pause") : t("Abspielen", "Play")}
                className="shrink-0 w-9 h-9 rounded-full bg-[#faf6ef] text-[#2e2c27] flex items-center justify-center hover:bg-[#e8e2d6] transition"
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4 ml-0.5" />
                )}
              </button>

              <div className="relative flex-1 h-1.5 rounded-full bg-[#faf6ef]/25">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-[#faf6ef]"
                  style={{ width: duration ? `${(currentTime / duration) * 100}%` : "0%" }}
                />
                {duration > 0 &&
                  moments.map((m, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => seekTo(m.sekunde)}
                      title={`${m.sekunde.toFixed(1)}s – ${m.label}`}
                      aria-label={t(`Zu ${m.label} springen`, `Jump to ${m.label}`)}
                      className="absolute -top-1 w-3.5 h-3.5 -translate-x-1/2 rounded-full border-2 border-[#000000]/50 hover:scale-125 transition"
                      style={{
                        left: `${Math.min(100, (m.sekunde / duration) * 100)}%`,
                        backgroundColor:
                          m.schwere === "hinweis" ? "#e3b355" : "#ff7a5c",
                      }}
                    />
                  ))}
              </div>

              <span className="shrink-0 text-[11px] font-mono text-[#faf6ef]/80 tabular-nums">
                {currentTime.toFixed(1)}s
              </span>
            </div>
          </div>
        </div>

        {moments.length > 0 ? (
          <p className="mt-3 text-center text-xs text-[#6f6759]">
            {t(
              `${moments.length} markierte${moments.length === 1 ? "r" : ""} Zeitpunkt${
                moments.length === 1 ? "" : "e"
              } — auf einen Punkt tippen, um dorthin zu springen.`,
              `${moments.length} marked moment${moments.length === 1 ? "" : "s"} — tap a dot to jump there.`
            )}
          </p>
        ) : (
          <p className="mt-3 text-center text-xs text-[#6f6759]">
            {t(
              "Für diese Aufnahme hat der Coach keine Zeitpunkte verortet — der Befund steht unten.",
              "The coach placed no moments in this clip — the finding is below."
            )}
          </p>
        )}
      </div>
    </div>
  );
};
