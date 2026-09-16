import unit from '../direct/curriculumLV4Unit17.json';

// D-066 approval covers these specific textbook pictures and meanings only.
const cards = unit.learningItems.filter(item => item.kind === 'vocabulary' && item.officialWordId && item.illustration);
export function approvedUnit17Card(word: string, wordId?: string) {
  const headword = word.toLowerCase() === 'catalogue' ? 'catalog' : word.toLowerCase();
  return cards.find(item => item.displayWord === headword
    && (!wordId || item.officialWordId === wordId));
}
