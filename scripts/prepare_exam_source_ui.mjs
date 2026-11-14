import {readFileSync,writeFileSync} from 'node:fs';
const words=JSON.parse(readFileSync('public/data/v1/words.json','utf8'));
const senses=JSON.parse(readFileSync('public/data/v1/senses.json','utf8'));
const examples=JSON.parse(readFileSync('public/data/v1/examples.json','utf8'));
const cards=['W000270','W000628'].map(wordId=>({wordId,word:words.find(w=>w.wordId===wordId).word,sense:senses.find(s=>s.senseId===wordId+'-1'),example:examples.find(e=>e.exampleId===(wordId==='W000270'?'EXd2362b27':'EX0cad31e9'))}));
writeFileSync('output/playwright/unit-audit/exam-source-reopen.playwright.txt',`async(page)=>{const result=[];for(const card of ${JSON.stringify(cards)}){
 await page.goto('http://127.0.0.1:5179/#/word/'+card.wordId);await page.getByRole('heading',{name:card.word,exact:true}).waitFor();
 await page.getByRole('button',{name:'字義',exact:true}).click();
 await page.waitForFunction(expected=>document.querySelector('main').innerText.includes(expected),card.sense.meaningZh);
 const text=await page.locator('main').innerText();const screenshot='output/playwright/unit-audit/'+card.word+'-official-source-reopened.png';await page.screenshot({path:screenshot,fullPage:true});
 result.push({wordId:card.wordId,url:page.url(),screenshot,text,meaningMatches:text.includes(card.sense.meaningZh),sourceMatches:text.includes(card.sense.examEvidence),noteMatches:text.includes(card.sense.note),sourceDisplayBoundary:'Existing word-definition UI renders sense meaning, not sense examEvidence or note; those fields are independently verified in saved IndexedDB.',practiceEnglishUnchanged:text.includes(card.example.sentenceEn),practiceChineseUnchanged:text.includes(card.example.sentenceZh),practiceHintMatches:text.includes(card.example.meaningHint)});
}return result;}`);
