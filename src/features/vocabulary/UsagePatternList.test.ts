import { describe, expect, it } from "vitest";
import { buildUsagePatternItems } from "./usagePattern";
import words from '../../../public/data/v1/words.json';
import u11Audit from '../../../docs/unit-audit-20261105/LV1-U11-patches.json';
import u12Audit from '../../../docs/unit-audit-20261105/LV1-U12-patches.json';
import u13Audit from '../../../docs/unit-audit-20261105/LV1-U13-patches.json';

describe("buildUsagePatternItems", () => {
  it('shows every corrected U13 bilingual pattern and distinguishes pleasing others from doing as one wishes',()=>{
    const ids=u13Audit.patches.filter(p=>p.dataset==='words'&&('usagePattern' in p.after||'usagePatternZh' in p.after)).map(p=>p.id);
    expect(ids).toHaveLength(25);
    for(const id of ids){const word=words.find(w=>w.wordId===id)!;
      expect(buildUsagePatternItems(word.usagePattern,word.usagePatternZh).every(item=>Boolean(item.chinese)),id).toBe(true);
    }
    const please=words.find(w=>w.wordId==='W000657')!,mountain=words.find(w=>w.wordId==='W000556')!;
    expect(buildUsagePatternItems(please.usagePattern,please.usagePatternZh)).toEqual([
      {english:'please sb',chinese:'取悅某人'},
      {english:'be eager to please',chinese:'急於討人歡心'},
      {english:'be hard to please',chinese:'難以取悅'},
      {english:'please oneself',chinese:'隨自己的意思行事'},
    ]);
    expect(buildUsagePatternItems(mountain.usagePattern,mountain.usagePatternZh)[1]).toEqual({english:'a mountain of N',chinese:'大量／一大堆……'});
  });
  it('keeps every corrected U12 bilingual usage pattern visible',()=>{
    const ids=u12Audit.patches.filter(p=>p.dataset==='words'&&('usagePattern' in p.after||'usagePatternZh' in p.after)).map(p=>p.id);
    expect(ids).toHaveLength(22);
    for(const id of ids){const word=words.find(w=>w.wordId===id)!;
      const items=buildUsagePatternItems(word.usagePattern,word.usagePatternZh);
      expect(items.length).toBeGreaterThan(0);
      expect(items.every(item=>Boolean(item.chinese)),id).toBe(true);
    }
    const answer=words.find(w=>w.wordId==='W000035')!,save=words.find(w=>w.wordId==='W000739')!;
    expect(buildUsagePatternItems(answer.usagePattern,answer.usagePatternZh)).toEqual([
      {english:'answer a question',chinese:'回答問題'},
      {english:'the answer to N',chinese:'……的答案'},
      {english:'answer for N',chinese:'對……負責'},
    ]);
    expect(buildUsagePatternItems(save.usagePattern,save.usagePatternZh)).toEqual([
      {english:'save money',chinese:'存錢／省錢'},
      {english:'save time',chinese:'節省時間'},
      {english:"save someone's life",chinese:'拯救某人的生命'},
    ]);
  });
  it("pairs aligned English and Chinese collocations", () => {
    expect(buildUsagePatternItems(
      "have a great time; a great deal of N; It's great to V",
      "玩得很開心；大量的……；做……很棒",
    )).toEqual([
      { english: "have a great time", chinese: "玩得很開心" },
      { english: "a great deal of N", chinese: "大量的……" },
      { english: "It's great to V", chinese: "做……很棒" },
    ]);
  });

  it("keeps English usable when Chinese segments do not align", () => {
    expect(buildUsagePatternItems("first; second", "只有一段")).toEqual([
      { english: "first", chinese: undefined },
      { english: "second", chinese: undefined },
    ]);
  });

  it('renders Chinese for every corrected U11 usage pattern, including both meanings of on earth',()=>{
    const ids=u11Audit.patches.filter(p=>p.dataset==='words'&&('usagePattern' in p.after||'usagePatternZh' in p.after)).map(p=>p.id);
    expect(ids).toHaveLength(22);
    for(const id of ids){const word=words.find(w=>w.wordId===id)!;
      const items=buildUsagePatternItems(word.usagePattern,word.usagePatternZh);
      expect(items.length).toBeGreaterThan(0);
      expect(items.every(item=>Boolean(item.chinese)),id).toBe(true);
    }
    const earth=words.find(w=>w.wordId==='W000253')!;
    expect(buildUsagePatternItems(earth.usagePattern,earth.usagePatternZh)).toEqual([
      {english:'on earth',chinese:'在世上／（加強疑問）究竟、到底'},
      {english:"the earth's surface",chinese:'地球表面'},
    ]);
  });
});
