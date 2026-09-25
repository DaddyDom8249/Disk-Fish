import assert from "node:assert/strict";
import { test } from "node:test";
import { runRules } from "./rules.ts";
import { THROW_TYPES } from "./throw-catalog.ts";
import type { MetricComparison } from "./types.ts";

function cmp(id: string, user: number, p25: number, p75: number, median: number): MetricComparison {
  return {
    metricId: id,
    label: id,
    userValue: user,
    reference: {
      metricId: id,
      sampleSize: 24,
      median,
      mean: median,
      sd: 10,
      p25,
      p75,
      unit: "ms",
      dataQuality: "demo",
      sourceNote: "demo",
    },
    difference: user - median,
    zScore: (user - median) / 10,
    confidence: "high",
    importance: 1,
    classification: "measured",
    insideIqr: user >= p25 && user <= p75,
    plainMeaning: "",
  };
}

test("early shoulder timing fires EARLY_UPPER_BODY_ACCELERATION", () => {
  const fired = runRules({
    throwType: THROW_TYPES[0]!,
    comparisons: [cmp("hip_to_shoulder_ms", -20, 20, 40, 32)],
    sequencing: { chain: [], progressesDistally: true, notes: "", confidence: "high" },
  });
  assert.ok(fired.some((f) => f.finding.ruleId === "EARLY_UPPER_BODY_ACCELERATION"));
  const f = fired.find((x) => x.finding.ruleId === "EARLY_UPPER_BODY_ACCELERATION")!;
  assert.equal(f.finding.audit.userMeasurements.hip_to_shoulder_ms, -20);
});

test("values inside the demo IQR do not invent a primary issue from hip timing", () => {
  const fired = runRules({
    throwType: THROW_TYPES[0]!,
    comparisons: [cmp("hip_to_shoulder_ms", 32, 20, 40, 32)],
    sequencing: { chain: [], progressesDistally: true, notes: "", confidence: "high" },
  });
  assert.equal(
    fired.some((f) => f.finding.ruleId === "EARLY_UPPER_BODY_ACCELERATION"),
    false,
  );
});
