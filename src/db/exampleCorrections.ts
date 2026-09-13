import type { ExampleRecord } from './types';

// User-requested editorial corrections, independently authored 2026-09-12.
// Keep stable IDs and change English, Chinese, sense label and cloze together.
const corrections: Record<string, Pick<ExampleRecord,'sentenceEn'|'sentenceZh'|'meaningHint'>> = {
  EX2a49d40d: {
    sentenceEn: 'Halfway through the passage, Nora realized that the narrator was hiding something.',
    sentenceZh: '文章讀到一半時，諾拉發現敘事者有所隱瞞。',
    meaningHint: '文章、段落',
  },
  EXeca05c9e: {
    sentenceEn: "The editor removed a passage about the author's childhood to shorten the essay.",
    sentenceZh: '為了縮短文章，編輯刪掉了一段描述作者童年的文字。',
    meaningHint: '文章、段落',
  },
};

/** Read-time correction: original imports and the separate progress database stay intact. */
export function correctExample(row: ExampleRecord | undefined): ExampleRecord | undefined {
  if (!row || row.word !== 'passage' || !corrections[row.exampleId]) return row;
  const correction = corrections[row.exampleId];
  return {...row, ...correction, sensePos:'n.', status:'reviewed',
    blankSentence:correction.sentenceEn.replace(/\bpassage\b/,'_____'),answer:'passage'};
}
