import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {lv3AfterUnitPublishedText} from './lv3Audit.testSupport';

const U18_PATH='src/features/direct/curriculumLV3Unit18.json';
// Independently captured before U18. This is not recomputed from inverse output.
const ORIGINAL_U18_LF_SHA256='b2f53a9db6ea2e6521a89f0f07fcbd0cf9f6530b52ed4e430962c54585296833';

/** Authenticate the complete installed caller and published bytes before the exact U18 inverse.
 * The archived recovered draft is never rewritten. No projection or freshness check is cached.
 */
export function recoveredUnit18OriginalItems<T>(items:T):T {
 const text=readFileSync(new URL('./curriculumLV3Unit18.json',import.meta.url),'utf8').replace(/\r\n/g,'\n');
 const current=JSON.parse(text) as {learningItems:T};
 assert.deepEqual(items,current.learningItems,'Installed U18 items differ from current source');
 const originalText=lv3AfterUnitPublishedText('LV3-U17',U18_PATH,text);
 assert.equal(createHash('sha256').update(originalText).digest('hex'),ORIGINAL_U18_LF_SHA256,'Original U18 LF publication drift');
 return (JSON.parse(originalText) as {learningItems:T}).learningItems;
}
