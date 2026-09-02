import { contentDb } from "./contentDb";
import { progressDb } from "./progressDb";
import type { CardState } from "./types";
import { PROGRESS_RENAMES } from "./progressRenames";

/** Only the audited, retained wordId inherits progress. Never infer aliases from spelling. */
async function activeRenames() {
  const [current, reused] = await Promise.all([
    contentDb.words.bulkGet(PROGRESS_RENAMES.map((row) => row.wordId)),
    contentDb.words.where("word").anyOf(PROGRESS_RENAMES.map((row) => row.oldWord)).toArray(),
  ]);
  const reusedNames = new Set(reused.map((row) => row.word));
  return PROGRESS_RENAMES.filter((row, index) =>
    current[index]?.word === row.word && !reusedNames.has(row.oldWord));
}

/** Resolve content before entering a progress transaction: the databases stay separate. */
export async function getProgressKeys(word: string): Promise<string[]> {
  const rename = PROGRESS_RENAMES.find((row) => row.word === word);
  if (!rename) return [word];
  const [current, reused] = await Promise.all([
    contentDb.words.get(rename.wordId),
    contentDb.words.where("word").equals(rename.oldWord).first(),
  ]);
  return current?.word === word && !reused ? [word, rename.oldWord] : [word];
}

/** Current-name card wins a collision; archived rows are never merged, deleted or copied. */
export async function findProgressCard(keys: string[]): Promise<CardState | undefined> {
  return (await progressDb.cardStates.bulkGet(keys)).find((card) => card !== undefined);
}

export async function getCardState(word: string): Promise<CardState | undefined> {
  return findProgressCard(await getProgressKeys(word));
}

/** Read-only projection for queues/counts. Do not write these canonical-name copies to DB. */
export async function getLogicalCardStates(): Promise<CardState[]> {
  const [cards, renames] = await Promise.all([progressDb.cardStates.toArray(), activeRenames()]);
  const byKey = new Map(cards.map((card) => [card.word, card]));
  for (const rename of renames) {
    const legacy = byKey.get(rename.oldWord);
    if (!legacy) continue;
    if (!byKey.has(rename.word)) byKey.set(rename.word, { ...legacy, word: rename.word });
    byKey.delete(rename.oldWord);
  }
  return [...byKey.values()];
}

export async function getKnownWords(): Promise<string[]> {
  return (await getLogicalCardStates()).map((card) => card.word);
}
