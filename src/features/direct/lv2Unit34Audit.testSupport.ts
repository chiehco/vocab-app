import {expect} from 'vitest';
import current from './curriculumLV2Unit34.json';
import corrections from '../../../docs/unit-audit-20261105/LV2-U34-curriculum-patches.json';
export function lv2Unit34BeforeAudit(value:typeof current){
 const copy=structuredClone(value);expect(copy.learningItems).toHaveLength(158);
 expect(new Set(copy.learningItems.map(i=>i.learningItemId)).size).toBe(158);
 for(const p of corrections.patches){const row=copy.learningItems.find(i=>i.learningItemId===p.id) as Record<string,unknown>|undefined;expect(row).toBeDefined();expect(row!.sourcePage).toBe(p.sourcePage);for(const[k,v]of Object.entries(p.after)){expect(row![k]).toEqual(v);expect(Object.hasOwn(p.before,k)).toBe(true);}Object.assign(row!,p.before);}
 return copy;
}
