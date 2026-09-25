import { createFileRoute, Link } from "@tanstack/react-router";
import { LEARN_TOPICS } from "@/lib/analysis/learn-topics";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/learn/$topic")({ component: LearnTopicPage });

function LearnTopicPage() {
  const { topic } = Route.useParams();
  const t = LEARN_TOPICS.find((x) => x.id === topic);
  if (!t) {
    return (
      <div className="space-y-3">
        <h1 className="font-display text-2xl">Topic not found</h1>
        <Button asChild>
          <Link to="/learn">Back</Link>
        </Button>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Learn</p>
      <h1 className="font-display text-3xl">{t.title}</h1>
      <p className="text-sm text-accent">{t.kicker}</p>
      {t.body.map((p) => (
        <p key={p} className="text-sm leading-relaxed text-muted-foreground">
          {p}
        </p>
      ))}
      <Card>
        <CardContent>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">A cue to try</p>
          <p className="mt-2 text-sm">{t.cue}</p>
        </CardContent>
      </Card>
    </div>
  );
}
