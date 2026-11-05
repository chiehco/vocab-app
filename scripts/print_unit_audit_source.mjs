import {readFileSync} from 'node:fs';
const [unit,start=1,end=999]=process.argv.slice(2).map(Number);
const rows=JSON.parse(readFileSync(`output/unit-audit-20261105/LV1-U${String(unit).padStart(2,'0')}-full-source.json`,'utf8'));
for(const c of rows.slice(start-1,end)){
 console.log(`\n${c.id} ${c.word} ${c.officialWordId} | ${c.captionEn} | ${c.captionZh}`);
 if(!c.wordData)continue;
 const w=c.wordData;
 console.log(JSON.stringify({status:w.status,pos:w.pos,meaningZh:w.meaningZh,meaningEn:w.meaningEn,usagePattern:w.usagePattern,usagePatternZh:w.usagePatternZh}));
 for(const s of c.senses)console.log('SENSE '+[s.senseId,s.sensePos,s.status,s.meaningZh,s.note,s.examEvidence].join(' | '));
 for(const e of c.examples)console.log([e.exampleId,e.sensePos,e.status,e.sentenceEn,e.sentenceZh,e.meaningHint,e.answer].join(' | '));
}
