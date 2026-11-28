export type WordBankFeedback = 'after_blank' | 'after_passage_submit';
export type WordBankStage = Readonly<{
  optionIds: readonly string[];
  feedback: WordBankFeedback;
}>;
export type WordBankState = Readonly<{
  stage: WordBankStage;
  slots: readonly Readonly<{ index: number; optionId: string | null }>[];
  submitted: boolean;
}>;

// A passage attempt is independent of prior guided or exam attempts.
export function createWordBankState(stage: WordBankStage, blankIndices: readonly number[]): WordBankState {
  if (blankIndices.length === 0 || new Set(blankIndices).size !== blankIndices.length ||
      blankIndices.some(index => !Number.isSafeInteger(index) || index < 1)) {
    throw new Error('Invalid word bank blank indices');
  }
  if (stage.optionIds.length < blankIndices.length || new Set(stage.optionIds).size !== stage.optionIds.length ||
      stage.optionIds.some(id => !id.trim())) {
    throw new Error('Invalid word bank options');
  }
  return { stage: { ...stage, optionIds: [...stage.optionIds] },
    slots: blankIndices.map(index => ({ index, optionId: null })), submitted: false };
}

export function chooseWordBankOption(state: WordBankState, index: number, optionId: string | null): WordBankState {
  if (state.submitted) return state;
  const slot = state.slots.find(item => item.index === index);
  if (!slot || slot.optionId === optionId) return state;
  if (optionId !== null && (!state.stage.optionIds.includes(optionId) ||
      state.slots.some(item => item.index !== index && item.optionId === optionId))) return state;
  return { ...state, slots: state.slots.map(item => item.index === index ? { ...item, optionId } : item) };
}

export function availableWordBankOptions(state: WordBankState): string[] {
  return state.stage.optionIds.filter(id => !state.slots.some(item => item.optionId === id));
}

export function submitWordBank(state: WordBankState): WordBankState {
  if (state.submitted || state.slots.some(slot => slot.optionId === null)) return state;
  return { ...state, submitted: true };
}

// A presentation gate only, not an attempt to conceal client-side fixture data.
export function canRevealWordBankFeedback(state: WordBankState, index: number): boolean {
  const slot = state.slots.find(item => item.index === index);
  return !!slot && slot.optionId !== null && (state.submitted || state.stage.feedback === 'after_blank');
}
