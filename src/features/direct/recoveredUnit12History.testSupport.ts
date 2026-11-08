import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {lv3AfterUnitPublishedText} from './lv3Audit.testSupport';

const U12_PATH='src/features/direct/curriculumLV3Unit12.json';
// Independently recorded BEFORE LF hash. Original CRLF bytes had raw SHA256
// 41dd99db99db60b33190993f6e30ea7205be4b3c8cff35d8fc0279fc4ddc34fe.
const ORIGINAL_U12_LF_SHA256='70e236bc4322124a25d05ba757d0b9d38b02046bf6e2d56d7591d55251ec14ef';

/** Authenticate the entire installed caller and published source before the exact U12 inverse.
 * The archived recovered draft is never rewritten. No result or freshness check is cached.
 */
export function recoveredUnit12OriginalItems<T>(items:T):T {
 const text=readFileSync(new URL('./curriculumLV3Unit12.json',import.meta.url),'utf8').replace(/\r\n/g,'\n');
 const current=JSON.parse(text) as {learningItems:T};
 assert.deepEqual(items,current.learningItems,'Installed U12 items differ from current source');
 const originalText=lv3AfterUnitPublishedText('LV3-U11',U12_PATH,text);
 assert.equal(createHash('sha256').update(originalText).digest('hex'),ORIGINAL_U12_LF_SHA256,'Original U12 LF publication drift');
 const original=JSON.parse(originalText) as {learningItems:T};
 return original.learningItems;
}
