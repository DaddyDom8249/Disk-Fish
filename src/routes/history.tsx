import { createFileRoute, Link } from "@tanstack/react-router";
import { DemoBadge, QualityBadge } from "@/components/analysis/confidence-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/progress";
import { useThrows } from "@/lib/storage/use-throws";

export const Route = createFileRoute("/history")({ component: HistoryPage });

function HistoryPage() {
  const { throws, error, remove } = useThrows();
  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Library</p>
          <h1 className="font-display text-3xl">Throw history</h1>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/session">Session</Link>
        </Button>
      </div>
      {error ? <p className="text-sm text-poor">{error}</p> : null}
      {throws === null ? <Skeleton className="h-40 w-full" /> : null}
      {throws && throws.length === 0 ? (
        <Card>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">No saved throws on this device.</p>
            <Button asChild>
              <Link to="/analyze">Analyze a throw</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}
      <ul className="space-y-2">
        {throws?.map((t) => (
          <li key={t.id}>
            <Card>
              <CardContent className="flex items-start justify-between gap-3">
                <Link to="/analysis/$id" params={{ id: t.id }} className="min-w-0 flex-1">
                  <div className="flex flex-wrap gap-1">
                    <DemoBadge show={t.isDemo} />
                    <QualityBadge grade={t.qualityGrade} />
                  </div>
                  <p className="mt-2 font-display text-lg leading-tight">{t.throwTypeLabel}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{t.primaryFocusTitle ?? "No ranked focus"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{new Date(t.createdAt).toLocaleString()}</p>
                </Link>
                <Button variant="ghost" size="sm" onClick={() => void remove(t.id)}>
                  Delete
                </Button>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
