import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ThrowPlayer } from "@/components/analysis/throw-player";
import { MetricBlock } from "@/components/analysis/metric-block";
import { ConfidenceBadge, DemoBadge, QualityBadge } from "@/components/analysis/confidence-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/progress";
import type { StoredThrow } from "@/lib/analysis/types";
import { getThrow, getVideoBlob, exportThrowJson } from "@/lib/storage/db";
import { explainCoaching } from "@/lib/ai/explain-coaching";
import { coachingFactsPayload } from "@/lib/analysis/coaching";
import { saveProfile, loadProfile } from "@/lib/storage/profile";

export const Route = createFileRoute("/analysis/$id")({ component: AnalysisPage });

type Tab = "overview" | "metrics" | "frames" | "audit";

function AnalysisPage() {
  const { id } = Route.useParams();
  const [row, setRow] = useState<StoredThrow | null | undefined>(undefined);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [llm, setLlm] = useState<string | null>(null);
  const [llmBusy, setLlmBusy] = useState(false);
  const [llmErr, setLlmErr] = useState<string | null>(null);

  useEffect(() => {
    let url: string | null = null;
    let alive = true;
    (async () => {
      const t = await getThrow(id);
      if (!alive) return;
      setRow(t);
      if (t) {
        const p = loadProfile();
        saveProfile({ ...p, primaryFocus: t.primaryFocusTitle });
      }
      if (t?.hasVideo) {
        const blob = await getVideoBlob(id);
        if (blob && alive) {
          url = URL.createObjectURL(blob);
          setVideoUrl(url);
        }
      }
    })();
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [id]);

  const record = row?.analysis;
  const byCat = useMemo(() => {
    if (!record) return [];
    const cats = ["lower_body", "pelvis", "torso", "throwing_arm", "release", "timing", "disc"] as const;
    return cats
      .map((c) => ({
        id: c,
        label: c.replaceAll("_", " "),
        items: record.metrics.filter((m) => m.category === c),
      }))
      .filter((g) => g.items.length);
  }, [record]);

  if (row === undefined) return <Skeleton className="h-64 w-full" />;
  if (!row || !record) {
    return (
      <div className="space-y-3">
        <h1 className="font-display text-2xl">Throw not found</h1>
        <p className="text-sm text-muted-foreground">It may have been deleted from this device.</p>
        <Button asChild>
          <Link to="/history">Back to history</Link>
        </Button>
      </div>
    );
  }

  const focus = record.coaching.primaryFocus;
  const frame = record.frames[Math.min(record.frames.length - 1, Math.floor(record.frames.length * 0.6))];

  async function rewrite() {
    if (!record) return;
    setLlmBusy(true);
    setLlmErr(null);
    try {
      const res = await explainCoaching({ data: { facts: coachingFactsPayload(record.coaching, record.throwType) } });
      if (res.ok) setLlm(res.text);
      else setLlmErr(res.error);
    } catch {
      setLlmErr("Coach language is unavailable.");
    } finally {
      setLlmBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Your throw</p>
          <h1 className="font-display text-2xl leading-tight">{record.throwType.label}</h1>
        </div>
        <div className="flex flex-wrap justify-end gap-1">
          <DemoBadge show={record.isDemo} />
          <QualityBadge grade={record.quality.grade} />
          <ConfidenceBadge level={record.overallConfidence} />
        </div>
      </div>

      <ThrowPlayer record={record} videoUrl={videoUrl} />

      <div className="flex gap-1 overflow-x-auto">
        {(
          [
            ["overview", "Overview"],
            ["metrics", "Metrics"],
            ["frames", "Frames"],
            ["audit", "Audit"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`h-10 shrink-0 rounded-full px-4 text-sm ${tab === id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "overview" ? (
        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wider text-accent">Primary finding</p>
              <h2 className="font-display text-2xl leading-tight">{focus?.title ?? "No ranked mechanical issue"}</h2>
              {focus ? (
                <p className="text-xs text-muted-foreground">
                  This is the clearest measurable difference in this analysis · {focus.likelihood.replaceAll("_", " ")}
                </p>
              ) : null}

              <section>
                <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">What we saw</h3>
                <p className="mt-1 text-sm">{record.coaching.whatWeSaw}</p>
              </section>
              <section>
                <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Why it matters</h3>
                <p className="mt-1 text-sm">{record.coaching.whyItMatters}</p>
              </section>
              {focus ? (
                <>
                  <section>
                    <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">What to try</h3>
                    <ul className="mt-1 list-disc space-y-1 pl-4 text-sm">
                      {focus.whatToTry.map((x) => (
                        <li key={x}>{x}</li>
                      ))}
                    </ul>
                  </section>
                  <section>
                    <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">What to watch for</h3>
                    <p className="mt-1 text-sm">{focus.watchFor}</p>
                  </section>
                  <section>
                    <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Recheck</h3>
                    <p className="mt-1 text-sm">{focus.recheck}</p>
                  </section>
                </>
              ) : null}

              {llm ? <p className="whitespace-pre-wrap rounded-xl bg-muted p-3 text-sm">{llm}</p> : null}
              {llmErr ? <p className="text-xs text-poor">{llmErr}</p> : null}
              <Button variant="outline" disabled={llmBusy || !focus} onClick={() => void rewrite()}>
                {llmBusy ? "Writing…" : "Rewrite in coaching language"}
              </Button>
              <p className="text-xs text-muted-foreground">{record.coaching.medicalDisclaimer}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-2">
              <h3 className="font-display text-lg">Reference comparison</h3>
              <p className="text-xs text-muted-foreground">
                This represents the observed range within the selected demo reference sample. It is not a “correct” value.
              </p>
              {record.comparisons
                .filter((c) => c.importance >= 0.7 && c.userValue != null)
                .slice(0, 6)
                .map((c) => (
                  <div key={c.metricId} className="flex items-baseline justify-between gap-3 border-t border-border py-2 text-sm">
                    <div>
                      <p>{c.label}</p>
                      <p className="text-xs text-muted-foreground">{c.plainMeaning}</p>
                    </div>
                    <p className="shrink-0 tabular-nums">
                      {c.userValue?.toFixed(c.metricId.endsWith("_ms") ? 0 : 1)}
                      {c.reference ? (
                        <span className="text-muted-foreground">
                          {" "}
                          / {c.reference.p25.toFixed(0)}–{c.reference.p75.toFixed(0)}
                        </span>
                      ) : null}
                    </p>
                  </div>
                ))}
            </CardContent>
          </Card>

          {record.coaching.secondaryFocus ? (
            <p className="text-sm text-muted-foreground">
              Secondary: {record.coaching.secondaryFocus.title}
            </p>
          ) : null}

          <p className="text-xs text-muted-foreground">{record.overallConfidenceReason}</p>
          <p className="text-xs text-muted-foreground">{record.quality.summary}</p>
        </div>
      ) : null}

      {tab === "metrics" ? (
        <div className="space-y-5">
          {byCat.map((g) => (
            <section key={g.id} className="space-y-2">
              <h3 className="font-display text-lg capitalize">{g.label}</h3>
              <div className="space-y-2">
                {g.items.map((m) => (
                  <MetricBlock
                    key={m.id}
                    metric={m}
                    comparison={record.comparisons.find((c) => c.metricId === m.id)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : null}

      {tab === "frames" ? (
        <Card>
          <CardContent className="space-y-3">
            <h3 className="font-display text-lg">Frame analysis</h3>
            <p className="text-sm text-muted-foreground">Scrub the player. Key joints on the current-ish frame:</p>
            {frame ? (
              <ul className="grid grid-cols-2 gap-2 text-xs tabular-nums">
                {Object.entries(frame.landmarks).map(([k, v]) =>
                  v ? (
                    <li key={k} className="rounded-md bg-muted px-2 py-1">
                      {k.replaceAll("_", " ")} · vis {(v.visibility * 100).toFixed(0)}%
                    </li>
                  ) : null,
                )}
              </ul>
            ) : null}
            <div className="space-y-2">
              {record.phases.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <span>{p.label}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {(p.peakMs / 1000).toFixed(2)}s · {p.confidence}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {tab === "audit" ? (
        <Card>
          <CardContent className="space-y-3 text-sm">
            <h3 className="font-display text-lg">Why this result</h3>
            {focus ? (
              <>
                <p>{focus.audit.triggeredBecause}</p>
                <pre className="overflow-x-auto rounded-xl bg-muted p-3 text-xs">
                  {JSON.stringify(focus.audit, null, 2)}
                </pre>
              </>
            ) : (
              <p>No rule fired a primary focus.</p>
            )}
            <p className="text-xs text-muted-foreground">
              Versions · vision {record.versions.vision} ({record.poseModel.id}) · metrics {record.versions.metrics} ·
              references {record.versions.references} · coaching {record.versions.coaching}
            </p>
            <Button
              variant="secondary"
              onClick={() => {
                const blob = new Blob([exportThrowJson(record)], { type: "application/json" });
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = `${record.id}.json`;
                a.click();
              }}
            >
              Export JSON
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex gap-2">
        <Button asChild className="flex-1">
          <Link to="/analyze">Analyze another</Link>
        </Button>
        <Button asChild variant="secondary" className="flex-1">
          <Link to="/compare">Compare</Link>
        </Button>
      </div>
    </div>
  );
}
