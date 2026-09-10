import React, { useState, useRef, useEffect } from "react";
import Markdown from "react-markdown";
import {
  Send,
  Bot,
  User,
  Zap,
  Dumbbell,
  Compass,
  RotateCcw,
  Loader2,
  Activity,
} from "lucide-react";
import { ChatMessage, ChatRole, GeminiModelChoice, ExerciseAnalysisData } from "../types";

interface GeminiChatBotProps {
  messages: ChatMessage[];
  onSendMessage: (text: string, role: ChatRole, modelChoice?: GeminiModelChoice) => Promise<void>;
  isLoading: boolean;
  activeRole: ChatRole;
  onChangeRole: (role: ChatRole) => void;
  currentExerciseContext: ExerciseAnalysisData | null;
  onClearHistory: () => void;
  initialPromptSuggestion?: string | null;
}

interface RoleConfig {
  id: ChatRole;
  title: string;
  badge: string;
  defaultModel: GeminiModelChoice;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  tasksDescription: string;
}

const ROLES: RoleConfig[] = [
  {
    id: "head_coach",
    title: "Head Biomechanics Coach",
    badge: "Komplexe Biomechanik",
    defaultModel: "gemini-3.1-pro-preview",
    icon: Compass,
    description: "Hebelverhältnisse, Lastpfade, Wirbelsäulenstatik & Verletzungsprävention.",
    tasksDescription: "gemini-3.1-pro-preview für tiefgehende biomechanische Analysen.",
  },
  {
    id: "technique_coach",
    title: "Technik-Coach",
    badge: "Allgemeine Technik",
    defaultModel: "gemini-3.5-flash",
    icon: Dumbbell,
    description: "Ehrliche Beurteilung von Umkehrpunkt, Tiefe, Kadenz, Knieposition & Form.",
    tasksDescription: "gemini-3.5-flash für schnelles, direktes Technik-Feedback.",
  },
  {
    id: "quick_cue",
    title: "Schneller Cue-Coach",
    badge: "Direkt am Rack",
    defaultModel: "gemini-3.1-flash-lite",
    icon: Zap,
    description: "Prägnante Cues vor dem nächsten Satz, minimaler Text, maximale Wirkung.",
    tasksDescription: "gemini-3.1-flash-lite für minimale Latenz direkt vor dem Satz.",
  },
];

const SUGGESTIONS = [
  "Wie verhindere ich das Einrunden des unteren Rückens am Umkehrpunkt?",
  "Welche Fuß- und Kniestellung empfiehlst du bei langen Oberschenkeln?",
  "Gib mir einen prägnanten Cue gegen den Brust-Bounce beim Bankdrücken.",
  "Wie optimiere ich meine Atemtechnik (Valsalva-Manöver) unter schwerer Last?",
];

