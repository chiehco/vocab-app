import { describe, expect, it } from 'vitest';
import {
  availableTracks, findUnitByKey, publishersFor, resolveTextbookScope, textbookUnits, unitKey, unitTitle, unitsFor, volumesFor,
  type TextbookUnit,
} from './textbookCatalog';

const unit = (over: Partial<TextbookUnit>): TextbookUnit => ({
  track: '7000', publisher: 'ivy', volume: 'LV1', level: 'LV1', unit: 1, name: '', count: 1, usageCount: 0, partial: false, wordIds: [], ...over,
});

describe('textbookCatalog', () => {
  it('現有單元全部歸在常春藤 7000 單', () => {
    expect(textbookUnits.length).toBeGreaterThan(0);
    expect(new Set(textbookUnits.map(u => `${u.track}/${u.publisher}`))).toEqual(new Set(['7000/ivy']));
    expect(textbookUnits.every(u => u.level === u.volume)).toBe(true);
  });

  it('只列有內容的類別：沒有課本資料就不出現課本', () => {
    expect(availableTracks().map(t => t.id)).toEqual(['7000']);
    const mixed = [unit({}), unit({ track: 'textbook', publisher: 'lungteng', volume: '高一上', level: '高一上' })];
    expect(availableTracks(mixed).map(t => t.id)).toEqual(['7000', 'textbook']);
  });

  it('不合法的網址參數逐層退回第一個有內容的選項', () => {
    const units = [unit({ publisher: 'ivy', volume: 'LV3' }), unit({ publisher: 'liveabc', volume: 'LV2' }), unit({ publisher: 'liveabc', volume: 'LV5' })];
    expect(resolveTextbookScope({ track: 'textbook', publisher: 'liveabc', volume: 'LV5' }, units)).toEqual({ track: '7000', publisher: 'liveabc', volume: 'LV5' });
    expect(resolveTextbookScope({ publisher: 'liveabc', volume: 'LV3' }, units)).toEqual({ track: '7000', publisher: 'liveabc', volume: 'LV2' });
    expect(resolveTextbookScope({}, units)).toEqual({ track: '7000', publisher: 'ivy', volume: 'LV3' });
    expect(resolveTextbookScope({}, [])).toBeUndefined();
  });

  it('各層查詢只回傳該出版社／冊次的內容', () => {
    const units = [unit({ volume: 'LV3', unit: 2 }), unit({ volume: 'LV3', unit: 1 }), unit({ publisher: 'liveabc', volume: 'LV3', unit: 9 })];
    expect(publishersFor('7000', units)).toEqual(['ivy', 'liveabc']);
    expect(volumesFor('7000', 'liveabc', units)).toEqual(['LV3']);
    expect(unitsFor({ track: '7000', publisher: 'ivy', volume: 'LV3' }, units).map(u => u.unit)).toEqual([2, 1]);
  });

  it('單元鍵可以來回對應，標題依類別用 Unit 或第幾課', () => {
    const first = textbookUnits[0];
    expect(findUnitByKey(unitKey(first))).toBe(first);
    expect(findUnitByKey('7000.ivy.LV9.1')).toBeUndefined();
    expect(findUnitByKey(null)).toBeUndefined();
    expect(unitTitle({ track: '7000', unit: 3 })).toBe('Unit 03');
    expect(unitTitle({ track: 'textbook', unit: 3 })).toBe('第 3 課');
  });

  it('教材單元帶出對到主表的 wordId 供進度與遊戲使用', () => {
    const lv4 = textbookUnits.find(u => u.volume === 'LV4' && u.unit === 17)!;
    expect(lv4.wordIds.length).toBeGreaterThan(0);
    expect(lv4.wordIds.every(id => /^W\d{6}$/.test(id))).toBe(true);
  });
});
