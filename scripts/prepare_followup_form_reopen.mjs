import assert from 'node:assert/strict';
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
const batch=process.argv[2];
const facts=JSON.parse(readFileSync('docs/unit-audit-20261105/VERIFIED-FOLLOWUP-VERB-FORMS-SOURCES.json','utf8')).facts.filter(f=>f.batch===batch);
assert.ok(facts.length,'Known applied batch required');
const examples=JSON.parse(readFileSync('public/data/v1/examples.json','utf8')).filter(row=>
  ['approved','reviewed','draft','needs_check'].includes(row.status)
  && (row.distributionScope===undefined||row.distributionScope==='public_ok')&&row.active!==false);
const expectedExamples=Object.fromEntries(facts.map(f=>[f.word,examples.filter(e=>e.word===f.word).map(e=>({sentenceEn:e.sentenceEn,sentenceZh:e.sentenceZh||''}))]));
const out='output/playwright/verified-followups';
mkdirSync(out,{recursive:true});
writeFileSync(`${out}/${batch}-reopen.playwright.txt`,`async(page)=>{
 const results=[];
 await page.setViewportSize({width:1000,height:900});
 for(const fact of ${JSON.stringify(facts)}){
  await page.goto('http://127.0.0.1:5187/#/word/'+fact.wordId);
  await page.getByRole('heading',{name:fact.word,exact:true}).waitFor();
  const panel=page.locator('.recorded-verb-forms');await panel.waitFor();
  const expected=[fact.verbForms.base,fact.verbForms.past,fact.verbForms.pastParticiple];
  const actual=await panel.locator('dd').allTextContents();
  if(JSON.stringify(actual)!==JSON.stringify(expected))throw Error('Visible forms mismatch '+fact.word);
  const saved=await page.evaluate(id=>new Promise((resolve,reject)=>{
   const request=indexedDB.open('VocabContentDB');request.onerror=()=>reject(request.error);
   request.onsuccess=()=>{const db=request.result;const tx=db.transaction('words','readonly');const get=tx.objectStore('words').get(id);get.onsuccess=()=>resolve(get.result);get.onerror=()=>reject(get.error);tx.oncomplete=()=>db.close();};
  }),fact.wordId);
  if(JSON.stringify(saved.verbForms)!==JSON.stringify(fact.verbForms))throw Error('Saved database forms mismatch '+fact.word);
  const image=page.locator('.study-illustration img');
  if(await image.count())await image.evaluate(img=>img.decode());
  const images=await image.evaluateAll(imgs=>imgs.map(img=>({src:img.getAttribute('src'),loaded:img.complete&&img.naturalWidth>0,width:img.naturalWidth,height:img.naturalHeight})));
  if(images.some(img=>!img.loaded))throw Error('Existing illustration failed '+fact.word);
  const caption=await page.locator('.study-illustration figcaption').allTextContents();
  const screenshot='${out}/'+fact.wordId+'-card.png';await page.screenshot({path:screenshot,fullPage:true});
  await page.getByRole('button',{name:'字義',exact:true}).click();
  const meaningForms=await page.locator('.recorded-verb-forms dd').allTextContents();
  if(JSON.stringify(meaningForms)!==JSON.stringify(expected))throw Error('Meaning panel forms mismatch '+fact.word);
  const exampleRows=page.locator('.dossier-examples li');
  const expectedExamples=${JSON.stringify(expectedExamples)}[fact.word];
  if(expectedExamples.length)await exampleRows.first().waitFor();
  const visibleExamples=await exampleRows.evaluateAll(rows=>rows.map(row=>({sentenceEn:row.querySelector('p')?.textContent||'',sentenceZh:row.querySelector('div > span')?.textContent||''})));
  const normalized=rows=>rows.map(row=>JSON.stringify(row)).sort();
  if(JSON.stringify(normalized(visibleExamples))!==JSON.stringify(normalized(expectedExamples)))throw Error('Published examples mismatch '+fact.word);
  const usageButton=page.getByRole('button',{name:'搭配',exact:true});let usage={present:false};
  if(await usageButton.count()){
   await usageButton.click();const text=await page.locator('main').innerText();
   const usageScreenshot='${out}/'+fact.wordId+'-usage.png';await page.screenshot({path:usageScreenshot,fullPage:true});
   usage={present:true,text,screenshot:usageScreenshot};
  }
  results.push({wordId:fact.wordId,word:fact.word,savedForms:saved.verbForms,actual,meaningForms,images,caption,visibleExamples,usage,screenshot,verified:true});
 }
 // Keep native Windows console code pages from corrupting evidence JSON.
 return page.evaluate(value=>btoa(unescape(encodeURIComponent(JSON.stringify(value)))),{batch:${JSON.stringify(batch)},origin:new URL(page.url()).origin,reopened:results.length,results});
}`);
console.log(JSON.stringify({batch,cards:facts.length,file:`${out}/${batch}-reopen.playwright.txt`}));
