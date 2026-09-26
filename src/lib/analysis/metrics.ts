import type {
  BodyScale,
  ConfidenceLevel,
  MetricMeasurement,
  PoseFrame,
  ThrowPhase,
  ThrowTypeSpec,
  TimingInterval,
} from "./types";
import { angDiff, angleDeg, dist2, headingDeg, mean } from "./geometry.ts";
import { denom } from "./body-scale.ts";
import type { KinematicSeries } from "./phase-detector.ts";
import { jointAt } from "./smoothing.ts";

function m(partial: Omit<MetricMeasurement, "source"> & { source?: string }): MetricMeasurement {
  return {
    source: partial.source ?? "Video pose tracking (2D landmarks)",
    ...partial,
  };
}

function unavailable(
  id: string,
  label: string,
  category: MetricMeasurement["category"],
  reason: string,
  method: string,
): MetricMeasurement {
  return m({
    id,
    label,
    category,
    value: null,
    unit: "",
    classification: "unavailable",
    confidence: "low",
    confidenceReason: reason,
    method,
    unavailableReason: reason,
    normalized: false,
    limitations: "Not reliably measurable from this video.",
    howMeasured: method,
  });
}

function confFromVis(vis: number, extra = ""): { confidence: ConfidenceLevel; confidenceReason: string } {
  const reason = extra || `Mean landmark visibility ${(vis * 100).toFixed(0)}% on contributing frames.`;
  if (vis >= 0.8) return { confidence: "high", confidenceReason: reason };
  if (vis >= 0.55) return { confidence: "medium", confidenceReason: reason };
  return { confidence: "low", confidenceReason: reason };
}

function visAt(frame: PoseFrame | undefined, joints: Array<Parameters<typeof jointAt>[1]>): number {
  if (!frame) return 0;
  const vals = joints.map((j) => frame.landmarks[j]?.visibility ?? 0);
  return (mean(vals) ?? 0);
}

