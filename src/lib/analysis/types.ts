import { ANALYSIS_VERSIONS } from "@/lib/product";

export type Classification = "measured" | "estimated" | "inferred" | "unavailable";
export type ConfidenceLevel = "high" | "medium" | "low";
export type QualityGrade = "good" | "acceptable" | "poor" | "unusable";
export type ThrowHand = "right" | "left";
export type ThrowFamily = "backhand" | "forehand" | "putting" | "approach";
export type Footwork = "standstill" | "one-step" | "x-step";
export type ThrowIntent = "putting" | "approach" | "control" | "distance";
export type CameraAngle =
  | "off-arm-side"
  | "throwing-side"
  | "rear"
  | "rear-side"
  | "front"
  | "unknown";

export type PhaseId =
  | "setup"
  | "initial_movement"
  | "x_step"
  | "cross_step"
  | "plant_preparation"
  | "plant"
  | "brace"
  | "reach_back"
  | "transition"
  | "hip_rotation"
  | "shoulder_rotation"
  | "arm_acceleration"
  | "elbow_extension"
  | "wrist_acceleration"
  | "release"
  | "follow_through"
  | "recovery";

export type NamedJoint =
  | "head"
  | "neck"
  | "left_shoulder"
  | "right_shoulder"
  | "left_elbow"
  | "right_elbow"
  | "left_wrist"
  | "right_wrist"
  | "left_hip"
  | "right_hip"
  | "left_knee"
  | "right_knee"
  | "left_ankle"
  | "right_ankle"
  | "left_foot"
  | "right_foot";

export type MetricCategory =
  | "lower_body"
  | "pelvis"
  | "torso"
  | "throwing_arm"
  | "release"
  | "disc"
  | "timing"
  | "sequencing"
  | "balance";

export type AnalysisState =
  | "idle"
  | "uploading"
  | "validating"
  | "processing"
  | "pose_detection"
  | "phase_detection"
  | "metric_analysis"
  | "reference_comparison"
  | "coaching"
  | "complete"
  | "failed";

export type FocusBand = "primary" | "secondary" | "observe";
export type IssueLikelihood = "difference" | "potential_issue" | "likely_issue" | "high_confidence_issue";

export interface Landmark {
  x: number;
  y: number;
  z: number | null;
  visibility: number;
}

export interface PoseFrame {
  frame: number;
  timestampMs: number;
  landmarks: Partial<Record<NamedJoint, Landmark>>;
  raw: Landmark[];
  personCount: number;
  selectedPersonIndex: number;
}

export interface ThrowTypeSpec {
  id: string;
  code: string;
  label: string;
  hand: ThrowHand;
  family: ThrowFamily;
  footwork: Footwork;
  intent: ThrowIntent;
  plantFoot: "left" | "right";
  throwingArm: "left" | "right";
  phases: PhaseId[];
}

export interface VideoMeta {
  durationSec: number;
  width: number;
  height: number;
  fps: number | null;
  sizeBytes: number;
  mimeType: string;
  name: string;
}

export interface QualityIssue {
  code: string;
  severity: "info" | "warning" | "blocking";
  message: string;
}

export interface VideoQuality {
  grade: QualityGrade;
  score: number;
  factors: {
    bodyVisibility: number;
    frameRate: number;
    resolution: number;
    cameraStability: number;
    lighting: number;
    occlusion: number;
    backgroundContrast: number;
    throwCompleteness: number;
  };
  issues: QualityIssue[];
  summary: string;
}

export interface ThrowPhase {
  id: PhaseId;
  label: string;
  startFrame: number;
  endFrame: number;
  peakFrame: number;
  startMs: number;
  endMs: number;
  peakMs: number;
  confidence: ConfidenceLevel;
  confidenceReason: string;
}

export interface MetricMeasurement {
  id: string;
  label: string;
  category: MetricCategory;
  value: number | null;
  unit: string;
  classification: Classification;
  confidence: ConfidenceLevel;
  confidenceReason: string;
  source: string;
  method: string;
  frame?: number;
  timestampMs?: number;
  unavailableReason?: string;
  normalized: boolean;
  limitations: string;
  howMeasured: string;
}

