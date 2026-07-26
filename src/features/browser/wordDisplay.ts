import type { SenseRecord, WordRecord } from "../../db/types";

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
  if (!value) return "釋義待校準";
  const first = value
    .split(/[；;]/)
    .map((part) => part.trim())
    .find(Boolean);
  return normalizeDisplayChinese(first || "釋義待校準");
}

export function getWordDisplaySense(
  word: WordRecord,
  senses: SenseRecord[],
): WordDisplaySense {
  const candidates = senses
    .filter((sense) => sense.wordId === word.wordId || sense.word === word.word)
    .sort((a, b) => {
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
