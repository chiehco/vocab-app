import rows from './illustrationCaptions.json';

// Independently authored translations of the existing image captions.
// Match the full source caption: changed artwork/copy must never inherit a stale translation.
const pairs = new Map(rows.map(row => [row.captionZh, { en: row.en, zh: row.zh }]));
export function getIllustrationCaption(caption?: string | null) {
  if (!caption?.trim()) return undefined;
  return pairs.get(caption) ?? { en: '', zh: caption };
}
