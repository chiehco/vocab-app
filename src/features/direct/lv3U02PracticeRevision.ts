import type { LearningItem } from './model';

// Original-example presentation only. Keep the authenticated source bytes immutable.
// An unexpected future source revision is not silently overwritten.
export function applyU02PracticeRevision(item: LearningItem): LearningItem {
  const example = item.originalExample;
  if (item.kind !== 'vocabulary' || item.learningItemId !== 'LI-LV3U02-prohibit' ||
      item.officialWordId !== 'W004676' || item.displayWord !== 'prohibit' ||
      item.targetMeaningZh !== '禁止' || !example ||
      example.workExampleId !== 'ORIG-20260912-LV3U02-006' || example.answer !== 'prohibit' ||
      example.sentenceEn !== "The contest rules prohibit copying another team's design." ||
      example.sentenceZh !== '比賽規則禁止抄襲其他隊伍的設計。' ||
      example.blankSentence !== "The contest rules _____ copying another team's design.") return item;
  return {
    ...item,
    originalExample: {
      ...example,
      sentenceEn: "The contest rules prohibit copying another team's design; any team that copies is disqualified.",
      sentenceZh: '比賽規則禁止抄襲其他隊伍的設計；任何抄襲的隊伍都會被取消資格。',
      blankSentence: "The contest rules _____ copying another team's design; any team that copies is disqualified.",
    },
  };
}
