import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {lv3AfterUnitPublishedText} from './lv3Audit.testSupport';
const PATH='src/features/direct/curriculumLV3Unit20.json';
// Independent current-before capture, never inferred from projected output.
const ORIGINAL_LF_SHA256='c6197f6ab0a797cdb4647b245b19444f402d12cb8fc2ff3c979ade0b466f152d';
/** Ordinary U20 history, not a recovered-unit reconstruction. Fresh authentication every call. */
export function originalUnit20Items<T>(items:T):T{
 const text=readFileSync(new URL('./curriculumLV3Unit20.json',import.meta.url),'utf8').replaceAll(String.fromCharCode(13,10),String.fromCharCode(10));
 const current=JSON.parse(text) as {learningItems:T};
 assert.deepEqual(items,current.learningItems,'Installed U20 items differ from current source');
 const before=lv3AfterUnitPublishedText('LV3-U19',PATH,text);
 assert.equal(createHash('sha256').update(before).digest('hex'),ORIGINAL_LF_SHA256,'Original U20 LF publication drift');
 return (JSON.parse(before) as {learningItems:T}).learningItems;
}
