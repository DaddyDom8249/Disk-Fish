import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/progress";
import { ConfidenceBadge, DemoBadge } from "@/components/analysis/confidence-badge";
import { buildThrowDna } from "@/lib/analysis/dna";
import { useThrows } from "@/lib/storage/use-throws";

export const Route = createFileRoute("/dna")({ component: DnaPage });

function DnaPage() {
  const { throws } = useThrows();
  if (throws === null) return <Skeleton className="h-40 w-full" />;
  const cats = buildThrowDna(throws);
  const usingDemo = throws.length > 0 && throws.every((t) => t.isDemo);
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Profile</p>
        <h1 className="font-display text-3xl">Throw DNA</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Measured profile versus the demo reference sample. These are not 0–100 scores.
        </p>
      </div>
      <DemoBadge show={usingDemo} />
      {cats.length === 0 ? (
        <Card>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Analyze a throw to build this profile.</p>
            <Button asChild>
              <Link to="/analyze">Analyze</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        cats.map((c) => (
          <Card key={c.id}>
            <CardContent>
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-display text-lg">{c.label}</h2>
                <ConfidenceBadge level={c.confidence} />
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{c.summary}</p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-accent"
                  style={{ width: `${c.n ? (c.insideCount / c.n) * 100 : 0}%` }}
                />
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
