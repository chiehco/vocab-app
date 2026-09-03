import { describe, expect, it } from "vitest";
import { selectScheduledPracticeItems } from "./practiceSelection";

interface Item { word: string; id: number }
const item = (word: string, id = 1): Item => ({ word, id });

describe("selectScheduledPracticeItems", () => {
  it("先依排程順序出題，再從已學過的字補足", () => {
    const selected = selectScheduledPracticeItems(
      [item("alpha"), item("beta"), item("gamma"), item("delta")],
      (row) => row.word,
      ["gamma", "alpha"],
      new Set(["beta", "delta"]),
      3,
      () => 0,
    );
    expect(selected.slice(0, 2).map((row) => row.word)).toEqual(["gamma", "alpha"]);
    expect(selected).toHaveLength(3);
    expect(["beta", "delta"]).toContain(selected[2].word);
  });

  it("不以未排入今日額度的新字補題，也不重複同一個字", () => {
    const selected = selectScheduledPracticeItems(
      [item("new", 1), item("new", 2), item("known")],
      (row) => row.word,
      ["new", "new"],
      new Set(["known"]),
      10,
      () => 0.5,
    );
    expect(selected.map((row) => [row.word, row.id])).toEqual([["new", 1], ["known", 1]]);
  });
});
