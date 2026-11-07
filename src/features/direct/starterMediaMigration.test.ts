import {describe,it,expect} from 'vitest';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,readFileSync,rmSync,writeFileSync,statSync,utimesSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {auditHash,reverseFileAuditSteps,type AuditManifest,type AuditScope} from './lv3Audit.testSupport';
import {BUILDER,PACK,MIGRATION_ID,migrationByteHash as digest,validateStarterMediaMigration,inverseStarterMediaMigrationRaw,inverseStarterMediaMigrationNormalized,type StarterMediaMigration} from './starterMediaMigration.testSupport';

type MigrationPackFixture = {
 meta:{counts:{words:number;media:number};wordsHash:string;contentHash:string};
 words:{wordId:string;word:string}[];
 media:{targetWord:string;status:string}[];
};

function fixture(crlf=false){
 const media=[{targetWord:'cat',status:'pending'},{targetWord:'dog',status:'pending'},{targetWord:'outside',status:'approved'}];
 const meta={contentHash:'full:source',wordsHash:'source',counts:{media:3}};
 const words=[{wordId:'W1',word:'cat'},{wordId:'W2',word:'dog'}];
 const pack=(rows:typeof media)=>{const datasets={words,media:rows};return {meta:{counts:{words:2,media:rows.length},wordsHash:'unchanged',contentHash:'sa:'+digest(JSON.stringify({sourceHash:meta.contentHash,datasets}))},...datasets};};
 const before=pack(media.slice(0,1)),after=pack(media.slice(0,2));
 const builder='media = [row for row in source if row.get("targetWord") in selected_names]\n';
 const raw=(s:string)=>crlf?s.replace(/\n/g,'\r\n'):s;
 const docs:Record<string,string>={'public/data/v1/media.json':JSON.stringify(media)+'\n','public/data/v1/exam_priority.json':JSON.stringify([{word:'cat',priorityTier:'S'}])+'\n','public/data/v1/meta.json':JSON.stringify(meta,null,2)+'\n'};
 const m:StarterMediaMigration={schemaVersion:3,kind:'starter-media-actual-names',migrationId:MIGRATION_ID,baseline:'99883751926bd6cb4feff70daff56c07afc130cb',parentManifestHash:'a'.repeat(64),readiness:'ready',beforeInputs:{},afterInputs:{},beforeRawInputs:{},afterRawInputs:{},fixtures:{} as StarterMediaMigration['fixtures'],delta:[{sourceIndex:1,afterIndex:1,row:media[1]}],sourceMediaHash:digest(docs['public/data/v1/media.json']),beforeMeta:meta,beforePackMeta:before.meta,afterPackMeta:after.meta};
 const values={beforeBuilder:raw(builder),afterBuilder:raw(builder.replace('in selected_names','in actual_names')),beforePack:JSON.stringify(before)+'\n',afterPack:JSON.stringify(after)+'\n'};
 for(const [k,text] of Object.entries(values)){
  const key=k as keyof typeof values,side=k.startsWith('before')?'before':'after',path=k.endsWith('Builder')?BUILDER:PACK;
  const filename=k.replace(/(before|after)(Builder|Pack)/,(_,a:string,b:string)=>a+'-'+b.toLowerCase()+(b==='Builder'?'.py':'.json'));
  const fixturePath=`docs/lv3-audit-20261107/${MIGRATION_ID}/${filename}`;docs[fixturePath]=text;m.fixtures[key]={path:fixturePath,sha256:digest(text)};
  (side==='before'?m.beforeInputs:m.afterInputs)[path]=digest(text.replace(/\r\n/g,'\n'));(side==='before'?m.beforeRawInputs:m.afterRawInputs)[path]=digest(text);
 }
 for(const [p,text] of Object.entries(docs).filter(([p])=>!p.startsWith('docs/')))for(const map of [m.beforeInputs,m.afterInputs,m.beforeRawInputs,m.afterRawInputs])map[p]=digest(text);
 for(let i=0;i<139;i++)for(const map of [m.beforeInputs,m.afterInputs,m.beforeRawInputs,m.afterRawInputs])map[`other/${i}.json`]=digest('same');
 return {m,docs,values,load:(p:string)=>{if(!(p in docs))throw Error('unknown fixture');return docs[p];}};
}

