import assert from 'node:assert/strict';
import manifest from '../../../docs/lv3-audit-20261107/U01-patches.json';

type Row = Record<string, unknown>;
export type LV3AuditPatch = {dataset:string;path:string;key:string;id:string;before:Row;after:Row;reason:string;evidence:unknown[]};
export const lv3Unit1Patches = manifest.patches as LV3AuditPatch[];
const contracts:Record<string,{path:string;key:string}> = {
 words:{path:'public/data/v1/words.json',key:'wordId'},
 senses:{path:'public/data/v1/senses.json',key:'senseId'},
 examples:{path:'public/data/v1/examples.json',key:'exampleId'},
 notes:{path:'public/data/v1/notes.json',key:'noteId'},
 curriculum:{path:'src/features/direct/curriculum.json',key:'learningItemId'},
 grammarQuestions:{path:'src/features/direct/grammarQuestions.json',key:'questionId'},
};

// Independent of earlier audit helpers: validate the entire new row before
// restoring its exact old row. This never blesses arbitrary current values.
export function lv3Unit1BeforeAudit<T>(dataset:string,value:T,options:{allowMissing?:boolean}={}):T {
 const name=dataset.replace(/\.json$/,'');
 const copy=structuredClone(value);
 const patches=lv3Unit1Patches.filter(p=>p.dataset===name);
 if(!patches.length)return copy;
 const rows=(name==='curriculum'?(copy as Row).learningItems:copy) as Row[];
 assert.ok(Array.isArray(rows),'audit dataset must contain an array');
 const indexes=new Map<string,Map<unknown,number[]>>();
 for(const p of [...patches].reverse()){
  assert.deepEqual({path:p.path,key:p.key},contracts[name],'exact dataset path and identity key required');
  assert.ok(p.reason.trim()&&p.evidence.length,'recorded reason and evidence required');
  assert.equal(p.before[p.key],p.id,'original row identity must match');
  assert.ok(!Object.hasOwn(p.after,p.key),'audit cannot change identities');
  if(name==='words')for(const k of ['word','wordVariants','pos','posAll','status'])assert.ok(!Object.hasOwn(p.after,k),'headword, POS and whole-word status remain unchanged');
  let index=indexes.get(p.key);
  if(!index){index=new Map();rows.forEach((row,i)=>{const id=row[p.key];index!.set(id,[...(index!.get(id)??[]),i]);});indexes.set(p.key,index);}
  const matches=index.get(p.id)??[];
  assert.ok(matches.length<=1,'audit cannot conceal duplicate identities');
  if(!matches.length&&options.allowMissing)continue;
  assert.equal(matches.length,1,'complete audit dataset must contain recorded identity');
  const i=matches[0];
  assert.deepEqual(rows[i],{...p.before,...p.after},name+':'+p.id+': exact audited row required');
  rows[i]=structuredClone(p.before);
 }
 return copy;
}

// Exact publication metadata captured by the committed U01 transaction. The
// existing caption proof retains its independent pre-U01 raw-file hashes.
const publicationMetaBefore={"schemaVersion":2,"generatedAt":"2026-11-07T05:15:37Z","sourceFile":"萬詞譜母表_SA義項清理整合_20260904.xlsx","counts":{"words":6090,"senses":772,"examples":7871,"relations":40,"morphemes":3798,"media":1177,"notes":4290,"examPriority":3792,"hooks":0},"wordsHash":"a83514c5fab5c2cbd24ca97d0346c7ba9cb82f372dc0227caeb6163d30922619","contentHash":"2f2ec85789ebeb410404eda608c14fe4d8475f6c57083299db4c1f393a3015cd","houseSourceSha256":"98fa208835caf7184acc95f26dcff56ace23ba281ff8d4b9b8c37e18e407be14"};
const publicationMetaAfter={"schemaVersion":2,"generatedAt":"2026-11-07T13:10:12Z","sourceFile":"萬詞譜母表_SA義項清理整合_20260904.xlsx","counts":{"words":6090,"senses":772,"examples":7871,"relations":40,"morphemes":3798,"media":1177,"notes":4290,"examPriority":3792,"hooks":0},"wordsHash":"80b7f273463070e97da37823f79d87fb2ca0dacc7b81587d915f77623d44b992","contentHash":"b0f48221b359e57c2d3de471f297a49e0e26c521a16113dd388aab4a1e2394d6","houseSourceSha256":"98fa208835caf7184acc95f26dcff56ace23ba281ff8d4b9b8c37e18e407be14"};
const publicationPackMetaBefore={"schemaVersion":2,"generatedAt":"2026-11-07T05:15:37Z","counts":{"words":5779,"senses":771,"examples":7436,"relations":31,"morphemes":3696,"notes":4111,"media":746,"examPriority":3613},"wordsHash":"sa:e6b1cfd29c07d1ee7eb2f9fcdb23628c62070ccd3b097d45c01edddf4ece9bb9","contentHash":"sa:920cd1e6de46ae542fcfbd15a6aedaadef001d96a3c92d1c453b7566b00bc143"};
const publicationPackMetaAfter={"schemaVersion":2,"generatedAt":"2026-11-07T13:10:12Z","counts":{"words":5779,"senses":771,"examples":7436,"relations":31,"morphemes":3696,"notes":4111,"media":746,"examPriority":3613},"wordsHash":"sa:98e1bc2d924ecee64954b2f414670899370baa9adf5c755407cdb7baeb3daff0","contentHash":"sa:a70dd26368cd050fb71945a3efeaa98ce0fa2efa34c134a27ec23f6c7a4dcb17"};
export function lv3Unit1BeforePublishedText(path:string,text:string):string {
 const datasets=['words','examples','notes','meta','sa-pack'];
 const name=datasets.find(n=>path==='public/data/v1/'+n+'.json');
 if(!name)return text;
 const value=JSON.parse(text);
 const serialize=(v:unknown)=>JSON.stringify(v,null,name==='sa-pack'?undefined:2)+'\n';
 assert.equal(text,serialize(value),'published JSON formatting must remain exact');
 if(name==='meta'){
  assert.deepEqual(value,publicationMetaAfter,'exact U01 full metadata required');
  return serialize(publicationMetaBefore);
 }
 if(name==='sa-pack'){
  assert.deepEqual(value.meta,publicationPackMetaAfter,'exact U01 starter metadata required');
  for(const dataset of ['words','examples','notes'])value[dataset]=lv3Unit1BeforeAudit(dataset,value[dataset],{allowMissing:true});
  value.meta=structuredClone(publicationPackMetaBefore);
  return serialize(value);
 }
 return serialize(lv3Unit1BeforeAudit(name,value));
}
