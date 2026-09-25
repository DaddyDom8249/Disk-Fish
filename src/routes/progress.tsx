import { createFileRoute, Link } from "@tanstack/react-router";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/progress";
import { useThrows } from "@/lib/storage/use-throws";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/progress")({ component: ProgressPage });

const TRACK = [
  { id: "hip_to_shoulder_ms", label: "Hip → shoulder (ms)" },
  { id: "reach_back_distance", label: "Reach-back (× SW)" },
  { id: "plant_knee_angle", label: "Plant knee (deg)" },
  { id: "hip_shoulder_separation", label: "Separation (deg)" },
];

function ProgressPage() {
  const { throws } = useThrows();
  const [metric, setMetric] = useState(TRACK[0]!.id);
  const data = useMemo(() => {
    if (!throws) return [];
    return [...throws]
      .reverse()
      .map((t, i) => {
        const v = t.analysis.metrics.find((m) => m.id === metric)?.value;
        if (v == null) return null;
        return { i: i + 1, value: v, demo: t.isDemo, date: t.createdAt.slice(0, 10) };
      })
      .filter((x): x is NonNullable<typeof x> => x != null);
  }, [throws, metric]);

  if (throws === null) return <Skeleton className="h-40 w-full" />;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Trends</p>
        <h1 className="font-display text-3xl">Training progress</h1>
        <p className="mt-2 text-sm text-muted-foreground">Only plotted from analyzed throws. No interpolated fake lines.</p>
      </div>
      {data.length < 2 ? (
        <Card>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Need at least two measurements of the same metric.</p>
            <Button asChild>
              <Link to="/analyze">Analyze</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <NativeSelect value={metric} onChange={(e) => setMetric(e.target.value)}>
            {TRACK.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </NativeSelect>
          <Card>
            <CardContent className="h-56 pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <XAxis dataKey="i" stroke="#8b948e" fontSize={11} />
                  <YAxis stroke="#8b948e" fontSize={11} width={40} />
                  <Tooltip
                    contentStyle={{ background: "#141816", border: "1px solid #252b28", borderRadius: 12 }}
                    labelFormatter={(_, pts) => (pts?.[0]?.payload?.date as string) ?? ""}
                  />
                  <Line type="linear" dataKey="value" stroke="#a8b5ad" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <ul className="space-y-1 text-sm">
            {data.map((d) => (
              <li key={d.i} className="flex justify-between tabular-nums text-muted-foreground">
                <span>
                  Throw {d.i}
                  {d.demo ? " · demo" : ""}
                </span>
                <span>{d.value.toFixed(1)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
