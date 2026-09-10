export interface DimensionsEstimate {
  estimatedArea: string;
  ceilingHeight: string;
  shape: string;
}

export interface LightingAnalysis {
  naturalLightScore: number;
  artificialLightScore: number;
  windowDirectionNotes: string;
  tips: string[];
}

export interface ColorPaletteItem {
  hex: string;
  name: string;
  role: string;
}

export interface DetectedItem {
  name: string;
  location: string;
  conditionOrNote: string;
}

export interface ErgonomicsAndFlow {
  rating: string;
  pros: string[];
  bottlenecks: string[];
}

export interface Recommendation {
  category: string;
  title: string;
  description: string;
  priority: "Hoog" | "Gemiddeld" | "Laag";
}

export interface SafetyAndClutter {
  clutterScore: number;
  safetyNotes: string[];
  quickWins: string[];
}

export interface RoomAnalysisData {
  roomType: string;
  style: string;
  dimensionsEstimate: DimensionsEstimate;
  lighting: LightingAnalysis;
  colorPalette: ColorPaletteItem[];
  detectedItems: DetectedItem[];
  ergonomicsAndFlow: ErgonomicsAndFlow;
  keyRecommendations: Recommendation[];
  safetyAndClutter: SafetyAndClutter;
  overallSummary: string;
}

export type ExerciseVerdict = "gut" | "brauchbar" | "mangelhaft" | "nicht_beurteilbar";
export type WeightRecommendation = "hochgehen" | "gleich bleiben" | "runtergehen";

export interface RepetitionObservation {
  repNumber: number;
  phase?: string;
  umkehrpunkt?: string;
  tempo?: string;
  gelenke?: string;
  notes?: string;
}

export interface AgentPhaseItem {
  phaseId: "triage" | "segmentation" | "biomechanics" | "verdict" | "drill";
  name: string;
  status: "done" | "in_progress" | "pending" | "warning";
  summary: string;
  details?: string[];
}

export interface DrillRecommendation {
  title: string;
  setsAndReps: string;
  executionCue: string;
  purpose: string;
}

export interface AlternativeCues {
  externalCue: string;
  internalCue: string;
  visualCue: string;
}

export interface ExerciseAnalysisData {
  exerciseName: string;
  urteil: ExerciseVerdict;
  begruendung: string;
  derWichtigsteFehler: string;
  korrektur: string;
  gewicht: {
    empfehlung: WeightRecommendation;
    begruendung: string;
  };
  wasNichtBeurteilbar: string;
  repetitionDetails?: RepetitionObservation[];
  beobachteteKriterien?: {
    bewegungsumfang?: string;
    gelenkstellung?: string;
    tempo?: string;
    schwung?: string;
    symmetrie?: string;
    konsistenz?: string;
  };
  agentTrace?: AgentPhaseItem[];
  drillRecommendation?: DrillRecommendation;
  alternativeCues?: AlternativeCues;
  rawOutputText: string;
}

export type ChatRole =
  | "head_coach"
  | "technique_coach"
  | "quick_cue"
  | "architect"
  | "stylist"
  | "fast_organizer";

export type GeminiModelChoice =
  | "gemini-3.1-pro-preview"
  | "gemini-3.5-flash"
  | "gemini-3.1-flash-lite";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  modelUsed?: string;
}

export type ImageResolution = "1K" | "2K" | "4K";

export interface GeneratedImageItem {
  id: string;
  url: string;
  prompt: string;
  size: ImageResolution;
  aspectRatio: string;
  createdAt: string;
  modelUsed: string;
}
