import React, { useState } from "react";
import {
  Sparkles,
  Sun,
  Moon,
  Palette,
  Maximize2,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  Armchair,
  Layers,
  ArrowRight,
  Copy,
  Check,
  Zap,
} from "lucide-react";
import { RoomAnalysisData } from "../types";

interface RoomAnalysisViewProps {
  data: RoomAnalysisData;
  capturedImage: string | null;
  onOpenImageGen: () => void;
  onOpenChat: (initialPrompt?: string) => void;
}

export const RoomAnalysisView: React.FC<RoomAnalysisViewProps> = ({
  data,
  capturedImage,
  onOpenImageGen,
  onOpenChat,
}) => {
  const [copiedHex, setCopiedHex] = useState<string | null>(null);

  const handleCopyHex = (hex: string) => {
    navigator.clipboard.writeText(hex);
    setCopiedHex(hex);
    setTimeout(() => setCopiedHex(null), 2000);
  };

  return (
    <div id="room-analysis-report" className="flex flex-col gap-6">
      {/* Top Banner: Key Findings & Identity */}
      <div className="bg-gradient-to-br from-stone-900 via-stone-900 to-stone-950 border border-stone-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold text-xs rounded-full uppercase tracking-wider">
              {data.roomType}
            </span>
            <span className="px-3 py-1 bg-stone-800 border border-stone-700 text-stone-300 font-medium text-xs rounded-full">
              Stijl: {data.style}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-action-visualize"
              type="button"
              onClick={onOpenImageGen}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md transition flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Genereer 1K/2K/4K Concept</span>
            </button>
            <button
              id="btn-action-ask-ai"
              type="button"
              onClick={() => onOpenChat("Hoe kan ik de indeling van deze kamer optimaliseren?")}
              className="px-3.5 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-medium border border-stone-700 transition flex items-center gap-1.5"
            >
              <span>Vraag AI Architect</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <p className="text-stone-300 text-sm md:text-base leading-relaxed mb-6">
          {data.overallSummary}
        </p>

        {/* Quick Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-stone-800/80 pt-4">
          <div className="p-3 bg-stone-800/40 rounded-xl border border-stone-800">
            <span className="text-[11px] text-stone-400 font-medium block">Geschat Oppervlak</span>
            <span className="text-sm md:text-base font-semibold text-stone-100">
              {data.dimensionsEstimate.estimatedArea}
            </span>
          </div>
          <div className="p-3 bg-stone-800/40 rounded-xl border border-stone-800">
            <span className="text-[11px] text-stone-400 font-medium block">Plafondhoogte</span>
            <span className="text-sm md:text-base font-semibold text-stone-100">
              {data.dimensionsEstimate.ceilingHeight}
            </span>
          </div>
          <div className="p-3 bg-stone-800/40 rounded-xl border border-stone-800">
            <span className="text-[11px] text-stone-400 font-medium block">Ruimtevorm</span>
            <span className="text-sm md:text-base font-semibold text-stone-100">
              {data.dimensionsEstimate.shape}
            </span>
          </div>
          <div className="p-3 bg-stone-800/40 rounded-xl border border-stone-800">
            <span className="text-[11px] text-stone-400 font-medium block">Doorloop & Flow</span>
            <span className="text-sm md:text-base font-semibold text-emerald-400">
              {data.ergonomicsAndFlow.rating}
            </span>
          </div>
        </div>
      </div>

      {/* Two Column Grid: Lighting & Color Palette */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Lighting & Ambience Card */}
        <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Sun className="w-5 h-5 text-amber-400" />
              <h3 className="font-semibold text-stone-100 text-sm">
                Lichtinval & Belichting
              </h3>
            </div>

            {/* Scores */}
            <div className="space-y-3 mb-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-stone-400">Natuurlijk Daglicht</span>
                  <span className="text-amber-400 font-semibold">
                    {data.lighting.naturalLightScore} / 10
                  </span>
                </div>
                <div className="w-full bg-stone-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${(data.lighting.naturalLightScore / 10) * 100}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-stone-400">Kunstlicht & Sfeerverlichting</span>
                  <span className="text-amber-300 font-semibold">
                    {data.lighting.artificialLightScore} / 10
                  </span>
                </div>
                <div className="w-full bg-stone-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-300 h-full rounded-full transition-all duration-500"
                    style={{ width: `${(data.lighting.artificialLightScore / 10) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            <p className="text-xs text-stone-300 bg-stone-800/60 p-3 rounded-xl border border-stone-700/50 mb-4 leading-relaxed">
              {data.lighting.windowDirectionNotes}
            </p>

            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider block">
                Verlichtingstips:
              </span>
              {data.lighting.tips.map((tip, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-stone-300">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Color Palette Card */}
        <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-rose-400" />
                <h3 className="font-semibold text-stone-100 text-sm">
                  Gedetecteerd Kleurenpalet
                </h3>
              </div>
              <span className="text-[11px] text-stone-500">Klik HEX om te kopiëren</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-4">
              {data.colorPalette.map((col, idx) => (
                <div
                  key={idx}
                  onClick={() => handleCopyHex(col.hex)}
                  className="p-2.5 bg-stone-800/70 hover:bg-stone-800 border border-stone-700/60 rounded-xl flex items-center justify-between cursor-pointer transition group"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-7 h-7 rounded-lg border border-black/30 shadow-sm shrink-0"
                      style={{ backgroundColor: col.hex }}
                    />
                    <div>
                      <p className="text-xs font-semibold text-stone-200 group-hover:text-emerald-400 transition">
                        {col.name}
                      </p>
                      <p className="text-[10px] text-stone-400">{col.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-mono text-stone-400">
                    <span>{col.hex}</span>
                    {copiedHex === col.hex ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 bg-stone-800/40 rounded-xl border border-stone-800 text-xs text-stone-400 flex items-center justify-between">
            <span>Harmonieer tinten voor rust en optische vergroting.</span>
            <button
              id="btn-chat-palette"
              type="button"
              onClick={() => onOpenChat(`Hoe kan ik dit kleurenpalet (${data.colorPalette.map(c => c.name).join(", ")}) verrijken met accessoires?`)}
              className="text-emerald-400 hover:text-emerald-300 font-medium text-xs flex items-center gap-1"
            >
              <span>Vraag stylingtip</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Ergonomics, Flow & Furniture Inventory */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Flow & Ergonomics (1 col) */}
        <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Maximize2 className="w-5 h-5 text-indigo-400" />
            <h3 className="font-semibold text-stone-100 text-sm">
              Ruimtelijke Flow & Ergonomie
            </h3>
          </div>

          <div className="mb-4">
            <span className="text-xs text-stone-400 block mb-1">Status Doorloop</span>
            <span className="inline-block px-3 py-1 bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 rounded-lg text-xs font-semibold">
              {data.ergonomicsAndFlow.rating}
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block mb-1.5">
                Sterke punten:
              </span>
              <ul className="space-y-1.5">
                {data.ergonomicsAndFlow.pros.map((pro, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-stone-300">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                    <span>{pro}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider block mb-1.5">
                Knelpunten / Aandacht:
              </span>
              <ul className="space-y-1.5">
                {data.ergonomicsAndFlow.bottlenecks.map((bn, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-stone-300">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                    <span>{bn}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Detected Furniture & Elements (2 cols) */}
        <div className="lg:col-span-2 bg-stone-900/80 border border-stone-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Armchair className="w-5 h-5 text-sky-400" />
              <h3 className="font-semibold text-stone-100 text-sm">
                Gedetecteerde Elementen & Meubels
              </h3>
            </div>
            <span className="text-xs text-stone-500">
              {data.detectedItems.length} objecten gevonden
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.detectedItems.map((item, idx) => (
              <div
                key={idx}
                className="p-3 bg-stone-800/50 border border-stone-700/60 rounded-xl flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-stone-200">{item.name}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-stone-700 text-stone-300">
                    {item.location}
                  </span>
                </div>
                <p className="text-[11px] text-stone-400 line-clamp-2">
                  {item.conditionOrNote}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Prioritized Key Recommendations */}
      <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            <h3 className="font-semibold text-stone-100 text-sm">
              Prioritaire Aanbevelingen van de Interieurarchitect
            </h3>
          </div>
          <span className="text-[11px] text-stone-400">Gericht op comfort en ruimtewinst</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data.keyRecommendations.map((rec, i) => (
            <div
              key={i}
              className="p-4 bg-stone-800/40 border border-stone-700/60 rounded-xl flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-stone-700 text-stone-300">
                    {rec.category}
                  </span>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                      rec.priority === "Hoog"
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                        : rec.priority === "Gemiddeld"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    }`}
                  >
                    Prioriteit: {rec.priority}
                  </span>
                </div>
                <h4 className="text-xs font-semibold text-stone-100 mb-1">
                  {rec.title}
                </h4>
                <p className="text-[11px] text-stone-400 leading-relaxed mb-3">
                  {rec.description}
                </p>
              </div>
              <button
                id={`btn-ask-rec-${i}`}
                type="button"
                onClick={() => onOpenChat(`Help mij met de implementatie van: "${rec.title}" (${rec.description})`)}
                className="text-emerald-400 hover:text-emerald-300 text-[11px] font-medium flex items-center gap-1 pt-2 border-t border-stone-700/50"
              >
                <span>Vraag stappenplan aan AI</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Safety & Decluttering Quick Wins */}
      <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            <h3 className="font-semibold text-stone-100 text-sm">
              Opruim- & Veiligheidscheck
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-400">Rommelgraad:</span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                data.safetyAndClutter.clutterScore <= 3
                  ? "bg-emerald-500/20 text-emerald-300"
                  : data.safetyAndClutter.clutterScore <= 6
                  ? "bg-amber-500/20 text-amber-300"
                  : "bg-rose-500/20 text-rose-300"
              }`}
            >
              {data.safetyAndClutter.clutterScore} / 10
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3.5 bg-stone-800/40 rounded-xl border border-stone-700/60">
            <span className="text-xs font-semibold text-amber-300 block mb-2">
              Veiligheidsaandachtspunten:
            </span>
            <ul className="space-y-1.5">
              {data.safetyAndClutter.safetyNotes.map((note, idx) => (
                <li key={idx} className="text-xs text-stone-300 flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-3.5 bg-stone-800/40 rounded-xl border border-stone-700/60">
            <span className="text-xs font-semibold text-emerald-300 block mb-2">
              10-Minuten Snelle Opruimacties:
            </span>
            <ul className="space-y-1.5">
              {data.safetyAndClutter.quickWins.map((win, idx) => (
                <li key={idx} className="text-xs text-stone-300 flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                  <span>{win}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
