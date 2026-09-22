import { curriculumUnits } from '../direct/model';
import { lv1ReviewedGroups } from '../direct/lv1ReviewedGroups';

export const textbookUnits = [
  ...lv1ReviewedGroups.map(u => ({ level: 'LV1', unit: u.unit, name: `LV1 Unit ${String(u.unit).padStart(2,'0')}`,
    count: u.pairCount, usageCount: 0, partial: true })),
  ...curriculumUnits.map(u => ({ level: u.level, unit: u.unit, name: u.name,
    count: u.items.filter(i => i.kind === 'vocabulary').length,
    usageCount: u.items.filter(i => i.kind !== 'vocabulary').length, partial: false })),
].sort((a,b) => a.level.localeCompare(b.level) || a.unit - b.unit);
export const textbookLevels = [...new Set(textbookUnits.map(u => u.level))];
export const textbookPath = (level: string, unit: number) => `/textbook/${level}/${unit}`;
