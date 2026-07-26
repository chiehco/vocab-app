import { S_GRADE_ASSET_IDS } from "./sGradeAssetIds";

const BASE = import.meta.env.BASE_URL;
const ASSET_REVISION = import.meta.env.VITE_ASSET_REVISION || "local";

function versioned(path: string): string {
  return `${path}?v=${ASSET_REVISION}`;
}

const LEGACY_BEAST_ASSETS: Record<string, string> = {
  pest: versioned(`${BASE}wordbeast/pest-beast.png`),
  red: versioned(`${BASE}wordbeast/red-beast.png`),
  volcano: versioned(`${BASE}wordbeast/priest-volcano.png`),
  microscope: versioned(`${BASE}wordbeast/priest-microscope.png`),
  harvest: versioned(`${BASE}wordbeast/priest-harvest.png`),
  ancestor: versioned(`${BASE}wordbeast/priest-ancestor.png`),
  chew: versioned(`${BASE}wordbeast/priest-chew.png`),
  whisper: versioned(`${BASE}wordbeast/priest-whisper.png`),
  jealous: versioned(`${BASE}wordbeast/priest-jealous.png`),
  courage: versioned(`${BASE}wordbeast/priest-courage.png`),
  used: versioned(`${BASE}wordbeast/used.png`),
};

export function getWordBeastAsset(wordId: string, word: string, imageWordId?: string): string | null {
  const assetWordId = imageWordId || wordId;
  const match = /^W(\d{6})$/i.exec(assetWordId);
  if (!match) return null;
  const normalizedId = `W${match[1]}`;
  if (S_GRADE_ASSET_IDS.has(normalizedId)) {
    return versioned(`${BASE}wordbeast/s/${normalizedId}.webp`);
  }

  const legacy = LEGACY_BEAST_ASSETS[word.toLowerCase()];
  if (legacy) return legacy;

  const sequence = Number(match[1]);
  if (sequence < 250 || sequence > 300) return null;
  return versioned(`${BASE}wordbeast/lv1/W${match[1]}.png`);
}

export function hasWordBeastAsset(wordId: string, word: string, imageWordId?: string): boolean {
  return getWordBeastAsset(wordId, word, imageWordId) !== null;
}
