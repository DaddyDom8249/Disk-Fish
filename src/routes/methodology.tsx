import { createFileRoute } from "@tanstack/react-router";
import { METHODOLOGY } from "@/lib/data/methodology";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/methodology")({ component: MethodologyPage });

function MethodologyPage() {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Transparency</p>
        <h1 className="font-display text-3xl">Methodology</h1>
      </div>
      <Card>
        <CardContent className="space-y-2">
          <h2 className="font-display text-lg">What we measure</h2>
          <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
            {METHODOLOGY.measures.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-2">
          <h2 className="font-display text-lg">What we estimate</h2>
          <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
            {METHODOLOGY.estimates.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-2">
          <h2 className="font-display text-lg">What we cannot measure</h2>
          <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
            {METHODOLOGY.cannot.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>{METHODOLOGY.references}</p>
          <p>{METHODOLOGY.confidence}</p>
          <p>{METHODOLOGY.monocular}</p>
        </CardContent>
      </Card>
    </div>
  );
}
