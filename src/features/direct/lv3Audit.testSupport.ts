import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {lv3Unit1BeforeAudit} from './lv3Unit1Audit.testSupport';

type Row = Record<string, unknown>;
type Collection = {path:string; rowsField:string|null; key:string};
type FileGuard = {beforeHash:string;afterHash:string;beforeByteHash?:string;afterByteHash?:string;beforeFixture?:string};
export type AuditPatch = {dataset:string;path:string;key:string;id:string;before:Row;after:Row;reason:string;evidence?:unknown[];fieldEvidence?:Record<string,unknown[]>};
export type AuditManifest = {beforeMeta?:Row;beforePackMeta?:Row;afterMeta?:Row|null;unchangedInputs?:Record<string,string>;derivedBefore?:Record<string,string>;derivedAfter?:Record<string,string>|null;readiness?:string;schemaVersion:number;unit:string;baseline:string;parentManifestHash?:string;scope?:string;scopeHash?:string;collections?:Record<string,Collection>;files?:Record<string,FileGuard>;datasets?:Record<string,FileGuard&Collection>;patches:AuditPatch[]};
export type AuditScope = {schemaVersion:number;unit:string;baseline:string;collections:Record<string,Collection>;rows:{dataset:string;id:string;beforeHash:string;after:Row}[]};
type Entry = {unit:string;path:string;manifestHash:string;status:'committed'|'prepared'};
const BASELINE='99883751926bd6cb4feff70daff56c07afc130cb';
const U01_ANCHOR_HASH='6008609dda537f69ef0880d6482c713b1e6e75ec0fa8c3a4af71cdee9b08e4f0';
const U01_MANIFEST_HASH='317ab4353c8a462071ab98efb9604f7f26d67f427ffe6c7d24b5a71a768b5309';
const docs=new URL('../../../docs/lv3-audit-20261107/',import.meta.url);
export const auditHash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const read=(path:string)=>{
 assert.ok(path&&!path.includes('..')&&!path.includes('\\')&&!path.includes(':')&&!path.startsWith('/'),'unsafe chain path');
 return JSON.parse(readFileSync(new URL(path,docs),'utf8'));
};

export function auditContract(m:AuditManifest):{collections:Record<string,Collection>;files:Record<string,FileGuard>} {
 if(m.schemaVersion===2){assert.ok(m.collections&&m.files);return {collections:m.collections,files:m.files};}
 assert.equal(m.schemaVersion,1);
 assert.equal(m.unit,'LV3-U01');
 assert.ok(m.datasets);
 return {collections:Object.fromEntries(Object.entries(m.datasets).map(([k,d])=>[k,{path:d.path,key:d.key,rowsField:d.rowsField??null}])),
  files:Object.fromEntries(Object.values(m.datasets).map(d=>[d.path,{beforeHash:d.beforeHash,afterHash:d.afterHash}]))};
}

function newUnitNumber(unit:string):number|null {
 assert.match(unit,/^LV3-U[0-9]{2}$/,'invalid unit identity');
 const number=Number(unit.slice(-2));assert.ok([1,2].includes(number)||(number>=4&&number<=24),'unregistered unit identity');
 return number>=4?number:null;
}
function validateCurriculumIdentity(unit:string,path:string,value:unknown):void {
 const number=newUnitNumber(unit);if(number===null)return;
 assert.equal(path,`src/features/direct/curriculumLV3Unit${number}.json`,'unit curriculum path mismatch');
 const document=value as Row,template=document.template as Row;
 assert.ok(template);assert.equal(template.templateId,'TEXTBOOK-'+unit,'unit curriculum template mismatch');
 assert.equal(template.level,'LV3');assert.equal(template.unit,number);
 const items=document.learningItems as Row[];assert.ok(Array.isArray(items)&&items.length);
 for(const row of items){
  const suffix=row.kind==='vocabulary'?'V':row.kind==='grammar'?'G':null;
  assert.ok(suffix&&new RegExp(`^LI-LV3U${String(number).padStart(2,'0')}-${suffix}[0-9]{3}$`).test(String(row.learningItemId)),'unit curriculum item namespace mismatch');
 }
}

