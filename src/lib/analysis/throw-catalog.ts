import type { Footwork, PhaseId, ThrowFamily, ThrowHand, ThrowIntent, ThrowTypeSpec } from "./types";

const BACKHAND_PHASES: PhaseId[] = [
  "setup",
  "initial_movement",
  "x_step",
  "plant_preparation",
  "plant",
  "brace",
  "reach_back",
  "transition",
  "hip_rotation",
  "shoulder_rotation",
  "arm_acceleration",
  "elbow_extension",
  "release",
  "follow_through",
  "recovery",
];

const STANDSTILL_PHASES: PhaseId[] = BACKHAND_PHASES.filter(
  (p) => p !== "x_step" && p !== "initial_movement",
);

const PUTT_PHASES: PhaseId[] = [
  "setup",
  "reach_back",
  "transition",
  "arm_acceleration",
  "release",
  "follow_through",
];

export const CAMERA_ANGLES: { id: import("./types").CameraAngle; label: string; hint: string }[] = [
  { id: "off-arm-side", label: "Off-arm side", hint: "Best default. Camera on the glove side so the throwing arm’s reach-back is visible." },
  { id: "throwing-side", label: "Throwing-arm side", hint: "Shows the throwing arm clearly; plant foot may be harder to see." },
  { id: "rear-side", label: "Rear-side", hint: "Useful for weight transfer and hip rotation." },
  { id: "rear", label: "Behind", hint: "Shows line and lean; poor for reach-back distance." },
  { id: "front", label: "Front", hint: "Poor for sequencing. Use only as a supplement." },
  { id: "unknown", label: "Not sure", hint: "We’ll infer throw direction from wrist travel." },
];

function spec(partial: Omit<ThrowTypeSpec, "id"> & { id?: string }): ThrowTypeSpec {
  const id =
    partial.id ??
    `${partial.code}-${partial.footwork}-${partial.intent}`.toLowerCase();
  return { ...partial, id };
}

export const THROW_TYPES: ThrowTypeSpec[] = [
  spec({
    code: "RHBH",
    label: "Right-hand backhand · X-step · Distance",
    hand: "right",
    family: "backhand",
    footwork: "x-step",
    intent: "distance",
    plantFoot: "left",
    throwingArm: "right",
    phases: BACKHAND_PHASES,
  }),
  spec({
    code: "RHBH",
    label: "Right-hand backhand · X-step · Fairway",
    hand: "right",
    family: "backhand",
    footwork: "x-step",
    intent: "control",
    plantFoot: "left",
    throwingArm: "right",
    phases: BACKHAND_PHASES,
  }),
  spec({
    code: "RHBH",
    label: "Right-hand backhand · One-step",
    hand: "right",
    family: "backhand",
    footwork: "one-step",
    intent: "control",
    plantFoot: "left",
    throwingArm: "right",
    phases: STANDSTILL_PHASES,
  }),
  spec({
    code: "RHBH",
    label: "Right-hand backhand · Standstill",
    hand: "right",
    family: "backhand",
    footwork: "standstill",
    intent: "control",
    plantFoot: "left",
    throwingArm: "right",
    phases: STANDSTILL_PHASES,
  }),
  spec({
    code: "LHBH",
    label: "Left-hand backhand · X-step · Distance",
    hand: "left",
    family: "backhand",
    footwork: "x-step",
    intent: "distance",
    plantFoot: "right",
    throwingArm: "left",
    phases: BACKHAND_PHASES,
  }),
  spec({
    code: "LHBH",
    label: "Left-hand backhand · Standstill",
    hand: "left",
    family: "backhand",
    footwork: "standstill",
    intent: "control",
    plantFoot: "right",
    throwingArm: "left",
    phases: STANDSTILL_PHASES,
  }),
  spec({
    code: "RHFH",
    label: "Right-hand forehand · X-step · Distance",
    hand: "right",
    family: "forehand",
    footwork: "x-step",
    intent: "distance",
    plantFoot: "left",
    throwingArm: "right",
    phases: BACKHAND_PHASES,
  }),
  spec({
    code: "RHFH",
    label: "Right-hand forehand · Standstill",
    hand: "right",
    family: "forehand",
    footwork: "standstill",
    intent: "control",
    plantFoot: "left",
    throwingArm: "right",
    phases: STANDSTILL_PHASES,
  }),
  spec({
    code: "LHFH",
    label: "Left-hand forehand · X-step · Distance",
    hand: "left",
    family: "forehand",
    footwork: "x-step",
    intent: "distance",
    plantFoot: "right",
    throwingArm: "left",
    phases: BACKHAND_PHASES,
  }),
  spec({
    id: "rh-putt",
    code: "PUTT",
    label: "Putting · Right-hand",
    hand: "right",
    family: "putting",
    footwork: "standstill",
    intent: "putting",
    plantFoot: "left",
    throwingArm: "right",
    phases: PUTT_PHASES,
  }),
  spec({
    id: "lh-putt",
    code: "PUTT",
    label: "Putting · Left-hand",
    hand: "left",
    family: "putting",
    footwork: "standstill",
    intent: "putting",
    plantFoot: "right",
    throwingArm: "left",
    phases: PUTT_PHASES,
  }),
  spec({
    id: "rh-approach",
    code: "APPROACH",
    label: "Approach · Right-hand backhand",
    hand: "right",
    family: "approach",
    footwork: "standstill",
    intent: "approach",
    plantFoot: "left",
    throwingArm: "right",
    phases: STANDSTILL_PHASES,
  }),
  spec({
    id: "lh-approach",
    code: "APPROACH",
    label: "Approach · Left-hand backhand",
    hand: "left",
    family: "approach",
    footwork: "standstill",
    intent: "approach",
    plantFoot: "right",
    throwingArm: "left",
    phases: STANDSTILL_PHASES,
  }),
];

export const DEFAULT_THROW_TYPE = THROW_TYPES[0]!;

export function filterThrowTypes(opts: {
  hand?: ThrowHand;
  family?: ThrowFamily;
  footwork?: Footwork;
  intent?: ThrowIntent;
}): ThrowTypeSpec[] {
  return THROW_TYPES.filter((t) => {
    if (opts.hand && t.hand !== opts.hand) return false;
    if (opts.family && t.family !== opts.family) return false;
    if (opts.footwork && t.footwork !== opts.footwork) return false;
    if (opts.intent && t.intent !== opts.intent) return false;
    return true;
  });
}

export function throwTypeById(id: string): ThrowTypeSpec | undefined {
  return THROW_TYPES.find((t) => t.id === id);
}

export const PHASE_LABELS: Record<PhaseId, string> = {
  setup: "Setup",
  initial_movement: "Initial move",
  x_step: "X-step",
  cross_step: "Cross-step",
  plant_preparation: "Plant prep",
  plant: "Plant",
  brace: "Brace",
  reach_back: "Reach-back",
  transition: "Transition",
  hip_rotation: "Hip rotation",
  shoulder_rotation: "Shoulder rotation",
  arm_acceleration: "Arm acceleration",
  elbow_extension: "Elbow extension",
  wrist_acceleration: "Wrist acceleration",
  release: "Release",
  follow_through: "Follow-through",
  recovery: "Recovery",
};

export const FUTURE_THROW_TYPES = ["Roller", "Tomahawk", "Thumber", "Grenade", "Utility"] as const;
