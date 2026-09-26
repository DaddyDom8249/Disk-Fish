import type { PoseFrame } from "@/lib/analysis/types";
import { SKELETON_EDGES } from "@/lib/analysis/pose-map";

export function drawSkeleton(
  ctx: CanvasRenderingContext2D,
  frame: PoseFrame,
  w: number,
  h: number,
  opts: { ghost?: boolean; highlightArm?: "left" | "right" | null },
) {
  const alpha = opts.ghost ? 0.35 : 1;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const [a, b] of SKELETON_EDGES) {
    const pa = frame.landmarks[a];
    const pb = frame.landmarks[b];
    if (!pa || !pb || pa.visibility < 0.3 || pb.visibility < 0.3) continue;
    const throwing =
      opts.highlightArm &&
      ((opts.highlightArm === "right" && a.startsWith("right") && b.startsWith("right")) ||
        (opts.highlightArm === "left" && a.startsWith("left") && b.startsWith("left")));
    ctx.strokeStyle = throwing ? `rgba(168,181,173,${alpha})` : `rgba(215,221,214,${0.55 * alpha})`;
    ctx.lineWidth = throwing ? 3.2 : 2;
    ctx.beginPath();
    ctx.moveTo(pa.x * w, pa.y * h);
    ctx.lineTo(pb.x * w, pb.y * h);
    ctx.stroke();
  }
  const joints = Object.values(frame.landmarks);
  for (const j of joints) {
    if (!j || j.visibility < 0.3) continue;
    ctx.fillStyle = `rgba(232,237,233,${0.9 * alpha})`;
    ctx.beginPath();
    ctx.arc(j.x * w, j.y * h, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }
}
