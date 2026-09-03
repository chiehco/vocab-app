/**
 * 依正式排程挑練習題：排程中的到期／新字先出，其餘只從已學過的字隨機補足。
 * 同一個單字一輪只出現一次，避免填空資料有多句時重複抽到同字。
 */
export function selectScheduledPracticeItems<T>(
  items: T[],
  getWord: (item: T) => string,
  scheduledWords: string[],
  knownWords: ReadonlySet<string>,
  count: number,
  random: () => number = Math.random,
): T[] {
  const firstItemByWord = new Map<string, T>();
  for (const item of items) {
    const word = getWord(item);
    if (!firstItemByWord.has(word)) firstItemByWord.set(word, item);
  }

  const selected: T[] = [];
  const selectedWords = new Set<string>();
  for (const word of scheduledWords) {
    const item = firstItemByWord.get(word);
    if (!item || selectedWords.has(word)) continue;
    selected.push(item);
    selectedWords.add(word);
    if (selected.length >= count) return selected;
  }

  const fallback = [...firstItemByWord]
    .filter(([word]) => knownWords.has(word) && !selectedWords.has(word))
    .map(([, item]) => item);
  for (let index = fallback.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [fallback[index], fallback[target]] = [fallback[target], fallback[index]];
  }
  return [...selected, ...fallback.slice(0, count - selected.length)];
}
