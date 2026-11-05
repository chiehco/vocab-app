import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const [base,batch]=process.argv.slice(2);
assert.match(base??'',/^[a-f0-9]{40}$/);
assert.match(batch??'',/^U\d{2}(?:-U\d{2})?$/);
const root='docs/unit-audit-20261105/';
const read=path=>JSON.parse(readFileSync(path,'utf8'));
const before=path=>JSON.parse(execFileSync('git',['show',base+':'+path],{encoding:'utf8',maxBuffer:32e6}));
const canonical=path=>readFileSync(path,'utf8').replace(/\r\n/g,'\n');
const sha=value=>createHash('sha256').update(value).digest('hex');
const manifest=read(root+`LV1-${batch}-verified-forms-patches.json`);
assert.equal(manifest.checkpointBefore,base);
const patches=new Map(manifest.patches.map(p=>[p.id,p]));
assert.equal(patches.size,manifest.patches.length,'Unique patch identities');
function compareRows(old,now){
 assert.equal(now.length,old.length);let changed=0;
 for(let i=0;i<now.length;i++){
  assert.equal(now[i].wordId,old[i].wordId,'Immutable ordered identities');
  const copy=structuredClone(now[i]);const patch=patches.get(copy.wordId);
  if(patch){
   assert.equal(Object.hasOwn(old[i],'verbForms'),false,'Original key was genuinely absent');
   assert.deepEqual(patch.before,{verbForms:{$absent:true}});
   assert.deepEqual(patch.after,{verbForms:copy.verbForms});delete copy.verbForms;changed++;
  }
  assert.deepEqual(copy,old[i],'Every other row/field is unchanged');
 }
 return changed;
}
const words=read('public/data/v1/words.json');
const changed=compareRows(before('public/data/v1/words.json'),words);
assert.equal(changed,patches.size);
const retainedFiles=['senses','examples','relations','morphemes','notes','exam_priority','hooks','media'];
for(const name of retainedFiles)assert.deepEqual(read(`public/data/v1/${name}.json`),before(`public/data/v1/${name}.json`));
const originalSources=root+'VERIFIED-VERB-FORMS-SOURCES.json';
assert.deepEqual(read(originalSources),before(originalSources));
const sourcePath=root+'VERIFIED-FOLLOWUP-VERB-FORMS-SOURCES.json';
const oldFacts=before(sourcePath).facts;const newFacts=read(sourcePath).facts;
assert.deepEqual(newFacts.filter(f=>f.batch!==batch),oldFacts,'Prior followup facts remain exact');
assert.equal(new Set(newFacts.map(f=>f.wordId)).size,newFacts.length);
assert.deepEqual(new Set(newFacts.filter(f=>f.batch===batch).map(f=>f.wordId)),new Set(patches.keys()));
const oldPack=before('public/data/v1/sa-pack.json'),pack=read('public/data/v1/sa-pack.json');
const starterChanged=compareRows(oldPack.words,pack.words);
for(const [key,value] of Object.entries(pack))if(!['meta','words'].includes(key))assert.deepEqual(value,oldPack[key]);
const meta=read('public/data/v1/meta.json'),oldMeta=before('public/data/v1/meta.json');
const restoredMeta={...meta};for(const key of ['generatedAt','wordsHash','contentHash'])restoredMeta[key]=oldMeta[key];
assert.deepEqual(restoredMeta,oldMeta);
assert.equal(meta.wordsHash,sha(canonical('public/data/v1/words.json')));
const digest=createHash('sha256');
for(const name of ['words','senses','examples','relations','morphemes','notes','exam_priority','hooks','media'])digest.update(canonical(`public/data/v1/${name}.json`));
assert.equal(meta.contentHash,digest.digest('hex'));
assert.equal(pack.meta.wordsHash,'sa:'+sha(JSON.stringify(pack.words)));
const report={base,batch,modifiedFields:changed,fullWordCount:words.length,starterCount:pack.words.length,starterUpdated:starterChanged,
 starterOmitted:[...patches.keys()].filter(id=>!pack.words.some(w=>w.wordId===id)),
 unchangedOtherWordFields:true,unchangedOtherDatasets:retainedFiles,original31SourcesUnchanged:true,priorFollowupFactsUnchanged:oldFacts.length,
 unchangedStarterIdentities:true,metadataHashesValid:true};
writeFileSync(`output/verified-followups/${batch}-exact-diff.json`,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
