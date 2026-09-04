import type { MediaRecord, SenseRecord, WordRecord } from "../../db/types";

/** A picture caption must come from its approved media, never an unrelated example. */
export function getWordIllustrationMedia(records: MediaRecord[]): MediaRecord | undefined {
  return records.find((record) => record.targetType === "word"
    && record.mediaType === "image" && record.status === "approved" && record.captionZh?.trim());
}

export interface WordDisplaySense {
  meaning: string;
  pos: string;
  needsReview: boolean;
  source: "sense" | "summary";
}

const TRADITIONAL_NORMALIZATION: Record<string, string> = {
  爲: "為",
  喫: "吃",
  裏: "裡",
  麽: "麼",
};

export function normalizeDisplayChinese(value: string): string {
  return [...value].map((character) => TRADITIONAL_NORMALIZATION[character] ?? character).join("");
}

export function firstSummaryMeaning(value: string | null): string {
  if (!value) return "中文意思待確認";
  const first = value
    .split(/[；;]/)
    .map((part) => part.trim())
    .find(Boolean);
  return normalizeDisplayChinese(first || "中文意思待確認");
}

export function getWordDisplaySense(
  word: WordRecord,
  senses: SenseRecord[],
): WordDisplaySense {
  const candidates = senses
    .filter((sense) => sense.wordId === word.wordId || sense.word === word.word);
  const matchesHeadword = (sense: SenseRecord) => sense.answerForms.some(
    (form) => form.trim().toLowerCase() === word.word.toLowerCase(),
  );
  const matchesPos = (sense: SenseRecord) => word.posAll.includes(sense.sensePos);
  const hasHeadwordSense = candidates.some((sense) => matchesHeadword(sense) && matchesPos(sense));
  // A jointly/adv. exam sense must not displace an explicit joint/adj. sense.
  // Inflections with the same POS and cards without a headword sense keep exam priority.
  const separateForm = (sense: SenseRecord) => hasHeadwordSense
    && sense.answerForms.length > 0 && !matchesHeadword(sense) && !matchesPos(sense);
  candidates.sort((a, b) => {
    const formDifference = Number(separateForm(a)) - Number(separateForm(b));
    if (formDifference) return formDifference;
    if (a.isExamSense !== b.isExamSense) return a.isExamSense ? -1 : 1;
    const statusWeight = (status: SenseRecord["status"]) =>
      status === "approved" ? 0 : status === "reviewed" ? 1 : status === "needs_check" ? 3 : 2;
    const statusDifference = statusWeight(a.status) - statusWeight(b.status);
    return statusDifference || a.senseOrder - b.senseOrder;
  });
  const preferred = candidates[0];

  if (preferred) {
    return {
      meaning: normalizeDisplayChinese(preferred.meaningZh),
      pos: preferred.sensePos || word.pos || "詞性待補",
      needsReview: preferred.status !== "approved" && preferred.status !== "reviewed",
      source: "sense",
    };
  }

  return {
    meaning: firstSummaryMeaning(word.meaningZh),
    pos: word.pos || "詞性待補",
    needsReview: true,
    source: "summary",
  };
}
