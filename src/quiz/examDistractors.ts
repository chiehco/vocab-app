import type { RelationRecord, WordRecord } from "../db/types";
import { pickDistractors } from "./distractors";

function normalizedForms(word: WordRecord): string[] {
  return [word.word, ...(word.wordVariants ?? [])].map((value) => value.trim().toLowerCase());
}

function wordLookup(words: WordRecord[]): Map<string, WordRecord> {
  const lookup = new Map<string, WordRecord>();
  for (const word of words) {
    for (const form of normalizedForms(word)) {
      if (form && !lookup.has(form)) lookup.set(form, word);
    }
  }
  return lookup;
}

/** Prefer real exam distractors, then fill any missing slots with the generic picker. */
export function pickExamDistractors(
  target: WordRecord,
  allWords: WordRecord[],
  relations: RelationRecord[],
  count = 3,
): WordRecord[] {
  const lookup = wordLookup(allWords);
  const targetForms = new Set(normalizedForms(target));
  const picked: WordRecord[] = [];
  const used = new Set<string>(targetForms);

  for (const relation of relations) {
    if (relation.relationType !== "exam_distractor") continue;
    if (!targetForms.has(relation.word.trim().toLowerCase())) continue;
    const related = lookup.get(relation.relatedWord.trim().toLowerCase());
    if (!related || used.has(related.word.toLowerCase())) continue;
    picked.push(related);
    for (const form of normalizedForms(related)) used.add(form);
    if (picked.length >= count) return picked;
  }

  for (const fallback of pickDistractors(target, allWords, count)) {
    if (used.has(fallback.word.toLowerCase())) continue;
    picked.push(fallback);
    used.add(fallback.word.toLowerCase());
    if (picked.length >= count) break;
  }
  return picked;
}
