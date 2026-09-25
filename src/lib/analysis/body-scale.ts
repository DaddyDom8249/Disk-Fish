import type { BodyScale, PoseFrame, ThrowTypeSpec } from "./types";
import { dist2, isVisible, mean, midpoint } from "./geometry.ts";
import { jointAt } from "./smoothing.ts";

export function computeBodyScale(frames: PoseFrame[], throwType: ThrowTypeSpec): BodyScale {
  const shoulders: number[] = [];
  const hips: number[] = [];
  const heights: number[] = [];
  const arms: number[] = [];
  const legs: number[] = [];
  const arm: "left" | "right" = throwType.throwingArm === "left" ? "left" : "right";
  const plant: "left" | "right" = throwType.plantFoot;

  for (const f of frames) {
    const ls = jointAt(f, "left_shoulder");
    const rs = jointAt(f, "right_shoulder");
    const lh = jointAt(f, "left_hip");
    const rh = jointAt(f, "right_hip");
    const head = jointAt(f, "head");
    const la = jointAt(f, "left_ankle");
    const ra = jointAt(f, "right_ankle");
    if (ls && rs) shoulders.push(dist2(ls, rs));
    if (lh && rh) hips.push(dist2(lh, rh));
    if (head && la && ra) {
      const midFoot = midpoint(la, ra);
      heights.push(dist2(head, midFoot));
    }
    const sh = jointAt(f, arm === "right" ? "right_shoulder" : "left_shoulder");
    const el = jointAt(f, arm === "right" ? "right_elbow" : "left_elbow");
    const wr = jointAt(f, arm === "right" ? "right_wrist" : "left_wrist");
    if (sh && el && wr) arms.push(dist2(sh, el) + dist2(el, wr));
    const hip = jointAt(f, plant === "left" ? "left_hip" : "right_hip");
    const kn = jointAt(f, plant === "left" ? "left_knee" : "right_knee");
    const an = jointAt(f, plant === "left" ? "left_ankle" : "right_ankle");
    if (hip && kn && an) legs.push(dist2(hip, kn) + dist2(kn, an));
  }

  return {
    shoulderWidth: mean(shoulders),
    hipWidth: mean(hips),
    height: mean(heights),
    throwingArmLength: mean(arms),
    plantLegLength: mean(legs),
    method:
      "Median-like mean of 2D pixel distances on visible frames. Values are image-normalized (0–1), not metres.",
  };
}

export function denom(scale: BodyScale, prefer: "shoulder" | "height" | "arm" = "shoulder"): number | null {
  if (prefer === "height" && scale.height && scale.height > 0.05) return scale.height;
  if (prefer === "arm" && scale.throwingArmLength && scale.throwingArmLength > 0.02) {
    return scale.throwingArmLength;
  }
  if (scale.shoulderWidth && scale.shoulderWidth > 0.02) return scale.shoulderWidth;
  if (scale.height && scale.height > 0.05) return scale.height;
  return null;
}

export function allKeyVisible(frame: PoseFrame, joints: import("./types").NamedJoint[]): boolean {
  return joints.every((j) => isVisible(frame.landmarks[j]));
}
