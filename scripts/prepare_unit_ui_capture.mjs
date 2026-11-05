import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const [unit=1,start=1,end=10] = process.argv.slice(2).map(Number);
const cards=JSON.parse(readFileSync('src/features/vocabulary/lv1ReviewedImages.json','utf8')).filter(c=>c.unit===unit).slice(start-1,end);
mkdirSync('output/playwright/unit-audit',{recursive:true});
const code=`async (page) => {
  const cards=${JSON.stringify(cards)};
  await page.setViewportSize({width:900,height:1100});
  const result=[];
  for(const card of cards){
    await page.goto('http://127.0.0.1:5179/#/textbook/LV1/${unit}/cards?item='+encodeURIComponent(card.id));
    await page.getByRole('heading',{name:card.displayWord,exact:true}).waitFor();
    await page.waitForFunction(path => {const i=document.querySelector('.learning-illustration img'); return i && i.src.endsWith(path) && i.complete && i.naturalWidth>0;},card.illustration.path);
    await page.waitForFunction(()=>!document.body.innerText.includes('字義載入中'));
    const screenshot='output/playwright/unit-audit/'+card.id+'.png';
    await page.screenshot({path:screenshot,fullPage:true});
    result.push(await page.evaluate(({id,screenshot})=>({id,screenshot,url:location.href,text:document.querySelector('main').innerText,images:[...document.querySelectorAll('main img')].map(i=>({src:i.src,complete:i.complete,width:i.naturalWidth,height:i.naturalHeight}))}),{id:card.id,screenshot}));
  }
  return result;
}`;
writeFileSync('output/playwright/unit-audit/capture.playwright.txt',code);
console.log(JSON.stringify({unit,start,end,items:cards.length}));
