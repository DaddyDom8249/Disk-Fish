import type { ConfidenceLevel, SequencingResult, ThrowPhase } from "./types";

const CHAIN = [
  { id: "plant", segment: "Lower body" },
  { id: "hip_rotation", segment: "Pelvis" },
  { id: "shoulder_rotation", segment: "Torso / shoulder" },
  { id: "elbow_extension", segment: "Elbow" },
  { id: "release", segment: "Wrist / disc" },
] as const;

export function analyzeSequencing(phases: ThrowPhase[]): SequencingResult {
  const events = CHAIN.map((c) => {
    const p = phases.find((x) => x.id === c.id);
    if (!p) return null;
    return {
      segment: c.segment,
      peakFrame: p.peakFrame,
      peakMs: p.peakMs,
      confidence: p.confidence,
    };
  }).filter((e): e is NonNullable<typeof e> => e != null);

  if (events.length < 3) {
    return {
      chain: events,
      progressesDistally: null,
      notes: "Not enough phase peaks to judge proximal-to-distal sequencing.",
      confidence: "low",
    };
  }

  let inversions = 0;
  for (let i = 1; i < events.length; i++) {
    if (events[i]!.peakMs + 8 < events[i - 1]!.peakMs) inversions += 1;
  }
  const progresses = inversions === 0;
  const conf: ConfidenceLevel = events.every((e) => e.confidence !== "low")
    ? inversions <= 1
      ? "high"
      : "medium"
    : "medium";

  return {
    chain: events,
    progressesDistally: progresses,
    notes: progresses
      ? "Peak timings generally progress from the lower body toward the throwing arm."
      : `Detected ${inversions} timing inversion${inversions === 1 ? "" : "s"} relative to a proximal-to-distal order. This is a difference from the common reference pattern — not automatically an error.`,
    confidence: conf,
  };
}
