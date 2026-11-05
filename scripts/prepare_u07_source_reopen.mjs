import {readFileSync,writeFileSync} from 'node:fs';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const manifest=read('docs/unit-audit-20261105/LV1-U07-verified-exam-source-followup.json');
const source=read('output/unit-audit-20261105/LV1-U07-full-source.json');
const ids=new Set(manifest.patches.filter(p=>p.dataset==='senses').map(p=>p.id.split('-')[0]));
writeFileSync('output/unit-audit-20261105/U07-verified-source-cards.json',JSON.stringify(source.filter(c=>ids.has(c.officialWordId)),null,2)+'\n');
const senses=manifest.patches.filter(p=>p.dataset==='senses').map(p=>({...p,word:source.find(c=>c.officialWordId===p.id.split('-')[0]).word}));
writeFileSync('output/playwright/unit-audit/u07-verified-senses.playwright.txt',`async(page)=>{
 const expected=${JSON.stringify(senses)};
 const results=[];
 for(const p of expected){
  const wordId=p.id.split('-')[0];
  await page.goto('http://127.0.0.1:5179/#/word/'+wordId);
  await page.getByRole('heading',{name:p.word,exact:true}).waitFor();
  const main=page.locator('main');await main.waitFor();
  await page.getByRole('button',{name:'字義',exact:true}).click();
  await page.waitForFunction(text=>document.querySelector('main')?.innerText.includes(text),p.after.meaningZh);
  const stored=await page.evaluate(async id=>{const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('VocabContentDB');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});const row=await new Promise((resolve,reject)=>{const r=db.transaction('senses').objectStore('senses').get(id);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});db.close();return row;},p.id);
  const mismatches=Object.keys(p.after).filter(k=>JSON.stringify(stored[k])!==JSON.stringify(p.after[k]));
  const screenshot='output/playwright/unit-audit/'+p.id+'-source-verified.png';
  await page.screenshot({path:screenshot,fullPage:true});
  results.push({id:p.id,meaningVisible:(await main.innerText()).includes(p.after.meaningZh),savedFieldMismatches:mismatches,screenshot,scope:'Specific sense meaning visible; full source URLs and note are verified from saved DB because this existing UI does not render those long fields.'});
 }
 return results;
}`);
console.log(JSON.stringify({specificSenses:senses.length,generalCards:ids.size}));
