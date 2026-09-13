import glossary from './glossary.json';
import { learningItems } from './model';
import type { WordRecord } from '../../db/types';

const forms: Record<string,string> = { was:'be', were:'be', is:'be', are:'be', been:'be', has:'have', had:'have', did:'do', done:'do', went:'go', gone:'go', bought:'buy', brought:'bring', children:'child', men:'man', women:'woman', possessions:'possession', assets:'asset' };
export function lookupWord(input: string, words: WordRecord[] = []): { word: string; meaning: string; source: string } {
  const token = input.trim().toLowerCase().replace(/^[^a-z]+|[^a-z]+$/g,'');
  const builtIn = (glossary as Record<string,string>)[token];
  if (builtIn) return { word: token, meaning: builtIn, source: '本機練習字典' };
  const item = learningItems.find(i => i.kind === 'vocabulary' && i.displayWord?.toLowerCase() === token);
  if (item) return { word: token, meaning: item.targetMeaningZh!, source: '本單元目標義' };
  const exact = words.filter(w => w.word.toLowerCase() === token || w.wordVariants?.some(v => v.toLowerCase() === token));
  if (exact.length) return { word: token, meaning: [...new Set(exact.map(w => w.meaningZh))].join('；'), source: '已下載字庫・一般詞義' };
  // 只使用明確對應的變化形；不靠去尾字猜原形而誤譯。
  const base = forms[token];
  if (base) {
    const result = lookupWord(base, words);
    if (result.source !== '尚未收錄') return { ...result, word: `${token} → ${base}` };
  }
  if (/\s/.test(token)) {
    const tokens = [...new Set(token.match(/[a-z]+(?:'[a-z]+)?/g) ?? [])];
    if (tokens.length > 1) return { word:input, meaning:tokens.map(t=>`${t}：${lookupWord(t,words).meaning}`).join('；'), source:'逐字參考・非片語或整句翻譯' };
  }
  return { word: token || input, meaning: '本機字庫尚未收錄這個字。', source: '尚未收錄' };
}
