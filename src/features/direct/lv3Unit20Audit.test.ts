// Expected values frozen from accepted-u20-v3.json, never from the runtime manifest.
// Accepted artifact SHA256: 7197ad93c3843e83a0b7bfc001a27001c1b2ac3389ce2cc75c5ef313ba3d91b6
// Activate only after the authorized U20 application and chain promotion.
import {readFileSync} from 'node:fs';
import {expect,it} from 'vitest';
import rawManifest from '../../../docs/lv3-audit-20261107/U20-patches.json';
import {lv3AfterUnitFile,type AuditManifest} from './lv3Audit.testSupport';
const manifest=rawManifest as unknown as AuditManifest;
const expected=[
  {
    "dataset": "examples",
    "path": "public/data/v1/examples.json",
    "key": "exampleId",
    "id": "EX38218c8f",
    "field": "sensePos",
    "beforePresent": true,
    "beforeValue": "n.",
    "afterValue": "v."
  },
  {
    "dataset": "curriculum",
    "path": "src/features/direct/curriculumLV3Unit20.json",
    "key": "learningItemId",
    "id": "LI-LV3U20-V023",
    "field": "sensePos",
    "beforePresent": true,
    "beforeValue": "vt./n.",
    "afterValue": "vt./vi./n."
  },
  {
    "dataset": "words",
    "path": "public/data/v1/words.json",
    "key": "wordId",
    "id": "W002146",
    "field": "meaningZh",
    "beforePresent": true,
    "beforeValue": "寒冷的；冷淡的；不友好的；番椒",
    "afterValue": "寒冷的；冷淡的；不友好的"
  },
  {
    "dataset": "words",
    "path": "public/data/v1/words.json",
    "key": "wordId",
    "id": "W002483",
    "field": "meaningZh",
    "beforePresent": true,
    "beforeValue": "洗衣店；洗好的衣服；洗滌；洗衣作",
    "afterValue": "洗衣店；洗好的衣服；洗滌；洗衣工作"
  },
  {
    "dataset": "curriculum",
    "path": "src/features/direct/curriculumLV3Unit20.json",
    "key": "learningItemId",
    "id": "LI-LV3U20-G023",
    "field": "pattern",
    "beforePresent": true,
    "beforeValue": "get rid of sb / sth（get 是連綴動詞，相當於 be；rid 是過去分詞，表「被擺脫」）",
    "afterValue": "get rid of sb / sth（get 是連綴動詞，相當於 be；rid 是過去分詞，表「擺脫了……的」）"
  },
  {
    "dataset": "curriculum",
    "path": "src/features/direct/curriculumLV3Unit20.json",
    "key": "learningItemId",
    "id": "LI-LV3U20-V042",
    "field": "targetMeaningZh",
    "beforePresent": true,
    "beforeValue": "紫羅蘭；紫羅藍色的",
    "afterValue": "紫羅蘭；紫羅蘭色的"
  },
  {
    "dataset": "curriculum",
    "path": "src/features/direct/curriculumLV3Unit20.json",
    "key": "learningItemId",
    "id": "LI-LV3U20-V042",
    "field": "chapterMeaningsZh",
    "beforePresent": true,
    "beforeValue": "紫羅蘭；紫羅藍色的",
    "afterValue": "紫羅蘭；紫羅蘭色的"
  },
  {
    "dataset": "curriculum",
    "path": "src/features/direct/curriculumLV3Unit20.json",
    "key": "learningItemId",
    "id": "LI-LV3U20-V031",
    "field": "targetMeaningZh",
    "beforePresent": true,
    "beforeValue": "某個時候（與明確的時間並用）",
    "afterValue": "某個時候"
  },
  {
    "dataset": "curriculum",
    "path": "src/features/direct/curriculumLV3Unit20.json",
    "key": "learningItemId",
    "id": "LI-LV3U20-V031",
    "field": "chapterMeaningsZh",
    "beforePresent": true,
    "beforeValue": "某個時候（與明確的時間並用）",
    "afterValue": "某個時候"
  },
  {
    "dataset": "curriculum",
    "path": "src/features/direct/curriculumLV3Unit20.json",
    "key": "learningItemId",
    "id": "LI-LV3U20-G051",
    "field": "pattern",
    "beforePresent": true,
    "beforeValue": "sometime 與明確的時間並用",
    "afterValue": "sometime 不限於與明確的時間並用"
  },
  {
    "dataset": "curriculum",
    "path": "src/features/direct/curriculumLV3Unit20.json",
    "key": "learningItemId",
    "id": "LI-LV3U20-G055",
    "field": "pattern",
    "beforePresent": true,
    "beforeValue": "forest（可數）；woods（恆用複數，不可數）",
    "afterValue": "forest（可數）；woods（複數名詞，指樹林）"
  },
  {
    "dataset": "words",
    "path": "public/data/v1/words.json",
    "key": "wordId",
    "id": "W002625",
    "field": "meaningZh",
    "beforePresent": true,
    "beforeValue": "鋪設；安排；鋪滿；爲...鋪路；路面",
    "afterValue": "鋪設；安排；鋪滿；爲...鋪路"
  },
  {
    "dataset": "words",
    "path": "public/data/v1/words.json",
    "key": "wordId",
    "id": "W002625",
    "field": "meaningEn",
    "beforePresent": true,
    "beforeValue": "a setting with precious stones so closely set that no metal shows; cover with a material such as stone or concrete to make suitable for vehicle traffic; the paved surface of a thoroughfare",
    "afterValue": "cover with a material such as stone or concrete to make suitable for vehicle traffic"
  },
  {
    "dataset": "words",
    "path": "public/data/v1/words.json",
    "key": "wordId",
    "id": "W002625",
    "field": "usagePattern",
    "beforePresent": true,
    "beforeValue": "pave + N; pave to V; a/the pave",
    "afterValue": "pave + N; pave to V"
  },
  {
    "dataset": "words",
    "path": "public/data/v1/words.json",
    "key": "wordId",
    "id": "W002625",
    "field": "usagePatternZh",
    "beforePresent": true,
    "beforeValue": "鋪設……；鋪路以……；路面",
    "afterValue": "鋪設……；鋪路以……"
  },
  {
    "dataset": "words",
    "path": "public/data/v1/words.json",
    "key": "wordId",
    "id": "W006051",
    "field": "meaningZh",
    "beforePresent": true,
    "beforeValue": "鋪設；安排；鋪滿；爲...鋪路；路面",
    "afterValue": "路面"
  },
  {
    "dataset": "words",
    "path": "public/data/v1/words.json",
    "key": "wordId",
    "id": "W006051",
    "field": "meaningEn",
    "beforePresent": true,
    "beforeValue": "a setting with precious stones so closely set that no metal shows; cover with a material such as stone or concrete to make suitable for vehicle traffic; the paved surface of a thoroughfare",
    "afterValue": "the paved surface of a thoroughfare"
  },
  {
    "dataset": "words",
    "path": "public/data/v1/words.json",
    "key": "wordId",
    "id": "W006051",
    "field": "usagePattern",
    "beforePresent": true,
    "beforeValue": "pave + N; pave to V; a/the pave",
    "afterValue": "a/the pavement"
  },
  {
    "dataset": "words",
    "path": "public/data/v1/words.json",
    "key": "wordId",
    "id": "W006051",
    "field": "usagePatternZh",
    "beforePresent": true,
    "beforeValue": "鋪設……；pave 後接 to 不定詞；該路面",
    "afterValue": "該路面"
  },
  {
    "dataset": "source",
    "path": "scripts/sources/LV3Unit20.json",
    "key": "word",
    "id": "violet",
    "field": "chapterMeaningsZh",
    "beforePresent": true,
    "beforeValue": "紫羅蘭；紫羅藍色的",
    "afterValue": "紫羅蘭；紫羅蘭色的"
  },
  {
    "dataset": "curriculum",
    "path": "src/features/direct/curriculumLV3Unit20.json",
    "key": "learningItemId",
    "id": "LI-LV3U20-V023",
    "field": "meaningSource",
    "beforePresent": true,
    "beforeValue": "textbook_transcription",
    "afterValue": "textbook_and_dictionary_review"
  },
  {
    "dataset": "curriculum",
    "path": "src/features/direct/curriculumLV3Unit20.json",
    "key": "learningItemId",
    "id": "LI-LV3U20-V031",
    "field": "meaningSource",
    "beforePresent": true,
    "beforeValue": "textbook_transcription",
    "afterValue": "textbook_and_dictionary_review"
  }
];
const identity=(x:{dataset:string;id:string;field:string})=>[x.dataset,x.id,x.field].join('/');
it('contains exactly the independently accepted U20 A-only 22 fields in 12 rows',()=>{
 const actual=manifest.patches.flatMap(p=>Object.entries(p.after).map(([field,value])=>({dataset:p.dataset,id:p.id,field,value})));
 expect(actual.map(identity).sort()).toEqual(expected.map(identity).sort());
 expect(actual).toHaveLength(22);expect(manifest.patches).toHaveLength(12);
 expect(Object.keys(manifest.files!).sort()).toEqual(['public/data/v1/examples.json','public/data/v1/words.json','scripts/sources/LV3Unit20.json','src/features/direct/curriculumLV3Unit20.json']);
 expect(Object.keys(manifest.derivedAfter!).sort()).toEqual(['public/data/v1/meta.json','public/data/v1/sa-pack.json']);
 for(const item of expected){
  const patches=manifest.patches.filter(p=>p.dataset===item.dataset&&p.id===item.id);expect(patches).toHaveLength(1);
  const p=patches[0];expect(p.path).toBe(item.path);expect(p.key).toBe(item.key);
  expect(Object.hasOwn(p.before,item.field)).toBe(item.beforePresent);
  expect(item.beforePresent?p.before[item.field]:null).toEqual(item.beforeValue);
  expect(p.after[item.field]).toEqual(item.afterValue);
 }
});
type Row=Record<string,unknown>;
it.each(expected)('publishes the accepted U20 $dataset $id $field',item=>{
 const col=manifest.collections![item.dataset];
 const document=lv3AfterUnitFile('LV3-U20',item.path,JSON.parse(readFileSync(item.path,'utf8'))) as Row|Row[];
 const rows=(col.rowsField?(document as Row)[col.rowsField]:document) as Row[];
 const matches=rows.filter(row=>row[item.key]===item.id);expect(matches).toHaveLength(1);
 expect(matches[0][item.field]).toEqual(item.afterValue);
});
