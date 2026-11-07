import {beforePuppetText,beforePuppetImages} from './lv3PuppetImageRepair.testSupport';
import {lv3AfterUnitPublishedText} from '../direct/lv3Audit.testSupport';
import {expect,it} from 'vitest';
import {readFileSync,readdirSync} from 'node:fs';
import {beforeLV3ConfirmText,validateLV3ConfirmProof,validateLV3ConfirmAsset,confirmBytesHash} from '../../../scripts/lv3_confirm_image_guard.mjs';
import {beforeLV3ReplaceText} from '../../../scripts/lv3_replace_image_guard.mjs';
import {beforeLV3GeneralImages,lv3ImageHash} from '../../../scripts/lv3_image_repair_guard.mjs';
import proof from '../../../docs/unit-audit-20261105/LV3-confirm-image-repair.json';
import replaceProof from '../../../docs/unit-audit-20261105/LV3-replace-image-repair.json';
import previousProof from '../../../docs/unit-audit-20261105/LV3-bank-permissible-image-repairs.json';
import published from './auditedWordIllustrations.json';
const current=beforePuppetImages(published);
import captions from '../wordbeast/illustrationCaptions.json';
import media from '../../../public/data/v1/media.json';
import {approvedWordIllustration,approvedCurriculumIllustration,approvedCurriculumCard} from './approvedCurriculum';
import {getWordBeastAsset} from '../wordbeast/wordBeastAssets';
import {resolveWordImageClue} from '../../quiz/imageClue';
const raw=()=>beforePuppetText(readFileSync(proof.registryPath,'utf8'));
it('validates exact raw bytes before reversing only confirm and preserves all historical inverse hashes',()=>{
 const text=raw(),beforeText=beforeLV3ConfirmText(text,proof),before=JSON.parse(beforeText);
 expect(before).toEqual(proof.before);expect(current).toEqual(proof.after);expect(current.slice(0,-1)).toEqual(before);
 expect(beforeLV3ConfirmText(text.replace(/\n/g,'\r\n'),proof)).toBe(beforeText);
 expect(confirmBytesHash(beforeText)).toBe(replaceProof.afterLfSha256);
 expect(lv3ImageHash(beforeLV3GeneralImages(JSON.parse(beforeLV3ReplaceText(beforeText,replaceProof)),previousProof))).toBe('d9905ded7a45f66015643b401ad1b57d6e8dcb44142218cf131710e99a91dc6a');
 expect(current.filter(r=>r.officialWordId==='W002185')).toEqual([proof.row]);
 const unrelated=structuredClone(current);unrelated[0].illustration.captionEn='unrecorded';
 const propertyOrder=structuredClone(current);propertyOrder[0]=Object.fromEntries(Object.entries(propertyOrder[0]).reverse()) as typeof propertyOrder[number];
 for(const changed of [text+' ',text+'\n',text.replace('  {',' {'),text.replace('"reviewId":','"reviewId":"duplicate","reviewId":'),JSON.stringify([...current].reverse(),null,2)+'\n',JSON.stringify([...current,current[0]],null,2)+'\n',JSON.stringify(unrelated,null,2)+'\n',JSON.stringify(propertyOrder,null,2)+'\n',beforeText])expect(()=>beforeLV3ConfirmText(changed,proof)).toThrow(/raw-byte drift/);
 for(const field of ['reviewId','officialWordId','aliases']){const bad=structuredClone(current);(bad.at(-1)! as Record<string,unknown>)[field]='unverified';expect(()=>beforeLV3ConfirmText(JSON.stringify(bad,null,2)+'\n',proof)).toThrow();}
 for(const field of ['path','captionEn','captionZh']){const bad=structuredClone(current);(bad.at(-1)!.illustration as Record<string,unknown>)[field]='unverified';expect(()=>beforeLV3ConfirmText(JSON.stringify(bad,null,2)+'\n',proof)).toThrow();}
});
it('pins proof, source and candidate assets, original captions/media and historical proofs and guards',()=>{
 validateLV3ConfirmProof(proof);
 for(const key of Object.keys(proof)){const bad=structuredClone(proof) as Record<string,unknown>;bad[key]='unverified';expect(()=>validateLV3ConfirmProof(bad)).toThrow();}
 for(const asset of proof.assets){const bytes=readFileSync(asset.path);validateLV3ConfirmAsset(bytes,asset);const bad=Buffer.from(bytes);bad[bad.length-1]^=1;expect(()=>validateLV3ConfirmAsset(bad,asset)).toThrow(/asset drift/);expect(bytes.subarray(0,4).toString()).toBe('RIFF');expect(bytes.subarray(8,12).toString()).toBe('WEBP');}
 expect(readFileSync(proof.assets[1].path)).toHaveLength(57484);
 // The confirm proof predates U05 text edits. Authenticate and reverse only
 // the recorded examples delta; keep every original proof hash unchanged.
 for(const file of proof.unchangedFiles){
  const currentText=readFileSync(file.path,'utf8').replace(/\r\n/g,'\n');
  const text=file.path==='public/data/v1/examples.json'
   ?lv3AfterUnitPublishedText('LV3-U04',file.path,currentText):currentText;
  expect(confirmBytesHash(text),file.path).toBe(file.lfSha256);
  if(file.path==='public/data/v1/examples.json')
   expect(()=>lv3AfterUnitPublishedText('LV3-U04',file.path,currentText+' ')).toThrow(/drift/);
 }
 expect(confirmBytesHash(JSON.stringify(JSON.parse(readFileSync(proof.candidateManifestPath,'utf8'))))).toBe(proof.candidateManifestHash);
 expect(captions.filter(c=>c.word==='confirm'&&c.captionZh===proof.row.illustration.captionZh)).toEqual([proof.captionSource]);
 expect(media).toContainEqual(proof.media);expect(proof.review.manualUserApproved).toBe(false);expect(proof.review.publicationReady).toBe(false);
});
it('resolves exact general card, gallery and clue while leaving all four textbook references unbound',()=>{
 const row=proof.row,pair=row.illustration;
 expect(approvedWordIllustration('confirm',row.officialWordId)).toEqual(pair);
 expect(getWordBeastAsset(row.officialWordId,'confirm')).toContain(pair.path+'?v=');
 expect(approvedCurriculumIllustration('confirm','/'+pair.path+'?v=test')).toEqual(pair);
 expect(resolveWordImageClue('confirm','/'+pair.path,'unrelated caption','unrelated practice')?.text).toBe(pair.captionZh);
 expect(approvedWordIllustration('confirm','W999999')).toBeUndefined();
 expect(approvedWordIllustration('wrong-word',row.officialWordId)).toBeUndefined();
 expect(approvedCurriculumIllustration('wrong-word','/'+pair.path)).toBeUndefined();
 expect(approvedCurriculumIllustration('confirm','/wordbeast/unrelated.webp')).toBeUndefined();
 expect(approvedCurriculumCard('confirm',row.officialWordId)).toBeUndefined();
 const folder='src/features/direct';
 const matches:Record<string,unknown>[]=[];
 for(const file of readdirSync(folder).filter(p=>/^(curriculum.*|liveabcBasic)\.json$/.test(p))){const unit=JSON.parse(readFileSync(folder+'/'+file,'utf8'));const items=Array.isArray(unit)?unit.flatMap(u=>u.items??[]):unit.learningItems??[];for(const item of items)if(proof.textbookReferences.includes(item.learningItemId))matches.push(item);}
 expect(matches.map(r=>r.learningItemId).sort()).toEqual([...proof.textbookReferences].sort());
 for(const item of matches){expect(item).not.toHaveProperty('illustration');expect(item).not.toHaveProperty('originalExample');}
});
