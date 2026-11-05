import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
const batch=process.argv[2];
const root='docs/unit-audit-20261105/';
const read=path=>JSON.parse(readFileSync(path,'utf8'));
const current=read(root+`LV1-${batch}-verified-forms-patches.json`);
const prior=read(root+'VERIFIED-FOLLOWUP-VERB-FORMS-SOURCES.json').facts.filter(f=>f.batch!==batch);
const original=read(root+'VERIFIED-VERB-FORMS-SOURCES.json').facts;
const house=read('public/data/v1/words.json').filter(w=>w.word==='house');
assert.equal(house.length,1);
const targets=current.patches.map(p=>p.id);
const protectedIds=[...original,...prior,...house].map(f=>f.wordId);
const out=`output/verified-followups/${batch}-progress-snapshot.playwright.txt`;
writeFileSync(out,`async(page)=>page.evaluate(async({targets,protectedIds})=>{
 const readDB=name=>new Promise((resolve,reject)=>{
  const open=indexedDB.open(name);open.onerror=()=>reject(open.error);
  open.onsuccess=()=>{const db=open.result;const names=Array.from(db.objectStoreNames);const tx=db.transaction(names,'readonly');const rows={};
   for(const name of names){const get=tx.objectStore(name).getAll();get.onsuccess=()=>{rows[name]=get.result;};}
   tx.oncomplete=()=>{db.close();resolve(rows);};tx.onerror=()=>{db.close();reject(tx.error);};
  };
 });
 const hash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value))))).map(b=>b.toString(16).padStart(2,'0')).join('');
 const progress=await readDB('VocabProgressDB');const content=await readDB('VocabContentDB');
 return {checkedAt:new Date().toISOString(),origin:location.origin,url:location.href,
  meta:content.meta.find(row=>row.key==='current'),contentWords:content.words.length,
  targets:targets.map(id=>{const row=content.words.find(row=>row.wordId===id);return {wordId:id,present:!!row,formsPresent:row?Object.hasOwn(row,'verbForms'):false,forms:row?.verbForms??null};}),
  protectedWordCount:protectedIds.length,protectedWordsSha256:await hash(protectedIds.map(id=>content.words.find(row=>row.wordId===id))),
  progress:await Promise.all(Object.keys(progress).sort().map(async table=>({table,count:progress[table].length,sha256:await hash(progress[table])})))
 };
},${JSON.stringify({targets,protectedIds})})`);
console.log(JSON.stringify({batch,targets:targets.length,protectedWords:protectedIds.length,file:out}));
