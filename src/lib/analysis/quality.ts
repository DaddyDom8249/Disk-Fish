import { LIMITS } from "@/lib/product";
import type {
  PoseFrame,
  QualityGrade,
  QualityIssue,
  VideoMeta,
  VideoQuality,
} from "./types";
import { KEY_JOINTS } from "./pose-map";
import { mean, stddev } from "./geometry";

function gradeFromScore(score: number, blocking: boolean): QualityGrade {
  if (blocking || score < 28) return "unusable";
  if (score < 48) return "poor";
  if (score < 72) return "acceptable";
  return "good";
}

function visibilityFactor(frames: PoseFrame[]): { value: number; missing: string[] } {
  if (!frames.length) return { value: 0, missing: ["entire body"] };
  const missingCount: Record<string, number> = {};
  for (const j of KEY_JOINTS) missingCount[j] = 0;
  for (const f of frames) {
    for (const j of KEY_JOINTS) {
      const lm = f.landmarks[j];
      if (!lm || lm.visibility < 0.4) missingCount[j]! += 1;
    }
  }
  const rates = KEY_JOINTS.map((j) => 1 - missingCount[j]! / frames.length);
  const value = (mean(rates) ?? 0) * 100;
  const missing = KEY_JOINTS.filter((j) => missingCount[j]! / frames.length > 0.35).map((j) =>
    j.replaceAll("_", " "),
  );
  return { value, missing };
}

function lightingFromCanvas(samples: Array<{ mean: number; std: number }>): number {
  if (!samples.length) return 50;
  const m = mean(samples.map((s) => s.mean)) ?? 128;
  const c = mean(samples.map((s) => s.std)) ?? 40;
  let score = 80;
  if (m < 35) score -= 40;
  else if (m < 55) score -= 20;
  if (m > 230) score -= 25;
  if (c < 18) score -= 20;
  return Math.max(0, Math.min(100, score));
}

export function sampleLuma(canvas: HTMLCanvasElement): { mean: number; std: number } {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return { mean: 128, std: 40 };
  const w = Math.min(64, canvas.width);
  const h = Math.min(64, canvas.height);
  const img = ctx.getImageData(0, 0, w, h).data;
  const lumas: number[] = [];
  for (let i = 0; i < img.length; i += 16) {
    const r = img[i] ?? 0;
    const g = img[i + 1] ?? 0;
    const b = img[i + 2] ?? 0;
    lumas.push(0.2126 * r + 0.7152 * g + 0.0722 * b);
  }
  return { mean: mean(lumas) ?? 128, std: stddev(lumas) ?? 0 };
}

export function scoreVideoQuality(opts: {
  meta: VideoMeta;
  frames: PoseFrame[];
  lumaSamples?: Array<{ mean: number; std: number }>;
  hipJitter?: number;
  throwDetected: boolean;
  multiplePeople: boolean;
  plantFootVisible: boolean;
  throwingArmVisible: boolean;
}): VideoQuality {
  const issues: QualityIssue[] = [];
  const vis = visibilityFactor(opts.frames);
  const fps = opts.meta.fps ?? 30;
  const fpsScore = fps >= 50 ? 100 : fps >= 30 ? 80 : fps >= 24 ? 60 : 35;
  const minSide = Math.min(opts.meta.width, opts.meta.height);
  const resScore = minSide >= 720 ? 100 : minSide >= 540 ? 70 : minSide >= 360 ? 45 : 20;
  const lighting = lightingFromCanvas(opts.lumaSamples ?? []);
  const stability = Math.max(0, 100 - (opts.hipJitter ?? 0) * 400);
  const occlusion = vis.value;
  const contrast = lighting;
  const completeness = opts.throwDetected ? 90 : 15;

  if (opts.meta.fps != null && opts.meta.fps < 24) {
    issues.push({
      code: "low_fps",
      severity: "warning",
      message: `Frame rate is about ${opts.meta.fps.toFixed(0)} fps. Timing metrics will be coarser.`,
    });
  }
  if (minSide < 480) {
    issues.push({
      code: "low_res",
      severity: "warning",
      message: "Resolution is low. Joint locations are less precise.",
    });
  }
  if (vis.missing.includes("left ankle") || vis.missing.includes("right ankle") || vis.missing.includes("left foot") || vis.missing.includes("right foot")) {
    issues.push({
      code: "cropped_feet",
      severity: opts.plantFootVisible ? "warning" : "blocking",
      message: opts.plantFootVisible
        ? "Feet are intermittently out of frame."
        : "Your plant foot leaves the frame during the brace phase. Record from farther away so your complete body remains visible.",
    });
  }
  if (!opts.throwingArmVisible) {
    issues.push({
      code: "missing_arm",
      severity: "blocking",
      message: "The throwing arm is not visible enough to measure reach-back or release.",
    });
  }
  if (opts.multiplePeople) {
    issues.push({
      code: "multiple_people",
      severity: "warning",
      message: "More than one person was detected. We tracked the largest figure; results may mix bodies if they overlap.",
    });
  }
  if (!opts.throwDetected) {
    issues.push({
      code: "incomplete_throw",
      severity: "blocking",
      message: "No clear release (peak throwing-hand speed) was found. The clip may not contain a complete throw.",
    });
  }
  if (lighting < 40) {
    issues.push({
      code: "lighting",
      severity: "warning",
      message: "Lighting is dark or flat. Pose tracking confidence will drop.",
    });
  }
  if ((opts.hipJitter ?? 0) > 0.12) {
    issues.push({
      code: "camera_move",
      severity: "warning",
      message: "The camera appears to move during the throw. Keep it still.",
    });
  }
  if (opts.frames.length < 12) {
    issues.push({
      code: "few_frames",
      severity: "blocking",
      message: "Not enough frames were extracted to analyze a throw.",
    });
  }

  const blocking = issues.some((i) => i.severity === "blocking");
  const score =
    vis.value * 0.28 +
    fpsScore * 0.1 +
    resScore * 0.08 +
    stability * 0.12 +
    lighting * 0.1 +
    occlusion * 0.12 +
    contrast * 0.05 +
    completeness * 0.15;

  const grade = gradeFromScore(score, blocking);
  const summary =
    grade === "unusable"
      ? issues.find((i) => i.severity === "blocking")?.message ??
        "This video cannot be analyzed reliably."
      : grade === "good"
        ? "Video quality is good enough for high-confidence body tracking."
        : grade === "acceptable"
          ? "Video is usable. Some metrics will be marked estimated or low-confidence."
          : "Video quality is poor. Treat measurements as low-confidence.";

  return {
    grade,
    score: Math.round(score),
    factors: {
      bodyVisibility: vis.value,
      frameRate: fpsScore,
      resolution: resScore,
      cameraStability: stability,
      lighting,
      occlusion,
      backgroundContrast: contrast,
      throwCompleteness: completeness,
    },
    issues,
    summary,
  };
}

export function sampleTimes(durationSec: number, fpsHint: number | null): number[] {
  const fps = Math.min(LIMITS.targetSampleFps, Math.max(12, fpsHint ?? LIMITS.targetSampleFps));
  const window = Math.min(durationSec, LIMITS.analyzeWindowSec);
  const n = Math.min(LIMITS.maxSampleFrames, Math.max(8, Math.round(window * fps)));
  const dt = window / n;
  const start = Math.max(0, (durationSec - window) / 2);
  const times: number[] = [];
  for (let i = 0; i < n; i++) times.push(start + i * dt);
  return times;
}
