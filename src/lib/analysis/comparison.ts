import type {
  MetricComparison,
  MetricMeasurement,
  ReferenceRange,
  ThrowTypeSpec,
} from "./types";
import { demoRangesFor } from "./demo-professionals.ts";

const IMPORTANCE: Record<string, number> = {
  hip_to_shoulder_ms: 1,
  hip_shoulder_separation: 0.92,
  plant_knee_angle: 0.88,
  reach_back_distance: 0.84,
  plant_to_release_ms: 0.8,
  stance_width: 0.7,
  stride_length: 0.68,
  elbow_angle_reach_back: 0.66,
  release_height: 0.6,
  follow_through_travel: 0.55,
  torso_tilt: 0.5,
  plant_foot_angle: 0.45,
  release_forward: 0.5,
  shoulder_to_release_ms: 0.72,
  plant_to_hip_ms: 0.74,
};

function meaning(metric: MetricMeasurement, cmp: Omit<MetricComparison, "plainMeaning">): string {
  if (metric.value == null || !cmp.reference) {
    return `${metric.label} could not be compared.`;
  }
  if (cmp.insideIqr) {
    return `${metric.label} sits inside the observed 25th–75th percentile of the selected demo reference sample.`;
  }
  const dir = (cmp.difference ?? 0) > 0 ? "higher" : "lower";
  return `${metric.label} is ${dir} than the observed range in the selected demo reference sample. That is a measurable difference, not automatically a fault.`;
}

export function compareToReference(
  metrics: MetricMeasurement[],
  throwType: ThrowTypeSpec,
): MetricComparison[] {
  const ranges = demoRangesFor(throwType.family);
  const byId = new Map(ranges.map((r) => [r.metricId, r]));
  return metrics
    .filter((m) => m.classification !== "unavailable")
    .map((metric) => {
      const reference: ReferenceRange | null = byId.get(metric.id) ?? null;
      let difference: number | null = null;
      let zScore: number | null = null;
      let insideIqr: boolean | null = null;
      if (metric.value != null && reference) {
        difference = metric.value - reference.median;
        zScore = reference.sd > 1e-6 ? difference / reference.sd : 0;
        insideIqr = metric.value >= reference.p25 && metric.value <= reference.p75;
      }
      const base = {
        metricId: metric.id,
        label: metric.label,
        userValue: metric.value,
        reference,
        difference,
        zScore,
        confidence: metric.confidence,
        importance: IMPORTANCE[metric.id] ?? 0.4,
        classification: metric.classification,
        insideIqr,
      };
      return { ...base, plainMeaning: meaning(metric, base) };
    });
}
