import { Pause, Play, RotateCcw, SkipBack, SkipForward } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AnalysisRecord, PoseFrame } from "@/lib/analysis/types";
import { phaseAtTime } from "@/lib/analysis/phase-detector";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/progress";
import { drawSkeleton } from "./skeleton-canvas";

export function ThrowPlayer({
  record,
  videoUrl,
}: {
  record: AnalysisRecord;
  videoUrl: string | null;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(0.5);
  const [idx, setIdx] = useState(0);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [showAngles, setShowAngles] = useState(true);
  const frames = record.frames;
  const frame = frames[idx] ?? null;
  const tMax = frames.at(-1)?.timestampMs ?? 1;
  const phase = frame ? phaseAtTime(record.phases, frame.timestampMs) : null;

  const angleText = useMemo(() => {
    if (!showAngles || !frame) return [];
    const ids = ["plant_knee_angle", "elbow_angle_reach_back", "hip_shoulder_separation"];
    return record.metrics
      .filter((m) => ids.includes(m.id) && m.value != null && (m.frame == null || Math.abs((m.frame ?? 0) - frame.frame) < 8))
      .map((m) => `${m.label}: ${m.value!.toFixed(0)}${m.unit.includes("deg") ? "°" : ""}`);
  }, [frame, record.metrics, showAngles]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !frame) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (showSkeleton) {
      drawSkeleton(ctx, frame, canvas.width, canvas.height, {
        highlightArm: record.throwType.throwingArm,
      });
    }
    if (phase) {
      ctx.fillStyle = "rgba(11,13,12,0.55)";
      ctx.fillRect(12, 12, 220, 28);
      ctx.fillStyle = "#d7ddd6";
      ctx.font = "600 13px 'IBM Plex Sans', sans-serif";
      ctx.fillText(phase.label.toUpperCase(), 22, 32);
    }
  }, [frame, phase, record.throwType.throwingArm, showSkeleton]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = rate;
  }, [rate]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !playing) return;
    let raf = 0;
    const tick = () => {
      const t = video.currentTime * 1000;
      let nearest = 0;
      let best = Infinity;
      frames.forEach((f, i) => {
        const d = Math.abs(f.timestampMs - t);
        if (d < best) {
          best = d;
          nearest = i;
        }
      });
      setIdx(nearest);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, frames]);

  function seekTo(i: number) {
    const next = Math.max(0, Math.min(frames.length - 1, i));
    setIdx(next);
    const v = videoRef.current;
    const f = frames[next];
    if (v && f) v.currentTime = f.timestampMs / 1000;
  }

  function toggle() {
    const v = videoRef.current;
    if (v && videoUrl) {
      if (playing) v.pause();
      else void v.play();
      setPlaying(!playing);
      return;
    }
    setPlaying((p) => !p);
  }

  useEffect(() => {
    if (videoUrl || !playing) return;
    const id = window.setInterval(() => {
      setIdx((i) => {
        const n = i + 1;
        if (n >= frames.length) {
          setPlaying(false);
          return frames.length - 1;
        }
        return n;
      });
    }, (1000 / 30) / rate);
    return () => window.clearInterval(id);
  }, [playing, videoUrl, frames.length, rate]);

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-xl bg-muted">
        {videoUrl ? (
          <video
            ref={videoRef}
            src={videoUrl}
            className="block aspect-video w-full bg-background object-contain"
            playsInline
            muted
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
          />
        ) : (
          <div className="aspect-video w-full bg-[#101412]" />
        )}
        <canvas
          ref={canvasRef}
          width={960}
          height={540}
          className="pointer-events-none absolute inset-0 h-full w-full"
        />
        {record.isDemo ? (
          <div className="absolute top-2 right-2 rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-accent">
            Demo data
          </div>
        ) : null}
      </div>

      <PhaseBar frames={frames} phases={record.phases} current={idx} onSelect={seekTo} />

      <input
        type="range"
        min={0}
        max={Math.max(0, frames.length - 1)}
        value={idx}
        onChange={(e) => seekTo(Number(e.target.value))}
        className="w-full accent-primary"
        aria-label="Throw timeline"
      />

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button variant="secondary" size="icon" aria-label="Back 1 frame" onClick={() => seekTo(idx - 1)}>
            <SkipBack />
          </Button>
          <Button size="icon" aria-label={playing ? "Pause" : "Play"} onClick={toggle}>
            {playing ? <Pause /> : <Play />}
          </Button>
          <Button variant="secondary" size="icon" aria-label="Forward 1 frame" onClick={() => seekTo(idx + 1)}>
            <SkipForward />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Restart" onClick={() => seekTo(0)}>
            <RotateCcw />
          </Button>
        </div>
        <div className="flex items-center gap-1">
          {[0.25, 0.5, 1].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRate(r)}
              className={`h-9 rounded-md px-2.5 text-xs tabular-nums ${rate === r ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
            >
              {r}×
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <p className="tabular-nums">
          Frame {frame?.frame ?? 0} · {((frame?.timestampMs ?? 0) / 1000).toFixed(2)}s
          {phase ? ` · ${phase.label}` : ""}
        </p>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            Skeleton <Switch checked={showSkeleton} onCheckedChange={setShowSkeleton} label="Skeleton" />
          </label>
          <label className="flex items-center gap-2">
            Angles <Switch checked={showAngles} onCheckedChange={setShowAngles} label="Angles" />
          </label>
        </div>
      </div>
      {showAngles && angleText.length ? (
        <ul className="space-y-1 text-xs text-data">
          {angleText.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      ) : null}
      <p className="text-[11px] text-muted-foreground">Window {((tMax) / 1000).toFixed(2)}s · {frames.length} tracked frames</p>
    </div>
  );
}

function PhaseBar({
  frames,
  phases,
  current,
  onSelect,
}: {
  frames: PoseFrame[];
  phases: AnalysisRecord["phases"];
  current: number;
  onSelect: (i: number) => void;
}) {
  const compact = ["setup", "x_step", "plant", "hip_rotation", "release", "follow_through"] as const;
  const t0 = frames[0]?.timestampMs ?? 0;
  const span = Math.max(1, (frames.at(-1)?.timestampMs ?? 1) - t0);
  return (
    <div className="relative h-9 overflow-hidden rounded-md bg-muted">
      {compact.map((id) => {
        const p = phases.find((x) => x.id === id);
        if (!p) return null;
        const left = ((p.startMs - t0) / span) * 100;
        const width = Math.max(4, ((p.endMs - p.startMs) / span) * 100);
        return (
          <button
            key={id}
            type="button"
            onClick={() => {
              const i = frames.findIndex((f) => f.frame === p.peakFrame);
              onSelect(i < 0 ? 0 : i);
            }}
            className="absolute top-0 h-full border-r border-background/40 px-1 text-left text-[9px] font-medium uppercase tracking-wider text-foreground/80"
            style={{ left: `${left}%`, width: `${width}%`, background: "rgba(168,181,173,0.18)" }}
          >
            {p.label}
          </button>
        );
      })}
      <div
        className="pointer-events-none absolute top-0 h-full w-0.5 bg-primary"
        style={{ left: `${(current / Math.max(1, frames.length - 1)) * 100}%` }}
      />
    </div>
  );
}
