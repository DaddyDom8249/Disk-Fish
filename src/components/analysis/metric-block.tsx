import { ConfidenceBadge, ClassificationTag } from "./confidence-badge";
import type { MetricComparison, MetricMeasurement } from "@/lib/analysis/types";
import { formatNumber } from "@/lib/utils";

export function MetricBlock({
  metric,
  comparison,
}: {
  metric: MetricMeasurement;
  comparison?: MetricComparison;
}) {
  const unavailable = metric.classification === "unavailable";
  return (
    <article className="rounded-xl bg-secondary p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="text-sm font-medium">{metric.label}</h4>
          <p className="mt-1 font-display text-2xl tabular-nums tracking-tight">
            {unavailable ? "—" : formatNumber(metric.value, metric.unit === "ms" ? 0 : 2)}
            <span className="ml-1 font-sans text-xs font-normal text-muted-foreground">{unavailable ? "" : metric.unit}</span>
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <ClassificationTag value={metric.classification} />
          {!unavailable ? <ConfidenceBadge level={metric.confidence} /> : null}
        </div>
      </div>
      {comparison?.reference ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Demo reference range {formatNumber(comparison.reference.p25, 1)} – {formatNumber(comparison.reference.p75, 1)} {metric.unit}
          {comparison.insideIqr ? " · inside sample IQR" : " · outside sample IQR"}
        </p>
      ) : null}
      <p className="mt-2 text-xs text-muted-foreground">{unavailable ? metric.unavailableReason : metric.confidenceReason}</p>
      <details className="mt-2">
        <summary className="cursor-pointer text-xs font-medium text-accent">How this was measured</summary>
        <div className="mt-2 space-y-1 text-xs text-muted-foreground">
          <p>Source: {metric.source}</p>
          <p>Calculation: {metric.method}</p>
          <p>Limitations: {metric.limitations}</p>
        </div>
      </details>
    </article>
  );
}
