import React, { useState } from "react";
import {
  Sparkles,
  Download,
  Maximize2,
  Sliders,
  Image as ImageIcon,
  Loader2,
  Check,
  Zap,
  Layers,
  Ratio,
} from "lucide-react";
import { GeneratedImageItem, ImageResolution } from "../types";

interface ImageGeneratorPanelProps {
  capturedImage: string | null;
  generatedImages: GeneratedImageItem[];
  onGenerateImage: (prompt: string, size: ImageResolution, aspectRatio: string, useReference: boolean) => Promise<void>;
  isGenerating: boolean;
}

const STYLE_PRESETS = [
  {
    name: "Kniebeuge – Tiefe & Umkehrpunkt",
    prompt: "Anatomische 3D-Visualisierung einer Kniebeuge im Umkehrpunkt unterhalb der Parallele, neutrale Lendenwirbelsäule, Kniescheiben exakt über Fußmitte, sichtbare Muskelketten und vertikaler Lastvektor, medizinisches Kraftsport-Lehrbuch.",
  },
  {
    name: "Kreuzheben – Vertikaler Bar Path",
    prompt: "Biomechanisches Schnittbild konventionelles Kreuzheben: perfekt gerader vertikaler Stangenpfad über dem Mittelfuß, angespannter Latissimus, neutrale Wirbelsäule, anatomische Kraftvektoren in 3D.",
  },
  {
    name: "Bankdrücken – Gelenkwinkel",
    prompt: "Biomechanische Ansicht Flachbankdrücken im tiefsten Punkt: eingezogene Schulterblätter (Retraktion), 75-Grad-Winkel der Oberarme zum Rumpf, gerade Handgelenke über Unterarmen, Lehrbuch-Grafik.",
  },
  {
    name: "Knieachse – Valgus vs. Korrekt",
    prompt: "Medizinische Gegenüberstellung: Knievalgus (nach innen einknickendes Knie) links vs. spurtreue Knieausrichtung über Fußmitte rechts bei maximaler Kraftbelastung, didaktisches Schaubild.",
  },
];

