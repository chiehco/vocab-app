import { describe, expect, it } from "vitest";
import { buildUsagePatternItems } from "./usagePattern";
import words from '../../../public/data/v1/words.json';
import u11Audit from '../../../docs/unit-audit-20261105/LV1-U11-patches.json';

describe("buildUsagePatternItems", () => {
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
