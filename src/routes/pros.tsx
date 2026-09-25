import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DEMO_PLAYERS, REFERENCE_GROUPS } from "@/lib/analysis/demo-professionals";

export const Route = createFileRoute("/pros")({ component: ProsPage });

function ProsPage() {
  const [q, setQ] = useState("");
  const players = DEMO_PLAYERS.filter((p) => {
    const s = q.toLowerCase();
    if (!s) return true;
    return (
      p.displayName.toLowerCase().includes(s) ||
      p.throwTypes.join(" ").toLowerCase().includes(s) ||
      p.playerName.toLowerCase().includes(s)
    );
  });
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Library</p>
        <h1 className="font-display text-3xl">Reference library</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Every record below is labeled demo data. Publicly viewable footage is not a license to analyze someone commercially.
        </p>
      </div>
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search player, throw type…" />
      <section className="space-y-2">
        <h2 className="font-display text-lg">Reference groups</h2>
        {REFERENCE_GROUPS.map((g) => (
          <Card key={g.id}>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="font-medium">{g.label}</p>
                <Badge variant="demo">Demo</Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Sample size {g.sampleSize} · synthetic development records</p>
            </CardContent>
          </Card>
        ))}
      </section>
      <section className="space-y-2">
        <h2 className="font-display text-lg">Athletes</h2>
        {players.map((p) => (
          <Link key={p.playerId} to="/pros/$id" params={{ id: p.playerId }} className="block">
            <Card>
              <CardContent>
                <div className="flex items-center justify-between">
                  <p className="font-display text-lg">{p.displayName}</p>
                  <Badge variant="demo">Demo data</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{p.throwTypes.join(", ")} · {p.sampleCount} samples</p>
              </CardContent>
            </Card>
          </Link>
        ))}
        {players.length === 0 ? <p className="text-sm text-muted-foreground">No matches.</p> : null}
      </section>
    </div>
  );
}