// Bounded U05-VOC-288 evidence, never general wordVariants lemmatization.
function verifiedWageForms(p:AuditPatch,f:Row){
 return p.dataset==='words'&&p.id==='W002976'&&p.before.wordId==='W002976'
  &&p.before.word==='wage(s)'&&JSON.stringify(p.before.wordVariants)===JSON.stringify(['wage','wages'])
  &&f.base==='wage'&&f.past==='waged'&&f.pastParticiple==='waged'
  &&f.sourceRef==='https://www.collinsdictionary.com/dictionary/english/wage'
  &&(p.fieldEvidence?.verbForms??[]).some(record=>(record as {sources:unknown[]}).sources.some(source=>{
   if(typeof source!=='object'||source===null)return false;
   const s=source as Row;
   return s.url===f.sourceRef&&s.type==='independent_dictionary_verification'
    &&s.verification==='direct_dictionary_entry_read'&&s.findingId==='U05-VOC-288';
  }));
}

export function validateAuditScope(m:AuditManifest,scope:AuditScope):void {
 const keys=(value:object)=>Object.keys(value).sort();
 const sameKeys=(value:object,expected:string[])=>assert.deepEqual(keys(value),[...expected].sort(),'unknown or missing contract fields');
 const requireDigest=(value:unknown)=>assert.ok(typeof value==='string'&&/^[a-f0-9]{64}$/.test(value),'invalid digest');
 sameKeys(m,['schemaVersion','unit','baseline','parentManifestHash','readiness','scope','scopeHash','collections','files','patches','unchangedInputs','derivedBefore','beforeMeta','beforePackMeta','derivedAfter','afterMeta']);
 assert.equal(m.schemaVersion,2);assert.equal(m.baseline,BASELINE);
 assert.equal(auditHash(scope),m.scopeHash,'scope hash mismatch');
 assert.equal(scope.schemaVersion,1);assert.equal(scope.unit,m.unit);assert.equal(scope.baseline,BASELINE);
 assert.deepEqual(m.collections,scope.collections,'collection scope mismatch');
 const contracts=auditContract(m);
 assert.deepEqual(keys(contracts.files),[...new Set(Object.values(contracts.collections).map(c=>c.path))].sort(),'physical file set mismatch');
 const globalCollections:Record<string,{path:string;key:string}>={words:{path:'public/data/v1/words.json',key:'wordId'},examples:{path:'public/data/v1/examples.json',key:'exampleId'},notes:{path:'public/data/v1/notes.json',key:'noteId'}};
 const safeRelative=(path:string)=>assert.ok(path&&!path.includes('\\')&&!path.includes(':')&&!path.startsWith('/')&&!path.split('/').includes('..'),'unsafe path');
 for(const [name,col]of Object.entries(contracts.collections)){
  sameKeys(col,['path','key','rowsField']);safeRelative(col.path);
  if(globalCollections[name]){
   assert.equal(col.path,globalCollections[name].path);assert.equal(col.key,globalCollections[name].key);assert.equal(col.rowsField,null,'global rows must be root array');
  }else{
   assert.ok(name==='curriculum'||name==='grammarQuestions','unsupported collection');
   assert.ok(col.path.startsWith('src/features/direct/curriculum')&&col.path.endsWith('.json'),'invalid curriculum path');
   const number=newUnitNumber(m.unit);
   if(number!==null){assert.equal(col.path,`src/features/direct/curriculumLV3Unit${number}.json`,'unit curriculum path mismatch');assert.equal(name,'curriculum','new-unit question schema unsupported');}
   assert.equal(col.key,name==='curriculum'?'learningItemId':'questionId');
   assert.equal(col.rowsField,name==='curriculum'?'learningItems':'grammarQuestions');
  }
 }
 for(const [path,g]of Object.entries(contracts.files)){
  safeRelative(path);sameKeys(g,['beforeHash','afterHash','beforeByteHash','afterByteHash',...(Object.hasOwn(g,'beforeFixture')?['beforeFixture']:[])]);
  for(const h of [g.beforeHash,g.afterHash,g.beforeByteHash,g.afterByteHash])requireDigest(h);
 }
 const allowed=new Map(scope.rows.map(r=>[r.dataset+':'+r.id,r]));
 assert.equal(allowed.size,scope.rows.length,'duplicate scope row');assert.ok(m.patches.length&&m.patches.length===allowed.size,'scope row set mismatch');
 const seen=new Set<string>();
 const protectedKeys=new Set(['status','wordId','exampleId','noteId','learningItemId','questionId','word','wordVariants','sentenceEn','originalExample','originalExamples','kind','review','practiceMode','stem','answer']);
 const allowedFields:Record<string,string[]>={
  words:['meaningZh','meaningEn','usagePattern','usagePatternZh','verbForms','pos','posAll'],
  examples:['sensePos','meaningHint'],notes:['title','content'],curriculum:['explanationZh'],grammarQuestions:['targetMeaningZh','options']
 };
 for(const p of m.patches){
  sameKeys(p,['dataset','path','key','id','before','after','reason','evidence','fieldEvidence']);
  const id=p.dataset+':'+p.id,r=allowed.get(id),col=contracts.collections[p.dataset];
  assert.ok(r&&!seen.has(id),'duplicate or unscoped row');seen.add(id);
  assert.ok(col);assert.equal(p.path,col.path);assert.equal(p.key,col.key);
  assert.ok(p.before&&typeof p.before==='object'&&!Array.isArray(p.before));assert.equal(p.before[p.key],p.id);
  assert.equal(auditHash(p.before),r.beforeHash);assert.deepEqual(p.after,r.after,'exact scope values required');
  let fields=allowedFields[p.dataset];
  if(p.dataset==='curriculum'){
   assert.ok(p.before.kind==='grammar'||p.before.kind==='vocabulary','unknown curriculum kind');
   fields=p.before.kind==='grammar'?['explanationZh']:['sensePos','targetMeaningZh','chapterMeaningsZh','meaningSource'];
   if(Object.hasOwn(p.after,'meaningSource'))assert.ok(['textbook_source_review','textbook_and_dictionary_review'].includes(p.after.meaningSource as string),'invalid reviewed meaning source');
   for(const [field,value]of Object.entries(p.after).filter(([field])=>fields.includes(field))){
    assert.ok(typeof value==='string'&&value.trim(),'invalid curriculum scalar');
    assert.ok(p.fieldEvidence?.[field]?.length,'missing curriculum field source');
   }
  }
  assert.ok(Object.keys(p.after).length&&Object.keys(p.after).every(k=>fields?.includes(k)&&!protectedKeys.has(k)),'disallowed after field');
  assert.ok(Object.entries(p.after).some(([k,v])=>!Object.hasOwn(p.before,k)||auditHash(p.before[k])!==auditHash(v)),'no-op patch');
  assert.ok(typeof p.reason==='string'&&p.reason.trim()&&p.fieldEvidence&&Object.keys(p.fieldEvidence).length,'missing evidence');
  for(const records of Object.values(p.fieldEvidence)){
   assert.ok(Array.isArray(records)&&records.length,'missing field source');
   for(const record of records){
    const r=record as {sources?:unknown[];reason?:string;proposal?:string};
    assert.ok(Array.isArray(r.sources)&&r.sources.length&&r.reason&&r.proposal,'missing field source');
   }
  }
  if(Object.hasOwn(p.after,'options')){
   const old=p.before.options as Row[],next=p.after.options as Row[];
   assert.ok(Array.isArray(old)&&Array.isArray(next));assert.equal(old.length,4);assert.equal(next.length,4);
   assert.deepEqual(next.map(o=>o.id),old.map(o=>o.id),'option identities/order');
   assert.equal(new Set(next.map(o=>o.text)).size,4);
   for(let i=0;i<4;i++){
    assert.deepEqual(keys(next[i]),keys(old[i]));
    for(const k of Object.keys(old[i]).filter(k=>!['text','rationaleZh'].includes(k)))assert.deepEqual(next[i][k],old[i][k]);
    for(const k of ['text','rationaleZh'])assert.ok(typeof next[i][k]==='string'&&(next[i][k] as string).trim(),'invalid option content');
    if(old[i].id===p.before.answer)assert.equal(next[i].text,old[i].text,'correct answer text');
   }
  }
  if(Object.hasOwn(p.after,'verbForms')){
   const f=p.after.verbForms as Row;sameKeys(f,['base','past','pastParticiple','sourceRef','status']);
   assert.ok(f.base===p.before.word||verifiedWageForms(p,f),'invalid verified forms base');assert.equal(f.status,'approved');
   assert.ok(['https://www.collinsdictionary.com/dictionary/english/'+f.base,'https://www.collinsdictionary.com/conjugation/english/'+f.base].includes(f.sourceRef as string),'invalid verified forms source');
   assert.ok((p.fieldEvidence.verbForms??[]).some(record=>(record as {sources:unknown[]}).sources.some(source=>typeof source==='object'&&source!==null&&(source as Row).url===f.sourceRef)),'forms source lacks evidence');
  }
 }
}


