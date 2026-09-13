import { learningItems, allQuestions } from '../direct/model';
export { learningItems };
export function reviewedExample(item: {originalExample?: {provenance:string;notImportedFromMdOrMaster:boolean;review:string;sentenceEn:string;sentenceZh:string}}) {
  const e=item.originalExample;
  return e?.provenance==='authored_in_this_task' && e.notImportedFromMdOrMaster && ['content_reviewed_20260912_v2','meaning_grammar_translation_checked'].includes(e.review) ? e : undefined;
}
export function practiceIds(items: typeof learningItems) {
  return items.map(i=>allQuestions.find(q=>q.learningItemId===i.learningItemId)?.questionId).filter((id):id is string=>!!id);
}
