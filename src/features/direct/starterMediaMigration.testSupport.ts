import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

type Row=Record<string,unknown>;
export const MIGRATION_ID='starter-media-actual-names-v1';
export const BUILDER='scripts/build_sa_pack.py',PACK='public/data/v1/sa-pack.json';
const MEDIA='public/data/v1/media.json',PRIORITY='public/data/v1/exam_priority.json',META='public/data/v1/meta.json';
const OLD='row.get("targetWord") in selected_names',NEXT='row.get("targetWord") in actual_names';
export type StarterMediaMigration={schemaVersion:3;kind:'starter-media-actual-names';migrationId:string;baseline:string;parentManifestHash:string;readiness:'ready';beforeInputs:Record<string,string>;afterInputs:Record<string,string>;beforeRawInputs:Record<string,string>;afterRawInputs:Record<string,string>;fixtures:Record<'beforeBuilder'|'afterBuilder'|'beforePack'|'afterPack',{path:string;sha256:string}>;delta:{sourceIndex:number;afterIndex:number;row:Row}[];sourceMediaHash:string;beforeMeta:Row;beforePackMeta:Row;afterPackMeta:Row};
export type MigrationLoader=(path:string)=>string|Buffer;
export const migrationByteHash=(s:string|Buffer)=>createHash('sha256').update(s).digest('hex');
const norm=(s:string)=>s.replace(/\r\n/g,'\n');
const utf8=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true});
const decode=(raw:string|Buffer)=>typeof raw==='string'?raw:utf8.decode(raw);
const normalizedDigest=(raw:string|Buffer,rawHash:string)=>{
 if(!raw.includes('\r\n'))return rawHash;
 // Latin-1 roundtrip is byte-preserving, including malformed UTF-8 and BOM bytes.
 return migrationByteHash(typeof raw==='string'?norm(raw):Buffer.from(norm(raw.toString('latin1')),'latin1'));
};
const hash=(v:unknown)=>migrationByteHash(JSON.stringify(v));
const keys=(v:object)=>Object.keys(v).sort();
const exactKeys=(v:object,k:string[])=>assert.deepEqual(keys(v),[...k].sort(),'migration contract fields');
const digest=(v:unknown)=>assert.ok(typeof v==='string'&&/^[a-f0-9]{64}$/.test(v),'invalid migration digest');

type MigrationProof={texts:Record<string,string>;before:Row;after:Row};
// One bounded, immutable proof. Never cache paths, loader identity, stat data or chain state.
let cachedProof:{key:string;proof:MigrationProof}|undefined;
function freezeProof<T>(value:T):T{
 if(value!==null&&typeof value==='object'){
  for(const child of Object.values(value))freezeProof(child);
  Object.freeze(value);
 }
 return value;
}

// Reject information that serialization could omit, without invoking accessors.
function assertPlainJson(value:unknown,active=new Set<object>()):void{
 if(value===null||typeof value==='string'||typeof value==='boolean')return;
 if(typeof value==='number'){assert.ok(Number.isFinite(value),'migration non-JSON number');return;}
 assert.ok(typeof value==='object','migration non-JSON value');
 const object=value as object,array=Array.isArray(object);
 assert.equal(Object.getPrototypeOf(object),array?Array.prototype:Object.prototype,'migration non-JSON prototype');
 assert.ok(!active.has(object),'migration non-JSON cycle');active.add(object);
 const ownKeys=Reflect.ownKeys(object);
 if(array)assert.equal(ownKeys.length,(object as unknown[]).length+1,'migration non-JSON array fields');
 for(const key of ownKeys){
  assert.equal(typeof key,'string','migration non-JSON symbol key');
  const descriptor=Object.getOwnPropertyDescriptor(object,key)!;
  assert.ok('value' in descriptor,'migration non-JSON accessor');
  if(array&&key==='length')continue;
  assert.equal(descriptor.enumerable,true,'migration non-JSON hidden field');
  if(array)assert.ok(/^(0|[1-9][0-9]*)$/.test(key as string)&&Number(key)<(object as unknown[]).length,'migration non-JSON array field');
  assertPlainJson(descriptor.value,active);
 }
 active.delete(object);
}

// Deterministic structural encoding of already checked JSON, preserving order and -0.
// V8 serialization is deliberately not used: equivalent cloned objects may encode differently.
function proofEncoding(value:unknown):string{
 if(value===null)return 'null';
 if(typeof value==='number')return 'number:'+(Object.is(value,-0)?'-0':String(value));
 if(typeof value==='string')return 'string:'+JSON.stringify(value);
 if(typeof value==='boolean')return 'boolean:'+String(value);
 if(Array.isArray(value))return 'array:['+value.map(proofEncoding).join(',')+']';
 return 'object:{'+Object.entries(value as Record<string,unknown>).map(([key,child])=>JSON.stringify(key)+':'+proofEncoding(child)).join(',')+'}';
}

