import {expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {beforeBuildingRegistry,beforeBuildingGallery,validateBuildingProof,buildingHash} from '../../../scripts/building_image_repair_guard.mjs';
import proof from '../../../docs/unit-audit-20261105/LV2-U44-building-image-repair.json';
import currentPublished from './lv1ReviewedImages.json';
const published=currentPublished;
import currentGeneral from './auditedWordIllustrations.json';
import {beforePraiseGeneral} from '../../../scripts/praise_image_repair_guard.mjs';
import praiseProof from '../../../docs/unit-audit-20261105/LV2-U46-praise-image-repair.json';
import examplePairs from './approvedExampleImages.json';
import approvals from '../../../scripts/approvals/lv1-images-20260922.json';
import unit44 from '../direct/curriculumLV2Unit44.json';
import {approvedWordIllustration,approvedCurriculumIllustration,approvedLV1Images} from './approvedCurriculum';
import {getWordBeastAsset} from '../wordbeast/wordBeastAssets';
import {resolveWordImageClue} from '../../quiz/imageClue';
const general=beforePraiseGeneral(currentGeneral,praiseProof);
const sha=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex');
it('keeps original assets approvals and independent practice while repairing only the telescope picture',()=>{
 validateBuildingProof(proof);expect(sha('public/'+proof.before.illustration.path)).toBe(proof.originalImageSha256);expect(sha('public/'+proof.after.illustration.path)).toBe(proof.replacementImageSha256);
 expect(buildingHash(approvals)).toBe(proof.approvalRegistryHash);expect(approvals.find(r=>r.id===proof.id)).toEqual(proof.originalApproval);
 expect(buildingHash(general)).toBe(proof.generalRegistryUnchangedHash);expect(examplePairs.filter(r=>r.officialWordId===proof.wordId)).toEqual(proof.independentExamplePairsBefore);
 expect(proof.after.illustration.captionEn).toBe(proof.before.illustration.captionEn);expect(proof.after.illustration.captionZh).toBe(proof.before.illustration.captionZh);
});
it('restores only the exact later row before all older published history checks',()=>{
 expect(buildingHash(beforeBuildingRegistry(published,proof))).toBe(proof.publishedRegistryBeforeHash);
 for(const field of ['id','unit','displayWord','officialWordId','aliases']){const bad=structuredClone(published);(bad.find(r=>r.id===proof.id)! as Record<string,unknown>)[field]='unverified';expect(()=>beforeBuildingRegistry(bad,proof)).toThrow();}
 for(const field of ['path','captionEn','captionZh']){const bad=structuredClone(published);(bad.find(r=>r.id===proof.id)!.illustration as Record<string,unknown>)[field]='unverified';expect(()=>beforeBuildingRegistry(bad,proof)).toThrow();}
 const other=structuredClone(published);other[0].illustration.captionZh='unrecorded';expect(()=>beforeBuildingRegistry(other,proof)).toThrow();expect(()=>beforeBuildingRegistry([...published].reverse(),proof)).toThrow();expect(()=>beforeBuildingRegistry([...published,published[0]],proof)).toThrow();expect(()=>beforeBuildingRegistry(beforeBuildingRegistry(published,proof),proof)).toThrow();
 for(const key of ['before','after','originalApproval','replacementImageSha256','publishedRegistryBeforeHash','gallery','unchangedFiles','independentExamplePairsBefore']){const bad=structuredClone(proof) as Record<string,unknown>;bad[key]='unverified';expect(()=>validateBuildingProof(bad)).toThrow();}
});
it('changes just one gallery source and rejects captions unrelated bytes and source identity drift',()=>{
 const raw=readFileSync(proof.gallery.path,'utf8');expect(buildingHash(beforeBuildingGallery(raw,proof))).toBe(proof.gallery.beforeNormalizedSha256);
 expect(()=>beforeBuildingGallery(raw.replace('The new science building','A different building'),proof)).toThrow();expect(()=>beforeBuildingGallery(raw+'unrecorded',proof)).toThrow();expect(()=>beforeBuildingGallery(raw.replace('LV1-U09-04','LV1-U09-99'),proof)).toThrow();
});
it('resolves the three consumers precisely and keeps LV2 read-only text without a forged image exercise',()=>{
 expect(published.find(r=>r.id===proof.id)).toEqual(proof.after);expect(approvedLV1Images('building',proof.wordId)).toContainEqual(proof.after);
 expect(approvedWordIllustration('building',proof.wordId)).toEqual(proof.after.illustration);expect(getWordBeastAsset(proof.wordId,'building')).toContain(proof.after.illustration.path);
 expect(approvedCurriculumIllustration('building','/'+proof.after.illustration.path+'?v=local')).toEqual(proof.after.illustration);expect(resolveWordImageClue('building','/'+proof.after.illustration.path)?.text).toBe(proof.after.illustration.captionZh);
 expect(approvedWordIllustration('building','W999999')).toBeUndefined();expect(approvedCurriculumIllustration('different-word','/'+proof.after.illustration.path)).toBeUndefined();
 const item=unit44.learningItems.find(r=>r.learningItemId===proof.sourceLearningItemId)!;expect(unit44.template.deliveryMode).toBe('text_only');expect(item.practiceMode).toBe('read_only');expect(item.officialWordId).toBe(proof.wordId);expect(item).not.toHaveProperty('illustration');expect(item).not.toHaveProperty('originalExample');
});
