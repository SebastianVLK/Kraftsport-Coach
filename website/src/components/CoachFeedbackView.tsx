import React, { useState, useEffect } from "react";
import {
  CheckCircle2,
  AlertCircle,
  XCircle,
  HelpCircle,
  TrendingUp,
  Minus,
  TrendingDown,
  EyeOff,
  ArrowRight,
  Target,
  ChevronDown,
  ChevronUp,
  Play,
  Pause,
  RotateCcw,
  Loader2,
  Cpu,
  RefreshCw,
  Clock,
  Check,
  Eye,
  Youtube,
  ExternalLink,
  Repeat,
  Ruler,
  ThumbsUp,
} from "lucide-react";
import {
  ExerciseAnalysisData,
  ExerciseVerdict,
  WeightRecommendation,
  DrillRecommendation,
} from "../types";
import { findTechniqueVideo, youtubeSearchUrl } from "../data/techniqueVideos";

interface CoachFeedbackViewProps {
  data: ExerciseAnalysisData;
  onStartNextSet?: (exerciseName?: string, cue?: string) => void;
}

export const CoachFeedbackView: React.FC<CoachFeedbackViewProps> = ({
  data,
  onStartNextSet,
}) => {
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const [videoStarted, setVideoStarted] = useState<boolean>(false);

  // Active technique improvement workflow
  const [cueMemorized, setCueMemorized] = useState<boolean>(false);
  const [drillCompleted, setDrillCompleted] = useState<boolean>(false);
  const [drillTimerSeconds, setDrillTimerSeconds] = useState<number>(45);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);

  const [activeDrill, setActiveDrill] = useState<DrillRecommendation | undefined>(
    data.drillRecommendation
  );
  const [isAgentExecuting, setIsAgentExecuting] = useState<boolean>(false);

  useEffect(() => {
    setActiveDrill(data.drillRecommendation);
    setCueMemorized(false);
    setDrillCompleted(false);
    setIsTimerRunning(false);
    setDrillTimerSeconds(45);
    setVideoStarted(false);
  }, [data]);

  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning && drillTimerSeconds > 0) {
      interval = setInterval(() => {
        setDrillTimerSeconds((prev) => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            setDrillCompleted(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, drillTimerSeconds]);

  const handleGenerateDrill = async () => {
    try {
      setIsAgentExecuting(true);

      const res = await fetch("/api/agent-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionType: "generate_drill", exerciseContext: data }),
      });

      const resText = await res.text();
      let result: any;
      try {
        result = JSON.parse(resText);
      } catch {
        result = null;
      }
      if (result && result.success && result.data) {
        setActiveDrill(result.data);
        setDrillCompleted(false);
      }
    } catch (err) {
      console.error("Agent action error:", err);
    } finally {
      setIsAgentExecuting(false);
    }
  };

  const getVerdictMeta = (verdict: ExerciseVerdict) => {
    switch (verdict) {
      case "gut":
        return {
          label: "Gut",
          title: "Technisch saubere Ausführung",
          accent: "#5f6b25",
          chip: "bg-[#5f6b25] text-[#faf6ef]",
          icon: CheckCircle2,
        };
      case "brauchbar":
        return {
          label: "Brauchbar",
          title: "Verbesserungsbedarf am tiefsten Punkt",
          accent: "#8f6413",
          chip: "bg-[#8f6413] text-[#faf6ef]",
          icon: AlertCircle,
        };
      case "mangelhaft":
        return {
          label: "Mangelhaft",
          title: "Kritischer Formverlust oder Kompensation",
          accent: "#c33418",
          chip: "bg-[#c33418] text-[#faf6ef]",
          icon: XCircle,
        };
      case "nicht_beurteilbar":
      default:
        return {
          label: "Nicht beurteilbar",
          title: "Kamerawinkel oder Licht unzureichend",
          accent: "#6f6759",
          chip: "bg-[#eee8dd] text-[#2e2c27]",
          icon: HelpCircle,
        };
    }
  };

  const getWeightMeta = (rec: WeightRecommendation) => {
    switch (rec) {
      case "hochgehen":
        return { label: "Gewicht steigern", chip: "bg-[#5f6b25] text-[#faf6ef]", icon: TrendingUp };
      case "runtergehen":
        return { label: "Gewicht reduzieren", chip: "bg-[#c33418] text-[#faf6ef]", icon: TrendingDown };
      case "gleich bleiben":
      default:
        return { label: "Gewicht beibehalten", chip: "bg-[#8f6413] text-[#faf6ef]", icon: Minus };
    }
  };

  const verdict = getVerdictMeta(data.urteil);
  const weight = getWeightMeta(data.gewicht.empfehlung);
  const VerdictIcon = verdict.icon;
  const WeightIcon = weight.icon;

  const video = findTechniqueVideo(data.exerciseName);
  const searchUrl = youtubeSearchUrl(data.exerciseName);

  const positives = data.wasGutWar ?? [];
  const criteria = data.beobachteteKriterien ?? {};
  const criteriaRows: { label: string; value?: string }[] = [
    { label: "Bewegungsumfang", value: criteria.bewegungsumfang },
    { label: "Gelenkstellung", value: criteria.gelenkstellung },
    { label: "Tempo & Umkehrpunkt", value: criteria.tempo },
    { label: "Schwung / Nachfedern", value: criteria.schwung },
    { label: "Symmetrie", value: criteria.symmetrie },
    { label: "Konsistenz über die Sätze", value: criteria.konsistenz },
  ].filter((r) => r.value);

  const agentTraceList = data.agentTrace ?? [];
  const steps = [
    { done: cueMemorized },
    { done: drillCompleted },
    { done: videoStarted },
  ];
  const stepsDone = steps.filter((s) => s.done).length;

  return (
    <div className="space-y-5">
      {/* ---------------------------------------------------------------- */}
      {/* 1. The verdict, at full size                                      */}
      {/* ---------------------------------------------------------------- */}
      <section className="rounded-3xl bg-[#ffffff] border border-[#2e2c27]/[0.08] p-6 sm:p-9 shadow-sm">
        <div className="flex items-start gap-4 sm:gap-6">
          <span
            className="shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center"
            style={{ backgroundColor: `${verdict.accent}1a`, color: verdict.accent }}
          >
            <VerdictIcon className="w-8 h-8 sm:w-9 sm:h-9" />
          </span>

          <div className="min-w-0">
            <span className="block text-[11px] uppercase tracking-[0.14em] font-semibold text-[#6f6759]">
              {data.exerciseName}
            </span>
            <h2
              className="mt-1 font-black uppercase tracking-[-0.02em] leading-[0.95] text-4xl sm:text-6xl"
              style={{ color: verdict.accent }}
            >
              {verdict.label}
            </h2>
            <p className="mt-2 text-sm sm:text-base font-medium text-[#2e2c27]">
              {verdict.title}
            </p>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* 2. Every remark, in one card                                      */}
      {/* ---------------------------------------------------------------- */}
      <section className="rounded-3xl bg-[#ffffff] border border-[#2e2c27]/[0.08] p-6 sm:p-9 shadow-sm space-y-7">
        <h3 className="text-lg sm:text-xl font-bold tracking-tight text-[#2e2c27]">
          Anmerkungen des Coachs
        </h3>

        <div>
          <span className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] font-semibold text-[#5f6b25] mb-3">
            <ThumbsUp className="w-3.5 h-3.5" />
            Das sitzt bereits
          </span>
          {positives.length > 0 ? (
            <ul className="space-y-2.5">
              {positives.map((item, i) => (
                <li key={i} className="flex gap-3">
                  <Check className="w-4 h-4 text-[#5f6b25] shrink-0 mt-1" />
                  <span className="text-[15px] leading-relaxed text-[#2e2c27]">{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[15px] leading-relaxed text-[#6f6759]">
              Der Coach hat an dieser Ausführung nichts gefunden, das er ohne Einschränkung
              loben würde.
            </p>
          )}
        </div>

        <div className="border-t border-[#2e2c27]/10 pt-6">
          <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] font-semibold text-[#c23a20] mb-2">
            <Target className="w-3.5 h-3.5" />
            Der wichtigste Fehler
          </span>
          <p className="text-lg sm:text-xl font-semibold leading-snug text-[#2e2c27]">
            {data.derWichtigsteFehler}
          </p>
        </div>

      </section>

      {/* ---------------------------------------------------------------- */}
      {/* 3. The part that actually changes the next set                    */}
      {/* ---------------------------------------------------------------- */}
      <section className="rounded-3xl bg-[#ffffff] border border-[#2e2c27]/[0.08] p-6 sm:p-9 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-8">
          <div>
            <h3 className="text-2xl sm:text-3xl font-black uppercase tracking-[-0.02em] text-[#2e2c27]">
              Technik aktiv verbessern
            </h3>
            <p className="mt-1.5 text-sm text-[#6f6759] max-w-xl leading-relaxed">
              Drei Schritte vor dem nächsten Satz: den Cue verinnerlichen, den Drill ausführen,
              die Bewegung noch einmal sauber sehen.
            </p>
          </div>
          <span className="text-[11px] uppercase tracking-[0.14em] font-semibold text-[#6f6759] whitespace-nowrap">
            {stepsDone} von 3 erledigt
          </span>
        </div>

        <div className="space-y-5">
          {/* STEP 1 — the one cue */}
          <div
            className={`rounded-2xl border p-6 sm:p-7 transition ${
              cueMemorized
                ? "bg-[#5f6b25]/[0.07] border-[#5f6b25]/40"
                : "bg-[#faf6ef] border-[#2e2c27]/10"
            }`}
          >
            <div className="flex items-start gap-4 sm:gap-5">
              <span className="shrink-0 w-10 h-10 rounded-xl bg-[#2e2c27] text-[#faf6ef] text-lg font-black flex items-center justify-center">
                1
              </span>
              <div className="min-w-0 flex-1">
                <p className="mt-2 text-xl sm:text-2xl font-bold leading-snug text-[#2e2c27]">
                  „{data.korrektur}"
                </p>
                <p className="mt-3 text-sm text-[#6f6759] leading-relaxed">
                  Nimm genau diesen einen Gedanken mit in den Satz. Mehrere Korrekturen
                  gleichzeitig verschlechtern die Ausführung messbar.
                </p>

                <button
                  type="button"
                  onClick={() => setCueMemorized(!cueMemorized)}
                  className={`mt-5 px-5 py-2.5 rounded-full text-sm font-semibold transition inline-flex items-center gap-2 ${
                    cueMemorized
                      ? "bg-[#5f6b25] text-[#faf6ef]"
                      : "bg-[#2e2c27] hover:bg-[#1f1d19] text-[#faf6ef]"
                  }`}
                >
                  {cueMemorized ? <Check className="w-4 h-4" /> : null}
                  <span>{cueMemorized ? "Cue sitzt" : "Cue verinnerlicht"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* STEP 2 — the drill */}
          <div
            className={`rounded-2xl border p-6 sm:p-7 transition ${
              drillCompleted
                ? "bg-[#5f6b25]/[0.07] border-[#5f6b25]/40"
                : "bg-[#faf6ef] border-[#2e2c27]/10"
            }`}
          >
            <div className="flex items-start gap-4 sm:gap-5">
              <span className="shrink-0 w-10 h-10 rounded-xl bg-[#2e2c27] text-[#faf6ef] text-lg font-black flex items-center justify-center">
                2
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={handleGenerateDrill}
                    disabled={isAgentExecuting}
                    className="text-xs text-[#6f6759] hover:text-[#2e2c27] disabled:opacity-50 inline-flex items-center gap-1.5"
                  >
                    {isAgentExecuting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5" />
                    )}
                    <span>Anderen Drill</span>
                  </button>
                </div>

                {activeDrill ? (
                  <>
                    <p className="mt-2 text-xl sm:text-2xl font-bold leading-snug text-[#2e2c27]">
                      {activeDrill.title}
                    </p>
                    <div className="mt-4 grid gap-4 sm:grid-cols-3">
                      <div>
                        <span className="block text-[11px] uppercase tracking-[0.12em] font-semibold text-[#6f6759] mb-1">
                          Umfang
                        </span>
                        <p className="text-sm text-[#2e2c27] leading-relaxed">
                          {activeDrill.setsAndReps}
                        </p>
                      </div>
                      <div>
                        <span className="block text-[11px] uppercase tracking-[0.12em] font-semibold text-[#6f6759] mb-1">
                          Ausführung
                        </span>
                        <p className="text-sm text-[#2e2c27] leading-relaxed">
                          {activeDrill.executionCue}
                        </p>
                      </div>
                      <div>
                        <span className="block text-[11px] uppercase tracking-[0.12em] font-semibold text-[#6f6759] mb-1">
                          Zweck
                        </span>
                        <p className="text-sm text-[#2e2c27] leading-relaxed">
                          {activeDrill.purpose}
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="mt-2 text-sm text-[#6f6759]">
                    Für diesen Befund wurde kein eigener Drill erzeugt. „Anderen Drill" fragt
                    den Coach gezielt danach.
                  </p>
                )}

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <div className="inline-flex items-center gap-3 px-4 py-2.5 rounded-full bg-[#eee8dd] border border-[#2e2c27]/10">
                    <Clock className="w-4 h-4 text-[#6f6759]" />
                    <span className="text-base font-mono font-bold text-[#2e2c27] tabular-nums">
                      0:{String(drillTimerSeconds).padStart(2, "0")}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsTimerRunning(!isTimerRunning)}
                      className="p-1.5 rounded-full bg-[#2e2c27] text-[#faf6ef] hover:bg-[#1f1d19] transition"
                      aria-label={isTimerRunning ? "Pausieren" : "Starten"}
                    >
                      {isTimerRunning ? (
                        <Pause className="w-3.5 h-3.5" />
                      ) : (
                        <Play className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsTimerRunning(false);
                        setDrillTimerSeconds(45);
                      }}
                      className="p-1.5 rounded-full text-[#6f6759] hover:text-[#2e2c27] transition"
                      aria-label="Zurücksetzen"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setDrillCompleted(!drillCompleted)}
                    className={`px-5 py-2.5 rounded-full text-sm font-semibold transition inline-flex items-center gap-2 ${
                      drillCompleted
                        ? "bg-[#5f6b25] text-[#faf6ef]"
                        : "bg-[#2e2c27] hover:bg-[#1f1d19] text-[#faf6ef]"
                    }`}
                  >
                    {drillCompleted ? <Check className="w-4 h-4" /> : null}
                    <span>{drillCompleted ? "Drill absolviert" : "Drill erledigt"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* STEP 3 — watch the movement done properly */}
          <div
            className={`rounded-2xl border p-6 sm:p-7 transition ${
              videoStarted
                ? "bg-[#5f6b25]/[0.07] border-[#5f6b25]/40"
                : "bg-[#faf6ef] border-[#2e2c27]/10"
            }`}
          >
            <div className="flex items-start gap-4 sm:gap-5">
              <span className="shrink-0 w-10 h-10 rounded-xl bg-[#2e2c27] text-[#faf6ef] text-lg font-black flex items-center justify-center">
                3
              </span>
              <div className="min-w-0 flex-1">

                {video ? (
                  <>
                    <p className="mt-2 text-xl sm:text-2xl font-bold leading-snug text-[#2e2c27]">
                      {video.title}
                    </p>
                    <p className="mt-1.5 text-sm text-[#6f6759]">{video.channel}</p>

                    <div className="mt-5 relative rounded-2xl overflow-hidden bg-[#000000] aspect-video border border-[#2e2c27]/10">
                      {videoStarted ? (
                        <iframe
                          src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0`}
                          title={video.title}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          className="absolute inset-0 w-full h-full"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => setVideoStarted(true)}
                          className="absolute inset-0 w-full h-full group"
                          aria-label={`${video.title} abspielen`}
                        >
                          <img
                            src={`https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`}
                            alt=""
                            className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100 transition"
                          />
                          <span className="absolute inset-0 flex items-center justify-center">
                            <span className="w-16 h-16 rounded-full bg-[#c33418] flex items-center justify-center shadow-xl group-hover:scale-105 transition">
                              <Play className="w-7 h-7 text-[#faf6ef] fill-[#faf6ef] ml-1" />
                            </span>
                          </span>
                        </button>
                      )}
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      {!videoStarted && (
                        <button
                          type="button"
                          onClick={() => setVideoStarted(true)}
                          className="px-5 py-2.5 rounded-full bg-[#2e2c27] hover:bg-[#1f1d19] text-[#faf6ef] text-sm font-semibold transition inline-flex items-center gap-2"
                        >
                          <Play className="w-4 h-4" />
                          <span>Hier abspielen</span>
                        </button>
                      )}
                      <a
                        href={`https://www.youtube.com/watch?v=${video.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-5 py-2.5 rounded-full bg-[#eee8dd] hover:bg-[#e2dacb] text-[#2e2c27] text-sm font-semibold transition inline-flex items-center gap-2 border border-[#2e2c27]/10"
                      >
                        <Youtube className="w-4 h-4" />
                        <span>In YouTube öffnen</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="mt-2 text-base text-[#2e2c27] leading-relaxed">
                      Für „{data.exerciseName}" ist kein geprüftes Technikvideo hinterlegt —
                      hier eine YouTube-Suche statt eines womöglich falschen Clips.
                    </p>
                    <a
                      href={searchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setVideoStarted(true)}
                      className="mt-5 px-5 py-2.5 rounded-full bg-[#2e2c27] hover:bg-[#1f1d19] text-[#faf6ef] text-sm font-semibold transition inline-flex items-center gap-2"
                    >
                      <Youtube className="w-4 h-4" />
                      <span>Auf YouTube suchen</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* ---------------------------------------------------------------- */}
      {/* 5. The technical record, kept apart from the coaching             */}
      {/* ---------------------------------------------------------------- */}
      <section className="rounded-3xl bg-[#ffffff] border border-[#2e2c27]/[0.08] shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          className="w-full p-6 sm:p-7 flex items-center justify-between gap-4 text-left hover:bg-[#faf6ef] transition"
        >
          <div>
            <h3 className="text-lg sm:text-xl font-bold tracking-tight text-[#2e2c27] flex items-center gap-2">
              <Ruler className="w-5 h-5 text-[#6f6759]" />
              Analyse-Details
            </h3>
            <p className="mt-1 text-sm text-[#6f6759]">
              Geprüfte Bewegungsparameter, Sichtgrenzen und der Weg des Coach-Agenten.
            </p>
          </div>
          {showDetails ? (
            <ChevronUp className="w-5 h-5 text-[#6f6759] shrink-0" />
          ) : (
            <ChevronDown className="w-5 h-5 text-[#6f6759] shrink-0" />
          )}
        </button>

        {showDetails && (
          <div className="px-6 sm:px-7 pb-7 space-y-8 border-t border-[#2e2c27]/10 pt-7">
            {criteriaRows.length > 0 && (
              <div>
                <span className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] font-semibold text-[#6f6759] mb-4">
                  <Eye className="w-3.5 h-3.5" />
                  Geprüfte Bewegungsparameter
                </span>
                <dl className="divide-y divide-[#2e2c27]/10">
                  {criteriaRows.map((row) => (
                    <div key={row.label} className="py-3 first:pt-0 sm:flex sm:gap-8">
                      <dt className="sm:w-56 shrink-0 text-sm font-semibold text-[#2e2c27]">
                        {row.label}
                      </dt>
                      <dd className="mt-1 sm:mt-0 text-sm text-[#2e2c27] leading-relaxed">
                        {row.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {data.wasNichtBeurteilbar && (
              <div>
                <span className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] font-semibold text-[#6f6759] mb-3">
                  <EyeOff className="w-3.5 h-3.5" />
                  Optisch nicht beurteilbar
                </span>
                <p className="text-sm leading-relaxed text-[#2e2c27]">
                  {data.wasNichtBeurteilbar}
                </p>
              </div>
            )}

            {agentTraceList.length > 0 && (
              <div>
                <span className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] font-semibold text-[#6f6759] mb-4">
                  <Cpu className="w-3.5 h-3.5" />
                  Prüf-Pipeline
                </span>
                <ol className="space-y-3">
                  {agentTraceList.map((phase, i) => (
                    <li key={phase.phaseId ?? i} className="flex gap-3">
                      <span
                        className={`shrink-0 mt-1.5 w-2 h-2 rounded-full ${
                          phase.status === "warning" ? "bg-[#c33418]" : "bg-[#5f6b25]"
                        }`}
                      />
                      <div>
                        <span className="text-sm font-semibold text-[#2e2c27]">
                          {phase.name}
                        </span>
                        <p className="text-sm text-[#6f6759] leading-relaxed">
                          {phase.summary}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* 6. What to do now                                                 */}
      {/* ---------------------------------------------------------------- */}
      <section className="rounded-3xl bg-[#2e2c27] p-6 sm:p-9 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="min-w-0">
            <h3 className="text-2xl sm:text-3xl font-black uppercase tracking-[-0.02em] text-[#faf6ef]">
              Nächsten Satz aufnehmen
            </h3>
            <p className="mt-2 text-sm sm:text-base text-[#faf6ef]/75 max-w-lg leading-relaxed">
              Der Coach vergleicht, ob der Umkehrpunkt diesmal steht. Kamerawinkel beibehalten,
              nur auf den einen Cue achten.
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-2.5">
              <span
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold ${weight.chip}`}
              >
                <WeightIcon className="w-3.5 h-3.5" />
                {weight.label}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium bg-[#faf6ef]/10 text-[#faf6ef] border border-[#faf6ef]/20">
                <Repeat className="w-3.5 h-3.5" />
                {data.gewicht.begruendung}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onStartNextSet?.(data.exerciseName, data.korrektur)}
            className="shrink-0 self-start lg:self-auto px-8 py-4 rounded-full bg-[#faf6ef] hover:bg-[#e8e2d6] text-[#2e2c27] text-base font-semibold transition inline-flex items-center gap-2.5 active:scale-95"
          >
            <span>Satz aufnehmen</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>
    </div>
  );
};
