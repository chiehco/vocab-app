// Source-only mock chain coverage. No final U19 counts or transaction result inferred.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {expect,it,vi} from 'vitest';
import {auditHash,type AuditManifest} from './lv3Audit.testSupport';
import {sourceManifest,sourceScope,sourceDocuments,sourceFixture,u18Manifest,U18_SOURCE,U19_SOURCE} from './lv3Unit19SourceContract.testSupport';
type Row=Record<string,unknown>;
type Source=Row&{headwords:Row[];related:Row[];photos:Row[]};
type State='absent'|'prepared'|'committed'|'later_u20';
type Entry={unit?:string;path:string;manifestHash:string;status:'prepared'|'committed'};
type Chain={entries:Entry[]};
type Helper=typeof import('./lv3Audit.testSupport');
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
const json=(x:unknown)=>JSON.stringify(x,null,2)+'\n';
const originals=Object.fromEntries(['docs/lv3-audit-20261107/chain.json','docs/lv3-audit-20261107/U01-checkpoint.json',U18_SOURCE,U19_SOURCE].map(p=>[p,readFileSync(p,'utf8')]));
const originalChain=JSON.parse(originals['docs/lv3-audit-20261107/chain.json']) as Chain;
const u18After=JSON.parse(originals[U18_SOURCE]) as Source;
const u18Patch=u18Manifest.patches.find(p=>p.dataset==='source')!;
const u18Index=u18After.related.findIndex(r=>r.learningItemId===u18Patch.id);assert.ok(u18Index>=0);
u18After.related[u18Index]={...structuredClone(u18Patch.before),...structuredClone(u18Patch.after)};
const u18Before=structuredClone(u18After);u18Before.related[u18Index]=structuredClone(u18Patch.before);
const u19=sourceDocuments();
for(const [source,guard,side] of [[u18Before,u18Manifest.files![U18_SOURCE],'before'],[u18After,u18Manifest.files![U18_SOURCE],'after'],[u19.before,sourceFixture.guard,'before'],[u19.after,sourceFixture.guard,'after']] as const)expect(digest(json(source))).toBe(guard[side==='before'?'beforeByteHash':'afterByteHash']);
function syntheticU20(parent:AuditManifest){
 const path='src/features/direct/curriculumLV3Unit20.json';
 const text=readFileSync(path,'utf8').replace(/\r\n/g,'\n'),before=JSON.parse(text) as {learningItems:Row[]};
 const index=before.learningItems.findIndex(r=>r.kind==='grammar');assert.ok(index>=0);
 const row=before.learningItems[index],next='Synthetic source-protection fixture only.';
 const after=structuredClone(before);after.learningItems[index]={...row,explanationZh:next};
 const previous={...parent.unchangedInputs,...parent.derivedAfter,...Object.fromEntries(Object.entries(parent.files!).map(([p,g])=>[p,g.afterByteHash!]))};
 const derived=['public/data/v1/meta.json','public/data/v1/sa-pack.json'];
 const m:AuditManifest={schemaVersion:2,unit:'LV3-U20',baseline:parent.baseline,parentManifestHash:auditHash(parent),readiness:'ready',scope:'U20-source-protection-test-scope.json',scopeHash:'',collections:{curriculum:{path,key:'learningItemId',rowsField:'learningItems'}},files:{[path]:{beforeHash:auditHash(before),afterHash:auditHash(after),beforeByteHash:digest(text),afterByteHash:digest(json(after))}},patches:[{dataset:'curriculum',path,key:'learningItemId',id:String(row.learningItemId),before:structuredClone(row),after:{explanationZh:next},reason:'Synthetic fixture only',evidence:[],fieldEvidence:{explanationZh:[{proposal:'synthetic-u20-source-protection',reason:'Synthetic fixture only',sources:[{type:'test_fixture'}],beforePresent:true}]}}],unchangedInputs:Object.fromEntries(Object.entries(previous).filter(([p])=>p!==path&&!derived.includes(p))),derivedBefore:structuredClone(parent.derivedAfter!),derivedAfter:structuredClone(parent.derivedAfter!),beforeMeta:structuredClone(parent.afterMeta??{}),afterMeta:structuredClone(parent.afterMeta??{}),beforePackMeta:{}};
 return {m,s:sourceScope(m),path,text:json(after)};
}
async function withState(state:State,check:(h:Helper,current:Record<string,Source>,change:(path:string,kind:string)=>void)=>void){
 const chain=structuredClone(originalChain),index=chain.entries.findIndex(e=>e.unit==='LV3-U18');assert.ok(index>=0);chain.entries=chain.entries.slice(0,index+1);
 const {m,s}=sourceManifest();const overrides:Record<string,string>={};
 const committed=state==='committed'||state==='later_u20';
 const current:Record<string,Source>={[U18_SOURCE]:structuredClone(u18After),[U19_SOURCE]:structuredClone(committed?u19.after:u19.before) as Source};
 if(state!=='absent'){
  chain.entries.push({unit:'LV3-U19',path:'U19-source-contract-test-patches.json',manifestHash:auditHash(m),status:committed?'committed':'prepared'});
  overrides['docs/lv3-audit-20261107/U19-source-contract-test-patches.json']=json(m);overrides['docs/lv3-audit-20261107/'+m.scope!]=json(s);
 }
 if(state==='later_u20'){
  const later=syntheticU20(m);chain.entries.push({unit:'LV3-U20',path:'U20-source-protection-test-patches.json',manifestHash:auditHash(later.m),status:'committed'});
  overrides['docs/lv3-audit-20261107/U20-source-protection-test-patches.json']=json(later.m);overrides['docs/lv3-audit-20261107/'+later.m.scope!]=json(later.s);overrides[later.path]=later.text;
 }
 overrides['docs/lv3-audit-20261107/chain.json']=json(chain);for(const [p,v]of Object.entries(current))overrides[p]=json(v);
 const change=(p:string,kind:string)=>{const value=structuredClone(current[p]);if(kind==='raw'){overrides[p]=json(value)+' ';return;}if(kind==='root')value.unrecorded=true;else if(kind==='photos')value.photos[0].unrecorded=true;else if(kind==='other_row'){const rows=p===U18_SOURCE?value.related:value.headwords;const row=rows.find(r=>p===U18_SOURCE?r.learningItemId!==u18Patch.id:r.word!=='rumor');assert.ok(row);row.unrecorded=true;}else if(kind==='related')value.related[0].unrecorded=true;else if(kind==='usage')(value.usage as Row[])[0].unrecorded=true;else if(kind==='notes')(value.notes as unknown[]).push('unrecorded');else throw new Error('unknown mutation');overrides[p]=json(value);};
 vi.resetModules();vi.doMock('node:fs',async()=>{const actual=await vi.importActual<typeof import('node:fs')>('node:fs');return {...actual,readFileSync:(...args:Parameters<typeof readFileSync>)=>{const name=String(args[0]).replace(/\\/g,'/'),key=Object.keys(overrides).find(p=>name.endsWith('/'+p)||name===p);if(!key)return actual.readFileSync(...args);const option=args[1] as unknown;const encoded=typeof option==='string'||(option!==null&&typeof option==='object'&&'encoding' in option&&Boolean(option.encoding));return encoded?overrides[key]:Buffer.from(overrides[key]);}};});
 try{check(await import('./lv3Audit.testSupport'),current,change);}finally{vi.doUnmock('node:fs');vi.resetModules();}
 for(const [p,v]of Object.entries(originals))expect(readFileSync(p,'utf8')).toBe(v);
}
const states=['prepared','committed','later_u20'] as const;
const targets=['LV3-U01','LV3-U17','LV3-U18','LV3-U19','LV3-U20'] as const;
const apis=['semantic','raw'] as const;
const paths=[U18_SOURCE,U19_SOURCE];
const positives=states.flatMap(state=>targets.filter(target=>target!=='LV3-U20'||state==='later_u20').filter(target=>target!=='LV3-U19'||state!=='prepared').flatMap(target=>paths.flatMap(path=>apis.map(api=>({state,target,path,api})))));
it.each(positives)('guards correct paired sources: $state $target $path $api',async({state,target,path,api})=>{await withState(state,(h,current)=>{const expected=path===U18_SOURCE?(target==='LV3-U01'||target==='LV3-U17'?u18Before:u18After):(target==='LV3-U19'||target==='LV3-U20'?u19.after:u19.before);if(api==='semantic')expect(h.lv3AfterUnitFile(target,path,current[path])).toEqual(expected);else expect(h.lv3AfterUnitPublishedText(target,path,json(current[path]))).toBe(json(expected));});});
it.each(apis)('rejects prepared U19 as a target through %s',async api=>{await withState('prepared',(h,current)=>{expect(()=>api==='semantic'?h.lv3AfterUnitFile('LV3-U19',U19_SOURCE,current[U19_SOURCE]):h.lv3AfterUnitPublishedText('LV3-U19',U19_SOURCE,json(current[U19_SOURCE]))).toThrow(/uncommitted/);});});
it.each(apis)('rejects U19 source without owner through %s',async api=>{await withState('absent',(h,current)=>{expect(()=>api==='semantic'?h.lv3AfterUnitFile('LV3-U18',U19_SOURCE,current[U19_SOURCE]):h.lv3AfterUnitPublishedText('LV3-U18',U19_SOURCE,json(current[U19_SOURCE]))).toThrow(api==='semantic'?/unknown checkpoint path/:/unknown U19 supplementary checkpoint path/);});});
const driftCases=states.flatMap(state=>paths.flatMap(path=>['raw','root','photos','other_row','related','usage','notes'].flatMap(kind=>apis.map(api=>({state,path,kind,api})))));
it.each(driftCases)('rejects current source drift: $state $path $kind $api',async({state,path,kind,api})=>{await withState(state,(h,current,change)=>{change(path,kind);const expected=path===U18_SOURCE?/U18 source current checkpoint drift/:/U19 source current checkpoint drift/;expect(()=>api==='semantic'?h.lv3AfterUnitFile('LV3-U18',U19_SOURCE,current[U19_SOURCE]):h.lv3AfterUnitPublishedText('LV3-U18',U19_SOURCE,json(current[U19_SOURCE]))).toThrow(expected);});});
it.each(states.flatMap(state=>paths.flatMap(path=>apis.map(api=>({state,path,api})))))('rejects altered caller: $state $path $api',async({state,path,api})=>{await withState(state,(h,current)=>{expect(()=>api==='semantic'?h.lv3AfterUnitFile('LV3-U18',path,{...current[path],unrecorded:true}):h.lv3AfterUnitPublishedText('LV3-U18',path,json(current[path])+' ')).toThrow(/drift/);});});
it.each(paths.flatMap(path=>apis.map(api=>({path,api}))))('does not reuse current-source proof across calls: $path $api',async({path,api})=>{await withState('committed',(h,current,change)=>{if(api==='semantic')h.lv3AfterUnitFile('LV3-U18',U19_SOURCE,current[U19_SOURCE]);else h.lv3AfterUnitPublishedText('LV3-U18',U19_SOURCE,json(current[U19_SOURCE]));change(path,'raw');expect(()=>api==='semantic'?h.lv3AfterUnitFile('LV3-U18',U19_SOURCE,current[U19_SOURCE]):h.lv3AfterUnitPublishedText('LV3-U18',U19_SOURCE,json(current[U19_SOURCE]))).toThrow(/source current checkpoint drift/);});});
