import type { ReferenceRange, ThrowFamily } from "./types";

/**
 * DEMO / SYNTHETIC reference distributions.
 * These are not measurements of named professional players.
 * They exist so comparison, matching, and coaching can run during development
 * without scraping or fabricating real pro statistics.
 */
export interface DemoPlayer {
  playerId: string;
  playerName: string;
  displayName: string;
  handedness: "right" | "left";
  throwTypes: string[];
  heightCm: number | null;
  dominantThrowStyles: string[];
  source: string;
  sourceUrl: string | null;
  licenseStatus: "demo-synthetic";
  rightsStatus: "not_licensed";
  sourceType: "synthetic_development_record";
  commercialUseAllowed: false;
  attributionRequired: true;
  dataQuality: "demo";
  sampleCount: number;
  analysisVersion: string;
  notes: string;
}

export const DEMO_PLAYERS: DemoPlayer[] = [
  {
    playerId: "demo-pro-01",
    playerName: "DEMO PROFESSIONAL 01",
    displayName: "Reference Athlete A",
    handedness: "right",
    throwTypes: ["RHBH"],
    heightCm: null,
    dominantThrowStyles: ["x-step", "distance"],
    source: "Synthetic development record",
    sourceUrl: null,
    licenseStatus: "demo-synthetic",
    rightsStatus: "not_licensed",
    sourceType: "synthetic_development_record",
    commercialUseAllowed: false,
    attributionRequired: true,
    dataQuality: "demo",
    sampleCount: 24,
    analysisVersion: "1.0.0-demo",
    notes: "DEMO DATA. Not a real professional. Used only to exercise comparison.",
  },
  {
    playerId: "demo-pro-02",
    playerName: "DEMO PROFESSIONAL 02",
    displayName: "Reference Athlete B",
    handedness: "right",
    throwTypes: ["RHBH"],
    heightCm: null,
    dominantThrowStyles: ["x-step", "control"],
    source: "Synthetic development record",
    sourceUrl: null,
    licenseStatus: "demo-synthetic",
    rightsStatus: "not_licensed",
    sourceType: "synthetic_development_record",
    commercialUseAllowed: false,
    attributionRequired: true,
    dataQuality: "demo",
    sampleCount: 18,
    analysisVersion: "1.0.0-demo",
    notes: "DEMO DATA. Not a real professional.",
  },
  {
    playerId: "demo-pro-03",
    playerName: "DEMO PROFESSIONAL 03",
    displayName: "Reference Athlete C",
    handedness: "right",
    throwTypes: ["RHFH"],
    heightCm: null,
    dominantThrowStyles: ["x-step", "distance"],
    source: "Synthetic development record",
    sourceUrl: null,
    licenseStatus: "demo-synthetic",
    rightsStatus: "not_licensed",
    sourceType: "synthetic_development_record",
    commercialUseAllowed: false,
    attributionRequired: true,
    dataQuality: "demo",
    sampleCount: 12,
    analysisVersion: "1.0.0-demo",
    notes: "DEMO DATA. Not a real professional. Forehand profile.",
  },
];

const SOURCE_NOTE =
  "Observed range within the selected DEMO reference sample. Not a “correct” value. Not real professional statistics.";

function range(
  metricId: string,
  unit: string,
  median: number,
  sd: number,
  sampleSize: number,
): ReferenceRange {
  return {
    metricId,
    sampleSize,
    median,
    mean: median,
    sd,
    p25: median - 0.674 * sd,
    p75: median + 0.674 * sd,
    unit,
    dataQuality: "demo",
    sourceNote: SOURCE_NOTE,
  };
}

/** Per-throw-family demo distributions for MVP metrics. */
export function demoRangesFor(family: ThrowFamily): ReferenceRange[] {
  const n = family === "forehand" ? 12 : family === "putting" ? 10 : 24;
  if (family === "putting") {
    return [
      range("stance_width", "× shoulder width", 0.72, 0.08, n),
      range("plant_knee_angle", "deg", 162, 8, n),
      range("reach_back_distance", "× shoulder width", 0.55, 0.1, n),
      range("elbow_angle_release", "deg", 158, 10, n),
      range("release_height", "× body height (image)", 0.72, 0.04, n),
      range("hip_to_shoulder_ms", "ms", 20, 15, n),
    ];
  }
  if (family === "forehand") {
    return [
      range("stance_width", "× shoulder width", 1.15, 0.18, n),
      range("stride_length", "× shoulder width", 1.35, 0.22, n),
      range("plant_knee_angle", "deg", 142, 10, n),
      range("hip_shoulder_separation", "deg (apparent)", 28, 8, n),
      range("reach_back_distance", "× shoulder width", 1.05, 0.18, n),
      range("elbow_angle_reach_back", "deg", 95, 14, n),
      range("elbow_angle_release", "deg", 155, 12, n),
      range("release_height", "× body height (image)", 0.78, 0.06, n),
      range("release_forward", "× shoulder width", 0.85, 0.2, n),
      range("plant_to_hip_ms", "ms", 55, 18, n),
      range("hip_to_shoulder_ms", "ms", 28, 12, n),
      range("shoulder_to_release_ms", "ms", 70, 18, n),
      range("plant_to_release_ms", "ms", 155, 28, n),
      range("follow_through_travel", "× shoulder width", 1.4, 0.3, n),
      range("torso_tilt", "deg from vertical (image)", 12, 8, n),
    ];
  }
  // backhand / approach default
  return [
    range("stance_width", "× shoulder width", 1.22, 0.16, n),
    range("stride_length", "× shoulder width", 1.45, 0.2, n),
    range("plant_knee_angle", "deg", 138, 9, n),
    range("plant_foot_angle", "deg (image)", 28, 10, n),
    range("hip_shoulder_separation", "deg (apparent)", 36, 8, n),
    range("reach_back_distance", "× shoulder width", 1.38, 0.16, n),
    range("arm_angle_reach_back", "deg", 148, 12, n),
    range("elbow_angle_reach_back", "deg", 118, 14, n),
    range("elbow_angle_release", "deg", 162, 10, n),
    range("release_height", "× body height (image)", 0.86, 0.05, n),
    range("release_forward", "× shoulder width", 0.72, 0.18, n),
    range("plant_to_hip_ms", "ms", 48, 16, n),
    range("hip_to_shoulder_ms", "ms", 32, 10, n),
    range("shoulder_to_release_ms", "ms", 78, 16, n),
    range("plant_to_release_ms", "ms", 168, 24, n),
    range("follow_through_travel", "× shoulder width", 1.65, 0.28, n),
    range("torso_tilt", "deg from vertical (image)", 18, 7, n),
  ];
}

export const REFERENCE_GROUPS = [
  {
    id: "demo-all-bh",
    label: "Demo · all backhand",
    family: "backhand" as ThrowFamily,
    sampleSize: 42,
    demo: true,
  },
  {
    id: "demo-distance-bh",
    label: "Demo · backhand distance",
    family: "backhand" as ThrowFamily,
    sampleSize: 24,
    demo: true,
  },
  {
    id: "demo-fh",
    label: "Demo · forehand",
    family: "forehand" as ThrowFamily,
    sampleSize: 12,
    demo: true,
  },
];