export function loadLV3Chain(){
 const chain=read('chain.json') as {schemaVersion:number;baseline:string;anchor:string;anchorHash:string;entries:Entry[]};
 assert.equal(chain.schemaVersion,1);assert.equal(chain.baseline,BASELINE);
 assert.equal(chain.entries[0]?.unit,'LV3-U01');
 assert.equal(new Set(chain.entries.map(e=>e.unit)).size,chain.entries.length);
 const anchor=read(chain.anchor) as {inputs:Record<string,string>};assert.equal(auditHash(anchor),chain.anchorHash);assert.equal(chain.anchorHash,U01_ANCHOR_HASH);
 assert.equal(chain.entries[0].manifestHash,U01_MANIFEST_HASH);assert.equal(chain.entries[0].status,'committed');
 const ledger=read('LV3-ledger.json') as {units:{unit:number;source:string}[]};
 const catalog=new Map(ledger.units.map(u=>['LV3-U'+String(u.unit).padStart(2,'0'),u.source]));assert.equal(catalog.size,23);assert.ok(!catalog.has('LV3-U03'));
 let previousInputs:Record<string,string>|null={...anchor.inputs};
 const derived=['public/data/v1/meta.json','public/data/v1/sa-pack.json'];
 let previous:string|undefined,prepared=false;
 return chain.entries.map(e=>{
  assert.ok(e.status==='committed'||e.status==='prepared');
  assert.ok(!prepared||e.status==='prepared','committed chain gap');prepared ||= e.status==='prepared';
  const manifest=read(e.path) as AuditManifest;
  assert.equal(auditHash(manifest),e.manifestHash);assert.equal(manifest.unit,e.unit);assert.equal(manifest.baseline,BASELINE);
  let scope:AuditScope|undefined;
  if(manifest.schemaVersion===2){
   assert.equal(manifest.parentManifestHash,previous,'broken parent chain');
   assert.ok(manifest.scope);scope=read(manifest.scope) as AuditScope;validateAuditScope(manifest,scope);
   assert.ok(previousInputs,'predecessor checkpoint not finalized');
   const files=manifest.files!,collections=manifest.collections!;
   for(const name of ['curriculum','grammarQuestions'])if(collections[name])assert.equal(collections[name].path,catalog.get(e.unit),'unit curriculum path');
   assert.deepEqual(Object.keys(manifest.unchangedInputs??{}).sort(),Object.keys(previousInputs).filter(p=>!files[p]&&!derived.includes(p)).sort());
   for(const [p,h]of Object.entries(manifest.unchangedInputs??{}))assert.equal(previousInputs[p],h,'chain unchanged guard');
   for(const [p,g]of Object.entries(files))assert.equal(previousInputs[p],g.beforeByteHash,'broken before-byte chain');
   assert.deepEqual(manifest.derivedBefore,Object.fromEntries(derived.map(p=>[p,previousInputs![p]])));
   previousInputs={...previousInputs,...Object.fromEntries(Object.entries(files).map(([p,g])=>{assert.ok(g.afterByteHash);return [p,g.afterByteHash];}))};
   if(manifest.derivedAfter==null){assert.equal(e.status,'prepared');previousInputs=null;}
   else{assert.deepEqual(Object.keys(manifest.derivedAfter).sort(),[...derived].sort());Object.assign(previousInputs,manifest.derivedAfter);}
   if(e.status==='committed')assert.equal(manifest.readiness,'ready');
  }else{assert.equal(previous,undefined);assert.equal(manifest.unit,'LV3-U01');}
  assert.ok(catalog.has(e.unit),'unregistered LV3 unit');
  previous=e.manifestHash;
  return {entry:e,manifest,scope};
 });
}