describe('bounded starter media migration',()=>{
 it('reverses a future unit derived pack before reversing the migration',()=>{
  const f=fixture(),before=JSON.parse(f.values.afterPack),after=structuredClone(before),wordsPath='public/data/v1/words.json',metaPath='public/data/v1/meta.json';
  after.words[0].meaningZh='reviewed';after.meta.contentHash='future';
  const collections={words:{path:wordsPath,key:'wordId',rowsField:null}};
  const patch={dataset:'words',path:wordsPath,key:'wordId',id:'W1',before:before.words[0],after:{meaningZh:'reviewed'},reason:'test',evidence:[],fieldEvidence:{meaningZh:[{sources:['test'],reason:'test',proposal:'test'}]}};
  const scope:AuditScope={schemaVersion:1,unit:'LV3-U06',baseline:f.m.baseline,collections,rows:[{dataset:'words',id:'W1',beforeHash:auditHash(patch.before),after:patch.after}]};
  const beforeMeta=f.m.beforeMeta,afterMeta={...beforeMeta,contentHash:'full:future'};
  const m:AuditManifest={schemaVersion:2,unit:scope.unit,baseline:scope.baseline,parentManifestHash:auditHash(f.m),readiness:'ready',scope:'U06-scope.json',scopeHash:auditHash(scope),collections,files:{[wordsPath]:{beforeHash:auditHash(before.words),afterHash:auditHash(after.words),beforeByteHash:'a'.repeat(64),afterByteHash:'b'.repeat(64)}},patches:[patch],unchangedInputs:{},derivedBefore:{[PACK]:digest(f.values.afterPack),[metaPath]:digest(JSON.stringify(beforeMeta,null,2)+'\n')},derivedAfter:{[PACK]:digest(JSON.stringify(after)+'\n'),[metaPath]:digest(JSON.stringify(afterMeta,null,2)+'\n')},beforePackMeta:before.meta,beforeMeta,afterMeta};
  const steps=[{manifest:f.m},{manifest:m,scope}];
  expect(reverseFileAuditSteps(steps,PACK,after,f.load)).toEqual(JSON.parse(f.values.beforePack));
  expect(reverseFileAuditSteps(steps,metaPath,afterMeta,f.load)).toEqual(beforeMeta);
  const drift=structuredClone(after);drift.media[0].status='approved';expect(()=>reverseFileAuditSteps(steps,PACK,drift,f.load)).toThrow(/drift/);
 });
 it('matches Python strict and normalized inverse across all 144 inputs',()=>{
  const directory=mkdtempSync(join(tmpdir(),'lv3-media-ts-parity-'));
  try{
   const file=join(directory,'parity.json');execFileSync('python',['scripts/test_lv3_starter_media_migration.py','--export',file],{encoding:'utf8'});
   const data=JSON.parse(readFileSync(file,'utf8')) as {manifest:StarterMediaMigration;fixtures:Record<string,string>;before:Record<string,string>;after:Record<string,string>;pythonInverse:Record<string,string>};
   const load=(p:string)=>{const text=data.fixtures[p]??data.before[p];expect(text).toBeDefined();return text;};
   validateStarterMediaMigration(data.manifest,load,data.manifest.beforeInputs);expect(Object.keys(data.after)).toHaveLength(144);
   for(const [path,text] of Object.entries(data.after)){
    const restored=inverseStarterMediaMigrationRaw(data.manifest,path,text,load);expect(restored,path).toBe(data.pythonInverse[path]);expect(restored,path).toBe(data.before[path]);
    expect(digest(restored),path).toBe(data.manifest.beforeRawInputs[path]);
    for(const ending of ['\n','\r\n']){
     // Checkout conversion may affect every ordinary input, but never the
     // separately authenticated forensic fixtures.
     const checkout=(s:string)=>s.replace(/\r\n/g,'\n').replace(/\n/g,ending);
     const checkoutLoad=(p:string)=>data.fixtures[p]??checkout(data.before[p]);
     const normalized=inverseStarterMediaMigrationNormalized(data.manifest,path,checkout(text).replace(/\r\n/g,'\n'),checkoutLoad);
     expect(normalized,path).toBe(data.before[path].replace(/\r\n/g,'\n'));expect(digest(normalized),path).toBe(data.manifest.beforeInputs[path]);
    }
   }
   const unchanged='public/data/v1/media.json';expect(()=>inverseStarterMediaMigrationNormalized(data.manifest,unchanged,data.after[unchanged].replace(/\r\n/g,'\n')+' ',load)).toThrow(/drift/);
   const sourceDrift=(p:string)=>p===unchanged?load(p)+' ':load(p);expect(()=>validateStarterMediaMigration(data.manifest,sourceDrift)).toThrow(/source guard/);
  }finally{rmSync(directory,{recursive:true,force:true});}
 },20000);
 it('authenticates complete maps and preserves pending status, source order and exact bytes',()=>{
  const f=fixture();const proof=validateStarterMediaMigration(f.m,f.load,f.m.beforeInputs);
  expect(proof.after.media).toEqual([{targetWord:'cat',status:'pending'},{targetWord:'dog',status:'pending'}]);
  for(const [p,key] of [[BUILDER,'Builder'],[PACK,'Pack']])expect(inverseStarterMediaMigrationRaw(f.m,p,f.values[('after'+key) as keyof typeof f.values],f.load)).toBe(f.values[('before'+key) as keyof typeof f.values]);
 });
 it('authenticates CRLF raw snapshots before allowing normalized historical projection',()=>{
  const f=fixture(true);expect(inverseStarterMediaMigrationNormalized(f.m,BUILDER,f.values.afterBuilder.replace(/\r\n/g,'\n'),f.load)).toBe(f.values.beforeBuilder.replace(/\r\n/g,'\n'));
  expect(()=>inverseStarterMediaMigrationNormalized(f.m,BUILDER,f.values.afterBuilder,f.load)).toThrow(/normalize CRLF/);
  expect(()=>inverseStarterMediaMigrationRaw(f.m,BUILDER,f.values.afterBuilder.replace(/\r\n/g,'\n'),f.load)).toThrow();
  f.docs[f.m.fixtures.beforeBuilder.path]=f.values.beforeBuilder.replace(/\r\n/g,'\n');expect(()=>validateStarterMediaMigration(f.m,f.load)).toThrow();
 });
 it('preserves a captured CRLF before-pack while publishing a normalized inverse',()=>{
  const f=fixture(),rawBefore=f.values.beforePack.replace(/\n/g,'\r\n');f.docs[f.m.fixtures.beforePack.path]=rawBefore;f.m.fixtures.beforePack.sha256=digest(rawBefore);f.m.beforeRawInputs[PACK]=digest(rawBefore);
  validateStarterMediaMigration(f.m,f.load);expect(inverseStarterMediaMigrationRaw(f.m,PACK,f.values.afterPack,f.load)).toBe(rawBefore);expect(inverseStarterMediaMigrationNormalized(f.m,PACK,f.values.afterPack,f.load)).toBe(f.values.beforePack);
  const whitespace=rawBefore+' ';f.docs[f.m.fixtures.beforePack.path]=whitespace;f.m.fixtures.beforePack.sha256=digest(whitespace);f.m.beforeRawInputs[PACK]=digest(whitespace);f.m.beforeInputs[PACK]=digest(whitespace.replace(/\r\n/g,'\n'));expect(()=>validateStarterMediaMigration(f.m,f.load)).toThrow(/canonical before pack/);
 });
 it.each(['missing map','extra field','unready','unsafe fixture','wrong parent inputs','delta index','delta status','source drift','raw drift','metadata drift','builder drift'])('rejects %s',fault=>{
  const f=fixture();
  if(fault==='missing map')delete f.m.beforeInputs['other/0.json'];
  if(fault==='extra field')Object.assign(f.m,{patches:[]});
  if(fault==='unready')Object.assign(f.m,{readiness:'prepared'});
  if(fault==='unsafe fixture')f.m.fixtures.beforePack.path='../pack.json';
  if(fault==='delta index')f.m.delta[0].sourceIndex=0;
  if(fault==='delta status')f.m.delta[0].row.status='approved';
  if(fault==='source drift')f.docs['public/data/v1/media.json']+=' ';
  if(fault==='raw drift')f.docs[f.m.fixtures.beforePack.path]+=' ';
  if(fault==='metadata drift')f.m.beforeMeta.contentHash='changed';
  if(fault==='builder drift')f.docs[f.m.fixtures.afterBuilder.path]+='\n';
  expect(()=>validateStarterMediaMigration(f.m,f.load,fault==='wrong parent inputs'?{...f.m.beforeInputs,[PACK]:'0'.repeat(64)}:undefined)).toThrow();
 });
 it('rejects forged, fully rehashed non-media edits and status approvals',()=>{
  for(const mutate of [(p:Record<string,any>)=>p.words[0].word='changed',(p:Record<string,any>)=>p.media[1].status='approved']){
   const f=fixture(),p=JSON.parse(f.values.afterPack);mutate(p);const text=JSON.stringify(p)+'\n';f.docs[f.m.fixtures.afterPack.path]=text;f.m.fixtures.afterPack.sha256=digest(text);f.m.afterInputs[PACK]=f.m.afterRawInputs[PACK]=digest(text);expect(()=>validateStarterMediaMigration(f.m,f.load)).toThrow();
  }
 });
 it('rejects unknown after bytes even when semantic JSON is identical',()=>{const f=fixture();expect(()=>inverseStarterMediaMigrationRaw(f.m,PACK,f.values.afterPack+' ',f.load)).toThrow();});
 it('rejects fully rehashed whitespace and duplicate-key pack fixtures',()=>{
  for(const change of [(s:string)=>s+' ',(s:string)=>s.replace('{','{"media":[],')]){
   const f=fixture(),text=change(f.values.afterPack);f.docs[f.m.fixtures.afterPack.path]=text;f.m.fixtures.afterPack.sha256=digest(text);f.m.afterInputs[PACK]=f.m.afterRawInputs[PACK]=digest(text);expect(()=>validateStarterMediaMigration(f.m,f.load)).toThrow(/canonical/);
  }
 });
 it('rejects fully rehashed reordered dataset and source row keys',()=>{
  for(const reorder of [(p:MigrationPackFixture)=>({meta:p.meta,media:p.media,words:p.words}),(p:MigrationPackFixture)=>({...p,media:p.media.map((r:Record<string,unknown>)=>Object.fromEntries(Object.entries(r).reverse()))})]){
   const f=fixture(),pack=reorder(JSON.parse(f.values.afterPack));pack.meta.contentHash='sa:'+digest(JSON.stringify({sourceHash:f.m.beforeMeta.contentHash,datasets:Object.fromEntries(Object.entries(pack).filter(([key])=>key!=='meta'))}));
   const text=JSON.stringify(pack)+'\n';f.docs[f.m.fixtures.afterPack.path]=text;f.m.fixtures.afterPack.sha256=digest(text);f.m.afterInputs[PACK]=f.m.afterRawInputs[PACK]=digest(text);f.m.afterPackMeta=pack.meta;
   expect(()=>validateStarterMediaMigration(f.m,f.load)).toThrow(/serialized result/);
  }
 });
});


