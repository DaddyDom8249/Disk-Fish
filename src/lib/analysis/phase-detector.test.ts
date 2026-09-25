import assert from "node:assert/strict";
import { test } from "node:test";
import { detectReleaseProxy } from "./phase-detector.ts";

test("release proxy ignores an earlier speed spike and selects a later directional local peak", () => {
  const wristSpeed = [0.02, 0.04, 0.08, 0.42, 0.12, 0.08, 0.1, 0.16, 0.25, 0.7, 0.34, 0.18, 0.1, 0.08];
  const wristX = [0.1, 0.11, 0.13, 0.18, 0.17, 0.16, 0.18, 0.23, 0.3, 0.5, 0.62, 0.7, 0.74, 0.76];
  assert.equal(detectReleaseProxy(wristSpeed, wristX, 1), 9);
});

test("release proxy rejects a late peak that is not moving in the inferred throw direction", () => {
  const wristSpeed = [0.02, 0.03, 0.04, 0.05, 0.08, 0.1, 0.2, 0.5, 0.2, 0.1];
  const wristX = [0.1, 0.12, 0.14, 0.16, 0.18, 0.2, 0.18, 0.12, 0.08, 0.05];
  assert.equal(detectReleaseProxy(wristSpeed, wristX, 1), null);
});

test("release proxy returns null when no usable directional peak exists", () => {
  assert.equal(detectReleaseProxy([null, null, null, null, null, null], [0, 0, 0, 0, 0, 0], 1), null);
});
