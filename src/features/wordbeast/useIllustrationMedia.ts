import { useLiveQuery } from "dexie-react-hooks";
import { contentDb } from "../../db/contentDb";
import type { WordRecord } from "../../db/types";
import { getWordIllustrationMedia } from "../browser/wordDisplay";

export function useIllustrationMedia(word: WordRecord | undefined) {
  return useLiveQuery(async () => {
    if (!word) return undefined;
    // Shared artwork belongs to the source word, not necessarily this word's sense.
    const source = word.imageWordId && word.imageWordId !== word.wordId
      ? await contentDb.words.get(word.imageWordId) : word;
    if (!source) return undefined;
    return getWordIllustrationMedia(await contentDb.media.where("targetWord").equals(source.word).toArray());
  }, [word?.wordId, word?.word, word?.imageWordId]);
}
