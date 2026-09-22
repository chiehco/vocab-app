import { describe, expect, it } from 'vitest';
import { eligibleWords, scriptJson, siegeUnitWords } from './model';
import { curriculumUnits } from '../direct/model';

describe('siege unit scope', () => {
  it('keeps exact spellings and excludes unsupported forms instead of changing answers', () => {
    expect(eligibleWords([['apple', '蘋果'], ['APPLE', '重複'], ['shoe(s)', '鞋'], ['ice cream', '冰淇淋'], ['long-term', '長期'], ['cat', ''], ['A', '一'], ['abcdefghijklmnopq', '過長']])).toEqual([['APPLE', '蘋果']]);
  });
  it('only uses the selected textbook unit and its meanings', () => {
    const words = siegeUnitWords('LV4', 20, []);
    expect(words.length).toBeGreaterThan(3);
    const source = curriculumUnits.find(u => u.level === 'LV4' && u.unit === 20)!;
    for (const [word, meaning] of words) expect(source.items.some(i => i.kind === 'vocabulary' && i.displayWord?.toUpperCase() === word && i.targetMeaningZh === meaning)).toBe(true);
    expect(siegeUnitWords('LV4', 99, [])).toEqual([]);
    expect(siegeUnitWords('LV1', 1, [])).toEqual([]);
  });
  it('escapes script terminators while retaining the original JSON values', () => {
    const input = [['</script><script>alert(1)</script>', '中文']];
    const encoded = scriptJson(input);
    expect(encoded).not.toContain('<');
    expect(JSON.parse(encoded)).toEqual(input);
  });
});
