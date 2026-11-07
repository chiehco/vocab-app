import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {expect,it} from 'vitest';
import manifest from '../../../docs/lv3-audit-20261107/U01-patches.json';
import {lv3Unit1BeforeAudit,lv3Unit1Patches,lv3Unit1BeforePublishedText} from './lv3Unit1Audit.testSupport';
import {lv3AfterUnit1File} from './lv3Audit.testSupport';

type Row=Record<string,unknown>;
const paths:Record<string,string>={words:'public/data/v1/words.json',senses:'public/data/v1/senses.json',examples:'public/data/v1/examples.json',notes:'public/data/v1/notes.json',curriculum:'src/features/direct/curriculum.json',grammarQuestions:'src/features/direct/grammarQuestions.json'};
// These checkpoint hashes were read before the U01 patch, at commit 9988375.
// They supplement, and do not replace, any LV1/LV2 historical fixtures.
const checkpoint:Record<string,string>={words:'df0980b25d68203e1cdcdd89554c854763ea9ea9b517e57e0aab51f689b1523f',senses:'3aa3604943243a98042914453bc34d86896c2daf40baa03b275bd548da847e56',examples:'84f406a3f2dffd9394536c2ce6baa96f21f605a0008f4ca64426dec08ce357cc',notes:'ea1a679d1d6531f96df4645aa098ffb3ec8456a347349a50054550f3b5685a71',curriculum:'bc32356e19ffdcd5f6a460304da0d83af8e8af0167941ed7009f4a72328487a0',grammarQuestions:'fe57e3ed98394c04cda1db8cfd183507992f738b771c4b108636a38398692934'};
const hash=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const read=(name:string)=>lv3AfterUnit1File(paths[name],JSON.parse(readFileSync(paths[name],'utf8')));
const rowsOf=(name:string,value:unknown)=>(name==='curriculum'?(value as Row).learningItems:value) as Row[];
const wrap=(name:string,rows:Row[])=>name==='curriculum'?{learningItems:rows}:rows;

it('reverses the exact U01 delta to independently captured checkpoints without replacing historical fixtures',()=>{
 const proofs=manifest.datasets as Record<string,{beforeHash:string;afterHash:string}>;
 for(const name of Object.keys(paths)){
  const current=read(name),original=structuredClone(current),old=lv3Unit1BeforeAudit(name,current);
  expect(hash(old),name).toBe(checkpoint[name]);expect(current).toEqual(original);
  if(proofs[name]){expect(proofs[name].beforeHash).toBe(checkpoint[name]);expect(hash(current)).toBe(proofs[name].afterHash);}
 }
 expect(new Set(lv3Unit1Patches.map(p=>p.dataset+':'+p.id)).size).toBe(lv3Unit1Patches.length);
});

it('rejects after-field drift and all unlisted drift on an audited row, rather than masking it',()=>{
 for(const p of lv3Unit1Patches){
  const good={...p.before,...p.after};
  for(const key of Object.keys(p.after)){
   expect(()=>lv3Unit1BeforeAudit(p.dataset,wrap(p.dataset,[{...good,[key]:'unrecorded'}]),{allowMissing:true})).toThrow();
  }
  expect(()=>lv3Unit1BeforeAudit(p.dataset,wrap(p.dataset,[{...good,unrecordedField:true}]),{allowMissing:true})).toThrow('exact audited row');
  const untouched=Object.keys(p.before).find(k=>k!==p.key&&!Object.hasOwn(p.after,k));
  if(untouched)expect(()=>lv3Unit1BeforeAudit(p.dataset,wrap(p.dataset,[{...good,[untouched]:'unrecorded'}]),{allowMissing:true})).toThrow('exact audited row');
  const old=rowsOf(p.dataset,lv3Unit1BeforeAudit(p.dataset,wrap(p.dataset,[good]),{allowMissing:true}))[0];
  expect(old).toEqual(p.before);
  for(const key of Object.keys(p.after).filter(k=>!Object.hasOwn(p.before,k)))expect(Object.hasOwn(old,key)).toBe(false);
 }
});

it('requires exact identities, rejects duplicates, and permits omission only for explicit starter subsets',()=>{
 for(const name of new Set(lv3Unit1Patches.map(p=>p.dataset))){
  const current=read(name),p=lv3Unit1Patches.find(p=>p.dataset===name)!;
  const missing=structuredClone(current),rows=rowsOf(name,missing),i=rows.findIndex(r=>r[p.key]===p.id);
  rows.splice(i,1);expect(()=>lv3Unit1BeforeAudit(name,missing)).toThrow('recorded identity');
  const changedId=structuredClone(current);rowsOf(name,changedId).find(r=>r[p.key]===p.id)![p.key]='unrecorded';
  expect(()=>lv3Unit1BeforeAudit(name,changedId)).toThrow('recorded identity');
  const duplicate=structuredClone(current);rowsOf(name,duplicate).push(structuredClone(rowsOf(name,current).find(r=>r[p.key]===p.id)!));
  expect(()=>lv3Unit1BeforeAudit(name,duplicate,{allowMissing:true})).toThrow('duplicate');
  expect(lv3Unit1BeforeAudit(name,wrap(name,[]),{allowMissing:true})).toEqual(wrap(name,[]));
  expect(hash(lv3Unit1BeforeAudit(name,missing,{allowMissing:true}))).not.toBe(checkpoint[name]);
 }
});

