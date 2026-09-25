import type { Landmark, PoseFrame } from "./types";
import { buildPoseFrame } from "./pose-map.ts";
import { lerp, smoothstep } from "./geometry.ts";

export type DemoVariant = "early-shoulder" | "reference-like" | "collapsed-brace";

interface DemoOpts {
  variant?: DemoVariant;
  fps?: number;
  durationSec?: number;
}

function lm(x: number, y: number, vis = 0.95, z = 0): Landmark {
  return { x, y, z, visibility: vis };
}

function emptyRaw(): Landmark[] {
  return Array.from({ length: 33 }, () => lm(0, 0, 0));
}

/**
 * Synthetic RHBH x-step, 3/4 off-arm-side camera, thrower moving to +x.
 * DEMO DATA — not captured from a person.
 */
export function generateDemoFrames(opts: DemoOpts = {}): PoseFrame[] {
  const fps = opts.fps ?? 30;
  const durationSec = opts.durationSec ?? 2.8;
  const n = Math.round(durationSec * fps);
  const variant = opts.variant ?? "early-shoulder";
  const frames: PoseFrame[] = [];

  const shoulderLead =
    variant === "early-shoulder" ? -0.045 : variant === "reference-like" ? 0.02 : 0;
  const kneeExtraFlex = variant === "collapsed-brace" ? 0.16 : 0;
  const reachScale = variant === "collapsed-brace" ? 0.86 : 1;

  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const time = (i / fps) * 1000;
    const approach = smoothstep(Math.min(1, t / 0.5));
    const plantT = 0.52;
    const releaseT = 0.78;
    const rbT = 0.6;

    const comX = lerp(0.34, 0.58, approach);
    const comY = 0.52 + Math.sin(t * Math.PI) * 0.01;
    const height = 0.42;

    const plant = smoothstep((t - 0.42) / 0.12);
    const hipRot = smoothstep((t - (plantT + 0.02)) / 0.12);
    const shRot = smoothstep((t - (plantT + 0.02 + shoulderLead)) / 0.12);
    const rb = Math.sin(smoothstep((t - 0.35) / (rbT - 0.35 + 1e-6)) * Math.PI);
    const releaseBlend = smoothstep((t - rbT) / (releaseT - rbT));

    const hipYaw = lerp(8, 48, hipRot);
    const shYaw = lerp(-6, 52, shRot);
    const hipW = 0.055;
    const shW = 0.08;

    const hx = (deg: number) => Math.sin((deg * Math.PI) / 180);
    const leftHip = lm(comX - hipW + hx(hipYaw) * 0.02, comY + 0.02, 0.93);
    const rightHip = lm(comX + hipW - hx(hipYaw) * 0.01, comY + 0.018, 0.9);
    const leftSh = lm(comX - shW + hx(shYaw) * 0.03, comY - 0.16, 0.94);
    const rightSh = lm(comX + shW - hx(shYaw) * 0.015, comY - 0.165, 0.92);

    const plantKneeFlex = lerp(0.02, 0.07 + kneeExtraFlex, plant);
    const leftKnee = lm(comX - 0.02 + plant * 0.09, comY + 0.14 + plantKneeFlex, 0.92);
    const rightKnee = lm(comX + 0.04 - plant * 0.02, comY + 0.145, 0.9);
    const leftAnkle = lm(comX - 0.03 + plant * 0.11, comY + 0.26, 0.9);
    const rightAnkle = lm(comX + 0.05 - approach * 0.02, comY + 0.26, 0.88);
    const leftFoot = lm(leftAnkle.x + 0.03, leftAnkle.y + 0.015, 0.86);
    const rightFoot = lm(rightAnkle.x + 0.025, rightAnkle.y + 0.015, 0.84);

    const reach = rb * 0.16 * reachScale;
    const forward = releaseBlend * 0.2;
    const rightElbow = lm(
      rightSh.x - reach * 0.7 + forward * 0.55,
      rightSh.y + 0.04 + rb * 0.02 - releaseBlend * 0.02,
      0.9,
    );
    const rightWrist = lm(
      rightSh.x - reach * 1.15 + forward * 1.15,
      rightSh.y + 0.02 + rb * 0.05 - releaseBlend * 0.06,
      0.91,
    );
    const leftElbow = lm(leftSh.x + 0.03, leftSh.y + 0.08, 0.88);
    const leftWrist = lm(leftSh.x + 0.05, leftSh.y + 0.14, 0.85);

    const head = lm(comX + hx(shYaw) * 0.02, comY - 0.24, 0.95);
    const neck = lm((leftSh.x + rightSh.x) / 2, (leftSh.y + rightSh.y) / 2 + 0.02, 0.94);

    const raw = emptyRaw();
    raw[0] = head;
    raw[11] = leftSh;
    raw[12] = rightSh;
    raw[13] = leftElbow;
    raw[14] = rightElbow;
    raw[15] = leftWrist;
    raw[16] = rightWrist;
    raw[23] = leftHip;
    raw[24] = rightHip;
    raw[25] = leftKnee;
    raw[26] = rightKnee;
    raw[27] = leftAnkle;
    raw[28] = rightAnkle;
    raw[29] = lm(leftAnkle.x - 0.01, leftAnkle.y + 0.005, 0.8);
    raw[30] = lm(rightAnkle.x - 0.01, rightAnkle.y + 0.005, 0.78);
    raw[31] = leftFoot;
    raw[32] = rightFoot;
    raw[7] = lm(head.x - 0.015, head.y, 0.7);
    raw[8] = lm(head.x + 0.015, head.y, 0.7);

    void height;
    void neck;
    frames.push(buildPoseFrame(i, time, raw, 1, 0));
  }
  return frames;
}

export const DEMO_VIDEO_META = {
  durationSec: 2.8,
  width: 1280,
  height: 720,
  fps: 30,
  sizeBytes: 0,
  mimeType: "demo/synthetic",
  name: "DEMO DATA — synthetic throw",
};
