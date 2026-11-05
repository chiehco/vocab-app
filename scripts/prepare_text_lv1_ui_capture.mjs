import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const [unitRaw,phase='before']=process.argv.slice(2),unit=Number(unitRaw);
if(!Number.isInteger(unit)||unit<16||unit>21||!['before','final'].includes(phase))throw Error('Existing text-only unit and before/final phase required');
const curriculum=JSON.parse(readFileSync(`src/features/direct/curriculumLV1Unit${unit}.json`,'utf8')),words=JSON.parse(readFileSync('public/data/v1/words.json','utf8'));
if(curriculum.template.deliveryMode!=='text_only')throw Error('Do not change source delivery mode');
const items=curriculum.learningItems.map(i=>({...i,dictionaryMeaning:words.find(w=>w.wordId===i.officialWordId)?.meaningZh??null}));
mkdirSync('output/playwright/unit-audit',{recursive:true});
writeFileSync('output/playwright/unit-audit/text-unit-capture.playwright.txt',`async(page)=>{
 const results=[];await page.setViewportSize({width:1000,height:1100});
 for(const item of ${JSON.stringify(items)}){
  await page.goto('http://127.0.0.1:5179/#/vocabulary?level=LV1&unit=${unit}&kind='+item.kind+'&item='+encodeURIComponent(item.learningItemId));
  const card=page.getByRole('article',{name:'學習字卡',exact:true});
  await card.getByRole('heading',{name:item.displayWord??item.pattern,exact:true}).waitFor();
  const expected=item.kind==='vocabulary'?item.chapterMeaningsZh:item.explanationZh;
  await page.waitForFunction(expected=>document.querySelector('.vocab-card')?.innerText.includes(expected),expected);
  if(item.dictionaryMeaning)await page.waitForFunction(expected=>document.querySelector('.vocab-card')?.innerText.includes(expected),item.dictionaryMeaning);
  const text=await card.innerText(),screenshot='output/playwright/unit-audit/'+item.learningItemId+'-source-${phase}.png';
  const imageCount=await card.locator('img').count();
  if(imageCount)throw Error('Text-only curriculum unexpectedly adopted image '+item.learningItemId);
  if(item.kind==='vocabulary'&&!text.includes('例句待核對。'))throw Error('Unexpected adopted source example '+item.learningItemId);
  await page.screenshot({path:screenshot,fullPage:true});
  results.push({id:item.learningItemId,kind:item.kind,title:item.displayWord??item.pattern,sourcePage:item.sourcePage,officialWordId:item.officialWordId??null,url:page.url(),screenshot,text,sourceTextMatches:text.includes(expected),dictionaryMeaningMatches:!item.dictionaryMeaning||text.includes(item.dictionaryMeaning),imageCount,originalExampleAdopted:!!item.originalExample});
 }return results;
}`);
console.log(JSON.stringify({unit,phase,learningItems:items.length,vocabulary:items.filter(i=>i.kind==='vocabulary').length,grammar:items.filter(i=>i.kind==='grammar').length}));
