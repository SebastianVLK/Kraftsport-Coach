import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Upload,
  FileVideo,
  Sparkles,
  Dumbbell,
  Loader2,
  Layers,
  PlusCircle,
  Activity,
  ArrowRight,
  Camera,
  CameraOff,
  Circle,
  Square,
  SwitchCamera,
  AlertCircle,
} from "lucide-react";
import { EXERCISE_PRESETS, ExercisePreset } from "../data/exercisePresets";

interface VideoRecorderAndUploaderProps {
  onAnalyzeVideo: (
    videoBase64: string | null,
    mimeType: string,
    frames: string[],
    exerciseHint?: string
  ) => Promise<void>;
  isAnalyzing: boolean;
  onSelectPreset: (preset: ExercisePreset) => void;
  selectedExerciseHint: string;
  onChangeExerciseHint: (hint: string) => void;
}

export const VideoRecorderAndUploader: React.FC<VideoRecorderAndUploaderProps> = ({
  onAnalyzeVideo,
  isAnalyzing,
  onSelectPreset,
  selectedExerciseHint,
  onChangeExerciseHint,
}) => {
  const [mode, setMode] = useState<"upload" | "record" | "presets">("upload");

  // Video upload states
  const [uploadedBlobUrl, setUploadedBlobUrl] = useState<string | null>(null);
  const [uploadedBase64, setUploadedBase64] = useState<string | null>(null);
  const [uploadedMimeType, setUploadedMimeType] = useState<string>("video/mp4");
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSizeBytes, setFileSizeBytes] = useState<number>(0);
  const [extractedFrames, setExtractedFrames] = useState<string[]>([]);
  const [isVideoProcessing, setIsVideoProcessing] = useState<boolean>(false);
  const [processingStatus, setProcessingStatus] = useState<string>("");

  // Custom exercise input toggle
  const [showCustomInput, setShowCustomInput] = useState<boolean>(false);
  const [customExerciseText, setCustomExerciseText] = useState<string>("");

  // Live camera recording states
  const [isCameraOn, setIsCameraOn] = useState<boolean>(false);
  const [isStartingCamera, setIsStartingCamera] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordedSeconds, setRecordedSeconds] = useState<number>(0);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [cameraError, setCameraError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const liveVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Keep clips short: long recordings blow past the server's payload limit
  const MAX_RECORDING_SECONDS = 30;

  // Frame extraction utility using offscreen video & canvas
  const extractFramesFromVideoUrl = (videoUrl: string) => {
    setIsVideoProcessing(true);
    setProcessingStatus("Extrahiere Phasen-Schlüsselbilder (Umkehrpunkt, Exzentrik, Lockout)...");

    const video = document.createElement("video");
    video.src = videoUrl;
    if (videoUrl.startsWith("http://") || videoUrl.startsWith("https://")) {
      video.crossOrigin = "anonymous";
    }
    video.muted = true;
    video.playsInline = true;

    const frames: string[] = [];
    let hasCompleted = false;

    const finish = (extracted: string[]) => {
      if (hasCompleted) return;
      hasCompleted = true;
      setExtractedFrames(extracted);
      setIsVideoProcessing(false);
      setProcessingStatus(
        extracted.length > 0
          ? `${extracted.length} Phasen-Bilder extrahiert – Bereit für Video-Coach`
          : "Video aufbereitet"
      );
    };

    // Safety timeout after 10s
    const timeout = setTimeout(() => {
      finish(frames);
    }, 10000);

    video.onloadedmetadata = () => {
      const duration = video.duration || 5;
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      // Extract 6 evenly spaced keyframes across repetition duration
      const sampleTimes = [
        duration * 0.15,
        duration * 0.3,
        duration * 0.45,
        duration * 0.6,
        duration * 0.75,
        duration * 0.9,
      ];

      let sampled = 0;

      const captureNext = () => {
        if (sampled >= sampleTimes.length) {
          clearTimeout(timeout);
          finish(frames);
          return;
        }
        video.currentTime = sampleTimes[sampled];
      };

      video.onseeked = () => {
        if (ctx) {
          try {
            canvas.width = 640;
            canvas.height = 360;
            ctx.drawImage(video, 0, 0, 640, 360);
            const dataUrl = canvas.toDataURL("image/jpeg", 0.72);
            if (dataUrl && dataUrl.startsWith("data:image")) {
              frames.push(dataUrl);
            }
          } catch (e) {
            console.warn("Frame extraction skipped:", e);
          }
        }
        sampled++;
        captureNext();
      };

      video.onerror = () => {
        clearTimeout(timeout);
        finish(frames);
      };

      captureNext();
    };
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processVideoFile(file);
  };

  const processVideoFile = (file: File) => {
    setFileName(file.name);
    setFileSizeBytes(file.size);
    setUploadedMimeType(file.type || "video/mp4");

    const url = URL.createObjectURL(file);
    setUploadedBlobUrl(url);

    setIsVideoProcessing(true);
    setProcessingStatus("Video wird geladen & aufbereitet...");

    const fileSizeMb = file.size / (1024 * 1024);

    if (fileSizeMb <= 10) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = () => {
        setUploadedBase64(reader.result as string);
      };
    } else {
      setUploadedBase64(null);
    }

    extractFramesFromVideoUrl(url);
  };

  // Pick a container the browser can actually record in.
  // Safari records mp4, Chrome and Firefox webm — Gemini accepts both.
  const pickRecordingMimeType = (): string => {
    const candidates = [
      "video/mp4",
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
    ];
    for (const c of candidates) {
      if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c)) {
        return c;
      }
    }
    return "";
  };

  const stopCamera = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    recorderRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (liveVideoRef.current) {
      liveVideoRef.current.srcObject = null;
    }
    setIsCameraOn(false);
    setIsRecording(false);
    setRecordedSeconds(0);
  }, []);

  const startCamera = async (facing: "user" | "environment" = facingMode) => {
    setCameraError(null);
    setIsStartingCamera(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          "Dieser Browser stellt keine Kamera bereit. Die Aufnahme braucht eine sichere Verbindung (https oder localhost)."
        );
      }

      streamRef.current?.getTracks().forEach((t) => t.stop());

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream;
        await liveVideoRef.current.play().catch(() => {});
      }
      setFacingMode(facing);
      setIsCameraOn(true);
    } catch (err: any) {
      const name = err?.name || "";
      setCameraError(
        name === "NotAllowedError"
          ? "Kamerazugriff wurde abgelehnt. Erlaube ihn in den Browser-Einstellungen für diese Seite."
          : name === "NotFoundError"
          ? "Keine Kamera gefunden."
          : err?.message || "Die Kamera konnte nicht gestartet werden."
      );
      setIsCameraOn(false);
    } finally {
      setIsStartingCamera(false);
    }
  };

  const stopRecording = () => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
  };

  const startRecording = () => {
    const stream = streamRef.current;
    if (!stream) return;

    const mimeType = pickRecordingMimeType();
    if (!mimeType) {
      setCameraError("Dieser Browser unterstützt keine Videoaufnahme (MediaRecorder).");
      return;
    }

    chunksRef.current = [];
    const recorder = new MediaRecorder(stream, { mimeType });
    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
      setIsRecording(false);

      const blob = new Blob(chunksRef.current, { type: mimeType });
      chunksRef.current = [];
      if (blob.size === 0) {
        setCameraError("Die Aufnahme war leer. Bitte erneut versuchen.");
        return;
      }

      // Hand the clip to the exact same pipeline an uploaded file goes through
      const extension = mimeType.startsWith("video/mp4") ? "mp4" : "webm";
      const file = new File([blob], `aufnahme-${Date.now()}.${extension}`, {
        type: mimeType.split(";")[0],
      });
      stopCamera();
      processVideoFile(file);
    };

    recorder.start();
    setIsRecording(true);
    setRecordedSeconds(0);
    setCameraError(null);

    tickRef.current = setInterval(() => {
      setRecordedSeconds((prev) => {
        const next = prev + 1;
        if (next >= MAX_RECORDING_SECONDS) {
          stopRecording();
          return MAX_RECORDING_SECONDS;
        }
        return next;
      });
    }, 1000);
  };

  // Release the camera when leaving the tab or unmounting
  useEffect(() => {
    if (mode !== "record") stopCamera();
  }, [mode, stopCamera]);

  useEffect(() => stopCamera, [stopCamera]);

  // Trigger analysis for uploaded video
  const handleSubmitForAnalysis = async () => {
    await onAnalyzeVideo(
      uploadedBase64,
      uploadedMimeType,
      extractedFrames,
      selectedExerciseHint
    );
  };

  // Planned Exercises
  const commonExercises = [
    "Liegestütze (Push-ups)",
    "Dips (Barrenstütz)",
    "Kniebeuge (Squat)",
    "Kreuzheben (Deadlift)",
    "Bankdrücken (Bench Press)",
    "Klimmzüge (Pull-ups)",
    "Rumänisches Kreuzheben (RDL)",
    "Schulterdrücken (Overhead Press)",
    "Langhantelrudern (Barbell Row)",
    "Ausfallschritte (Lunges)",
    "Hip Thrusts",
  ];

  // Shared result view: identical after an upload and after a live recording
  const videoResultPanel = (
          <div className="space-y-4">
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-video max-h-[440px] flex items-center justify-center border border-white/[0.08]">
              <video
                src={uploadedBlobUrl}
                controls
                autoPlay
                loop
                playsInline
                className="w-full h-full object-contain"
              />
            </div>

            {/* Status and Extracted Keyframe Preview Strip (Final Cut Pro / Photos Style) */}
            {isVideoProcessing && (
              <div className="p-3 bg-[#1d1d1f] border border-white/[0.08] rounded-xl flex items-center gap-2.5 text-xs text-[#f5f5f7]">
                <Loader2 className="w-4 h-4 text-[#2997ff] animate-spin shrink-0" />
                <span>{processingStatus || "Videosegmente werden für die Biomechanik aufbereitet..."}</span>
              </div>
            )}

            {extractedFrames.length > 0 && (
              <div className="bg-[#1d1d1f]/60 border border-white/[0.06] rounded-2xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[#86868b] flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#2997ff]" />
                    <span>{extractedFrames.length} Phasen-Bilder extrahiert (Umkehrpunkt & Exzentrik)</span>
                  </span>
                  <span className="text-[10px] text-[#30d158] font-medium">Bereit</span>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {extractedFrames.map((frm, idx) => (
                    <div key={idx} className="relative aspect-video rounded-lg overflow-hidden bg-black border border-white/10">
                      <img src={frm} alt={`Frame ${idx + 1}`} className="w-full h-full object-cover" />
                      <span className="absolute bottom-1 right-1 text-[8px] bg-black/80 px-1 py-0.2 rounded font-mono text-[#f5f5f7]">
                        #{idx + 1}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="text-xs text-[#86868b] flex items-center gap-2">
                <FileVideo className="w-4 h-4 text-[#f5f5f7]" />
                <span className="font-mono text-[#f5f5f7]">{fileName || "video.mp4"}</span>
                {fileSizeBytes > 0 && (
                  <span className="text-[10px] bg-[#1d1d1f] text-[#86868b] px-2 py-0.5 rounded-full border border-white/[0.06]">
                    {(fileSizeBytes / (1024 * 1024)).toFixed(1)} MB
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (uploadedBlobUrl) URL.revokeObjectURL(uploadedBlobUrl);
                    setUploadedBlobUrl(null);
                    setUploadedBase64(null);
                    setExtractedFrames([]);
                    setFileName(null);
                    setFileSizeBytes(0);
                  }}
                  className="px-4 py-2 bg-[#1d1d1f] hover:bg-[#2c2c2e] text-[#f5f5f7] rounded-full text-xs font-semibold transition border border-white/10"
                >
                  {mode === "record" ? "Neu aufnehmen" : "Anderes Video"}
                </button>

                <button
                  id="btn-submit-upload-analysis"
                  type="button"
                  onClick={handleSubmitForAnalysis}
                  disabled={isAnalyzing || isVideoProcessing}
                  className="px-6 py-2.5 bg-[#0071e3] hover:bg-[#0077ed] disabled:opacity-50 text-white rounded-full text-xs sm:text-sm font-semibold transition flex items-center gap-2 shadow-lg shadow-[#0071e3]/25 active:scale-95"
                >
                  {isAnalyzing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Activity className="w-4 h-4" />
                  )}
                  <span>{isAnalyzing ? "Coach analysiert..." : "Jetzt analysieren"}</span>
                </button>
              </div>
            </div>
          </div>
  );

  return (
    <div id="video-recorder-container" className="bg-[#161617] border border-white/[0.08] rounded-3xl overflow-hidden shadow-2xl">
      {/* Top Header & Mode Toggle in Apple Style */}
      <div className="p-5 sm:p-6 border-b border-white/[0.08] bg-[#161617]/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-2xl bg-[#1d1d1f] border border-white/10 flex items-center justify-center text-[#2997ff]">
              <Activity className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-sm sm:text-base font-semibold tracking-tight text-[#f5f5f7] flex items-center gap-2">
                <span>Video-Technikanalyse</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1d1d1f] border border-white/[0.08] text-[#86868b] font-medium">
                  KI-Coach
                </span>
              </h2>
              <p className="text-xs text-[#86868b] font-normal">
                Objektive Diagnose am tiefsten Punkt (Umkehrpunkt)
              </p>
            </div>
          </div>
        </div>

        {/* Apple Segmented Control: Aufnahme, Upload & Beispiel-Sets */}
        <div className="flex items-center gap-1 bg-[#1d1d1f] p-1 rounded-full border border-white/[0.08] self-start md:self-auto shadow-inner">
          <button
            id="btn-mode-upload"
            type="button"
            onClick={() => setMode("upload")}
            className={`flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-medium transition duration-150 ${
              mode === "upload"
                ? "bg-white text-black font-semibold shadow-sm"
                : "text-[#86868b] hover:text-[#f5f5f7]"
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Video-Upload</span>
          </button>

          <button
            id="btn-mode-record"
            type="button"
            onClick={() => setMode("record")}
            className={`flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-medium transition duration-150 ${
              mode === "record"
                ? "bg-white text-black font-semibold shadow-sm"
                : "text-[#86868b] hover:text-[#f5f5f7]"
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Live-Aufnahme</span>
          </button>

          <button
            id="btn-mode-presets"
            type="button"
            onClick={() => setMode("presets")}
            className={`flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-medium transition duration-150 ${
              mode === "presets"
                ? "bg-white text-black font-semibold shadow-sm"
                : "text-[#86868b] hover:text-[#f5f5f7]"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Beispiel-Sets</span>
          </button>
        </div>
      </div>

      {/* Planned Exercise Tag Selector with Apple Pills */}
      <div className="px-5 py-3.5 bg-[#1d1d1f]/40 border-b border-white/[0.06] flex flex-col sm:flex-row sm:items-center gap-2.5 text-xs">
        <span className="text-[#86868b] font-medium shrink-0 flex items-center gap-1.5">
          <Dumbbell className="w-3.5 h-3.5 text-[#2997ff]" />
          <span>Fokus-Übung:</span>
        </span>

        <div className="flex flex-wrap items-center gap-1.5 flex-1">
          {commonExercises.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => {
                onChangeExerciseHint(ex);
                setShowCustomInput(false);
              }}
              className={`px-3 py-1 rounded-full transition text-[11px] font-medium ${
                selectedExerciseHint === ex && !showCustomInput
                  ? "bg-[#0071e3] text-white font-semibold shadow-sm"
                  : "bg-[#1d1d1f] text-[#86868b] hover:text-[#f5f5f7] border border-white/[0.06]"
              }`}
            >
              {ex}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setShowCustomInput(!showCustomInput)}
            className={`px-3 py-1 rounded-full transition text-[11px] font-medium flex items-center gap-1 ${
              showCustomInput
                ? "bg-[#0071e3] text-white"
                : "bg-[#1d1d1f] text-[#86868b] hover:text-[#f5f5f7] border border-white/[0.06]"
            }`}
          >
            <PlusCircle className="w-3 h-3" />
            <span>Andere</span>
          </button>

          {showCustomInput && (
            <div className="flex items-center gap-1.5 w-full sm:w-auto mt-1 sm:mt-0">
              <input
                id="input-custom-exercise"
                type="text"
                value={customExerciseText}
                onChange={(e) => setCustomExerciseText(e.target.value)}
                placeholder="z. B. Frontkniebeuge..."
                className="bg-[#1d1d1f] border border-white/20 rounded-full px-3 py-1 text-xs text-white placeholder-[#86868b] focus:outline-none focus:border-[#0071e3]"
              />
              <button
                type="button"
                onClick={() => {
                  if (customExerciseText.trim()) {
                    onChangeExerciseHint(customExerciseText.trim());
                  }
                }}
                className="px-3 py-1 bg-[#0071e3] hover:bg-[#0077ed] text-white text-[11px] font-semibold rounded-full shadow-sm"
              >
                Setzen
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mode 1: Video File Upload in Apple Style */}
      {mode === "upload" && (
        <div className="p-5 sm:p-8 space-y-5">
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime,video/mov,video/*"
            onChange={handleFileUpload}
            className="hidden"
          />

          {!uploadedBlobUrl ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files?.[0];
                if (file) processVideoFile(file);
              }}
              className="border-2 border-dashed border-[#424245]/50 hover:border-[#2997ff]/80 rounded-3xl p-10 sm:p-14 text-center cursor-pointer transition-all duration-200 bg-black/40 hover:bg-black/60 flex flex-col items-center justify-center gap-3.5 group"
            >
              <div className="w-16 h-16 rounded-2xl bg-[#1d1d1f] border border-white/10 flex items-center justify-center text-[#2997ff] group-hover:scale-105 transition">
                <FileVideo className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm sm:text-base font-semibold text-[#f5f5f7]">
                  Übungsvideo auswählen oder hierhin ziehen
                </h4>
                <p className="text-xs text-[#86868b] max-w-sm mx-auto leading-relaxed">
                  Unterstützt MP4, WebM, MOV. Ideal sind 1–5 saubere Wiederholungen (5–20 Sekunden), gefilmt aus 45° bis 90° Blickwinkel.
                </p>
              </div>
              <span className="text-xs text-white font-medium bg-[#0071e3] hover:bg-[#0077ed] px-4 py-2 rounded-full transition shadow-sm">
                Video-Datei auswählen
              </span>
            </div>
          ) : (
            videoResultPanel
          )}
        </div>
      )}

      {/* Mode 2: Live camera recording */}
      {mode === "record" && (
        <div className="p-5 sm:p-8 space-y-5">
          {cameraError && (
            <div className="p-4 bg-[#1c1213] border border-[#ff453a]/40 rounded-2xl flex items-start gap-2.5 text-xs text-[#ff9f9a]">
              <AlertCircle className="w-4 h-4 text-[#ff453a] shrink-0 mt-0.5" />
              <span className="leading-relaxed">{cameraError}</span>
            </div>
          )}

          {uploadedBlobUrl ? (
            videoResultPanel
          ) : !isCameraOn ? (
            <div className="border-2 border-dashed border-[#424245]/50 hover:border-[#2997ff]/80 rounded-3xl p-10 sm:p-14 text-center transition-all duration-200 bg-black/40 flex flex-col items-center justify-center gap-3.5">
              <div className="w-16 h-16 rounded-2xl bg-[#1d1d1f] border border-white/10 flex items-center justify-center text-[#2997ff]">
                <Camera className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm sm:text-base font-semibold text-[#f5f5f7]">
                  Satz direkt mit der Kamera aufnehmen
                </h4>
                <p className="text-xs text-[#86868b] max-w-sm mx-auto leading-relaxed">
                  Stelle das Gerät seitlich bis 45° auf Hüfthöhe auf, sodass alle Gelenke im Bild
                  bleiben. Ideal sind 1–5 Wiederholungen, maximal {MAX_RECORDING_SECONDS} Sekunden.
                </p>
              </div>
              <button
                id="btn-start-camera"
                type="button"
                onClick={() => startCamera()}
                disabled={isStartingCamera}
                className="text-xs text-white font-medium bg-[#0071e3] hover:bg-[#0077ed] disabled:opacity-50 px-4 py-2 rounded-full transition shadow-sm flex items-center gap-2"
              >
                {isStartingCamera ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Camera className="w-3.5 h-3.5" />
                )}
                <span>{isStartingCamera ? "Kamera wird gestartet..." : "Kamera starten"}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative rounded-2xl overflow-hidden bg-black aspect-video max-h-[440px] flex items-center justify-center border border-white/[0.08]">
                <video
                  ref={liveVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className={`w-full h-full object-contain ${
                    facingMode === "user" ? "scale-x-[-1]" : ""
                  }`}
                />

                {isRecording && (
                  <div className="absolute top-3 left-3 flex items-center gap-2 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-[#ff453a]/40">
                    <span className="w-2 h-2 rounded-full bg-[#ff453a] animate-pulse" />
                    <span className="text-[11px] font-mono text-[#f5f5f7]">
                      {String(Math.floor(recordedSeconds / 60)).padStart(2, "0")}:
                      {String(recordedSeconds % 60).padStart(2, "0")} / {MAX_RECORDING_SECONDS}s
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => startCamera(facingMode === "user" ? "environment" : "user")}
                    disabled={isRecording || isStartingCamera}
                    className="px-4 py-2 bg-[#1d1d1f] hover:bg-[#2c2c2e] disabled:opacity-40 text-[#f5f5f7] rounded-full text-xs font-semibold transition border border-white/10 flex items-center gap-1.5"
                    title="Zwischen Front- und Rückkamera wechseln"
                  >
                    <SwitchCamera className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Kamera wechseln</span>
                  </button>

                  <button
                    type="button"
                    onClick={stopCamera}
                    disabled={isRecording}
                    className="px-4 py-2 bg-[#1d1d1f] hover:bg-[#2c2c2e] disabled:opacity-40 text-[#f5f5f7] rounded-full text-xs font-semibold transition border border-white/10 flex items-center gap-1.5"
                  >
                    <CameraOff className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Kamera aus</span>
                  </button>
                </div>

                {!isRecording ? (
                  <button
                    id="btn-start-recording"
                    type="button"
                    onClick={startRecording}
                    className="px-6 py-2.5 bg-[#ff453a] hover:bg-[#ff5c52] text-white rounded-full text-xs sm:text-sm font-semibold transition flex items-center gap-2 shadow-lg shadow-[#ff453a]/25 active:scale-95"
                  >
                    <Circle className="w-4 h-4 fill-current" />
                    <span>Aufnahme starten</span>
                  </button>
                ) : (
                  <button
                    id="btn-stop-recording"
                    type="button"
                    onClick={stopRecording}
                    className="px-6 py-2.5 bg-white hover:bg-[#f5f5f7] text-black rounded-full text-xs sm:text-sm font-semibold transition flex items-center gap-2 shadow-lg active:scale-95"
                  >
                    <Square className="w-4 h-4 fill-current" />
                    <span>Aufnahme beenden</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mode 3: Preset Demonstrations in Apple Spec Cards */}
      {mode === "presets" && (
        <div className="p-5 sm:p-8 space-y-4">
          <div>
            <h4 className="text-[11px] font-semibold text-[#86868b] uppercase tracking-wider mb-3">
              Wähle ein Test-Szenario zur sofortigen Überprüfung:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {EXERCISE_PRESETS.map((preset) => {
                const isGood = preset.sampleAnalysis.urteil === "gut";
                const isUsable = preset.sampleAnalysis.urteil === "brauchbar";
                const isFlawed = preset.sampleAnalysis.urteil === "mangelhaft";

                return (
                  <button
                    key={preset.id}
                    id={`preset-${preset.id}`}
                    type="button"
                    onClick={() => onSelectPreset(preset)}
                    className="p-4 rounded-2xl bg-[#1d1d1f]/60 hover:bg-[#1d1d1f] border border-white/[0.06] hover:border-white/20 text-left transition flex flex-col justify-between gap-3 group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold text-[#f5f5f7] group-hover:text-[#2997ff] transition">
                          {preset.name}
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                            isGood
                              ? "bg-[#30d158]/10 border-[#30d158]/20 text-[#30d158]"
                              : isUsable
                              ? "bg-[#ffd60a]/10 border-[#ffd60a]/20 text-[#ffd60a]"
                              : isFlawed
                              ? "bg-[#ff453a]/10 border-[#ff453a]/20 text-[#ff453a]"
                              : "bg-[#1d1d1f] border-white/10 text-[#86868b]"
                          }`}
                        >
                          {preset.sampleAnalysis.urteil}
                        </span>
                      </div>
                      <p className="text-xs text-[#86868b] line-clamp-2 leading-relaxed">
                        {preset.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[#86868b] pt-2 border-t border-white/[0.04]">
                      <span>{preset.exercise}</span>
                      <span className="text-[#2997ff] font-medium group-hover:translate-x-0.5 transition flex items-center gap-1">
                        <span>Laden</span>
                        <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
