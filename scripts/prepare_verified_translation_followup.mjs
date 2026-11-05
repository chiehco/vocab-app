import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const root='docs/unit-audit-20261105/';
const research='3a15481281a7e8aa34f7c5f8942dc2cb34e2af57';
const main='26cc432853d13617f19f843c430ccd3ee9543733';
const requestedMain='3b14fc8ac56ca58dd715a088340d913e5230a0b7';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const gitread=(rev,p)=>JSON.parse(execFileSync('git',['show',rev+':'+p],{encoding:'utf8',maxBuffer:32e6}));
const config=[{id:'EX4c5b9769',word:'tough',wordId:'W002921',unit:'U11',file:'U11-TEXT-REVIEW-CANDIDATES.json'},
 {id:'EX299bccf8',word:'purchase',wordId:'W004689',unit:'U12',file:'U12-TEXT-REVIEW-CANDIDATES.json'}];
const rows=read('public/data/v1/examples.json');
const mainRows=gitread(main,'public/data/v1/examples.json');
const requestedRows=gitread(requestedMain,'public/data/v1/examples.json');
const facts=config.map(c=>{
 const path=root+'source-followup-candidates/'+c.file;
 const candidates=gitread(research,path).definiteCandidates.filter(x=>x.exampleId===c.id);
 assert.equal(candidates.length,1);const source=candidates[0];
 assert.equal(source.classification,'definite_text_error');assert.equal(source.word,c.word);assert.equal(source.wordId,c.wordId);
 const matches=rows.filter(x=>x.exampleId===c.id);assert.equal(matches.length,1);const current=matches[0];
 assert.equal(current.word,c.word);assert.equal(current.sentenceEn,source.sentenceEn);
 assert.ok([source.before,source.after].includes(current.sentenceZh),'Different current Chinese requires review');
 const compared=[requestedMain,main].map((revision,i)=>{
  const matched=(i===0?requestedRows:mainRows).filter(x=>x.exampleId===c.id);assert.equal(matched.length,1);
  const latest=matched[0];assert.equal(latest.sentenceEn,source.sentenceEn);assert.ok([source.before,source.after].includes(latest.sentenceZh));
  return {revision,row:latest,differentFields:Object.keys({...current,...latest}).filter(k=>JSON.stringify(current[k])!==JSON.stringify(latest[k])).map(field=>({field,isolatedValue:current[field],mainValue:latest[field]}))};
 });
 return {exampleId:c.id,wordId:c.wordId,word:c.word,unit:c.unit,sentenceEn:source.sentenceEn,before:source.before,after:source.after,
  reason:source.reason,evidence:source.sources.map(s=>s.url).join(' ; '),sources:source.sources,
  sourceSnapshot:{researchCommit:research,sourceFile:path,sourceBlob:execFileSync('git',['rev-parse',research+':'+path],{encoding:'utf8'}).trim()},
  currentSourceRecheck:{method:'Direct primary pages opened and relevant definitions inspected',checkedAt:new Date().toISOString(),success:true},
  isolatedRowBefore:current,mainComparisons:compared,alreadyApplied:current.sentenceZh===source.after};
});
const manifest={baseCommit:'29cfc684d7a11b07f09988c478d30358830f1951',checkpointBefore:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),batch:'U11-U12-translations',
 scope:'Only two exact sentenceZh corrections. English, cloze, answer, POS, hints, status and all other fields remain unchanged.',
 patches:facts.filter(f=>!f.alreadyApplied).map(f=>({dataset:'examples',key:'exampleId',id:f.exampleId,before:{sentenceEn:f.sentenceEn,sentenceZh:f.before},after:{sentenceZh:f.after},reason:f.reason,evidence:f.evidence}))};
writeFileSync(root+'VERIFIED-FOLLOWUP-TRANSLATION-SOURCES.json',JSON.stringify({scope:manifest.scope,facts},null,2)+'\n');
writeFileSync(root+'LV1-U11-U12-verified-translations-patches.json',JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({batch:manifest.batch,source:research,comparedMain:main,fields:manifest.patches.length,alreadyApplied:facts.filter(f=>f.alreadyApplied).length,mainDifferences:facts.flatMap(f=>f.mainComparisons.map(x=>({exampleId:f.exampleId,revision:x.revision,differences:x.differentFields})))}));