export function computeMetrics(
  frames: PoseFrame[],
  throwType: ThrowTypeSpec,
  phases: ThrowPhase[],
  kin: KinematicSeries,
  scale: BodyScale,
): MetricMeasurement[] {
  const out: MetricMeasurement[] = [];
  const plantPhase = phases.find((p) => p.id === "plant");
  const releasePhase = phases.find((p) => p.id === "release");
  const rbPhase = phases.find((p) => p.id === "reach_back");
  const hipPhase = phases.find((p) => p.id === "hip_rotation");
  const shPhase = phases.find((p) => p.id === "shoulder_rotation");
  const ftPhase = phases.find((p) => p.id === "follow_through");

  const plantFrame = plantPhase ? frames.find((f) => f.frame === plantPhase.peakFrame) : null;
  const releaseFrame = releasePhase ? frames.find((f) => f.frame === releasePhase.peakFrame) : null;
  const rbFrame = rbPhase ? frames.find((f) => f.frame === rbPhase.peakFrame) : null;
  const setupFrame = frames[Math.min(2, frames.length - 1)];

  const plantAnkle = throwType.plantFoot === "left" ? "left_ankle" : "right_ankle";
  const rearAnkle = throwType.plantFoot === "left" ? "right_ankle" : "left_ankle";
  const plantKnee = throwType.plantFoot === "left" ? "left_knee" : "right_knee";
  const plantHip = throwType.plantFoot === "left" ? "left_hip" : "right_hip";
  const throwSh = throwType.throwingArm === "right" ? "right_shoulder" : "left_shoulder";
  const throwEl = throwType.throwingArm === "right" ? "right_elbow" : "left_elbow";
  const throwWr = throwType.throwingArm === "right" ? "right_wrist" : "left_wrist";

  const sw = denom(scale, "shoulder");

  // Stance width at plant
  if (plantFrame) {
    const la = jointAt(plantFrame, "left_ankle");
    const ra = jointAt(plantFrame, "right_ankle");
    if (la && ra && sw) {
      const v = dist2(la, ra) / sw;
      const c = confFromVis(visAt(plantFrame, ["left_ankle", "right_ankle", "left_shoulder", "right_shoulder"]));
      out.push(
        m({
          id: "stance_width",
          label: "Stance width",
          category: "lower_body",
          value: v,
          unit: "× shoulder width",
          classification: "measured",
          ...c,
          method: "Ankle-to-ankle distance at plant, divided by mean shoulder width.",
          frame: plantFrame.frame,
          timestampMs: plantFrame.timestampMs,
          normalized: true,
          limitations: "2D projection. Camera not perpendicular will compress width.",
          howMeasured: "Distance between visible ankles at the plant frame, normalized by shoulder width.",
        }),
      );
    } else {
      out.push(
        unavailable(
          "stance_width",
          "Stance width",
          "lower_body",
          "Ankles or shoulders not visible at plant.",
          "Requires both ankles and both shoulders at plant.",
        ),
      );
    }
  }

  // Plant-foot angle (foot vector vs throw direction / horizontal)
  if (plantFrame) {
    const ankle = jointAt(plantFrame, plantAnkle);
    const foot = jointAt(plantFrame, throwType.plantFoot === "left" ? "left_foot" : "right_foot");
    if (ankle && foot) {
      const heading = headingDeg(ankle, foot);
      const v = Math.abs(heading);
      const c = confFromVis(visAt(plantFrame, [plantAnkle, throwType.plantFoot === "left" ? "left_foot" : "right_foot"]));
      out.push(
        m({
          id: "plant_foot_angle",
          label: "Plant-foot angle",
          category: "lower_body",
          value: v,
          unit: "deg (image)",
          classification: "estimated",
          ...c,
          method: "Heading of ankle→foot index relative to the image horizontal.",
          frame: plantFrame.frame,
          timestampMs: plantFrame.timestampMs,
          normalized: false,
          limitations: "Apparent 2D angle only. True foot progression angle needs a top-down or calibrated view.",
          howMeasured: "Angle of the plant foot segment in the camera plane at plant.",
        }),
      );
    } else {
      out.push(
        unavailable("plant_foot_angle", "Plant-foot angle", "lower_body", "Plant foot landmarks not visible.", "Ankle and foot index required."),
      );
    }
  }

  // Plant ankle separation at the plant frame
  if (plantFrame && setupFrame && sw) {
    const p = jointAt(plantFrame, plantAnkle);
    const r = jointAt(plantFrame, rearAnkle);
    if (p && r) {
      const v = Math.abs(p.x - r.x) / sw;
      out.push(
        m({
          id: "stride_length",
          label: "Plant ankle separation",
          category: "lower_body",
          value: v,
          unit: "× shoulder width",
          classification: "measured",
          ...confFromVis(visAt(plantFrame, [plantAnkle, rearAnkle])),
          method: "Horizontal separation between plant and rear ankles at plant, normalized by shoulder width.",
          frame: plantFrame.frame,
          timestampMs: plantFrame.timestampMs,
          normalized: true,
          limitations: "Uses camera-horizontal as a proxy for the throwing plane.",
          howMeasured: "Horizontal distance between the plant and rear ankles at the plant frame.",
        }),
      );
    } else {
      out.push(unavailable("stride_length", "Plant ankle separation", "lower_body", "Ankles not visible at plant.", "Both ankles required."));
    }
  }

  // Plant knee angle
  if (plantFrame) {
    const h = jointAt(plantFrame, plantHip);
    const k = jointAt(plantFrame, plantKnee);
    const a = jointAt(plantFrame, plantAnkle);
    if (h && k && a) {
      const v = angleDeg(h, k, a);
      out.push(
        m({
          id: "plant_knee_angle",
          label: "Plant-leg knee angle",
          category: "lower_body",
          value: v,
          unit: "deg",
          classification: "measured",
          ...confFromVis(visAt(plantFrame, [plantHip, plantKnee, plantAnkle])),
          method: "Interior angle hip–knee–ankle at plant.",
          frame: plantFrame.frame,
          timestampMs: plantFrame.timestampMs,
          normalized: false,
          limitations: "Camera foreshortening changes apparent flexion.",
          howMeasured: "Angle at the plant knee using hip, knee, and ankle.",
        }),
      );
    } else {
      out.push(unavailable("plant_knee_angle", "Plant-leg knee angle", "lower_body", "Plant hip/knee/ankle not visible.", "Three plant-leg joints required."));
    }
  }

  // Hip / shoulder apparent orientation and separation at reach-back / plant
  const sepFrame = rbFrame ?? plantFrame;
  if (sepFrame) {
    const lh = jointAt(sepFrame, "left_hip");
    const rh = jointAt(sepFrame, "right_hip");
    const ls = jointAt(sepFrame, "left_shoulder");
    const rs = jointAt(sepFrame, "right_shoulder");
    if (lh && rh && ls && rs) {
      const hipH = headingDeg(lh, rh);
      const shH = headingDeg(ls, rs);
      const sep = Math.abs(angDiff(hipH, shH));
      const c = confFromVis(visAt(sepFrame, ["left_hip", "right_hip", "left_shoulder", "right_shoulder"]));
      out.push(
        m({
          id: "pelvis_orientation",
          label: "Pelvis orientation (apparent)",
          category: "pelvis",
          value: hipH,
          unit: "deg (image)",
          classification: "estimated",
          ...c,
          method: "Heading of the left–right hip line.",
          frame: sepFrame.frame,
          timestampMs: sepFrame.timestampMs,
          normalized: false,
          limitations: "Monocular proxy for pelvis yaw. Not a laboratory Euler angle.",
          howMeasured: "Angle of the hip line in the camera plane.",
        }),
      );
      out.push(
        m({
          id: "shoulder_orientation",
          label: "Shoulder orientation (apparent)",
          category: "torso",
          value: shH,
          unit: "deg (image)",
          classification: "estimated",
          ...c,
          method: "Heading of the left–right shoulder line.",
          frame: sepFrame.frame,
          timestampMs: sepFrame.timestampMs,
          normalized: false,
          limitations: "Monocular proxy for shoulder yaw.",
          howMeasured: "Angle of the shoulder line in the camera plane.",
        }),
      );
      out.push(
        m({
          id: "hip_shoulder_separation",
          label: "Hip-to-shoulder separation",
          category: "torso",
          value: sep,
          unit: "deg (apparent)",
          classification: "estimated",
          ...c,
          method: "Absolute difference between hip-line and shoulder-line headings.",
          frame: sepFrame.frame,
          timestampMs: sepFrame.timestampMs,
          normalized: false,
          limitations: "2D projection of a 3D X-factor. Magnitude is camera-dependent.",
          howMeasured: "Difference between pelvis and shoulder line angles at reach-back/plant.",
        }),
      );
    } else {
      out.push(unavailable("hip_shoulder_separation", "Hip-to-shoulder separation", "torso", "Hips or shoulders not visible.", "Both hips and both shoulders required."));
    }
  }

  // Torso tilt (shoulder midpoint vs hip midpoint)
  if (plantFrame) {
    const lh = jointAt(plantFrame, "left_hip");
    const rh = jointAt(plantFrame, "right_hip");
    const ls = jointAt(plantFrame, "left_shoulder");
    const rs = jointAt(plantFrame, "right_shoulder");
    if (lh && rh && ls && rs) {
      const hip = { x: (lh.x + rh.x) / 2, y: (lh.y + rh.y) / 2, z: null, visibility: 1 };
      const sh = { x: (ls.x + rs.x) / 2, y: (ls.y + rs.y) / 2, z: null, visibility: 1 };
      const tilt = headingDeg(hip, sh) + 90; // 0 = upright in image y-down
      out.push(
        m({
          id: "torso_tilt",
          label: "Torso tilt",
          category: "torso",
          value: tilt,
          unit: "deg from vertical (image)",
          classification: "estimated",
          ...confFromVis(visAt(plantFrame, ["left_hip", "right_hip", "left_shoulder", "right_shoulder"])),
          method: "Heading of hip-midpoint → shoulder-midpoint vs image vertical.",
          frame: plantFrame.frame,
          timestampMs: plantFrame.timestampMs,
          normalized: false,
          limitations: "Lean toward/away from camera is not visible as tilt.",
          howMeasured: "Spine proxy using mid-hip to mid-shoulder.",
        }),
      );
    }
  }

  // Elbow angle at reach-back and at release
  for (const [id, label, fr] of [
    ["elbow_angle_reach_back", "Elbow angle at reach-back", rbFrame],
    ["elbow_angle_release", "Elbow angle at release", releaseFrame],
  ] as const) {
    if (!fr) {
      out.push(unavailable(id, label, "throwing_arm", "Phase frame not detected.", "Requires reach-back or release frame."));
      continue;
    }
    const s = jointAt(fr, throwSh);
    const e = jointAt(fr, throwEl);
    const w = jointAt(fr, throwWr);
    if (s && e && w) {
      out.push(
        m({
          id,
          label,
          category: "throwing_arm",
          value: angleDeg(s, e, w),
          unit: "deg",
          classification: "measured",
          ...confFromVis(visAt(fr, [throwSh, throwEl, throwWr])),
          method: "Interior angle shoulder–elbow–wrist.",
          frame: fr.frame,
          timestampMs: fr.timestampMs,
          normalized: false,
          limitations: "If the arm points at the camera, the elbow looks more flexed than it is.",
          howMeasured: "Angle at the throwing elbow on the named phase frame.",
        }),
      );
    } else {
      out.push(unavailable(id, label, "throwing_arm", "Throwing arm joints not visible.", "Shoulder, elbow, and wrist required."));
    }
  }

  // Reach-back distance
  if (rbFrame && sw) {
    const w = jointAt(rbFrame, throwWr);
    const lh = jointAt(rbFrame, "left_hip");
    const rh = jointAt(rbFrame, "right_hip");
    if (w && lh && rh) {
      const mid = { x: (lh.x + rh.x) / 2, y: (lh.y + rh.y) / 2, z: null, visibility: 1 };
      const v = dist2(w, mid) / sw;
      out.push(
        m({
          id: "reach_back_distance",
          label: "Reach-back distance",
          category: "throwing_arm",
          value: v,
          unit: "× shoulder width",
          classification: "measured",
          ...confFromVis(visAt(rbFrame, [throwWr, "left_hip", "right_hip"])),
          method: "Throwing-wrist to mid-hip distance at maximum reach-back, / shoulder width.",
          frame: rbFrame.frame,
          timestampMs: rbFrame.timestampMs,
          normalized: true,
          limitations: "Depth of the reach-back (away from camera) is under-counted.",
          howMeasured: "Wrist-to-torso distance at the reach-back peak, in shoulder widths.",
        }),
      );
    } else {
      out.push(unavailable("reach_back_distance", "Reach-back distance", "throwing_arm", "Wrist or hips not visible at reach-back.", "Wrist and hips required."));
    }
  }

  // Arm angle at reach-back (shoulder to wrist vs torso)
  if (rbFrame) {
    const s = jointAt(rbFrame, throwSh);
    const w = jointAt(rbFrame, throwWr);
    const lh = jointAt(rbFrame, "left_hip");
    const rh = jointAt(rbFrame, "right_hip");
    if (s && w && lh && rh) {
      const midHip = { x: (lh.x + rh.x) / 2, y: (lh.y + rh.y) / 2, z: null, visibility: 1 };
      const v = angleDeg(w, s, midHip);
      out.push(
        m({
          id: "arm_angle_reach_back",
          label: "Throwing-arm angle at reach-back",
          category: "throwing_arm",
          value: v,
          unit: "deg",
          classification: "measured",
          ...confFromVis(visAt(rbFrame, [throwSh, throwWr, "left_hip", "right_hip"])),
          method: "Angle wrist–shoulder–mid-hip at reach-back.",
          frame: rbFrame.frame,
          timestampMs: rbFrame.timestampMs,
          normalized: false,
          limitations: "2D angle in the camera plane.",
          howMeasured: "Opening between the throwing arm and the torso proxy.",
        }),
      );
    }
  }

  // Release point relative to body
  if (releaseFrame && scale.height) {
    const w = jointAt(releaseFrame, throwWr);
    const head = jointAt(releaseFrame, "head");
    const la = jointAt(releaseFrame, "left_ankle");
    const ra = jointAt(releaseFrame, "right_ankle");
    if (w && head && (la || ra)) {
      const footY = la && ra ? (la.y + ra.y) / 2 : (la ?? ra)!.y;
      const heightPx = Math.abs(footY - head.y) || 1;
      const relH = (footY - w.y) / heightPx;
      out.push(
        m({
          id: "release_height",
          label: "Release height",
          category: "release",
          value: relH,
          unit: "× body height (image)",
          classification: "estimated",
          ...confFromVis(visAt(releaseFrame, [throwWr, "head", "left_ankle", "right_ankle"])),
          method: "Throwing-wrist height above the feet divided by head-to-foot height at release.",
          frame: releaseFrame.frame,
          timestampMs: releaseFrame.timestampMs,
          normalized: true,
          limitations: "Not metres. Camera tilt changes the ratio.",
          howMeasured: "Wrist vertical position as a fraction of apparent stature.",
        }),
      );
    } else {
      out.push(unavailable("release_height", "Release height", "release", "Wrist, head, or feet not visible at release.", "Needs wrist and a vertical body reference."));
    }
  }

  if (releaseFrame && sw) {
    const w = jointAt(releaseFrame, throwWr);
    const lh = jointAt(releaseFrame, "left_hip");
    const rh = jointAt(releaseFrame, "right_hip");
    if (w && lh && rh) {
      const mid = (lh.x + rh.x) / 2;
      const v = ((w.x - mid) * kin.throwDirection) / sw;
      out.push(
        m({
          id: "release_forward",
          label: "Release point (forward)",
          category: "release",
          value: v,
          unit: "× shoulder width",
          classification: "estimated",
          ...confFromVis(visAt(releaseFrame, [throwWr, "left_hip", "right_hip"])),
          method: "Horizontal wrist position relative to mid-hip, signed along inferred throw direction.",
          frame: releaseFrame.frame,
          timestampMs: releaseFrame.timestampMs,
          normalized: true,
          limitations: "Throw direction is inferred from wrist travel.",
          howMeasured: "How far in front of the hips the wrist is at peak wrist speed.",
        }),
      );
    }
  }

  // Release timing as % of throw (setup→follow-through)
  const t0 = frames[0]?.timestampMs ?? 0;
  const t1 = frames[frames.length - 1]?.timestampMs ?? 1;
  const span = Math.max(1, t1 - t0);
  if (releasePhase) {
    out.push(
      m({
        id: "release_timing_pct",
        label: "Release timing",
        category: "timing",
        value: ((releasePhase.peakMs - t0) / span) * 100,
        unit: "% of clip",
        classification: "measured",
        confidence: releasePhase.confidence,
        confidenceReason: releasePhase.confidenceReason,
        method: "Release peak timestamp as a percentage of the analyzed window.",
        frame: releasePhase.peakFrame,
        timestampMs: releasePhase.peakMs,
        normalized: true,
        limitations: "Clip-relative, not a universal throw-cycle percentage unless the clip is trimmed to the throw.",
        howMeasured: "When peak throwing-wrist speed occurs in the analyzed video.",
      }),
    );
  }

  // Follow-through length
  if (ftPhase && releasePhase && sw) {
    const a = frames.find((f) => f.frame === releasePhase.peakFrame);
    const b = frames.find((f) => f.frame === ftPhase.endFrame);
    if (a && b) {
      const wa = jointAt(a, throwWr);
      const wb = jointAt(b, throwWr);
      if (wa && wb) {
        out.push(
          m({
            id: "follow_through_travel",
            label: "Follow-through travel",
            category: "throwing_arm",
            value: dist2(wa, wb) / sw,
            unit: "× shoulder width",
            classification: "measured",
            ...confFromVis(Math.min(visAt(a, [throwWr]), visAt(b, [throwWr]))),
            method: "Throwing-wrist path length from release to end of follow-through.",
            frame: b.frame,
            timestampMs: b.timestampMs,
            normalized: true,
            limitations: "Straight-line endpoint distance, not the full curve.",
            howMeasured: "How far the throwing wrist travels after release.",
          }),
        );
      }
    }
  }

  // Timing intervals
  const hipMs = hipPhase?.peakMs ?? null;
  const shMs = shPhase?.peakMs ?? null;
  const plantMs = plantPhase?.peakMs ?? null;
  const relMs = releasePhase?.peakMs ?? null;

  if (plantMs != null && hipMs != null) {
    out.push(
      m({
        id: "plant_to_hip_ms",
        label: "Plant → hip rotation",
        category: "timing",
        value: hipMs - plantMs,
        unit: "ms",
        classification: "measured",
        confidence: plantPhase!.confidence === "low" || hipPhase!.confidence === "low" ? "low" : "medium",
        confidenceReason: "Interval between detected plant and peak hip-line speed.",
        method: "Difference of phase peak timestamps.",
        timestampMs: hipMs,
        normalized: false,
        limitations: "Phase peaks are kinematic estimates, not force-plate events.",
        howMeasured: "Milliseconds from plant peak to hip-rotation peak.",
      }),
    );
  }
  if (hipMs != null && shMs != null) {
    out.push(
      m({
        id: "hip_to_shoulder_ms",
        label: "Hip → shoulder rotation",
        category: "timing",
        value: shMs - hipMs,
        unit: "ms",
        classification: "measured",
        confidence: hipPhase!.confidence === "high" && shPhase!.confidence !== "low" ? "high" : "medium",
        confidenceReason: "Interval between peak hip-line and shoulder-line angular speed.",
        method: "Difference of phase peak timestamps.",
        timestampMs: shMs,
        normalized: false,
        limitations: "Apparent 2D angular speed, not 3D segmental velocity.",
        howMeasured: "Milliseconds from hip-rotation peak to shoulder-rotation peak. Negative means the shoulders peaked first.",
      }),
    );
  }
  if (shMs != null && relMs != null) {
    out.push(
      m({
        id: "shoulder_to_release_ms",
        label: "Shoulder rotation → release",
        category: "timing",
        value: relMs - shMs,
        unit: "ms",
        classification: "measured",
        confidence: "medium",
        confidenceReason: "Interval between peak shoulder-line speed and peak wrist speed.",
        method: "Difference of phase peak timestamps.",
        timestampMs: relMs,
        normalized: false,
        limitations: "Release is defined as peak wrist speed, not disc leave.",
        howMeasured: "Milliseconds from shoulder-rotation peak to release.",
      }),
    );
  }
  if (plantMs != null && relMs != null) {
    out.push(
      m({
        id: "plant_to_release_ms",
        label: "Plant → release",
        category: "timing",
        value: relMs - plantMs,
        unit: "ms",
        classification: "measured",
        confidence: "medium",
        confidenceReason: "Interval between plant and peak wrist speed.",
        method: "Difference of phase peak timestamps.",
        timestampMs: relMs,
        normalized: false,
        limitations: "Depends on plant and release detection quality.",
        howMeasured: "Milliseconds from plant to release.",
      }),
    );
  }

  // Disc metrics — unavailable unless we actually track a disc (we don't in MVP)
  out.push(
    unavailable(
      "disc_spin",
      "Disc spin",
      "disc",
      "Disc spin is unavailable from this video. The pipeline does not track disc rotation.",
      "Would require high-frame-rate disc tracking.",
    ),
  );
  out.push(
    unavailable(
      "release_speed",
      "Release speed",
      "disc",
      "True disc speed is unavailable from monocular video without scale and disc tracking.",
      "Would require radar, a known scale, or a disc detector plus calibrated cameras.",
    ),
  );
  out.push(
    unavailable(
      "hyzer_angle",
      "Hyzer / anhyzer",
      "disc",
      "Disc orientation is not tracked in this version.",
      "Would require a disc detector with visible flight plate.",
    ),
  );

  return out;
}

