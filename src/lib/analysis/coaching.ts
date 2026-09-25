import type { CoachingResult, MetricComparison, SequencingResult, ThrowTypeSpec } from "./types";
import { runRules } from "./rules.ts";
import { prioritize } from "./prioritize.ts";

export function buildCoaching(
  throwType: ThrowTypeSpec,
  comparisons: MetricComparison[],
  sequencing: SequencingResult,
): CoachingResult {
  const fired = runRules({ throwType, comparisons, sequencing });
  return prioritize(fired);
}

export function coachingFactsPayload(result: CoachingResult, throwType: ThrowTypeSpec) {
  const p = result.primaryFocus;
  return {
    throw_type: throwType.code,
    throw_label: throwType.label,
    primary_finding: p
      ? {
          id: p.id,
          title: p.title,
          confidence: p.confidence,
          likelihood: p.likelihood,
          what_we_saw: p.whatWeSaw,
          why_it_matters: p.whyItMatters,
          what_to_try: p.whatToTry,
          watch_for: p.watchFor,
          recheck: p.recheck,
          audit: p.audit,
        }
      : null,
    secondary_finding: result.secondaryFocus
      ? { id: result.secondaryFocus.id, title: result.secondaryFocus.title }
      : null,
    instruction:
      "Explain these structured findings in plain coaching language. Do not add, change, or invent any measurements, percentages, distances, or extra issues. Do not tell the athlete to copy a professional. Do not give medical advice.",
  };
}
