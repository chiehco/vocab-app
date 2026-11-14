import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {lv3AfterUnitPublishedText} from './lv3Audit.testSupport';
const PATH='src/features/direct/curriculumLV3Unit19.json';
// Independent current-before capture, never inferred from projected output.
const ORIGINAL_LF_SHA256='4facbd0a9f9a1f9d74a47323b6b4bb3ed6a33a5a79dbba356a30a1caa60586ec';
/** Ordinary U19 history, not a recovered-unit reconstruction. Fresh authentication every call. */
export function originalUnit19Items<T>(items:T):T{
 const text=readFileSync(new URL('./curriculumLV3Unit19.json',import.meta.url),'utf8').replaceAll(String.fromCharCode(13,10),String.fromCharCode(10));
 const current=JSON.parse(text) as {learningItems:T};
 assert.deepEqual(items,current.learningItems,'Installed U19 items differ from current source');
 const before=lv3AfterUnitPublishedText('LV3-U18',PATH,text);
 assert.equal(createHash('sha256').update(before).digest('hex'),ORIGINAL_LF_SHA256,'Original U19 LF publication drift');
 return (JSON.parse(before) as {learningItems:T}).learningItems;
}
