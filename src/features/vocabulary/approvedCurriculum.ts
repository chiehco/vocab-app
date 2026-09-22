import unit17 from '../direct/curriculumLV4Unit17.json';
import unit18 from '../direct/curriculumLV4Unit18.json';
import unit19 from '../direct/curriculumLV4Unit19.json';
import unit20 from '../direct/curriculumLV4Unit20.json';
import lv1Images from './lv1ReviewedImages.json';

export interface ApprovedCurriculumCard {
  learningItemId: string;
  displayWord: string;
  officialWordId: string;
  sensePos: string;
  targetMeaningZh: string;
  unitName: string;
  illustration: { path: string; captionEn: string; captionZh: string };
}

// Registry order preserves the earlier approved default when a later unit reuses a word.
// All matching senses remain accessible, including statistic and statistics under one ID.
const cards: ApprovedCurriculumCard[] = [unit17, unit18, unit19, unit20].flatMap(unit =>
  unit.learningItems.flatMap(item => item.kind === 'vocabulary' && item.officialWordId && item.illustration
    ? [{ learningItemId: item.learningItemId, displayWord: item.displayWord!, officialWordId: item.officialWordId,
      sensePos: item.sensePos!, targetMeaningZh: item.targetMeaningZh!, unitName: unit.template.title, illustration: item.illustration }]
    : []));

export function approvedCurriculumCards(word: string, wordId?: string): ApprovedCurriculumCard[] {
  const normalized = word.trim().toLowerCase();
  const headwords = normalized === 'catalogue' ? ['catalog']
    : normalized === 'statistic(s)' ? ['statistic', 'statistics'] : [normalized];
  return cards.filter(card => headwords.includes(card.displayWord) && (!wordId || card.officialWordId === wordId));
}

export function approvedCurriculumCard(word: string, wordId?: string) {
  return approvedCurriculumCards(word, wordId)[0];
}

// These LV1 approvals cover the exact image/caption pair, not every dictionary sense.
// Keep them separate from sense approvals and retain earlier curriculum defaults.
export function approvedLV1Images(word: string, wordId: string) {
  return lv1Images.filter(card => card.officialWordId === wordId
    && card.aliases.includes(word.trim().toLowerCase()));
}

export function approvedWordIllustration(word: string, wordId: string) {
  return approvedCurriculumCard(word, wordId)?.illustration
    ?? approvedLV1Images(word, wordId)[0]?.illustration;
}

// Unit19 p.207 explicitly teaches these uncountable nouns with "a piece of".
export function approvedCurriculumUsage(word: string, wordId: string): string | undefined {
  const key = word.trim().toLowerCase();
  if (!approvedCurriculumCards(key, wordId).some(c => c.unitName === unit19.template.title)) return undefined;
  return key === 'hardware' || key === 'software' ? `a piece of ${key}` : undefined;
}

export function approvedCurriculumUsageZh(word: string, wordId: string): string | undefined {
  const key = word.trim().toLowerCase();
  if (!approvedCurriculumCards(key, wordId).some(c => c.unitName === unit19.template.title)) return undefined;
  if (key === 'hardware') return '一件硬體設備';
  if (key === 'software') return '一套軟體';
  return undefined;
}

export function approvedCurriculumIllustration(word: string, src: string) {
  const path = src.split(/[?#]/)[0];
  return approvedCurriculumCards(word).find(card => path.endsWith('/' + card.illustration.path))?.illustration
    ?? lv1Images.find(card => card.aliases.includes(word.trim().toLowerCase())
      && path.endsWith('/' + card.illustration.path))?.illustration;
}
