import { useEffect } from 'react';
import type { WordRecord } from '../../db/types';
import { getWordBeastAsset } from './wordBeastAssets';

const pending = new Map<string, HTMLImageElement>();
const ready = new Set<string>();
export function preloadIllustrations(urls: string[]) {
  if (typeof Image === 'undefined') return;
  for (const url of new Set(urls)) {
    if (ready.has(url) || pending.has(url)) continue;
    const image = new Image();
    pending.set(url, image);
    image.fetchPriority = 'low';
    image.onload = () => {
      pending.delete(url);
      ready.add(url);
      if (ready.size > 100) ready.delete(ready.values().next().value!);
    };
    image.onerror = () => { pending.delete(url); };
    image.src = url;
  }
}

export function useUpcomingIllustrations(words: WordRecord[] | undefined, index: number) {
  const urls = (words ?? []).slice(index + 1, index + 3)
    .map(w => getWordBeastAsset(w.wordId, w.word, w.imageWordId))
    .filter((url): url is string => !!url).join('\n');
  useEffect(() => { if (urls) preloadIllustrations(urls.split('\n')); }, [urls]);
}
