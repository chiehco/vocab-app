import {expect,it} from 'vitest';
import {admitU18SupplementalSource,auditHash,validateAuditScope,validateCurriculumIdentity,type AuditManifest,type AuditScope} from './lv3Audit.testSupport';
import rawManifest from '../../../docs/lv3-audit-20261107/U18-patches.json';
import rawScope from '../../../docs/lv3-audit-20261107/U18-scope.json';
import current from './curriculumLV3Unit18.json';
const manifest=rawManifest as unknown as AuditManifest,scope=rawScope as AuditScope;
function altered(change:(m:AuditManifest,s:AuditScope)=>void){const m=structuredClone(manifest),s=structuredClone(scope);change(m,s);m.scopeHash=auditHash(s);return {m,s};}
it('accepts only the independently fixed U18 source row and whole-file guard',()=>validateAuditScope(manifest,scope));
it.each(['sourcePos','chapterMeaningsZh'])('rejects dropping source field %s even with a new scope hash',field=>{
 const {m,s}=altered((m,s)=>{const p=m.patches.find(p=>p.dataset==='source')!;delete p.after[field];s.rows.find(r=>r.dataset==='source')!.after={...p.after};});expect(()=>validateAuditScope(m,s)).toThrow();
});
it.each(['sourcePage','status','word','learningItemId'])('rejects granting extra source field %s',field=>{
 const {m,s}=altered((m,s)=>{const p=m.patches.find(p=>p.dataset==='source')!;p.after[field]='unexpected';s.rows.find(r=>r.dataset==='source')!.after={...p.after};});expect(()=>validateAuditScope(m,s)).toThrow();
});
it('rejects rewriting source whole-file after hash',()=>{const {m,s}=altered(m=>{m.files!['scripts/sources/LV3Unit18.json'].afterHash='0'.repeat(64);});expect(()=>validateAuditScope(m,s)).toThrow();});
it('rejects granting source collection to another unit',()=>{const {m,s}=altered((m,s)=>{m.unit=s.unit='LV3-U19';});expect(()=>validateAuditScope(m,s)).toThrow();});
it('retains the original146 page-slug identities',()=>validateCurriculumIdentity('LV3-U18','src/features/direct/curriculumLV3Unit18.json',current));
it('rejects changed identity/order rather than renaming source IDs',()=>{const x=structuredClone(current);x.learningItems.reverse();expect(()=>validateCurriculumIdentity('LV3-U18','src/features/direct/curriculumLV3Unit18.json',x)).toThrow();});

// Pure admission negatives do not reload the seventeen historical chain steps.
import anchor from '../../../docs/lv3-audit-20261107/U01-checkpoint.json';
function admission(){
 const m=structuredClone(manifest);
 const previous={...m.unchangedInputs,...m.derivedBefore,...Object.fromEntries(Object.entries(m.files!).map(([p,g])=>[p,g.beforeByteHash!]))};
 delete previous['scripts/sources/LV3Unit18.json'];
 return {previous,anchor:structuredClone(anchor.inputs),parent:{unit:'LV3-U17',status:'committed' as 'committed'|'prepared'},hash:m.parentManifestHash!,m};
}
it('admits only source145 without mutating either original144 input map',()=>{
 const a=admission(),before=structuredClone(a),next=admitU18SupplementalSource(a.previous,a.anchor,a.parent,a.hash,a.m);
 expect(a).toEqual(before);expect(Object.keys(a.previous)).toHaveLength(144);expect(Object.keys(next)).toHaveLength(145);
 expect(Object.keys(next).filter(p=>!Object.hasOwn(a.previous,p))).toEqual(['scripts/sources/LV3Unit18.json']);
});
const badAdmissions:[string,(a:ReturnType<typeof admission>)=>void][]=[
 ['parent unit',a=>{a.parent.unit='LV3-U16';}],['parent status',a=>{a.parent.status='prepared';}],
 ['parent hash',a=>{a.hash='0'.repeat(64);}],['manifest parent hash',a=>{a.m.parentManifestHash='0'.repeat(64);}],
 ['missing input',a=>{delete a.previous[Object.keys(a.previous)[0]];}],['extra input',a=>{a.previous['unregistered.json']='0'.repeat(64);}],
 ['preexisting source owner',a=>{a.previous['scripts/sources/LV3Unit18.json']='0'.repeat(64);}],
 ['wrong owner',a=>{a.m.unit='LV3-U19';}],['source path',a=>{a.m.collections!.source.path='scripts/sources/LV3Unit19.json';}],
 ['rows field',a=>{a.m.collections!.source.rowsField='headwords';}],['row key',a=>{a.m.collections!.source.key='word';}],
 ['whole before bytes',a=>{a.m.files!['scripts/sources/LV3Unit18.json'].beforeByteHash='0'.repeat(64);}],
 ['whole after hash',a=>{a.m.files!['scripts/sources/LV3Unit18.json'].afterHash='0'.repeat(64);}],
 ['field evidence',a=>{a.m.patches.find(p=>p.dataset==='source')!.fieldEvidence={};}],
 ['evidence',a=>{a.m.patches.find(p=>p.dataset==='source')!.evidence=['https://example.com/unreviewed'];}],
 ['row identity',a=>{a.m.patches.find(p=>p.dataset==='source')!.id='LI-LV3U18-P189-other';}],
 ['duplicate patch',a=>{a.m.patches.push(structuredClone(a.m.patches.find(p=>p.dataset==='source')!));}],
 ['missing patch',a=>{a.m.patches=a.m.patches.filter(p=>p.dataset!=='source');}],
];
it.each(badAdmissions)('rejects changed admission %s',(_name,change)=>{
 const a=admission();change(a);expect(()=>admitU18SupplementalSource(a.previous,a.anchor,a.parent,a.hash,a.m)).toThrow();
});
it('rejects an absent predecessor',()=>{const a=admission();expect(()=>admitU18SupplementalSource(a.previous,a.anchor,undefined,a.hash,a.m)).toThrow();});
it.each(['remove','add'] as const)('rejects a %s-count identity matrix',kind=>{
 const x=structuredClone(current);if(kind==='remove')x.learningItems.pop();else x.learningItems.push(structuredClone(x.learningItems[0]));
 expect(()=>validateCurriculumIdentity('LV3-U18','src/features/direct/curriculumLV3Unit18.json',x)).toThrow();
});
