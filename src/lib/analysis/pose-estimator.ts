import { ANALYSIS_VERSIONS } from "@/lib/product";
import type { Landmark, PoseFrame } from "./types";
import { buildPoseFrame, landmarkFromMp } from "./pose-map";

export interface PoseEstimator {
  readonly id: string;
  readonly version: string;
  initialize(): Promise<void>;
  detectImage(image: HTMLCanvasElement | HTMLVideoElement | ImageBitmap, timestampMs: number, frame: number): Promise<PoseFrame>;
  dispose(): void;
}

type PoseLandmarkerT = import("@mediapipe/tasks-vision").PoseLandmarker;

let singleton: MediaPipePoseEstimator | null = null;

export class MediaPipePoseEstimator implements PoseEstimator {
  readonly id = "mediapipe-pose-landmarker";
  readonly version = ANALYSIS_VERSIONS.visionModel;
  private landmarker: PoseLandmarkerT | null = null;
  private ready = false;

  static async get(): Promise<MediaPipePoseEstimator> {
    if (singleton?.ready) return singleton;
    const est = singleton ?? new MediaPipePoseEstimator();
    singleton = est;
    await est.initialize();
    return est;
  }

  async initialize(): Promise<void> {
    if (this.ready && this.landmarker) return;
    const { FilesetResolver, PoseLandmarker } = await import("@mediapipe/tasks-vision");
    const wasmBases = [
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm",
    ];
    let lastErr: unknown;
    for (const base of wasmBases) {
      try {
        const fileset = await FilesetResolver.forVisionTasks(base);
        this.landmarker = await PoseLandmarker.createFromOptions(fileset, {
          baseOptions: {
            modelAssetPath: "/mediapipe/models/pose_landmarker_lite.task",
            delegate: "CPU",
          },
          runningMode: "IMAGE",
          numPoses: 2,
          minPoseDetectionConfidence: 0.4,
          minPosePresenceConfidence: 0.4,
          minTrackingConfidence: 0.4,
        });
        this.ready = true;
        return;
      } catch (err) {
        lastErr = err;
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error("Pose engine failed to start.");
  }

  async detectImage(
    image: HTMLCanvasElement | HTMLVideoElement | ImageBitmap,
    timestampMs: number,
    frame: number,
  ): Promise<PoseFrame> {
    if (!this.landmarker) throw new Error("Pose estimator is not initialized.");
    const result = this.landmarker.detect(image as HTMLCanvasElement);
    const poses = result.landmarks ?? [];
    const personCount = poses.length;
    if (!personCount) {
      return buildPoseFrame(frame, timestampMs, [], 0, 0);
    }
    let best = 0;
    let bestScore = -1;
    poses.forEach((pose, idx) => {
      const vis = pose.reduce((s, p) => s + (p.visibility ?? 0), 0);
      if (vis > bestScore) {
        bestScore = vis;
        best = idx;
      }
    });
    const raw: Landmark[] = (poses[best] ?? []).map(landmarkFromMp);
    result.close?.();
    return buildPoseFrame(frame, timestampMs, raw, personCount, best);
  }

  dispose(): void {
    try {
      this.landmarker?.close();
    } catch {
      /* ignore */
    }
    this.landmarker = null;
    this.ready = false;
    if (singleton === this) singleton = null;
  }
}

export function pickLargestPersonNote(frame: PoseFrame): string | null {
  if (frame.personCount > 1) {
    return "Multiple people detected; tracked the highest-visibility pose.";
  }
  return null;
}
