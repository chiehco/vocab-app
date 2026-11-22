import {beforeU07CaptionText} from './lv3U07ImageCaptionRepair.testSupport';
import {beforeLV4PublishedText} from '../direct/lv4Published.testSupport';
import {expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {beforeLV3GeneralImages,validateLV3ImageProof,lv3ImageHash} from '../../../scripts/lv3_image_repair_guard.mjs';
import proof from '../../../docs/unit-audit-20261105/LV3-bank-permissible-image-repairs.json';
import currentWithReplace from './auditedWordIllustrations.json';
import {beforeReplaceImages} from './lv3ReplaceImageRepair.testSupport';
const current=beforeReplaceImages(currentWithReplace);
import captions from '../wordbeast/illustrationCaptions.json';
import published from './lv1ReviewedImages.json';
import unit1 from '../direct/curriculum.json';
import unit2 from '../direct/curriculumUnit2.json';
import {approvedWordIllustration,approvedCurriculumIllustration,approvedCurriculumCard} from './approvedCurriculum';
import {getWordBeastAsset} from '../wordbeast/wordBeastAssets';
import {resolveWordImageClue} from '../../quiz/imageClue';
const sha=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex');
it('retains exact source and candidate bytes and unchanged media captions and published unit pairs',()=>{
 validateLV3ImageProof(proof);
 for(const item of proof.assets)for(const asset of [item.source,item.candidate])expect(sha(asset.path)).toBe(asset.sha256);
 for(const item of proof.assets){const bytes=readFileSync(item.candidate.path);expect(bytes.length).toBe(item.candidate.bytes);expect(bytes.subarray(0,4).toString()).toBe('RIFF');expect(bytes.subarray(8,12).toString()).toBe('WEBP');}
 for(const file of proof.unchangedFiles){
  const text=beforeLV4PublishedText(file.path,readFileSync(file.path,'utf8').replace(/\r\n/g,'\n'));
  expect(lv3ImageHash(JSON.parse(file.path==='src/features/wordbeast/illustrationCaptions.json'?beforeU07CaptionText(text):text))).toBe(file.normalizedJsonSha256);
 }
 expect(lv3ImageHash(JSON.parse(readFileSync(proof.candidateManifest.path,'utf8')))).toBe(proof.candidateManifest.normalizedJsonSha256);
 expect(proof.candidateManifest.timestampCorrection.validCreatedAtUtc).toBe('2026-11-07T13:36:00Z');expect(proof.candidateManifest.timestampCorrection.assetCommitTimeUtc).toBe('2026-11-07T13:38:59Z');
 expect(proof.review.manualUserApproved).toBe(false);expect(proof.review.publicationReady).toBe(false);
});
it('strictly reverses just one replaced path and one unique appended exact pair',()=>{
 const before=beforeLV3GeneralImages(current,proof);expect(before).toHaveLength(337);expect(lv3ImageHash(before)).toBe('d9905ded7a45f66015643b401ad1b57d6e8dcb44142218cf131710e99a91dc6a');
 expect(current).toHaveLength(338);expect(current.slice(0,-1).filter(r=>r.reviewId!==proof.bankAfter.reviewId)).toEqual(before.filter(r=>r.reviewId!==proof.bankBefore.reviewId));
 expect({...proof.bankAfter,illustration:{...proof.bankAfter.illustration,path:proof.bankBefore.illustration.path}}).toEqual(proof.bankBefore);
 for(const id of [proof.bankAfter.reviewId,proof.permissible.reviewId]){
  for(const field of ['reviewId','officialWordId','aliases']){const bad=structuredClone(current);(bad.find(r=>r.reviewId===id)! as Record<string,unknown>)[field]='unverified';expect(()=>beforeLV3GeneralImages(bad,proof)).toThrow();}
  for(const field of ['path','captionEn','captionZh']){const bad=structuredClone(current);(bad.find(r=>r.reviewId===id)!.illustration as Record<string,unknown>)[field]='unverified';expect(()=>beforeLV3GeneralImages(bad,proof)).toThrow();}
 }
 const unrelated=structuredClone(current);unrelated[0].illustration.captionZh='unrecorded';expect(()=>beforeLV3GeneralImages(unrelated,proof)).toThrow();
 expect(()=>beforeLV3GeneralImages([...current].reverse(),proof)).toThrow();expect(()=>beforeLV3GeneralImages([...current,current[0]],proof)).toThrow();expect(()=>beforeLV3GeneralImages(before,proof)).toThrow();
 for(const key of Object.keys(proof)){const bad=structuredClone(proof) as Record<string,unknown>;bad[key]='unverified';expect(()=>validateLV3ImageProof(bad)).toThrow();}
});
it('binds ordinary card gallery and image-clue shared resolvers to exact unchanged captions only',()=>{
 for(const row of [proof.bankAfter,proof.permissible]){
  const word=row.aliases[0],pair=row.illustration;
  expect(approvedWordIllustration(word,row.officialWordId)).toEqual(pair);expect(getWordBeastAsset(row.officialWordId,word)).toContain(pair.path+'?v=');
  expect(approvedCurriculumIllustration(word,'/'+pair.path+'?v=test')).toEqual(pair);expect(resolveWordImageClue(word,'/'+pair.path,'unrelated old caption','unrelated practice')?.text).toBe(pair.captionZh);
  expect(approvedWordIllustration(word,'W999999')).toBeUndefined();expect(approvedCurriculumIllustration('wrong-word','/'+pair.path)).toBeUndefined();expect(approvedCurriculumIllustration(word,'/wordbeast/unrelated.webp')).toBeUndefined();
  expect(approvedCurriculumCard(word,row.officialWordId)).toBeUndefined();
 }
 expect(captions.find(c=>c.word==='permissible')).toMatchObject({en:proof.permissible.illustration.captionEn,zh:proof.permissible.illustration.captionZh});
});
it('does not attach these pictures to distinct U01 and U02 authored exercises',()=>{
 const bank=unit1.learningItems.find(r=>r.learningItemId==='LI-LV3U01-bank')!;
 const permissible=unit2.learningItems.find(r=>r.learningItemId==='LI-LV3U02-permissible')!;
 expect(bank.originalExample?.sentenceEn).toBe('We rested on the grassy bank and watched the water flow past.');expect(bank).not.toHaveProperty('illustration');
 expect(permissible.originalExample?.sentenceEn).toBe('Only small bags are permissible inside the exhibition hall.');expect(permissible).not.toHaveProperty('illustration');
});

it('keeps the unrelated static LV1 gallery unchanged and proves these pairs are absent',()=>{
 expect(published.filter(r=>typeof r.officialWordId==='string'&&['W000061','W005669'].includes(r.officialWordId))).toEqual([]);
 const gallery=readFileSync('public/wordbeast/lv1-reviewed/index.html','utf8');
 for(const term of ['LV1-U14-37','W005669',proof.bankBefore.illustration.captionEn,proof.permissible.illustration.captionEn]){
  if(typeof term!=='string'||!term.length)throw new Error('Exact retained image caption must be a nonempty string');
  expect(gallery).not.toContain(term);
 }
});
