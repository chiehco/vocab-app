import type { MorphemeRecord, RelationRecord, SenseRecord } from "../../db/types";

export function buildSenseCountByWord(records: SenseRecord[]): Map<string, number> {
  const senses = new Map<string, number>();
  for (const record of records) {
    senses.set(record.word, (senses.get(record.word) ?? 0) + 1);
  }
  return senses;
}

export function buildConfusableWordSet(relations: RelationRecord[]): Set<string> {
  const words = new Set<string>();
  for (const relation of relations) {
    if (relation.relationType !== "confuse" && relation.relationType !== "exam_distractor") continue;
    words.add(relation.word);
    words.add(relation.relatedWord);
  }
  return words;
}

export function buildMorphemeWordSet(morphemes: MorphemeRecord[]): Set<string> {
  return new Set(morphemes.map((record) => record.word));
}
