import lv4Unit20Rationales from './optionContextRationalesLV4Unit20.json';

// Authored contrast records bind to the exact sentence and answer text, never
// an option letter. Reordered options retain their own rationale; new contexts
// must receive their own checked record instead of inheriting this explanation.
export const optionContextRationales: {
  questionId: string;
  sentenceEn: string;
  answerText: string;
  source: string;
  options: Record<string, string | undefined>;
}[] = [{
  questionId: 'CHOICE-CLOZE-ORIG-LV4U20-ferry',
  sentenceEn: 'The ferry carries the travelers across the river.',
  answerText: 'ferry',
  source: 'curriculumLV4Unit20:LI-LV4U20-ferry; public dictionary sway/nowadays/dense/ferry',
  options: {
    sway: '本句需要能載旅客渡河的交通工具；sway 的搖擺、影響或支配等意思，不能表示這種交通工具。',
    nowadays: 'nowadays 表示「現在／當今」的時間，不能指句中載旅客渡河的交通工具。',
    dense: 'dense 是形容密集或濃厚的形容詞，不能指句中載旅客渡河的交通工具。',
    ferry: '本句採用 ferry 的名詞「渡輪／渡船」義：渡輪載旅客過河，符合句意。',
  } as Record<string, string>,
}, ...lv4Unit20Rationales];
