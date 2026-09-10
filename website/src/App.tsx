import React, { useState, useEffect } from "react";
import {
  Video,
  Dumbbell,
  MessageSquare,
  AlertCircle,
  CheckCircle,
  FileText,
  Activity,
  ArrowRight,
  ChevronRight,
} from "lucide-react";
import { VideoRecorderAndUploader } from "./components/VideoRecorderAndUploader";
import { CoachFeedbackView } from "./components/CoachFeedbackView";
import { GeminiChatBot } from "./components/GeminiChatBot";
import {
  ChatMessage,
  ChatRole,
  GeminiModelChoice,
  ExerciseAnalysisData,
} from "./types";

type ActiveTab = "video" | "feedback" | "chat";

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("video");
  const [selectedExerciseHint, setSelectedExerciseHint] = useState<string>("Liegestütze (Push-ups)");

  // Video and Exercise Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [exerciseAnalysis, setExerciseAnalysis] = useState<ExerciseAnalysisData | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Multi-turn Chat state (gemini-3.1-pro-preview / 3.5-flash / 3.1-flash-lite)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem("coach_chat_messages");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);
  const [activeChatRole, setActiveChatRole] = useState<ChatRole>("technique_coach");
  const [initialChatPrompt, setInitialChatPrompt] = useState<string | null>(null);

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("coach_chat_messages", JSON.stringify(chatMessages));
    } catch (e) {
      console.warn("Chatverlauf konnte nicht gespeichert werden:", e);
    }
  }, [chatMessages]);

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
      setActiveTab("feedback");
      showToast(`Coach-Urteil: ${data.data.urteil.toUpperCase()}`, "success");
    } catch (err: any) {
      console.error("Fehler bei Videoanalyse:", err);
      setAnalysisError(err.message || "Analyse fehlgeschlagen.");
      showToast(err.message || "Analyse fehlgeschlagen", "error");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handle Multi-Turn Chat
  const handleSendMessage = async (
    text: string,
    role: ChatRole,
    modelChoice?: GeminiModelChoice
  ) => {
    const userMsg: ChatMessage = {
      id: `msg-user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const newHistory = [...chatMessages, userMsg];
    setChatMessages(newHistory);
    setIsChatLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newHistory.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          roleType: role,
          modelOverride: modelChoice,
          exerciseAnalysisContext: exerciseAnalysis,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Keine Antwort vom Coach erhalten.");
      }

      const assistantMsg: ChatMessage = {
        id: `msg-bot-${Date.now()}`,
        role: "assistant",
        content: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        modelUsed: data.modelUsed,
      };

      setChatMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error("Fehler im Chat:", err);
      const errorMsg: ChatMessage = {
        id: `msg-err-${Date.now()}`,
        role: "assistant",
        content: `⚠️ Fehler bei der Coach-Antwort: ${err.message || "Bitte erneut versuchen."}`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setChatMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleOpenChatWithDiagnosis = (prompt?: string) => {
    if (prompt) {
      setInitialChatPrompt(prompt);
    }
    setActiveTab("chat");
  };

  const handleStartNextSet = (exerciseName?: string, cue?: string) => {
    if (exerciseName) {
      setSelectedExerciseHint(exerciseName);
    }
    setActiveTab("video");
    showToast(`Nächster Satz vorbereitet: "${cue || "Fokus am Umkehrpunkt"}"`, "success");
  };

  return (
    <div className="min-h-screen bg-black text-[#f5f5f7] flex flex-col font-sans selection:bg-[#0071e3]/30 selection:text-white">
      {/* Apple-style Global Nav Bar */}
      <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/[0.08] transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-18 flex items-center justify-between gap-4">
          {/* Brand Logo & Apple Style Monogram */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setActiveTab("video")}
              className="flex items-center gap-2 text-left group"
            >
              {/* Apple minimalist glyph */}
              <div className="w-10 h-10 rounded-xl bg-[#1d1d1f] border border-white/10 flex items-center justify-center text-white group-hover:border-white/30 transition">
                <Dumbbell className="w-5 h-5" />
              </div>
              <span className="text-lg sm:text-xl font-semibold tracking-tight text-[#f5f5f7]">
                Kraftsport-Coach
              </span>
            </button>
          </div>

          {/* Apple Segmented Control Tab Switcher (Without 4K Studio) */}
          <nav className="flex items-center gap-1 bg-[#1d1d1f]/90 p-1 rounded-full border border-white/[0.08] shadow-inner">
            <button
              id="tab-btn-video"
              type="button"
              onClick={() => setActiveTab("video")}
              className={`flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-medium transition duration-150 ${
                activeTab === "video"
                  ? "bg-white text-black font-semibold shadow-sm"
                  : "text-[#86868b] hover:text-[#f5f5f7]"
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              <span>Video</span>
            </button>

            <button
              id="tab-btn-feedback"
              type="button"
              onClick={() => setActiveTab("feedback")}
              className={`flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-medium transition duration-150 relative ${
                activeTab === "feedback"
                  ? "bg-white text-black font-semibold shadow-sm"
                  : "text-[#86868b] hover:text-[#f5f5f7]"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Coach-Urteil</span>
              {exerciseAnalysis && (
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    exerciseAnalysis.urteil === "gut"
                      ? "bg-[#30d158]"
                      : exerciseAnalysis.urteil === "brauchbar"
                      ? "bg-[#ffd60a]"
                      : "bg-[#ff453a]"
                  }`}
                />
              )}
            </button>

            <button
              id="tab-btn-chat"
              type="button"
              onClick={() => setActiveTab("chat")}
              className={`flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-medium transition duration-150 ${
                activeTab === "chat"
                  ? "bg-white text-black font-semibold shadow-sm"
                  : "text-[#86868b] hover:text-[#f5f5f7]"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Dialog</span>
              {chatMessages.length > 0 && (
                <span className="text-[9px] bg-[#2c2c2e] text-[#a1a1a6] px-1.5 py-0.2 rounded-full font-mono">
                  {chatMessages.length}
                </span>
              )}
            </button>
          </nav>

          {/* Right Status Pill (Apple Watch style) */}
          <div className="hidden lg:flex items-center gap-2 text-xs text-[#86868b]">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#161617] border border-white/[0.06] text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#30d158]" />
              <span>Gemini 3.5 Flash</span>
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Showcase */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-4 sm:py-5 flex flex-col gap-5">
        {/* Compact hero: title left, claim right — keeps the vertical space for the video area */}
        <section className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 sm:gap-6">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#161617] border border-white/[0.08] text-[11px] text-[#86868b]">
              <Activity className="w-3 h-3 text-[#2997ff]" />
              <span>Biomechanische Video-Technikanalyse</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#f5f5f7]">
              Präzision am Umkehrpunkt.
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#86868b] max-w-md sm:text-right font-normal leading-relaxed">
            Objektive Beurteilung von Bewegungsumfang, Tempo, Gelenkachsen und Rumpfspannung ohne Verharmlosung.
          </p>
        </section>

        {/* Global Loading Banner during Analysis (Apple Style) */}
        {isAnalyzing && (
          <div className="p-4 bg-[#161617] border border-[#2997ff]/40 rounded-2xl flex items-center justify-between gap-4 shadow-lg backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full border-2 border-[#2997ff] border-t-transparent animate-spin" />
              <div>
                <p className="text-xs sm:text-sm font-semibold text-[#f5f5f7]">
                  Kraftsport-Coach analysiert die Bewegung...
                </p>
                <p className="text-[11px] text-[#86868b]">
                  Phasen-Segmentierung, tiefster Punkt, Ellenbogenwinkel und Lastpfad.
                </p>
              </div>
            </div>
            <span className="text-[10px] text-[#2997ff] font-mono px-2.5 py-1 bg-[#2997ff]/10 rounded-full border border-[#2997ff]/20">
              Analysiere
            </span>
          </div>
        )}

        {/* Error Alert */}
        {analysisError && (
          <div className="p-4 bg-[#1c1213] border border-[#ff453a]/40 rounded-2xl flex items-center justify-between text-xs text-[#ff9f9a]">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#ff453a] shrink-0" />
              <span>{analysisError}</span>
            </div>
            <button
              type="button"
              onClick={() => setAnalysisError(null)}
              className="text-[#86868b] hover:text-white text-xs underline"
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
                onOpenChatWithDiagnosis={handleOpenChatWithDiagnosis}
                onStartNextSet={handleStartNextSet}
              />
            ) : (
              <div className="p-12 text-center bg-[#161617] border border-white/[0.08] rounded-3xl flex flex-col items-center">
                <div className="w-12 h-12 rounded-2xl bg-[#1d1d1f] border border-white/10 flex items-center justify-center text-[#86868b] mb-3">
                  <Dumbbell className="w-6 h-6" />
                </div>
                <h3 className="text-sm sm:text-base font-semibold text-[#f5f5f7] mb-1">
                  Noch keine Videoanalyse vorhanden
                </h3>
                <p className="text-xs text-[#86868b] max-w-sm mb-5 leading-relaxed">
                  Nimm einen Satz direkt mit der Kamera auf oder lade ein Video deiner Liegestütze, Kniebeuge oder deines Kreuzhebens hoch.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab("video")}
                  className="px-5 py-2.5 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-full text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
                >
                  <span>Video aufnehmen oder hochladen</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Multi-Turn Coach Dialog (gemini-3.1-pro-preview / 3.5-flash / 3.1-flash-lite) */}
        {activeTab === "chat" && (
          <GeminiChatBot
            messages={chatMessages}
            onSendMessage={handleSendMessage}
            isLoading={isChatLoading}
            activeRole={activeChatRole}
            onChangeRole={setActiveChatRole}
            currentExerciseContext={exerciseAnalysis}
            onClearHistory={() => setChatMessages([])}
            initialPromptSuggestion={initialChatPrompt}
          />
        )}
      </main>

      {/* Floating Apple-style Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 transition-all duration-200">
          <div
            className={`px-4 py-2.5 rounded-full shadow-2xl text-xs font-medium flex items-center gap-2 backdrop-blur-xl border ${
              toastMessage.type === "success"
                ? "bg-[#161617]/95 text-[#f5f5f7] border-white/10"
                : "bg-[#1c1213]/95 text-[#ff9f9a] border-[#ff453a]/40"
            }`}
          >
            {toastMessage.type === "success" ? (
              <CheckCircle className="w-3.5 h-3.5 text-[#30d158] shrink-0" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-[#ff453a] shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Apple.com/chde Style Clean Footer */}
      <footer className="border-t border-white/[0.08] py-8 bg-black text-[#86868b] text-xs mt-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-4">
          <div className="border-b border-white/[0.06] pb-4 text-[11px] leading-relaxed text-[#86868b]">
            <p>
              1. Die Videoanalyse liefert technische Beobachtungen und biomechanische Orientierungshilfen am Umkehrpunkt. Sie dient sportwissenschaftlichen Zwecken und ersetzt keine medizinische, orthopädische oder physiotherapeutische Befundung.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px]">
            <span>
              Copyright © 2026 Kraftsport-Coach. Alle Rechte vorbehalten.
            </span>
            <div className="flex flex-wrap items-center gap-4 text-[#86868b]">
              <span>Schweiz (Deutsch)</span>
              <span className="text-white/20">•</span>
              <span>Datenschutz</span>
              <span className="text-white/20">•</span>
              <span>Nutzungsbedingungen</span>
              <span className="text-white/20">•</span>
              <span className="font-mono text-[#a1a1a6]">Gemini 3.5 & 3.1 Pro</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
