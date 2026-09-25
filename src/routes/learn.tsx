import { createFileRoute, Link } from "@tanstack/react-router";
import { LEARN_TOPICS } from "@/lib/analysis/learn-topics";

export const Route = createFileRoute("/learn")({ component: LearnPage });

function LearnPage() {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Education</p>
        <h1 className="font-display text-3xl">Learn</h1>
      </div>
      <ul className="space-y-2">
        {LEARN_TOPICS.map((t) => (
          <li key={t.id}>
            <Link
              to="/learn/$topic"
              params={{ topic: t.id }}
              className="block rounded-2xl bg-card p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
            >
              <p className="font-display text-lg">{t.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t.kicker}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
