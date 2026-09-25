/** Central product identity — rename here, not throughout the UI. */
export const PRODUCT = {
  name: "Pro Throw Analyzer",
  shortName: "Throw Analyzer",
  tagline: "Measure the throw. Train the difference.",
  description:
    "Analyze disc-golf throwing mechanics from video, compare movement patterns to a reference sample, and train one clear focus at a time.",
} as const;

export const ANALYSIS_VERSIONS = {
  vision: "1.0.0",
  visionModel: "mediapipe-pose-landmarker-lite",
  metrics: "1.0.0",
  references: "1.0.0-demo",
  coaching: "1.0.0",
} as const;

export const LIMITS = {
  maxVideoBytes: 48 * 1024 * 1024,
  maxDurationSec: 12,
  minDurationSec: 0.8,
  minWidth: 360,
  minHeight: 360,
  targetSampleFps: 20,
  maxSampleFrames: 180,
  analyzeWindowSec: 6,
} as const;
