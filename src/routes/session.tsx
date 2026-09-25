import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/progress";
import { useThrows } from "@/lib/storage/use-throws";
import { consistencyFor } from "@/lib/analysis/consistency";
import { mean } from "@/lib/analysis/geometry";
import { DemoBadge } from "@/components/analysis/confidence-badge";

export const Route = createFileRoute("/session")({ component: SessionPage });

const KEYS = ["hip_to_shoulder_ms", "reach_back_distance", "plant_knee_angle", "release_height"];

function SessionPage() {
  const { throws } = useThrows();
  if (throws === null) return <Skeleton className="h-40 w-full" />;
  const session = throws.slice(0, 8);
  const rows = KEYS.map((id) => consistencyFor(session, id)).filter((x): x is NonNullable<typeof x> => x != null);

  let outlier: string | null = null;
  if (session.length >= 3) {
    const metric = "hip_to_shoulder_ms";
    const vals = session.map((t) => t.analysis.metrics.find((m) => m.id === metric)?.value ?? null);
    const m = mean(vals.filter((v): v is number => v != null));
    if (m != null) {
      let best = 0;
      let bestD = -1;
      session.forEach((t, i) => {
        const v = vals[i];
        if (v == null) return;
        const d = Math.abs(v - m);
        if (d > bestD) {
          bestD = d;
          best = i;
        }
      });
      if (bestD > 0) outlier = session[best]!.id;
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Multi-throw</p>
        <h1 className="font-display text-3xl">Session</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          A single throw is not a mechanical identity. Repeatable differences matter more.
        </p>
      </div>
      {session.length === 0 ? (
        <Card>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">No throws in this device library.</p>
            <Button asChild>
              <Link to="/analyze">Analyze</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">{session.length} most recent throws</p>
          {rows.map((r) => (
            <Card key={r.metricId}>
              <CardContent>
                <div className="flex justify-between gap-2">
                  <h2 className="font-display text-lg">{r.label}</h2>
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">{r.band} consistency</span>
                </div>
                <p className="mt-2 text-sm tabular-nums text-muted-foreground">
                  n={r.values.length}
                  {r.mean != null ? ` · mean ${r.mean.toFixed(1)}` : ""}
                  {r.sd != null ? ` · sd ${r.sd.toFixed(1)}` : ""}
                  {r.range != null ? ` · range ${r.range.toFixed(1)}` : ""}
                </p>
              </CardContent>
            </Card>
          ))}
          {outlier ? (
            <p className="text-sm text-muted-foreground">
              Largest hip-timing deviation:{" "}
              <Link className="text-accent" to="/analysis/$id" params={{ id: outlier }}>
                open throw
              </Link>
              . Treat it as an outlier until it repeats.
            </p>
          ) : null}
          <ul className="space-y-2">
            {session.map((t) => (
              <li key={t.id}>
                <Link to="/analysis/$id" params={{ id: t.id }} className="flex items-center justify-between rounded-xl bg-card px-4 py-3">
                  <span className="flex items-center gap-2 text-sm">
                    {t.throwTypeCode}
                    <DemoBadge show={t.isDemo} />
                  </span>
                  <span className="text-xs text-muted-foreground">{new Date(t.createdAt).toLocaleTimeString()}</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
