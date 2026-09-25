import assert from "node:assert/strict";
import { test } from "node:test";
import { generateDemoFrames } from "./demo-throw.ts";
import { computeBodyScale } from "./body-scale.ts";
import { buildKinematics, detectPhases } from "./phase-detector.ts";
import { computeMetrics } from "./metrics.ts";
import { compareToReference } from "./comparison.ts";
import { buildCoaching } from "./coaching.ts";
import { THROW_TYPES } from "./throw-catalog.ts";
import { smoothPoseFrames } from "./smoothing.ts";

const rhbh = THROW_TYPES[0]!;

test("demo throw produces phases, metrics, and no fabricated disc spin", () => {
  const frames = smoothPoseFrames(generateDemoFrames({ variant: "early-shoulder" }), 5);
  const scale = computeBodyScale(frames, rhbh);
  const kin = buildKinematics(frames, rhbh, scale, "off-arm-side");
  const phases = detectPhases(frames, rhbh, kin);
  assert.ok(phases.some((p) => p.id === "release"));
  assert.ok(phases.some((p) => p.id === "plant"));
  const metrics = computeMetrics(frames, rhbh, phases, kin, scale);
  const spin = metrics.find((m) => m.id === "disc_spin");
  assert.equal(spin?.classification, "unavailable");
  assert.equal(spin?.value, null);
  const speed = metrics.find((m) => m.id === "release_speed");
  assert.equal(speed?.classification, "unavailable");
  const knee = metrics.find((m) => m.id === "plant_knee_angle");
  assert.ok(knee?.value == null || (knee.value > 0 && knee.value < 180));
  const comparisons = compareToReference(metrics, rhbh);
  const coaching = buildCoaching(rhbh, comparisons, {
    chain: [],
    progressesDistally: true,
    notes: "",
    confidence: "medium",
  });
  assert.ok(coaching.medicalDisclaimer.length > 20);
  assert.ok(kin.releaseIndex != null);
});

test("collapsed brace demo differs from early-shoulder demo", () => {
  const a = generateDemoFrames({ variant: "early-shoulder" });
  const b = generateDemoFrames({ variant: "collapsed-brace" });
  const sa = computeBodyScale(a, rhbh);
  const sb = computeBodyScale(b, rhbh);
  const ka = buildKinematics(a, rhbh, sa, "off-arm-side");
  const kb = buildKinematics(b, rhbh, sb, "off-arm-side");
  const pa = detectPhases(a, rhbh, ka);
  const pb = detectPhases(b, rhbh, kb);
  const ma = computeMetrics(a, rhbh, pa, ka, sa).find((m) => m.id === "plant_knee_angle")?.value;
  const mb = computeMetrics(b, rhbh, pb, kb, sb).find((m) => m.id === "plant_knee_angle")?.value;
  assert.ok(ma != null && mb != null);
  assert.notEqual(Number(ma.toFixed(2)), Number(mb.toFixed(2)));
});


test("release proxy ignores an early speed spike and requires directional late motion", async () => {
  const { detectReleaseProxy } = await import("./phase-detector.ts");
  const wristSpeed = [0.02, 0.04, 0.08, 0.42, 0.12, 0.08, 0.1, 0.16, 0.25, 0.7, 0.34, 0.18, 0.1, 0.08];
  const wristX = [0.1, 0.11, 0.13, 0.18, 0.17, 0.16, 0.18, 0.23, 0.3, 0.5, 0.62, 0.7, 0.74, 0.76];
  assert.equal(detectReleaseProxy(wristSpeed, wristX, 1), 9);

  const reversingX = [0.1, 0.12, 0.14, 0.16, 0.18, 0.2, 0.18, 0.12, 0.08, 0.05];
  assert.equal(
    detectReleaseProxy([0.02, 0.03, 0.04, 0.05, 0.08, 0.1, 0.2, 0.5, 0.2, 0.1], reversingX, 1),
    null,
  );
});
