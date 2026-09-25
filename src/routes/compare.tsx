import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/progress";
import { compareThrows } from "@/lib/analysis/consistency";
import { useThrows } from "@/lib/storage/use-throws";
import { DemoBadge } from "@/components/analysis/confidence-badge";

export const Route = createFileRoute("/compare")({ component: ComparePage });

function ComparePage() {
  const { throws } = useThrows();
  const [a, setA] = useState<string>("");
  const [b, setB] = useState<string>("");
  const ta = throws?.find((t) => t.id === a);
  const tb = throws?.find((t) => t.id === b);
  const rows = useMemo(() => (ta && tb ? compareThrows(ta, tb) : []), [ta, tb]);

  if (throws === null) return <Skeleton className="h-40 w-full" />;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Side by side</p>
        <h1 className="font-display text-3xl">Compare throws</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Mechanical change only. We will not translate this into distance gained.
        </p>
      </div>
      {throws.length < 2 ? (
        <Card>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Save at least two analyses to compare.</p>
            <Button asChild>
              <Link to="/analyze">Analyze</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            <NativeSelect value={a} onChange={(e) => setA(e.target.value)}>
              <option value="">Throw A</option>
              {throws.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.isDemo ? "DEMO · " : ""}
                  {t.throwTypeCode} · {new Date(t.createdAt).toLocaleDateString()}
                </option>
              ))}
            </NativeSelect>
            <NativeSelect value={b} onChange={(e) => setB(e.target.value)}>
              <option value="">Throw B</option>
              {throws.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.isDemo ? "DEMO · " : ""}
                  {t.throwTypeCode} · {new Date(t.createdAt).toLocaleDateString()}
                </option>
              ))}
            </NativeSelect>
          </div>
          {ta && tb ? (
            <Card>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    A <DemoBadge show={ta.isDemo} />
                  </span>
                  <span className="flex items-center gap-1">
                    B <DemoBadge show={tb.isDemo} />
                  </span>
                </div>
                {rows.map((r) => (
                  <div key={r.id} className="grid grid-cols-[1fr_auto_auto_auto] items-baseline gap-2 border-t border-border py-2 text-sm">
                    <span>{r.label}</span>
                    <span className="tabular-nums text-muted-foreground">{r.a.toFixed(1)}</span>
                    <span className="tabular-nums text-muted-foreground">{r.b.toFixed(1)}</span>
                    <span className="tabular-nums">
                      {r.delta > 0 ? "+" : ""}
                      {r.delta.toFixed(1)}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}
