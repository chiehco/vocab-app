import { describe, expect, it, vi } from "vitest";
import type { ExamPriorityRecord, WordRecord } from "../../db/types";
import { selectDailyWords, type CaptureData } from "./dailyCapture";

vi.mock("../../lib/dates", () => ({ todayStr: () => "2026-08-30" }));
vi.mock("./wordBeastAssets", () => ({ hasWordBeastAsset: (id: string) => id !== "W999999" }));
function fixture(): CaptureData {
  const words: WordRecord[] = Array.from({ length: 35 }, (_, i) => ({
    wordId: `W${String(i).padStart(6, "0")}`, word: `word-${i}`, level: "LV1", pos: "n.", posAll: ["n."],
    meaningZh: "測試字義", meaningEn: null, usagePattern: null, syllables: null, stressPattern: null,
    phoneticUs: null, familyKey: null, isCore: true, sourceNote: null, status: "approved",
  }));
  const priorities: ExamPriorityRecord[] = words.map((w, i) => ({
    ...w, rank: i + 1, priorityTier: i < 15 ? "S" : i < 30 ? "A" : "B",
    scoreXuece: 1, xtBase: 0, xtOption: 0, xtCross: 0, xtYears: 1, xtYearList: null,
    xtOptionCount: 0, xtAnswerCount: 0, advancedTier: null, scoreZhikao: 0, zkYears: 0,
    zkYearList: null, zkOptionCount: 0, zkAnswerCount: 0, isFunctionWord: false,
  }));
  return { words, priorities, examples: [], relations: [], known: new Set(), remaining: 15 };
}

describe("S＋A 每日捕捉", () => {
  it("只選 S／A，排除已遇見，S 與 A 混排且不超過每日量", () => {
    const data = fixture();
    data.known.add("word-0");
    const result = selectDailyWords(data);
    expect(result).toHaveLength(15);
    expect(new Set(result.map(w => w.word)).size).toBe(15);
    expect(result.every(w => Number(w.word.slice(5)) < 30 && w.word !== "word-0")).toBe(true);
    expect(result.some(w => Number(w.word.slice(5)) >= 15)).toBe(true);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])("額度 %s 時不多發一張", remaining => {
    expect(selectDailyWords({ ...fixture(), remaining })).toEqual([]);
  });

  it("不足整數額度向下取整，同日名單不受資料輸入順序影響", () => {
    const data = { ...fixture(), remaining: 2.9 };
    const selected = selectDailyWords(data);
    expect(selected).toHaveLength(2);
    expect(selectDailyWords({ ...data, words: [...data.words].reverse() })).toEqual(selected);
  });

  it("S 耗盡時用 A 補足，不以 B／C／未分級字補位", () => {
    const data = fixture();
    data.known = new Set(data.words.slice(0, 15).map(w => w.word));
    expect(selectDailyWords(data).map(w => w.word).sort()).toEqual(data.words.slice(15, 30).map(w => w.word).sort());
    data.known = new Set(data.words.slice(0, 30).map(w => w.word));
    expect(selectDailyWords(data)).toEqual([]);
  });

  it("有可用圖的功能詞不因詞類被漏掉；無圖字留給一般學習與練習", () => {
    const data = fixture();
    data.words = data.words.slice(0, 2);
    data.words[1].wordId = "W999999";
    data.priorities[0].isFunctionWord = true;
    expect(selectDailyWords(data).map(w => w.word)).toEqual(["word-0"]);
  });
});
