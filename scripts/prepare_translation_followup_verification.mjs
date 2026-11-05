import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const root='docs/unit-audit-20261105/';
const facts=read(root+'VERIFIED-FOLLOWUP-TRANSLATION-SOURCES.json').facts;
assert.equal(facts.length,2);
const protectedIds=[...read(root+'VERIFIED-VERB-FORMS-SOURCES.json').facts,...read(root+'VERIFIED-FOLLOWUP-VERB-FORMS-SOURCES.json').facts,...read('public/data/v1/words.json').filter(w=>w.word==='house')].map(f=>f.wordId);
assert.equal(new Set(protectedIds).size,131);
const protectedExamples=read(root+'VERIFIED-TRANSLATION-SOURCES.json').facts.map(f=>f.exampleId);
const out='output/verified-followups/translations';mkdirSync(out,{recursive:true});
const snapshots={targets:facts.map(f=>f.exampleId),protectedIds,protectedExamples};
writeFileSync(out+'/snapshot.playwright.txt',`async(page)=>{const snapshot=await page.evaluate(async({targets,protectedIds,protectedExamples})=>{
 const readDB=name=>new Promise((resolve,reject)=>{const r=indexedDB.open(name);r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result;const names=Array.from(db.objectStoreNames);const tx=db.transaction(names,'readonly');const rows={};for(const n of names){const q=tx.objectStore(n).getAll();q.onsuccess=()=>{rows[n]=q.result;};}tx.oncomplete=()=>{db.close();resolve(rows);};tx.onerror=()=>reject(tx.error);};});
 const hash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value))))).map(b=>b.toString(16).padStart(2,'0')).join('');
 const progress=await readDB('VocabProgressDB'),content=await readDB('VocabContentDB');
 return {checkedAt:new Date().toISOString(),origin:location.origin,contentWords:content.words.length,meta:content.meta.find(x=>x.key==='current'),targets:targets.map(id=>content.examples.find(e=>e.exampleId===id)),protectedWordCount:protectedIds.length,protectedWordsSha256:await hash(protectedIds.map(id=>content.words.find(w=>w.wordId===id))),protectedExampleCount:protectedExamples.length,protectedExamplesSha256:await hash(protectedExamples.map(id=>content.examples.find(e=>e.exampleId===id))),progress:await Promise.all(Object.keys(progress).sort().map(async table=>({table,count:progress[table].length,sha256:await hash(progress[table])}))),settings:progress.settings};
},${JSON.stringify(snapshots)});return page.evaluate(v=>btoa(unescape(encodeURIComponent(JSON.stringify(v)))),snapshot);}`);
const expected=read('public/data/v1/examples.json').filter(e=>facts.some(f=>f.exampleId===e.exampleId));
writeFileSync(out+'/reopen.playwright.txt',`async(page)=>{
 await page.setViewportSize({width:1000,height:1000});const results=[];
 for(const fact of ${JSON.stringify(facts)}){
  await page.goto('http://127.0.0.1:5187/#/word/'+fact.wordId);
  await page.getByRole('heading',{name:fact.word,exact:true}).waitFor();
  const images=page.locator('.study-illustration img');await images.evaluateAll(imgs=>Promise.all(imgs.map(img=>img.decode())));
  const imageRows=await images.evaluateAll(imgs=>imgs.map(img=>({src:img.getAttribute('src'),loaded:img.complete&&img.naturalWidth>0,width:img.naturalWidth,height:img.naturalHeight})));
  if(imageRows.length!==1||imageRows.some(img=>!img.loaded))throw Error('Existing illustration missing '+fact.word);
  const caption=await page.locator('.study-illustration figcaption').innerText();
  const cardScreenshot='${out}/'+fact.word+'-card.png';await page.screenshot({path:cardScreenshot,fullPage:true,animations:'disabled'});
  await page.getByRole('button',{name:'字義',exact:true}).click();
  const target=page.locator('.dossier-examples li').filter({has:page.getByText(fact.sentenceEn,{exact:true})});await target.waitFor();
  if(await target.count()!==1)throw Error('Example identity ambiguous '+fact.exampleId);
  const sentenceEn=await target.locator('p').innerText();const sentenceZh=await target.locator('div > span').innerText();
  if(sentenceEn!==fact.sentenceEn||sentenceZh!==fact.after)throw Error('Visible corrected example mismatch '+fact.exampleId);
  const exampleScreenshot='${out}/'+fact.exampleId+'-example.png';await target.screenshot({path:exampleScreenshot,animations:'disabled'});
  const saved=await page.evaluate(id=>new Promise((resolve,reject)=>{const r=indexedDB.open('VocabContentDB');r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result;const tx=db.transaction('examples','readonly');const q=tx.objectStore('examples').get(id);q.onsuccess=()=>resolve(q.result);tx.oncomplete=()=>db.close();};}),fact.exampleId);
  const expected=${JSON.stringify(expected)}.find(e=>e.exampleId===fact.exampleId);
  if(JSON.stringify(saved)!==JSON.stringify(expected))throw Error('Saved full example differs '+fact.exampleId);
  await page.getByRole('button',{name:'搭配',exact:true}).click();const usageText=await page.locator('main').innerText();
  const usageScreenshot='${out}/'+fact.word+'-usage.png';await page.screenshot({path:usageScreenshot,fullPage:true,animations:'disabled'});
  results.push({wordId:fact.wordId,word:fact.word,exampleId:fact.exampleId,sentenceEn,sentenceZh,saved,images:imageRows,caption,usageText,cardScreenshot,exampleScreenshot,usageScreenshot,verified:true});
 }
 return page.evaluate(v=>btoa(unescape(encodeURIComponent(JSON.stringify(v)))),{origin:new URL(page.url()).origin,reopened:results.length,results});
}`);
console.log(JSON.stringify({targets:2,protectedWords:131,protectedExamples:5,out}));
