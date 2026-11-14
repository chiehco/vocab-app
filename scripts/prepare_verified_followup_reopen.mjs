import {readFileSync,writeFileSync} from 'node:fs';
const read=p=>JSON.parse(readFileSync(p,'utf8')),root='docs/unit-audit-20261105/';
const manifests=['LV1-U08-hints-followup.json','LV1-verified-translations-followup.json','LV1-U01-U02-verb-forms-followup.json'].map(n=>read(root+n));
const words=read('public/data/v1/words.json'),examples=read('public/data/v1/examples.json'),ids=new Set();
for(const m of manifests)for(const p of m.patches)ids.add(p.dataset==='words'?p.id:words.find(w=>w.word===examples.find(e=>e.exampleId===p.id).word).wordId);
const data=[...ids].map(id=>{const w=words.find(w=>w.wordId===id);return{...w,examples:examples.filter(e=>e.word===w.word),changedExamples:manifests.flatMap(m=>m.patches).filter(p=>p.dataset==='examples'&&examples.find(e=>e.exampleId===p.id).word===w.word).map(p=>p.id),formsExpected:manifests[2].patches.some(p=>p.id===id)};});
const start=Number(process.argv[2]??1),end=Number(process.argv[3]??data.length),batch=data.slice(start-1,end);
writeFileSync('output/playwright/unit-audit/verified-followup-reopen.playwright.txt',`async(page)=>{
 const results=[];for(const card of ${JSON.stringify(batch)}){
  await page.goto('http://127.0.0.1:5179/#/word/'+card.wordId);await page.getByRole('heading',{name:card.word,exact:true}).waitFor();
  if(card.formsExpected)await page.waitForFunction(()=>document.querySelector('.recorded-verb-forms dd'));
  await page.waitForTimeout(200);
  if(await page.locator('.study-illustration img').count()){
   await page.waitForFunction(()=>[...document.querySelectorAll('.study-illustration img')].every(i=>i.complete&&i.naturalWidth>0));
   await page.locator('.study-illustration img').evaluateAll(xs=>Promise.all(xs.map(i=>i.decode())));
  }
  const images=await page.locator('.study-illustration img').evaluateAll(xs=>xs.map(i=>({src:i.src,complete:i.complete,width:i.naturalWidth,height:i.naturalHeight})));
  const forms=await page.locator('.recorded-verb-forms dd').allTextContents();const formsMatch=!card.formsExpected||JSON.stringify(forms)===JSON.stringify([card.verbForms.base,card.verbForms.past,card.verbForms.pastParticiple]);
  const hero=await page.locator('main').innerText(),heroScreenshot='output/playwright/unit-audit/followup-'+card.wordId+'-hero.png';await page.screenshot({path:heroScreenshot,fullPage:true});
  await page.getByRole('button',{name:'字義',exact:true}).click();await page.waitForFunction(n=>document.querySelectorAll('.dossier-examples li').length===n,card.examples.length);
  await page.waitForTimeout(200);
  const actual=await page.locator('.dossier-examples li').evaluateAll(xs=>xs.map(li=>({en:li.querySelector('p')?.innerText,zh:li.querySelector('div>span')?.innerText,labels:[...li.querySelectorAll('small')].map(s=>s.innerText)})));
  const mismatches=card.examples.filter(e=>!actual.some(a=>a.en===e.sentenceEn&&a.zh===(e.sentenceZh??undefined)&&(!card.changedExamples.includes(e.exampleId)||!e.meaningHint||a.labels.some(s=>s.includes(e.meaningHint))))).map(e=>e.exampleId);
  const screenshot='output/playwright/unit-audit/followup-'+card.wordId+'-examples.png';await page.screenshot({path:screenshot,fullPage:true});
  results.push({wordId:card.wordId,word:card.word,url:page.url(),formsExpected:card.formsExpected,forms,formsMatch,images,hero,heroScreenshot,screenshot,exampleCount:actual.length,changedExamples:card.changedExamples,mismatches,examples:actual});
 }return results;
}`);
writeFileSync('output/unit-audit-20261105/VERIFIED-FOLLOWUP-UI-SCOPE.json',JSON.stringify(data.map(c=>({wordId:c.wordId,word:c.word,formsExpected:c.formsExpected,changedExamples:c.changedExamples})),null,2)+'\n');
console.log(JSON.stringify({total:data.length,start,end,cards:batch.length,examples:batch.reduce((n,c)=>n+c.examples.length,0),forms:batch.filter(c=>c.formsExpected).length}));