export function computeTimings(phases: ThrowPhase[], spanMs: number): TimingInterval[] {
  const peak = (id: string) => phases.find((p) => p.id === id)?.peakMs ?? null;
  const pairs: Array<[string, string, string]> = [
    ["plant", "hip_rotation", "plant_to_hip"],
    ["hip_rotation", "shoulder_rotation", "hip_to_shoulder"],
    ["shoulder_rotation", "elbow_extension", "shoulder_to_elbow"],
    ["elbow_extension", "release", "elbow_to_release"],
    ["plant", "release", "plant_to_release"],
  ];
  return pairs.map(([from, to, id]) => {
    const a = peak(from);
    const b = peak(to);
    const ms = a != null && b != null ? b - a : null;
    return {
      id,
      from,
      to,
      ms,
      pctOfThrow: ms != null && spanMs > 0 ? (ms / spanMs) * 100 : null,
      classification: ms == null ? "unavailable" : "measured",
      confidence: ms == null ? "low" : "medium",
    } satisfies TimingInterval;
  });
}

export function overallConfidence(metrics: MetricMeasurement[]): {
  level: ConfidenceLevel;
  reason: string;
} {
  const usable = metrics.filter((m) => m.classification !== "unavailable");
  const high = usable.filter((m) => m.confidence === "high").length;
  const ratio = usable.length ? high / usable.length : 0;
  if (ratio >= 0.55) {
    return { level: "high", reason: `${high} of ${usable.length} usable metrics have high landmark visibility.` };
  }
  if (ratio >= 0.3) {
    return { level: "medium", reason: `Landmark visibility supports medium confidence on ${high} metrics.` };
  }
  return { level: "low", reason: "Many contributing joints were occluded or low-visibility." };
}
