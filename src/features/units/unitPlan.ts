import type { ExamPriorityRecord, WordRecord } from "../../db/types";
import { compareSixYearFrequency } from '../../quiz/examScope';

export const UNIT_SIZE = 30;
export type UnitOrder = 'exam' | 'alphabet';
export const parseUnitOrder = (value: string | null): UnitOrder => value === 'alphabet' ? 'alphabet' : 'exam';
export const unitOrderLabel = (order: UnitOrder) => order === 'alphabet' ? '字母排序' : '學測優先';

/** Both orders cover the same installed words and never change progress. */
export function buildStudyUnits(words: readonly WordRecord[], level: string, order: UnitOrder): ExamUnit[] {
  const selected = [...new Map(words.filter(w => w.level === level).map(w => [w.wordId, w])).values()]
    .sort((a,b) => (order === 'exam' ? compareSixYearFrequency(a.word, b.word) : a.word.localeCompare(b.word, 'en', {sensitivity:'base'})) || a.wordId.localeCompare(b.wordId));
  return Array.from({length:Math.ceil(selected.length / UNIT_SIZE)}, (_,i) => ({
    unitId:`${order}-${level.toLowerCase()}-u${i+1}`, unitNumber:i+1, label:`Unit ${String(i+1).padStart(2,'0')}`,
    level, words:selected.slice(i*UNIT_SIZE, (i+1)*UNIT_SIZE),
  }));
}
export function getStudyUnit(words: readonly WordRecord[], level: string, number: number, order: UnitOrder): ExamUnit | undefined {
  return Number.isInteger(number) && number > 0 ? buildStudyUnits(words, level, order)[number-1] : undefined;
}

export interface ExamUnit {
  unitId: string;
  unitNumber: number;
  label: string;
  level: string;
  words: WordRecord[];
}

function unitId(level: string, unitNumber: number): string {
  return `sa-${level.toLowerCase()}-u${String(unitNumber).padStart(2, "0")}`;
}

/**
 * Build the S+A curriculum units for one level.
 *
 * Unit membership is a content projection only. It does not read or write SRS
 * progress, so the global due queue remains the source of truth for reviews.
 */
export function buildExamUnits(
  words: readonly WordRecord[],
  priorities: readonly ExamPriorityRecord[],
  level: string,
): ExamUnit[] {
  const topPriorityByWordId = new Map<string, ExamPriorityRecord>();

  for (const priority of priorities) {
    if (priority.priorityTier !== "S" && priority.priorityTier !== "A") continue;
    const existing = topPriorityByWordId.get(priority.wordId);
    if (
      !existing
      || priority.rank < existing.rank
      || (priority.rank === existing.rank && priority.word.localeCompare(existing.word) < 0)
    ) {
      topPriorityByWordId.set(priority.wordId, priority);
    }
  }

  const selected = words
    .filter((word) => word.level === level && topPriorityByWordId.has(word.wordId))
    .slice()
    .sort((left, right) => {
      const leftRank = topPriorityByWordId.get(left.wordId)?.rank ?? Number.POSITIVE_INFINITY;
      const rightRank = topPriorityByWordId.get(right.wordId)?.rank ?? Number.POSITIVE_INFINITY;
      return leftRank - rightRank
        || left.wordId.localeCompare(right.wordId)
        || left.word.localeCompare(right.word);
    });

  const units: ExamUnit[] = [];
  for (let offset = 0; offset < selected.length; offset += UNIT_SIZE) {
    const unitNumber = units.length + 1;
    units.push({
      unitId: unitId(level, unitNumber),
      unitNumber,
      label: `Unit ${String(unitNumber).padStart(2, "0")}`,
      level,
      words: selected.slice(offset, offset + UNIT_SIZE),
    });
  }

  return units;
}

/** Return one 1-based unit from the deterministic S+A plan for a level. */
export function getExamUnit(
  words: readonly WordRecord[],
  priorities: readonly ExamPriorityRecord[],
  level: string,
  unitNumber: number,
): ExamUnit | undefined {
  if (!Number.isInteger(unitNumber) || unitNumber < 1) return undefined;
  return buildExamUnits(words, priorities, level)[unitNumber - 1];
}
