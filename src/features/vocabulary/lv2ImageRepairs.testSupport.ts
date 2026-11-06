import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {beforeBuildingRegistry} from '../../../scripts/building_image_repair_guard.mjs';
const buildingProof=JSON.parse(readFileSync('docs/unit-audit-20261105/LV2-U44-building-image-repair.json','utf8'));
const proof=JSON.parse(readFileSync('docs/unit-audit-20261105/LV2-U38-U41-image-repairs.json','utf8'));
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const expectedGeneral=[{"reviewId":"LI-LV2U38-V069","officialWordId":"W003446","aliases":["generosity"],"illustration":{"path":"wordbeast/lv2-reviewed/LV2-U38-generosity-fdecea42d13a.webp","captionEn":"Doudou shows generosity by giving both apples to a friend.","captionZh":"豆豆把兩顆蘋果都送給朋友，展現慷慨。"}},{"reviewId":"LI-LV2U41-V025","officialWordId":"W001261","aliases":["discover"],"illustration":{"path":"wordbeast/lv2-reviewed/LV2-U41-discover-f9a557414b67.webp","captionEn":"While digging, the workers unexpectedly discover a buried treasure chest.","captionZh":"工人挖土時，意外發現埋在地下的寶箱。"}}];
const expectedBefore={"id":"LV1-U09-27","unit":9,"displayWord":"playground","officialWordId":"W001638","aliases":["playground"],"illustration":{"path":"wordbeast/lv1-reviewed/LV1-U09-27-39abaecad0fa.webp","captionEn":"The kids are swinging happily on the playground.","captionZh":"孩子們在遊樂場開心地盪鞦韆。"}},expectedAfter={"id":"LV1-U09-27","unit":9,"displayWord":"playground","officialWordId":"W001638","aliases":["playground"],"illustration":{"path":"wordbeast/lv2-reviewed/LV2-U38-playground-a6b345e0f778.webp","captionEn":"The kids are swinging happily on the playground.","captionZh":"孩子們在遊樂場開心地盪鞦韆。"}};
export function beforeU38U41GeneralRepairs<T extends {reviewId:string}>(rows:T[]):T[]{
 assert.deepEqual(proof.generalRows,expectedGeneral);assert.equal(proof.generalRegistryBeforeHash,'824fd0b51d792e144408049756ef20431767ffa49a05fbd9e25fafad6dcb705b');assert.equal(rows.length,336);let copy=structuredClone(rows);for(const row of expectedGeneral){const matching=copy.filter(c=>c.reviewId===row.reviewId);assert.equal(matching.length,1);assert.deepEqual(matching[0],row);copy=copy.filter(c=>c.reviewId!==row.reviewId);}assert.equal(hash(copy),'824fd0b51d792e144408049756ef20431767ffa49a05fbd9e25fafad6dcb705b');return copy;
}
export function beforeU38PlaygroundPair<T extends {id:string}>(rows:T[]):T[]{
 rows=beforeBuildingRegistry(rows,buildingProof);
 assert.deepEqual(proof.playground.before,expectedBefore);assert.deepEqual(proof.playground.after,expectedAfter);assert.equal(rows.length,726);assert.equal(new Set(rows.map(r=>r.id)).size,726);const copy=structuredClone(rows),matching=copy.filter(r=>r.id==='LV1-U09-27');assert.equal(matching.length,1);assert.deepEqual(matching[0],expectedAfter);Object.assign(copy[copy.findIndex(r=>r.id==='LV1-U09-27')],structuredClone(expectedBefore));assert.equal(hash(copy),'909fd09465653a5a294eb68920b6e50abd68d5e7972eb41f367aa18c13fe9539');return copy;
}
