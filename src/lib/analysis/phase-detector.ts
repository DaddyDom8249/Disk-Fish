import type {
  CameraAngle,
  ConfidenceLevel,
  PoseFrame,
  ThrowPhase,
  ThrowTypeSpec,
} from "./types";
import { PHASE_LABELS } from "./throw-catalog.ts";
import { angleDeg, angDiff, argMax, dist2, headingDeg, movingAverage } from "./geometry.ts";
import { jointAt } from "./smoothing.ts";
import type { BodyScale } from "./types";

export interface KinematicSeries {
  times: number[];
  dt: number;
  wristX: Array<number | null>;
  wristY: Array<number | null>;
  wristSpeed: Array<number | null>;
  plantAnkleX: Array<number | null>;
  plantAnkleSpeed: Array<number | null>;
  rearAnkleX: Array<number | null>;
  hipAngle: Array<number | null>;
  shoulderAngle: Array<number | null>;
  hipSpeed: Array<number | null>;
  shoulderSpeed: Array<number | null>;
  elbowAngle: Array<number | null>;
  comX: Array<number | null>;
  throwDirection: 1 | -1;
  releaseIndex: number | null;
  plantIndex: number | null;
  reachBackIndex: number | null;
}

function conf(n: number, reason: string): { confidence: ConfidenceLevel; confidenceReason: string } {
  if (n >= 0.75) return { confidence: "high", confidenceReason: reason };
  if (n >= 0.5) return { confidence: "medium", confidenceReason: reason };
  return { confidence: "low", confidenceReason: reason };
}

function seriesOk(arr: Array<number | null>): number {
  if (!arr.length) return 0;
  return arr.filter((v) => v != null).length / arr.length;
}

function angularFiniteDiff(values: Array<number | null>, dt: number): Array<number | null> {
  return values.map((v, i) => {
    if (v == null) return null;
    const prev = values[i - 1];
    const next = values[i + 1];
    if (prev != null && next != null) return angDiff(next, prev) / (2 * dt);
    if (next != null) return angDiff(next, v) / dt;
    if (prev != null) return angDiff(v, prev) / dt;
    return 0;
  });
}

function findReachBackIndex(wristX: Array<number | null>, direction: 1 | -1): number | null {
  const end = Math.max(2, Math.floor(wristX.length * 0.65));
  let best = direction > 0 ? Infinity : -Infinity;
  let index: number | null = null;

  for (let i = 0; i < end; i++) {
    const x = wristX[i];
    if (x == null) continue;
    if (direction > 0 && x < best) {
      best = x;
      index = i;
    } else if (direction < 0 && x > best) {
      best = x;
      index = i;
    }
  }

  return index;
}

function findReleaseIndex(
  wristX: Array<number | null>,
  wristSpeed: Array<number | null>,
  direction: 1 | -1,
): number | null {
  const reachBack = findReachBackIndex(wristX, direction);
  const start = Math.max(2, (reachBack ?? Math.floor(wristX.length * 0.35)) + 2);
  const end = Math.min(wristSpeed.length - 2, Math.max(start, Math.floor(wristSpeed.length * 0.9)));

  let bestIndex: number | null = null;
  let bestSpeed = -Infinity;

  // Release is selected from local wrist-speed peaks after reach-back,
  // not from a clip-wide maximum that can be caused by follow-through noise.
  for (let i = start; i <= end; i++) {
    const speed = wristSpeed[i];
    if (speed == null) continue;
    const prev = wristSpeed[i - 1];
    const next = wristSpeed[i + 1];
    if (prev != null && next != null && speed >= prev && speed >= next && speed > bestSpeed) {
      bestSpeed = speed;
      bestIndex = i;
    }
  }

  if (bestIndex != null) return bestIndex;

  // Sparse landmark streams may have no strict local peak. Fall back to
  // the strongest measured speed inside the phase-bounded search window.
  for (let i = start; i <= end; i++) {
    const speed = wristSpeed[i];
    if (speed != null && speed > bestSpeed) {
      bestSpeed = speed;
      bestIndex = i;
    }
  }

  return bestIndex;
}

export function inferThrowDirection(frames: PoseFrame[], throwType: ThrowTypeSpec): 1 | -1 {
  const wrist = throwType.throwingArm === "right" ? "right_wrist" : "left_wrist";
  const xs: number[] = [];
  for (const f of frames) {
    const w = jointAt(f, wrist);
    if (w) xs.push(w.x);
  }
  if (xs.length < 4) return 1;
  const first = xs.slice(0, Math.max(2, Math.floor(xs.length * 0.25)));
  const last = xs.slice(Math.floor(xs.length * 0.75));
  const a = first.reduce((s, n) => s + n, 0) / first.length;
  const b = last.reduce((s, n) => s + n, 0) / last.length;
  return b >= a ? 1 : -1;
}

