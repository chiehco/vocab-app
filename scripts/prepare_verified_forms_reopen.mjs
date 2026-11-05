import{readFileSync,writeFileSync}from'node:fs';
const facts=JSON.parse(readFileSync('docs/unit-audit-20261105/VERIFIED-VERB-FORMS-SOURCES.json','utf8')).facts;
writeFileSync('output/playwright/unit-audit/verified-forms-reopen.playwright.txt',`async(page)=>{const results=[];for(const fact of ${JSON.stringify(facts)}){
 await page.goto('http://127.0.0.1:5179/#/word/'+fact.wordId);await page.getByRole('heading',{name:fact.word,exact:true}).waitFor();
 await page.waitForFunction(()=>document.querySelector('.recorded-verb-forms dd'));
 const panel=page.locator('.recorded-verb-forms'),actual=await panel.locator('dd').allTextContents(),labels=await panel.locator('dt').allTextContents();
 const screenshot='output/playwright/unit-audit/verb-forms-'+fact.wordId+'.png';await panel.screenshot({path:screenshot});
 results.push({wordId:fact.wordId,word:fact.word,url:page.url(),actual,labels,expected:[fact.verbForms.base,fact.verbForms.past,fact.verbForms.pastParticiple],match:JSON.stringify(actual)===JSON.stringify([fact.verbForms.base,fact.verbForms.past,fact.verbForms.pastParticiple]),screenshot});
}return results;}`);
