import {expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import proof from '../../../docs/lv4-releases-20261122/U05.json';
import {beforeLV4LaterUnitsText,beforeLV4PublishedText} from './lv4Published.testSupport';
import {getIllustrationCaption} from '../wordbeast/illustrationCaptions';
const hash=(text:string|Buffer)=>createHash('sha256').update(text).digest('hex');
it('corrects selected POS while preserving the occupied word family and legitimate slight senses',()=>{
 const pack=JSON.parse(readFileSync('public/data/v1/sa-pack.json','utf8'));
 for(const rows of [pack.examples,JSON.parse(readFileSync('public/data/v1/examples.json','utf8'))]){
  const development=rows.find((r:{exampleId:string})=>r.exampleId==='EX9ca633b8');expect(development.sensePos).toBe('n.');expect(development.answer).toBe('development');
  const occupied=rows.find((r:{exampleId:string})=>r.exampleId==='EXb15bb5d0');expect(occupied.sensePos).toBe('adj.');expect(occupied.word).toBe('occupy');expect(occupied.answer).toBe('occupied');
 }
 for(const rows of [pack.senses,JSON.parse(readFileSync('public/data/v1/senses.json','utf8'))])for(const [id,pos]of [['W003903-2','n.'],['W003903-3','v.']]){
  const sense=rows.find((r:{senseId:string})=>r.senseId===id);expect(sense.sensePos).toBe(pos);expect(sense.status).toBe('needs_check');expect(sense.note).toBe('待拆分；主表字義：輕蔑；怠慢；輕微的；纖細的');
 }
});
it('synchronizes appropriate verb POS and reviewed estimate/waken constructions in full and starter dictionaries',()=>{
 const pack=JSON.parse(readFileSync('public/data/v1/sa-pack.json','utf8'));
 for(const rows of [pack.words,JSON.parse(readFileSync('public/data/v1/words.json','utf8'))]){
  const appropriate=rows.find((r:{wordId:string})=>r.wordId==='W003057');expect(appropriate.pos).toBe('adj./v.');expect(appropriate.posAll).toEqual(['adj.','v.']);
  const estimate=rows.find((r:{wordId:string})=>r.wordId==='W003367');expect(estimate.usagePattern).toBe('estimate N (the cost); estimate that S + V; It is estimated that...; be estimated to V; an estimated + number; an estimate of N');expect(estimate.usagePatternZh).toBe('估計……（成本）；估計……；據估計……；被估計會……；估計有……（數字）；對……的估計');
  const waken=rows.find((r:{wordId:string})=>r.wordId==='W003996');expect(waken.usagePattern).toBe('waken (= wake up); waken sb (= wake sb up)');expect(waken.usagePatternZh).toBe('醒來；將某人喚醒');
 }
});
it('pairs the existing forest and stage images with factual captions without changing their bytes',()=>{
 const pack=JSON.parse(readFileSync('public/data/v1/sa-pack.json','utf8'));
 for(const [id,zh,en]of [['AX11f09294','森林中的高大樹木環繞著一座石造建物。','Tall trees surround a stone structure in the forest.'],['AX5154a9d1','最終的得獎者站在舞台上，手持獎座。','The eventual winner stands on the stage holding a trophy.']]){
  expect(pack.media.find((r:{assetId:string})=>r.assetId===id).captionZh).toBe(zh);expect(getIllustrationCaption(zh)).toEqual({en,zh});
 }
 expect(hash(readFileSync('public/wordbeast/s/W002875.webp'))).toBe('075a2d49e5547467436e01ec3077c90a1359f6f8e12917fc670825129cca4b75');
 expect(hash(readFileSync('public/wordbeast/s/W003371.webp'))).toBe('4b4351d6bf15b6092223fc35e2d1ff9c86d36494a94b9ac4e8eb17b1271bc5f4');
});
for(const [path,spec]of Object.entries(proof.files))it(`authenticates U05 successor and exact historical bytes: ${path}`,()=>{
 const raw=beforeLV4LaterUnitsText(path,readFileSync(path,'utf8').replace(/\r\n/g,'\n'),5);expect(hash(raw)).toBe(spec.afterHash);
 expect(hash(beforeLV4LaterUnitsText(path,raw,4))).toBe(spec.beforeHash);
 expect(()=>beforeLV4LaterUnitsText(path,raw+' ',4)).toThrow(/complete file drift/);
 const oldest=beforeLV4PublishedText(path,raw);expect(beforeLV4PublishedText(path,oldest)).toBe(oldest);
});
