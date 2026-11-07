import {loadLV3Chain,lv3AfterUnitPublishedText} from '../direct/lv3Audit.testSupport';
import {expect,it} from 'vitest';
import {readFileSync,readdirSync} from 'node:fs';
import {beforeLV3PuppetText,validateLV3PuppetProof,validateLV3PuppetAsset,puppetBytesHash} from '../../../scripts/lv3_puppet_image_guard.mjs';
import {beforeLV3ReplaceText} from '../../../scripts/lv3_replace_image_guard.mjs';
import {beforeLV3GeneralImages,lv3ImageHash} from '../../../scripts/lv3_image_repair_guard.mjs';
import proof from '../../../docs/unit-audit-20261105/LV3-puppet-image-repair.json';
import replaceProof from '../../../docs/unit-audit-20261105/LV3-replace-image-repair.json';
import {beforeLV3ConfirmText} from '../../../scripts/lv3_confirm_image_guard.mjs';
import confirmProof from '../../../docs/unit-audit-20261105/LV3-confirm-image-repair.json';
import previousProof from '../../../docs/unit-audit-20261105/LV3-bank-permissible-image-repairs.json';
import current from './auditedWordIllustrations.json';
import captions from '../wordbeast/illustrationCaptions.json';
import media from '../../../public/data/v1/media.json';
import {approvedWordIllustration,approvedCurriculumIllustration,approvedCurriculumCard} from './approvedCurriculum';
import {getWordBeastAsset} from '../wordbeast/wordBeastAssets';
import {resolveWordImageClue} from '../../quiz/imageClue';
const raw=()=>readFileSync(proof.registryPath,'utf8').replace(/\r\n/g,'\n');
it('validates exact raw bytes before reversing only puppet and preserves all historical inverse hashes',()=>{
 const text=raw(),beforeText=beforeLV3PuppetText(text,proof),before=JSON.parse(beforeText);
 expect(before).toEqual(proof.before);expect(current).toEqual(proof.after);expect(current.slice(0,-1)).toEqual(before);
 expect(beforeLV3PuppetText(text.replace(/\n/g,'\r\n'),proof)).toBe(beforeText);
 expect(puppetBytesHash(beforeText)).toBe(confirmProof.afterLfSha256);
 expect(lv3ImageHash(beforeLV3GeneralImages(JSON.parse(beforeLV3ReplaceText(beforeLV3ConfirmText(beforeText,confirmProof),replaceProof)),previousProof))).toBe('d9905ded7a45f66015643b401ad1b57d6e8dcb44142218cf131710e99a91dc6a');
 expect(current.filter(r=>r.officialWordId==='W002690')).toEqual([proof.row]);
 const unrelated=structuredClone(current);unrelated[0].illustration.captionEn='unrecorded';
 const propertyOrder=structuredClone(current);propertyOrder[0]=Object.fromEntries(Object.entries(propertyOrder[0]).reverse()) as typeof propertyOrder[number];
 for(const changed of [text+' ',text+'\n',text.replace('  {',' {'),text.replace('"reviewId":','"reviewId":"duplicate","reviewId":'),JSON.stringify([...current].reverse(),null,2)+'\n',JSON.stringify([...current,current[0]],null,2)+'\n',JSON.stringify(unrelated,null,2)+'\n',JSON.stringify(propertyOrder,null,2)+'\n',beforeText])expect(()=>beforeLV3PuppetText(changed,proof)).toThrow(/raw-byte drift/);
 for(const field of ['reviewId','officialWordId','aliases']){const bad=structuredClone(current);(bad.at(-1)! as Record<string,unknown>)[field]='unverified';expect(()=>beforeLV3PuppetText(JSON.stringify(bad,null,2)+'\n',proof)).toThrow();}
 for(const field of ['path','captionEn','captionZh']){const bad=structuredClone(current);(bad.at(-1)!.illustration as Record<string,unknown>)[field]='unverified';expect(()=>beforeLV3PuppetText(JSON.stringify(bad,null,2)+'\n',proof)).toThrow();}
});
it('pins proof, source and candidate assets, original captions/media and historical proofs and guards',()=>{
 validateLV3PuppetProof(proof);
 for(const key of Object.keys(proof)){const bad=structuredClone(proof) as Record<string,unknown>;bad[key]='unverified';expect(()=>validateLV3PuppetProof(bad)).toThrow();}
 for(const asset of proof.assets){const bytes=readFileSync(asset.path);validateLV3PuppetAsset(bytes,asset);const bad=Buffer.from(bytes);bad[bad.length-1]^=1;expect(()=>validateLV3PuppetAsset(bad,asset)).toThrow(/asset drift/);expect(bytes.subarray(0,4).toString()).toBe('RIFF');expect(bytes.subarray(8,12).toString()).toBe('WEBP');}
 expect(readFileSync(proof.assets[1].path)).toHaveLength(653992);
 // Authenticate the exact migration domain; only these six files follow later text audits.
 const migration=loadLV3Chain().find(step=>'migrationId' in step.manifest)?.manifest;
 if(!migration||!('beforeInputs' in migration))throw new Error('Missing authenticated migration input domain');
 const domain=new Set(Object.keys(migration.beforeInputs));expect(domain.size).toBe(144);
 const projected=['public/data/v1/words.json','public/data/v1/examples.json','public/data/v1/senses.json','public/data/v1/media.json','public/data/v1/sa-pack.json','src/features/direct/curriculumLV3Unit6.json'];
 const independent=['src/features/wordbeast/illustrationCaptions.json','docs/unit-audit-20261105/LV3-confirm-image-repair.json','docs/unit-audit-20261105/LV3-replace-image-repair.json','docs/unit-audit-20261105/LV3-bank-permissible-image-repairs.json','scripts/lv3_confirm_image_guard.mjs','scripts/lv3_replace_image_guard.mjs','scripts/lv3_image_repair_guard.mjs'];
 expect(proof.unchangedFiles.filter(f=>domain.has(f.path)).map(f=>f.path).sort()).toEqual([...projected].sort());
 expect(proof.unchangedFiles.filter(f=>!domain.has(f.path)).map(f=>f.path).sort()).toEqual([...independent].sort());
 expect(proof.unchangedFiles).toHaveLength(13);
 for(const file of proof.unchangedFiles){
  const currentText=readFileSync(file.path,'utf8').replace(/\r\n/g,'\n');
  const text=projected.includes(file.path)
   ?lv3AfterUnitPublishedText('starter-media-actual-names-v1',file.path,currentText):currentText;
  expect(puppetBytesHash(text),file.path).toBe(file.lfSha256);
  if(projected.includes(file.path))
   expect(()=>lv3AfterUnitPublishedText('starter-media-actual-names-v1',file.path,currentText+' ')).toThrow(/drift/);
  else expect(puppetBytesHash(currentText+' ')).not.toBe(file.lfSha256);
 }

 expect(puppetBytesHash(JSON.stringify(JSON.parse(readFileSync(proof.candidateManifestPath,'utf8'))))).toBe(proof.candidateManifestHash);
 expect(captions.filter(c=>c.word==='puppet'&&c.captionZh===proof.row.illustration.captionZh)).toEqual([proof.captionSource]);
 expect(media).toContainEqual(proof.media);expect(proof.review.manualUserApproved).toBe(false);expect(proof.review.publicationReady).toBe(false);
});
it('resolves exact general card, gallery and clue while leaving the read-only textbook reference unbound',()=>{
 const row=proof.row,pair=row.illustration;
 expect(approvedWordIllustration('puppet',row.officialWordId)).toEqual(pair);
 expect(getWordBeastAsset(row.officialWordId,'puppet')).toContain(pair.path+'?v=');
 expect(approvedCurriculumIllustration('puppet','/'+pair.path+'?v=test')).toEqual(pair);
 expect(resolveWordImageClue('puppet','/'+pair.path,'unrelated caption','unrelated practice')?.text).toBe(pair.captionZh);
 expect(approvedWordIllustration('puppet','W999999')).toBeUndefined();
 expect(approvedWordIllustration('wrong-word',row.officialWordId)).toBeUndefined();
 expect(approvedCurriculumIllustration('wrong-word','/'+pair.path)).toBeUndefined();
 expect(approvedCurriculumIllustration('puppet','/wordbeast/unrelated.webp')).toBeUndefined();
 expect(approvedCurriculumCard('puppet',row.officialWordId)).toBeUndefined();
 const folder='src/features/direct';
 const matches:Record<string,unknown>[]=[];
 for(const file of readdirSync(folder).filter(p=>/^(curriculum.*|liveabcBasic)\.json$/.test(p))){const unit=JSON.parse(readFileSync(folder+'/'+file,'utf8'));const items=Array.isArray(unit)?unit.flatMap(u=>u.items??[]):unit.learningItems??[];for(const item of items)if(proof.textbookReferences.includes(item.learningItemId))matches.push(item);}
 expect(matches.map(r=>r.learningItemId).sort()).toEqual([...proof.textbookReferences].sort());
 for(const item of matches){expect(item).not.toHaveProperty('illustration');expect(item).not.toHaveProperty('originalExample');expect(item.practiceMode).toBe('read_only');expect(item.review).toBe('source_checked_text_only');}
});
