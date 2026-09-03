const SINGLE_CHARACTER_STOP_WORDS = new Set(["的", "了", "是", "在", "有", "和", "與", "或", "為", "可", "會", "能", "把", "讓"]);

export interface ImageClueCopy {
  label: "這張圖在畫什麼" | "例句中譯";
  text: string;
  targetHint: string | null | undefined;
}

export function resolveImageClueCopy(
  captionZh: string | null | undefined,
  sentenceZh: string | null | undefined,
  mediaTargetHint?: string | null,
  exampleMeaningHint?: string | null,
): ImageClueCopy | null {
  const caption = captionZh?.trim();
  if (caption) return { label: "這張圖在畫什麼", text: caption, targetHint: mediaTargetHint };

  const translation = sentenceZh?.trim();
  if (translation) return { label: "例句中譯", text: translation, targetHint: exampleMeaningHint };

  return null;
}

function chineseRuns(value: string | null | undefined): string[] {
  if (!value) return [];
  return value.match(/\p{Script=Han}+/gu) ?? [];
}

function longestCaptionMatch(caption: string, source: string): string | null {
  const runs = chineseRuns(source);
  let best: string | null = null;
  for (const run of runs) {
    for (let length = Math.min(run.length, 8); length >= 1; length -= 1) {
      for (let start = 0; start + length <= run.length; start += 1) {
        const candidate = run.slice(start, start + length);
        if (length === 1 && SINGLE_CHARACTER_STOP_WORDS.has(candidate)) continue;
        if (caption.includes(candidate) && (!best || candidate.length > best.length)) best = candidate;
      }
      if (best?.length === length) break;
    }
  }
  return best;
}

/** 找出圖片中文情境句裡最適合標亮的答案提示。 */
export function findImageClueHighlight(
  caption: string,
  targetHint: string | null | undefined,
  meaningZh: string | null | undefined,
): string | null {
  const directHint = targetHint?.trim();
  if (directHint && caption.includes(directHint)) return directHint;

  const sources = [targetHint, ...(meaningZh?.split(/[；;,，、/]/) ?? [])].filter(Boolean) as string[];
  let best: string | null = null;
  for (const source of sources) {
    const match = longestCaptionMatch(caption, source);
    if (match && (!best || match.length > best.length)) best = match;
  }
  if (best?.length === 1) {
    const index = caption.indexOf(best);
    const next = caption[index + 1];
    const previous = caption[index - 1];
    if (next && /\p{Script=Han}/u.test(next)) return `${best}${next}`;
    if (previous && /\p{Script=Han}/u.test(previous)) return `${previous}${best}`;
  }
  return best;
}

export function splitImageCaption(caption: string, highlight: string | null): [string, string, string] {
  if (!highlight) return [caption, "", ""];
  const index = caption.indexOf(highlight);
  if (index < 0) return [caption, "", ""];
  return [caption.slice(0, index), highlight, caption.slice(index + highlight.length)];
}
