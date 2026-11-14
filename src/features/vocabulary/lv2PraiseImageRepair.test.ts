import {expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {beforePraiseGeneral,validatePraiseProof,praiseHash} from '../../../scripts/praise_image_repair_guard.mjs';
import proof from '../../../docs/unit-audit-20261105/LV2-U46-praise-image-repair.json';
import history from '../../../docs/unit-audit-20261105/validation/LV2-U46-praise-before-repair.json';
import oldImages from '../../../docs/unit-audit-20261105/validation/LV2-U46-image-review-before-praise.json';
import followup from '../../../docs/unit-audit-20261105/validation/LV2-U46-praise-image-followup.json';
import images from '../../../docs/unit-audit-20261105/validation/LV2-U46-image-review.json';
import current from './auditedWordIllustrations.json';
import published from './lv1ReviewedImages.json';
import examplePairs from './approvedExampleImages.json';
import examples from '../../../public/data/v1/examples.json';
import captions from '../wordbeast/illustrationCaptions.json';
import unit46 from '../direct/curriculumLV2Unit46.json';
import unit4_6 from '../direct/curriculumLV4Unit6.json';
import unit3_2 from '../direct/curriculumUnit2.json';
import {approvedWordIllustration,approvedCurriculumIllustration} from './approvedCurriculum';
import {getWordBeastAsset} from '../wordbeast/wordBeastAssets';
import {resolveWordImageClue} from '../../quiz/imageClue';
const sha=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex');
it('retains the exact failed-attempt checkpoint and both immutable original and replacement assets',()=>{
 validatePraiseProof(proof);expect(praiseHash(history)).toBe(proof.historicalEvidence.pendingFollowupHash);expect(praiseHash(oldImages)).toBe(proof.historicalEvidence.imageReviewHash);
 expect(history.attempt.generationStarted).toBe(false);expect(history.attempt.candidateCreated).toBe(false);expect(history.appRepairAccepted).toBe(false);expect(history.publicationReady).toBe(false);expect(oldImages.confirmedRepairPending).toEqual(['W001659-praise-single-visible-flower']);
 expect(sha(proof.oldAsset.path)).toBe(proof.oldAsset.sha256);expect(sha(proof.newAsset.path)).toBe(proof.newAsset.sha256);const b=readFileSync(proof.newAsset.path);expect(b.length).toBe(14808);expect(b.subarray(0,4).toString()).toBe('RIFF');expect(b.subarray(8,12).toString()).toBe('WEBP');expect(proof.newAsset.dimensions).toEqual([1024,1024]);
});
it('reverses only the precise appended pair and rejects identity captions order unrelated and duplicate drift',()=>{
 expect(current).toHaveLength(337);const before=beforePraiseGeneral(current,proof);expect(before).toHaveLength(336);expect(praiseHash(before)).toBe(proof.generalRegistryBeforeHash);
 for(const field of ['reviewId','officialWordId','aliases']){const bad=structuredClone(current);(bad.at(-1)! as Record<string,unknown>)[field]='unverified';expect(()=>beforePraiseGeneral(bad,proof)).toThrow();}
 for(const field of ['path','captionEn','captionZh']){const bad=structuredClone(current);(bad.at(-1)!.illustration as Record<string,unknown>)[field]='unverified';expect(()=>beforePraiseGeneral(bad,proof)).toThrow();}
 const other=structuredClone(current);other[0].illustration.captionZh='unrecorded';expect(()=>beforePraiseGeneral(other,proof)).toThrow();expect(()=>beforePraiseGeneral([...current].reverse(),proof)).toThrow();expect(()=>beforePraiseGeneral([...current,current[0]],proof)).toThrow();expect(()=>beforePraiseGeneral(before,proof)).toThrow();
 for(const field of ['baseCommit','assetCommit','wordId','row','generalRegistryBeforeHash','generalRegistryAfterHash','oldAsset','newAsset','historicalEvidence']){const bad=structuredClone(proof) as Record<string,unknown>;bad[field]='unverified';expect(()=>validatePraiseProof(bad)).toThrow();}
});
it('binds praise and every shared resolver to the unchanged captions without retargeting an independent exercise',()=>{
 const pair=proof.row.illustration;expect(approvedWordIllustration('praise','W001659')).toEqual(pair);expect(getWordBeastAsset('W001659','praise')).toContain(pair.path+'?v=');expect(approvedCurriculumIllustration('praise','/'+pair.path+'?v=test')).toEqual(pair);
 expect(resolveWordImageClue('praise','/'+pair.path,'unrelated old caption','unrelated practice')?.text).toBe(pair.captionZh);expect(approvedWordIllustration('praise','W999999')).toBeUndefined();expect(approvedCurriculumIllustration('different-word','/'+pair.path)).toBeUndefined();expect(approvedCurriculumIllustration('praise','/wordbeast/unrelated.webp')).toBeUndefined();
 expect(captions.find(c=>c.word==='praise')).toMatchObject({en:pair.captionEn,zh:pair.captionZh});expect(published.filter(c=>c.officialWordId==='W001659')).toEqual([]);expect(examplePairs.filter(c=>c.officialWordId==='W001659')).toEqual(proof.independentExamplePairsBefore);
 const immutable=(r:{exampleId:string,sentenceEn:string,blankSentence:string,answer:string})=>[r.exampleId,r.sentenceEn,r.blankSentence,r.answer];expect(examples.filter(e=>e.word==='praise').map(immutable)).toEqual(proof.independentPracticeBefore.map(immutable));
});
it('retains both source-only entries and the independently authored judges exercise without fabricated illustrations',()=>{
 for(const [unit,id]of [[unit46,'LI-LV2U46-V008'],[unit4_6,'LI-LV4U06-V074']]as const){const item=unit.learningItems.find(i=>i.learningItemId===id)!;expect(unit.template.deliveryMode).toBe('text_only');expect(item.practiceMode).toBe('read_only');expect(item.officialWordId).toBe('W001659');expect(item).not.toHaveProperty('illustration');expect(item).not.toHaveProperty('originalExample');}
 const independent=unit3_2.learningItems.find(i=>i.learningItemId==='LI-LV3U02-praise')!;expect(independent.originalExample?.sentenceEn).toBe('The judges praise teams that explain their ideas clearly.');expect(independent).not.toHaveProperty('illustration');
});
it('accepts the actual local repaired pair separately from the pending full-level publication gate',()=>{
 expect(followup.appRepairAccepted).toBe(true);expect(followup.publicationReady).toBe(false);expect(images.confirmedRepairPending).toEqual([]);const image=images.images.find(i=>i.word==='praise')!;expect(image.path).toBe(proof.row.illustration.path);expect(image.sha256).toBe(proof.newAsset.sha256);expect(image.pixelsActuallyViewed).toBe(true);
 expect(images.images.filter(i=>i.word!=='praise')).toEqual(oldImages.images.filter(i=>i.word!=='praise'));expect(proof.pixelReview.replacementActuallyViewedAt1024).toBe(true);expect(proof.pixelReview.newGenerationStartedLocally).toBe(false);
});
