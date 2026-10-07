import { curriculumUnits } from '../direct/model';
import { lv1ReviewedGroups } from '../direct/lv1ReviewedGroups';

/**
 * 選單元的三層結構（2026-10-07 定案）：
 * 7000 單 → 出版社 → 等級 → Unit；課本 → 出版社 → 年級冊次 → 第幾課。
 * 目錄只列實際有內容的單元，沒有資料的類別／出版社自然不會出現。
 * 不把官方詞表每 30 字自動分組放進來（那是 /units，不是課本單元）。
 */
export type TextbookTrack = '7000' | 'textbook';

export const TRACKS: readonly { id: TextbookTrack; label: string; volumeLabel: string; unitLabel: string }[] = [
  { id: '7000', label: '7000 單', volumeLabel: '等級', unitLabel: 'Unit' },
  { id: 'textbook', label: '課本', volumeLabel: '年級', unitLabel: '課次' },
];

export const PUBLISHERS: Record<string, string> = { ivy: '常春藤' };

export interface TextbookUnit {
  track: TextbookTrack;
  publisher: string;
  /** 7000 單是 LV1–LV6，課本是年級冊次；路由 /textbook/:level/:unit 用的就是這個值 */
  volume: string;
  /** 舊呼叫端沿用的欄位，等於 volume */
  level: string;
  unit: number;
  name: string;
  count: number;
  usageCount: number;
  partial: boolean;
  /** 單元內對到主表的 wordId，算進度與遊戲出題用 */
  wordIds: string[];
}

// 現有 LV1／LV3／LV4 單元都是常春藤 7000 單（使用者 2026-10-07 確認）。
export const textbookUnits: TextbookUnit[] = [
  ...lv1ReviewedGroups.map(u => ({ track: '7000' as const, publisher: 'ivy', volume: 'LV1', level: 'LV1', unit: u.unit,
    name: `LV1 Unit ${String(u.unit).padStart(2,'0')}`, count: u.pairCount, usageCount: 0, partial: true, wordIds: u.wordIds })),
  ...curriculumUnits.map(u => ({ track: '7000' as const, publisher: 'ivy', volume: u.level, level: u.level, unit: u.unit, name: u.name,
    count: u.items.filter(i => i.kind === 'vocabulary').length,
    usageCount: u.items.filter(i => i.kind !== 'vocabulary').length, partial: false,
    wordIds: [...new Set(u.items.flatMap(i => i.kind === 'vocabulary' && i.officialWordId ? [i.officialWordId] : []))] })),
].sort((a,b) => a.track.localeCompare(b.track) || a.publisher.localeCompare(b.publisher) || a.volume.localeCompare(b.volume) || a.unit - b.unit);
export const textbookLevels = [...new Set(textbookUnits.map(u => u.level))];
export const textbookPath = (level: string, unit: number) => `/textbook/${level}/${unit}`;

export interface TextbookScope { track: TextbookTrack; publisher: string; volume: string }

export const availableTracks = (units = textbookUnits) => TRACKS.filter(t => units.some(u => u.track === t.id));
export const publishersFor = (track: TextbookTrack, units = textbookUnits) =>
  [...new Set(units.filter(u => u.track === track).map(u => u.publisher))];
export const volumesFor = (track: TextbookTrack, publisher: string, units = textbookUnits) =>
  [...new Set(units.filter(u => u.track === track && u.publisher === publisher).map(u => u.volume))];
export const unitsFor = (scope: TextbookScope, units = textbookUnits) =>
  units.filter(u => u.track === scope.track && u.publisher === scope.publisher && u.volume === scope.volume);
export const publisherName = (id: string) => PUBLISHERS[id] ?? id;
export const trackInfo = (track: TextbookTrack) => TRACKS.find(t => t.id === track)!;

/** 網址參數（track／pub／level）不合法或缺少時，逐層退回第一個有內容的選項。 */
export function resolveTextbookScope(requested: { track?: string | null; publisher?: string | null; volume?: string | null }, units = textbookUnits): TextbookScope | undefined {
  const tracks = availableTracks(units);
  const track = tracks.find(t => t.id === requested.track)?.id ?? tracks[0]?.id;
  if (!track) return undefined;
  const publishers = publishersFor(track, units);
  const publisher = publishers.includes(requested.publisher ?? '') ? requested.publisher! : publishers[0];
  const volumes = volumesFor(track, publisher, units);
  const volume = volumes.includes(requested.volume ?? '') ? requested.volume! : volumes[0];
  return { track, publisher, volume };
}

/** 單元的穩定鍵，放進網址讓遊戲用單元出題：7000.ivy.LV4.17 */
export const unitKey = (u: Pick<TextbookUnit, 'track' | 'publisher' | 'volume' | 'unit'>) => `${u.track}.${u.publisher}.${u.volume}.${u.unit}`;
export const findUnitByKey = (key: string | null, units = textbookUnits) => key ? units.find(u => unitKey(u) === key) : undefined;

export function unitTitle(u: Pick<TextbookUnit, 'track' | 'unit'>) {
  return u.track === 'textbook' ? `第 ${u.unit} 課` : `Unit ${String(u.unit).padStart(2, '0')}`;
}

/** 連續的單元號碼收成區段：1–15、22–25 */
export function unitRanges(numbers: number[]) {
  const sorted = [...new Set(numbers)].sort((a, b) => a - b);
  const ranges: [number, number][] = [];
  for (const n of sorted) {
    const last = ranges[ranges.length - 1];
    if (last && n === last[1] + 1) last[1] = n; else ranges.push([n, n]);
  }
  return ranges;
}