/** Bounded proof: authenticated snapshots must describe precisely one media selection fix. */
export function validateStarterMediaMigration(m:StarterMediaMigration,load:MigrationLoader,previousInputs?:Record<string,string>){
 assertPlainJson(m);
 exactKeys(m,['schemaVersion','kind','migrationId','baseline','parentManifestHash','readiness','beforeInputs','afterInputs','beforeRawInputs','afterRawInputs','fixtures','delta','sourceMediaHash','beforeMeta','beforePackMeta','afterPackMeta']);
 assert.equal(m.schemaVersion,3);assert.equal(m.kind,'starter-media-actual-names');assert.equal(m.migrationId,MIGRATION_ID);assert.equal(m.readiness,'ready');
 assert.equal(m.baseline,'99883751926bd6cb4feff70daff56c07afc130cb');digest(m.parentManifestHash);digest(m.sourceMediaHash);
 const paths=keys(m.beforeInputs);assert.equal(paths.length,144);
 for(const map of [m.beforeInputs,m.afterInputs,m.beforeRawInputs,m.afterRawInputs]){assert.deepEqual(keys(map),paths);for(const [p,h] of Object.entries(map)){assert.ok(p&&!p.startsWith('/')&&!p.includes('\\')&&!p.includes(':')&&!p.split('/').includes('..'));digest(h);}}
 if(previousInputs)assert.deepEqual(m.beforeInputs,previousInputs,'migration checkpoint adjacency');
 for(const p of [BUILDER,PACK,MEDIA,PRIORITY,META])assert.ok(paths.includes(p),'missing migration input');
 for(const [before,after] of [[m.beforeInputs,m.afterInputs],[m.beforeRawInputs,m.afterRawInputs]])assert.deepEqual(paths.filter(p=>before[p]!==after[p]),[PACK,BUILDER].sort(),'migration changed input set');
 exactKeys(m.fixtures,['beforeBuilder','afterBuilder','beforePack','afterPack']);
 const texts:Record<string,string>={},rawTexts:Record<string,string|Buffer>={},rawDigests:Record<string,string>={};
 for(const [key,filename,path,side] of [['beforeBuilder','before-builder.py',BUILDER,'before'],['afterBuilder','after-builder.py',BUILDER,'after'],['beforePack','before-pack.json',PACK,'before'],['afterPack','after-pack.json',PACK,'after']]){
  const f=m.fixtures[key as keyof typeof m.fixtures];exactKeys(f,['path','sha256']);assert.equal(f.path,`docs/lv3-audit-20261107/${MIGRATION_ID}/${filename}`);digest(f.sha256);
  const raw=load(f.path),rawHash=migrationByteHash(raw);rawTexts[key]=raw;if(key.endsWith('Builder'))texts[key]=decode(raw);rawDigests[key]=rawHash;assert.equal(rawHash,f.sha256,'migration fixture raw hash');
  assert.equal(rawHash,(side==='before'?m.beforeRawInputs:m.afterRawInputs)[path],'migration raw guard');assert.equal(normalizedDigest(raw,rawHash),(side==='before'?m.beforeInputs:m.afterInputs)[path],'migration normalized guard');
 }
 assert.equal(texts.beforeBuilder.split(OLD).length,2,'migration builder unique replacement');assert.ok(!texts.beforeBuilder.includes(NEXT));assert.equal(texts.afterBuilder,texts.beforeBuilder.replace(OLD,NEXT),'migration builder exact edit');
 const source=(p:string)=>{const raw=load(p),rawHash=migrationByteHash(raw);assert.equal(normalizedDigest(raw,rawHash),m.beforeInputs[p],'migration source guard');rawDigests[p]=rawHash;return raw;};
 const mediaText=source(MEDIA),priorityText=source(PRIORITY);
 // Include the entire ordered manifest, not just its ID or selected guard fields.
 // All six actual texts above are reread and authenticated on every invocation.
 const proofKey=migrationByteHash(proofEncoding([m,rawDigests]));
 if(cachedProof?.key===proofKey)return cachedProof.proof;
 for(const [key,raw] of Object.entries(rawTexts))texts[key]=decode(raw);
 const media=JSON.parse(decode(mediaText)) as Row[],priorities=JSON.parse(decode(priorityText)) as Row[],meta=m.beforeMeta;
 assert.equal(migrationByteHash(JSON.stringify(meta,null,2)+'\n'),m.beforeInputs[META],'migration full meta guard');
 assert.equal(m.sourceMediaHash,m.beforeInputs[MEDIA]);assert.ok(Array.isArray(media)&&Array.isArray(priorities));
 const before=JSON.parse(texts.beforePack) as Row,after=JSON.parse(texts.afterPack) as Row;
 assert.equal(norm(texts.beforePack),JSON.stringify(before)+'\n','migration canonical before pack');assert.equal(texts.afterPack,JSON.stringify(after)+'\n','migration canonical after pack');
 assert.ok(Array.isArray(before.words)&&Array.isArray(before.media)&&Array.isArray(after.media));
 assert.equal(new Set((before.words as Row[]).map(r=>r.wordId)).size,(before.words as Row[]).length,'duplicate pack word IDs');
 const selected=new Set(priorities.filter(r=>['S','A'].includes(r.priorityTier as string)).map(r=>r.word)),actual=new Set((before.words as Row[]).map(r=>r.word));
 for(const name of selected)assert.ok(actual.has(name),'priority name missing from pack');
 const oldRows=media.filter(r=>selected.has(r.targetWord)),newRows=media.filter(r=>actual.has(r.targetWord));
 assert.deepEqual(before.media,oldRows,'migration old source selection');assert.deepEqual(after.media,newRows,'migration new source selection');
 assert.equal(new Set(media.map(r=>hash(r))).size,media.length,'duplicate source media rows');
 const expected:StarterMediaMigration['delta']=[];let afterIndex=0;
 media.forEach((row,sourceIndex)=>{if(actual.has(row.targetWord)){if(!selected.has(row.targetWord))expected.push({sourceIndex,afterIndex,row});afterIndex++;}});
 assert.ok(expected.length,'empty migration');assert.deepEqual(m.delta,expected,'migration exact ordered delta');
 assert.deepEqual(before.meta,m.beforePackMeta);assert.deepEqual(after.meta,m.afterPackMeta);
 const without=(p:Row)=>Object.fromEntries(Object.entries(p).filter(([k])=>k!=='meta'));
 const expectedAfter=structuredClone(before);expectedAfter.media=newRows;expectedAfter.meta=after.meta;assert.deepEqual(after,expectedAfter,'migration nonmedia mutation');
 const beforeMeta=before.meta as Row,afterMeta=after.meta as Row;
 const expectedMeta=structuredClone(beforeMeta);expectedMeta.counts={...(beforeMeta.counts as Row),media:newRows.length};expectedMeta.contentHash=afterMeta.contentHash;
 assert.deepEqual(afterMeta,expectedMeta,'migration metadata mutation');
 expectedAfter.meta=expectedMeta;assert.equal(texts.afterPack,JSON.stringify(expectedAfter)+'\n','migration exact serialized result');
 for(const p of [before,after]){const pm=p.meta as Row;assert.equal((pm.counts as Row).media,(p.media as Row[]).length);assert.equal(pm.contentHash,'sa:'+hash({sourceHash:meta.contentHash||meta.wordsHash,datasets:without(p)}),'migration pack content hash');}
 const proof=freezeProof({texts,before,after});
 cachedProof={key:proofKey,proof};
 return proof;
}

