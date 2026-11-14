import {readFileSync,writeFileSync} from 'node:fs';
const unit=Number(process.argv[2]);
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const master=read('docs/unit-audit-20261105/MASTER-INVENTORY.json');
const selected=master.units.find(u=>u.key===`7000.ivy.LV1.${unit}`);
if(!selected)throw Error('Unknown unit');
const words=read('public/data/v1/words.json'),examples=read('public/data/v1/examples.json'),senses=read('public/data/v1/senses.json');
const published=read('src/features/vocabulary/lv1ReviewedImages.json');
const data=selected.retainedLV1Drafts.map(c=>{
 const publishedPair=published.find(p=>p.id===c.id);
 const officialWordId=publishedPair?.officialWordId??c.officialWordId;
 const wordData=words.find(w=>w.wordId===officialWordId);
 return {...c,sourceOfficialWordId:c.officialWordId,officialWordId,displayWord:c.word,wordData,publishedPair,
  examples:wordData?examples.filter(e=>e.word===wordData.word):[],senses:wordData?senses.filter(s=>s.wordId===wordData.wordId):[]};
});
writeFileSync(`output/unit-audit-20261105/LV1-U${String(unit).padStart(2,'0')}-full-source.json`,JSON.stringify(data,null,2)+'\n');
console.log(JSON.stringify({unit,retainedSourceCards:data.length,publishedSubset:data.filter(c=>c.published).length,
 officialWords:new Set(data.flatMap(c=>c.wordData?[c.officialWordId]:[])).size,unmapped:data.filter(c=>!c.wordData).map(c=>({id:c.id,word:c.word,sourceId:c.officialWordId})),
 formalExamples:new Set(data.flatMap(c=>c.examples.map(e=>e.exampleId))).size,next:data[0]?.id}));
