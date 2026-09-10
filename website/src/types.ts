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

/** A moment in the clip the coach wants to point at, in seconds from start. */
export interface FaultMoment {
  sekunde: number;
  label: string;
  hinweis?: string;
  schwere?: "hinweis" | "fehler";
}

export interface ExerciseAnalysisData {
  exerciseName: string;
  urteil: ExerciseVerdict;
  begruendung: string;
  /** What the athlete already does well — listed before the faults. */
  wasGutWar?: string[];
  /** Time-stamped findings, used to annotate the athlete's own clip. */
  fehlerZeitpunkte?: FaultMoment[];
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

export type ChatRole = "head_coach" | "technique_coach" | "quick_cue";

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
