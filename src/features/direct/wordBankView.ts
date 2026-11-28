import { availableWordBankOptions, canRevealWordBankFeedback, createWordBankState,
  chooseWordBankOption, submitWordBank, type WordBankStage, type WordBankState } from './wordBankState';

type Review = Readonly<{ correct: boolean; reasonZh: string }>;
type Stage = WordBankStage & Readonly<{ id: string; showPos: boolean; showBlankHints: boolean }>;
export type WordBankContent = Readonly<{
  passage: string;
  options: readonly Readonly<{ id: string; pos: string }>[];
  blanks: readonly Readonly<{ index: number; answer: string; guideHint: string;
    optionReviews: Readonly<Record<string, Review>> }>[];
  stages: readonly Stage[];
}>;
export type WordBankPassageSegment = Readonly<{ kind: 'text'; text: string } | { kind: 'blank'; index: number }>;
export type WordBankAttempt = Readonly<{ content: WordBankContent; stage: Stage; state: WordBankState;
  segments: readonly WordBankPassageSegment[] }>;

// Only numbered blanks in the authored word bank format are accepted.
export function splitWordBankPassage(passage: string, indices: readonly number[]): WordBankPassageSegment[] {
  if (!passage.trim() || indices.length === 0 || new Set(indices).size !== indices.length ||
      indices.some(i => !Number.isSafeInteger(i) || i < 1)) {
    throw new Error('Invalid word bank passage');
  }
  const segments: WordBankPassageSegment[] = [];
  const seen: number[] = [];
  let offset = 0;
  for (const match of passage.matchAll(/\(([1-9]\d*)\)\s*___(?!_)/g)) {
    const text = passage.slice(offset, match.index);
    if (text.includes('___')) throw new Error('Unnumbered word bank blank');
    if (text) segments.push({ kind: 'text', text });
    const index = Number(match[1]);
    segments.push({ kind: 'blank', index });
    seen.push(index);
    offset = match.index + match[0].length;
  }
  const tail = passage.slice(offset);
  if (tail.includes('___')) throw new Error('Unnumbered word bank blank');
  if (tail) segments.push({ kind: 'text', text: tail });
  if (seen.length !== indices.length || seen.some((i, n) => i !== indices[n])) {
    throw new Error('Word bank passage indices mismatch');
  }
  return segments;
}

// This adapter is intentionally local to a passage attempt. No DB, SRS or rewards writes.
export function startWordBankAttempt(content: WordBankContent, stageId: string): WordBankAttempt {
  const stage = content.stages.find(s => s.id === stageId);
  if (!stage || content.stages.filter(s => s.id === stageId).length !== 1 ||
      !['after_blank', 'after_passage_submit'].includes(stage.feedback)) {
    throw new Error('Invalid word bank stage');
  }
  const indices = content.blanks.map(b => b.index);
  const segments = splitWordBankPassage(content.passage, indices);
  const state = createWordBankState(stage, indices);
  const ids = content.options.map(o => o.id);
  if (new Set(ids).size !== ids.length || stage.optionIds.some(id => !ids.includes(id))) {
    throw new Error('Invalid word bank content options');
  }
  if (new Set(content.blanks.map(b => b.answer)).size !== content.blanks.length ||
      content.blanks.some(b => !stage.optionIds.includes(b.answer) ||
        stage.optionIds.some(id => !b.optionReviews[id]?.reasonZh.trim() ||
          b.optionReviews[id].correct !== (id === b.answer)))) {
    throw new Error('Invalid word bank answer or review');
  }
  return { content, stage, state, segments };
}

export function setWordBankChoice(attempt: WordBankAttempt, index: number, optionId: string | null): WordBankAttempt {
  const state = chooseWordBankOption(attempt.state, index, optionId);
  return state === attempt.state ? attempt : { ...attempt, state };
}

export function finishWordBankAttempt(attempt: WordBankAttempt): WordBankAttempt {
  const state = submitWordBank(attempt.state);
  return state === attempt.state ? attempt : { ...attempt, state };
}

export function wordBankView(attempt: WordBankAttempt) {
  const { content, stage, state } = attempt;
  const available = new Set(availableWordBankOptions(state));
  const blanks = content.blanks.map(b => {
    const chosen = state.slots.find(slot => slot.index === b.index)?.optionId ?? null;
    return {
      index: b.index, chosen,
      ...(stage.showBlankHints ? { hint: b.guideHint } : {}),
      ...(canRevealWordBankFeedback(state, b.index) ? {
        feedback: {
          answer: b.answer, correct: chosen === b.answer,
          reviews: stage.optionIds.map(id => ({
            id, correct: b.optionReviews[id].correct, reasonZh: b.optionReviews[id].reasonZh,
          })),
        },
      } : {}),
    };
  });
  return {
    passage: content.passage,
    segments: attempt.segments,
    options: stage.optionIds.map(id => ({
      id, available: available.has(id),
      ...(stage.showPos ? { pos: content.options.find(o => o.id === id)?.pos } : {}),
    })),
    blanks,
    submitted: state.submitted,
    canSubmit: !state.submitted && state.slots.every(slot => slot.optionId !== null),
    ...(state.submitted ? { score: {
      correct: content.blanks.filter(b => state.slots.find(s => s.index === b.index)?.optionId === b.answer).length,
      total: content.blanks.length,
    } } : {}),
  };
}
