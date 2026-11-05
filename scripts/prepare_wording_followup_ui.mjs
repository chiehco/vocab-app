import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const general=readFileSync('output/playwright/unit-audit/general-capture.playwright.txt','utf8');
assert.ok(general.includes('FOLLOWUP-W000509')&&general.includes('FOLLOWUP-W004689'));
const note=read('public/data/v1/notes.json').find(n=>n.noteId==='NXc62b0f26');
const example=read('public/data/v1/examples.json').find(e=>e.exampleId==='EX50693488');
const die=read('public/data/v1/words.json').find(w=>w.word==='die');
writeFileSync('output/playwright/unit-audit/wording-followup-final.playwright.txt',`async(page)=>{
 const wording=await (${general})(page);
 if(wording.some(r=>r.mismatches.length||!r.definitionMatches))throw Error('Wording general-card mismatch');
 const low=wording.find(r=>r.word==='low');
 if(!low.hero.includes('這個架子夠低，小孩搆得到。'))throw Error('General low caption did not update');
 await page.goto('http://127.0.0.1:5179/#/textbook/LV1/2/cards?item=LV1-U02-15');
 await page.getByRole('heading',{name:'low',exact:true}).waitFor();
 await page.waitForFunction(()=>document.querySelector('main')?.innerText.includes('這個架子夠低，小孩搆得到。'));
 await page.waitForFunction(()=>{const images=[...document.querySelectorAll('main img')];return images.length===1&&images.every(i=>i.complete&&i.naturalWidth===1254)});
 const lowUnit={url:page.url(),text:await page.locator('main').innerText(),images:await page.locator('main img').evaluateAll(imgs=>imgs.map(i=>({src:i.src,complete:i.complete,width:i.naturalWidth,height:i.naturalHeight}))),screenshot:'output/playwright/unit-audit/low-caption-unit-after.png'};
 if(lowUnit.images.length!==1||lowUnit.images.some(i=>!i.complete||i.width!==1254))throw Error('Low unit unchanged image failed');
 await page.screenshot({path:lowUnit.screenshot,fullPage:true});
 await page.goto('http://127.0.0.1:5179/#/word/${die.wordId}');await page.getByRole('heading',{name:'die',exact:true}).waitFor();
 await page.getByRole('button',{name:'搭配',exact:true}).click();
 const expectedNote=${JSON.stringify(note.content)};
 let noteTabRetried=false;
 try{await page.waitForFunction(t=>document.querySelector('main')?.innerText.replace(/\\s+/g,' ').includes(t.replace(/\\s+/g,' ')),expectedNote,{timeout:3000});}
 catch{noteTabRetried=true;await page.getByRole('button',{name:'搭配',exact:true}).click();await page.waitForFunction(t=>document.querySelector('main')?.innerText.replace(/\\s+/g,' ').includes(t.replace(/\\s+/g,' ')),expectedNote,{timeout:3000});}
 const usageScreenshot='output/playwright/unit-audit/die-note-after.png';await page.screenshot({path:usageScreenshot,fullPage:true});const usageText=await page.locator('main').innerText();
 await page.getByRole('button',{name:'字義',exact:true}).click();
 await page.waitForFunction(e=>document.querySelector('main')?.innerText.includes(e.sentenceEn)&&document.querySelector('main')?.innerText.includes(e.sentenceZh),${JSON.stringify(example)});
 const meaningScreenshot='output/playwright/unit-audit/die-example-after.png';await page.screenshot({path:meaningScreenshot,fullPage:true});
 return {wording,lowUnit,die:{wordId:'${die.wordId}',noteId:'${note.noteId}',exampleId:'${example.exampleId}',url:page.url(),noteTabRetried,usageText,meaningText:await page.locator('main').innerText(),usageScreenshot,meaningScreenshot,exactNoteVisible:usageText.includes(expectedNote)}};
}`);
console.log(JSON.stringify({generalCards:4,lowUnitCards:1,dieNoteAndExample:1}));
