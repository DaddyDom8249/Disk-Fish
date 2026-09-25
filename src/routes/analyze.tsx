import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState, type ReactNode } from "react";
import { CircleAlert } from "lucide-react";
import { CameraGuide } from "@/components/analysis/camera-guide";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label, NativeSelect, Textarea } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { CAMERA_ANGLES, DEFAULT_THROW_TYPE, THROW_TYPES } from "@/lib/analysis/throw-catalog";
import type { CameraAngle, Footwork, ThrowFamily, ThrowHand, ThrowIntent } from "@/lib/analysis/types";
import { PIPELINE_STEPS, runAnalysis } from "@/lib/analysis/pipeline";
import { useAnalysisSession } from "@/lib/analysis/session-store";
import { saveThrow } from "@/lib/storage/db";
import { formatBytes } from "@/lib/utils";

export const Route = createFileRoute("/analyze")({ component: AnalyzePage });

function AnalyzePage() {
  const nav = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const session = useAnalysisSession();
  const [hand, setHand] = useState<ThrowHand>("right");
  const [family, setFamily] = useState<ThrowFamily>("backhand");
  const [footwork, setFootwork] = useState<Footwork>("x-step");
  const [intent, setIntent] = useState<ThrowIntent>("distance");
  const [camera, setCamera] = useState<CameraAngle>("off-arm-side");
  const [disc, setDisc] = useState("");
  const [distance, setDistance] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [recError, setRecError] = useState<string | null>(null);

  const throwType = useMemo(() => {
    const found = THROW_TYPES.find(
      (t) =>
        t.hand === hand &&
        t.family === family &&
        (family === "putting" || family === "approach" || t.footwork === footwork) &&
        (family === "putting" || family === "approach" || family === "forehand" || t.intent === intent),
    );
    return found ?? THROW_TYPES.find((t) => t.hand === hand && t.family === family) ?? DEFAULT_THROW_TYPE;
  }, [hand, family, footwork, intent]);

  async function run(opts: { demo?: boolean; variant?: "early-shoulder" | "reference-like" | "collapsed-brace" }) {
    setBusy(true);
    session.reset();
    try {
      const record = await runAnalysis(
        {
          file: opts.demo ? null : file,
          throwType,
          cameraAngle: camera,
          disc: disc || undefined,
          distanceMeters: distance ? Number(distance) : null,
          notes: notes || undefined,
          isDemo: !!opts.demo,
          demoVariant: opts.variant,
        },
        (state, progress, label) => session.setProgress(state, progress, label),
      );
      await saveThrow(record, opts.demo ? null : file);
      session.setResult(record);
      await nav({ to: "/analysis/$id", params: { id: record.id } });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Analysis failed.";
      const errorId = (e as { errorId?: string }).errorId ?? "ERR-ANALYSIS";
      session.setFailed(message, errorId);
    } finally {
      setBusy(false);
    }
  }

  async function recordClip() {
    setRecError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      const rec = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      rec.ondataavailable = (ev) => {
        if (ev.data.size) chunks.push(ev.data);
      };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: rec.mimeType || "video/webm" });
        const f = new File([blob], `throw-${Date.now()}.webm`, { type: blob.type });
        setFile(f);
      };
      rec.start();
      window.setTimeout(() => {
        if (rec.state !== "inactive") rec.stop();
      }, 5000);
    } catch {
      setRecError("Camera access was blocked. Upload a file instead.");
    }
  }

  const running = busy || (session.state !== "idle" && session.state !== "complete" && session.state !== "failed");

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">New throw</p>
        <h1 className="font-display text-3xl">Analyze</h1>
      </div>

      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void run({});
        }}
      >
        <Field label="Throwing hand">
          <Seg
            value={hand}
            onChange={setHand}
            options={[
              { id: "right", label: "Right" },
              { id: "left", label: "Left" },
            ]}
          />
        </Field>
        <Field label="Throw style">
          <Seg
            value={family}
            onChange={(v) => {
              setFamily(v);
              if (v === "putting" || v === "approach") setFootwork("standstill");
            }}
            options={[
              { id: "backhand", label: "Backhand" },
              { id: "forehand", label: "Forehand" },
              { id: "putting", label: "Putt" },
              { id: "approach", label: "Approach" },
            ]}
          />
        </Field>
        {family === "backhand" || family === "forehand" ? (
          <>
            <Field label="Footwork">
              <Seg
                value={footwork}
                onChange={setFootwork}
                options={[
                  { id: "x-step", label: "X-step" },
                  { id: "one-step", label: "One-step" },
                  { id: "standstill", label: "Standstill" },
                ]}
              />
            </Field>
            {family === "backhand" ? (
              <Field label="Intent">
                <Seg
                  value={intent}
                  onChange={setIntent}
                  options={[
                    { id: "distance", label: "Distance" },
                    { id: "control", label: "Fairway" },
                  ]}
                />
              </Field>
            ) : null}
          </>
        ) : null}

        <Field label="Camera angle">
          <NativeSelect value={camera} onChange={(e) => setCamera(e.target.value as CameraAngle)}>
            {CAMERA_ANGLES.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </NativeSelect>
          <p className="mt-1 text-xs text-muted-foreground">{CAMERA_ANGLES.find((a) => a.id === camera)?.hint}</p>
        </Field>

        <CameraGuide />

        <Field label="Video">
          <input
            ref={fileRef}
            type="file"
            accept="video/mp4,video/quicktime,video/webm,video/3gpp,.mp4,.mov,.webm"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <div className="flex gap-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => fileRef.current?.click()}>
              Upload video
            </Button>
            <Button type="button" variant="outline" className="flex-1" onClick={() => void recordClip()}>
              Record 5s
            </Button>
          </div>
          {file ? (
            <p className="mt-2 text-xs text-muted-foreground">
              {file.name} · {formatBytes(file.size)}
            </p>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">MP4, MOV, or WebM. Keep the full body in frame.</p>
          )}
          {recError ? <p className="mt-2 text-xs text-poor">{recError}</p> : null}
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Disc (optional)">
            <Input value={disc} onChange={(e) => setDisc(e.target.value)} placeholder="Destroyer" />
          </Field>
          <Field label="Distance m (optional)">
            <Input inputMode="decimal" value={distance} onChange={(e) => setDistance(e.target.value)} placeholder="Not assumed" />
          </Field>
        </div>
        <Field label="Notes">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Wind, surface, how it felt" />
        </Field>

        <p className="text-xs text-muted-foreground">Selected profile: {throwType.label}</p>

        <Button type="submit" size="lg" className="h-14 w-full" disabled={busy || !file}>
          {busy ? "Analyzing…" : "Analyze this throw"}
        </Button>
      </form>

      <Card>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            No clip handy? Run a labeled synthetic throw through the real phase, metric, and coaching engines. It is never mixed with live measurements.
          </p>
          <Button variant="secondary" className="w-full" disabled={busy} onClick={() => void run({ demo: true, variant: "early-shoulder" })}>
            Run demo analysis
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" disabled={busy} onClick={() => void run({ demo: true, variant: "reference-like" })}>
              Demo · closer to sample
            </Button>
            <Button variant="outline" size="sm" className="flex-1" disabled={busy} onClick={() => void run({ demo: true, variant: "collapsed-brace" })}>
              Demo · collapsed brace
            </Button>
          </div>
        </CardContent>
      </Card>

      {running || session.state === "failed" ? (
        <Card>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{session.label || "Working"}</p>
              <p className="text-xs tabular-nums text-muted-foreground">{Math.round(session.progress)}%</p>
            </div>
            <Progress value={session.progress} />
            <ol className="space-y-1 text-sm">
              {PIPELINE_STEPS.map((s) => {
                const done = stepDone(session.state, s.state);
                const active = session.state === s.state;
                return (
                  <li key={s.state} className={active ? "text-foreground" : "text-muted-foreground"}>
                    {done ? "✓" : active ? "●" : "○"} {s.label}
                  </li>
                );
              })}
            </ol>
            {session.state === "failed" ? (
              <div className="flex items-start gap-2 text-sm text-poor">
                <CircleAlert className="mt-0.5 size-4 shrink-0" />
                <div>
                  <p>{session.errorMessage}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Error ID {session.errorId}</p>
                  <Button className="mt-3" variant="secondary" onClick={() => session.reset()}>
                    Try again
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">You can leave this screen. The result will appear in History when it finishes.</p>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Seg<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ id: T; label: string }>;
}) {
  return (
    <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1 sm:grid-cols-4">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={`min-h-10 rounded-lg text-sm ${value === o.id ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const ORDER = ["validating", "pose_detection", "phase_detection", "metric_analysis", "reference_comparison", "coaching", "complete"];
function stepDone(current: string, step: string) {
  if (current === "failed") return false;
  return ORDER.indexOf(current) > ORDER.indexOf(step) || current === "complete";
}