describe('content-authenticated migration proof cache',()=>{
 it('reuses only an immutable proof while rereading every actual dependency',()=>{
  const f=fixture(),reads:string[]=[];
  const load=(p:string)=>{reads.push(p);return f.load(p);};
  const first=validateStarterMediaMigration(f.m,load,f.m.beforeInputs);
  reads.length=0;
  const second=validateStarterMediaMigration(structuredClone(f.m),load,{...f.m.beforeInputs});
  expect(second).toBe(first);expect(reads).toHaveLength(6);
  expect(Object.isFrozen(first)).toBe(true);expect(Object.isFrozen(first.before)).toBe(true);
  expect(Object.isFrozen(f.m)).toBe(false);expect(Object.isFrozen(f.m.delta[0].row)).toBe(false);
  expect(first.before.meta).not.toBe(f.m.beforePackMeta);expect(first.after.meta).not.toBe(f.m.afterPackMeta);
  expect(()=>{(first.before.words as Record<string,unknown>[])[0].word='poison';}).toThrow();
  expect(inverseStarterMediaMigrationRaw(f.m,PACK,f.values.afterPack,load)).toBe(f.values.beforePack);
  expect(inverseStarterMediaMigrationRaw(f.m,PACK,f.values.afterPack,load)).toBe(f.values.beforePack);
 });
 it.each(['delta','undefined delta field','metadata','unknown field','domain','parent adjacency','fixture raw','source raw','priority raw','actual input','unchanged input'])('rejects %s mutation after a warm hit',fault=>{
  const f=fixture();validateStarterMediaMigration(f.m,f.load);validateStarterMediaMigration(f.m,f.load);
  if(fault==='delta')f.m.delta[0].sourceIndex++;
  if(fault==='undefined delta field')Object.assign(f.m.delta[0],{unexpected:undefined});
  if(fault==='metadata')f.m.beforeMeta.contentHash='changed';
  if(fault==='unknown field')Object.assign(f.m,{unexpected:undefined});
  if(fault==='domain')delete f.m.afterInputs['other/0.json'];
  if(fault==='fixture raw')f.docs[f.m.fixtures.beforePack.path]+=' ';
  if(fault==='source raw')f.docs['public/data/v1/media.json']+=' ';
  if(fault==='priority raw')f.docs['public/data/v1/exam_priority.json']+=' ';
  const attempt=()=>{
   if(fault==='actual input')return inverseStarterMediaMigrationRaw(f.m,PACK,f.values.afterPack+' ',f.load);
   if(fault==='unchanged input')return inverseStarterMediaMigrationRaw(f.m,'other/0.json','changed',f.load);
   return validateStarterMediaMigration(f.m,f.load,fault==='parent adjacency'?{...f.m.beforeInputs,[PACK]:'0'.repeat(64)}:undefined);
  };
  expect(attempt).toThrow();
 });
 it('invalidates changed manifest guard content instead of trusting object identity',()=>{
  const f=fixture(),first=validateStarterMediaMigration(f.m,f.load);
  f.m.parentManifestHash='b'.repeat(64);
  const second=validateStarterMediaMigration(f.m,f.load);expect(second).not.toBe(first);
  for(const map of [f.m.beforeInputs,f.m.afterInputs,f.m.beforeRawInputs,f.m.afterRawInputs])map['other/0.json']=digest('new');
  expect(validateStarterMediaMigration(f.m,f.load)).not.toBe(second);
  expect(()=>inverseStarterMediaMigrationRaw(f.m,'other/0.json','same',f.load)).toThrow();
 });
 it('rechecks changed bytes at the same filesystem path and mtime after a hit',()=>{
  const f=fixture(),directory=mkdtempSync(join(tmpdir(),'migration-cache-'));
  try{
   const path=join(directory,'fixture.json'),key=f.m.fixtures.afterPack.path;
   writeFileSync(path,f.docs[key]);const stamp=statSync(path);
   const load=(p:string)=>p===key?readFileSync(path,'utf8'):f.load(p);
   validateStarterMediaMigration(f.m,load);validateStarterMediaMigration(f.m,load);
   writeFileSync(path,f.docs[key].replace('dog','fog'));utimesSync(path,stamp.atime,stamp.mtime);
   expect(()=>validateStarterMediaMigration(f.m,load)).toThrow(/raw hash/);
  }finally{rmSync(directory,{recursive:true,force:true});}
 });
 it('rejects fully rehashed noncanonical fixtures after a warm hit',()=>{
  for(const mutate of [(s:string)=>s+' ',(s:string)=>s.replace('{','{"media":[],')]){
   const f=fixture();validateStarterMediaMigration(f.m,f.load);validateStarterMediaMigration(f.m,f.load);
   const text=mutate(f.values.afterPack);f.docs[f.m.fixtures.afterPack.path]=text;
   f.m.fixtures.afterPack.sha256=digest(text);f.m.afterInputs[PACK]=f.m.afterRawInputs[PACK]=digest(text);
   expect(()=>validateStarterMediaMigration(f.m,f.load)).toThrow(/canonical/);
  }
 });
});


