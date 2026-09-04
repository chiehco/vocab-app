import "./word-trait-badges.css";

interface WordTraitBadgesProps {
  senseCount?: number;
  hasConfusables?: boolean;
  hasMorphemes?: boolean;
  compact?: boolean;
}

export default function WordTraitBadges({ senseCount = 0, hasConfusables = false, hasMorphemes = false, compact = false }: WordTraitBadgesProps) {
  if (senseCount < 2 && !hasConfusables && !hasMorphemes) return null;
  return (
    <div className={`word-trait-badges ${compact ? "compact" : ""}`} aria-label="單字特性">
      {senseCount > 1 && <span className="trait-sense" title={`這個字有 ${senseCount} 種意思`}>多義 ×{senseCount}</span>}
      {hasConfusables && <span className="trait-confuse" title="有容易混淆的字">斬妄</span>}
      {hasMorphemes && <span className="trait-morpheme" title="可拆解字首、字根或字尾">可解構</span>}
    </div>
  );
}
