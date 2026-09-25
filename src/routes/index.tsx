import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, GitCompare, GraduationCap, Library, ScanLine, Sparkles, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DemoBadge, QualityBadge } from "@/components/analysis/confidence-badge";
import { PRODUCT } from "@/lib/product";
import { useThrows } from "@/lib/storage/use-throws";
import { loadProfile } from "@/lib/storage/profile";
import { Skeleton } from "@/components/ui/progress";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const { throws, error } = useThrows();
  const profile = typeof window === "undefined" ? null : loadProfile();
  const last = throws?.[0];
  const prev = throws?.[1];
  const hipLast = last?.analysis.metrics.find((m) => m.id === "hip_to_shoulder_ms")?.value;
  const hipPrev = prev?.analysis.metrics.find((m) => m.id === "hip_to_shoulder_ms")?.value;
  const hipDelta = hipLast != null && hipPrev != null ? hipLast - hipPrev : null;

  return (
    <div className="space-y-6">
      <section>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{PRODUCT.name}</p>
        <h1 className="mt-1 font-display text-4xl leading-[1.05] tracking-tight">{PRODUCT.tagline}</h1>
        <p className="mt-3 max-w-prose text-sm text-muted-foreground">
          Record or upload a throw. We track the body, measure what the camera can actually see, and name one training focus.
        </p>
      </section>

      <Button asChild size="lg" className="h-14 w-full text-base">
        <Link to="/analyze">
          Analyze a throw
          <ArrowRight />
        </Link>
      </Button>

      {error ? <p className="text-sm text-poor">{error}</p> : null}
      {throws === null ? <Skeleton className="h-28 w-full" /> : null}

      {last ? (
        <Card>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Last analyzed throw</p>
              <div className="flex gap-1">
                <DemoBadge show={last.isDemo} />
                <QualityBadge grade={last.qualityGrade} />
              </div>
            </div>
            <Link to="/analysis/$id" params={{ id: last.id }} className="block">
              <p className="font-display text-xl">{last.throwTypeLabel}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {last.primaryFocusTitle ?? "No ranked focus — pattern near the demo sample."}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {new Date(last.createdAt).toLocaleString()} · {last.overallConfidence} confidence
              </p>
            </Link>
          </CardContent>
        </Card>
      ) : throws ? (
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">No throws yet. Analyze a clip, or run the labeled demo to see the pipeline.</p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Current training focus</p>
          <p className="mt-2 font-display text-xl">{last?.primaryFocusTitle ?? profile?.primaryFocus ?? "None yet"}</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Recent improvement</p>
          {hipDelta == null ? (
            <p className="mt-2 text-sm text-muted-foreground">Need two analyzed throws of the same type to show a real change. We will not invent a trend.</p>
          ) : (
            <p className="mt-2 text-sm">
              Hip → shoulder timing changed {hipDelta > 0 ? "+" : ""}
              {hipDelta.toFixed(0)} ms between your last two saved throws. Direction only — not distance gained.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <HomeLink to="/history" icon={ScanLine} label="Throw history" />
        <HomeLink to="/dna" icon={Sparkles} label="Throw DNA" />
        <HomeLink to="/compare" icon={GitCompare} label="Compare throws" />
        <HomeLink to="/pros" icon={Library} label="Reference library" />
        <HomeLink to="/progress" icon={TrendingUp} label="Training progress" />
        <HomeLink to="/learn" icon={GraduationCap} label="Learn" />
      </div>
    </div>
  );
}

function HomeLink({
  to,
  icon: Icon,
  label,
}: {
  to: "/history" | "/dna" | "/compare" | "/pros" | "/progress" | "/learn";
  icon: typeof ScanLine;
  label: string;
}) {
  return (
    <Link
      to={to}
      className="flex min-h-24 flex-col justify-between rounded-2xl bg-card p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
    >
      <Icon className="size-5 text-accent" />
      <span className="font-display text-base leading-tight">{label}</span>
    </Link>
  );
}
