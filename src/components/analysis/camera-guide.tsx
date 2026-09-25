import { SETUP_GUIDE } from "@/lib/analysis/video-validate";

export function CameraGuide() {
  return (
    <section className="rounded-2xl bg-card p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.08)]">
      <h2 className="font-display text-lg">Camera setup</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Best results: camera perpendicular to the throwing plane, full body visible, good lighting, and high frame rate.
      </p>
      <div className="mt-4 grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1 font-display text-sm uppercase tracking-wider">
        <span className="text-muted-foreground">Full body</span>
        <span className="text-accent">↓</span>
        {["Head", "Shoulders", "Hips", "Knees", "Feet"].map((row) => (
          <span key={row} className="col-span-2 border-t border-border py-1.5">
            {row}
          </span>
        ))}
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <h3 className="text-xs font-medium uppercase tracking-wider text-good">Recommended</h3>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {SETUP_GUIDE.recommended.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-xs font-medium uppercase tracking-wider text-poor">Avoid</h3>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {SETUP_GUIDE.avoid.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">{SETUP_GUIDE.cannotRecover}</p>
    </section>
  );
}
