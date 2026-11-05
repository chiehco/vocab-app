import {writeFileSync} from 'node:fs';
writeFileSync('output/playwright/unit-audit/demand-visible-reopen.playwright.txt',`async(page)=>{
 await page.goto('http://127.0.0.1:5179/#/word/W003270');
 await page.getByRole('heading',{name:'demand',exact:true}).waitFor();
 await page.waitForFunction(()=>document.querySelector('main')?.innerText.includes('（demanding，衍生形容詞）'));
 const hero=await page.locator('main').innerText();
 const screenshot='output/playwright/unit-audit/demand-derived-form-visible.png';await page.screenshot({path:screenshot,fullPage:true});
 return {wordId:'W003270',derivedFormVisible:hero.includes('（demanding，衍生形容詞）'),hero,screenshot,url:page.url()};
}`);