let validatedChain:ReturnType<typeof loadLV3Chain>|undefined;
const stableChain=()=>validatedChain??=loadLV3Chain();

function rows(value:unknown,col:Collection):Row[]{
 const result=col.rowsField?(value as Row)[col.rowsField]:value;
 assert.ok(Array.isArray(result),'collection must contain rows');return result as Row[];
}

/** Strict physical-file projection; checks complete documents, never subsets. */
export function projectAuditStep(m:AuditManifest,documents:Record<string,unknown>,inverse=true,scope?:AuditScope){
 if(m.schemaVersion===2){assert.ok(scope);validateAuditScope(m,scope);}
 const c=auditContract(m),out=structuredClone(documents);
 assert.deepEqual(Object.keys(documents).sort(),Object.keys(c.files).sort(),'incomplete document set');
 for(const [name,col]of Object.entries(c.collections))if(['curriculum','grammarQuestions'].includes(name))validateCurriculumIdentity(m.unit,col.path,documents[col.path]);
 for(const [path,g]of Object.entries(c.files))assert.equal(auditHash(documents[path]),g[inverse?'afterHash':'beforeHash'],'unknown whole-file drift');
 for(const p of inverse?[...m.patches].reverse():m.patches){
  const col=c.collections[p.dataset],rr=rows(out[col.path],col),indices=rr.flatMap((r,i)=>r[p.key]===p.id?[i]:[]);
  assert.equal(indices.length,1,'nonunique row');
  assert.deepEqual(rr[indices[0]],inverse?{...p.before,...p.after}:p.before,'complete row drift');
  rr[indices[0]]=structuredClone(inverse?p.before:{...p.before,...p.after});
 }
 for(const col of Object.values(c.collections)){
  const old=rows(documents[col.path],col).map(r=>r[col.key]),next=rows(out[col.path],col).map(r=>r[col.key]);
  assert.deepEqual(next,old,'ID/order/count');assert.equal(new Set(next).size,next.length,'duplicate IDs');
 }
 for(const [path,g]of Object.entries(c.files))assert.equal(auditHash(out[path]),g[inverse?'beforeHash':'afterHash'],'wrong result hash');
 return out;
}

