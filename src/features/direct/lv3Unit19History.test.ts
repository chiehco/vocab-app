import 'fake-indexeddb/auto';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {expect,it} from 'vitest';
import {findUnit} from './model';
import {originalUnit19Items} from './lv3Unit19History.testSupport';
import {lv3AfterUnitPublishedText} from './lv3Audit.testSupport';
const unit=findUnit(19,'LV3')!;
const path='src/features/direct/curriculumLV3Unit19.json';
const lf=(text:string)=>text.replaceAll(String.fromCharCode(13,10),String.fromCharCode(10));
it('authenticates all150 current U19 items and protects original counts/mappings',()=>{
 const current=JSON.parse(readFileSync(path,'utf8'));
 expect(unit.items).toEqual(current.learningItems);expect(unit.items).toHaveLength(150);
 expect(unit.items.filter(i=>i.kind==='vocabulary')).toHaveLength(109);expect(unit.items.filter(i=>i.kind==='grammar')).toHaveLength(41);
 expect(unit.items.filter(i=>i.kind==='vocabulary'&&!i.officialWordId)).toHaveLength(30);
 expect(new Set(unit.items.filter(i=>i.officialWordId).map(i=>i.officialWordId)).size).toBe(78);
 const original=originalUnit19Items(unit.items);expect(original).toHaveLength(150);
 expect(original.filter(i=>i.meaningSource==='unmapped_supplement')).toHaveLength(26);
 expect(original.filter(i=>i.meaningSource==='unmapped_supplement').every(i=>i.targetMeaningZh==='教材補充詞；義項待核對。')).toBe(true);
});
it.each(['changed','omitted','reordered','extra'] as const)('rejects %s current caller rows before historical projection',kind=>{
 let value=structuredClone(unit.items);
 if(kind==='changed')value[0].targetMeaningZh='unrecorded';
 else if(kind==='omitted')value=value.slice(1);else if(kind==='reordered')value.reverse();else value.push(structuredClone(value[0]));
 expect(()=>originalUnit19Items(value)).toThrow(/Installed U19 items differ/);
});
it('keeps the independently captured original U19 raw publication hash',()=>{
 const text=lf(readFileSync(path,'utf8'));
 const before=lv3AfterUnitPublishedText('LV3-U18',path,text);
 expect(createHash('sha256').update(before).digest('hex')).toBe('4facbd0a9f9a1f9d74a47323b6b4bb3ed6a33a5a79dbba356a30a1caa60586ec');
});
it.each(['raw','semantic'] as const)('rejects unknown current U19 %s drift',kind=>{
 const text=lf(readFileSync(path,'utf8'));
 const changed=kind==='raw'?text+' ':JSON.stringify({...JSON.parse(text),unrecorded:true},null,2)+String.fromCharCode(10);
 expect(()=>lv3AfterUnitPublishedText('LV3-U18',path,changed)).toThrow();
});
it('preserves source identity/order, mappings, review/practice, examples and art boundaries',()=>{
 const original=originalUnit19Items(unit.items);
 const keys=['learningItemId','kind','displayWord','lexemeRef','officialWordId','officialSenseId','sourcePage','sourceRole','printedNumber','printedLabel','review','practiceMode','pattern','originalExample','originalExamples','illustration'];
 const metadata=(rows:typeof unit.items)=>rows.map(row=>Object.fromEntries(keys.filter(key=>Object.hasOwn(row,key)).map(key=>[key,(row as unknown as Record<string,unknown>)[key]])));
 expect(metadata(unit.items)).toEqual(metadata(original));
 expect(new Set(unit.items.map(i=>i.learningItemId)).size).toBe(150);
});
