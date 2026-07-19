import { S_GRADE_ASSET_IDS } from "./sGradeAssetIds";

const BASE = import.meta.env.BASE_URL;

const LEGACY_BEAST_ASSETS: Record<string, string> = {
  pest: `${BASE}wordbeast/pest-beast.png`,
  red: `${BASE}wordbeast/red-beast.png`,
  volcano: `${BASE}wordbeast/priest-volcano.png`,
  microscope: `${BASE}wordbeast/priest-microscope.png`,
  harvest: `${BASE}wordbeast/priest-harvest.png`,
  ancestor: `${BASE}wordbeast/priest-ancestor.png`,
  chew: `${BASE}wordbeast/priest-chew.png`,
  whisper: `${BASE}wordbeast/priest-whisper.png`,
  jealous: `${BASE}wordbeast/priest-jealous.png`,
  courage: `${BASE}wordbeast/priest-courage.png`,
};

export function getWordBeastAsset(wordId: string, word: string): string | null {
  const match = /^W(\d{6})$/i.exec(wordId);
  if (!match) return null;
  const normalizedId = `W${match[1]}`;
  if (S_GRADE_ASSET_IDS.has(normalizedId)) {
    return `${BASE}wordbeast/s/${normalizedId}.webp`;
  }

  const legacy = LEGACY_BEAST_ASSETS[word.toLowerCase()];
  if (legacy) return legacy;

  const sequence = Number(match[1]);
  if (sequence < 250 || sequence > 300) return null;
  return `${BASE}wordbeast/lv1/W${match[1]}.png`;
}

export function hasWordBeastAsset(wordId: string, word: string): boolean {
  return getWordBeastAsset(wordId, word) !== null;
}