/** Row-level compatibility for historical fixtures; untouched drift stays visible. */
function reverseRows<T>(m:AuditManifest,dataset:string,value:T,allowMissing:boolean):T {
 const c=auditContract(m),col=c.collections[dataset],out=structuredClone(value);
 if(!col)return out;
 assert.equal(col.rowsField,null,'use physical-file projection for curriculum documents');
 const rr=rows(out,col);
 for(const p of [...m.patches].reverse().filter(p=>p.dataset===dataset)){
  const indexes=rr.flatMap((r,i)=>r[p.key]===p.id?[i]:[]);
  assert.ok(indexes.length<=1,'audit cannot conceal duplicate identities');
  if(!indexes.length&&allowMissing)continue;
  assert.equal(indexes.length,1,'complete audit dataset must contain recorded identity');
  assert.deepEqual(rr[indexes[0]],{...p.before,...p.after},'exact audited row required');
  rr[indexes[0]]=structuredClone(p.before);
 }
 return out;
}

function checkpoint(afterUnit:string){
 const chain=stableChain(),committed=chain.filter(x=>x.entry.status==='committed');
 const positions=committed.flatMap((x,i)=>x.entry.unit===afterUnit?[i]:[]);
 assert.equal(positions.length,1,'unknown or uncommitted checkpoint');
 const index=positions[0],anchor=read('U01-checkpoint.json') as {inputs:Record<string,string>};
 const bytes={...anchor.inputs},semantic:Record<string,string>={};
 for(const step of committed.slice(0,index+1)){
  for(const [path,g]of Object.entries(auditContract(step.manifest).files)){
   semantic[path]=g.afterHash;if(g.afterByteHash)bytes[path]=g.afterByteHash;
  }
  Object.assign(bytes,step.manifest.derivedAfter??{});
 }
 const later=committed.slice(index+1);
 for(const step of later)for(const [path,g]of Object.entries(auditContract(step.manifest).files))if(!semantic[path])semantic[path]=g.beforeHash;
 return {later,bytes,semantic};
}

