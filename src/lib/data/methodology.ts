export const METHODOLOGY = {
  measures: [
    "Visible joint coordinates from monocular pose estimation",
    "Frame timing and phase peaks derived from those coordinates",
    "2D joint angles (knee, elbow) when all three joints are visible",
    "Body-relative distances (shoulder widths, stature fractions)",
  ],
  estimates: [
    "Apparent pelvis and shoulder orientation from 2D limb lines",
    "Hip-to-shoulder separation as the difference of those lines",
    "Release as peak throwing-wrist speed, not disc leave",
    "Throw direction from wrist travel when the camera angle is unknown",
  ],
  cannot: [
    "True disc spin",
    "Calibrated release speed in mph or km/h",
    "Hyzer / anhyzer / nose angle without disc tracking",
    "Ground-reaction forces",
    "Whether a movement is medically safe",
    "That a difference from a professional sample is “bad technique”",
  ],
  references:
    "The current reference sample is labeled DEMO DATA: synthetic distributions for development. It is not licensed professional footage and not real player statistics. Publicly viewable videos are not the same thing as licensed-for-analysis data.",
  confidence:
    "High / medium / low is based on landmark visibility and whether contributing joints stayed in frame. We do not display a raw model softmax as if it were scientific certainty.",
  monocular:
    "A single camera flattens the throw. Depth, true 3D rotation, and anything pointing at the lens will be distorted. That is why many values are marked estimated or normalized rather than metres.",
};
