// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createComponentHarness } from '../../test/componentHarness';
import words from '../../../public/data/v1/words.json';
import UsagePatternList from './UsagePatternList';
import { buildUsagePatternDisplay, buildUsagePatternItems } from './usagePattern';

const affected = [
  { wordId: 'W000426', word: 'if', english: 'if + clause; even if; as if', chinese: '如果……；即使……；彷彿……；在間接問句中表示是否', count: 3 },
  { wordId: 'W002429', word: 'immediate', english: 'immediate + N (action/response/family/need)', chinese: '立即的行動／回應；最親近的家人；迫切的需求', count: 1 },
  { wordId: 'W002582', word: 'observe', english: 'observe N closely; observe a rule/custom/holiday', chinese: '仔細觀察……；遵守規則或習俗；慶祝／紀念節日', count: 2 },
  { wordId: 'W003698', word: 'option', english: 'have the option of N/V-ing; have the option to V; have no option but to V; an option to V', chinese: '有……的選擇權；除了做某事別無選擇；做某事的選擇', count: 4 },
] as const;

describe('usage pattern display model', () => {
  it('preserves the existing aligned item contract and suppresses the separate note', () => {
    const english = ' first; ； second ; ';
    const chinese = ' 第一； ;第二； ';
    const expected = [{ english: 'first', chinese: '第一' }, { english: 'second', chinese: '第二' }];
    expect(buildUsagePatternItems(english, chinese)).toEqual(expected);
    expect(buildUsagePatternDisplay(english, chinese)).toEqual({ items: expected, unalignedChinese: undefined });
  });

  it.each([
    ['first; second', '只有一段'],
    ['first', '第一；第二'],
    ['first；second', '甲;乙;丙'],
    [' first ; second ', '  甲；\n乙; 丙  '],
  ])('never pairs or drops valid unequal Chinese for %s', (english, chinese) => {
    const display = buildUsagePatternDisplay(english, chinese);
    expect(display.items).toEqual(buildUsagePatternItems(english, chinese));
    expect(display.items.every(item => item.chinese === undefined)).toBe(true);
    expect(display.unalignedChinese).toBe(chinese.trim());
  });

  it.each([undefined, null, '', ' \n ', '; ； ;;'])('keeps missing English out of the display for %s', english => {
    expect(buildUsagePatternDisplay(english, '有效中文；第二段')).toEqual({ items: [], unalignedChinese: undefined });
    expect(renderToStaticMarkup(<UsagePatternList english={english} chinese="有效中文；第二段" />)).toBe('');
  });

  it.each([undefined, null, '', ' \n ', '; ； ;;'])('does not create a blank Chinese note for %s', chinese => {
    expect(buildUsagePatternDisplay('first; second', chinese)).toEqual({
      items: [{ english: 'first', chinese: undefined }, { english: 'second', chinese: undefined }],
      unalignedChinese: undefined,
    });
    const html = renderToStaticMarkup(<UsagePatternList english="first; second" chinese={chinese} />);
    expect(html).not.toContain('中文用法說明');
    expect(html).not.toContain('<small>');
  });
});

describe('UsagePatternList rendering', () => {
  let view: ReturnType<typeof createComponentHarness>;
  beforeEach(() => { view = createComponentHarness(); });
  afterEach(async () => { await view.unmount(); });

  it('preserves the aligned markup without a wrapper or duplicate translation', () => {
    expect(renderToStaticMarkup(<UsagePatternList english="first; second" chinese="第一；第二" />)).toBe(
      '<ul class="usage-pattern-items"><li><b>first</b><small>第一</small></li><li><b>second</b><small>第二</small></li></ul>',
    );
  });

  it.each(affected)('renders all source Chinese independently for $word', async fixture => {
    const row = words.find(word => word.wordId === fixture.wordId)!;
    // Expectations are independent constants, not copied from a computed display model.
    expect(row.usagePattern).toBe(fixture.english);
    expect(row.usagePatternZh).toBe(fixture.chinese);
    const before = JSON.stringify(row);
    await view.render(<UsagePatternList english={row.usagePattern} chinese={row.usagePatternZh} />);
    expect(view.container.querySelectorAll('.usage-pattern-items > li')).toHaveLength(fixture.count);
    expect(view.container.querySelectorAll('.usage-pattern-items small')).toHaveLength(0);
    const note = view.container.querySelector('.usage-pattern-unaligned-zh');
    expect(note?.getAttribute('aria-label')).toBe('中文用法說明');
    expect(note?.querySelector('strong')?.textContent).toBe('中文用法說明');
    expect(note?.querySelector('p')?.textContent).toBe(fixture.chinese);
    expect(view.container.querySelectorAll('.usage-pattern-unaligned-zh')).toHaveLength(1);
    expect(view.container.textContent?.split(fixture.chinese)).toHaveLength(2);
    expect(JSON.stringify(row)).toBe(before);
  });

  it('retains internal whitespace and renders source markup as text', async () => {
    const chinese = '  甲；\n乙; <script>literal</script>  ';
    await view.render(<UsagePatternList english="first; second" chinese={chinese} />);
    expect(view.container.querySelector('.usage-pattern-unaligned-zh p')?.textContent).toBe(chinese.trim());
    expect(view.container.querySelector('script')).toBeNull();
  });

  it('removes the note on aligned, absent-Chinese and absent-English rerenders', async () => {
    const fixture = affected[2];
    await view.render(<UsagePatternList english={fixture.english} chinese={fixture.chinese} />);
    expect(view.container.querySelectorAll('.usage-pattern-unaligned-zh')).toHaveLength(1);
    await view.render(<UsagePatternList english="first; second" chinese="第一；第二" />);
    expect(view.container.querySelector('.usage-pattern-with-note')).toBeNull();
    expect(view.container.querySelectorAll('.usage-pattern-items small')).toHaveLength(2);
    await view.render(<UsagePatternList english={fixture.english} chinese={fixture.chinese} />);
    expect(view.container.querySelectorAll('.usage-pattern-unaligned-zh')).toHaveLength(1);
    await view.render(<UsagePatternList english="first" chinese="； ; " />);
    expect(view.container.querySelector('.usage-pattern-unaligned-zh')).toBeNull();
    await view.render(<UsagePatternList english="； ; " chinese={fixture.chinese} />);
    expect(view.container.innerHTML).toBe('');
  });
});
