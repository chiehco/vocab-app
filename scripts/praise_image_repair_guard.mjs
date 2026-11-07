import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
export const praiseHash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const expectedRow={reviewId:'LI-LV2U46-V008',officialWordId:'W001659',aliases:['praise'],illustration:{path:'wordbeast/lv2-reviewed/LV2-U46-praise-3627b1c737c1.webp',captionEn:'Doudou offers flowers in praise of a friend, who bows happily.',captionZh:'豆豆送花稱讚朋友，朋友開心地鞠躬。'}};
export function validatePraiseProof(p){
 assert.equal(p.baseCommit,'952ffe7df0a2ede8e84933690785ed455a7cdab6');assert.equal(p.assetCommit,'7d65154fc716ce4900bdce4d7756e76563e8cb8a');assert.equal(p.wordId,'W001659');assert.deepEqual(p.row,expectedRow);
 assert.equal(p.generalRegistryPath,'src/features/vocabulary/auditedWordIllustrations.json');assert.equal(p.generalRegistryBeforeHash,'726e6b41fc06bf734249ccc32c5f5ab92fdb7455ef285ffb3df9a17db7dacbe6');assert.equal(p.generalRegistryAfterHash,'d9905ded7a45f66015643b401ad1b57d6e8dcb44142218cf131710e99a91dc6a');
 assert.deepEqual(p.oldAsset,{path:'public/wordbeast/a/W001659.webp',sha256:'1292ab2ed0e282791f766f4ff13bb36a8200598bf93596b74658a732389238d1',dimensions:[1024,1024]});
 assert.deepEqual(p.newAsset,{path:'public/wordbeast/lv2-reviewed/LV2-U46-praise-3627b1c737c1.webp',sha256:'3627b1c737c1faa273653217b6636643d2af5b1f6ba6ebaed93f51e653d1d78f',dimensions:[1024,1024],bytes:14808,mode:'RGB',quality:85,method:6});
 assert.equal(p.historicalEvidence.pendingFollowup,'validation/LV2-U46-praise-before-repair.json');assert.equal(p.historicalEvidence.pendingFollowupHash,'ea09ba1b54080d1181525723450c8a66ad9e1a8bc0cece35454bef92a32e0922');assert.equal(p.historicalEvidence.imageReview,'validation/LV2-U46-image-review-before-praise.json');assert.equal(p.historicalEvidence.imageReviewHash,'f4747899a712eb9d171094ae94d04f13e894391f09d1f523163bb31509b1e720');
}
export function beforePraiseGeneral(rows,p){
 validatePraiseProof(p);assert.equal(rows.length,337);assert.equal(new Set(rows.map(r=>r.reviewId)).size,337);assert.equal(praiseHash(rows),p.generalRegistryAfterHash,'Unrecorded current row/order drift');assert.deepEqual(rows.at(-1),expectedRow);assert.equal(rows.filter(r=>r.officialWordId==='W001659').length,1);
 const copy=structuredClone(rows.slice(0,-1));assert.equal(praiseHash(copy),p.generalRegistryBeforeHash,'Unrecorded older registry drift');return copy;
}
