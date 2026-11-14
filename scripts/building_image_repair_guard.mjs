import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
export const buildingHash=value=>createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
export function validateBuildingProof(p){
 assert.equal(p.assetCommit,'d866085e76aeec6b05c1d87346221d5fe22ffbd4');
 assert.equal(p.id,'LV1-U09-04');assert.equal(p.wordId,'W001115');assert.equal(p.sourceLearningItemId,'LI-LV2U44-V013');
 assert.equal(buildingHash(p.before),'3b9b89dc1e88b79b3e65237ef0af77e3f4e71486eb7d6e67cfe959e08f89c0fd');
 assert.equal(buildingHash(p.after),'99a808686597c7fafd704cd542286eb5647ae7ad0db2674d1aecd3040a5695f6');
 assert.equal(buildingHash(p.originalApproval),'e4fe1e4cd4960a70bad02b5cac3e833959201ad93d8b7be559bfb913bfebe5c7');
 assert.equal(p.originalImageSha256,'e6f1f487b84df2bdf76f609cd607c19b4306f6984ae5ca748628eb995962a1ba');
 assert.equal(p.replacementImageSha256,'60c34c741c62e77dccf4fa37f9fcbbfc2b40b705787f18da76c1563954e53e4e');
 assert.deepEqual(p.dimensions,[1254,1254]);
 assert.equal(p.publishedRegistryBeforeHash,'41d78d16eee4b0c934e56fd6e4be04ecf4bf9ae83d629891b718f47f5b349f51');
 assert.equal(p.publishedRegistryAfterHash,'b3a497c0ce67d1a5c3ceef12bbbac06e20694e32c40f6fd60c40d7286b3a4c82');
 assert.equal(p.approvalRegistryHash,'7c9de3c15bdfa6622f5a15fb89b32d7b0010dc9d434f85152c77e9f00037106c');
 assert.equal(p.generalRegistryUnchangedHash,'726e6b41fc06bf734249ccc32c5f5ab92fdb7455ef285ffb3df9a17db7dacbe6');
 assert.equal(buildingHash(p.unchangedFiles),'5724bb70d4c7a1f335b73ae32e9f015ff85ab51a3c449b3cd549f06a0a5061ca');
 assert.equal(buildingHash(p.independentExamplePairsBefore),'4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945');
 assert.deepEqual(p.gallery,{path:'public/wordbeast/lv1-reviewed/index.html',beforeNeedle:'src="LV1-U09-04-a9e06429c10e.webp"',afterNeedle:'src="../lv2-reviewed/LV2-U44-building-60c34c741c62.webp"',beforeNormalizedSha256:'bd56ce03fc8e337210467ac7bcd4231796e569a1a0d3b0f432c4bf3b118d9c44',afterNormalizedSha256:'2796e2b8b81bdfad5f68fbfb63f34eb82b01ab86de28445aaf726017e7868074'});
}
export function beforeBuildingRegistry(rows,p){
 validateBuildingProof(p);assert.equal(rows.length,726);assert.equal(new Set(rows.map(r=>r.id)).size,726);
 const copy=structuredClone(rows),index=copy.findIndex(r=>r.id===p.id);assert(index>=0);assert.deepEqual(copy[index],p.after);copy[index]=structuredClone(p.before);
 assert.equal(buildingHash(copy),p.publishedRegistryBeforeHash,'Unrecorded published row/order changes');return copy;
}
export function beforeBuildingGallery(raw,p){
 validateBuildingProof(p);raw=raw.replace(/\r\n/g,'\n');assert.equal(buildingHash(raw),p.gallery.afterNormalizedSha256);assert.equal(raw.split(p.gallery.afterNeedle).length,2);
 const restored=raw.replace(p.gallery.afterNeedle,p.gallery.beforeNeedle);assert.equal(buildingHash(restored),p.gallery.beforeNormalizedSha256);return restored;
}