export const GeminiChatBot: React.FC<GeminiChatBotProps> = ({
  messages,
  onSendMessage,
  isLoading,
  activeRole,
  onChangeRole,
  currentExerciseContext,
  onClearHistory,
  initialPromptSuggestion,
}) => {
  const [inputText, setInputText] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    if (initialPromptSuggestion) {
      setInputText(initialPromptSuggestion);
    }
  }, [initialPromptSuggestion]);

  const currentRoleConfig = ROLES.find((r) => r.id === activeRole) || ROLES[1];

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    const text = inputText;
    setInputText("");
    await onSendMessage(text, activeRole);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputText(suggestion);
  };

  return (
    <div id="gemini-chatbot-container" className="flex flex-col bg-[#3b3529] border border-[#faf6ef]/[0.08] rounded-3xl overflow-hidden shadow-2xl h-[720px]">
      {/* Apple Header & Segmented Role Selector */}
      <div className="p-5 border-b border-[#faf6ef]/[0.08] bg-[#3b3529]/50 flex flex-col gap-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#453e2f] border border-[#faf6ef]/10 flex items-center justify-center text-[#e2553c]">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-[#faf6ef] text-sm sm:text-base flex items-center gap-2">
                <span>Kraftsport-Coach Dialog</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#453e2f] border border-[#faf6ef]/[0.06] text-[#b0a692] font-normal">
                  Multi-Turn
                </span>
              </h3>
              <p className="text-xs text-[#b0a692]">
                {currentRoleConfig.tasksDescription}
              </p>
            </div>
          </div>

          <button
            id="btn-clear-chat"
            type="button"
            onClick={onClearHistory}
            className="px-3 py-1.5 rounded-full text-[#b0a692] hover:text-[#faf6ef] bg-[#453e2f] border border-[#faf6ef]/[0.06] hover:bg-[#524a39] transition text-xs flex items-center gap-1.5"
            title="Chatverlauf leeren"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden sm:inline">Verlauf leeren</span>
          </button>
        </div>

        {/* Role Selectors in Apple Segmented Pill / Bento Style */}
        <div className="grid grid-cols-3 gap-2">
          {ROLES.map((role) => {
            const Icon = role.icon;
            const isSelected = activeRole === role.id;
            return (
              <button
                key={role.id}
                id={`role-tab-${role.id}`}
                type="button"
                onClick={() => onChangeRole(role.id)}
                className={`p-3 rounded-2xl border text-left transition flex flex-col gap-1 ${
                  isSelected
                    ? "bg-[#faf6ef] text-[#332e24] border-[#faf6ef] shadow-sm"
                    : "bg-[#453e2f]/60 text-[#b0a692] border-[#faf6ef]/[0.06] hover:bg-[#453e2f] hover:text-[#faf6ef]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Icon className={`w-3.5 h-3.5 ${isSelected ? "text-[#332e24]" : "text-[#b0a692]"}`} />
                    <span className={`text-xs font-semibold ${isSelected ? "text-[#332e24]" : "text-[#faf6ef]"}`}>
                      {role.title.split(" ")[0]}
                    </span>
                  </div>
                  <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono ${isSelected ? "bg-[#1c1913]/10 text-[#332e24] font-semibold" : "bg-[#1c1913]/40 text-[#b0a692]"}`}>
                    {role.defaultModel.replace("gemini-", "").split("-")[0]}
                  </span>
                </div>
                <p className={`text-[10px] line-clamp-1 ${isSelected ? "text-neutral-700" : "text-[#b0a692]"}`}>
                  {role.badge}
                </p>
              </button>
            );
          })}
        </div>

        {/* Active Exercise Context Badge in Apple Style */}
        {currentExerciseContext && (
          <div className="flex items-center justify-between text-[11px] bg-[#453e2f]/70 border border-[#faf6ef]/[0.06] rounded-xl px-3.5 py-2 text-[#faf6ef]">
            <span className="flex items-center gap-2">
              <Dumbbell className="w-3.5 h-3.5 text-[#e2553c] shrink-0" />
              <span>
                Aktiver Videobefund: <strong>{currentExerciseContext.exerciseName}</strong> (Urteil: <span className="uppercase font-semibold text-[#e2553c]">{currentExerciseContext.urteil}</span>)
              </span>
            </span>
            <span className="text-[#b0a692] text-[10px] font-mono">
              Gewicht: {currentExerciseContext.gewicht.empfehlung}
            </span>
          </div>
        )}
      </div>

      {/* Scrollable Apple Messages Thread */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#b0a692]">
            <div className="w-14 h-14 rounded-2xl bg-[#453e2f] border border-[#faf6ef]/10 flex items-center justify-center text-[#e2553c] mb-3">
              <Bot className="w-7 h-7" />
            </div>
            <h4 className="text-sm sm:text-base font-semibold text-[#faf6ef] mb-1">
              Fachgespräch mit dem {currentRoleConfig.title}
            </h4>
            <p className="text-xs text-[#b0a692] max-w-md mb-6 leading-relaxed">
              Stelle Fragen zu deiner Technik, Hebelverhältnissen, Standbreite, Kniestellung oder Cues für den nächsten Satz.
            </p>

            {/* Suggestions Chips in Apple Pill Style */}
            <div className="w-full max-w-md flex flex-col gap-2">
              <span className="text-[10px] font-semibold text-[#b0a692] uppercase tracking-wider text-left pl-1">
                Empfohlene Fragen:
              </span>
              {SUGGESTIONS.map((sug, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSuggestionClick(sug)}
                  className="text-left text-xs bg-[#453e2f]/60 hover:bg-[#453e2f] text-[#faf6ef] hover:border-[#faf6ef]/20 p-3 rounded-2xl border border-[#faf6ef]/[0.06] transition leading-relaxed"
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === "user";
            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
              >
                {!isUser && (
                  <div className="w-7 h-7 rounded-full bg-[#453e2f] border border-[#faf6ef]/10 text-[#e2553c] flex items-center justify-center shrink-0 mt-1">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                    isUser
                      ? "bg-[#faf6ef] text-[#332e24] rounded-br-sm shadow-md"
                      : "bg-[#453e2f] text-[#faf6ef] border border-[#faf6ef]/[0.06] rounded-bl-sm shadow-sm"
                  }`}
                >
                  {isUser ? (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <div className="markdown-body space-y-2">
                      <Markdown>{msg.content}</Markdown>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 mt-2 pt-1 border-t border-[#faf6ef]/10 text-[10px] opacity-70">
                    <span>{msg.timestamp}</span>
                    {msg.modelUsed && (
                      <span className="font-mono">{msg.modelUsed}</span>
                    )}
                  </div>
                </div>

                {isUser && (
                  <div className="w-7 h-7 rounded-full bg-[#524a39] text-[#faf6ef] flex items-center justify-center shrink-0 mt-1">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            );
          })
        )}

        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="w-7 h-7 rounded-full bg-[#453e2f] border border-[#faf6ef]/10 text-[#e2553c] flex items-center justify-center shrink-0">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div className="bg-[#453e2f] border border-[#faf6ef]/[0.06] rounded-2xl rounded-bl-sm p-3.5 flex items-center gap-2.5 text-[#b0a692] text-xs">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#e2553c]" />
              <span>
                {currentRoleConfig.title} analysiert...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Apple Messages Input Pill Dock */}
      <div className="p-4 border-t border-[#faf6ef]/[0.08] bg-[#3b3529]/80">
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <input
            id="chat-user-input"
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`Frage an den ${currentRoleConfig.title}...`}
            className="flex-1 bg-[#453e2f] border border-[#faf6ef]/10 rounded-full px-4 py-2.5 text-xs sm:text-sm text-[#faf6ef] placeholder-[#b0a692] focus:outline-none focus:border-[#e2553c] transition"
          />
          <button
            id="btn-chat-send"
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className="w-9 h-9 rounded-full bg-[#faf6ef] hover:bg-[#e8e2d6] disabled:opacity-40 text-[#332e24] transition flex items-center justify-center shadow-md shrink-0 active:scale-95"
          >
            <Send className="w-4 h-4 ml-0.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