export const ImageGeneratorPanel: React.FC<ImageGeneratorPanelProps> = ({
  capturedImage,
  generatedImages,
  onGenerateImage,
  isGenerating,
}) => {
  const [prompt, setPrompt] = useState<string>(
    "Anatomische 3D-Visualisierung einer Kniebeuge im Umkehrpunkt unterhalb der Parallele, neutrale Lendenwirbelsäule, Kniescheiben exakt über Fußmitte, sichtbare Muskelketten und vertikaler Lastvektor, medizinisches Kraftsport-Lehrbuch."
  );
  const [selectedSize, setSelectedSize] = useState<ImageResolution>("2K");
  const [selectedAspect, setSelectedAspect] = useState<string>("16:9");
  const [useReference, setUseReference] = useState<boolean>(Boolean(capturedImage));
  const [activeModalImage, setActiveModalImage] = useState<GeneratedImageItem | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;
    await onGenerateImage(prompt, selectedSize, selectedAspect, useReference && Boolean(capturedImage));
  };

  const handleDownload = (imgUrl: string, name: string) => {
    const link = document.createElement("a");
    link.href = imgUrl;
    link.download = `${name || "kamer-concept"}.png`;
    link.click();
  };

  return (
    <div id="image-generator-section" className="flex flex-col gap-6">
      {/* Configuration & Prompt Card */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        {/* Model Tag */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-4 border-b border-stone-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-stone-100 text-sm md:text-base">
                AI Kamer Visualisator & Render Studio
              </h3>
              <p className="text-xs text-stone-400">
                Aangedreven door model:{" "}
                <span className="font-mono text-emerald-400 font-medium">
                  gemini-3-pro-image-preview
                </span>
              </p>
            </div>
          </div>

          {/* Resolution Badge */}
          <div className="flex items-center gap-1.5 bg-stone-800 px-3 py-1 rounded-full border border-stone-700 text-xs text-stone-300">
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span>Resolutie: <strong className="text-white">{selectedSize}</strong></span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Prompt input */}
          <div>
            <label htmlFor="gen-prompt-input" className="block text-xs font-semibold text-stone-300 mb-2">
              Beschrijf de gewenste kamerstijl of herinrichting:
            </label>
            <textarea
              id="gen-prompt-input"
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Bijv. Moderne Japandi woonkamer met warme houttinten, minimalistische loungebank en subtiele verlichting..."
              className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-sm text-stone-100 placeholder-stone-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition resize-none"
            />
          </div>

          {/* Quick Style Presets */}
          <div>
            <span className="text-xs text-stone-400 font-medium block mb-2">
              Snelle Stijl Inspiraties:
            </span>
            <div className="flex flex-wrap gap-2">
              {STYLE_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  id={`preset-${idx}`}
                  onClick={() => setPrompt(preset.prompt)}
                  className="px-3 py-1.5 rounded-lg bg-stone-800/80 hover:bg-stone-750 border border-stone-700 text-xs text-stone-300 hover:text-white transition"
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* Controls: Size (Affordance for 1K, 2K, 4K) & Aspect Ratio */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-stone-800/80">
            {/* Resolution Selector (1K, 2K, 4K mandate) */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-stone-300 flex items-center justify-between">
                <span>Afbeeldingsgrootte (Image Size)</span>
                <span className="text-[11px] text-emerald-400">Verplicht gemini-3-pro</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["1K", "2K", "4K"] as ImageResolution[]).map((size) => (
                  <button
                    key={size}
                    type="button"
                    id={`btn-size-${size}`}
                    onClick={() => setSelectedSize(size)}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border transition flex flex-col items-center justify-center ${
                      selectedSize === size
                        ? "bg-emerald-500 text-stone-950 border-emerald-400 shadow-md shadow-emerald-500/20"
                        : "bg-stone-800 hover:bg-stone-750 text-stone-300 border-stone-700"
                    }`}
                  >
                    <span>{size}</span>
                    <span className="text-[9px] opacity-80">
                      {size === "1K" ? "1024px" : size === "2K" ? "2048px" : "4096px HD"}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Aspect Ratio Selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-stone-300 flex items-center gap-1.5">
                <Ratio className="w-3.5 h-3.5 text-stone-400" />
                <span>Beeldverhouding (Aspect Ratio)</span>
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { label: "16:9", desc: "Breedbeeld" },
                  { label: "1:1", desc: "Vierkant" },
                  { label: "4:3", desc: "Klassiek" },
                  { label: "3:4", desc: "Portret" },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    id={`btn-aspect-${item.label.replace(":", "-")}`}
                    onClick={() => setSelectedAspect(item.label)}
                    className={`py-2 px-1 rounded-xl text-xs font-medium border text-center transition ${
                      selectedAspect === item.label
                        ? "bg-stone-700 text-white border-stone-500 font-semibold"
                        : "bg-stone-800/80 hover:bg-stone-750 text-stone-300 border-stone-700"
                    }`}
                  >
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Reference Image Switch */}
            <div className="flex flex-col justify-end gap-1.5">
              <label
                htmlFor="cb-use-reference"
                className={`p-2.5 rounded-xl border flex items-center gap-3 cursor-pointer transition ${
                  useReference && capturedImage
                    ? "bg-stone-800 border-emerald-500/50"
                    : "bg-stone-900 border-stone-800 opacity-80"
                }`}
              >
                <input
                  id="cb-use-reference"
                  type="checkbox"
                  disabled={!capturedImage}
                  checked={useReference && Boolean(capturedImage)}
                  onChange={(e) => setUseReference(e.target.checked)}
                  className="rounded text-emerald-500 focus:ring-emerald-500 w-4 h-4 bg-stone-950 border-stone-700"
                />
                <div className="flex-1">
                  <span className="text-xs font-medium text-stone-200 block">
                    Behoud kamerarchitectuur
                  </span>
                  <span className="text-[10px] text-stone-400 block">
                    {capturedImage ? "Gebruikt huidige camera frame" : "Neem eerst een foto op"}
                  </span>
                </div>
                {capturedImage && (
                  <img
                    src={capturedImage}
                    alt="Mini preview"
                    className="w-8 h-8 rounded object-cover border border-stone-700"
                    referrerPolicy="no-referrer"
                  />
                )}
              </label>
            </div>
          </div>

          {/* Submit button */}
          <div className="flex justify-end pt-2">
            <button
              id="btn-generate-submit"
              type="submit"
              disabled={isGenerating || !prompt.trim()}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-semibold text-sm shadow-lg shadow-emerald-500/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Kamerconcept wordt gegenereerd ({selectedSize})...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Genereer {selectedSize} Render met gemini-3-pro</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Visualizations Gallery */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-emerald-400" />
            <h4 className="font-semibold text-stone-100 text-sm">
              Gegenereerde Visualisaties ({generatedImages.length})
            </h4>
          </div>
          <span className="text-xs text-stone-500">
            Klik op een afbeelding voor fullscreen weergave
          </span>
        </div>

        {generatedImages.length === 0 ? (
          <div className="p-12 text-center bg-stone-900/40 border border-stone-800/80 rounded-2xl flex flex-col items-center">
            <Sparkles className="w-8 h-8 text-stone-600 mb-2" />
            <p className="text-sm text-stone-400 font-medium">Nog geen visualisaties gegenereerd</p>
            <p className="text-xs text-stone-500 max-w-sm mt-1">
              Selecteer hierboven een stijl en resolutie (1K, 2K of 4K) om fotorealistische interieurontwerpen te creëren.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {generatedImages.map((img) => (
              <div
                key={img.id}
                className="group relative bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden shadow-md flex flex-col"
              >
                <div
                  className="relative aspect-video w-full bg-stone-950 overflow-hidden cursor-pointer"
                  onClick={() => setActiveModalImage(img)}
                >
                  <img
                    src={img.url}
                    alt={img.prompt}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveModalImage(img);
                      }}
                      className="p-2 rounded-xl bg-stone-900/90 text-white hover:bg-stone-800 border border-stone-700 transition"
                      title="Vergroten"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(img.url, `kamer-concept-${img.size}`);
                      }}
                      className="p-2 rounded-xl bg-stone-900/90 text-white hover:bg-stone-800 border border-stone-700 transition"
                      title="Downloaden"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Size & Model Tags */}
                  <div className="absolute top-2 left-2 flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded bg-black/80 backdrop-blur text-[10px] font-bold text-emerald-400 border border-emerald-500/40">
                      {img.size}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-black/80 backdrop-blur text-[10px] text-stone-300">
                      {img.aspectRatio}
                    </span>
                  </div>
                </div>

                <div className="p-3 flex-1 flex flex-col justify-between">
                  <p className="text-xs text-stone-200 line-clamp-2 mb-2">
                    {img.prompt}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-stone-400 pt-2 border-t border-stone-800">
                    <span className="font-mono text-emerald-400/80">{img.modelUsed}</span>
                    <span>{img.createdAt}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox Zoom Modal */}
      {activeModalImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setActiveModalImage(null)}
        >
          <div
            className="relative max-w-5xl w-full max-h-[90vh] flex flex-col bg-stone-950 border border-stone-800 rounded-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 flex items-center justify-between border-b border-stone-800 bg-stone-900/60">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                  {activeModalImage.size} Resolutie
                </span>
                <span className="text-xs text-stone-400 font-mono">
                  {activeModalImage.modelUsed}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownload(activeModalImage.url, `kamer-${activeModalImage.size}`)}
                  className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-medium border border-stone-700 transition flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Hoge Resolutie</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModalImage(null)}
                  className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-stone-100 rounded-xl text-xs transition"
                >
                  Sluiten
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-2 flex items-center justify-center bg-black">
              <img
                src={activeModalImage.url}
                alt={activeModalImage.prompt}
                className="max-w-full max-h-[75vh] object-contain rounded-lg"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="p-3 bg-stone-900/60 border-t border-stone-800 text-xs text-stone-300">
              {activeModalImage.prompt}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
