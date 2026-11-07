import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
export const additionalHash=value=>createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
export function validateAdditionalProof(p){
 assert.equal(p.coreHash,'7d41a9e06329ef7714e9eaa8284a8338a541f275c6dda9c9e3283253da0b33d6');assert.equal(additionalHash(p.core),p.coreHash);
 assert.equal(p.core.id,'LV1-U08-33');assert.equal(p.core.wordId,'W002010');assert.deepEqual(p.core.dimensions,[1254,1254]);
 const before=structuredClone(p.core.after);before.illustration.captionZh=p.core.before.illustration.captionZh;assert.deepEqual(before,p.core.before);
}
export function beforeAdditionalRegistry(rows,p){
 validateAdditionalProof(p);const c=p.core;assert.equal(rows.length,726);assert.equal(new Set(rows.map(r=>r.id)).size,726);assert.equal(additionalHash(rows),c.registry.afterHash,'Unrecorded current registry drift');
 const old=structuredClone(rows),i=old.findIndex(r=>r.id===c.id);assert(i>=0);assert.deepEqual(old[i],c.after);assert.equal(additionalHash(old.filter(r=>r.id!==c.id)),c.registry.unchangedRowsHash);old[i]=structuredClone(c.before);assert.equal(additionalHash(old),c.registry.beforeHash);return old;
}
export function beforeAdditionalGallery(raw,p){
 validateAdditionalProof(p);const g=p.core.gallery;raw=raw.replace(/\r\n/g,'\n');assert.equal(additionalHash(raw),g.afterNormalizedSha256);assert.equal(raw.split(g.afterArticle).length,2);const old=raw.replace(g.afterArticle,g.beforeArticle);assert.equal(additionalHash(old),g.beforeNormalizedSha256);return old;
}