export interface TimingInterval {
  id: string;
  from: PhaseId | string;
  to: PhaseId | string;
  ms: number | null;
  pctOfThrow: number | null;
  classification: Classification;
  confidence: ConfidenceLevel;
}

export interface SequencingEvent {
  segment: string;
  peakFrame: number;
  peakMs: number;
  confidence: ConfidenceLevel;
}

export interface SequencingResult {
  chain: SequencingEvent[];
  progressesDistally: boolean | null;
  notes: string;
  confidence: ConfidenceLevel;
}

export interface BodyScale {
  shoulderWidth: number | null;
  hipWidth: number | null;
  height: number | null;
  throwingArmLength: number | null;
  plantLegLength: number | null;
  method: string;
}

export interface ReferenceRange {
  metricId: string;
  sampleSize: number;
  median: number;
  mean: number;
  sd: number;
  p25: number;
  p75: number;
  unit: string;
  dataQuality: "demo" | "licensed";
  sourceNote: string;
}

export interface MetricComparison {
  metricId: string;
  label: string;
  userValue: number | null;
  reference: ReferenceRange | null;
  difference: number | null;
  zScore: number | null;
  confidence: ConfidenceLevel;
  importance: number;
  classification: Classification;
  insideIqr: boolean | null;
  plainMeaning: string;
}

export interface CoachingFinding {
  id: string;
  title: string;
  band: FocusBand;
  likelihood: IssueLikelihood;
  confidence: ConfidenceLevel;
  metricIds: string[];
  ruleId: string;
  whatWeSaw: string;
  whyItMatters: string;
  whatToTry: string[];
  watchFor: string;
  recheck: string;
  audit: {
    userMeasurements: Record<string, number | null>;
    reference: Record<string, { p25: number; p75: number; median: number } | null>;
    triggeredBecause: string;
  };
}

export interface CoachingResult {
  whatWeSaw: string;
  whyItMatters: string;
  primaryFocus: CoachingFinding | null;
  secondaryFocus: CoachingFinding | null;
  observe: CoachingFinding[];
  llmText: string | null;
  llmUsed: boolean;
  medicalDisclaimer: string;
}

export interface InvalidCondition {
  code: string;
  message: string;
  blocking: boolean;
}

export interface AnalysisRecord {
  id: string;
  createdAt: string;
  isDemo: boolean;
  throwType: ThrowTypeSpec;
  cameraAngle: CameraAngle;
  disc?: string;
  distanceMeters?: number | null;
  notes?: string;
  videoMeta: VideoMeta | null;
  quality: VideoQuality;
  versions: typeof ANALYSIS_VERSIONS;
  poseModel: { id: string; version: string };
  bodyScale: BodyScale;
  frames: PoseFrame[];
  phases: ThrowPhase[];
  metrics: MetricMeasurement[];
  timings: TimingInterval[];
  sequencing: SequencingResult;
  comparisons: MetricComparison[];
  coaching: CoachingResult;
  invalid: InvalidCondition[];
  referenceGroupId: string;
  primaryFocusId: string | null;
  overallConfidence: ConfidenceLevel;
  overallConfidenceReason: string;
}

export interface StoredThrow {
  id: string;
  createdAt: string;
  isDemo: boolean;
  throwTypeId: string;
  throwTypeCode: string;
  throwTypeLabel: string;
  hand: ThrowHand;
  family: ThrowFamily;
  footwork: Footwork;
  intent: ThrowIntent;
  cameraAngle: CameraAngle;
  disc?: string;
  distanceMeters?: number | null;
  notes?: string;
  primaryFocusTitle: string | null;
  overallConfidence: ConfidenceLevel;
  qualityGrade: QualityGrade;
  analysis: AnalysisRecord;
  hasVideo: boolean;
}

export interface AnalyzeInput {
  file: File | null;
  throwType: ThrowTypeSpec;
  cameraAngle: CameraAngle;
  disc?: string;
  distanceMeters?: number | null;
  notes?: string;
  isDemo?: boolean;
  demoVariant?: "early-shoulder" | "reference-like" | "collapsed-brace";
}

export type ProgressFn = (state: AnalysisState, progress: number, label: string) => void;
