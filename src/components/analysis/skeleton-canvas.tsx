import { useEffect, useRef } from "react";
import type { PoseFrame, ThrowPhase } from "@/lib/analysis/types";
import { drawSkeleton } from "./skeleton-drawing";

export function SkeletonStage({
  frame,
  phase,
  className,
}: {
  frame: PoseFrame | null;
  phase?: ThrowPhase | null;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !frame) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#101412";
    ctx.fillRect(0, 0, w, h);
    drawSkeleton(ctx, frame, w, h, { highlightArm: "right" });
    if (phase) {
      ctx.fillStyle = "rgba(168,181,173,0.9)";
      ctx.font = "600 14px 'IBM Plex Sans', sans-serif";
      ctx.fillText(phase.label.toUpperCase(), 16, 28);
    }
  }, [frame, phase]);

  return <canvas ref={ref} width={720} height={405} className={className ?? "h-auto w-full rounded-xl"} />;
}
