import {expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import proof from '../../../docs/lv4-releases-20261122/U02.json';
import pack from '../../../public/data/v1/sa-pack.json';
import {getIllustrationCaption} from '../wordbeast/illustrationCaptions';
import {beforeLV4LaterUnitsText,beforeLV4Rows} from './lv4Published.testSupport';
const hash=(text:string|Buffer)=>createHash('sha256').update(text).digest('hex');
it('aligns the otherwise sentence, blank and pattern while preserving the answer and prior unit fixes',()=>{
 const row=pack.examples.find(r=>r.exampleId==='EXef58ef09')!;
 expect(row.sentenceEn).toBe("Take an umbrella; otherwise, you'll get soaked.");
 expect(row.blankSentence).toBe("Take an umbrella; _____, you'll get soaked.");
 expect(row.answer).toBe('otherwise');
 expect(pack.words.find(r=>r.wordId==='W003703')?.usagePattern).toBe('...; otherwise, ...; unless otherwise stated; think/believe otherwise');
 expect(pack.examples.find(r=>r.exampleId==='EXcaaa58d7')?.sensePos).toBe('n.');
 const old=beforeLV4Rows('examples',[row]);expect(old[0].sentenceEn).toBe("Take an umbrella, otherwise you'll get soaked.");
 expect(row.sentenceEn).toContain('; otherwise,');
 const meta=JSON.parse(readFileSync('public/data/v1/meta.json','utf8'));
 expect(meta.wordsHash).toBe(hash(readFileSync('public/data/v1/words.json','utf8').replace(/\r\n/g,'\n')));
});
it('updates the factual publisher caption and exact bilingual lookup atomically without changing the image',()=>{
 const media=pack.media.find(r=>r.assetId==='AX6a88080e')!;
 expect(media.captionZh).toBe('出版者把空白頁製作並整理成淡藍色書籍。');
 expect(getIllustrationCaption(media.captionZh)).toEqual({en:'The publisher turns blank pages into neatly assembled pale-blue books.',zh:media.captionZh});
 expect(getIllustrationCaption('出版者把空白頁製作並整理成三本淡藍色書籍。')?.en).toBe('');
 expect(hash(readFileSync('public/wordbeast/a/W003797.webp'))).toBe('f27a13e21c8e117f383ca06b9b460ba18cecde0e3f859455bf9fe577ae5c0ff7');
});
it('authenticates every complete successor file and restores exact published U01 bytes, rejecting unrelated edits',()=>{
 for(const [path,spec]of Object.entries(proof.files)){
  const raw=readFileSync(path,'utf8').replace(/\r\n/g,'\n');expect(hash(raw)).toBe(spec.afterHash);
  expect(hash(beforeLV4LaterUnitsText(path,raw,1))).toBe(spec.beforeHash);
  expect(()=>beforeLV4LaterUnitsText(path,raw+' ',1)).toThrow(/complete file drift/);
 }
});
