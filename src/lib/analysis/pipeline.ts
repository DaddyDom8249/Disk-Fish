import { ANALYSIS_VERSIONS, LIMITS } from "@/lib/product";
import { uid } from "@/lib/utils";
import type {
  AnalysisRecord,
  AnalysisState,
  AnalyzeInput,
  InvalidCondition,
  PoseFrame,
  ProgressFn,
  VideoMeta,
} from "./types";
import { validateFileBasics, validateMeta, loadVideoElement, readVideoMeta } from "./video-validate";
import { sampleLuma, sampleTimes, scoreVideoQuality } from "./quality";
import { MediaPipePoseEstimator } from "./pose-estimator";
import { smoothPoseFrames } from "./smoothing";
import { computeBodyScale } from "./body-scale";
import { buildKinematics, detectPhases } from "./phase-detector";
import { computeMetrics, computeTimings, overallConfidence } from "./metrics";
import { analyzeSequencing } from "./sequencing";
import { compareToReference } from "./comparison";
import { buildCoaching } from "./coaching";
import { generateDemoFrames, DEMO_VIDEO_META } from "./demo-throw";
import { jointAt } from "./smoothing";
import { stddev } from "./geometry";

function err(userMessage: string, errorId: string): Error & { errorId: string; userMessage: string } {
  const e = new Error(userMessage) as Error & { errorId: string; userMessage: string };
  e.errorId = errorId;
  e.userMessage = userMessage;
  return e;
}

function waitSeeked(video: HTMLVideoElement, t: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const onSeeked = () => {
      cleanup();
      resolve();
    };
    const onErr = () => {
      cleanup();
      reject(new Error("Video seek failed"));
    };
    const cleanup = () => {
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onErr);
    };
    video.addEventListener("seeked", onSeeked);
    video.addEventListener("error", onErr);
    try {
      video.currentTime = Math.min(Math.max(0, t), Math.max(0, video.duration - 0.001));
    } catch {
      cleanup();
      reject(new Error("Video seek failed"));
    }
  });
}

function hipJitter(frames: PoseFrame[]): number {
  const ys = frames.map((f) => {
    const l = jointAt(f, "left_hip");
    const r = jointAt(f, "right_hip");
    if (!l || !r) return null;
    return (l.y + r.y) / 2;
  });
  return stddev(ys.filter((v): v is number => v != null) as number[]) ?? 0;
}

function plantVisible(frames: PoseFrame[], plant: "left" | "right"): boolean {
  const j = plant === "left" ? "left_ankle" : "right_ankle";
  const mid = frames.slice(Math.floor(frames.length * 0.4), Math.floor(frames.length * 0.75));
  if (!mid.length) return false;
  const ok = mid.filter((f) => (f.landmarks[j]?.visibility ?? 0) >= 0.4).length;
  return ok / mid.length >= 0.5;
}

function armVisible(frames: PoseFrame[], arm: "left" | "right"): boolean {
  const w = arm === "left" ? "left_wrist" : "right_wrist";
  const ok = frames.filter((f) => (f.landmarks[w]?.visibility ?? 0) >= 0.4).length;
  return frames.length ? ok / frames.length >= 0.45 : false;
}

async function extractPoseFromVideo(
  video: HTMLVideoElement,
  meta: VideoMeta,
  onProgress: ProgressFn,
): Promise<{ frames: PoseFrame[]; luma: Array<{ mean: number; std: number }> }> {
  const estimator = await MediaPipePoseEstimator.get();
  const times = sampleTimes(meta.durationSec, meta.fps);
  const canvas = document.createElement("canvas");
  const maxW = 640;
  const scale = Math.min(1, maxW / Math.max(1, video.videoWidth));
  canvas.width = Math.max(16, Math.round(video.videoWidth * scale));
  canvas.height = Math.max(16, Math.round(video.videoHeight * scale));
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw err("Could not read video frames.", "ERR-VID-002");

  const frames: PoseFrame[] = [];
  const luma: Array<{ mean: number; std: number }> = [];
  for (let i = 0; i < times.length; i++) {
    const t = times[i]!;
    await waitSeeked(video, t);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    if (i % 8 === 0) luma.push(sampleLuma(canvas));
    const pose = await estimator.detectImage(canvas, t * 1000, i);
    frames.push(pose);
    if (i % 2 === 0) {
      onProgress("pose_detection", 15 + (70 * (i + 1)) / times.length, `Tracking body · frame ${i + 1}/${times.length}`);
      await new Promise((r) => setTimeout(r, 0));
    }
  }
  return { frames, luma };
}

