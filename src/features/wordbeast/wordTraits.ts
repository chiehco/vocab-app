import type { ExampleRecord, MorphemeRecord, RelationRecord } from "../../db/types";

export function buildSenseCountByWord(examples: ExampleRecord[]): Map<string, number> {
  const senses = new Map<string, Set<string>>();
  for (const example of examples) {
    const hint = example.meaningHint?.trim();
    if (!hint) continue;
    const set = senses.get(example.word) ?? new Set<string>();
    set.add(`${example.sensePos ?? ""}|${hint}`);
    senses.set(example.word, set);
  }
  return new Map([...senses].map(([word, values]) => [word, values.size]));
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
