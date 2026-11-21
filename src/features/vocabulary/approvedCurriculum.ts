import unit17 from '../direct/curriculumLV4Unit17.json';
import unit18 from '../direct/curriculumLV4Unit18.json';
import unit19 from '../direct/curriculumLV4Unit19.json';
import unit20 from '../direct/curriculumLV4Unit20.json';
import lv1Images from './lv1ReviewedImages.json';
import lv3Unit2 from '../direct/curriculumUnit2.json';
import lv3Review from './lv3ApprovedReview.json';
import exampleImages from './approvedExampleImages.json';
import u15ExampleImages from './lv3U15ExampleImages.json';
import u16ExampleImages from './lv3U16ExampleImages.json';
import auditedWordImages from './auditedWordIllustrations.json';
import lv3U21ApprovedCards from './lv3U21ApprovedCards.json';
import lv3U22ApprovedCards from './lv3U22ApprovedCards.json';
import lv3U23ApprovedCards from './lv3U23ApprovedCards.json';
import lv3U24ApprovedCards from './lv3U24ApprovedCards.json';
import lv3U20ApprovedCards from './lv3U20ApprovedCards.json';

export interface ApprovedCurriculumCard {
  learningItemId: string;
  displayWord: string;
  officialWordId: string;
  sensePos: string;
  targetMeaningZh: string;
  unitName: string;
  imageQuizAllowed?: boolean;
  secondaryOnGeneralCard?: boolean;
  illustration: { path: string; captionEn: string; captionZh: string };
}

// Registry order preserves the earlier approved default when a later unit reuses a word.
// All matching senses remain accessible, including statistic and statistics under one ID.
const cards: ApprovedCurriculumCard[] = [...[unit17, unit18, unit19, unit20].flatMap(unit =>
  unit.learningItems.flatMap(item => item.kind === 'vocabulary' && item.officialWordId && item.illustration
    ? [{ learningItemId: item.learningItemId, displayWord: item.displayWord!, officialWordId: item.officialWordId,
      sensePos: item.sensePos!, targetMeaningZh: item.targetMeaningZh!, unitName: unit.template.title, illustration: item.illustration }]
    : [])), ...lv3Unit2.learningItems.flatMap(item => item.kind === 'vocabulary' && item.officialWordId && item.illustration
      && lv3Review.cards.some(approval => approval.reviewId === item.learningItemId)
    ? [{ learningItemId: item.learningItemId, displayWord: item.displayWord!, officialWordId: item.officialWordId,
      sensePos: item.sensePos!, targetMeaningZh: item.targetMeaningZh!, unitName: lv3Unit2.template.name, illustration: item.illustration }]
    : []), ...lv3U20ApprovedCards];
const allCards: ApprovedCurriculumCard[] = [...cards, ...lv3U21ApprovedCards, ...lv3U22ApprovedCards, ...lv3U23ApprovedCards,
  ...lv3U24ApprovedCards.flatMap(card => card.officialWordId
    ? [{ ...card, officialWordId: card.officialWordId }] : [])];

export function approvedCurriculumItem(learningItemId: string) {
  return allCards.find(card => card.learningItemId === learningItemId)
    ?? lv3U24ApprovedCards.find(card => card.learningItemId === learningItemId);
}

export function approvedCurriculumCards(word: string, wordId?: string): ApprovedCurriculumCard[] {
  const normalized = word.trim().toLowerCase();
  const headwords = normalized === 'catalogue' ? ['catalog']
    : normalized === 'microphone/mike' ? ['microphone']
    : normalized === 'statistic(s)' ? ['statistic', 'statistics'] : [normalized];
  return allCards.filter(card => headwords.includes(card.displayWord) && (!wordId || card.officialWordId === wordId));
}

export function approvedCurriculumCard(word: string, wordId?: string) {
  const first = approvedCurriculumCards(word, wordId)[0];
  if (!first || cards.includes(first)) return first;
  const primary = approvedWordIllustration(word, first.officialWordId);
  return first.illustration.path === primary?.path ? first : undefined;
}

// These LV1 approvals cover the exact image/caption pair, not every dictionary sense.
// Keep them separate from sense approvals and retain earlier curriculum defaults.
export function approvedLV1Images(word: string, wordId: string) {
  return lv1Images.filter(card => card.officialWordId === wordId
    && card.aliases.includes(word.trim().toLowerCase()));
}

export function approvedWordIllustration(word: string, wordId: string) {
  // Exact audited general-card repairs supersede inherited LV1 defaults.
  // Unit routes still retrieve their original exact image/caption by path.
  const matching = approvedCurriculumCards(word, wordId);
  return matching.find(card => cards.includes(card))?.illustration
    ?? auditedWordImages.find(card => card.officialWordId === wordId
      && card.aliases.includes(word.trim().toLowerCase()))?.illustration
    ?? approvedLV1Images(word, wordId)[0]?.illustration
    // Exact example/caption approval does not approve every sense of a word.
    ?? exampleImages.find(card => card.officialWordId === wordId
      && card.word === word.trim().toLowerCase())?.illustration
    ?? u15ExampleImages.find(card => card.officialWordId === wordId
      && card.word === word.trim().toLowerCase())?.illustration
    ?? u16ExampleImages.find(card => card.officialWordId === wordId
      && card.word === word.trim().toLowerCase())?.illustration
    ?? matching.find(card => !card.secondaryOnGeneralCard)?.illustration;
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
      && path.endsWith('/' + card.illustration.path))?.illustration
    ?? auditedWordImages.find(card => card.aliases.includes(word.trim().toLowerCase())
      && path.endsWith('/' + card.illustration.path))?.illustration
    ?? exampleImages.find(card => card.word === word.trim().toLowerCase()
      && path.endsWith('/' + card.illustration.path))?.illustration
    ?? u15ExampleImages.find(card => card.word === word.trim().toLowerCase()
      && path.endsWith('/' + card.illustration.path))?.illustration
    ?? u16ExampleImages.find(card => card.word === word.trim().toLowerCase()
      && path.endsWith('/' + card.illustration.path))?.illustration;
}
