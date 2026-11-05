import {readFileSync,writeFileSync} from 'node:fs';
const manifest=JSON.parse(readFileSync(process.argv[2],'utf8'));
const words=JSON.parse(readFileSync('public/data/v1/words.json','utf8'));
const cards=manifest.patches.filter(p=>p.dataset==='words'&&(p.after.usagePattern||p.after.usagePatternZh)).map(p=>words.find(w=>w.wordId===p.id));
writeFileSync('output/playwright/unit-audit/usage-reopen.playwright.txt',`async(page)=>{const results=[];for(const card of ${JSON.stringify(cards)}){
 await page.goto('http://127.0.0.1:5179/#/word/'+card.wordId);await page.getByRole('heading',{name:card.word,exact:true}).waitFor();
 await page.getByRole('button',{name:'字卡',exact:true}).click();
 await page.waitForFunction(()=>{const i=document.querySelector('.study-illustration img');return i?i.complete&&i.naturalWidth>0:document.querySelector('main')?.innerText.includes('圖片尚未收錄')});
 await page.waitForTimeout(350);await page.getByRole('button',{name:'搭配',exact:true}).click();
 const expected=[...card.usagePattern.split(';'),...card.usagePatternZh.split('；')].map(s=>s.trim()).filter(Boolean);
 let initialWaitFailure=false;
 try{await page.waitForFunction(expected=>expected.every(s=>document.querySelector('main')?.innerText.includes(s)),expected,{timeout:3000});}
 catch{initialWaitFailure=true;await page.getByRole('button',{name:'搭配',exact:true}).click();
  try{await page.waitForFunction(expected=>expected.every(s=>document.querySelector('main')?.innerText.includes(s)),expected,{timeout:3000});}
  catch{throw Error('Usage initial visibility failed after one reclick '+card.wordId+' '+JSON.stringify({expected,actual:await page.locator('main').innerText()}));}}
 await page.waitForTimeout(350);let text=await page.locator('main').innerText(),tabRetry=initialWaitFailure;
 if(!expected.every(s=>text.includes(s))&&!tabRetry){tabRetry=true;await page.getByRole('button',{name:'搭配',exact:true}).click();await page.waitForFunction(expected=>expected.every(s=>document.querySelector('main')?.innerText.includes(s)),expected);await page.waitForTimeout(350);text=await page.locator('main').innerText();}
 if(!expected.every(s=>text.includes(s)))throw Error('Usage page did not remain visible: '+card.wordId);
 const screenshot='output/playwright/unit-audit/'+card.word+'-usage-followup.png';await page.screenshot({path:screenshot,fullPage:true});
 results.push({wordId:card.wordId,word:card.word,screenshot,url:page.url(),allRulePartsVisible:true,tabRetry,initialWaitFailure,text});
}return results;}`);
console.log(JSON.stringify({usageCards:cards.length}));