export function lv3AfterUnitRows<T>(afterUnit:string,dataset:string,value:T,options:{allowMissing?:boolean}={}):T {
 const name=dataset.replace(/\.json$/,''),{later}=checkpoint(afterUnit);
 let copy=structuredClone(value);
 for(const x of [...later].reverse())copy=reverseRows(x.manifest,name,copy,options.allowMissing??false);
 return copy;
}
export function lv3AfterUnit1Rows<T>(dataset:string,value:T,options:{allowMissing?:boolean}={}):T {
 return lv3AfterUnitRows('LV3-U01',dataset,value,options);
}
export function lv3BeforeAudit<T>(dataset:string,value:T,options:{allowMissing?:boolean}={}):T {
 return lv3Unit1BeforeAudit(dataset,lv3AfterUnit1Rows(dataset,value,options),options);
}

export function reverseFileAuditSteps<T>(steps:{manifest:AuditManifest;scope?:AuditScope}[],path:string,value:T):T {
 let out=structuredClone(value);
 for(const {manifest,scope} of [...steps].reverse()){
  if(manifest.schemaVersion===2){assert.ok(scope);validateAuditScope(manifest,scope);}
  const c=auditContract(manifest),guard=c.files[path];if(!guard)continue;
  for(const [name,col]of Object.entries(auditContract(manifest).collections))if(col.path===path&&['curriculum','grammarQuestions'].includes(name))validateCurriculumIdentity(manifest.unit,path,out);
  assert.equal(auditHash(out),guard.afterHash,'unknown whole-file drift');
  for(const p of [...manifest.patches].reverse().filter(p=>p.path===path)){
   const rr=rows(out,c.collections[p.dataset]),indices=rr.flatMap((r,i)=>r[p.key]===p.id?[i]:[]);
   assert.equal(indices.length,1,'nonunique row');assert.deepEqual(rr[indices[0]],{...p.before,...p.after});
   rr[indices[0]]=structuredClone(p.before);
  }
  assert.equal(auditHash(out),guard.beforeHash,'wrong inverse hash');
 }
 return out;
}
export function lv3AfterUnitFile<T>(afterUnit:string,path:string,value:T):T {
 const state=checkpoint(afterUnit),out=reverseFileAuditSteps(state.later,path,value);
 if(state.semantic[path])assert.equal(auditHash(out),state.semantic[path],'target checkpoint semantic drift');
 else if(state.bytes[path]){
  // Authenticate exact original formatting before comparing parsed untouched data.
  const raw=readFileSync(new URL('../../../'+path,import.meta.url),'utf8').replace(/\r\n/g,'\n');
  const digest=createHash('sha256').update(raw).digest('hex');
  assert.equal(digest,state.bytes[path],'target checkpoint byte drift');
  assert.deepEqual(out,JSON.parse(raw),'target checkpoint semantic drift');
 }
 return out;
}
export function lv3AfterUnit1File<T>(path:string,value:T):T {
 return lv3AfterUnitFile('LV3-U01',path,value);
}