describe('migration cache plain JSON boundary',()=>{
 it.each(['symbol key','symbol value','prototype','array extra','array symbol','array hole','hidden property','accessor','undefined','nonfinite','cycle'])('rejects %s identically cold and warm without invoking getters',fault=>{
  for(const warm of [false,true]){
   const f=fixture();
   // Distinct valid parent values ensure the cold case cannot hit an earlier proof.
   f.m.parentManifestHash=(warm?'c':'d').repeat(64);
   if(warm){validateStarterMediaMigration(f.m,f.load);validateStarterMediaMigration(f.m,f.load);}
   let getterCalls=0;
   const row=f.m.delta[0].row;
   if(fault==='symbol key')Object.defineProperty(row,Symbol('unexpected'),{value:'extra',enumerable:true});
   if(fault==='symbol value')row.unexpected=Symbol('extra');
   if(fault==='prototype')Object.setPrototypeOf(row,{unexpected:'extra'});
   if(fault==='array extra')Object.assign(f.m.delta,{unexpected:'extra'});
   if(fault==='array symbol')Object.defineProperty(f.m.delta,Symbol('unexpected'),{value:'extra',enumerable:true});
   if(fault==='array hole')f.m.delta.length++;
   if(fault==='hidden property')Object.defineProperty(row,'hidden',{value:'extra'});
   if(fault==='accessor')Object.defineProperty(row,'getter',{get(){getterCalls++;return 'extra';},enumerable:true});
   if(fault==='undefined')row.unexpected=undefined;
   if(fault==='nonfinite')row.unexpected=NaN;
   if(fault==='cycle')row.unexpected=row;
   expect(()=>validateStarterMediaMigration(f.m,f.load)).toThrow(/non-JSON/);
   expect(getterCalls).toBe(0);
  }
 });
 it.each(['status','dataset order','source row order'])('rejects fully rehashed %s changes after a warm hit',fault=>{
  const f=fixture();validateStarterMediaMigration(f.m,f.load);validateStarterMediaMigration(f.m,f.load);
  let pack=JSON.parse(f.values.afterPack) as MigrationPackFixture;
  if(fault==='status')pack.media[1].status='approved';
  if(fault==='dataset order')pack={meta:pack.meta,media:pack.media,words:pack.words};
  if(fault==='source row order')pack.media=pack.media.map(row=>Object.fromEntries(Object.entries(row).reverse()) as typeof row);
  pack.meta.contentHash='sa:'+digest(JSON.stringify({sourceHash:f.m.beforeMeta.contentHash,datasets:Object.fromEntries(Object.entries(pack).filter(([key])=>key!=='meta'))}));
  const text=JSON.stringify(pack)+'\n';f.docs[f.m.fixtures.afterPack.path]=text;
  f.m.fixtures.afterPack.sha256=digest(text);f.m.afterInputs[PACK]=f.m.afterRawInputs[PACK]=digest(text);f.m.afterPackMeta=pack.meta;
  expect(()=>validateStarterMediaMigration(f.m,f.load)).toThrow();
 });
});


