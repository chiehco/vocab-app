import examplePairs from './approvedExampleImages.json';
import {expect,it} from 'vitest';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import general from './auditedWordIllustrations.json';
import published from './lv1ReviewedImages.json';
import approvals from '../../../scripts/approvals/lv1-images-20260922.json';
import proof from '../../../docs/unit-audit-20261105/LV2-U38-U41-image-repairs.json';
import unit38 from '../direct/curriculumLV2Unit38.json';
import unit41 from '../direct/curriculumLV2Unit41.json';
import {beforeU38U41GeneralRepairs,beforeU38PlaygroundPair} from './lv2ImageRepairs.testSupport';
import {approvedWordIllustration,approvedCurriculumIllustration} from './approvedCurriculum';
import {getWordBeastAsset} from '../wordbeast/wordBeastAssets';
import {resolveWordImageClue} from '../../quiz/imageClue';
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const bytesHash=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex');
const known={generosity:'fdecea42d13a9b79b6012df71a7e80a6efbb2be56d095be6303f5fb5d769dd79',playground:'a6b345e0f778db7542e02e6381d03444fcac0517551f2c2494b296e64ee8fd7f',discover:'f9a557414b67a06be314e669763ea7bd1e2333e71aac842a9bb03eb6168212b1'};
it('uses only the three delivered assets and retains their immutable originals and captions',()=>{
 expect(proof.assetCommit).toBe('248c092f13c969123b0cd98102dd4d459112479f');expect(proof.cards).toHaveLength(3);
 for(const p of proof.cards){expect(p.publishedImageSha256).toBe(known[p.word as keyof typeof known]);expect(bytesHash('public/'+p.publishedPath)).toBe(p.publishedImageSha256);expect(bytesHash('public/'+p.originalPath)).toBe(p.originalImageSha256);expect(p.pixelReview).toContain('actually viewed original');expect(p.captionEn).toBeTruthy();expect(p.captionZh).toBeTruthy();}
 expect(proof.playground.before.illustration.captionEn).toBe(proof.playground.after.illustration.captionEn);expect(proof.playground.before.illustration.captionZh).toBe(proof.playground.after.illustration.captionZh);
});
it('reverses exactly two general pairs and rejects after row identity caption path order and unrelated drift',()=>{
 expect(general).toHaveLength(336);expect(beforeU38U41GeneralRepairs(general)).toHaveLength(334);expect(hash(beforeU38U41GeneralRepairs(general))).toBe(proof.generalRegistryBeforeHash);
 for(const row of proof.generalRows){for(const field of ['path','captionEn','captionZh']){const bad=structuredClone(general);(bad.find(r=>r.reviewId===row.reviewId)!.illustration as Record<string,unknown>)[field]='unverified';expect(()=>beforeU38U41GeneralRepairs(bad)).toThrow();}for(const field of ['reviewId','officialWordId','aliases']){const bad=structuredClone(general);(bad.find(r=>r.reviewId===row.reviewId)! as Record<string,unknown>)[field]='unverified';expect(()=>beforeU38U41GeneralRepairs(bad)).toThrow();}}
 const other=structuredClone(general);other[0].illustration.captionZh='unverified';expect(()=>beforeU38U41GeneralRepairs(other)).toThrow();expect(()=>beforeU38U41GeneralRepairs([...general,general[0]])).toThrow();expect(()=>beforeU38U41GeneralRepairs([...general].reverse())).toThrow();
});
it('reverses only the playground published path and keeps the original approval record unchanged',()=>{
 expect(beforeU38PlaygroundPair(published)).toHaveLength(726);expect(hash(beforeU38PlaygroundPair(published))).toBe(proof.publishedRegistryBeforeHash);expect(hash(approvals)).toBe(proof.approvalRegistryHash);expect(approvals.find(r=>r.id==='LV1-U09-27')).toEqual(proof.playground.originalApproval);
 for(const field of ['path','captionEn','captionZh']){const bad=structuredClone(published);(bad.find(r=>r.id==='LV1-U09-27')!.illustration as Record<string,unknown>)[field]='unverified';expect(()=>beforeU38PlaygroundPair(bad)).toThrow();}for(const field of ['id','officialWordId','unit']){const bad=structuredClone(published);(bad.find(r=>r.id==='LV1-U09-27')! as Record<string,unknown>)[field]='unverified';expect(()=>beforeU38PlaygroundPair(bad)).toThrow();}
 const other=structuredClone(published);other[0].illustration.captionZh='unverified';expect(()=>beforeU38PlaygroundPair(other)).toThrow();expect(()=>beforeU38PlaygroundPair([...published,published[0]])).toThrow();expect(()=>beforeU38PlaygroundPair([...published].reverse())).toThrow();
});
it('binds each actual general consumer to its exact caption without matching another word or ID',()=>{
 for(const p of proof.cards){const actual=approvedWordIllustration(p.word,p.officialWordId);expect(actual).toEqual({path:p.publishedPath,captionEn:p.captionEn,captionZh:p.captionZh});expect(getWordBeastAsset(p.officialWordId,p.word)).toContain(p.publishedPath);expect(approvedCurriculumIllustration(p.word,'/'+p.publishedPath+'?v=test')).toEqual(actual);expect(resolveWordImageClue(p.word,'/'+p.publishedPath,'unrelated old caption')?.text).toBe(p.captionZh);expect(approvedWordIllustration(p.word,'W999999')).toBeUndefined();expect(approvedCurriculumIllustration('wrong-word','/'+p.publishedPath)).toBeUndefined();}
 expect(published.find(r=>r.id==='LV1-U09-27')?.illustration).toEqual(approvedWordIllustration('playground','W001638'));
});
it('preserves all formal content independent practice mappings and source-only curricula',()=>{
 expect(proof.formalContentUnchangedAfterApply).toBe(true);expect(examplePairs.filter(r=>proof.cards.some(c=>c.officialWordId===r.officialWordId))).toEqual(proof.independentExamplePairsBefore);
 for(const [unit,id,wordId]of [[unit38,'LI-LV2U38-V069','W003446'],[unit38,'LI-LV2U38-V007','W001638'],[unit41,'LI-LV2U41-V025','W001261']] as const){expect(unit.template.deliveryMode).toBe('text_only');const item=unit.learningItems.find(r=>r.learningItemId===id)!;expect(item).toBeDefined();expect(item.officialWordId).toBe(wordId);expect(item.practiceMode).toBe('read_only');expect(item).not.toHaveProperty('illustration');expect(item).not.toHaveProperty('originalExample');}
});

it('changes only the exact public-gallery image source and retains every other byte after normalization',()=>{const raw=readFileSync(proof.gallery.path,'utf8').replace(/\r\n/g,'\n');expect(createHash('sha256').update(raw).digest('hex')).toBe(proof.gallery.afterNormalizedSha256);expect(raw.split(proof.gallery.afterNeedle)).toHaveLength(2);const old=raw.replace(proof.gallery.afterNeedle,proof.gallery.beforeNeedle);expect(createHash('sha256').update(old).digest('hex')).toBe(proof.gallery.beforeNormalizedSha256);expect(raw).toContain('id="LV1-U09-27"');});
