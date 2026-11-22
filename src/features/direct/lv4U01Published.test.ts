import {expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import evidence from '../../../docs/lv4-releases-20261122/U01.json';
import cards from '../vocabulary/lv4U01ApprovedCards.json';
import {approvedCurriculumCards,approvedCurriculumItem} from '../vocabulary/approvedCurriculum';
import {findUnit} from './model';
import {beforeLV4PublishedText} from './lv4Published.testSupport';
const hash=(b:string|Buffer)=>createHash('sha256').update(b).digest('hex');
it('corrects equipment and labor example POS and all three evidence titles together',()=>{
 const examples=JSON.parse(readFileSync('public/data/v1/examples.json','utf8')) as {exampleId:string;sensePos:string}[];
 expect(examples.find(x=>x.exampleId==='EXcaaa58d7')?.sensePos).toBe('n.');
 expect(examples.find(x=>x.exampleId==='EX86903e4e')?.sensePos).toBe('v.');
 expect(findUnit(1,'LV4')!.items.find(i=>i.learningItemId==='LI-LV4U01-G006')?.pattern).toBe('evidence 的不可數用法');
 for(const [path,spec]of Object.entries(evidence.files)){
  const raw=readFileSync(path,'utf8').replace(/\r\n/g,'\n');expect(hash(raw)).toBe(spec.afterHash);
  expect(hash(beforeLV4PublishedText(path,raw))).toBe(spec.beforeHash);
 }
});
it('rejects unknown complete-file drift instead of accepting a changed old fixture',()=>{
 const path='public/data/v1/examples.json';const raw=readFileSync(path,'utf8').replace(/\r\n/g,'\n');
 expect(()=>beforeLV4PublishedText(path,raw+' ')).toThrow('LV4 U01 complete file drift');
 const data=JSON.parse(raw);data.find((r:{exampleId:string})=>r.exampleId==='EXcaaa58d7').sensePos='adj.';
 expect(()=>beforeLV4PublishedText(path,JSON.stringify(data,null,2)+'\n')).toThrow('LV4 U01 complete file drift');
});
it('reuses the exact17 existing pairs,13 image bytes,stable IDs and read-only scope',()=>{
 const unit=findUnit(1,'LV4')!;expect(cards).toHaveLength(17);expect(evidence.assets).toHaveLength(13);
 for(const asset of evidence.assets)expect(hash(readFileSync(asset.file))).toBe(asset.sha256);
 for(const card of cards){
  expect(unit.items.find(i=>i.learningItemId===card.learningItemId)?.illustration).toEqual(card.illustration);
  expect(approvedCurriculumItem(card.learningItemId)?.illustration).toEqual(card.illustration);
  expect(approvedCurriculumCards(card.displayWord,card.officialWordId)).toContainEqual(card);
  expect(card.imageQuizAllowed).toBe(false);expect(card.secondaryOnGeneralCard).toBe(true);
 }
 expect(unit.items.filter(i=>i.illustration)).toHaveLength(17);expect(unit.questions).toHaveLength(0);
 expect(unit.items.every(i=>i.practiceMode==='read_only')).toBe(true);
});