describe('migration proof byte loader',()=>{
 it('shares authenticated proof for identical string and Buffer bytes and rejects mutated buffers',()=>{
  const f=fixture(true),proof=validateStarterMediaMigration(f.m,f.load);
  const load=(p:string)=>Buffer.from(f.load(p),'utf8');
  expect(validateStarterMediaMigration(f.m,load)).toBe(proof);
  expect(inverseStarterMediaMigrationRaw(f.m,BUILDER,f.values.afterBuilder,load)).toBe(f.values.beforeBuilder);
  expect(inverseStarterMediaMigrationNormalized(f.m,PACK,f.values.afterPack,load)).toBe(f.values.beforePack);
  for(const path of [f.m.fixtures.afterPack.path,'public/data/v1/media.json','public/data/v1/exam_priority.json']){
   expect(()=>validateStarterMediaMigration(f.m,p=>p===path?Buffer.concat([load(p),Buffer.from(' ')]):load(p))).toThrow();
  }
 });
 it('normalizes only CRLF in Buffer sources and authenticates raw fixtures independently',()=>{
  const f=fixture(),first=validateStarterMediaMigration(f.m,f.load);
  const path='public/data/v1/media.json';f.docs[path]=f.docs[path].replace(/\n/g,'\r\n');
  const load=(p:string)=>Buffer.from(f.load(p),'utf8');
  const next=validateStarterMediaMigration(f.m,load);expect(next).not.toBe(first);expect(next.before).toEqual(first.before);
  f.docs[path]=f.docs[path].replace(/\r\n/g,'\r');expect(()=>validateStarterMediaMigration(f.m,load)).toThrow(/source guard/);
 });
});


it('rejects malformed UTF-8 Buffer sources after pure byte CRLF normalization',()=>{
 const f=fixture(),path='public/data/v1/media.json';validateStarterMediaMigration(f.m,f.load);
 const bad=Buffer.from(f.docs[path].replace(/\n/g,'\r\n'));bad[bad.indexOf('cat')]=255;
 const normalized=Buffer.from(bad.toString('latin1').replace(/\r\n/g,'\n'),'latin1');
 for(const map of [f.m.beforeInputs,f.m.afterInputs])map[path]=digest(normalized);
 for(const map of [f.m.beforeRawInputs,f.m.afterRawInputs])map[path]=digest(bad);
 f.m.sourceMediaHash=digest(normalized);
 expect(()=>validateStarterMediaMigration(f.m,p=>p===path?bad:Buffer.from(f.load(p)))).toThrow(/encoded data|encoding/i);
});
