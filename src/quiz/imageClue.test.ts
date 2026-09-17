import { describe, expect, it } from "vitest";
import { findImageClueHighlight, resolveImageClueCopy, resolveWordImageClue, splitImageCaption } from "./imageClue";

describe("image clue highlighting", () => {
  it('uses the approved caption of the displayed curriculum image rather than an older example or hint', () => {
    expect(resolveWordImageClue('hardware', './curriculum/lv4-u19/19-09.webp?v=release', '舊圖說', '舊例句', '鍵盤', '舊提示'))
      .toEqual({ label: '這張圖在畫什麼', text: '螢幕是電腦硬體的一種。', targetHint: undefined });
    expect(resolveWordImageClue('hardware', './wordbeast/other.webp', '另一張圖說', '例句', '提示'))
      .toEqual({ label: '這張圖在畫什麼', text: '另一張圖說', targetHint: '提示' });
    expect(resolveWordImageClue('immigration', './curriculum/lv4-u19/19-01.webp')?.text)
      .toBe('地圖顯示從一個國家移居到另一個國家的過程。');
  });
  it("labels picture captions and example translations by their real source", () => {
    expect(resolveImageClueCopy("豆豆正在下樓。", "例句翻譯。", "下樓", "翻譯"))
      .toEqual({ label: "這張圖在畫什麼", text: "豆豆正在下樓。", targetHint: "下樓" });
    expect(resolveImageClueCopy(null, "例句翻譯。", null, "翻譯"))
      .toEqual({ label: "例句中譯", text: "例句翻譯。", targetHint: "翻譯" });
  });

  it("does not disguise a dictionary meaning as an image caption", () => {
    expect(resolveImageClueCopy(null, null)).toBeNull();
  });

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
