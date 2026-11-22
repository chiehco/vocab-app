import {readFileSync} from 'node:fs';
import {expect,it} from 'vitest';
import {beforeUnitAudit} from './unitAudit.testSupport';
import proof from '../../docs/lv4-releases-20261122/U08.json';
type Meta={counts:Record<string,number>;[key:string]:unknown};
const current=()=>JSON.parse(readFileSync('public/data/v1/meta.json','utf8')) as Meta;
it('restores authenticated pre-LV4 counts for old-release metadata comparisons without changing current metadata',()=>{
 const input=current(),saved=structuredClone(input),old=beforeUnitAudit('meta.json',input);
 expect(old.counts).toEqual(proof.files['public/data/v1/meta.json'].beforeMeta.counts);
 expect(input).toEqual(saved);
});
it.each(['notes','words','media'])('rejects an unrecorded %s count instead of normalizing it into an old baseline',key=>{
 const changed=current();changed.counts[key]+=1;
 expect(()=>beforeUnitAudit('meta.json',changed)).toThrow(/complete file drift/);
});