/** Strict one-step raw projection, also used for cross-language fixture parity. */
export function inversePublishedAuditStep(m:AuditManifest,scope:AuditScope,path:string,text:string):string {
 validateAuditScope(m,scope);
 assert.equal(text,text.replace(/\r\n/g,'\n'),'caller must normalize CRLF first');
 const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
 let out=text;
  const c=auditContract(m),guard=c.files[path];
  if(guard){
   assert.equal(digest(out),guard.afterByteHash,'unknown raw after drift');
   const value=JSON.parse(out);assert.equal(auditHash(value),guard.afterHash);
   for(const [name,col]of Object.entries(c.collections))if(col.path===path&&['curriculum','grammarQuestions'].includes(name))validateCurriculumIdentity(m.unit,path,value);
   for(const p of [...m.patches].reverse().filter(p=>p.path===path)){
    const rr=rows(value,c.collections[p.dataset]),indexes=rr.flatMap((r,i)=>r[p.key]===p.id?[i]:[]);
    assert.equal(indexes.length,1);assert.deepEqual(rr[indexes[0]],{...p.before,...p.after});rr[indexes[0]]=structuredClone(p.before);
   }
   assert.equal(auditHash(value),guard.beforeHash);out=JSON.stringify(value,null,2)+'\n';
   if(digest(out)!==guard.beforeByteHash){
    const fixture=guard.beforeFixture;assert.ok(fixture,'missing guarded byte fixture');
    assert.ok(fixture.startsWith('docs/lv3-audit-20261107/'),'invalid byte fixture path');
    const relative=fixture.slice('docs/lv3-audit-20261107/'.length);
    assert.ok(!relative.includes('..')&&!relative.includes(':')&&!relative.includes('\\'),'unsafe fixture path');
    out=readFileSync(new URL(relative,docs),'utf8').replace(/\r\n/g,'\n');assert.equal(auditHash(JSON.parse(out)),guard.beforeHash);
   }
   assert.equal(digest(out),guard.beforeByteHash,'wrong raw before hash');
  }else if(path==='public/data/v1/meta.json'||path==='public/data/v1/sa-pack.json'){
   assert.ok(m.derivedAfter&&m.derivedBefore);assert.equal(digest(out),m.derivedAfter[path],'unknown derived after drift');
   if(path.endsWith('/meta.json')){assert.ok(m.beforeMeta);out=JSON.stringify(m.beforeMeta,null,2)+'\n';}
   else{
    const pack=JSON.parse(out) as Row;
    for(const name of ['words','examples','notes'])if(c.collections[name])pack[name]=reverseRows(m,name,pack[name],true);
    assert.ok(m.beforePackMeta);pack.meta=structuredClone(m.beforePackMeta);out=JSON.stringify(pack)+'\n';
   }
   assert.equal(digest(out),m.derivedBefore[path],'wrong derived before hash');
  }

 return out;
}

/** Raw projection checks the selected target even when the successor list is empty. */
export function lv3AfterUnitPublishedText(afterUnit:string,path:string,text:string):string {
 assert.equal(text,text.replace(/\r\n/g,'\n'),'caller must normalize CRLF first');
 const state=checkpoint(afterUnit);
 let out=text;
 for(const {manifest,scope} of [...state.later].reverse()){
  assert.ok(scope);out=inversePublishedAuditStep(manifest,scope,path,out);
 }
 if(state.bytes[path])assert.equal(createHash('sha256').update(out).digest('hex'),state.bytes[path],'target checkpoint raw drift');
 return out;
}
export function lv3AfterUnit1PublishedText(path:string,text:string):string {
 return lv3AfterUnitPublishedText('LV3-U01',path,text);
}