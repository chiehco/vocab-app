import type { SenseRecord, WordRecord } from '../../db/types';
import { approvedCurriculumCards } from '../vocabulary/approvedCurriculum';
import { normalizeDisplayChinese } from './wordDisplay';

// These are the states already supported by the public dictionary importer.
// Unreviewed public rows stay visibly unreviewed; unknown/retired states fail closed.
const PUBLIC_STATES = new Set(['approved', 'reviewed', 'draft', 'needs_check']);
export const isPublicContent = (sense: {status: string; distributionScope?: string; active?: boolean}) => PUBLIC_STATES.has(sense.status)
  && (sense.distributionScope === undefined || sense.distributionScope === 'public_ok') && sense.active !== false;
export const isPublicSense = isPublicContent;

export function recordedMeanings(word: WordRecord, senses: SenseRecord[]) {
  if (!isPublicContent(word)) return [];
  const rows = senses.filter(s => s.wordId === word.wordId && s.word === word.word && isPublicSense(s))
    .slice().sort((a, b) => {
      const position = (pos: string) => { const index = word.posAll?.indexOf(pos) ?? -1; return index < 0 ? 999 : index; };
      return position(a.sensePos) - position(b.sensePos) || a.senseOrder - b.senseOrder || a.senseId.localeCompare(b.senseId);
    })
    .map(s => ({ key: s.senseId, pos: s.sensePos, meaning: normalizeDisplayChinese(s.meaningZh),
      pending: s.status !== 'approved' && s.status !== 'reviewed', source: 'sense' }));
  for (const card of approvedCurriculumCards(word.word, word.wordId)) {
    if (!rows.some(row => row.pos === card.sensePos && row.meaning === card.targetMeaningZh))
      rows.push({ key: card.learningItemId, pos: card.sensePos, meaning: card.targetMeaningZh, pending: false, source: 'curriculum' });
  }
  return rows;
}

export function recordedSummary(word: WordRecord, senses: SenseRecord[]) {
  if (!isPublicContent(word)) return '';
  const summary = normalizeDisplayChinese(word.meaningZh ?? '');
  return senses.some(s => s.wordId === word.wordId && !isPublicSense(s) && summary.includes(normalizeDisplayChinese(s.meaningZh))) ? '' : summary;
}

export function linkedSenseLabel(word: WordRecord, senses: SenseRecord[], senseId?: string) {
  if (!isPublicContent(word)) return undefined;
  const sense = senses.find(s => s.senseId === senseId && s.wordId === word.wordId && s.word === word.word && isPublicSense(s));
  return sense ? `${sense.sensePos} ${normalizeDisplayChinese(sense.meaningZh)}` : undefined;
}

export function trustedVerbForms(word: WordRecord) {
  const forms = word.verbForms;
  if (!isPublicContent(word) || !forms || !['approved', 'reviewed'].includes(forms.status)
    || ![forms.base, forms.past, forms.pastParticiple, forms.sourceRef].every(value => typeof value === 'string' && value.trim())) return undefined;
  // U05-VOC-288 verified the verb wage under the retained noun display wage(s).
  // Reserve both identities so malformed records cannot fall through to base == display.
  if (word.wordId === 'W002976' || word.word.toLowerCase() === 'wage(s)') {
    return word.wordId === 'W002976' && word.word === 'wage(s)'
      && Array.isArray(word.wordVariants) && word.wordVariants.length === 2
      && word.wordVariants[0] === 'wage' && word.wordVariants[1] === 'wages'
      && forms.base === 'wage' && forms.past === 'waged' && forms.pastParticiple === 'waged'
      && forms.status === 'approved'
      && forms.sourceRef === 'https://www.collinsdictionary.com/dictionary/english/wage' ? forms : undefined;
  }
  // U13 verified groom under the retained merged bridegroom/groom entry.
  // Reserve both identities, as for wage(s), before ordinary base matching.
  if (word.wordId === 'W003112' || word.word.toLowerCase() === 'bridegroom/groom') {
    return word.wordId === 'W003112' && word.word === 'bridegroom/groom'
      && Array.isArray(word.wordVariants) && word.wordVariants.length === 2
      && word.wordVariants[0] === 'bridegroom' && word.wordVariants[1] === 'groom'
      && forms.base === 'groom' && forms.past === 'groomed' && forms.pastParticiple === 'groomed'
      && forms.status === 'approved'
      && forms.sourceRef === 'https://www.collinsdictionary.com/dictionary/english/groom' ? forms : undefined;
  }
  return forms.base.toLowerCase() === word.word.toLowerCase() ? forms : undefined;
}

export function hasVerbMeaning(word: WordRecord, senses: SenseRecord[]) {
  return [word.pos ?? '', ...recordedMeanings(word, senses).map(row => row.pos)].some(pos => /(?:^|\/)(?:v|vt|vi)\./.test(pos));
}
