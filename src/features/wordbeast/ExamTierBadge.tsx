import { EXAM_TIER_LABELS, getExamStarCount, getExamStarText, type ExamTier } from "./examTier";
import "./exam-tier-badge.css";

export default function ExamTierBadge({ tier, compact = false }: { tier?: ExamTier | null; compact?: boolean }) {
  if (!tier) return null;
  const stars = getExamStarText(tier);
  const description = EXAM_TIER_LABELS[tier];
  return (
    <span
      className={`exam-tier-badge tier-${tier.toLowerCase()} ${compact ? "compact" : ""}`}
      aria-label={`考頻 ${getExamStarCount(tier)} 星，${description}`}
      title={`考頻 ${stars}｜${description}`}
    >
      <span>考頻</span><b aria-hidden="true">{stars}</b>{!compact && <small>{description}</small>}
    </span>
  );
}
