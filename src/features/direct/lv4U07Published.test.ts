import {expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import proof from '../../../docs/lv4-releases-20261122/U07.json';
import {beforeLV4LaterUnitsText,beforeLV4PublishedText} from './lv4Published.testSupport';
import {getIllustrationCaption} from '../wordbeast/illustrationCaptions';
type Row=Record<string,unknown>;
const hash=(s:string|Buffer)=>createHash('sha256').update(s).digest('hex');
const data=(name:string)=>JSON.parse(beforeLV4LaterUnitsText(`public/data/v1/${name}.json`,readFileSync(`public/data/v1/${name}.json`,'utf8').replace(/\r\n/g,'\n'),7));
it('retains every legitimate content construction while placing the reflexive verb under content rather than noun-only contentment',()=>{
 for(const words of [data('words'),data('sa-pack').words]){
  const content=words.find((r:Row)=>r.wordId==='W003207'),ment=words.find((r:Row)=>r.wordId==='W003208');
  expect(content.pos).toBe('n./adj./v.');expect(content.posAll).toEqual(['n.','adj.','v.']);
  expect(content.usagePattern).toBe('the content(s) of N; table of contents; be content with N; content oneself with + N');
  expect(content.usagePatternZh).toBe('……的內容；目錄；對某事感到滿足；使自己滿足於……');
  expect(ment.pos).toBe('n.');expect(ment.usagePattern).toBe('a sense of contentment');expect(ment.usagePatternZh).toBe('一種滿足感');
  expect(words.find((r:Row)=>r.wordId==='W003223').usagePattern).toBe('cooperate with sb; cooperate to V');
  const constitute=words.find((r:Row)=>r.wordId==='W003197');expect(constitute.usagePattern).toBe('constitute N (a part/a majority/a threat); constitute a committee');
  expect(constitute.usagePatternZh).toBe('構成某一部分／多數／威脅；組成委員會');
 }
});
it('corrects the five contextual example POS labels without changing answers or review status',()=>{
 for(const examples of [data('examples'),data('sa-pack').examples]){
  for(const [id,pos,answer]of [['EXd43428dd','v.','paced'],['EX97a17afc','adj.','content'],['EXae4c40da','v.','sheltered'],['EXafa2650e','v.','sited'],['EX5856d00d','v.','boomed']]){
   const example=examples.find((r:Row)=>r.exampleId===id);expect([example.sensePos,example.answer,example.status]).toEqual([pos,answer,'reviewed']);
  }
 }
});
it('uses the existing found and pursue pictures with accurate captions and preserves find-past and marine-career teaching',()=>{
 expect(getIllustrationCaption('豆豆掀開盒子，找到了藏著的莓果。')?.en).toBe('Doudou lifted the overturned box and found a hidden berry.');
 const zh='豆豆出發追求海洋生物學的職涯。';expect(getIllustrationCaption(zh)).toEqual({en:'Doudou sets off to pursue a career in marine biology.',zh});
 expect(data('media').find((r:Row)=>r.assetId==='AX8c7a1322').captionZh).toBe(zh);
 expect(data('examples').find((r:Row)=>r.exampleId==='EX4dbe84ff').sentenceEn).toBe('He left his hometown to pursue a career in marine biology.');
 expect(hash(readFileSync('public/wordbeast/a/W001382.webp'))).toBe('b2ca4869863ddc870e0aeab2c3d29708aaeede55cb8477ab03777479c8dd7142');
 expect(hash(readFileSync('public/wordbeast/s/W003798.webp'))).toBe('94c9420620d32d6449b6d51a6012ed8c9cf608544db6fc247bdf9b9f60b95cbd');
});
for(const [path,spec]of Object.entries(proof.files))it(`authenticates U07 successor and exact prior bytes: ${path}`,()=>{
 const raw=beforeLV4LaterUnitsText(path,readFileSync(path,'utf8').replace(/\r\n/g,'\n'),7);expect(hash(raw)).toBe(spec.afterHash);
 const prior=beforeLV4LaterUnitsText(path,raw,6);expect(hash(prior)).toBe(spec.beforeHash);expect(beforeLV4LaterUnitsText(path,raw,6)).toBe(prior);
 expect(()=>beforeLV4LaterUnitsText(path,raw+' ',6)).toThrow(/complete file drift/);
 const oldest=beforeLV4PublishedText(path,raw);expect(beforeLV4PublishedText(path,oldest)).toBe(oldest);
});
