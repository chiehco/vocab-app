import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {lv3AfterUnitPublishedText} from './lv3Audit.testSupport';

const U15_PATH='src/features/direct/curriculumLV3Unit15.json';
// Independent BEFORE capture; not a digest derived from inverse output.
const ORIGINAL_U15_LF_SHA256='dd8506b9cd8138f4d9ec2fe188e764c55f7f0f64ad40c4254a966dad32c8df22';

/** Read and authenticate the entire current caller on every invocation. No cache. */
export function originalUnit15Items<T>(items:T):T {
 const text=readFileSync(new URL('./curriculumLV3Unit15.json',import.meta.url),'utf8').replace(/\r\n/g,'\n');
 const current=JSON.parse(text) as {learningItems:T};
 assert.deepEqual(items,current.learningItems,'Installed U15 items differ from current source');
 const originalText=lv3AfterUnitPublishedText('LV3-U14',U15_PATH,text);
 assert.equal(createHash('sha256').update(originalText).digest('hex'),ORIGINAL_U15_LF_SHA256,'Original U15 LF publication drift');
 return (JSON.parse(originalText) as {learningItems:T}).learningItems;
}
