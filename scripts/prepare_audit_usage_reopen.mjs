import {readFileSync,writeFileSync} from 'node:fs';
const read=p=>JSON.parse(readFileSync(p,'utf8')),words=read('public/data/v1/words.json');
const patches=['LV1-U07-patches.json','LV1-U02-U03-lexical-source-followup.json'].flatMap(p=>read('docs/unit-audit-20261105/'+p).patches).filter(p=>p.dataset==='words'&&(p.after.usagePattern||p.after.usagePatternZh)&&(!process.argv[2]||p.id===process.argv[2]));
const cards=patches.map(p=>words.find(w=>w.wordId===p.id));
writeFileSync('output/playwright/unit-audit/usage-reopen.playwright.txt',`async(page)=>{const results=[];for(const card of ${JSON.stringify(cards)}){
 await page.goto('http://127.0.0.1:5179/#/word/'+card.wordId);await page.getByRole('heading',{name:card.word,exact:true}).waitFor();await page.getByRole('button',{name:'搭配',exact:true}).click();
 const expected=[...card.usagePattern.split(';'),...card.usagePatternZh.split('；')].map(s=>s.trim()).filter(Boolean);
 await page.waitForFunction(expected=>expected.every(s=>document.querySelector('main').innerText.includes(s)),expected);
 await page.waitForTimeout(350);const text=await page.locator('main').innerText();const screenshot='output/playwright/unit-audit/'+card.word+'-usage-followup.png';await page.screenshot({path:screenshot,fullPage:true});
 results.push({wordId:card.wordId,word:card.word,screenshot,url:page.url(),allRulePartsVisible:expected.every(s=>text.includes(s)),text});
}return results;}`);