export function buildKinematics(
  frames: PoseFrame[],
  throwType: ThrowTypeSpec,
  _scale: BodyScale,
  _camera: CameraAngle,
): KinematicSeries {
  const dir = inferThrowDirection(frames, throwType);
  const wristJ = throwType.throwingArm === "right" ? "right_wrist" : "left_wrist";
  const plantJ = throwType.plantFoot === "left" ? "left_ankle" : "right_ankle";
  const rearJ = throwType.plantFoot === "left" ? "right_ankle" : "left_ankle";
  const times = frames.map((f) => f.timestampMs);
  const dt =
    frames.length > 1
      ? (frames[frames.length - 1]!.timestampMs - frames[0]!.timestampMs) / (frames.length - 1) / 1000
      : 1 / 20;

  const wristX = frames.map((f) => jointAt(f, wristJ)?.x ?? null);
  const wristY = frames.map((f) => jointAt(f, wristJ)?.y ?? null);
  const plantAnkleX = frames.map((f) => jointAt(f, plantJ)?.x ?? null);
  const rearAnkleX = frames.map((f) => jointAt(f, rearJ)?.x ?? null);
  const comX = frames.map((f) => {
    const lh = jointAt(f, "left_hip");
    const rh = jointAt(f, "right_hip");
    if (!lh || !rh) return null;
    return (lh.x + rh.x) / 2;
  });
  const hipAngle = frames.map((f) => {
    const l = jointAt(f, "left_hip");
    const r = jointAt(f, "right_hip");
    if (!l || !r) return null;
    return headingDeg(l, r);
  });
  const shoulderAngle = frames.map((f) => {
    const l = jointAt(f, "left_shoulder");
    const r = jointAt(f, "right_shoulder");
    if (!l || !r) return null;
    return headingDeg(l, r);
  });
  const elbowAngle = frames.map((f) => {
    const s = jointAt(f, throwType.throwingArm === "right" ? "right_shoulder" : "left_shoulder");
    const e = jointAt(f, throwType.throwingArm === "right" ? "right_elbow" : "left_elbow");
    const w = jointAt(f, wristJ);
    if (!s || !e || !w) return null;
    return angleDeg(s, e, w);
  });

  const wristSpeed = movingAverage(
    frames.map((f, i) => {
      const a = i > 0 ? jointAt(frames[i - 1]!, wristJ) : null;
      const b = jointAt(f, wristJ);
      if (!a || !b) return null;
      return dist2(a, b) / dt;
    }),
    5,
  );
  const plantAnkleSpeed = movingAverage(
    frames.map((f, i) => {
      const a = i > 0 ? jointAt(frames[i - 1]!, plantJ) : null;
      const b = jointAt(f, plantJ);
      if (!a || !b) return null;
      return dist2(a, b) / dt;
    }),
    5,
  );
  const hipSpeed = movingAverage(
    angularFiniteDiff(hipAngle, dt * 1000).map((v) => (v == null ? null : Math.abs(v))),
    5,
  );
  const shoulderSpeed = movingAverage(
    angularFiniteDiff(shoulderAngle, dt * 1000).map((v) => (v == null ? null : Math.abs(v))),
    5,
  );

  const releaseIndex = findReleaseIndex(wristX, wristSpeed, dir);

  let plantIndex: number | null = null;
  if (releaseIndex != null) {
    let best = Infinity;
    for (let i = Math.max(0, releaseIndex - Math.round(0.8 / dt)); i < releaseIndex; i++) {
      const spd = plantAnkleSpeed[i];
      if (spd != null && spd < best) {
        best = spd;
        plantIndex = i;
      }
    }
  }

  let reachBackIndex: number | null = null;
  if (releaseIndex != null) {
    let best = dir > 0 ? Infinity : -Infinity;
    const start = Math.max(0, (plantIndex ?? 0) - 2);
    for (let i = start; i <= releaseIndex; i++) {
      const x = wristX[i];
      if (x == null) continue;
      if (dir > 0 && x < best) {
        best = x;
        reachBackIndex = i;
      }
      if (dir < 0 && x > best) {
        best = x;
        reachBackIndex = i;
      }
    }
  }

  return {
    times,
    dt,
    wristX,
    wristY,
    wristSpeed,
    plantAnkleX,
    plantAnkleSpeed,
    rearAnkleX,
    hipAngle,
    shoulderAngle,
    hipSpeed,
    shoulderSpeed,
    elbowAngle,
    comX,
    throwDirection: dir,
    releaseIndex,
    plantIndex,
    reachBackIndex,
  };
}

