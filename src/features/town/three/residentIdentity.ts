import type { Town3DPlot } from './town3dModel';

/** Reviewed illustration actors, not independently approved collectible species.
 * Keep each source ID + dictionary ID + spelling together. In particular, U01-03
 * teaches the verb "man" and must not become an invented male character. */
export const RESIDENT_STUDIES = [
  { key: 'boy-scarf', itemId: 'LV1-U01-01', wordId: 'W000114', word: 'boy', accessory: '藍領巾',
    appearance: 'scarf', source: 'wordbeast/lv1-reviewed/LV1-U01-01-5e3be24cbad8.webp' },
  { key: 'girl-bow', itemId: 'LV1-U01-02', wordId: 'W000347', word: 'girl', accessory: '蝴蝶結背包',
    appearance: 'bow-backpack', source: 'wordbeast/lv1-reviewed/LV1-U01-02-f18945a4eafd.webp' },
] as const;
export type ResidentStudy = typeof RESIDENT_STUDIES[number];
export function residentStudies(plots: readonly Town3DPlot[]): ResidentStudy[] {
  return RESIDENT_STUDIES.filter(study => plots.some(plot => plot.id === study.itemId
    && plot.wordId === study.wordId && plot.word === study.word));
}
