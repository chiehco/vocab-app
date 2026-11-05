import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const [unit=1,start=1,end=10] = process.argv.slice(2).map(Number);
const phase=process.argv[5]??'legacy';if(!['legacy','before','final'].includes(phase))throw Error('Expected before/final phase');
const cards=JSON.parse(readFileSync('src/features/vocabulary/lv1ReviewedImages.json','utf8')).filter(c=>c.unit===unit).slice(start-1,end);
mkdirSync('output/playwright/unit-audit',{recursive:true});
const code=`async (page) => {
  const cards=${JSON.stringify(cards)};
  await page.setViewportSize({width:900,height:1100});
  const result=[];
  for(const card of cards){
    await page.goto('http://127.0.0.1:5179/#/textbook/LV1/${unit}/cards?item='+encodeURIComponent(card.id),{waitUntil:'domcontentloaded'});
    await page.getByRole('heading',{name:card.displayWord,exact:true}).waitFor();
    await page.waitForFunction(path => {const i=document.querySelector('.learning-illustration img'); return i && i.src.endsWith(path) && i.complete && i.naturalWidth>0;},card.illustration.path);
    await page.waitForFunction(()=>!document.body.innerText.includes('字義載入中'));
    await page.waitForFunction(({en,zh})=>{const text=document.querySelector('main')?.innerText??'';return text.includes(en)&&text.includes(zh);},{en:card.illustration.captionEn,zh:card.illustration.captionZh});
    const screenshot='output/playwright/unit-audit/'+card.id+'${phase==='legacy'?'':'-unit-'+phase}.png';
    await page.screenshot({path:screenshot,fullPage:true});
    const text=await page.locator('main').innerText();
    if(!text.includes(card.illustration.captionEn)||!text.includes(card.illustration.captionZh))throw Error('Unit content changed during capture '+card.id);
    const images=await page.locator('main img').evaluateAll(items=>items.map(i=>({src:i.src,complete:i.complete,width:i.naturalWidth,height:i.naturalHeight})));
    result.push({id:card.id,screenshot,url:page.url(),text,images});
  }
  return result;
}`;
writeFileSync('output/playwright/unit-audit/capture.playwright.txt',code);
console.log(JSON.stringify({unit,start,end,items:cards.length}));