function phase(
  id: ThrowPhase["id"],
  frames: PoseFrame[],
  start: number,
  end: number,
  peak: number,
  c: { confidence: ConfidenceLevel; confidenceReason: string },
): ThrowPhase {
  const s = Math.max(0, Math.min(frames.length - 1, start));
  const e = Math.max(s, Math.min(frames.length - 1, end));
  const p = Math.max(s, Math.min(e, peak));
  return {
    id,
    label: PHASE_LABELS[id],
    startFrame: frames[s]!.frame,
    endFrame: frames[e]!.frame,
    peakFrame: frames[p]!.frame,
    startMs: frames[s]!.timestampMs,
    endMs: frames[e]!.timestampMs,
    peakMs: frames[p]!.timestampMs,
    confidence: c.confidence,
    confidenceReason: c.confidenceReason,
  };
}

export function detectPhases(
  frames: PoseFrame[],
  throwType: ThrowTypeSpec,
  kin: KinematicSeries,
): ThrowPhase[] {
  if (frames.length < 6) return [];
  const n = frames.length - 1;
  const rel = kin.releaseIndex ?? Math.round(n * 0.75);
  const plant = kin.plantIndex ?? Math.round(rel * 0.7);
  const rb = kin.reachBackIndex ?? Math.round((plant + rel) / 2);
  const hipPeak = argMax(kin.hipSpeed) ?? Math.round((plant + rel) / 2);
  const shPeak = argMax(kin.shoulderSpeed) ?? Math.min(n, hipPeak + 2);
  const setupEnd = Math.max(1, Math.round(plant * 0.25));
  const vis = (seriesOk(kin.wristSpeed) + seriesOk(kin.hipAngle) + seriesOk(kin.plantAnkleX)) / 3;

  const out: ThrowPhase[] = [];
  const add = (
    id: ThrowPhase["id"],
    a: number,
    b: number,
    pk: number,
    extra = "",
  ) => {
    if (!throwType.phases.includes(id) && id !== "release") return;
    out.push(phase(id, frames, a, b, pk, conf(vis, extra || "Derived from landmark kinematics.")));
  };

  add("setup", 0, setupEnd, Math.round(setupEnd / 2), "Low wrist speed at start of clip.");
  if (throwType.footwork === "x-step") {
    add("initial_movement", setupEnd, Math.round(plant * 0.55), Math.round(plant * 0.4));
    add("x_step", Math.round(plant * 0.4), plant, Math.round((plant * 0.4 + plant) / 2));
  } else if (throwType.footwork === "one-step") {
    add("plant_preparation", setupEnd, plant, Math.round((setupEnd + plant) / 2));
  }
  add("plant", Math.max(0, plant - 2), Math.min(rel, plant + 3), plant, "Front ankle speed minimum before release.");
  add("brace", plant, Math.min(rel, plant + Math.round(0.15 / kin.dt)), plant);
  add("reach_back", Math.max(setupEnd, rb - 4), Math.min(rel, rb + 2), rb, "Throwing wrist at maximum behind the torso.");
  add("transition", rb, Math.max(rb + 1, hipPeak), rb + 1);
  add("hip_rotation", Math.max(plant, hipPeak - 3), Math.min(rel, hipPeak + 3), hipPeak, "Peak hip-line angular speed.");
  add("shoulder_rotation", Math.max(plant, shPeak - 3), Math.min(rel, shPeak + 3), shPeak, "Peak shoulder-line angular speed.");
  add("arm_acceleration", Math.max(rb, rel - 8), rel, rel);
  add("elbow_extension", Math.max(rb, rel - 6), rel, rel);
  add("release", rel, Math.min(n, rel + 1), rel, "Peak throwing-wrist speed.");
  add("follow_through", rel, Math.min(n, rel + Math.round(0.35 / kin.dt)), Math.min(n, rel + 4));
  add("recovery", Math.min(n, rel + Math.round(0.25 / kin.dt)), n, n);

  return out;
}

export function phaseAtTime(phases: ThrowPhase[], timestampMs: number): ThrowPhase | null {
  const hits = phases.filter((p) => timestampMs >= p.startMs && timestampMs <= p.endMs);
  if (!hits.length) return phases[0] ?? null;
  const preferred = ["release", "plant", "hip_rotation", "reach_back"];
  for (const id of preferred) {
    const hit = hits.find((p) => p.id === id);
    if (hit) return hit;
  }
  return hits[0] ?? null;
}
