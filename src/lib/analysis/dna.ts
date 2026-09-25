import type { MetricMeasurement, StoredThrow } from "./types";

export interface DnaCategory {
  id: string;
  label: string;
  metricIds: string[];
  summary: string;
  n: number;
  insideCount: number;
  confidence: "high" | "medium" | "low";
}

const CATS: Array<{ id: string; label: string; metricIds: string[] }> = [
  { id: "power", label: "Power generation", metricIds: ["hip_shoulder_separation", "plant_to_release_ms"] },
  { id: "lower", label: "Lower-body mechanics", metricIds: ["stance_width", "stride_length", "plant_knee_angle"] },
  { id: "hips", label: "Hip rotation", metricIds: ["pelvis_orientation", "plant_to_hip_ms", "hip_to_shoulder_ms"] },
  { id: "torso", label: "Torso sequencing", metricIds: ["hip_shoulder_separation", "torso_tilt", "hip_to_shoulder_ms"] },
  { id: "arm", label: "Arm mechanics", metricIds: ["reach_back_distance", "elbow_angle_reach_back", "arm_angle_reach_back"] },
  { id: "release", label: "Release mechanics", metricIds: ["release_height", "release_forward", "elbow_angle_release"] },
  { id: "timing", label: "Timing", metricIds: ["hip_to_shoulder_ms", "plant_to_release_ms", "shoulder_to_release_ms"] },
  { id: "follow", label: "Follow-through", metricIds: ["follow_through_travel"] },
];

function pick(metrics: MetricMeasurement[], id: string) {
  return metrics.find((m) => m.id === id);
}

export function buildThrowDna(throws: StoredThrow[]): DnaCategory[] {
  const real = throws.filter((t) => !t.isDemo);
  const source = real.length ? real : throws;
  const latest = source[0];
  if (!latest) return [];
  const comparisons = latest.analysis.comparisons;
  return CATS.map((cat) => {
    const rows = cat.metricIds
      .map((id) => comparisons.find((c) => c.metricId === id))
      .filter((c): c is NonNullable<typeof c> => !!c && c.userValue != null);
    const inside = rows.filter((r) => r.insideIqr).length;
    const confs = rows.map((r) => r.confidence);
    const confidence = confs.includes("low") && !confs.includes("high") ? "low" : confs.includes("high") ? "high" : "medium";
    const summary = rows.length
      ? `${inside} of ${rows.length} compared metrics sit inside the demo reference interquartile range.`
      : "Not enough measurements in this category yet.";
    void pick;
    return { id: cat.id, label: cat.label, metricIds: cat.metricIds, summary, n: rows.length, insideCount: inside, confidence };
  });
}