function finalize(
  input: AnalyzeInput,
  framesIn: PoseFrame[],
  meta: VideoMeta,
  luma: Array<{ mean: number; std: number }>,
  isDemo: boolean,
): AnalysisRecord {
  const frames = smoothPoseFrames(framesIn, 5);
  const scale = computeBodyScale(frames, input.throwType);
  const kin = buildKinematics(frames, input.throwType, scale, input.cameraAngle);
  const phases = detectPhases(frames, input.throwType, kin);
  const throwDetected = kin.releaseIndex != null && (kin.wristSpeed[kin.releaseIndex] ?? 0) > 0.15;
  const multiplePeople = frames.some((f) => f.personCount > 1);
  const quality = scoreVideoQuality({
    meta,
    frames,
    lumaSamples: luma,
    hipJitter: hipJitter(frames),
    throwDetected,
    multiplePeople,
    plantFootVisible: plantVisible(frames, input.throwType.plantFoot),
    throwingArmVisible: armVisible(frames, input.throwType.throwingArm),
  });

  const invalid: InvalidCondition[] = quality.issues
    .filter((i) => i.severity === "blocking")
    .map((i) => ({ code: i.code, message: i.message, blocking: true }));

  if (quality.grade === "unusable") {
    throw err(quality.summary, "ERR-QUAL-UNUSABLE");
  }

  const metrics = computeMetrics(frames, input.throwType, phases, kin, scale);
  const span = Math.max(1, (frames.at(-1)?.timestampMs ?? 1) - (frames[0]?.timestampMs ?? 0));
  const timings = computeTimings(phases, span);
  const sequencing = analyzeSequencing(phases);
  const comparisons = compareToReference(metrics, input.throwType);
  const coaching = buildCoaching(input.throwType, comparisons, sequencing);
  const overall = overallConfidence(metrics);

  return {
    id: uid("throw"),
    createdAt: new Date().toISOString(),
    isDemo,
    throwType: input.throwType,
    cameraAngle: input.cameraAngle,
    disc: input.disc,
    distanceMeters: input.distanceMeters ?? null,
    notes: input.notes,
    videoMeta: meta,
    quality,
    versions: ANALYSIS_VERSIONS,
    poseModel: {
      id: isDemo ? "synthetic-demo" : "mediapipe-pose-landmarker",
      version: isDemo ? "demo-1.0" : ANALYSIS_VERSIONS.visionModel,
    },
    bodyScale: scale,
    frames,
    phases,
    metrics,
    timings,
    sequencing,
    comparisons,
    coaching,
    invalid,
    referenceGroupId: "demo-all-bh",
    primaryFocusId: coaching.primaryFocus?.id ?? null,
    overallConfidence: overall.level,
    overallConfidenceReason: overall.reason,
  };
}

export async function runAnalysis(input: AnalyzeInput, onProgress: ProgressFn): Promise<AnalysisRecord> {
  try {
    if (input.isDemo) {
      onProgress("validating", 8, "Loading demo throw");
      onProgress("pose_detection", 40, "Using labeled synthetic pose data");
      const frames = generateDemoFrames({ variant: input.demoVariant ?? "early-shoulder" });
      onProgress("phase_detection", 70, "Segmenting throw phases");
      onProgress("metric_analysis", 82, "Calculating mechanics");
      onProgress("reference_comparison", 90, "Comparing to demo reference sample");
      onProgress("coaching", 96, "Ranking the clearest difference");
      const record = finalize(input, frames, { ...DEMO_VIDEO_META }, [{ mean: 110, std: 38 }], true);
      onProgress("complete", 100, "Analysis complete");
      return record;
    }

    if (!input.file) throw err("Choose a video to analyze.", "ERR-VID-000");
    onProgress("uploading", 4, "Reading video");
    const basic = validateFileBasics(input.file);
    if (!basic.ok) throw err(basic.blocking[0] ?? "Invalid video.", "ERR-VID-001");

    onProgress("validating", 10, "Checking video");
    const video = await loadVideoElement(input.file);
    const meta = readVideoMeta(input.file, video);
    if (meta.durationSec > LIMITS.maxDurationSec * 3) {
      throw err(
        `Video is ${meta.durationSec.toFixed(0)}s. Use a clip under ${LIMITS.maxDurationSec}s centered on one throw.`,
        "ERR-VID-DUR",
      );
    }
    const metaCheck = validateMeta(meta);
    if (!metaCheck.ok) throw err(metaCheck.blocking[0] ?? "Video failed validation.", "ERR-VID-META");

    onProgress("processing", 14, "Preparing frames");
    onProgress("pose_detection", 18, "Starting body tracking");
    const { frames, luma } = await extractPoseFromVideo(video, meta, onProgress);
    URL.revokeObjectURL(video.src);

    onProgress("phase_detection", 86, "Finding plant, rotation, and release");
    onProgress("metric_analysis", 90, "Measuring body angles and timing");
    onProgress("reference_comparison", 94, "Comparing to demo reference sample");
    onProgress("coaching", 97, "Choosing a primary training focus");
    const record = finalize(input, frames, meta, luma, false);
    onProgress("complete", 100, "Analysis complete");
    return record;
  } catch (e) {
    onProgress("failed", 100, e instanceof Error ? e.message : "Analysis failed");
    throw e;
  }
}

export const PIPELINE_STEPS: Array<{ state: AnalysisState; label: string }> = [
  { state: "validating", label: "Video validation" },
  { state: "pose_detection", label: "Body tracking" },
  { state: "phase_detection", label: "Throw sequencing" },
  { state: "metric_analysis", label: "Biomechanics" },
  { state: "reference_comparison", label: "Reference comparison" },
  { state: "coaching", label: "Coaching" },
];
