import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {lv3AfterUnitPublishedText} from './lv3Audit.testSupport';

const U14_PATH='src/features/direct/curriculumLV3Unit14.json';
// Independent BEFORE capture; not a digest derived from inverse output.
const ORIGINAL_U14_LF_SHA256='0096598297d9853524954bf651dd86b43b4d37cd330dd08008d7547af5a6f067';

/** Read and authenticate the entire current caller on every invocation. No cache. */
export function originalUnit14Items<T>(items:T):T {
 const text=readFileSync(new URL('./curriculumLV3Unit14.json',import.meta.url),'utf8').replace(/\r\n/g,'\n');
 const current=JSON.parse(text) as {learningItems:T};
 assert.deepEqual(items,current.learningItems,'Installed U14 items differ from current source');
 const originalText=lv3AfterUnitPublishedText('LV3-U13',U14_PATH,text);
 assert.equal(createHash('sha256').update(originalText).digest('hex'),ORIGINAL_U14_LF_SHA256,'Original U14 LF publication drift');
 return (JSON.parse(originalText) as {learningItems:T}).learningItems;
}
