import React, { useState, useEffect, useRef } from "react";
import {
  Video,
  Dumbbell,
  AlertCircle,
  CheckCircle,
  FileText,
  Activity,
  ArrowRight,
  ChevronDown,
} from "lucide-react";
import { VideoRecorderAndUploader } from "./components/VideoRecorderAndUploader";
import { CoachFeedbackView } from "./components/CoachFeedbackView";
import { ExerciseAnalysisData } from "./types";

type ActiveTab = "video" | "feedback";

const NAV_ITEMS: { id: ActiveTab; label: string }[] = [
  { id: "video", label: "Video" },
  { id: "feedback", label: "Coach-Urteil" },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("video");
  const appRef = useRef<HTMLElement>(null);
  const [selectedExerciseHint, setSelectedExerciseHint] = useState<string>("Liegestütze (Push-ups)");

  // Video and Exercise Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [exerciseAnalysis, setExerciseAnalysis] = useState<ExerciseAnalysisData | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);


  // Notification Toast
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Nav and hero buttons both switch tab and carry you past the opening shot
  const goToTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    requestAnimationFrame(() =>
      appRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    );
  };

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };


  // Handle Video Analysis via /api/analyze-exercise-video
  const handleAnalyzeVideo = async (
    videoBase64: string | null,
    mimeType: string,
    frames: string[],
    exerciseHint?: string
  ) => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    showToast("Übungsvideo wird analysiert – Coach prüft Umkehrpunkt...", "success");

    try {
      const shouldIncludeVideo =
        typeof videoBase64 === "string" &&
        videoBase64.length > 50 &&
        videoBase64.length < 10 * 1024 * 1024;

      const res = await fetch("/api/analyze-exercise-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoBase64: shouldIncludeVideo ? videoBase64 : null,
          mimeType: mimeType || "video/mp4",
          videoFrames: frames,
          exerciseHint: exerciseHint || selectedExerciseHint,
          language: "de",
        }),
      });

      const resText = await res.text();
      let data: any;
      try {
        data = JSON.parse(resText);
      } catch (parseErr) {
        console.error("Non-JSON response received:", resText.slice(0, 300));
        throw new Error(
          res.status === 413
            ? "Die Aufnahme war zu gross. Bitte eine kürzere Aufnahme (5–12 Sek.) wählen."
            : `Server antwortete mit Status ${res.status}. Bitte erneut versuchen.`
        );
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Videoanalyse konnte nicht abgeschlossen werden.");
      }

      setExerciseAnalysis(data.data);
      goToTab("feedback");
      showToast(`Coach-Urteil: ${data.data.urteil.toUpperCase()}`, "success");
    } catch (err: any) {
      console.error("Fehler bei Videoanalyse:", err);
      setAnalysisError(err.message || "Analyse fehlgeschlagen.");
      showToast(err.message || "Analyse fehlgeschlagen", "error");
    } finally {
      setIsAnalyzing(false);
    }
  };



  const handleStartNextSet = (exerciseName?: string, cue?: string) => {
    if (exerciseName) {
      setSelectedExerciseHint(exerciseName);
    }
    goToTab("video");
    showToast(`Nächster Satz vorbereitet: "${cue || "Fokus am Umkehrpunkt"}"`, "success");
  };

  return (
    <div className="min-h-screen text-[#2e2c27] flex flex-col font-sans selection:bg-[#c23a20]/30 selection:text-[#2e2c27]">
      {/* Nav in the oace cut: links left, wordmark centred, status right */}
      <header className="sticky top-0 z-50 bg-[#faf6ef]/90 backdrop-blur-xl border-b border-[#2e2c27]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-18 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <nav className="justify-self-start flex items-center gap-4 sm:gap-7">
            {NAV_ITEMS.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`tab-btn-${item.id}`}
                  type="button"
                  onClick={() => goToTab(item.id)}
                  className={`relative flex items-center gap-1.5 text-[11px] sm:text-xs uppercase tracking-[0.08em] font-semibold transition ${
                    active ? "text-[#2e2c27]" : "text-[#6f6759] hover:text-[#2e2c27]"
                  }`}
                >
                  <span>{item.label}</span>
                  {item.id === "feedback" && exerciseAnalysis && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        exerciseAnalysis.urteil === "gut"
                          ? "bg-[#5f6b25]"
                          : exerciseAnalysis.urteil === "brauchbar"
                          ? "bg-[#a4761a]"
                          : "bg-[#c23a20]"
                      }`}
                    />
                  )}
                  <span
                    className={`absolute -bottom-1.5 left-0 right-0 h-[2px] bg-[#2e2c27] transition-opacity ${
                      active ? "opacity-100" : "opacity-0"
                    }`}
                  />
                </button>
              );
            })}
          </nav>

          <button
            type="button"
            onClick={() => goToTab("video")}
            className="justify-self-center flex items-center gap-2 group"
          >
            <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#2e2c27] flex items-center justify-center text-[#faf6ef] group-hover:bg-[#1f1d19] transition">
              <Dumbbell className="w-4 h-4 sm:w-[18px] sm:h-[18px]" strokeWidth={2.5} />
            </span>
            <span className="text-sm sm:text-lg font-black uppercase tracking-[-0.02em] leading-none text-[#2e2c27] whitespace-nowrap">
              Kraftsport Coach
            </span>
          </button>

          <div className="justify-self-end hidden lg:flex items-center gap-2 text-xs text-[#6f6759]">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#ffffff] border border-[#2e2c27]/[0.06] text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#5f6b25]" />
              <span>Gemini 3.5 Flash</span>
            </span>
          </div>
        </div>
      </header>

      {/* Opening shot. The photo carries its own analysis overlay — live badge,
          rep counter, form-quality card — so nothing of ours is laid over it
          beyond the scroll cue; the headline sits in the band underneath. */}
      <section className="relative w-full">
        {/* Height is the viewport minus the header minus exactly the headline,
            so the picture fills everything else and only "Präzision am
            Umkehrpunkt." shows below it before you scroll. */}
        <div className="relative w-full h-[calc(100svh-4rem-8rem)] sm:h-[calc(100svh-4.5rem-12.5rem)] md:h-[calc(100svh-4.5rem-14rem)] min-h-[240px] overflow-hidden bg-[#000000]">
          <img
            src="/hero.png"
            width={1698}
            height={680}
            fetchPriority="high"
            alt="Liegestütze in der Seitenansicht, mit eingeblendeter Technikanalyse: Kopfhaltung, Körperlinie, Ellenbogenwinkel und Beinstreckung"
            className="absolute inset-0 w-full h-full object-cover object-center"
          />

          {/* just enough darkening at the very bottom to carry the cue */}
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#000000]/70 to-transparent" />

          <button
            type="button"
            onClick={() => goToTab("video")}
            aria-label="Nach unten scrollen"
            className="absolute bottom-5 left-1/2 -translate-x-1/2 text-[#faf6ef]/80 hover:text-[#faf6ef] transition"
          >
            <ChevronDown className="w-6 h-6 animate-bounce" />
          </button>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 sm:pt-16">
          <h1 className="font-black uppercase tracking-[-0.03em] leading-[0.92] text-4xl sm:text-6xl md:text-7xl max-w-3xl text-[#2e2c27]">
            Präzision am
            <br />
            Umkehrpunkt.
          </h1>
          <p className="mt-4 sm:mt-5 text-[#6f6759] text-sm sm:text-base max-w-xl leading-relaxed">
            Objektive Beurteilung von Bewegungsumfang, Tempo, Gelenkachsen und Rumpfspannung
            ohne Verharmlosung.
          </p>
          <button
            type="button"
            onClick={() => goToTab("video")}
            className="mt-8 px-9 py-4 sm:px-10 sm:py-[18px] rounded-full bg-[#2e2c27] hover:bg-[#1f1d19] text-[#faf6ef] text-base sm:text-lg font-semibold transition inline-flex items-center gap-2.5 shadow-sm active:scale-95"
          >
            <span>Analyse starten</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* Main Content Showcase */}
      <main
        ref={appRef}
        className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-10 flex flex-col gap-5 scroll-mt-16 sm:scroll-mt-[4.5rem]"
      >

        {/* Global Loading Banner during Analysis (Apple Style) */}
        {isAnalyzing && (
          <div className="p-4 bg-[#ffffff] border border-[#c23a20]/40 rounded-2xl flex items-center justify-between gap-4 shadow-lg backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full border-2 border-[#c23a20] border-t-transparent animate-spin" />
              <div>
                <p className="text-xs sm:text-sm font-semibold text-[#2e2c27]">
                  Kraftsport-Coach analysiert die Bewegung...
                </p>
                <p className="text-[11px] text-[#6f6759]">
                  Phasen-Segmentierung, tiefster Punkt, Ellenbogenwinkel und Lastpfad.
                </p>
              </div>
            </div>
            <span className="text-[10px] text-[#c23a20] font-mono px-2.5 py-1 bg-[#c23a20]/10 rounded-full border border-[#c23a20]/20">
              Analysiere
            </span>
          </div>
        )}

        {/* Error Alert */}
        {analysisError && (
          <div className="p-4 bg-[#fbeae6] border border-[#c23a20]/40 rounded-2xl flex items-center justify-between text-xs text-[#8f2d1a]">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#c23a20] shrink-0" />
              <span>{analysisError}</span>
            </div>
            <button
              type="button"
              onClick={() => setAnalysisError(null)}
              className="text-[#6f6759] hover:text-[#2e2c27] text-xs underline"
            >
              Schliessen
            </button>
          </div>
        )}

        {/* Tab 1: Video Recording and Uploading */}
        {activeTab === "video" && (
          <VideoRecorderAndUploader
            onAnalyzeVideo={handleAnalyzeVideo}
            isAnalyzing={isAnalyzing}
            selectedExerciseHint={selectedExerciseHint}
            onChangeExerciseHint={setSelectedExerciseHint}
          />
        )}

        {/* Tab 2: Detailed Coach Feedback & Technique Work */}
        {activeTab === "feedback" && (
          <div>
            {exerciseAnalysis ? (
              <CoachFeedbackView
                data={exerciseAnalysis}
                onStartNextSet={handleStartNextSet}
              />
            ) : (
              <div className="p-12 text-center bg-[#ffffff] border border-[#2e2c27]/[0.08] rounded-3xl flex flex-col items-center">
                <div className="w-12 h-12 rounded-2xl bg-[#eee8dd] border border-[#2e2c27]/10 flex items-center justify-center text-[#6f6759] mb-3">
                  <Dumbbell className="w-6 h-6" />
                </div>
                <h3 className="text-sm sm:text-base font-semibold text-[#2e2c27] mb-1">
                  Noch keine Videoanalyse vorhanden
                </h3>
                <p className="text-xs text-[#6f6759] max-w-sm mb-5 leading-relaxed">
                  Nimm einen Satz direkt mit der Kamera auf oder lade ein Video deiner Liegestütze, Kniebeuge oder deines Kreuzhebens hoch.
                </p>
                <button
                  type="button"
                  onClick={() => goToTab("video")}
                  className="px-5 py-2.5 bg-[#2e2c27] hover:bg-[#1f1d19] text-[#faf6ef] rounded-full text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
                >
                  <span>Video aufnehmen oder hochladen</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}

      </main>

      {/* Floating Apple-style Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 transition-all duration-200">
          <div
            className={`px-4 py-2.5 rounded-full shadow-2xl text-xs font-medium flex items-center gap-2 backdrop-blur-xl border ${
              toastMessage.type === "success"
                ? "bg-[#ffffff]/95 text-[#2e2c27] border-[#2e2c27]/10"
                : "bg-[#fbeae6]/95 text-[#8f2d1a] border-[#c23a20]/40"
            }`}
          >
            {toastMessage.type === "success" ? (
              <CheckCircle className="w-3.5 h-3.5 text-[#5f6b25] shrink-0" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-[#c23a20] shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Apple.com/chde Style Clean Footer */}
      <footer className="border-t border-[#2e2c27]/[0.08] py-8 bg-[#2e2c27]/50 backdrop-blur-sm text-[#6f6759] text-xs mt-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-4">
          <div className="border-b border-[#2e2c27]/[0.06] pb-4 text-[11px] leading-relaxed text-[#6f6759]">
            <p>
              1. Die Videoanalyse liefert technische Beobachtungen und biomechanische Orientierungshilfen am Umkehrpunkt. Sie dient sportwissenschaftlichen Zwecken und ersetzt keine medizinische, orthopädische oder physiotherapeutische Befundung.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px]">
            <span>
              Copyright © 2026 Kraftsport-Coach. Alle Rechte vorbehalten.
            </span>
            <div className="flex flex-wrap items-center gap-4 text-[#6f6759]">
              <span>Schweiz (Deutsch)</span>
              <span className="text-[#2e2c27]/20">•</span>
              <span>Datenschutz</span>
              <span className="text-[#2e2c27]/20">•</span>
              <span>Nutzungsbedingungen</span>
              <span className="text-[#2e2c27]/20">•</span>
              <span className="font-mono text-[#5f5849]">Gemini 3.5 & 3.1 Pro</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
