import unit17 from '../direct/curriculumLV4Unit17.json';
import unit18 from '../direct/curriculumLV4Unit18.json';
import unit19 from '../direct/curriculumLV4Unit19.json';

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
const cards: ApprovedCurriculumCard[] = [unit17, unit18, unit19].flatMap(unit =>
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

export function approvedCurriculumIllustration(word: string, src: string) {
  return approvedCurriculumCards(word).find(card => src.split('?')[0].endsWith('/' + card.illustration.path))?.illustration;
}
