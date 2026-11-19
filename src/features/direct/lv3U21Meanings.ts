import dictionary from '../../db/lv3U21Dictionary.json';

const luggageNote = '兩詞都可指旅行時攜帶的行李。一件行李可說 a piece of luggage 或 a piece of baggage。';
const luggage = 'n. 行李（不可數）\n' + luggageNote;

export function reviewedLuggageNote(wordId: string, word: string) {
  return ((wordId === 'W002513' && word === 'luggage') || (wordId === 'W002063' && word === 'baggage'))
    ? luggageNote : undefined;
}

const meanings: Readonly<Record<string, string>> = {
  'LI-LV3U21-V001': luggage,
  'LI-LV3U21-V002': luggage,
  'LI-LV3U21-V028': dictionary.buffetMeanings.filter(row => row.role === 'chapter')
    .map(row => `${row.pos} ${row.meaning}`).join('\n'),
  'LI-LV3U21-V033': 'vt. 砍、切碎\nn. 砍擊；帶骨肉排',
  'LI-LV3U21-V058': 'v. 黏住、黏貼\nn. 棍；棒；刺；枯枝',
};

export function reviewedChapterMeaning(id: string | undefined) {
  return id ? meanings[id] : undefined;
}
