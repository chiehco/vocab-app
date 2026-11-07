import {expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {beforeLV3ReplaceText,validateLV3ReplaceProof,validateLV3ReplaceAsset,replaceBytesHash} from '../../../scripts/lv3_replace_image_guard.mjs';
import {beforeLV3GeneralImages,lv3ImageHash} from '../../../scripts/lv3_image_repair_guard.mjs';
import proof from '../../../docs/unit-audit-20261105/LV3-replace-image-repair.json';
import previousProof from '../../../docs/unit-audit-20261105/LV3-bank-permissible-image-repairs.json';
import current from './auditedWordIllustrations.json';
import captions from '../wordbeast/illustrationCaptions.json';
import examples from '../../../public/data/v1/examples.json';
import media from '../../../public/data/v1/media.json';
import unit from '../direct/curriculumLV3Unit4.json';
import {approvedWordIllustration,approvedCurriculumIllustration,approvedCurriculumCard} from './approvedCurriculum';
import {getWordBeastAsset} from '../wordbeast/wordBeastAssets';
import {resolveWordImageClue} from '../../quiz/imageClue';
const raw=()=>readFileSync(proof.registryPath,'utf8').replace(/\r\n/g,'\n');
it('strictly validates complete current raw bytes before reversing only the appended replace mapping',()=>{
 const text=raw(),beforeText=beforeLV3ReplaceText(text,proof),before=JSON.parse(beforeText);
 expect(before).toEqual(proof.before);expect(current).toEqual(proof.after);expect(current.slice(0,-1)).toEqual(before);
 expect(beforeLV3ReplaceText(text.replace(/\n/g,'\r\n'),proof)).toBe(beforeText);
 expect(lv3ImageHash(beforeLV3GeneralImages(before,previousProof))).toBe('d9905ded7a45f66015643b401ad1b57d6e8dcb44142218cf131710e99a91dc6a');
 expect(current.filter(r=>r.officialWordId==='W002723')).toEqual([proof.row]);
 const unrelated=structuredClone(current);unrelated[0].illustration.captionEn='unrecorded';
 const propertyOrder=structuredClone(current);propertyOrder[0]=Object.fromEntries(Object.entries(propertyOrder[0]).reverse()) as typeof propertyOrder[number];
 for(const changed of [text+' ',text+'\n',text.replace('  {',' {'),text.replace('"reviewId":','"reviewId":"duplicate","reviewId":'),JSON.stringify([...current].reverse(),null,2)+'\n',JSON.stringify([...current,current[0]],null,2)+'\n',JSON.stringify(unrelated,null,2)+'\n',JSON.stringify(propertyOrder,null,2)+'\n',beforeText])expect(()=>beforeLV3ReplaceText(changed,proof)).toThrow(/raw-byte drift/);
 for(const field of ['reviewId','officialWordId','aliases']){const bad=structuredClone(current);(bad.at(-1)! as Record<string,unknown>)[field]='unverified';expect(()=>beforeLV3ReplaceText(JSON.stringify(bad,null,2)+'\n',proof)).toThrow();}
 for(const field of ['path','captionEn','captionZh']){const bad=structuredClone(current);(bad.at(-1)!.illustration as Record<string,unknown>)[field]='unverified';expect(()=>beforeLV3ReplaceText(JSON.stringify(bad,null,2)+'\n',proof)).toThrow();}
});
it('pins immutable proof, original/new assets and independent caption media and formal example evidence',()=>{
 validateLV3ReplaceProof(proof);
 for(const key of Object.keys(proof)){const bad=structuredClone(proof) as Record<string,unknown>;bad[key]='unverified';expect(()=>validateLV3ReplaceProof(bad)).toThrow();}
 for(const asset of proof.assets){const bytes=readFileSync(asset.path);validateLV3ReplaceAsset(bytes,asset);const bad=Buffer.from(bytes);bad[bad.length-1]^=1;expect(()=>validateLV3ReplaceAsset(bad,asset)).toThrow(/asset drift/);expect(bytes.subarray(0,4).toString()).toBe('RIFF');expect(bytes.subarray(8,12).toString()).toBe('WEBP');}
 for(const file of proof.unchangedFiles)expect(replaceBytesHash(readFileSync(file.path,'utf8').replace(/\r\n/g,'\n')),file.path).toBe(file.lfSha256);
 expect(captions.find(c=>c.word==='replace')).toEqual(proof.captionSource);
 expect(examples.find(e=>e.exampleId==='EX5074b26d')).toEqual(proof.formalExample);
 expect(media).toContainEqual(proof.media);
 expect(proof.formalExample.sentenceEn).not.toBe(proof.row.illustration.captionEn);
 expect(proof.review.manualUserApproved).toBe(false);expect(proof.review.publicationReady).toBe(false);
});
it('resolves exact general card gallery and image clue without binding U04 textbook items',()=>{
 const row=proof.row,pair=row.illustration;
 expect(approvedWordIllustration('replace',row.officialWordId)).toEqual(pair);
 expect(getWordBeastAsset(row.officialWordId,'replace')).toContain(pair.path+'?v=');
 expect(approvedCurriculumIllustration('replace','/'+pair.path+'?v=test')).toEqual(pair);
 expect(resolveWordImageClue('replace','/'+pair.path,'unrelated bulb caption','unrelated practice')?.text).toBe(pair.captionZh);
 expect(approvedWordIllustration('replace','W999999')).toBeUndefined();
 expect(approvedWordIllustration('wrong-word',row.officialWordId)).toBeUndefined();
 expect(approvedCurriculumIllustration('wrong-word','/'+pair.path)).toBeUndefined();
 expect(approvedCurriculumIllustration('replace','/wordbeast/unrelated.webp')).toBeUndefined();
 expect(approvedCurriculumCard('replace',row.officialWordId)).toBeUndefined();
 expect(unit.template.deliveryMode).toBe('text_only');expect(unit.learningItems).toHaveLength(183);
 const vocabulary=unit.learningItems.filter(r=>r.kind==='vocabulary');expect(vocabulary).toHaveLength(122);
 for(const item of unit.learningItems){expect(item.practiceMode).toBe('read_only');expect(item).not.toHaveProperty('illustration');expect(item).not.toHaveProperty('originalExample');}
});
