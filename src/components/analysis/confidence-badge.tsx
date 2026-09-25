import { Badge } from "@/components/ui/badge";
import type { ConfidenceLevel, QualityGrade } from "@/lib/analysis/types";

export function ConfidenceBadge({ level }: { level: ConfidenceLevel }) {
  const variant = level === "high" ? "good" : level === "medium" ? "warn" : "poor";
  return <Badge variant={variant}>{level} confidence</Badge>;
}

export function QualityBadge({ grade }: { grade: QualityGrade }) {
  const variant = grade === "good" ? "good" : grade === "acceptable" ? "warn" : "poor";
  return <Badge variant={variant}>{grade}</Badge>;
}

export function DemoBadge({ show }: { show: boolean }) {
  if (!show) return null;
  return <Badge variant="demo">Demo data</Badge>;
}

export function ClassificationTag({ value }: { value: string }) {
  return <Badge variant="outline">{value}</Badge>;
}
