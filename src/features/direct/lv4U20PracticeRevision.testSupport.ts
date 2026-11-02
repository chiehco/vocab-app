import pack from './curriculumLV4Unit20.json';
import revision from './practiceTextRevisionsLV4Unit20.json';

// Undo only the five authorized practice edits; historical whole-pack hashes
// continue protecting all other fields, including image/caption approvals.
export function releasedUnit20BeforePracticeRevision() {
  const original = structuredClone(pack);
  original.template.revision = revision.previousTemplateRevision;
  for (const change of revision.changes) {
    const item = original.learningItems.find(i => i.learningItemId === change.learningItemId)!;
    Object.assign(item, { originalExample: change.before });
    for (const q of original.questions.filter(q =>
      q.questionId === 'CLOZE-' + change.before.workExampleId ||
      q.questionId === 'CHOICE-CLOZE-' + change.before.workExampleId)) {
      q.sentenceEn = change.before.sentenceEn;
      q.sentenceZh = change.before.sentenceZh;
      q.stem = change.before.blankSentence + '\n（' + q.targetMeaningZh + '）';
    }
  }
  return original;
}
