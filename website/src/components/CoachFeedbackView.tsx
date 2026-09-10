import React, { useState, useEffect } from "react";
import {
  CheckCircle2,
  AlertCircle,
  XCircle,
  HelpCircle,
  TrendingUp,
  Minus,
  TrendingDown,
  Copy,
  Check,
  EyeOff,
  ArrowRight,
  Target,
  Bot,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Play,
  Pause,
  RotateCcw,
  Loader2,
  Cpu,
  RefreshCw,
  Clock,
  Zap,
} from "lucide-react";
import {
  ExerciseAnalysisData,
  ExerciseVerdict,
  WeightRecommendation,
  DrillRecommendation,
  AlternativeCues,
} from "../types";

interface CoachFeedbackViewProps {
  data: ExerciseAnalysisData;
  onStartNextSet?: (exerciseName?: string, cue?: string) => void;
}

export const CoachFeedbackView: React.FC<CoachFeedbackViewProps> = ({
  data,
  onStartNextSet,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [showAgentTraceDetails, setShowAgentTraceDetails] = useState<boolean>(false);
  const [showRawOutput, setShowRawOutput] = useState<boolean>(false);

  // Active technique improvement workflow states
  const [cueMemorized, setCueMemorized] = useState<boolean>(false);
  const [drillCompleted, setDrillCompleted] = useState<boolean>(false);

  // Practice timer for active technique improvement
  const [drillTimerSeconds, setDrillTimerSeconds] = useState<number>(45);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);

  // Dynamic agent action states
  const [activeDrill, setActiveDrill] = useState<DrillRecommendation | undefined>(
    data.drillRecommendation
  );
  const [activeCues, setActiveCues] = useState<AlternativeCues | undefined>(
    data.alternativeCues
  );
  const [simulationText, setSimulationText] = useState<string | null>(null);
  const [isAgentExecuting, setIsAgentExecuting] = useState<boolean>(false);
  const [agentActionMessage, setAgentActionMessage] = useState<string>("");

  // Sync state if incoming data updates
  useEffect(() => {
    setActiveDrill(data.drillRecommendation);
    setActiveCues(data.alternativeCues);
    setSimulationText(null);
    setCueMemorized(false);
    setDrillCompleted(false);
    setIsTimerRunning(false);
    setDrillTimerSeconds(45);
  }, [data]);

  // Timer countdown hook
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

  const handleCopyRaw = () => {
    navigator.clipboard.writeText(data.rawOutputText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Trigger dedicated agent actions
  const handleTriggerAgentAction = async (
    actionType: "generate_drill" | "refine_cues" | "simulate_set"
  ) => {
    try {
      setIsAgentExecuting(true);
      setAgentActionMessage(
        actionType === "generate_drill"
          ? "Drill wird generiert..."
          : actionType === "refine_cues"
          ? "Cues werden optimiert..."
          : "Nächster Satz wird simuliert..."
      );

      const res = await fetch("/api/agent-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionType,
          exerciseContext: data,
        }),
      });

      const resText = await res.text();
      let result: any;
      try {
        result = JSON.parse(resText);
      } catch {
        result = null;
      }
      if (result && result.success && result.data) {
        if (actionType === "generate_drill") {
          setActiveDrill(result.data);
          setDrillCompleted(false);
        } else if (actionType === "refine_cues") {
          setActiveCues(result.data);
        } else if (actionType === "simulate_set") {
          setSimulationText(result.data.simulationPlan || "Satzsimulation abgeschlossen.");
        }
      }
    } catch (err) {
      console.error("Agent action error:", err);
    } finally {
      setIsAgentExecuting(false);
      setAgentActionMessage("");
    }
  };

  // Apple Watch & Fitness style verdict configuration
  const getVerdictMeta = (verdict: ExerciseVerdict) => {
    switch (verdict) {
      case "gut":
        return {
          label: "Gut",
          title: "Technisch saubere Ausführung",
          ringColor: "text-[#5f6b25]",
          pillBg: "bg-[#5f6b25] text-[#faf6ef] border-[#5f6b25]",
          icon: CheckCircle2,
        };
      case "brauchbar":
        return {
          label: "Brauchbar",
          title: "Verbesserungsbedarf am tiefsten Punkt",
          ringColor: "text-[#a4761a]",
          pillBg: "bg-[#8f6413] text-[#faf6ef] border-[#8f6413]",
          icon: AlertCircle,
        };
      case "mangelhaft":
        return {
          label: "Mangelhaft",
          title: "Kritischer Formverlust oder Kompensation",
          ringColor: "text-[#c23a20]",
          pillBg: "bg-[#c33418] text-[#faf6ef] border-[#c33418]",
          icon: XCircle,
        };
      case "nicht_beurteilbar":
      default:
        return {
          label: "Nicht beurteilbar",
          title: "Kamerawinkel oder Licht unzureichend",
          ringColor: "text-[#6f6759]",
          pillBg: "bg-[#eee8dd] text-[#6f6759] border-[#2e2c27]/10",
          icon: HelpCircle,
        };
    }
  };

  const getWeightMeta = (rec: WeightRecommendation) => {
    switch (rec) {
      case "hochgehen":
        return {
          label: "Steigern",
          pillBg: "bg-[#5f6b25] text-[#faf6ef] border-[#5f6b25]",
          icon: TrendingUp,
        };
      case "runtergehen":
        return {
          label: "Reduzieren",
          pillBg: "bg-[#c33418] text-[#faf6ef] border-[#c33418]",
          icon: TrendingDown,
        };
      case "gleich bleiben":
      default:
        return {
          label: "Beibehalten",
          pillBg: "bg-[#8f6413] text-[#faf6ef] border-[#8f6413]",
          icon: Minus,
        };
    }
  };

  const verdict = getVerdictMeta(data.urteil);
  const weight = getWeightMeta(data.gewicht.empfehlung);
  const VerdictIcon = verdict.icon;
  const WeightIcon = weight.icon;

  const agentTraceList = data.agentTrace || [
    { phaseId: "triage", name: "Kameraperspektive", status: "done", summary: "Seitlicher Blickwinkel verifiziert" },
    { phaseId: "segmentation", name: "Phasen & Umkehrpunkt", status: "done", summary: "Tiefster Punkt isoliert" },
    { phaseId: "biomechanics", name: "Gelenkachsen & Lastpfad", status: data.urteil === "mangelhaft" ? "warning" : "done", summary: data.derWichtigsteFehler || "Gelenkachsen geprüft" },
    { phaseId: "verdict", name: "Coach-Urteil", status: "done", summary: `Urteil: ${data.urteil.toUpperCase()}` },
    { phaseId: "drill", name: "Cue & Korrektur", status: "done", summary: data.korrektur }
  ];

  // Active technique improvement progress
  const improvementProgress = (cueMemorized ? 50 : 0) + (drillCompleted ? 50 : 0);

  return (
    <div id="coach-feedback-container" className="space-y-6 max-w-5xl mx-auto">
      {/* 1. HERO CARD: Apple Fitness+ style Verdict & Summary */}
      <div className="relative overflow-hidden rounded-3xl bg-[#ffffff] border border-[#2e2c27]/[0.08] p-6 sm:p-8 transition-all shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start sm:items-center gap-4 sm:gap-5">
            {/* Apple Activity Ring Icon Container */}
            <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-[#eee8dd] border border-[#2e2c27]/10 flex items-center justify-center shrink-0 shadow-inner">
              <VerdictIcon className={`w-8 h-8 sm:w-9 sm:h-9 ${verdict.ringColor}`} />
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide border ${verdict.pillBg}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  URTEIL: {verdict.label.toUpperCase()}
                </span>

                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${weight.pillBg}`}>
                  <WeightIcon className="w-3.5 h-3.5" />
                  <span>Gewicht: {weight.label}</span>
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#2e2c27]">
                {data.exerciseName || "Übungsbeurteilung"}
              </h2>
              <p className="text-xs sm:text-sm text-[#6f6759] font-normal">
                {verdict.title}
              </p>
            </div>
          </div>

          {/* Quick Actions in Apple pill style */}
          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            <button
              id="btn-copy-verbatim-report"
              type="button"
              onClick={handleCopyRaw}
              className="px-3.5 py-2 rounded-full bg-[#eee8dd] hover:bg-[#e2dacb] text-[#2e2c27] border border-[#2e2c27]/10 text-xs font-medium transition flex items-center gap-1.5 shadow-sm active:scale-95"
              title="Bericht kopieren"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#5f6b25]" />
                  <span className="text-[#5f6b25] font-semibold">Kopiert</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-[#6f6759]" />
                  <span>Kopieren</span>
                </>
              )}
            </button>

          </div>
        </div>

        {/* Observations at lowest point & weight rationale */}
        <div className="mt-6 pt-6 border-t border-[#2e2c27]/[0.08] grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-[#eee8dd]/60 border border-[#2e2c27]/[0.04]">
            <span className="text-[11px] font-semibold text-[#6f6759] tracking-wider uppercase block mb-1">
              Beobachtung am Umkehrpunkt
            </span>
            <p className="text-xs sm:text-sm text-[#2e2c27] font-normal leading-relaxed">
              {data.begruendung}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#eee8dd]/60 border border-[#2e2c27]/[0.04]">
            <span className="text-[11px] font-semibold text-[#6f6759] tracking-wider uppercase block mb-1">
              Lastbegründung ({weight.label})
            </span>
            <p className="text-xs sm:text-sm text-[#2e2c27] font-normal leading-relaxed">
              {data.gewicht.begruendung}
            </p>
          </div>
        </div>
      </div>

      {/* 2. AKTIV DIE TECHNIK VERBESSERN (Apple Workout Style) */}
      <div className="rounded-3xl bg-[#ffffff] border border-[#2e2c27]/[0.08] p-6 sm:p-7 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1 rounded-lg bg-[#c23a20]/10 text-[#c23a20] border border-[#c23a20]/20">
                <Zap className="w-4 h-4" />
              </span>
              <h3 className="text-sm sm:text-base font-semibold tracking-tight text-[#2e2c27]">
                Technik aktiv verbessern: Vorbereitung für Satz 2
              </h3>
            </div>
            <p className="text-xs text-[#6f6759]">
              Setze diesen 3-Schritte-Ablauf direkt vor deinem nächsten Satz um.
            </p>
          </div>

          {/* Apple Activity Progress Pill */}
          <div className="flex items-center gap-2 bg-[#eee8dd] px-3.5 py-1.5 rounded-full border border-[#2e2c27]/10 self-start sm:self-auto">
            <span className="text-xs text-[#6f6759] font-medium">Bereit:</span>
            <span className={`text-xs font-bold ${improvementProgress === 100 ? "text-[#5f6b25]" : "text-[#a4761a]"}`}>
              {improvementProgress}%
            </span>
            <div className="w-16 h-1.5 bg-[#e2dacb] rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${improvementProgress === 100 ? "bg-[#5f6b25]" : "bg-[#a4761a]"}`}
                style={{ width: `${improvementProgress}%` }}
              />
            </div>
          </div>
        </div>

        {/* 3 Step Interactive Improvement Pipeline */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* STEP 1: Der Wichtigste Cue */}
          <div
            className={`p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between gap-4 ${
              cueMemorized
                ? "bg-[#5f6b25]/5 border-[#5f6b25]/30"
                : "bg-[#eee8dd]/60 border-[#2e2c27]/[0.06]"
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#6f6759]">
                  Schritt 1 • Mentaler Cue
                </span>
                {cueMemorized && (
                  <span className="text-[11px] text-[#5f6b25] flex items-center gap-1 font-semibold">
                    <Check className="w-3.5 h-3.5" />
                    Eingeprägt
                  </span>
                )}
              </div>

              <span className="text-xs text-[#8f2d1a] font-medium block mb-1">
                Hauptfehler: {data.derWichtigsteFehler}
              </span>

              <div className="p-3.5 rounded-xl bg-[#2e2c27]/40 border border-[#2e2c27]/5 my-2">
                <p className="text-xs sm:text-sm font-semibold text-[#2e2c27] leading-snug">
                  "{data.korrektur}"
                </p>
              </div>

              <p className="text-[11px] text-[#6f6759]">
                Wende diesen einen Cue genau am tiefsten Umkehrpunkt an.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setCueMemorized(!cueMemorized)}
              className={`w-full py-2.5 rounded-full text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
                cueMemorized
                  ? "bg-[#5f6b25]/20 text-[#5f6b25] border border-[#5f6b25]/30 hover:bg-[#5f6b25]/30"
                  : "bg-[#e2dacb] hover:bg-[#cfc6b5] text-[#2e2c27] border border-[#2e2c27]/10"
              }`}
            >
              {cueMemorized ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#5f6b25]" />
                  <span>Cue verinnerlicht</span>
                </>
              ) : (
                <span>Cue einprägen & abhaken</span>
              )}
            </button>
          </div>

          {/* STEP 2: Zubringer-Drill & Timer */}
          <div
            className={`p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between gap-4 ${
              drillCompleted
                ? "bg-[#5f6b25]/5 border-[#5f6b25]/30"
                : "bg-[#eee8dd]/60 border-[#2e2c27]/[0.06]"
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#6f6759]">
                  Schritt 2 • Zubringer-Drill
                </span>
                <button
                  type="button"
                  onClick={() => handleTriggerAgentAction("generate_drill")}
                  disabled={isAgentExecuting}
                  className="text-[11px] text-[#6f6759] hover:text-[#2e2c27] flex items-center gap-1"
                  title="Drill neu generieren"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Neu</span>
                </button>
              </div>

              {activeDrill ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs sm:text-sm font-semibold text-[#2e2c27]">
                      {activeDrill.title}
                    </h4>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#e2dacb] text-[#5f5849] border border-[#2e2c27]/10">
                      {activeDrill.setsAndReps}
                    </span>
                  </div>

                  <p className="text-xs text-[#5f5849] leading-relaxed">
                    {activeDrill.executionCue}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-[#6f6759] italic">
                  Gezielter Drill zur biomechanischen Stabilisierung am Umkehrpunkt.
                </p>
              )}

              {/* Apple Watch style Mini Drill Timer */}
              <div className="mt-3 p-3 rounded-xl bg-[#2e2c27]/40 border border-[#2e2c27]/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#a4761a]" />
                  <span className="text-xs text-[#6f6759] font-medium">
                    Drill-Pause:
                  </span>
                  <span className="text-xs font-mono font-bold text-[#2e2c27]">
                    00:{drillTimerSeconds < 10 ? `0${drillTimerSeconds}` : drillTimerSeconds}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setIsTimerRunning(!isTimerRunning)}
                    className="p-1.5 rounded-full bg-[#e2dacb] hover:bg-[#cfc6b5] text-[#2e2c27] transition"
                    title={isTimerRunning ? "Pausieren" : "Starten"}
                  >
                    {isTimerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-[#2e2c27]" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsTimerRunning(false);
                      setDrillTimerSeconds(45);
                    }}
                    className="p-1.5 rounded-full bg-[#e2dacb] hover:bg-[#cfc6b5] text-[#6f6759] hover:text-[#2e2c27] transition"
                    title="Reset"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setDrillCompleted(!drillCompleted)}
              className={`w-full py-2.5 rounded-full text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
                drillCompleted
                  ? "bg-[#5f6b25]/20 text-[#5f6b25] border border-[#5f6b25]/30 hover:bg-[#5f6b25]/30"
                  : "bg-[#e2dacb] hover:bg-[#cfc6b5] text-[#2e2c27] border border-[#2e2c27]/10"
              }`}
            >
              {drillCompleted ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#5f6b25]" />
                  <span>Drill absolviert</span>
                </>
              ) : (
                <span>Drill als erledigt markieren</span>
              )}
            </button>
          </div>

          {/* STEP 3: Satz 2 Aufnehmen (Clean Apple Action) */}
          <div className="p-5 rounded-2xl bg-[#eee8dd]/60 border border-[#2e2c27]/[0.06] flex flex-col justify-between gap-4">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#6f6759] block mb-2">
                Schritt 3 • Satz 2 Ausführen
              </span>

              <h4 className="text-xs sm:text-sm font-semibold text-[#2e2c27] mb-1">
                Bereit für den nächsten Satz
              </h4>
              <p className="text-xs text-[#5f5849] leading-relaxed mb-3">
                Lade die nächste Aufnahme hoch. Der Coach vergleicht, ob der Umkehrpunkt stabilisiert wurde.
              </p>

              <div className="p-3 rounded-xl bg-[#2e2c27]/40 border border-[#2e2c27]/5 text-[11px] text-[#6f6759] space-y-1">
                <div className="flex items-center gap-1.5 text-[#2e2c27] font-medium">
                  <Target className="w-3.5 h-3.5 text-[#c23a20]" />
                  <span>Fokus-Checkliste:</span>
                </div>
                <p>• 45°-Kamerawinkel beibehalten</p>
                <p>• Nur auf den Satz-Cue achten</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (onStartNextSet) {
                  onStartNextSet(data.exerciseName, data.korrektur);
                }
              }}
              className="w-full py-3 rounded-full bg-[#2e2c27] hover:bg-[#1f1d19] text-[#faf6ef] text-xs font-semibold transition flex items-center justify-center gap-2 shadow-lg shadow-[#2e2c27]/40 active:scale-95"
            >
              <span>Satz 2 jetzt analysieren</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. MENTALE CUE-MATRIX in Apple Bento Karten */}
      <div className="rounded-3xl bg-[#ffffff] border border-[#2e2c27]/[0.08] p-6 sm:p-7 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-[#a4761a]/10 text-[#a4761a] border border-[#a4761a]/20">
              <Lightbulb className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm sm:text-base font-semibold tracking-tight text-[#2e2c27]">
                Mentale Cue-Matrix
              </h3>
              <p className="text-xs text-[#6f6759]">
                Wähle die mentale Anweisung, die sich für dich am intuitivsten anfühlt.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleTriggerAgentAction("refine_cues")}
            disabled={isAgentExecuting}
            className="text-xs text-[#6f6759] hover:text-[#2e2c27] flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#eee8dd] border border-[#2e2c27]/10 transition"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Neu variieren</span>
          </button>
        </div>

        {activeCues ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            {/* Externer Cue */}
            <div className="p-4 rounded-2xl bg-[#eee8dd]/60 border border-[#2e2c27]/[0.04] hover:border-[#5f6b25]/30 transition">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#5f6b25]">
                  Externer Fokus (Objekt / Umwelt)
                </span>
                <span className="text-[10px] text-[#6f6759]">Kraftübertragung</span>
              </div>
              <p className="text-xs sm:text-sm font-medium text-[#2e2c27] leading-relaxed">
                "{activeCues.externalCue}"
              </p>
              <p className="text-[11px] text-[#6f6759] mt-2">
                Konzentriere dich auf den Boden oder den Lastpfad.
              </p>
            </div>

            {/* Interner Cue */}
            <div className="p-4 rounded-2xl bg-[#eee8dd]/60 border border-[#2e2c27]/[0.04] hover:border-[#c23a20]/30 transition">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#c23a20]">
                  Interner Fokus (Muskelkontraktion)
                </span>
                <span className="text-[10px] text-[#6f6759]">Aktivierung</span>
              </div>
              <p className="text-xs sm:text-sm font-medium text-[#2e2c27] leading-relaxed">
                "{activeCues.internalCue}"
              </p>
              <p className="text-[11px] text-[#6f6759] mt-2">
                Spüre die gezielte Kontraktion der stabilisierenden Muskeln.
              </p>
            </div>

            {/* Visuelle Metapher */}
            <div className="p-4 rounded-2xl bg-[#eee8dd]/60 border border-[#2e2c27]/[0.04] hover:border-[#a4761a]/30 transition">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#a4761a]">
                  Visuelles Bild (Metapher)
                </span>
                <span className="text-[10px] text-[#6f6759]">Körpergefühl</span>
              </div>
              <p className="text-xs sm:text-sm font-medium text-[#2e2c27] leading-relaxed">
                "{activeCues.visualCue}"
              </p>
              <p className="text-[11px] text-[#6f6759] mt-2">
                Rufe dieses Bild kurz vor der Einleitung der Bewegung ab.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-[#eee8dd]/30 border border-dashed border-[#e2dacb] text-center text-xs text-[#6f6759]">
            Klicke auf "Neu variieren", um Cues für deinen nächsten Satz anzufordern.
          </div>
        )}
      </div>

      {/* Satz-Simulation Callout if triggered */}
      {isAgentExecuting && (
        <div className="p-4 bg-[#ffffff] border border-[#2e2c27]/10 rounded-2xl flex items-center gap-3 text-[#2e2c27] text-xs">
          <Loader2 className="w-4 h-4 text-[#c23a20] animate-spin shrink-0" />
          <span>{agentActionMessage}</span>
        </div>
      )}

      {simulationText && (
        <div className="p-5 bg-[#ffffff] border border-[#2e2c27]/10 rounded-2xl space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#c23a20]">
            <Bot className="w-4 h-4" />
            <span>Satz-2 Simulation des Kraftsport-Agenten:</span>
          </div>
          <p className="text-xs text-[#5f5849] leading-relaxed font-mono whitespace-pre-wrap">
            {simulationText}
          </p>
        </div>
      )}

      {/* 4. DETAILS DER BEOBACHTUNG (Apple Bento Grid) */}
      {data.beobachteteKriterien && (
        <div className="rounded-3xl bg-[#ffffff] border border-[#2e2c27]/[0.08] p-6 shadow-xl space-y-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[#6f6759]">
            Geprüfte Bewegungsparameter im Video
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.beobachteteKriterien.bewegungsumfang && (
              <div className="p-3.5 rounded-2xl bg-[#eee8dd]/60 border border-[#2e2c27]/[0.04]">
                <span className="text-[11px] font-semibold text-[#6f6759] block mb-1">
                  Bewegungsumfang (Tiefe / ROM)
                </span>
                <p className="text-xs text-[#2e2c27]">
                  {data.beobachteteKriterien.bewegungsumfang}
                </p>
              </div>
            )}
            {data.beobachteteKriterien.gelenkstellung && (
              <div className="p-3.5 rounded-2xl bg-[#eee8dd]/60 border border-[#2e2c27]/[0.04]">
                <span className="text-[11px] font-semibold text-[#6f6759] block mb-1">
                  Gelenkstellung & Wirbelsäule
                </span>
                <p className="text-xs text-[#2e2c27]">
                  {data.beobachteteKriterien.gelenkstellung}
                </p>
              </div>
            )}
            {data.beobachteteKriterien.tempo && (
              <div className="p-3.5 rounded-2xl bg-[#eee8dd]/60 border border-[#2e2c27]/[0.04]">
                <span className="text-[11px] font-semibold text-[#6f6759] block mb-1">
                  Tempo (Ablassen / Umkehrung)
                </span>
                <p className="text-xs text-[#2e2c27]">
                  {data.beobachteteKriterien.tempo}
                </p>
              </div>
            )}
            {data.beobachteteKriterien.schwung && (
              <div className="p-3.5 rounded-2xl bg-[#eee8dd]/60 border border-[#2e2c27]/[0.04]">
                <span className="text-[11px] font-semibold text-[#6f6759] block mb-1">
                  Körperspannung vs. Schwung
                </span>
                <p className="text-xs text-[#2e2c27]">
                  {data.beobachteteKriterien.schwung}
                </p>
              </div>
            )}
            {data.beobachteteKriterien.symmetrie && (
              <div className="p-3.5 rounded-2xl bg-[#eee8dd]/60 border border-[#2e2c27]/[0.04]">
                <span className="text-[11px] font-semibold text-[#6f6759] block mb-1">
                  Symmetrie
                </span>
                <p className="text-xs text-[#2e2c27]">
                  {data.beobachteteKriterien.symmetrie}
                </p>
              </div>
            )}
            {data.beobachteteKriterien.konsistenz && (
              <div className="p-3.5 rounded-2xl bg-[#eee8dd]/60 border border-[#2e2c27]/[0.04]">
                <span className="text-[11px] font-semibold text-[#6f6759] block mb-1">
                  Konsistenz gegen Satzende
                </span>
                <p className="text-xs text-[#2e2c27]">
                  {data.beobachteteKriterien.konsistenz}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Was nicht beurteilt werden konnte */}
      {data.wasNichtBeurteilbar && (
        <div className="p-4 rounded-2xl bg-[#ffffff] border border-[#2e2c27]/[0.08] flex items-start gap-3 text-[#5f5849]">
          <EyeOff className="w-5 h-5 text-[#6f6759] shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-semibold text-[#2e2c27] block mb-0.5">
              Was optisch nicht beurteilt werden konnte:
            </span>
            <p className="text-[#6f6759] leading-relaxed">
              {data.wasNichtBeurteilbar}
            </p>
          </div>
        </div>
      )}

      {/* 5. KI-AGENT PIPELINE TRACE */}
      <div className="rounded-3xl bg-[#ffffff] border border-[#2e2c27]/[0.08] p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[#6f6759]" />
            <span className="text-xs font-semibold text-[#2e2c27] tracking-wide">
              5-Stufen Agent-Pipeline
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowAgentTraceDetails(!showAgentTraceDetails)}
            className="text-xs text-[#6f6759] hover:text-[#2e2c27] flex items-center gap-1 transition"
          >
            <span>{showAgentTraceDetails ? "Weniger Details" : "Details einblenden"}</span>
            {showAgentTraceDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Apple watchOS style segmented pills */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {agentTraceList.map((step, idx) => (
            <div
              key={step.phaseId || idx}
              className="p-2.5 rounded-xl bg-[#eee8dd]/60 border border-[#2e2c27]/[0.04] text-[11px]"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] font-mono text-[#6f6759] uppercase">
                  Phase 0{idx + 1}
                </span>
                <span className={`w-1.5 h-1.5 rounded-full ${step.status === "warning" ? "bg-[#c23a20]" : "bg-[#5f6b25]"}`} />
              </div>
              <p className="font-medium text-[#2e2c27] truncate">{step.name.split(":")[0]}</p>
            </div>
          ))}
        </div>

        {showAgentTraceDetails && (
          <div className="pt-2 text-xs text-[#6f6759] border-t border-[#2e2c27]/[0.06] space-y-2">
            <p>
              Der Agent hat die Video-Wiederholungen nach Beginn des Ablassens, Umkehrpunkt und Lockout segmentiert.
              Der Hauptfokus lag auf dem tiefsten Punkt bei <strong>{data.exerciseName || "der Übung"}</strong>.
            </p>
          </div>
        )}
      </div>

      {/* 6. EXPANDABLE VERBATIM TEXT ACCORDION */}
      <div className="rounded-2xl bg-[#ffffff]/50 border border-[#2e2c27]/[0.06] overflow-hidden">
        <button
          type="button"
          onClick={() => setShowRawOutput(!showRawOutput)}
          className="w-full px-4 py-3 flex items-center justify-between text-xs text-[#6f6759] hover:text-[#2e2c27] transition"
        >
          <span className="font-mono">Unformatierter Coach-Bericht (Rohausgabe)</span>
          <div className="flex items-center gap-2">
            {showRawOutput ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </div>
        </button>

        {showRawOutput && (
          <div className="p-4 border-t border-[#2e2c27]/[0.06] bg-[#2e2c27]/50">
            <pre className="text-xs text-[#5f5849] font-mono whitespace-pre-wrap leading-relaxed">
              {data.rawOutputText}
            </pre>
          </div>
        )}
      </div>

      {/* Bottom Floating-style Action Dock (Without 4K Studio!) */}
      <div className="grid grid-cols-1 gap-3 pt-2">

        <div className="p-4 rounded-2xl bg-[#ffffff] border border-[#2e2c27]/[0.08] flex items-center justify-between gap-3">
          <div>
            <h5 className="text-xs font-semibold text-[#2e2c27]">
              Nächsten Satz aufnehmen
            </h5>
            <p className="text-[11px] text-[#6f6759]">
              Übertrage die Korrektur direkt in Satz 2 mit Videoanalyse.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (onStartNextSet) {
                onStartNextSet(data.exerciseName, data.korrektur);
              }
            }}
            className="px-4 py-2 rounded-full bg-[#2e2c27] hover:bg-[#1f1d19] text-[#faf6ef] text-xs font-medium shrink-0 transition flex items-center gap-1 shadow-md shadow-[#2e2c27]/40 active:scale-95"
          >
            <span>Satz 2 starten</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
