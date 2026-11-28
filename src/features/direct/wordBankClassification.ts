import { startWordBankAttempt, setWordBankChoice, finishWordBankAttempt, wordBankView,
  type WordBankAttempt, type WordBankContent } from './wordBankView';

export const wordBankPosChoices = ['n.', 'v.', 'adj.', 'adv.'] as const;
export type WordBankPos = typeof wordBankPosChoices[number];
type Classification = Readonly<{ id: string; accepted: readonly WordBankPos[]; chosen: WordBankPos | null }>;
export type SemiGuidedWordBank = Readonly<{
  attempt: WordBankAttempt;
  classifications: readonly Classification[];
  classificationLocked: boolean;
}>;

// Candidate supports the four basic classes; unfamiliar source labels must be reviewed, not guessed.
function parsePos(label: string): WordBankPos[] {
  const parts = label.split('/').map(part => part.trim());
  if (parts.some(part => !wordBankPosChoices.includes(part as WordBankPos))) {
    throw new Error('Unsupported semi-guided POS label');
  }
  return [...new Set(parts)] as WordBankPos[];
}

export function startSemiGuidedWordBank(content: WordBankContent): SemiGuidedWordBank {
  const attempt = startWordBankAttempt(content, 'semi_guided');
  const { stage } = attempt;
  if (stage.optionIds.length < 5 || stage.optionIds.length > 8 ||
      stage.showPos !== false || stage.showBlankHints !== false || stage.feedback !== 'after_blank') {
    throw new Error('Invalid semi-guided stage');
  }
  const classifications = stage.optionIds.map(id => {
    const option = content.options.find(o => o.id === id);
    if (!option || typeof option.pos !== 'string') throw new Error('Missing POS label');
    return { id, accepted: parsePos(option.pos), chosen: null };
  });
  return { attempt, classifications, classificationLocked: false };
}

export function classifySemiGuidedWord(state: SemiGuidedWordBank, id: string, pos: WordBankPos | null): SemiGuidedWordBank {
  if (state.classificationLocked || (pos !== null && !wordBankPosChoices.includes(pos))) return state;
  const item = state.classifications.find(c => c.id === id);
  if (!item || item.chosen === pos) return state;
  return { ...state, classifications: state.classifications.map(c => c.id === id ? { ...c, chosen: pos } : c) };
}

export function beginSemiGuidedPassage(state: SemiGuidedWordBank): SemiGuidedWordBank {
  if (state.classificationLocked || state.classifications.some(c => c.chosen === null)) return state;
  // Completion, not correctness, unlocks the passage. A wrong guess must not block learning.
  return { ...state, classificationLocked: true };
}

export function chooseSemiGuidedWord(state: SemiGuidedWordBank, index: number, id: string | null): SemiGuidedWordBank {
  if (!state.classificationLocked) return state;
  const attempt = setWordBankChoice(state.attempt, index, id);
  return attempt === state.attempt ? state : { ...state, attempt };
}

export function submitSemiGuidedWordBank(state: SemiGuidedWordBank): SemiGuidedWordBank {
  if (!state.classificationLocked) return state;
  const attempt = finishWordBankAttempt(state.attempt);
  return attempt === state.attempt ? state : { ...state, attempt };
}

export function semiGuidedWordBankView(state: SemiGuidedWordBank) {
  return {
    passage: wordBankView(state.attempt),
    classificationLocked: state.classificationLocked,
    canBegin: !state.classificationLocked && state.classifications.every(c => c.chosen !== null),
    classifications: state.classifications.map(c => ({
      id: c.id, chosen: c.chosen,
      // A single valid class counts, even for a word with multiple recorded POS.
      // Classification feedback stays separate from passage score.
      ...(state.attempt.state.submitted ? {
        accepted: [...c.accepted], correct: c.chosen !== null && c.accepted.includes(c.chosen),
      } : {}),
    })),
  };
}
