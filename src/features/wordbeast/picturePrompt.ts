import { approvedCurriculumCards } from '../vocabulary/approvedCurriculum';
import { getWordBeastAsset } from './wordBeastAssets';

export function canUsePicturePrompt(wordId: string, word: string, imageWordId?: string): boolean {
  const src = getWordBeastAsset(wordId, word, imageWordId);
  if (!src) return false;
  const path = src.split(/[?#]/)[0];
  return !approvedCurriculumCards(word, wordId).some(card =>
    card.imageQuizAllowed === false && path.endsWith('/' + card.illustration.path));
}
