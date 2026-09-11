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
  LogIn,
} from "lucide-react";
import { VideoRecorderAndUploader } from "./components/VideoRecorderAndUploader";
import { CoachFeedbackView } from "./components/CoachFeedbackView";
import { AnalysedVideoStage } from "./components/AnalysedVideoStage";
import { AuthPanel, type AccountUser } from "./components/AuthPanel";
import { type CoachingSummary } from "./components/CoachingsView";
import { AccountView } from "./components/AccountView";
import { ExerciseAnalysisData } from "./types";
import { LanguageProvider, useLang, useT, serverMessage, verdictLabel } from "./i18n";

type ActiveTab = "video" | "feedback" | "account";

const NAV_ITEMS: { id: ActiveTab; label: [string, string]; signedInOnly?: boolean }[] = [
  { id: "video", label: ["Home", "Home"] },
  { id: "feedback", label: ["Coach-Urteil", "Verdict"] },
  // Signed out, the "Anmelden" button on the right already leads here — a nav
  // link to an empty account view would just say the same thing twice.
  { id: "account", label: ["Konto", "Account"], signedInOnly: true },
];

function AppShell() {
  const { lang, setLang } = useLang();
  const t = useT();
  const [activeTab, setActiveTab] = useState<ActiveTab>("video");
  const appRef = useRef<HTMLElement>(null);
  const [selectedExerciseHint, setSelectedExerciseHint] = useState<string>("Liegestütze (Push-ups)");

  // Video and Exercise Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [exerciseAnalysis, setExerciseAnalysis] = useState<ExerciseAnalysisData | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // The clip that was judged, kept so the verdict view can replay it
  const [analysedFile, setAnalysedFile] = useState<File | null>(null);
  const [analysedVideoUrl, setAnalysedVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!analysedFile) {
      setAnalysedVideoUrl(null);
      return;
    }
    const url = URL.createObjectURL(analysedFile);
    setAnalysedVideoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [analysedFile]);


  // Account and saved coachings
  const [user, setUser] = useState<AccountUser | null>(null);
  const [authChecked, setAuthChecked] = useState<boolean>(false);
  const [coachingList, setCoachingList] = useState<CoachingSummary[]>([]);
  const [coachingsLoading, setCoachingsLoading] = useState<boolean>(false);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUser(d.user ?? null))
      .catch(() => setUser(null))
      .finally(() => setAuthChecked(true));
  }, []);

  const loadCoachings = async () => {
    setCoachingsLoading(true);
    try {
      const res = await fetch("/api/coachings");
      const data = await res.json();
      if (data.success) setCoachingList(data.coachings);
    } catch {
      /* the list simply stays as it was */
    } finally {
      setCoachingsLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadCoachings();
    else setCoachingList([]);
  }, [user]);

  // A fresh analysis has not been saved yet
  useEffect(() => setSaveState("idle"), [exerciseAnalysis]);

  const handleSaveCoaching = async () => {
    if (!exerciseAnalysis || saveState === "saving") return;
    setSaveState("saving");
    try {
      const res = await fetch("/api/coachings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysis: exerciseAnalysis }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(
          data.error ? serverMessage(data.error, lang) : t("Speichern fehlgeschlagen.", "Saving failed.")
        );
      }
      setSaveState("saved");
      showToast(t("Coaching gespeichert", "Coaching saved"), "success");
      loadCoachings();
    } catch (err: any) {
      setSaveState("idle");
      showToast(err.message || t("Speichern fehlgeschlagen", "Saving failed"), "error");
    }
  };

  const handleOpenCoaching = async (id: string) => {
    setOpeningId(id);
    try {
      const res = await fetch(`/api/coachings/${id}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(
          data.error
            ? serverMessage(data.error, lang)
            : t("Konnte nicht geladen werden.", "Could not be loaded.")
        );
      }
      setExerciseAnalysis(data.coaching.analysis);
      // The clip itself is not stored, only the analysis
      setAnalysedFile(null);
      setSaveState("saved");
      goToTab("feedback");
    } catch (err: any) {
      showToast(err.message || t("Konnte nicht geladen werden", "Could not be loaded"), "error");
    } finally {
      setOpeningId(null);
    }
  };

  const handleDeleteCoaching = async (id: string) => {
    try {
      const res = await fetch(`/api/coachings/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setCoachingList((prev) => prev.filter((c) => c.id !== id));
      showToast(t("Coaching gelöscht", "Coaching deleted"), "success");
    } catch {
      showToast(t("Löschen fehlgeschlagen", "Deleting failed"), "error");
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    setUser(null);
    setActiveTab("video");
    showToast(t("Abgemeldet", "Signed out"), "success");
  };

  // Nav and hero buttons both switch tab and carry you past the opening shot
  const goToTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    requestAnimationFrame(() =>
      appRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    );
  };

  // Once the athlete's own clip has been judged it replaces the stock opener
  const showAnalysedClip = Boolean(
    activeTab === "feedback" && analysedVideoUrl && exerciseAnalysis
  );

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };


  // Handle Video Analysis via /api/analyze-exercise-video
  const handleAnalyzeVideo = async (
    videoBase64: string | null,
    mimeType: string,
    frames: string[],
    exerciseHint?: string,
    file?: File | null,
    metrics?: unknown
  ) => {
    setIsAnalyzing(true);
    setAnalysedFile(file ?? null);
    setAnalysisError(null);
    showToast(
      t(
        "Übungsvideo wird analysiert – Coach prüft Umkehrpunkt...",
        "Analysing your video – the coach is checking the turning point..."
      ),
      "success"
    );

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
          poseMetrics: metrics ?? null,
          language: lang,
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
            ? t(
                "Die Aufnahme war zu gross. Bitte eine kürzere Aufnahme (5–12 Sek.) wählen.",
                "The recording was too large. Please choose a shorter one (5–12 s)."
              )
            : t(
                `Server antwortete mit Status ${res.status}. Bitte erneut versuchen.`,
                `The server answered with status ${res.status}. Please try again.`
              )
        );
      }

      if (!res.ok || !data.success) {
        throw new Error(
          data.error
            ? serverMessage(data.error, lang)
            : t(
                "Videoanalyse konnte nicht abgeschlossen werden.",
                "The video analysis could not be completed."
              )
        );
      }

      setExerciseAnalysis(data.data);
      goToTab("feedback");
      showToast(
        `${t("Coach-Urteil", "Verdict")}: ${verdictLabel(data.data.urteil, lang).toUpperCase()}`,
        "success"
      );
    } catch (err: any) {
      console.error("Fehler bei Videoanalyse:", err);
      setAnalysisError(err.message || t("Analyse fehlgeschlagen.", "Analysis failed."));
      showToast(err.message || t("Analyse fehlgeschlagen", "Analysis failed"), "error");
    } finally {
      setIsAnalyzing(false);
    }
  };



  const handleStartNextSet = (exerciseName?: string, cue?: string) => {
    if (exerciseName) {
      setSelectedExerciseHint(exerciseName);
    }
    goToTab("video");
    showToast(
      t(
        `Nächster Satz vorbereitet: "${cue || "Fokus am Umkehrpunkt"}"`,
        `Next set ready: "${cue || "Focus on the turning point"}"`
      ),
      "success"
    );
  };

  return (
    <div className="min-h-screen text-[#2e2c27] flex flex-col font-sans selection:bg-[#c23a20]/30 selection:text-[#2e2c27]">
      {/* Nav in the oace cut: links left, wordmark centred, status right */}
      <header className="sticky top-0 z-50 bg-[#faf6ef]/90 backdrop-blur-xl border-b border-[#2e2c27]/10">
        <div className="w-full px-3 sm:px-6 h-16 sm:h-18 grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-3">
          <nav className="justify-self-start flex items-center gap-3 sm:gap-7">
            {NAV_ITEMS.filter((item) => user || !item.signedInOnly).map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`tab-btn-${item.id}`}
                  type="button"
                  onClick={() => goToTab(item.id)}
                  // On a phone the avatar on the right already leads to the
                  // account, and the row has no room for a third link
                  className={`relative ${
                    item.id === "account" ? "hidden sm:flex" : "flex"
                  } items-center gap-1.5 text-[11px] sm:text-xs uppercase tracking-[0.08em] font-semibold transition ${
                    active ? "text-[#2e2c27]" : "text-[#6f6759] hover:text-[#2e2c27]"
                  }`}
                >
                  <span>{t(...item.label)}</span>
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
            <span className="text-base sm:text-2xl lg:text-3xl font-black uppercase tracking-[-0.02em] leading-none text-[#2e2c27] whitespace-nowrap group-hover:text-[#1f1d19] transition">
              Form Coach
            </span>
          </button>

          <div className="justify-self-end flex items-center gap-2 text-xs text-[#6f6759]">
            <div
              role="group"
              aria-label={t("Sprache", "Language")}
              className="flex items-center rounded-full border border-[#2e2c27]/15 bg-[#ffffff] p-0.5"
            >
              {(["de", "en"] as const).map((l) => (
                <button
                  key={l}
                  id={`btn-lang-${l}`}
                  type="button"
                  onClick={() => setLang(l)}
                  aria-pressed={lang === l}
                  className={`px-1.5 sm:px-2 py-1 rounded-full text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.08em] transition ${
                    lang === l ? "bg-[#2e2c27] text-[#faf6ef]" : "text-[#6f6759] hover:text-[#2e2c27]"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
            {user ? (
              <>
                <button
                  type="button"
                  onClick={() => goToTab("account")}
                  title={t("Zum Konto", "Your account")}
                  className="inline-flex items-center gap-2 pl-1 pr-1 sm:pr-3 py-1 rounded-full bg-[#ffffff] border border-[#2e2c27]/[0.06] hover:border-[#2e2c27]/25 transition max-w-[200px]"
                >
                  <span className="shrink-0 w-6 h-6 rounded-full bg-[#2e2c27] text-[#faf6ef] text-[10px] font-black uppercase flex items-center justify-center">
                    {user.name.slice(0, 2)}
                  </span>
                  {/* on a phone the initials carry it; the header has no room for the name next to DE/EN */}
                  <span className="hidden sm:inline text-[11px] font-semibold text-[#2e2c27] truncate">
                    {user.name}
                  </span>
                </button>
              </>
            ) : (
              authChecked && (
                <button
                  type="button"
                  onClick={() => goToTab("account")}
                  aria-label={t("Anmelden", "Sign in")}
                  className="inline-flex items-center p-2 sm:px-3.5 sm:py-1.5 rounded-full bg-[#2e2c27] hover:bg-[#1f1d19] text-[#faf6ef] text-[11px] uppercase tracking-[0.08em] font-semibold whitespace-nowrap transition"
                >
                  {/* an icon on phones, where the word no longer fits beside DE/EN */}
                  <LogIn className="w-3.5 h-3.5 sm:hidden" />
                  <span className="hidden sm:inline">{t("Anmelden", "Sign in")}</span>
                </button>
              )
            )}
          </div>
        </div>
      </header>

      {/* Opening slot. On the landing side it is the stock shot; once a verdict
          exists it becomes the athlete's own clip, annotated and looping. */}
      {activeTab === "account" ? null : showAnalysedClip ? (
        <AnalysedVideoStage videoUrl={analysedVideoUrl!} data={exerciseAnalysis!} />
      ) : (
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
            alt={t(
              "Liegestütze in der Seitenansicht, mit eingeblendeter Technikanalyse: Kopfhaltung, Körperlinie, Ellenbogenwinkel und Beinstreckung",
              "Push-ups seen from the side, with the technique analysis overlaid: head position, body line, elbow angle and leg extension"
            )}
            className="absolute inset-0 w-full h-full object-cover object-center"
          />

          {/* just enough darkening at the very bottom to carry the cue */}
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#000000]/70 to-transparent" />

          <button
            type="button"
            onClick={() => goToTab("video")}
            aria-label={t("Nach unten scrollen", "Scroll down")}
            className="absolute bottom-5 left-1/2 -translate-x-1/2 text-[#faf6ef]/80 hover:text-[#faf6ef] transition"
          >
            <ChevronDown className="w-6 h-6 animate-bounce" />
          </button>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 sm:pt-16">
          <h1 className="font-black uppercase tracking-[-0.03em] leading-[0.92] text-4xl sm:text-6xl md:text-7xl max-w-3xl text-[#2e2c27]">
            {t("Präzision am", "Precision at the")}
            <br />
            {t("Umkehrpunkt.", "turning point.")}
          </h1>
          <p className="mt-4 sm:mt-5 text-[#6f6759] text-sm sm:text-base max-w-xl leading-relaxed">
            {t(
              "Objektive Beurteilung von Bewegungsumfang, Tempo, Gelenkachsen und Rumpfspannung ohne Verharmlosung.",
              "Objective assessment of range of motion, tempo, joint alignment and core tension, without sugar-coating."
            )}
          </p>
          {/* Once a verdict exists the call to action has been answered, so it
              only shows while the analysis tab is where you still need to go. */}
          <button
            type="button"
            hidden={activeTab === "feedback"}
            onClick={() => goToTab("video")}
            className="mt-8 px-9 py-4 sm:px-10 sm:py-[18px] rounded-full bg-[#2e2c27] hover:bg-[#1f1d19] text-[#faf6ef] text-base sm:text-lg font-semibold transition inline-flex items-center gap-2.5 shadow-sm active:scale-95"
          >
            <span>{t("Analyse starten", "Start analysis")}</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>
      )}

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
                  {t("Form Coach analysiert die Bewegung...", "Form Coach is analysing the movement...")}
                </p>
                <p className="text-[11px] text-[#6f6759]">
                  {t(
                    "Phasen-Segmentierung, tiefster Punkt, Ellenbogenwinkel und Lastpfad.",
                    "Phase segmentation, bottom position, elbow angle and bar path."
                  )}
                </p>
              </div>
            </div>
            <span className="text-[10px] text-[#c23a20] font-mono px-2.5 py-1 bg-[#c23a20]/10 rounded-full border border-[#c23a20]/20">
              {t("Analysiere", "Analysing")}
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
              {t("Schliessen", "Close")}
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

        {activeTab === "account" &&
          (user ? (
            <AccountView
              user={user}
              coachings={coachingList}
              loading={coachingsLoading}
              onOpen={handleOpenCoaching}
              onDelete={handleDeleteCoaching}
              onLogout={handleLogout}
              onUpdated={setUser}
              openingId={openingId}
            />
          ) : (
            <AuthPanel
              onAuthenticated={setUser}
              reason={t(
                "Mit einem Konto bleiben deine Analysen erhalten und lassen sich später wieder aufrufen.",
                "With an account your analyses are kept and can be opened again later."
              )}
            />
          ))}

        {/* Tab 2: Detailed Coach Feedback & Technique Work */}
        {activeTab === "feedback" && (
          <div>
            {exerciseAnalysis ? (
              <CoachFeedbackView
                data={exerciseAnalysis}
                onStartNextSet={handleStartNextSet}
                onSaveCoaching={handleSaveCoaching}
                onRequestAccount={() => goToTab("account")}
                saveState={saveState}
                isSignedIn={Boolean(user)}
              />
            ) : (
              <div className="p-12 text-center bg-[#ffffff] border border-[#2e2c27]/[0.08] rounded-3xl flex flex-col items-center">
                <div className="w-12 h-12 rounded-2xl bg-[#eee8dd] border border-[#2e2c27]/10 flex items-center justify-center text-[#6f6759] mb-3">
                  <Dumbbell className="w-6 h-6" />
                </div>
                <h3 className="text-sm sm:text-base font-semibold text-[#2e2c27] mb-1">
                  {t("Noch keine Videoanalyse vorhanden", "No video analysis yet")}
                </h3>
                <p className="text-xs text-[#6f6759] max-w-sm mb-5 leading-relaxed">
                  {t(
                    "Nimm einen Satz direkt mit der Kamera auf oder lade ein Video deiner Liegestütze, Kniebeuge oder deines Kreuzhebens hoch.",
                    "Record a set straight from the camera or upload a video of your push-ups, squats or deadlifts."
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => goToTab("video")}
                  className="px-5 py-2.5 bg-[#2e2c27] hover:bg-[#1f1d19] text-[#faf6ef] rounded-full text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
                >
                  <span>{t("Video aufnehmen oder hochladen", "Record or upload a video")}</span>
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
      <footer className="border-t border-[#2e2c27]/[0.08] py-8 bg-[#2e2c27]/50 backdrop-blur-sm text-[#000000] text-sm mt-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-4">
          <div className="border-b border-[#000000]/15 pb-4 text-[13px] leading-relaxed text-[#000000]">
            <p>
              {t(
                "1. Die Videoanalyse liefert technische Beobachtungen und biomechanische Orientierungshilfen am Umkehrpunkt. Sie dient sportwissenschaftlichen Zwecken und ersetzt keine medizinische, orthopädische oder physiotherapeutische Befundung.",
                "1. The video analysis provides technical observations and biomechanical guidance at the turning point. It serves sports-science purposes and does not replace a medical, orthopaedic or physiotherapeutic assessment."
              )}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-[13px]">
            <span>
              {t(
                "Copyright © 2026 Form Coach. Alle Rechte vorbehalten.",
                "Copyright © 2026 Form Coach. All rights reserved."
              )}
            </span>
            <div className="flex flex-wrap items-center gap-4 text-[#000000]">
              <span>{t("Schweiz (Deutsch)", "Switzerland (English)")}</span>
              <span className="text-[#000000]/40">•</span>
              <span>{t("Datenschutz", "Privacy")}</span>
              <span className="text-[#000000]/40">•</span>
              <span>{t("Nutzungsbedingungen", "Terms of use")}</span>
              <span className="text-[#000000]/40">•</span>
              <span className="font-mono">Gemini 3.5 &amp; 3.1 Pro</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AppShell />
    </LanguageProvider>
  );
}
