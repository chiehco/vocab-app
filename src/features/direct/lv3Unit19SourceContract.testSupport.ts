// Synthetic source-only contract fixture. This is not the final U19 manifest/write shape.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {auditHash,type AuditManifest,type AuditScope} from './lv3Audit.testSupport';
import frozen from '../../../scripts/fixtures/lv3-u19-source-contract-test.json';
import u18Raw from '../../../docs/lv3-audit-20261107/U18-patches.json';
export const U19_SOURCE='scripts/sources/LV3Unit19.json';
export const U18_SOURCE='scripts/sources/LV3Unit18.json';
export const sourceFixture=frozen;
export const u18Manifest=u18Raw as unknown as AuditManifest;
export function sourceScope(m:AuditManifest):AuditScope{
 const s:AuditScope={schemaVersion:1,unit:m.unit,baseline:m.baseline,collections:structuredClone(m.collections!),rows:m.patches.map(p=>({dataset:p.dataset,id:p.id,beforeHash:auditHash(p.before),after:structuredClone(p.after)}))};
 m.scopeHash=auditHash(s);return s;
}
export function sourceManifest(){
 const previous={...u18Manifest.unchangedInputs,...u18Manifest.derivedAfter,...Object.fromEntries(Object.entries(u18Manifest.files!).map(([p,g])=>[p,g.afterByteHash!]))};
 assert.equal(Object.keys(previous).length,145);
 const derived=['public/data/v1/meta.json','public/data/v1/sa-pack.json'];
 const m:AuditManifest={schemaVersion:2,unit:'LV3-U19',baseline:u18Manifest.baseline,parentManifestHash:frozen.parentManifestHash,readiness:'ready',scope:'U19-source-contract-test-scope.json',scopeHash:'',collections:{source:structuredClone(frozen.collection)},files:{[U19_SOURCE]:structuredClone(frozen.guard)},patches:[structuredClone(frozen.patch)],unchangedInputs:Object.fromEntries(Object.entries(previous).filter(([p])=>!derived.includes(p))),derivedBefore:Object.fromEntries(derived.map(p=>[p,previous[p]])),derivedAfter:Object.fromEntries(derived.map(p=>[p,previous[p]])),beforeMeta:structuredClone(u18Manifest.afterMeta??{}),afterMeta:structuredClone(u18Manifest.afterMeta??{}),beforePackMeta:{}};
 return {m,s:sourceScope(m),previous};
}
export function sourceDocuments(){
 const current=JSON.parse(readFileSync(U19_SOURCE,'utf8')) as Record<string,unknown>&{headwords:Record<string,unknown>[]};
 const before=structuredClone(current),index=before.headwords.findIndex(r=>r.word==='rumor');assert.ok(index>=0);
 before.headwords[index]=structuredClone(frozen.patch.before);
 const after=structuredClone(before);after.headwords[index]={...structuredClone(frozen.patch.before),...frozen.patch.after};
 assert.equal(auditHash(before),frozen.guard.beforeHash);assert.equal(auditHash(after),frozen.guard.afterHash);
 return {before,after};
}
