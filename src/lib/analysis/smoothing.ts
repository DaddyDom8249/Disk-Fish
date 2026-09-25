import type { Landmark, NamedJoint, PoseFrame } from "./types";
import { movingAverage } from "./geometry.ts";

const JOINTS: NamedJoint[] = [
  "head",
  "neck",
  "left_shoulder",
  "right_shoulder",
  "left_elbow",
  "right_elbow",
  "left_wrist",
  "right_wrist",
  "left_hip",
  "right_hip",
  "left_knee",
  "right_knee",
  "left_ankle",
  "right_ankle",
  "left_foot",
  "right_foot",
];

function smoothSeries(values: Array<number | null>, window: number): Array<number | null> {
  return movingAverage(values, window);
}

/** Temporal smoothing of named landmarks. Raw arrays are left intact. */
export function smoothPoseFrames(frames: PoseFrame[], window = 5): PoseFrame[] {
  if (frames.length < 3) return frames;
  const w = Math.min(window, frames.length | 1);

  const xs: Record<string, Array<number | null>> = {};
  const ys: Record<string, Array<number | null>> = {};
  const vis: Record<string, Array<number | null>> = {};
  for (const j of JOINTS) {
    xs[j] = frames.map((f) => f.landmarks[j]?.x ?? null);
    ys[j] = frames.map((f) => f.landmarks[j]?.y ?? null);
    vis[j] = frames.map((f) => f.landmarks[j]?.visibility ?? null);
  }

  const sxs: Record<string, Array<number | null>> = {};
  const sys: Record<string, Array<number | null>> = {};
  for (const j of JOINTS) {
    sxs[j] = smoothSeries(xs[j]!, w);
    sys[j] = smoothSeries(ys[j]!, w);
  }

  return frames.map((f, i) => {
    const landmarks: PoseFrame["landmarks"] = { ...f.landmarks };
    for (const j of JOINTS) {
      const orig = f.landmarks[j];
      const x = sxs[j]![i];
      const y = sys[j]![i];
      if (orig && x != null && y != null) {
        landmarks[j] = { ...orig, x, y };
      }
    }
    return { ...f, landmarks };
  });
}

export function series(
  frames: PoseFrame[],
  joint: NamedJoint,
  axis: "x" | "y",
): Array<number | null> {
  return frames.map((f) => {
    const lm = f.landmarks[joint];
    if (!lm || lm.visibility < 0.35) return null;
    return lm[axis];
  });
}

export function jointAt(frame: PoseFrame, joint: NamedJoint): Landmark | null {
  const lm = frame.landmarks[joint];
  if (!lm || lm.visibility < 0.35) return null;
  return lm;
}
