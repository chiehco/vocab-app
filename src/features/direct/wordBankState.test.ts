import { describe, expect, it } from 'vitest';
import { availableWordBankOptions, canRevealWordBankFeedback, chooseWordBankOption,
  createWordBankState, submitWordBank, type WordBankFeedback } from './wordBankState';

const options = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];
const indices = [1, 2, 3, 4, 5];
const stages: { count: number; feedback: WordBankFeedback }[] = [
  { count: 5, feedback: 'after_blank' },
  { count: 8, feedback: 'after_blank' },
  { count: 10, feedback: 'after_passage_submit' },
];

describe('word bank attempt state', () => {
  for (const { count, feedback } of stages) {
    const start = () => createWordBankState({ optionIds: options.slice(0, count), feedback }, indices);
    it(`${count}: rejects invalid, duplicate and incomplete choices`, () => {
      const initial = start();
      expect(availableWordBankOptions(initial)).toEqual(options.slice(0, count));
      expect(chooseWordBankOption(initial, 0, 'a')).toBe(initial);
      expect(chooseWordBankOption(initial, 1, 'unknown')).toBe(initial);
      const picked = chooseWordBankOption(initial, 1, 'a');
      expect(chooseWordBankOption(picked, 2, 'a')).toBe(picked);
      expect(submitWordBank(picked)).toBe(picked);
      expect(initial.slots[0].optionId).toBe(null);
    });
    it(`${count}: replacement and removal release options in original order`, () => {
      const initial = start();
      const picked = chooseWordBankOption(initial, 1, 'a');
      expect(availableWordBankOptions(picked)).toEqual(options.slice(1, count));
      const replaced = chooseWordBankOption(picked, 1, 'b');
      expect(availableWordBankOptions(replaced)).toEqual(['a', ...options.slice(2, count)]);
      expect(picked.slots[0].optionId).toBe('a');
      const cleared = chooseWordBankOption(replaced, 1, null);
      expect(availableWordBankOptions(cleared)).toEqual(options.slice(0, count));
      expect(cleared.slots[0].optionId).toBe(null);
    });
    it(`${count}: feedback timing, locked submission and fresh attempts`, () => {
      const initial = start();
      expect(canRevealWordBankFeedback(initial, 1)).toBe(false);
      let state = initial;
      for (const [position, index] of indices.entries()) {
        state = chooseWordBankOption(state, index, options[position]);
        expect(canRevealWordBankFeedback(state, index)).toBe(feedback === 'after_blank');
      }
      const submitted = submitWordBank(state);
      expect(submitted.submitted).toBe(true);
      expect(indices.every(index => canRevealWordBankFeedback(submitted, index))).toBe(true);
      expect(canRevealWordBankFeedback(submitted, 99)).toBe(false);
      expect(chooseWordBankOption(submitted, 1, null)).toBe(submitted);
      expect(submitWordBank(submitted)).toBe(submitted);
      expect(start()).toEqual(initial);
    });
  }
  it('rejects malformed configuration and copies option order', () => {
    const feedback = 'after_blank';
    expect(() => createWordBankState({ optionIds: ['a'], feedback }, [])).toThrow();
    expect(() => createWordBankState({ optionIds: ['a', 'b'], feedback }, [1, 1])).toThrow();
    expect(() => createWordBankState({ optionIds: ['a'], feedback }, [0])).toThrow();
    expect(() => createWordBankState({ optionIds: ['a', 'a'], feedback }, [1])).toThrow();
    expect(() => createWordBankState({ optionIds: ['a'], feedback }, [1, 2])).toThrow();
    expect(() => createWordBankState({ optionIds: [' '], feedback }, [1])).toThrow();
    const ids = ['a', 'b'];
    const state = createWordBankState({ optionIds: ids, feedback }, [1]);
    ids.reverse();
    expect(availableWordBankOptions(state)).toEqual(['a', 'b']);
  });
});
