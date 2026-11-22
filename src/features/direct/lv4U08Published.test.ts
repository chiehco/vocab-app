import {expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import proof from '../../../docs/lv4-releases-20261122/U08.json';
import {beforeLV4LaterUnitsText,beforeLV4PublishedText,beforeLV4Rows} from './lv4Published.testSupport';
type Row=Record<string,unknown>;
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const data=(name:string)=>JSON.parse(beforeLV4LaterUnitsText(`public/data/v1/${name}.json`,readFileSync(`public/data/v1/${name}.json`,'utf8').replace(/\r\n/g,'\n'),8));
const added=proof.preservedNoteSplit.row;
it('preserves the exact original enrollment material as a separate draft note and keeps the corrected sympathy note approval unchanged',()=>{
 for(const notes of [data('notes'),data('sa-pack').notes]){
  expect(notes.filter((r:Row)=>r.noteId===added.noteId)).toEqual([added]);
  const sympathy=notes.find((r:Row)=>r.noteId==='NXa122016c');expect([sympathy.word,sympathy.title,sympathy.status]).toEqual(['sympathize','sympathize with','approved']);
  expect(sympathy.content).toBe('同情；有同感：sympathize with。相關詞：sympathy、sympathetic；pity。');
 }
 const words=data('words');expect(words).toHaveLength(6090);expect(words.find((r:Row)=>r.wordId==='W005318').word).toBe('enroll');
 expect(words.find((r:Row)=>r.wordId==='W003080').usagePattern).toContain('attach A to B');
 expect(words.find((r:Row)=>r.wordId==='W006059').usagePattern).toBe('an email attachment; form an attachment to N');
 expect(data('meta').counts.notes).toBe(data('notes').length);
});
it('removes only the authenticated successor note from partial old-fixture datasets and rejects altered or duplicate identities',()=>{
 const old={noteId:'unrelated',word:'old',status:'approved'},input=[old,structuredClone(added)],saved=structuredClone(input);
 expect(beforeLV4Rows('notes',input)).toEqual([old]);expect(input).toEqual(saved);
 expect(beforeLV4Rows('notes',[old])).toEqual([old]);
 expect(()=>beforeLV4Rows('notes',[{...added,status:'approved'}])).toThrow(/appended row drift/);
 expect(()=>beforeLV4Rows('notes',[added,added])).toThrow(/appended row identity/);
});
it('retains the route verb sense and pending status and corrects five contextual POS labels',()=>{
 for(const senses of [data('senses'),data('sa-pack').senses]){
  const route=senses.find((r:Row)=>r.senseId==='W003871-2');expect(route.note).toBe('待拆分；主表字義：路徑；途徑；路線；確定路線');expect(route.status).toBe('needs_check');
 }
 for(const examples of [data('examples'),data('sa-pack').examples])for(const [id,pos]of [['EX0a839429','v.'],['EXace3d22d','n.'],['EX8e7246ea','v.'],['EXfac27d36','adj.'],['EXf2e434b9','v.']])expect(examples.find((r:Row)=>r.exampleId===id).sensePos).toBe(pos);
});
for(const [path,spec]of Object.entries(proof.files))it(`authenticates U08 successor, preserved-note inverse and exact prior bytes: ${path}`,()=>{
 const raw=beforeLV4LaterUnitsText(path,readFileSync(path,'utf8').replace(/\r\n/g,'\n'),8);expect(hash(raw)).toBe(spec.afterHash);
 const previous=beforeLV4LaterUnitsText(path,raw,7);expect(hash(previous)).toBe(spec.beforeHash);expect(beforeLV4LaterUnitsText(path,raw,7)).toBe(previous);
 expect(()=>beforeLV4LaterUnitsText(path,raw+' ',7)).toThrow(/complete file drift/);
 const oldest=beforeLV4PublishedText(path,raw);expect(beforeLV4PublishedText(path,oldest)).toBe(oldest);
});
