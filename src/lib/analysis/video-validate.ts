import { LIMITS } from "@/lib/product";
import { formatBytes } from "@/lib/utils";
import type { VideoMeta } from "./types";

const ACCEPT = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/3gpp",
  "video/x-m4v",
  "video/mpeg",
];

const ACCEPT_EXT = [".mp4", ".mov", ".webm", ".m4v", ".3gp", ".mpeg", ".mpg"];

export interface VideoValidation {
  ok: boolean;
  blocking: string[];
  warnings: string[];
  meta: VideoMeta | null;
}

export function isLikelyVideoFile(file: File): boolean {
  if (file.type && ACCEPT.includes(file.type)) return true;
  const name = file.name.toLowerCase();
  return ACCEPT_EXT.some((ext) => name.endsWith(ext));
}

export function validateFileBasics(file: File): VideoValidation {
  const blocking: string[] = [];
  const warnings: string[] = [];
  if (!file || file.size <= 0) blocking.push("No video file was provided.");
  else if (!isLikelyVideoFile(file)) {
    blocking.push("That file type isn’t a supported video. Use MP4, MOV, or WebM.");
  }
  if (file.size > LIMITS.maxVideoBytes) {
    blocking.push(
      `Video is ${formatBytes(file.size)}. Maximum is ${formatBytes(LIMITS.maxVideoBytes)}.`,
    );
  } else if (file.size > 24 * 1024 * 1024) {
    warnings.push("Large file — analysis may take longer on this device.");
  }
  return {
    ok: blocking.length === 0,
    blocking,
    warnings,
    meta: null,
  };
}

export function loadVideoElement(file: File): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    video.src = url;
    const cleanupFail = (msg: string) => {
      URL.revokeObjectURL(url);
      reject(new Error(msg));
    };
    video.onloadedmetadata = () => resolve(video);
    video.onerror = () => cleanupFail("The video could not be read. It may be corrupted or use an unsupported codec.");
  });
}

export function readVideoMeta(file: File, video: HTMLVideoElement): VideoMeta {
  return {
    durationSec: Number.isFinite(video.duration) ? video.duration : 0,
    width: video.videoWidth || 0,
    height: video.videoHeight || 0,
    fps: null,
    sizeBytes: file.size,
    mimeType: file.type || "video/mp4",
    name: file.name,
  };
}

export function validateMeta(meta: VideoMeta): VideoValidation {
  const blocking: string[] = [];
  const warnings: string[] = [];
  if (!meta.width || !meta.height) blocking.push("Could not read video resolution.");
  if (meta.durationSec < LIMITS.minDurationSec) {
    blocking.push("Video is too short to contain a complete throw.");
  }
  if (meta.durationSec > LIMITS.maxDurationSec) {
    warnings.push(
      `Video is ${meta.durationSec.toFixed(1)}s. We’ll analyze a ${LIMITS.analyzeWindowSec}s window around the peak motion.`,
    );
  }
  if (meta.width < LIMITS.minWidth || meta.height < LIMITS.minHeight) {
    warnings.push("Resolution is low. Body landmarks will be less reliable.");
  }
  if (meta.height > meta.width * 1.6) {
    warnings.push("Tall vertical video can crop the thrower. Keep the full body in frame.");
  }
  return { ok: blocking.length === 0, blocking, warnings, meta };
}

export const SETUP_GUIDE = {
  recommended: [
    "Full body visible — head through feet",
    "Stable camera, not handheld-walking",
    "Side or rear-side view, roughly perpendicular to the throw",
    "Good lighting on the thrower",
    "High frame rate when the phone offers it (60 fps is better than 24)",
    "A few frames of setup before the first step, and follow-through after release",
  ],
  avoid: [
    "Cropped feet or cropped head",
    "Severe backlighting",
    "Moving with the thrower",
    "Extreme wide-angle that warps the body",
    "People walking in front of the thrower",
  ],
  cannotRecover: "If a joint is out of frame, this app cannot measure it. We will mark that metric unavailable rather than guess.",
};
