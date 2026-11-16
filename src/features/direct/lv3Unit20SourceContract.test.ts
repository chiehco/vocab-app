import {expect,it} from 'vitest';
import {admitU20SupplementalSource,auditHash,projectAuditStep,validateAuditScope,type AuditManifest} from './lv3Audit.testSupport';
import anchor from '../../../docs/lv3-audit-20261107/U01-checkpoint.json';
import {sourceManifest,sourceScope,sourceDocuments,sourceFixture,U19_SOURCE,U20_SOURCE} from './lv3Unit20SourceContract.testSupport';
function reject(change:(m:AuditManifest)=>void){const {m}=sourceManifest();change(m);const s=sourceScope(m);expect(()=>validateAuditScope(m,s)).toThrow();}
it('accepts exactly one independently reviewed violet chapterMeaningsZh field',()=>{const {m,s}=sourceManifest();expect(m.patches).toHaveLength(1);expect(m.patches[0].after).toEqual({chapterMeaningsZh:'紫羅蘭；紫羅蘭色的'});expect(m.patches[0].before.chapterMeaningsZh).toBe('紫羅蘭；紫羅藍色的');expect(m.collections!.source).toEqual({path:U20_SOURCE,key:'word',rowsField:'headwords'});validateAuditScope(m,s);});
it.each(['LV3-U18','LV3-U19','LV3-U21','LV3-U24'])('rejects assigning U20 source permission to %s',unit=>reject(m=>{m.unit=unit;}));
it.each([['path',U19_SOURCE],['key','learningItemId'],['rowsField','related'],['rowsField','usage']] as const)('rejects changed collection %s=%s',(key,value)=>reject(m=>{m.collections!.source[key]=value;}));
it.each(['sourcePos','chapterMeaningsZh','sourcePage','word','officialWordId','learningItemId','status','photos'])('rejects altered or added after field %s despite rescope',field=>reject(m=>{m.patches[0].after[field]='unreviewed';}));
it('rejects deleting the only approved source field',()=>reject(m=>{m.patches[0].after={};}));
it.each(['beforeHash','afterHash','beforeByteHash','afterByteHash'] as const)('rejects rehashing whole source guard %s',field=>reject(m=>{m.files![U20_SOURCE][field]='0'.repeat(64);}));
it('rejects an unapproved byte fixture',()=>reject(m=>{m.files![U20_SOURCE].beforeFixture='docs/unreviewed.json';}));
it('rejects missing source patch',()=>reject(m=>{m.patches=[];}));
it('rejects duplicate source patch',()=>reject(m=>{m.patches.push(structuredClone(m.patches[0]));}));
it('rejects adding a different headword patch',()=>reject(m=>{const p=structuredClone(m.patches[0]);p.id='echo';p.before.word='echo';m.patches.push(p);}));
it.each(['id','path','key','reason'] as const)('rejects altered patch %s',field=>reject(m=>{m.patches[0][field]='unreviewed';}));
it('rejects incomplete before row',()=>reject(m=>{m.patches[0].before={word:'violet'};}));
it('rejects replacement evidence URL',()=>reject(m=>{m.patches[0].evidence=['https://example.com'];}));
it('rejects missing field evidence',()=>reject(m=>{m.patches[0].fieldEvidence={};}));
it.each(['proposal','originFindingIds','beforePresent','reason'])('rejects changed field-evidence %s',field=>reject(m=>{const r=m.patches[0].fieldEvidence!.chapterMeaningsZh[0] as Record<string,unknown>;r[field]=field==='beforePresent'?false:'changed';}));
it('rejects changing the reviewed photo digest',()=>reject(m=>{const r=m.patches[0].fieldEvidence!.chapterMeaningsZh[0] as {sources:Record<string,unknown>[]};r.sources[0].sha256='0'.repeat(64);}));
function admission(){const {m,previous}=sourceManifest();return {m,previous,anchor:structuredClone(anchor.inputs),parent:{unit:'LV3-U19',status:'committed' as 'committed'|'prepared'},hash:sourceFixture.parentManifestHash};}
it('admits only source147 into a copy and preserves the original144/145/146 maps',()=>{const a=admission(),old=structuredClone(a),out=admitU20SupplementalSource(a.previous,a.anchor,a.parent,a.hash,a.m);expect(a).toEqual(old);expect(Object.keys(a.anchor)).toHaveLength(144);expect(Object.keys(a.previous)).toHaveLength(146);expect(Object.keys(out)).toHaveLength(147);expect(Object.keys(out).filter(p=>!Object.hasOwn(a.previous,p))).toEqual([U20_SOURCE]);expect(out[U19_SOURCE]).toBe(a.previous[U19_SOURCE]);});
const badAdmissions:[string,(a:ReturnType<typeof admission>)=>void][]=[['parent unit',a=>{a.parent.unit='LV3-U17';}],['parent status',a=>{a.parent.status='prepared';}],['parent hash',a=>{a.hash='0'.repeat(64);}],['manifest parent',a=>{a.m.parentManifestHash='0'.repeat(64);}],['missing input',a=>{delete a.previous[Object.keys(a.previous)[0]];}],['extra input',a=>{a.previous.extra='0'.repeat(64);}],['preexisting U20 source',a=>{a.previous[U20_SOURCE]=sourceFixture.guard.beforeByteHash;}],['U19 after source',a=>{a.previous[U19_SOURCE]='0'.repeat(64);}],['U18 after source',a=>{a.previous['scripts/sources/LV3Unit18.json']='0'.repeat(64);}],['anchor domain',a=>{delete a.anchor[Object.keys(a.anchor)[0] as keyof typeof a.anchor];}]];
it.each(badAdmissions)('rejects changed admission %s',(_label,change)=>{const a=admission();change(a);expect(()=>admitU20SupplementalSource(a.previous,a.anchor,a.parent,a.hash,a.m)).toThrow();});
it('rejects absent predecessor',()=>{const a=admission();expect(()=>admitU20SupplementalSource(a.previous,a.anchor,undefined,a.hash,a.m)).toThrow();});
it('roundtrips the entire source document and preserves all unrelated arrays',()=>{const {m,s}=sourceManifest(),{before,after}=sourceDocuments(),input=structuredClone(before);expect(projectAuditStep(m,{[U20_SOURCE]:before},false,s)).toEqual({[U20_SOURCE]:after});expect(before).toEqual(input);expect(projectAuditStep(m,{[U20_SOURCE]:after},true,s)).toEqual({[U20_SOURCE]:before});expect(after.headwords).toHaveLength(43);for(const key of ['related','usage','photos','notes','headwordOrder'])expect(after[key]).toEqual(before[key]);expect(auditHash(after)).toBe(sourceFixture.guard.afterHash);});

it('rejects numeric one in place of boolean field evidence',()=>reject(m=>{const r=m.patches[0].fieldEvidence!.chapterMeaningsZh[0] as Record<string,unknown>;r.beforePresent=1;}));
