import { createFileRoute, Link } from "@tanstack/react-router";
import { DEMO_PLAYERS, demoRangesFor } from "@/lib/analysis/demo-professionals";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/pros/$id")({ component: ProDetail });

function ProDetail() {
  const { id } = Route.useParams();
  const p = DEMO_PLAYERS.find((x) => x.playerId === id);
  if (!p) {
    return (
      <div className="space-y-3">
        <h1 className="font-display text-2xl">Not found</h1>
        <Button asChild>
          <Link to="/pros">Back</Link>
        </Button>
      </div>
    );
  }
  const family = p.throwTypes.includes("RHFH") ? "forehand" : "backhand";
  const ranges = demoRangesFor(family);
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{p.playerName}</p>
          <h1 className="font-display text-3xl">{p.displayName}</h1>
        </div>
        <Badge variant="demo">Demo data</Badge>
      </div>
      <Card>
        <CardContent className="space-y-1 text-sm">
          <p>Throw types: {p.throwTypes.join(", ")}</p>
          <p>Handedness: {p.handedness}</p>
          <p>Sample size: {p.sampleCount}</p>
          <p>Data quality: {p.dataQuality}</p>
          <p>Source: {p.source}</p>
          <p>Rights: {p.rightsStatus} · commercial use {p.commercialUseAllowed ? "allowed" : "not allowed"}</p>
          <p className="text-muted-foreground">{p.notes}</p>
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">
        Reference comparison — not “copy this throw.” Height is undocumented.
      </p>
      <Card>
        <CardContent>
          {ranges.map((r) => (
            <div key={r.metricId} className="flex justify-between gap-2 border-t border-border py-2 text-sm">
              <span className="capitalize">{r.metricId.replaceAll("_", " ")}</span>
              <span className="tabular-nums text-muted-foreground">
                {r.p25.toFixed(1)}–{r.p75.toFixed(1)} {r.unit}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
