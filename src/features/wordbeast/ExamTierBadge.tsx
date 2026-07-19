import type { ExamPriorityRecord } from "../../db/types";
import "./exam-tier-badge.css";

export type ExamTier = ExamPriorityRecord["priorityTier"];

const TIER_LABELS: Record<ExamTier, string> = {
  S: "傳說",
  A: "稀有",
  B: "精英",
  C: "常見",
  Z: "基礎",
};

export default function ExamTierBadge({ tier, compact = false }: { tier?: ExamTier | null; compact?: boolean }) {
  if (!tier) return null;
  return (
    <span className={`exam-tier-badge tier-${tier.toLowerCase()} ${compact ? "compact" : ""}`} aria-label={`${tier} 級字卡，${TIER_LABELS[tier]}`}>
      <b>{tier}</b><span>級</span>{!compact && <small>{TIER_LABELS[tier]}</small>}
    </span>
  );
}
