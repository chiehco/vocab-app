import { useLiveQuery } from "dexie-react-hooks";
import { contentDb } from "../../db/contentDb";
import type { WordRecord } from "../../db/types";
import { getWordIllustrationMedia } from "../browser/wordDisplay";
import { approvedWordIllustration } from '../vocabulary/approvedCurriculum';

export function useIllustrationMedia(word: WordRecord | undefined) {
  return useLiveQuery(async () => {
    if (!word) return undefined;
    // Shared artwork belongs to the source word, not necessarily this word's sense.
    const source = word.imageWordId && word.imageWordId !== word.wordId
      ? await contentDb.words.get(word.imageWordId) : word;
    if (!source) return undefined;
    const media = getWordIllustrationMedia(await contentDb.media.where("targetWord").equals(source.word).toArray());
    const approved = approvedWordIllustration(word.word, word.wordId);
    // Old media hints belong to the old picture, not the newly approved scene.
    return media && approved ? { ...media, captionZh: approved.captionZh, targetHint: undefined } : media;
  }, [word?.wordId, word?.word, word?.imageWordId]);
}
