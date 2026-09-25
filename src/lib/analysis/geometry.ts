import type { Landmark } from "./types";

export const VIS_MIN = 0.35;

export function isVisible(p: Landmark | null | undefined, min = VIS_MIN): p is Landmark {
  return !!p && Number.isFinite(p.x) && Number.isFinite(p.y) && p.visibility >= min;
}

export function dist(a: Landmark, b: Landmark): number {
  const dz = a.z != null && b.z != null ? a.z - b.z : 0;
  return Math.hypot(a.x - b.x, a.y - b.y, dz);
}

export function dist2(a: Landmark, b: Landmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function midpoint(a: Landmark, b: Landmark): Landmark {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    z: a.z != null && b.z != null ? (a.z + b.z) / 2 : null,
    visibility: Math.min(a.visibility, b.visibility),
  };
}

/** Interior angle at vertex B, in degrees (0–180). */
export function angleDeg(a: Landmark, b: Landmark, c: Landmark): number {
  const v1x = a.x - b.x;
  const v1y = a.y - b.y;
  const v2x = c.x - b.x;
  const v2y = c.y - b.y;
  const d1 = Math.hypot(v1x, v1y);
  const d2 = Math.hypot(v2x, v2y);
  if (d1 < 1e-8 || d2 < 1e-8) return NaN;
  const cos = Math.min(1, Math.max(-1, (v1x * v2x + v1y * v2y) / (d1 * d2)));
  return (Math.acos(cos) * 180) / Math.PI;
}

/** Segment heading in degrees: 0 = right, 90 = down (image coords). */
export function headingDeg(a: Landmark, b: Landmark): number {
  return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
}

export function angDiff(a: number, b: number): number {
  let d = a - b;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return d;
}

export function mean(values: number[]): number | null {
  const v = values.filter((n) => Number.isFinite(n));
  if (!v.length) return null;
  return v.reduce((s, n) => s + n, 0) / v.length;
}

export function median(values: number[]): number | null {
  const v = values.filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  if (!v.length) return null;
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid]! : (v[mid - 1]! + v[mid]!) / 2;
}

export function stddev(values: number[]): number | null {
  const v = values.filter((n) => Number.isFinite(n));
  if (v.length < 2) return v.length === 1 ? 0 : null;
  const m = v.reduce((s, n) => s + n, 0) / v.length;
  const var_ = v.reduce((s, n) => s + (n - m) ** 2, 0) / (v.length - 1);
  return Math.sqrt(var_);
}

export function percentile(values: number[], p: number): number | null {
  const v = values.filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  if (!v.length) return null;
  const i = (p / 100) * (v.length - 1);
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  if (lo === hi) return v[lo]!;
  return v[lo]! * (hi - i) + v[hi]! * (i - lo);
}

export function movingAverage(values: Array<number | null>, window = 5): Array<number | null> {
  const half = Math.floor(window / 2);
  return values.map((_, i) => {
    const slice: number[] = [];
    for (let k = i - half; k <= i + half; k++) {
      const v = values[k];
      if (v != null && Number.isFinite(v)) slice.push(v);
    }
    return mean(slice);
  });
}

export function finiteDiff(values: Array<number | null>, dt: number): Array<number | null> {
  return values.map((v, i) => {
    const prev = values[i - 1];
    const next = values[i + 1];
    if (v == null) return null;
    if (prev != null && next != null) return (next - prev) / (2 * dt);
    if (next != null) return (next - v) / dt;
    if (prev != null) return (v - prev) / dt;
    return 0;
  });
}

export function argMax(values: Array<number | null>): number | null {
  let best = -Infinity;
  let idx: number | null = null;
  values.forEach((v, i) => {
    if (v != null && v > best) {
      best = v;
      idx = i;
    }
  });
  return idx;
}

export function argMin(values: Array<number | null>): number | null {
  let best = Infinity;
  let idx: number | null = null;
  values.forEach((v, i) => {
    if (v != null && v < best) {
      best = v;
      idx = i;
    }
  });
  return idx;
}

export function smoothstep(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
