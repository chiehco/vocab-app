import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {lv3AfterUnitPublishedText} from './lv3Audit.testSupport';

const U13_PATH='src/features/direct/curriculumLV3Unit13.json';
// Independent BEFORE capture; not a digest derived from inverse output.
const ORIGINAL_U13_LF_SHA256='64d9279685e275af4af0377a35199f125e7b1c34c75a5c8d3b78b77b5a011b86';

/** Read and authenticate the entire current caller on every invocation. No cache. */
export function originalUnit13Items<T>(items:T):T {
 const text=readFileSync(new URL('./curriculumLV3Unit13.json',import.meta.url),'utf8').replace(/\r\n/g,'\n');
 const current=JSON.parse(text) as {learningItems:T};
 assert.deepEqual(items,current.learningItems,'Installed U13 items differ from current source');
 const originalText=lv3AfterUnitPublishedText('LV3-U12',U13_PATH,text);
 assert.equal(createHash('sha256').update(originalText).digest('hex'),ORIGINAL_U13_LF_SHA256,'Original U13 LF publication drift');
 return (JSON.parse(originalText) as {learningItems:T}).learningItems;
}
