import { mean, median, stddev } from "./geometry";
import type { StoredThrow } from "./types";

export interface ConsistencyRow {
  metricId: string;
  label: string;
  values: number[];
  mean: number | null;
  median: number | null;
  sd: number | null;
  range: number | null;
  band: "high" | "moderate" | "low" | "insufficient";
}

export function consistencyFor(throws: StoredThrow[], metricId: string): ConsistencyRow | null {
  const typed = throws.filter((t) => t.throwTypeCode === throws[0]?.throwTypeCode);
  const label = typed[0]?.analysis.metrics.find((m) => m.id === metricId)?.label ?? metricId;
  const values = typed
    .map((t) => t.analysis.metrics.find((m) => m.id === metricId)?.value)
    .filter((v): v is number => v != null && Number.isFinite(v));
  if (values.length < 2) {
    return {
      metricId,
      label,
      values,
      mean: mean(values),
      median: median(values),
      sd: null,
      range: null,
      band: "insufficient",
    };
  }
  const sd = stddev(values);
  const m = mean(values);
  const rel = m && sd != null && Math.abs(m) > 1e-6 ? sd / Math.abs(m) : sd;
  const band: ConsistencyRow["band"] =
    rel == null ? "insufficient" : rel < 0.08 ? "high" : rel < 0.18 ? "moderate" : "low";
  return {
    metricId,
    label,
    values,
    mean: m,
    median: median(values),
    sd,
    range: Math.max(...values) - Math.min(...values),
    band,
  };
}

export function compareThrows(a: StoredThrow, b: StoredThrow) {
  const ids = new Set(a.analysis.metrics.map((m) => m.id));
  return [...ids]
    .map((id) => {
      const ma = a.analysis.metrics.find((m) => m.id === id);
      const mb = b.analysis.metrics.find((m) => m.id === id);
      if (!ma || !mb || ma.value == null || mb.value == null) return null;
      return {
        id,
        label: ma.label,
        unit: ma.unit,
        a: ma.value,
        b: mb.value,
        delta: mb.value - ma.value,
        confidence: ma.confidence === "high" && mb.confidence === "high" ? "high" : "medium",
      };
    })
    .filter((x): x is NonNullable<typeof x> => x != null);
}
