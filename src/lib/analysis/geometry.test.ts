import assert from "node:assert/strict";
import { test } from "node:test";
import { angleDeg, angDiff, dist2, headingDeg, mean, median } from "./geometry.ts";

const A = { x: 0, y: 0, z: null, visibility: 1 };
const B = { x: 1, y: 0, z: null, visibility: 1 };
const C = { x: 1, y: 1, z: null, visibility: 1 };

test("right angle at B is 90 degrees", () => {
  const deg = angleDeg(A, B, C);
  assert.ok(Math.abs(deg - 90) < 1e-6);
});

test("distance is Euclidean in the image plane", () => {
  assert.equal(dist2(A, C), Math.SQRT2);
});

test("heading rightward is 0", () => {
  assert.ok(Math.abs(headingDeg(A, B)) < 1e-6);
});

test("angular difference wraps", () => {
  assert.equal(angDiff(170, -170), -20);
});

test("mean and median ignore empty", () => {
  assert.equal(mean([]), null);
  assert.equal(median([1, 3, 2]), 2);
});