function inverseStarterMediaMigration(m:StarterMediaMigration,path:string,text:string,load:MigrationLoader,normalized:boolean):string{
 const proof=validateStarterMediaMigration(m,load);
 if(path!==BUILDER&&path!==PACK){const guard=(normalized?m.afterInputs:m.afterRawInputs)[path];if(guard)assert.equal(migrationByteHash(text),guard,'migration unchanged input drift');return text;}
 const before=proof.texts[path===BUILDER?'beforeBuilder':'beforePack'],after=proof.texts[path===BUILDER?'afterBuilder':'afterPack'];
 assert.equal(migrationByteHash(text),(normalized?m.afterInputs:m.afterRawInputs)[path],'migration unknown after bytes');
 assert.equal(text,normalized?norm(after):after);
 if(path===PACK){const value=JSON.parse(text) as Row;for(const d of [...m.delta].reverse()){assert.deepEqual((value.media as Row[])[d.afterIndex],d.row);(value.media as Row[]).splice(d.afterIndex,1);}value.meta=structuredClone(m.beforePackMeta);assert.deepEqual(value,proof.before,'migration semantic inverse');}
 else assert.equal(text.replace(NEXT,OLD),normalized?norm(before):before,'migration builder inverse');
 const out=normalized?norm(before):before;assert.equal(migrationByteHash(out),(normalized?m.beforeInputs:m.beforeRawInputs)[path]);return out;
}

/** Forensic projection: input and restored output must match captured raw bytes. */
export function inverseStarterMediaMigrationRaw(m:StarterMediaMigration,path:string,text:string,load:MigrationLoader):string{
 return inverseStarterMediaMigration(m,path,text,load,false);
}

/** Portable published projection: caller supplies LF-normalized input; output is LF. */
export function inverseStarterMediaMigrationNormalized(m:StarterMediaMigration,path:string,text:string,load:MigrationLoader):string{
 assert.equal(text,norm(text),'caller must normalize CRLF first');
 return inverseStarterMediaMigration(m,path,text,load,true);
}
