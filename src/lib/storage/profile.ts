import type { CameraAngle, ThrowHand } from "@/lib/analysis/types";

export interface LocalProfile {
  displayName: string;
  throwingHand: ThrowHand;
  units: "metric" | "imperial";
  defaultCameraAngle: CameraAngle;
  trainingConsent: boolean;
  primaryFocus: string | null;
}

const KEY = "pta.profile.v1";

const DEFAULTS: LocalProfile = {
  displayName: "",
  throwingHand: "right",
  units: "metric",
  defaultCameraAngle: "off-arm-side",
  trainingConsent: false,
  primaryFocus: null,
};

export function loadProfile(): LocalProfile {
  if (typeof window === "undefined") return { ...DEFAULTS };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<LocalProfile>), trainingConsent: false };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveProfile(p: LocalProfile): void {
  localStorage.setItem(KEY, JSON.stringify({ ...p, trainingConsent: false }));
}

export function metersToDisplay(meters: number | null | undefined, units: LocalProfile["units"]): string {
  if (meters == null || !Number.isFinite(meters)) return "—";
  if (units === "imperial") return `${(meters * 3.28084).toFixed(0)} ft`;
  return `${meters.toFixed(0)} m`;
}
