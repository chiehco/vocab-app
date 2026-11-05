import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const [unit=1,start=1,end=38]=process.argv.slice(2).map(Number);
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const cards=(process.argv[5]?read(process.argv[5]):read('src/features/vocabulary/lv1ReviewedImages.json').filter(c=>c.unit===unit)).slice(start-1,end);
const words=read('public/data/v1/words.json');
const examples=read('public/data/v1/examples.json');
const data=cards.filter(c=>words.some(w=>w.wordId===c.officialWordId)).map(c=>({...c,word:words.find(w=>w.wordId===c.officialWordId).word,meaningEn:words.find(w=>w.wordId===c.officialWordId).meaningEn,
 examples:examples.filter(e=>e.word===words.find(w=>w.wordId===c.officialWordId).word && ['approved','reviewed','draft','needs_check'].includes(e.status))}));
mkdirSync('output/playwright/unit-audit',{recursive:true});
writeFileSync('output/playwright/unit-audit/general-capture.playwright.txt',`async(page)=>{
  const cards=${JSON.stringify(data)};
  await page.setViewportSize({width:1000,height:1000});
  const results=[];
  for(const card of cards){
    await page.goto('http://127.0.0.1:5179/#/word/'+card.officialWordId);
    await page.getByRole('heading',{name:card.word,exact:true}).waitFor();
    // Consecutive source items can map to the same route. Explicitly restore
    // the hero tab rather than relying on navigation to reset the prior tab.
    await page.getByRole('button',{name:'字卡',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('.study-illustration img')||document.querySelector('main')?.innerText.includes('圖片尚未收錄'));
    const image=page.locator('.study-illustration img');
    if(await image.count())await page.waitForFunction(()=>{const i=document.querySelector('.study-illustration img');return i&&i.complete&&i.naturalWidth>0&&getComputedStyle(i).visibility!=='hidden'});
    if(await image.count())await image.evaluate(i=>i.decode());
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const hero=await page.locator('main').innerText();
    const imageInfo=await page.locator('main img').evaluateAll(imgs=>imgs.map(i=>({src:i.src,complete:i.complete,width:i.naturalWidth,height:i.naturalHeight})));
    const heroScreenshot='output/playwright/unit-audit/'+card.id+'-general-hero.png';
    await page.screenshot({path:heroScreenshot,fullPage:true});
    await page.getByRole('button',{name:'字義',exact:true}).click();
    await page.waitForFunction(n=>document.querySelectorAll('.dossier-examples li').length===n,card.examples.length);
    if(card.meaningEn)await page.waitForFunction(expected=>document.querySelector('main')?.innerText.replace(/\\s+/g,' ').includes(expected.replace(/\\s+/g,' ')),card.meaningEn);
    await page.getByRole('heading',{name:card.word,exact:true}).waitFor();
    await page.waitForTimeout(350);
    const actual=await page.locator('.dossier-examples li').evaluateAll(items=>items.map(li=>({en:li.querySelector('p')?.innerText,zh:li.querySelector('div>span')?.innerText,label:[...li.querySelectorAll('small')].map(s=>s.innerText)})));
    const mismatches=card.examples.filter(e=>!actual.some(a=>a.en===e.sentenceEn&&a.zh===(e.sentenceZh??undefined))).map(e=>e.exampleId);
    const screenshot='output/playwright/unit-audit/'+card.id+'-general-after.png';
    await page.screenshot({path:screenshot,fullPage:true});
    let meaningPageText=await page.locator('main').innerText(),definitionTabRetried=false;
    let definitionMatches=!card.meaningEn||meaningPageText.replace(/\\s+/g,' ').includes(card.meaningEn.replace(/\\s+/g,' '));
    if(!definitionMatches){
      definitionTabRetried=true;await page.getByRole('button',{name:'字義',exact:true}).click();
      await page.waitForFunction(expected=>document.querySelector('main')?.innerText.replace(/\\s+/g,' ').includes(expected.replace(/\\s+/g,' ')),card.meaningEn);
      await page.waitForTimeout(350);meaningPageText=await page.locator('main').innerText();
      definitionMatches=meaningPageText.replace(/\\s+/g,' ').includes(card.meaningEn.replace(/\\s+/g,' '));
      if(definitionMatches)await page.screenshot({path:screenshot,fullPage:true});
    }
    results.push({id:card.id,word:card.word,url:page.url(),screenshot,heroScreenshot,hero,imageInfo,exampleCount:actual.length,mismatches,examples:actual,definitionMatches,definitionTabRetried});
  }
  return results;
}`);
console.log(JSON.stringify({unit,start,end,cards:data.length,examples:data.reduce((n,c)=>n+c.examples.length,0)}));
