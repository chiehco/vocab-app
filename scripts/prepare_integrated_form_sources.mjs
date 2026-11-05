// Read one prepared, evidence-backed batch. This writes manifests, never product data.
// The private prepared directory is a runtime argument, not a public source path.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const [preparedRoot,batch]=process.argv.slice(2),scopes={'U07':36,'U08-U09':49,'U10':26,'U11':25,'U12':28,'U13':19,'U14':18,'U15':22};
assert.ok(preparedRoot&&Object.hasOwn(scopes,batch),'Pass the prepared directory and one exact remaining batch');
const root='docs/unit-audit-20261105/',local='output/unit-audit-20261105/',read=p=>JSON.parse(readFileSync(p,'utf8')),hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const prefix='LV1-'+batch+'-integrated',sourceName='VERIFIED-INTEGRATED-'+batch+'-VERB-FORMS-SOURCES.json';
assert.ok(!existsSync(root+sourceName)&&!existsSync(local+'receipts/'+prefix+'-forms-patches.json'),'Do not overwrite an existing source table or write receipt');
const dir=join(preparedRoot,batch),source=read(join(dir,'SOURCES-TO-APPEND.json')),manifest=read(join(dir,'PATCHES.json')),guards=read(join(dir,'GUARDS.json')),words=read('public/data/v1/words.json');
assert.equal(source.facts.length,scopes[batch]);assert.equal(manifest.patches.length,scopes[batch]);assert.equal(new Set(source.facts.map(f=>f.wordId)).size,source.facts.length);
const base=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),facts=[],skipped=[],conflicts=[],before=[];
for(const f of source.facts){
 const matches=words.filter(w=>w.wordId===f.wordId);assert.equal(matches.length,1,f.wordId);const w=matches[0],g=guards.records.find(g=>g.wordId===f.wordId),p=manifest.patches.find(p=>p.id===f.wordId);assert.ok(g&&p);
 assert.equal(p.dataset,'words');assert.equal(p.key,'wordId');assert.deepEqual(p.before,{verbForms:{$absent:true}});assert.deepEqual(p.after,{verbForms:f.verbForms});assert.equal(f.verbForms.base,f.word);assert.equal(f.verbForms.status,'approved');assert.deepEqual(Object.keys(f.verbForms).sort(),['base','past','pastParticiple','sourceRef','status'].sort());assert.ok(f.evidence.length&&f.applicableSense&&f.restriction);
 if(Object.hasOwn(w,'verbForms')){if(JSON.stringify(w.verbForms)===JSON.stringify(f.verbForms))skipped.push({wordId:f.wordId,word:w.word,state:'already_exact_preserved',verbForms:w.verbForms});else conflicts.push({wordId:f.wordId,word:w.word,reason:'Existing null, custom or different forms preserved; no overwrite'});continue;}
 if(w.word!==f.word||w.word!==g.mainGuard.headword||w.pos!==g.mainGuard.pos||w.status!==g.mainGuard.wholeWordStatus||!w.pos.split('/').includes('v.')||hash(w)!==g.mainGuard.rowSha256){conflicts.push({wordId:f.wordId,word:w.word,reason:'Current identity, verbal POS, status or exact non-form row guard differs; retained for review'});continue;}
 before.push(w);facts.push({...f,verification:'Exact latest identity, existing verb/applicable sense, true absence and full non-form row hash reconciled. Prior source/UI evidence is provenance, not current integration UI verification.',beforeRowSha256:hash(w),nonFormRowSha256:hash(w),guard:{headword:w.word,pos:w.pos,wholeWordStatus:w.status},originalEvidenceCommit:g.originalCommit,sourceContexts:g.unitContexts.map(c=>({unit:c.unit,cardId:c.cardId,sourceOrder:c.sourceOrder,displayWord:c.displayWord}))});
}
for(const g of guards.records.filter(g=>!source.facts.some(f=>f.wordId===g.wordId))){const w=words.find(w=>w.wordId===g.wordId);assert.ok(w);if(JSON.stringify(w.verbForms)===JSON.stringify(g.expected))skipped.push({wordId:g.wordId,word:w.word,state:'already_exact_preserved',verbForms:w.verbForms});else conflicts.push({wordId:g.wordId,word:w.word,reason:'Previously exact field now differs; preserved'});}
const out={baseCheckpoint:base,originalEvidenceCommit:manifest.isolatedEvidenceCommit,scope:'Only exact reconciled absent verbForms; preserve every other row field and every earlier source table.',selectedSourceHashes:Object.fromEntries(['PATCHES.json','SOURCES-TO-APPEND.json','GUARDS.json'].map(n=>[n,createHash('sha256').update(readFileSync(join(dir,n))).digest('hex')])),facts,skipped,conflicts};
writeFileSync(root+sourceName,JSON.stringify(out,null,2)+'\n');writeFileSync(root+prefix+'-forms-patches.json',JSON.stringify({baseCommit:'29cfc684d7a11b07f09988c478d30358830f1951',integrationBaseCheckpoint:base,unit:'LV1-'+batch+'-form-followup',patches:manifest.patches.filter(p=>facts.some(f=>f.wordId===p.id)).map(p=>({...p,reason:'Add exact sourced principal parts to the currently absent key; preserve all other fields. '+facts.find(f=>f.wordId===p.id).restriction}))},null,2)+'\n');writeFileSync(local+batch+'-integrated-before-words.json',JSON.stringify(before,null,2)+'\n');
console.log(JSON.stringify({batch,base,eligible:facts.length,skipped:skipped.length,conflicts:conflicts.length,productFieldsWritten:0,exactEligibleIds:facts.map(f=>f.wordId)}));
