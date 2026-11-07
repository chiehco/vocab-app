import {beforeLV3ReplaceText} from '../../../scripts/lv3_replace_image_guard.mjs';
import replaceProof from '../../../docs/unit-audit-20261105/LV3-replace-image-repair.json';
import {beforeLV3GeneralImages} from '../../../scripts/lv3_image_repair_guard.mjs';
import imageProof from '../../../docs/unit-audit-20261105/LV3-bank-permissible-image-repairs.json';
import {lv3AfterUnit1PublishedText} from '../direct/lv3Audit.testSupport';
import {lv3Unit1BeforePublishedText} from '../direct/lv3Unit1Audit.testSupport';
import {expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {additionalHash,validateAdditionalProof,beforeAdditionalRegistry,beforeAdditionalGallery} from '../../../scripts/additional_caption_guard.mjs';
import proof from '../../../docs/unit-audit-20261105/LV1-U08-additional-caption-review.json';
import publishedCards from './lv1ReviewedImages.json';
import approvals from '../../../scripts/approvals/lv1-images-20260922.json';
import examples from '../../../public/data/v1/examples.json';
import {approvedWordIllustration,approvedCurriculumIllustration,approvedLV1Images} from './approvedCurriculum';
import {getWordBeastAsset} from '../wordbeast/wordBeastAssets';
import {resolveWordImageClue} from '../../quiz/imageClue';
function beforeImageRegistryText(text:string):string {
 text=beforeLV3ReplaceText(text,replaceProof);
 const rows=JSON.parse(text);
 if(text!==JSON.stringify(rows,null,2)+'\n')throw new Error('Unknown current image registry raw-byte drift');
 return JSON.stringify(beforeLV3GeneralImages(rows,imageProof),null,2)+'\n';
}
it('rejects image-registry raw formatting and duplicate-key drift before historical projection',()=>{
 const current=readFileSync('src/features/vocabulary/auditedWordIllustrations.json','utf8').replace(/\r\n/g,'\n');
 expect(createHash('sha256').update(beforeImageRegistryText(current)).digest('hex')).toBe('87bb5b4c6735fdaa7f71d331265f97e04af4c367bc83f965b7e88d475cd352e0');
 for(const changed of [current+' ',current+'\n',current.replace('  {',' {'),current.replace('"reviewId":','"reviewId":"unrecorded","reviewId":')])
  expect(()=>beforeImageRegistryText(changed)).toThrow(/raw-byte drift/);
});
const c=proof.core,bytesHash=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex');
// The LV1 caption candidate is retained as evidence, not published in the LV2 batch.
const cards=structuredClone(publishedCards);
const candidateIndex=cards.findIndex(r=>r.id===c.id);
expect(cards[candidateIndex]).toEqual(c.before);
cards[candidateIndex]=structuredClone(c.after);

it('retains the independent original approval image English and broader science-project source boundary',()=>{
 validateAdditionalProof(proof);expect(approvals.find(r=>r.id===c.id)).toEqual(c.originalApproval);expect(c.after.illustration.path).toBe(c.before.illustration.path);expect(c.after.illustration.captionEn).toBe(c.before.illustration.captionEn);expect(c.after.illustration.captionZh).toBe('她需要額外的時間才能完成她的科學專題。');expect(bytesHash('public/'+c.after.illustration.path)).toBe(c.imageSha256);expect(c.dimensions).toEqual([1254,1254]);expect(additionalHash(c.before.illustration.captionEn+'\n'+c.before.illustration.captionZh)).toBe(c.originalApproval.textSha256);expect(c.sourceEvidence.retrieval).toBe('direct_primary_dictionary_definition');expect(c.sourceEvidence.unsuccessfulSource.result).toContain('403');
 for(const f of proof.unchangedFiles){
  const current=readFileSync(f.path,'utf8').replace(/\r\n/g,'\n');
  const retained=f.path==='src/features/vocabulary/auditedWordIllustrations.json'
   ? beforeImageRegistryText(current) : current;
  expect(createHash('sha256').update(lv3Unit1BeforePublishedText(f.path,lv3AfterUnit1PublishedText(f.path,retained))).digest('hex'),f.path).toBe(f.lfNormalizedSha256);
 }
 expect(proof.unchangedFiles.find(f=>f.path==='src/features/vocabulary/approvedExampleImages.json')).toMatchObject({"sha256":"cb10a47f664cba5d897488972f6144b84f9285903170aa07bab8663f224dd753","lfNormalizedSha256":"030d8c1de76182f6a5cdf5340e84ddc8112cd0f54c998b9ffbef189259e2c12a"});
 expect(proof.crossPlatformTextChecksum.allOriginalRawSha256ValuesRetained).toBe(true);
});
it('restores exactly one Chinese caption before all old registry hashes',()=>{
 const old=beforeAdditionalRegistry(cards,proof);expect(old).toHaveLength(726);expect(additionalHash(old)).toBe(c.registry.beforeHash);expect(old.find(r=>r.id===c.id)).toEqual(c.before);expect(cards.find(r=>r.id===c.id)).toEqual(c.after);expect(()=>beforeAdditionalRegistry(old,proof)).toThrow();
 for(const field of ['id','unit','officialWordId','displayWord','aliases']){const bad=structuredClone(cards);(bad.find(r=>r.id===c.id)! as Record<string,unknown>)[field]='unverified';expect(()=>beforeAdditionalRegistry(bad,proof)).toThrow();}
 for(const field of ['path','captionEn','captionZh']){const bad=structuredClone(cards);(bad.find(r=>r.id===c.id)!.illustration as Record<string,unknown>)[field]='unverified';expect(()=>beforeAdditionalRegistry(bad,proof)).toThrow();}
 const other=structuredClone(cards);other[0].illustration.captionZh='unrecorded';expect(()=>beforeAdditionalRegistry(other,proof)).toThrow();expect(()=>beforeAdditionalRegistry([...cards].reverse(),proof)).toThrow();expect(()=>beforeAdditionalRegistry([...cards,cards[0]],proof)).toThrow();
});
it('rejects rewritten proof before after source image and historical hash evidence',()=>{
 for(const field of Object.keys(c)){const bad=structuredClone(proof);(bad.core as Record<string,unknown>)[field]='unverified';expect(()=>validateAdditionalProof(bad)).toThrow();}
 const bad=structuredClone(proof);bad.coreHash='unverified';expect(()=>validateAdditionalProof(bad)).toThrow();
});
it('changes only the exact article Chinese alt and paragraph while preserving every other gallery byte',()=>{
 const published=readFileSync(c.gallery.path,'utf8').replace(/\r\n/g,'\n');expect(additionalHash(published)).toBe(c.gallery.beforeNormalizedSha256);const raw=published.replace(c.gallery.beforeArticle,c.gallery.afterArticle),old=beforeAdditionalGallery(raw,proof);expect(additionalHash(old)).toBe(c.gallery.beforeNormalizedSha256);expect(c.gallery.afterArticle.split(c.after.illustration.captionZh)).toHaveLength(3);expect(c.gallery.beforeArticle.split(c.before.illustration.captionZh)).toHaveLength(3);expect(c.gallery.afterArticle.replaceAll(c.after.illustration.captionZh,c.before.illustration.captionZh)).toBe(c.gallery.beforeArticle);
 for(const text of [raw+'unrecorded',raw.replace(c.after.illustration.captionZh,'unverified'),raw.replace('LV1-U08-33','LV1-U08-99'),old])expect(()=>beforeAdditionalGallery(text,proof)).toThrow();
});
it('withholds the LV1 caption from general unit and image clues while preserving the formal practice',()=>{
 expect(approvedLV1Images('additional',c.wordId)).toContainEqual(c.before);expect(approvedWordIllustration('additional',c.wordId)).toEqual(c.before.illustration);expect(getWordBeastAsset(c.wordId,'additional')).toContain(c.after.illustration.path);expect(approvedCurriculumIllustration('additional','/'+c.after.illustration.path+'?v=test')).toEqual(c.before.illustration);expect(resolveWordImageClue('additional','/'+c.after.illustration.path)?.text).toBe(c.before.illustration.captionZh);expect(approvedWordIllustration('additional','W999999')).toBeUndefined();expect(approvedCurriculumIllustration('wrong-word','/'+c.after.illustration.path)).toBeUndefined();
 const e=examples.find(r=>r.exampleId==='EXddc4d110')!;expect(e.sentenceEn).toBe('She needs additional time to finish her science project this weekend.');expect(e.sentenceZh).toBe('她這個週末需要額外的時間才能完成她的科學專題。');expect(e.sentenceEn).not.toBe(c.after.illustration.captionEn);
});
