import type { Landmark, NamedJoint, PoseFrame } from "./types";
import { midpoint } from "./geometry.ts";

/** BlazePose 33-landmark indices used by MediaPipe Pose Landmarker. */
export const MP = {
  nose: 0,
  leftShoulder: 11,
  rightShoulder: 12,
  leftElbow: 13,
  rightElbow: 14,
  leftWrist: 15,
  rightWrist: 16,
  leftHip: 23,
  rightHip: 24,
  leftKnee: 25,
  rightKnee: 26,
  leftAnkle: 27,
  rightAnkle: 28,
  leftFoot: 31,
  rightFoot: 32,
} as const;

export const NAMED_FROM_MP: Partial<Record<NamedJoint, number>> = {
  head: MP.nose,
  left_shoulder: MP.leftShoulder,
  right_shoulder: MP.rightShoulder,
  left_elbow: MP.leftElbow,
  right_elbow: MP.rightElbow,
  left_wrist: MP.leftWrist,
  right_wrist: MP.rightWrist,
  left_hip: MP.leftHip,
  right_hip: MP.rightHip,
  left_knee: MP.leftKnee,
  right_knee: MP.rightKnee,
  left_ankle: MP.leftAnkle,
  right_ankle: MP.rightAnkle,
  left_foot: MP.leftFoot,
  right_foot: MP.rightFoot,
};

export const SKELETON_EDGES: Array<[NamedJoint, NamedJoint]> = [
  ["head", "neck"],
  ["neck", "left_shoulder"],
  ["neck", "right_shoulder"],
  ["left_shoulder", "right_shoulder"],
  ["left_shoulder", "left_elbow"],
  ["left_elbow", "left_wrist"],
  ["right_shoulder", "right_elbow"],
  ["right_elbow", "right_wrist"],
  ["left_shoulder", "left_hip"],
  ["right_shoulder", "right_hip"],
  ["left_hip", "right_hip"],
  ["left_hip", "left_knee"],
  ["left_knee", "left_ankle"],
  ["left_ankle", "left_foot"],
  ["right_hip", "right_knee"],
  ["right_knee", "right_ankle"],
  ["right_ankle", "right_foot"],
];

export function landmarkFromMp(lm: {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}): Landmark {
  return {
    x: lm.x,
    y: lm.y,
    z: typeof lm.z === "number" ? lm.z : null,
    visibility: typeof lm.visibility === "number" ? lm.visibility : 1,
  };
}

export function namedFromRaw(raw: Landmark[]): Partial<Record<NamedJoint, Landmark>> {
  const named: Partial<Record<NamedJoint, Landmark>> = {};
  for (const [joint, idx] of Object.entries(NAMED_FROM_MP) as Array<[NamedJoint, number]>) {
    const lm = raw[idx];
    if (lm) named[joint] = lm;
  }
  const ls = named.left_shoulder;
  const rs = named.right_shoulder;
  if (ls && rs) named.neck = midpoint(ls, rs);
  return named;
}

export function buildPoseFrame(
  frame: number,
  timestampMs: number,
  raw: Landmark[],
  personCount: number,
  selectedPersonIndex = 0,
): PoseFrame {
  return {
    frame,
    timestampMs,
    landmarks: namedFromRaw(raw),
    raw,
    personCount,
    selectedPersonIndex,
  };
}

export const KEY_JOINTS: NamedJoint[] = [
  "head",
  "left_shoulder",
  "right_shoulder",
  "left_hip",
  "right_hip",
  "left_knee",
  "right_knee",
  "left_ankle",
  "right_ankle",
  "left_wrist",
  "right_wrist",
];
