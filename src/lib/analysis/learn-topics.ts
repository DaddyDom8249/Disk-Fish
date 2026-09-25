export interface LearnTopic {
  id: string;
  title: string;
  kicker: string;
  body: string[];
  cue: string;
}

export const LEARN_TOPICS: LearnTopic[] = [
  {
    id: "plant",
    title: "Plant",
    kicker: "The front foot stops the lower body.",
    body: [
      "The plant is the moment the lead foot lands and the lower body has something to push against. In a right-hand backhand that is usually the left foot.",
      "This app marks plant as the frame where the lead ankle slows the most before release. That is a kinematic estimate, not a force-plate event.",
    ],
    cue: "The front foot should look like it caught your weight — not like it is still sliding.",
  },
  {
    id: "brace",
    title: "Brace",
    kicker: "A firm front leg lets rotation travel up.",
    body: [
      "Brace is the plant leg resisting collapse so the hips can rotate instead of the whole body sliding forward.",
      "A locked-straight knee and a collapsing knee can both show up as differences from a reference sample. Neither is automatically “wrong.”",
    ],
    cue: "Athletic front knee — ready, not rigid, not sitting.",
  },
  {
    id: "hip-rotation",
    title: "Hip rotation",
    kicker: "The pelvis often starts the throwing turn.",
    body: [
      "We estimate hip rotation from the 2D hip line in the camera. That is a proxy for pelvis yaw, not a laboratory angle.",
      "Peak hip-line speed before peak shoulder-line speed is a common pattern in the demo reference sample.",
    ],
    cue: "Belt buckle turning toward the target while the throwing arm is still long.",
  },
  {
    id: "shoulder-rotation",
    title: "Shoulder rotation",
    kicker: "The torso follows the hips — it does not have to copy them.",
    body: [
      "Shoulder rotation is estimated from the shoulder line. If it peaks before the hips, the upper body is leading.",
      "Professionals do not all look the same here. The useful question is whether your sequence is repeatable and producing the flight you want.",
    ],
    cue: "Chest opens after the hips, not as the first move.",
  },
  {
    id: "reach-back",
    title: "Reach-back",
    kicker: "How far the throwing hand travels behind the body.",
    body: [
      "Reach-back distance is the throwing wrist to mid-hip, in shoulder widths, at the most rearward wrist position.",
      "A short reach-back is a difference, not a verdict. Some compact throwers are very effective.",
    ],
    cue: "Wide, relaxed throwing hand as you plant.",
  },
  {
    id: "elbow",
    title: "Elbow",
    kicker: "The elbow angle tells us if the arm is long or folded.",
    body: [
      "We measure the interior angle shoulder–elbow–wrist. If the arm points at the camera, the angle is distorted.",
      "This is not a medical exam. Pain around the elbow is a reason to see a qualified professional, not to chase a number.",
    ],
    cue: "The arm staying long through the reach-back rather than collapsing early.",
  },
  {
    id: "wrist",
    title: "Wrist",
    kicker: "Wrist speed is how we mark release in this version.",
    body: [
      "Release is defined as the frame of peak throwing-wrist speed. We do not see the disc leave the hand unless the disc itself is tracked — and it is not, yet.",
    ],
    cue: "Let the hand finish; do not freeze it at the hit.",
  },
  {
    id: "release",
    title: "Release",
    kicker: "Where the throwing hand is when wrist speed peaks.",
    body: [
      "Release height is the wrist’s height as a fraction of apparent stature. It is not metres.",
      "Hyzer, nose angle, and spin are unavailable unless the disc is actually tracked.",
    ],
    cue: "A release you can repeat, not a one-off “hero” snap.",
  },
  {
    id: "nose-hyzer",
    title: "Nose angle, hyzer, anhyzer",
    kicker: "Not measured from body pose alone.",
    body: [
      "Those are disc-orientation metrics. Monocular pose of the body cannot see them reliably. This app will say unavailable rather than invent them.",
    ],
    cue: "Film the disc edge-on if you want to study hyzer by eye — this version will not score it.",
  },
  {
    id: "timing",
    title: "Timing",
    kicker: "When peaks happen, not just how the pose looks.",
    body: [
      "Intervals are stored in milliseconds and as a percentage of the throw window so slow and fast throws can be compared.",
      "A single throw is a snapshot. Consistency across throws is stronger evidence than one colorful overlay.",
    ],
    cue: "Plant, hips, shoulders, arm — in that general order.",
  },
  {
    id: "power",
    title: "Power generation",
    kicker: "Speed usually comes from the ground up.",
    body: [
      "We do not estimate distance or disc speed in the MVP. Mechanical differences are not the same thing as “you lost 40 feet.”",
    ],
    cue: "If you want more speed, start with a repeatable plant and sequence — then re-measure.",
  },
  {
    id: "consistency",
    title: "Consistency",
    kicker: "Repeatability is a metric of its own.",
    body: [
      "After several throws of the same type, we report mean, median, range, and a simple band for each metric.",
      "An outlier throw is not a mechanical identity.",
    ],
    cue: "Three similar throws from the same camera beat one perfect-looking clip.",
  },
];
