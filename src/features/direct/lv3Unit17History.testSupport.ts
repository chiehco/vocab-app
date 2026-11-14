import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {lv3AfterUnitPublishedText} from './lv3Audit.testSupport';

const U17_PATH='src/features/direct/curriculumLV3Unit17.json';
// Independent BEFORE capture; not a digest derived from inverse output.
const ORIGINAL_U17_LF_SHA256='a4d55f89e80323229210caa270a9b353be0bec3c1b5b4e2dec6902ae9b3f35a1';

/** Read and authenticate the entire current caller on every invocation. No cache. */
export function originalUnit17Items<T>(items:T):T {
 const text=readFileSync(new URL('./curriculumLV3Unit17.json',import.meta.url),'utf8').replace(/\r\n/g,'\n');
 const current=JSON.parse(text) as {learningItems:T};
 assert.deepEqual(items,current.learningItems,'Installed U17 items differ from current source');
 const originalText=lv3AfterUnitPublishedText('LV3-U16',U17_PATH,text);
 assert.equal(createHash('sha256').update(originalText).digest('hex'),ORIGINAL_U17_LF_SHA256,'Original U17 LF publication drift');
 return (JSON.parse(originalText) as {learningItems:T}).learningItems;
}
