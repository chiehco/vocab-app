import {lv2Unit49BeforeFormalAudit} from './lv2Unit49Audit.testSupport';
import {expect} from 'vitest';
import current from './curriculumLV2Unit48.json';
import corrections from '../../../docs/unit-audit-20261105/LV2-U48-curriculum-patches.json';
import main from '../../../docs/unit-audit-20261105/LV2-U48-patches.json';
import notes from '../../../docs/unit-audit-20261105/LV2-U48-notes-patches.json';
import forms from '../../../docs/unit-audit-20261105/LV2-U48-verified-forms-patches.json';
import {restoreRecordedAuditPatch} from '../../db/unitAudit.testSupport';
export function lv2Unit48BeforeAudit(value:typeof current){
 const copy=structuredClone(value);expect(copy.learningItems).toHaveLength(152);
 expect(new Set(copy.learningItems.map(i=>i.learningItemId)).size).toBe(152);
 for(const p of corrections.patches){const row=copy.learningItems.find(i=>i.learningItemId===p.id) as Record<string,unknown>|undefined;expect(row).toBeDefined();expect(row!.sourcePage).toBe(p.sourcePage);for(const[k,v]of Object.entries(p.after)){expect(row![k]).toEqual(v);expect(Object.hasOwn(p.before,k)).toBe(true);}Object.assign(row!,p.before);}
 return copy;
}
// Project only the exact U48 edits away for preceding checkpoint assertions.
// The original U47 hashes remain unchanged and still cover every other field.
export function lv2Unit48BeforeFormalAudit<T>(dataset:string,value:T,projection:'current'|'u48_checkpoint'='current'):T{
 const copy=structuredClone(projection==='current'?lv2Unit49BeforeFormalAudit(dataset,value):value);
 if(!Array.isArray(copy))return copy;
 for(const p of [...main.patches,...notes.patches,...forms.patches].reverse().filter(p=>p.dataset===dataset)){
  const matches=(copy as Record<string,unknown>[]).filter(row=>row[p.key]===p.id);
  expect(matches).toHaveLength(1);restoreRecordedAuditPatch(dataset,matches[0],p);
 }
 return copy;
}
