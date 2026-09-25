import type { CoachingFinding, CoachingResult } from "./types";
import type { FiredRule } from "./rules";

const DISCLAIMER =
  "This analysis cannot determine whether a movement is medically safe. Consider working with a qualified throwing coach or healthcare professional if you are experiencing pain.";

export function prioritize(fired: FiredRule[]): CoachingResult {
  const sorted = [...fired].sort((a, b) => b.score - a.score);
  const unique: FiredRule[] = [];
  const seen = new Set<string>();
  for (const f of sorted) {
    if (seen.has(f.finding.id)) continue;
    seen.add(f.finding.id);
    unique.push(f);
  }

  const findings: CoachingFinding[] = unique.map((f, i) => ({
    ...f.finding,
    band: i === 0 ? "primary" : i === 1 && f.score > 0.45 ? "secondary" : "observe",
  }));

  const primary = findings.find((f) => f.band === "primary") ?? null;
  const secondary = findings.find((f) => f.band === "secondary") ?? null;
  const observe = findings.filter((f) => f.band === "observe");

  if (!primary) {
    return {
      whatWeSaw:
        "The measurable pattern in this throw sits close to the selected demo reference sample, or the remaining differences are too low-confidence to rank.",
      whyItMatters:
        "When nothing stands out, the useful next step is another throw from the same camera so we can look at consistency rather than inventing a cue.",
      primaryFocus: null,
      secondaryFocus: null,
      observe,
      llmText: null,
      llmUsed: false,
      medicalDisclaimer: DISCLAIMER,
    };
  }

  return {
    whatWeSaw: primary.whatWeSaw,
    whyItMatters: primary.whyItMatters,
    primaryFocus: primary,
    secondaryFocus: secondary,
    observe,
    llmText: null,
    llmUsed: false,
    medicalDisclaimer: DISCLAIMER,
  };
}
