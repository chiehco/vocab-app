import 'fake-indexeddb/auto';
import {readFileSync} from 'node:fs';
import {expect,it} from 'vitest';
import {auditHash,lv3AfterUnitFile,lv3AfterUnitPublishedText} from './lv3Audit.testSupport';
import expected from '../../../scripts/fixtures/lv3-u19-accepted-audit-test.json';
import manifest from '../../../docs/lv3-audit-20261107/U19-patches.json';
// Expected constants are calculated from frozen accepted a487c745...ecb38d, not compiler output.
// This draft requires the separately reviewed final U19 manifest before discovery/execution.
const entries=Object.entries(expected.expectedDocumentHashes);
it.each(entries)('matches independently accepted entire U19 document %s',(path,hashes)=>{
 const current=JSON.parse(readFileSync(new URL('../../../'+path,import.meta.url),'utf8'));
 expect(auditHash(lv3AfterUnitFile('LV3-U19',path,current))).toBe(hashes.afterSemanticHash);
});
it('retains only the accepted127 rows302 fields and exact five source files',()=>{
 expect(manifest.unit).toBe('LV3-U19');expect(manifest.patches).toHaveLength(127);
 const identities=manifest.patches.flatMap(p=>Object.keys(p.after).map(field=>[p.dataset,p.id,field])).sort();
 expect(identities).toEqual(expected.fieldIdentities);expect(identities).toHaveLength(302);
 expect(Object.keys(manifest.files).sort()).toEqual(expected.sourceFiles);
 expect(Object.keys(manifest.derivedAfter).sort()).toEqual(expected.derivedFiles);
 expect(expected.physicalWriteCount).toBe(7);
});
it('keeps source rumor narrowly bound and does not adopt held G012',()=>{
 const source=manifest.patches.filter(p=>p.dataset==='source');expect(source).toHaveLength(1);
 expect(source[0]).toMatchObject({path:'scripts/sources/LV3Unit19.json',key:'word',id:'rumor',after:{sourcePos:'n./vt.'}});
 expect(Object.keys(source[0].after)).toEqual(['sourcePos']);
 expect(manifest.patches.some(p=>p.dataset==='curriculum'&&p.id==='LI-LV3U19-G012')).toBe(false);
});
it('restores full U19 source before at U18 and rejects unknown raw source bytes',()=>{
 const path='scripts/sources/LV3Unit19.json';
 const text=readFileSync(new URL('../../../'+path,import.meta.url),'utf8').replaceAll(String.fromCharCode(13,10),String.fromCharCode(10));
 const before=lv3AfterUnitPublishedText('LV3-U18',path,text);
 expect(auditHash(JSON.parse(before))).toBe('ae16f51ead78443ba3366750484866a459d7765acd54c47d9fdb8fcd8f5c0d87');
 expect(()=>lv3AfterUnitPublishedText('LV3-U18',path,text+' ')).toThrow();
});