it('exposes untouched rows, additions, order changes and curriculum template mutations to the checkpoint',()=>{
 for(const name of new Set(lv3Unit1Patches.map(p=>p.dataset))){
  const current=read(name),auditIds=new Set(lv3Unit1Patches.filter(p=>p.dataset===name).map(p=>p.id));
  const key=lv3Unit1Patches.find(p=>p.dataset===name)!.key;
  for(const mode of ['unlisted','extra','order','removed']){
   const bad=structuredClone(current),rows=rowsOf(name,bad);
   const i=rows.findIndex(r=>!auditIds.has(r[key] as string));assert.ok(i>=0);
   if(mode==='unlisted')rows[i].unrecordedField=true;
   if(mode==='extra')rows.push({[key]:'UNRECORDED'});
   if(mode==='order')rows.reverse();
   if(mode==='removed')rows.splice(i,1);
   expect(hash(lv3Unit1BeforeAudit(name,bad))).not.toBe(checkpoint[name]);
  }
 }
 const changed=read('curriculum');changed.template.unrecordedField=true;
 expect(hash(lv3Unit1BeforeAudit('curriculum',changed))).not.toBe(checkpoint.curriculum);
});

it('keeps six individually sourced forms genuinely absent before U01 and preserves word identities, POS and status',()=>{
 const forms=lv3Unit1Patches.filter(p=>p.dataset==='words'&&Object.hasOwn(p.after,'verbForms'));
 expect(forms.map(p=>p.before.word).sort()).toEqual(['determine','locate','process','rate','recognize','unify']);
 for(const p of forms){expect(Object.hasOwn(p.before,'verbForms')).toBe(false);const v=p.after.verbForms as Row;expect(v.base).toBe(p.before.word);expect(v.past).toBeTruthy();expect(v.pastParticiple).toBeTruthy();expect(v.sourceRef).toMatch(/^https:\/\//);}
 for(const p of lv3Unit1Patches.filter(p=>p.dataset==='words'))for(const key of ['wordId','word','wordVariants','pos','posAll','status'])expect(Object.hasOwn(p.after,key)).toBe(false);
 expect(lv3Unit1Patches.filter(p=>p.dataset==='senses')).toEqual([]);
});

it('retains original cloze reconstruction and exact authored question identities after the corrections',()=>{
 const curriculum=read('curriculum');expect(curriculum.learningItems).toHaveLength(176);
 expect(curriculum.learningItems.filter((r:Row)=>r.kind==='vocabulary')).toHaveLength(123);
 expect(curriculum.learningItems.filter((r:Row)=>r.kind==='grammar')).toHaveLength(53);
 for(const row of curriculum.learningItems){const e=row.originalExample;if(e)expect(e.blankSentence.replace('_____',e.answer)).toBe(e.sentenceEn);}
 const grammar=read('grammarQuestions');
 for(const p of lv3Unit1Patches.filter(p=>p.dataset==='grammarQuestions')){const row=grammar.find((r:Row)=>r[p.key]===p.id);expect(row[p.key]).toBe(p.before[p.key]);expect(row.options.filter((o:Row)=>o.id===row.answer)).toHaveLength(1);expect(new Set(row.options.map((o:Row)=>o.text)).size).toBe(row.options.length);}
});

it('preserves independent raw publication guards and rejects metadata or formatting drift',()=>{
 for(const name of ['meta','sa-pack']){
  const path='public/data/v1/'+name+'.json',raw=readFileSync(path,'utf8').replace(/\r\n/g,'\n');
  const value=JSON.parse(raw),meta=name==='meta'?value:value.meta;
  meta.generatedAt='unrecorded';
  expect(()=>lv3Unit1BeforePublishedText(path,JSON.stringify(value,null,name==='sa-pack'?undefined:2)+'\n')).toThrow('metadata');
  expect(()=>lv3Unit1BeforePublishedText(path,raw+' ')).toThrow('formatting');
 }
 const path='public/data/v1/sa-pack.json',raw=readFileSync(path,'utf8').replace(/\r\n/g,'\n');
 const value=JSON.parse(raw),old=lv3Unit1BeforePublishedText(path,raw);
 value.words[0].unrecordedField=true;
 expect(lv3Unit1BeforePublishedText(path,JSON.stringify(value)+'\n')).not.toBe(old);
});
