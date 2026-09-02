import { describe, expect, it } from "vitest";
import { findImageClueHighlight, splitImageCaption } from "./imageClue";

describe("image clue highlighting", () => {
  it("優先標亮圖片資料指定的中文提示", () => {
    expect(findImageClueHighlight("牠們團結起來。", "團結", "聯合；團結"))
      .toBe("團結");
  });

  it("從核心釋義找出中文情境句中的答案詞", () => {
    expect(findImageClueHighlight("牠穿上外套。", null, "外套；覆蓋物"))
      .toBe("外套");
    expect(findImageClueHighlight("這顆南瓜好大。", null, "大的；重要的"))
      .toBe("好大");
    expect(findImageClueHighlight("這間房子閒置多年。", null, "空的；空閒的"))
      .toBe("閒置");
  });

  it("將中文句拆成標亮前、答案與標亮後", () => {
    const parts = splitImageCaption("牠在查字典。", "字典");
    expect(parts[0]).toBe("牠在查");
    expect(parts[1]).toBe("字典");
    expect(parts[2]).toBe("。");
  });
});
