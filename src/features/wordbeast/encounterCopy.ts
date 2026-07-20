import type { ExampleRecord, WordRecord } from "../../db/types";

function normalizeForm(value: string | null | undefined): string {
  return (value ?? "").toLowerCase().replace(/[^a-z]/g, "");
}

export function exampleMatchesEncounterWord(record: WordRecord, example?: ExampleRecord): boolean {
  const answer = normalizeForm(example?.answer);
  if (!answer) return true;
  const acceptedForms = [record.word, ...(record.wordVariants ?? [])].map(normalizeForm);
  return acceptedForms.includes(answer);
}

export function stripExamPoint(value: string): string {
  return value
    .replace(/[（(]\s*考點\s*[:：][^）)]*[）)]/gu, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function getPrimaryMeaning(value: string | null | undefined): string {
  return value?.split(/[；;]/u)[0]?.trim() || "釋義待補";
}

export function getEncounterMeaning(record: WordRecord, example?: ExampleRecord): string {
  const fallback = record.meaningZh?.trim() || "釋義待補";
  if (!exampleMatchesEncounterWord(record, example)) return fallback;
  const hint = stripExamPoint(example?.meaningHint?.trim() || "");
  return hint || fallback;
}

export function getEncounterPos(record: WordRecord, example?: ExampleRecord): string {
  if (!exampleMatchesEncounterWord(record, example)) return record.pos || "詞性未標";
  return example?.sensePos || record.pos || "詞性未標";
}
