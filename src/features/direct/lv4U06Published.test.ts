import {expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import proof from '../../../docs/lv4-releases-20261122/U06.json';
import {beforeLV4LaterUnitsText,beforeLV4PublishedText} from './lv4Published.testSupport';
const hash=(text:string)=>createHash('sha256').update(text).digest('hex');
type Row=Record<string,unknown>;
const data=(name:string)=>JSON.parse(beforeLV4LaterUnitsText(`public/data/v1/${name}.json`,readFileSync(`public/data/v1/${name}.json`,'utf8').replace(/\r\n/g,'\n'),6));
it('corrects the textbook furnish and retirement constructions without changing identity or status',()=>{
 for(const rows of [data('words'),data('sa-pack').words]){
  const furnish=rows.find((r:Row)=>r.wordId==='W003438'),retirement=rows.find((r:Row)=>r.wordId==='W006069');
  expect(furnish.word).toBe('furnish');expect(furnish.usagePattern).toBe('furnish a room/house; furnish sb with sth');
  expect(furnish.usagePatternZh).toBe('為房間／房屋配備家具；提供某人某物');
  expect(retirement.word).toBe('retirement');expect(retirement.pos).toBe('n.');
  expect(retirement.usagePattern).toBe('retirement from N; after retirement');expect(retirement.usagePatternZh).toBe('從……退休；退休後');
 }
});
it('keeps answers and English sentences intact while correcting shift POS and colleague translation',()=>{
 for(const rows of [data('examples'),data('sa-pack').examples]){
  const shift=rows.find((r:Row)=>r.exampleId==='EX0d4760ff'),colleague=rows.find((r:Row)=>r.exampleId==='EXd8a495d7');
  expect([shift.word,shift.answer,shift.sensePos,shift.status]).toEqual(['shift','shifted','v.','reviewed']);
  expect(shift.sentenceEn).toBe("Because of the pandemic, people's shopping habits have shifted from stores to online platforms.");
  expect([colleague.word,colleague.answer,colleague.status]).toEqual(['colleague','colleagues','reviewed']);
  expect(colleague.sentenceEn).toBe('I usually have lunch with a few colleagues from the office.');expect(colleague.sentenceZh).toBe('我通常和辦公室的幾位同事一起吃午餐。');
 }
});
it('preserves the existing Norway lie-on example as a contrast, without claiming textbook origin for the authored lie-in example',()=>{
 for(const rows of [data('notes'),data('sa-pack').notes]){
  const note=rows.find((r:Row)=>r.noteId==='NXdb65bfdf');
  expect([note.word,note.title,note.status]).toEqual(['lie','lie in...','approved']);
  expect(note.content).toBe('在於……。原創例句：The problem lies in our lack of time.（問題在於我們時間不足。）\n比較 lie on（位於……）：原有例句 My hometown lies on the west coast of Norway.（我的家鄉位於挪威的西海岸。）');
 }
});
for(const [path,spec]of Object.entries(proof.files))it(`authenticates U06 successor and exact prior bytes: ${path}`,()=>{
 const raw=beforeLV4LaterUnitsText(path,readFileSync(path,'utf8').replace(/\r\n/g,'\n'),6);expect(hash(raw)).toBe(spec.afterHash);
 const previous=beforeLV4LaterUnitsText(path,raw,5);expect(hash(previous)).toBe(spec.beforeHash);
 expect(beforeLV4LaterUnitsText(path,raw,5)).toBe(previous);expect(()=>beforeLV4LaterUnitsText(path,raw+' ',5)).toThrow(/complete file drift/);
 const oldest=beforeLV4PublishedText(path,raw);expect(beforeLV4PublishedText(path,oldest)).toBe(oldest);
});
