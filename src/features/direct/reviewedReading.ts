import type { LearningItem } from './model';

export type ReadingTable = Readonly<Record<string, readonly [string, string]>>;

export function applyReviewedReading(item: LearningItem, vocabulary: ReadingTable, usage: ReadingTable): LearningItem {
  const entry = vocabulary[item.learningItemId];
  if (entry) {
    const [sensePos, meaning] = entry;
    const meaningSource = item.officialWordId ? 'chapter_review' : 'reviewed_supplement';
    return { ...item, sensePos, targetMeaningZh: meaning, chapterMeaningsZh: meaning, meaningSource };
  }
  const entryUsage = usage[item.learningItemId];
  if (!entryUsage) return item;
  const [pattern, explanationZh] = entryUsage;
  return { ...item, pattern, explanationZh };
}
