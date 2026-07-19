import type { WordRecord } from "../db/types";
import { pickDistractors, shuffle } from "../quiz/distractors";
import type { QueueItem } from "../srs/queue";

/** 千單斬戰鬥題型：中文斬英文牌 / 英文牌選中文 / 聽音辨詞 */
export type SlashMode = "zh2en" | "en2zh" | "audio";

export interface SlashOption {
  word: WordRecord;
  isCorrect: boolean;
  /** 牌面上顯示的字（依題型是英文或中文） */
  label: string;
}

export interface SlashQuestion {
  target: WordRecord;
  isNew: boolean;
  mode: SlashMode;
  options: SlashOption[];
}

export interface DifficultySpec {
  label: string;
  cards: number;
  timerMs: number;
}

export const DIFFICULTIES: DifficultySpec[] = [
  { label: "初學", cards: 2, timerMs: 9000 },
  { label: "挑戰", cards: 3, timerMs: 7500 },
  { label: "困難", cards: 4, timerMs: 6000 },
  { label: "極限", cards: 5, timerMs: 5000 },
];

export const MAX_HP = 5;
export const ROUND_SIZE = 20;

export const MODE_LABELS: Record<SlashMode, string> = {
  zh2en: "斬字",
  en2zh: "辨義",
  audio: "聽音",
};

/** 取字義第一段（「遺棄；拋棄」→「遺棄」），牌面放得下 */
export function shortZh(meaning: string): string {
  return meaning.split(/[；;]/)[0].trim();
}

/**
 * 長字塞不進牌面紅框（紅框是直式的、英文是橫的），
 * 改貼一張比紅框寬、可折兩行的「符咒」。
 */
export function needsPlaque(label: string): boolean {
  const hasCjk = /[一-鿿]/.test(label);
  return hasCjk ? label.length > 6 : label.length > 9;
}

/** 依牌面字長決定字級（container query 寬度單位，卡片縮放字跟著縮） */
export function cardFontSize(label: string): string {
  const hasCjk = /[一-鿿]/.test(label);
  const len = label.length;
  if (hasCjk) {
    if (len <= 3) return "13cqw";
    if (len <= 6) return "10cqw";
    return "9cqw"; // 符咒模式：較寬、可折行
  }
  if (len <= 5) return "13cqw";
  if (len <= 8) return "11cqw";
  if (len <= 9) return "10cqw";
  return "10cqw"; // 符咒模式：較寬、可折行
}

export interface ComboReward {
  points: number;
  heal: number;
  burst: boolean;
}

/** 連擊獎勵。combo 是「這一斬之後」的連擊數：3 連回 1 血、5 連回 2 血。 */
export function comboReward(combo: number): ComboReward {
  return {
    points: combo >= 5 ? 30 : combo >= 3 ? 20 : 10,
    heal: combo === 3 ? 1 : combo === 5 ? 2 : 0,
    burst: combo >= 3,
  };
}

function pickMode(modes: SlashMode[]): SlashMode {
  return modes[Math.floor(Math.random() * modes.length)];
}

/**
 * 把隊列組成一輪戰鬥題目。
 * 沒有中文字義的字無法出題，直接略過；干擾項沿用測驗的同級同詞性規則。
 */
export function buildRound(
  items: QueueItem[],
  pool: WordRecord[],
  cardCount: number,
  modes: SlashMode[],
): SlashQuestion[] {
  const usable = items.filter((it) => it.wordRecord.meaningZh);
  return usable.slice(0, ROUND_SIZE).map((it) => {
    const target = it.wordRecord;
    const mode = pickMode(modes);
    const distractors = pickDistractors(target, pool, cardCount - 1);
    const toLabel = (w: WordRecord) =>
      mode === "en2zh" ? shortZh(w.meaningZh ?? "") : w.word;
    const options = shuffle([
      { word: target, isCorrect: true, label: toLabel(target) },
      ...distractors.map((w) => ({ word: w, isCorrect: false, label: toLabel(w) })),
    ]);
    return { target, isNew: it.isNew, mode, options };
  });
}
