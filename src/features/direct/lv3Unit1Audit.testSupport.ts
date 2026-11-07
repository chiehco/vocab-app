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
