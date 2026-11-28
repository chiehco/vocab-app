// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, it } from 'vitest';
import { createComponentHarness } from '../../test/componentHarness';
import GuidedWordBankPanel from './GuidedWordBankPanel';
import type { WordBankContent } from './wordBankView';

const ids = ['plan', 'carefully', 'books', 'help', 'useful'];
const content: WordBankContent = {
  passage: 'A (1) ___ helps. Read (2) ___. The (3) ___ are here. We (4) ___ others. It is (5) ___.',
  options: ids.map(id => ({ id, pos: 'test-pos' })),
  blanks: ids.map((answer, i) => ({
    index: i + 1, answer, guideHint: `hint-${i + 1}`,
    optionReviews: Object.fromEntries(ids.map(id => [id, { correct: id === answer, reasonZh: `reason-${i + 1}-${id}` }])),
  })),
  stages: [{ id: 'guided', optionIds: ids, showPos: true, showBlankHints: true, feedback: 'after_blank' }],
};
let harness: ReturnType<typeof createComponentHarness>;
beforeEach(async () => {
  harness = createComponentHarness();
  await harness.render(<GuidedWordBankPanel content={content} attemptKey="one" />);
});
afterEach(async () => { await harness.unmount(); });
const button = (selector: string) => harness.container.querySelector<HTMLButtonElement>(selector)!;
const select = (index: number) => harness.click(button(`[data-blank="${index}"]`));
const choose = (id: string) => harness.click(button(`[data-option="${id}"]`));
const action = (id: string) => button(`[data-action="${id}"]`);

it('renders five numbered blanks and options, offers hints, and permits replace and clear', async () => {
  expect(harness.container.querySelectorAll('[data-blank]')).toHaveLength(5);
  expect(harness.container.querySelectorAll('[data-option]')).toHaveLength(5);
  expect(harness.container.textContent).toContain('hint-1');
  expect(harness.container.querySelector('[data-feedback]')).toBeNull();
  expect(action('submit').disabled).toBe(true);
  await choose('plan');
  expect(button('[data-option="plan"]').disabled).toBe(true);
  expect(button('[data-blank="1"]').textContent).toContain('plan');
  expect(harness.container.querySelector('[data-feedback="1"]')?.textContent).toContain('reason-1-plan');
  await select(2);
  expect(harness.container.textContent).toContain('hint-2');
  expect(button('[data-option="plan"]').disabled).toBe(true);
  await select(1);
  await choose('carefully');
  expect(button('[data-option="plan"]').disabled).toBe(false);
  expect(button('[data-option="carefully"]').disabled).toBe(true);
  await harness.click(action('clear'));
  expect(button('[data-option="carefully"]').disabled).toBe(false);
  expect(harness.container.querySelector('[data-feedback="1"]')).toBeNull();
});

it('submits only a full passage, locks edits, shows score, and resets on restart or new attempt key', async () => {
  for (let i = 0; i < ids.length; i++) {
    await select(i + 1);
    await choose(ids[i]);
  }
  expect(action('submit').disabled).toBe(false);
  expect(harness.container.querySelector('[data-score]')).toBeNull();
  await harness.click(action('submit'));
  expect(harness.container.querySelector('[data-score]')?.textContent).toBe('答對 5 / 5 空');
  expect([...harness.container.querySelectorAll<HTMLButtonElement>('[data-blank], [data-option]')].every(el => el.disabled)).toBe(true);
  expect(action('clear').disabled).toBe(true);
  await harness.click(action('restart'));
  expect(harness.container.querySelector('[data-score]')).toBeNull();
  expect(harness.container.querySelector('[data-feedback]')).toBeNull();
  expect(action('submit').disabled).toBe(true);
  await choose('plan');
  await harness.render(<GuidedWordBankPanel content={content} attemptKey="two" />);
  expect(button('[data-option="plan"]').disabled).toBe(false);
  expect(harness.container.querySelector('[data-feedback]')).toBeNull();
});
