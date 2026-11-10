import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {lv3AfterUnitPublishedText} from './lv3Audit.testSupport';

const U16_PATH='src/features/direct/curriculumLV3Unit16.json';
// Independent BEFORE capture; not a digest derived from inverse output.
const ORIGINAL_U16_LF_SHA256='f31b9ef714bd5c791f8b9eaab7500b41ae9897c29ecc279b5c81f1bad134a358';

/** Read and authenticate the entire current caller on every invocation. No cache. */
export function originalUnit16Items<T>(items:T):T {
 const text=readFileSync(new URL('./curriculumLV3Unit16.json',import.meta.url),'utf8').replace(/\r\n/g,'\n');
 const current=JSON.parse(text) as {learningItems:T};
 assert.deepEqual(items,current.learningItems,'Installed U16 items differ from current source');
 const originalText=lv3AfterUnitPublishedText('LV3-U15',U16_PATH,text);
 assert.equal(createHash('sha256').update(originalText).digest('hex'),ORIGINAL_U16_LF_SHA256,'Original U16 LF publication drift');
 return (JSON.parse(originalText) as {learningItems:T}).learningItems;
}
