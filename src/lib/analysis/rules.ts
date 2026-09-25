import type {
  CoachingFinding,
  ConfidenceLevel,
  MetricComparison,
  SequencingResult,
  ThrowTypeSpec,
} from "./types";

interface RuleContext {
  throwType: ThrowTypeSpec;
  comparisons: MetricComparison[];
  sequencing: SequencingResult;
}

function cmp(ctx: RuleContext, id: string): MetricComparison | undefined {
  return ctx.comparisons.find((c) => c.metricId === id);
}

function confAnd(a: ConfidenceLevel, b: ConfidenceLevel): ConfidenceLevel {
  const rank = { low: 0, medium: 1, high: 2 };
  return rank[a] < rank[b] ? a : b;
}

function zAbs(c: MetricComparison | undefined): number {
  return c?.zScore != null ? Math.abs(c.zScore) : 0;
}

export interface FiredRule {
  finding: CoachingFinding;
  score: number;
}

export function runRules(ctx: RuleContext): FiredRule[] {
  const fired: FiredRule[] = [];
  const hipSh = cmp(ctx, "hip_to_shoulder_ms");
  const sep = cmp(ctx, "hip_shoulder_separation");
  const knee = cmp(ctx, "plant_knee_angle");
  const reach = cmp(ctx, "reach_back_distance");
  const stance = cmp(ctx, "stance_width");
  const follow = cmp(ctx, "follow_through_travel");
  const plantRel = cmp(ctx, "plant_to_release_ms");

  const appliesBh = ctx.throwType.family === "backhand" || ctx.throwType.family === "approach";

  if (hipSh?.userValue != null && hipSh.reference && hipSh.userValue < hipSh.reference.p25 - 4) {
    const z = zAbs(hipSh);
    fired.push({
      score: 0.95 * z * (hipSh.confidence === "high" ? 1 : 0.7),
      finding: {
        id: "early_upper_body_acceleration",
        title: "Upper body starts before the hips finish",
        band: "primary",
        likelihood: hipSh.confidence === "high" && z > 1.2 ? "likely_issue" : "potential_issue",
        confidence: hipSh.confidence,
        metricIds: ["hip_to_shoulder_ms"],
        ruleId: "EARLY_UPPER_BODY_ACCELERATION",
        whatWeSaw:
          "Your shoulders reach their peak rotation earlier relative to your hips than the selected reference sample.",
        whyItMatters:
          "Power in a backhand typically builds from the ground up. If the upper body starts turning before the hips have contributed, the arm tends to pull the disc rather than being accelerated by the body.",
        whatToTry: [
          "Keep the throwing arm relaxed through the plant and let the hips start the turn.",
          "Pause a beat after the plant before you think about the shoulder.",
        ],
        watchFor: "Shoulders staying quieter until after the plant foot is down.",
        recheck: "Hip → shoulder rotation timing (ms). A larger positive number means the hips peaked first.",
        audit: {
          userMeasurements: { hip_to_shoulder_ms: hipSh.userValue },
          reference: {
            hip_to_shoulder_ms: {
              p25: hipSh.reference.p25,
              p75: hipSh.reference.p75,
              median: hipSh.reference.median,
            },
          },
          triggeredBecause: `hip_to_shoulder_ms ${hipSh.userValue.toFixed(0)} ms is below the demo sample 25th percentile (${hipSh.reference.p25.toFixed(0)} ms).`,
        },
      },
    });
  }

  if (hipSh?.userValue != null && hipSh.reference && hipSh.userValue > hipSh.reference.p75 + 12) {
    fired.push({
      score: 0.55 * zAbs(hipSh),
      finding: {
        id: "delayed_shoulder",
        title: "Shoulders lag well behind the hips",
        band: "observe",
        likelihood: "difference",
        confidence: hipSh.confidence,
        metricIds: ["hip_to_shoulder_ms"],
        ruleId: "DELAYED_SHOULDER",
        whatWeSaw:
          "Peak shoulder rotation occurs later after peak hip rotation than in the selected reference sample.",
        whyItMatters:
          "Some delay is part of storing elastic energy. A very large delay can also mean the arm is late and then has to rush.",
        whatToTry: ["Feel the chest opening as the hips clear, without forcing the arm."],
        watchFor: "The throwing shoulder beginning to turn as the hips finish, not long after.",
        recheck: "Hip → shoulder rotation timing.",
        audit: {
          userMeasurements: { hip_to_shoulder_ms: hipSh.userValue },
          reference: {
            hip_to_shoulder_ms: {
              p25: hipSh.reference.p25,
              p75: hipSh.reference.p75,
              median: hipSh.reference.median,
            },
          },
          triggeredBecause: `hip_to_shoulder_ms ${hipSh.userValue.toFixed(0)} ms is above the demo 75th percentile.`,
        },
      },
    });
  }

  if (appliesBh && sep?.userValue != null && sep.reference && sep.userValue < sep.reference.p25) {
    fired.push({
      score: 0.9 * zAbs(sep) * (sep.confidence === "low" ? 0.5 : 0.85),
      finding: {
        id: "limited_separation",
        title: "Hips and shoulders turn together",
        band: "primary",
        likelihood: sep.confidence === "high" ? "potential_issue" : "difference",
        confidence: confAnd(sep.confidence, "medium"),
        metricIds: ["hip_shoulder_separation"],
        ruleId: "LIMITED_HIP_SHOULDER_SEPARATION",
        whatWeSaw:
          "The apparent angle between your hip line and shoulder line at reach-back is smaller than the observed demo range.",
        whyItMatters:
          "A larger hip-to-shoulder difference (the “X-factor”) is one way throwers store rotation. Turning as a single block often means the arm has to create more of the speed.",
        whatToTry: [
          "On the reach-back, let the hips start opening toward the target while the chest stays closed a moment longer.",
        ],
        watchFor: "The belt buckle facing the target slightly before the shoulders do.",
        recheck: "Hip-to-shoulder separation (apparent degrees).",
        audit: {
          userMeasurements: { hip_shoulder_separation: sep.userValue },
          reference: {
            hip_shoulder_separation: {
              p25: sep.reference.p25,
              p75: sep.reference.p75,
              median: sep.reference.median,
            },
          },
          triggeredBecause: `hip_shoulder_separation ${sep.userValue.toFixed(1)}° is below demo p25 ${sep.reference.p25.toFixed(1)}°.`,
        },
      },
    });
  }

  if (knee?.userValue != null && knee.reference && knee.userValue > knee.reference.p75 + 6) {
    fired.push({
      score: 0.86 * zAbs(knee),
      finding: {
        id: "straight_plant_leg",
        title: "Plant leg stays relatively straight",
        band: "primary",
        likelihood: "potential_issue",
        confidence: knee.confidence,
        metricIds: ["plant_knee_angle"],
        ruleId: "LIMITED_BRACE_FLEXION",
        whatWeSaw: "Your plant knee is more extended at plant than the observed demo range.",
        whyItMatters:
          "A braced but flexed front leg can stop the lower body so energy can travel up. A very straight plant often means the body rides over the front foot.",
        whatToTry: ["Think “soft then firm” in the front knee as the heel plants — athletic, not locked."],
        watchFor: "The front thigh stopping its forward travel as the disc comes through.",
        recheck: "Plant-leg knee angle at plant (smaller interior angle = more flexion).",
        audit: {
          userMeasurements: { plant_knee_angle: knee.userValue },
          reference: {
            plant_knee_angle: {
              p25: knee.reference.p25,
              p75: knee.reference.p75,
              median: knee.reference.median,
            },
          },
          triggeredBecause: `plant_knee_angle ${knee.userValue.toFixed(0)}° is above demo p75.`,
        },
      },
    });
  }

  if (knee?.userValue != null && knee.reference && knee.userValue < knee.reference.p25 - 8) {
    fired.push({
      score: 0.8 * zAbs(knee),
      finding: {
        id: "collapsed_brace",
        title: "Front knee collapses through the brace",
        band: "primary",
        likelihood: "potential_issue",
        confidence: knee.confidence,
        metricIds: ["plant_knee_angle"],
        ruleId: "COLLAPSED_PLANT_KNEE",
        whatWeSaw: "Your plant knee is more flexed at plant than the observed demo range.",
        whyItMatters:
          "Too much front-knee fold can dump the hips downward instead of rotating them. This analysis cannot say whether that is unsafe — only that it differs from the sample.",
        whatToTry: ["Plant into a strong athletic knee, then rotate over it rather than sitting into it."],
        watchFor: "The front hip staying tall as the shoulders come through.",
        recheck: "Plant-leg knee angle at plant.",
        audit: {
          userMeasurements: { plant_knee_angle: knee.userValue },
          reference: {
            plant_knee_angle: {
              p25: knee.reference.p25,
              p75: knee.reference.p75,
              median: knee.reference.median,
            },
          },
          triggeredBecause: `plant_knee_angle ${knee.userValue.toFixed(0)}° is below demo p25.`,
        },
      },
    });
  }

  if (appliesBh && reach?.userValue != null && reach.reference && reach.userValue < reach.reference.p25) {
    fired.push({
      score: 0.78 * zAbs(reach),
      finding: {
        id: "short_reach_back",
        title: "Reach-back is relatively short",
        band: "secondary",
        likelihood: "difference",
        confidence: reach.confidence,
        metricIds: ["reach_back_distance"],
        ruleId: "SHORT_REACH_BACK",
        whatWeSaw:
          "The throwing wrist stays closer to the torso at reach-back than the observed demo range (in shoulder widths).",
        whyItMatters:
          "A longer reach-back is one way to give the disc more time to accelerate. Compact throws can still be effective; this is a measured difference.",
        whatToTry: ["Keep the throwing hand wide and relaxed as you plant, rather than pulling it in early."],
        watchFor: "The disc staying behind you until the hips start to open.",
        recheck: "Reach-back distance (× shoulder width).",
        audit: {
          userMeasurements: { reach_back_distance: reach.userValue },
          reference: {
            reach_back_distance: {
              p25: reach.reference.p25,
              p75: reach.reference.p75,
              median: reach.reference.median,
            },
          },
          triggeredBecause: `reach_back_distance ${reach.userValue.toFixed(2)} × SW is below demo p25.`,
        },
      },
    });
  }

  if (stance?.userValue != null && stance.reference) {
    if (stance.userValue < stance.reference.p25) {
      fired.push({
        score: 0.5 * zAbs(stance),
        finding: {
          id: "narrow_stance",
          title: "Stance is relatively narrow at plant",
          band: "observe",
          likelihood: "difference",
          confidence: stance.confidence,
          metricIds: ["stance_width"],
          ruleId: "NARROW_STANCE",
          whatWeSaw: "Ankle-to-ankle distance at plant is below the observed demo range.",
          whyItMatters: "Width is highly individual. A narrow plant can be stable or can make bracing harder.",
          whatToTry: ["On the next session, notice whether a slightly wider plant feels more solid."],
          watchFor: "The front foot still catching the body rather than crossing past it.",
          recheck: "Stance width at plant.",
          audit: {
            userMeasurements: { stance_width: stance.userValue },
            reference: {
              stance_width: {
                p25: stance.reference.p25,
                p75: stance.reference.p75,
                median: stance.reference.median,
              },
            },
            triggeredBecause: `stance_width below demo p25.`,
          },
        },
      });
    } else if (stance.userValue > stance.reference.p75) {
      fired.push({
        score: 0.45 * zAbs(stance),
        finding: {
          id: "wide_stance",
          title: "Stance is relatively wide at plant",
          band: "observe",
          likelihood: "difference",
          confidence: stance.confidence,
          metricIds: ["stance_width"],
          ruleId: "WIDE_STANCE",
          whatWeSaw: "Ankle-to-ankle distance at plant is above the observed demo range.",
          whyItMatters: "A wide plant can be strong, or it can make it harder to rotate through.",
          whatToTry: ["If rotation feels blocked, try a slightly narrower plant on standstills."],
          watchFor: "Hips still able to turn after the front foot lands.",
          recheck: "Stance width at plant.",
          audit: {
            userMeasurements: { stance_width: stance.userValue },
            reference: {
              stance_width: {
                p25: stance.reference.p25,
                p75: stance.reference.p75,
                median: stance.reference.median,
              },
            },
            triggeredBecause: `stance_width above demo p75.`,
          },
        },
      });
    }
  }

  if (follow?.userValue != null && follow.reference && follow.userValue < follow.reference.p25) {
    fired.push({
      score: 0.4 * zAbs(follow),
      finding: {
        id: "short_follow_through",
        title: "Follow-through travel is short",
        band: "observe",
        likelihood: "difference",
        confidence: follow.confidence,
        metricIds: ["follow_through_travel"],
        ruleId: "SHORT_FOLLOW_THROUGH",
        whatWeSaw: "The throwing wrist travels less after release than the demo sample.",
        whyItMatters: "A short follow-through can mean the throw was decelerated early. It can also just be a compact style.",
        whatToTry: ["Let the throwing hand finish across the body instead of stopping at release."],
        watchFor: "The chest continuing to turn after the disc is gone.",
        recheck: "Follow-through travel.",
        audit: {
          userMeasurements: { follow_through_travel: follow.userValue },
          reference: {
            follow_through_travel: {
              p25: follow.reference.p25,
              p75: follow.reference.p75,
              median: follow.reference.median,
            },
          },
          triggeredBecause: "follow_through_travel below demo p25.",
        },
      },
    });
  }

  if (plantRel?.userValue != null && plantRel.reference && plantRel.userValue < plantRel.reference.p25 - 20) {
    fired.push({
      score: 0.6 * zAbs(plantRel),
      finding: {
        id: "rushed_from_plant",
        title: "Release comes quickly after plant",
        band: "secondary",
        likelihood: "potential_issue",
        confidence: plantRel.confidence,
        metricIds: ["plant_to_release_ms"],
        ruleId: "RUSHED_PLANT_TO_RELEASE",
        whatWeSaw: "The time from plant to release is shorter than the observed demo range.",
        whyItMatters: "A rushed window often pairs with the arm starting early. It is a timing observation, not a distance prediction.",
        whatToTry: ["Hit a firm plant, then let the hips go, then the arm — in that order."],
        watchFor: "A visible beat between the front foot landing and the arm whipping.",
        recheck: "Plant → release (ms).",
        audit: {
          userMeasurements: { plant_to_release_ms: plantRel.userValue },
          reference: {
            plant_to_release_ms: {
              p25: plantRel.reference.p25,
              p75: plantRel.reference.p75,
              median: plantRel.reference.median,
            },
          },
          triggeredBecause: "plant_to_release_ms below demo p25.",
        },
      },
    });
  }

  if (ctx.sequencing.progressesDistally === false) {
    fired.push({
      score: 0.7,
      finding: {
        id: "sequence_inversion",
        title: "Peak speeds do not travel up the chain",
        band: "secondary",
        likelihood: "potential_issue",
        confidence: ctx.sequencing.confidence,
        metricIds: ["hip_to_shoulder_ms"],
        ruleId: "SEQUENCE_INVERSION",
        whatWeSaw: ctx.sequencing.notes,
        whyItMatters:
          "Many effective throws show the lower body peaking before the torso, then the arm. An inversion is a difference from that pattern.",
        whatToTry: ["On standstills, start the throw by turning the belt buckle, not by pulling the disc."],
        watchFor: "Hips moving first, then chest, then arm.",
        recheck: "Sequencing timeline on the results player.",
        audit: {
          userMeasurements: {},
          reference: {},
          triggeredBecause: ctx.sequencing.notes,
        },
      },
    });
  }

  return fired.filter((f) => f.finding.confidence !== "low" || f.score > 1);
}
