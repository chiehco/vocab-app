import {readFileSync,writeFileSync} from 'node:fs';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const paths=['LV1-U01-patches.json','LV1-U02-patches.json','LV1-U01-definition-supplement.json','LV1-U03-patches.json','LV1-U03-remaining-patches.json','LV1-U04-patches.json','LV1-U05-patches.json','LV1-U06-patches.json','LV1-U06-syntax-followup.json','LV1-U05-U06-exam-source-followup.json','LV1-U07-patches.json','LV1-U07-hints-followup.json','LV1-U02-U03-lexical-source-followup.json','LV1-U03-cat-definition-followup.json','LV1-U07-verified-exam-source-followup.json','LV1-U08-patches.json'];
const expected={};
for(const path of paths)for(const p of read('docs/unit-audit-20261105/'+path).patches){
 const key=p.dataset+':'+p.id;
 expected[key]??={dataset:p.dataset,id:p.id,after:{}};
 Object.assign(expected[key].after,p.after);
}
const hashes=[read('public/data/v1/meta.json').contentHash,read('public/data/v1/sa-pack.json').meta.contentHash];
writeFileSync('output/playwright/unit-audit/verify-saved.playwright.txt',`async(page)=>{
const expected=${JSON.stringify(Object.values(expected))};
return await page.evaluate(async({expected,hashes})=>{
 const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('VocabContentDB');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
 const get=(store,id)=>new Promise((resolve,reject)=>{const r=db.transaction(store).objectStore(store).get(id);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
 const failures=[];
 for(const item of expected){const actual=await get(item.dataset,item.id);if(!actual||!Object.entries(item.after).every(([k,v])=>JSON.stringify(actual[k])===JSON.stringify(v)))failures.push({item,actual});}
 const meta=await get('meta','current');db.close();
 return {rowsChecked:expected.length,failures,actualContentHash:meta.contentHash,expectedContentHash:hashes.includes(meta.contentHash),progressDatabaseWritten:false};
},{expected,hashes:${JSON.stringify(hashes)}});
}`);
