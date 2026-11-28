// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, it } from 'vitest';
import { createComponentHarness } from '../../test/componentHarness';
import ExamWordBankPanel from './ExamWordBankPanel';
import type { WordBankContent } from './wordBankView';

// Synthetic UI fixture only; not approved instructional content.
const ids = ['plan', 'read', 'careful', 'books', 'help', 'time', 'useful', 'early', 'finish', 'learn'];
const content: WordBankContent = {
  passage: ids.map((_, i) => `(${i + 1}) ___`).join(' '),
  options: ids.map(id => ({ id, pos: 'hidden-pos' })),
  blanks: ids.map((answer, i) => ({
    index: i + 1, answer, guideHint: `hidden-hint-${i + 1}`,
    optionReviews: Object.fromEntries(ids.map(id => [id, { correct: id === answer, reasonZh: `review-${i + 1}-${id}` }])),
  })),
  stages: [{ id: 'exam', optionIds: ids, showPos: false, showBlankHints: false, feedback: 'after_passage_submit' }],
};
let harness: ReturnType<typeof createComponentHarness>;
beforeEach(async () => {
  harness = createComponentHarness();
  await harness.render(<ExamWordBankPanel content={content} attemptKey="one" />);
});
afterEach(async () => { await harness.unmount(); });
const button = (selector: string) => harness.container.querySelector<HTMLButtonElement>(selector)!;
const select = (i: number) => harness.click(button(`[data-blank="${i}"]`));
const choose = (id: string) => harness.click(button(`[data-option="${id}"]`));
const action = (id: string) => button(`[data-action="${id}"]`);
function expectHidden() {
  expect(harness.container.querySelector('[data-feedback], [data-score], [aria-label="作答解析"]')).toBeNull();
  expect(harness.container.textContent).not.toContain('hidden-pos');
  expect(harness.container.textContent).not.toContain('hidden-hint');
  expect(harness.container.textContent).not.toContain('review-');
}

it('keeps ten-choice exam feedback hidden through replacement, clearing and complete filling', async () => {
  expect(harness.container.querySelectorAll('[data-blank]')).toHaveLength(10);
  expect(harness.container.querySelectorAll('[data-option]')).toHaveLength(10);
  expectHidden();
  await choose(ids[0]);
  expect(button('[data-option="plan"]').disabled).toBe(true);
  await select(2);
  expect(button('[data-option="plan"]').disabled).toBe(true);
  await select(1);
  await choose(ids[1]);
  expect(button('[data-option="plan"]').disabled).toBe(false);
  await harness.click(action('clear'));
  expect(button('[data-option="read"]').disabled).toBe(false);
  // Exchange two answers; the remaining eight are correct.
  const answers = [ids[1], ids[0], ...ids.slice(2)];
  for (let i = 0; i < answers.length; i++) {
    await select(i + 1);
    await choose(answers[i]);
    expectHidden();
    expect(action('submit').disabled).toBe(i < 9);
  }
  await harness.click(action('submit'));
  expect(harness.container.querySelector('[data-score]')?.textContent).toBe('答對 8 / 10 空');
  expect(harness.container.querySelectorAll('[data-feedback]')).toHaveLength(10);
  expect(harness.container.querySelectorAll('[data-feedback] li')).toHaveLength(100);
  expect(harness.container.querySelector('[data-feedback="1"]')?.textContent).toContain('review-1-plan');
  expect([...harness.container.querySelectorAll<HTMLButtonElement>('[data-blank], [data-option]')].every(el => el.disabled)).toBe(true);
  expect(action('clear').disabled).toBe(true);
  await harness.click(action('restart'));
  expectHidden();
  expect(action('submit').disabled).toBe(true);
  expect(button('[data-option="read"]').disabled).toBe(false);
  await choose(ids[0]);
  await harness.render(<ExamWordBankPanel content={content} attemptKey="two" />);
  expect(button('[data-option="plan"]').disabled).toBe(false);
  expectHidden();
});

it('rejects preview content and unsafe stage settings, then recovers on a new key', async () => {
  const stage = content.stages[0];
  const withStage = (patch: Partial<typeof stage>): WordBankContent => ({ ...content, stages: [{ ...stage, ...patch }] });
  const invalid: WordBankContent[] = [
    { ...content, passage: ids.slice(0, 5).map((_, i) => `(${i + 1}) ___`).join(' '), blanks: content.blanks.slice(0, 5) },
    withStage({ optionIds: ids.slice(0, 9) }),
    withStage({ showPos: true }),
    withStage({ showBlankHints: true }),
    withStage({ feedback: 'after_blank' }),
    { ...content, stages: [] },
    { ...content, passage: content.passage.replace('(1) ___', '___') },
    { ...content, passage: content.passage.replace('(10) ___', '(11) ___'),
      blanks: content.blanks.map((b, i) => i === 9 ? { ...b, index: 11 } : b) },
  ];
  for (const [i, candidate] of invalid.entries()) {
    await harness.render(<ExamWordBankPanel content={candidate} attemptKey={`invalid-${i}`} />);
    expect(harness.container.querySelector('[role="alert"]')?.textContent).toContain('暫時無法作答');
    expect(harness.container.querySelectorAll('[data-blank], [data-option], [data-action], [data-feedback], [data-score]')).toHaveLength(0);
  }
  await harness.render(<ExamWordBankPanel content={content} attemptKey="recovered" />);
  expect(harness.container.querySelector('[role="alert"]')).toBeNull();
  expect(harness.container.querySelectorAll('[data-blank]')).toHaveLength(10);
  expectHidden();
});
