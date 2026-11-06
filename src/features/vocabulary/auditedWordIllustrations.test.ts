import {beforeU38U41GeneralRepairs} from './lv2ImageRepairs.testSupport';
import u39Evidence from '../../../docs/unit-audit-20261105/LV2-U39-original-image-review.json';
import u30Evidence from '../../../docs/unit-audit-20261105/LV2-U30-original-image-review.json';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {expect,it} from 'vitest';
import currentCards from './auditedWordIllustrations.json';
import evidence from '../../../docs/unit-audit-20261105/LV1-U03-original-image-review.json';
import u4Evidence from '../../../docs/unit-audit-20261105/LV1-U04-original-image-review.json';
import u5Evidence from '../../../docs/unit-audit-20261105/LV1-U05-original-image-review.json';
import u6Evidence from '../../../docs/unit-audit-20261105/LV1-U06-original-image-review.json';
import u7Evidence from '../../../docs/unit-audit-20261105/LV1-U07-original-image-review.json';
import u8Evidence from '../../../docs/unit-audit-20261105/LV1-U08-original-image-review.json';
import u9Evidence from '../../../docs/unit-audit-20261105/LV1-U09-original-image-review.json';
import u10Evidence from '../../../docs/unit-audit-20261105/LV1-U10-original-image-review.json';
import u11Evidence from '../../../docs/unit-audit-20261105/LV1-U11-original-image-review.json';
import u12Evidence from '../../../docs/unit-audit-20261105/LV1-U12-original-image-review.json';
import u13Evidence from '../../../docs/unit-audit-20261105/LV1-U13-original-image-review.json';
import u14Evidence from '../../../docs/unit-audit-20261105/LV1-U14-original-image-review.json';
import u15Evidence from '../../../docs/unit-audit-20261105/LV1-U15-original-image-review.json';
import u17Evidence from '../../../docs/unit-audit-20261105/LV1-U17-original-image-review.json';
import u18Evidence from '../../../docs/unit-audit-20261105/LV1-U18-original-image-review.json';
import u20Evidence from '../../../docs/unit-audit-20261105/LV1-U20-original-image-review.json';
import preparedElevator from '../../../docs/unit-audit-20261105/LV1-U12-push-elevator-prepared.json';
import captionTranslations from '../../../docs/unit-audit-20261105/LV1-verified-caption-translations.json';
import publishedUnits from './lv1ReviewedImages.json';
import words from '../../../public/data/v1/words.json';
import {approvedCurriculumIllustration,approvedWordIllustration,approvedLV1Images,approvedCurriculumCard} from './approvedCurriculum';
import {getWordBeastAsset} from '../wordbeast/wordBeastAssets';

// Validate/reverse the newest exact layer once, then run the unchanged historical
// boundary tests (including their intentionally altered older fixtures).
const cards=beforeU38U41GeneralRepairs(currentCards);
const particularAuditRow={reviewId:'LI-LV2U30-V035',officialWordId:'W001616',aliases:['particular'],illustration:{path:'wordbeast/audited-20261105/LV2-U30-W001616-1ceb569d4c35.webp',captionEn:'Doudou picks out the particular shell with white spots.',captionZh:'豆豆挑出那個有白點的特定貝殼。'}};
const trustAuditRow={reviewId:'LI-LV2U39-V002',officialWordId:'W001933',aliases:['trust'],illustration:{path:'wordbeast/s/W001933.webp',captionEn:'The new clerk was trusted with the keys to the safe.',captionZh:'新來的店員被託付保險箱的鑰匙。'}};
function registryBeforeU39(value:typeof cards){expect(value).toHaveLength(334);expect(value.filter(c=>c.reviewId===trustAuditRow.reviewId)).toEqual([trustAuditRow]);return value.filter(c=>c.reviewId!==trustAuditRow.reviewId);}
function registryBeforeU30(current:typeof cards){
 const value=registryBeforeU39(current);
 expect(value).toHaveLength(333);
 expect(value.filter(c=>c.reviewId===particularAuditRow.reviewId)).toEqual([particularAuditRow]);
 return value.filter(c=>c.reviewId!==particularAuditRow.reviewId);
}

it('binds the explicitly reviewed general-card repairs to exact images and captions',()=>{
 const historical=registryBeforeU39(cards);
 expect(new Set(cards.map(c=>c.officialWordId)).size).toBe(334);
 expect(historical).toHaveLength(333);
 expect(historical.filter(c=>c.reviewId.startsWith('LV1-U03-'))).toHaveLength(18);
 expect(historical.filter(c=>c.reviewId.startsWith('LV1-U04-'))).toHaveLength(19);
 expect(historical.filter(c=>c.reviewId.startsWith('LV1-U05-'))).toHaveLength(4);
 expect(historical.filter(c=>c.reviewId.startsWith('LV1-U06-'))).toHaveLength(12);
 expect(historical.filter(c=>c.reviewId.startsWith('LV1-U07-'))).toHaveLength(29);
 expect(historical.filter(c=>c.reviewId.startsWith('LV1-U08-'))).toHaveLength(35);
 expect(historical.filter(c=>c.reviewId.startsWith('LV1-U09-'))).toHaveLength(18);
 expect(historical.filter(c=>c.reviewId.startsWith('LV1-U10-'))).toHaveLength(28);
 expect(historical.filter(c=>c.reviewId.startsWith('LV1-U11-'))).toHaveLength(28);
 expect(historical.filter(c=>c.reviewId.startsWith('LV1-U12-'))).toHaveLength(27);
 expect(historical.filter(c=>c.reviewId.startsWith('LV1-U13-'))).toHaveLength(34);
 expect(historical.filter(c=>c.reviewId.startsWith('LV1-U14-'))).toHaveLength(34);
 expect(historical.filter(c=>c.reviewId.startsWith('LV1-U15-'))).toHaveLength(42);
 expect(historical.filter(c=>c.reviewId==='LI-LV1U17-V027')).toHaveLength(1);
 expect(new Set(historical.map(c=>c.officialWordId)).size).toBe(333);
});

const reviewGroup=(id:string)=>id.startsWith('LI-')?id.split('-')[1]:id.split('-').slice(0,2).join('-');
it.each([...new Set(cards.map(c=>reviewGroup(c.reviewId)))])('binds every explicitly reviewed general-card repair in %s',(group)=>{
 for(const card of cards.filter(c=>reviewGroup(c.reviewId)===group)){
  const proof=[...evidence.cards,...u4Evidence.cards,...u5Evidence.cards,...u6Evidence.cards,...u7Evidence.cards,...u8Evidence.cards,...u9Evidence.cards,...u10Evidence.cards,...u11Evidence.cards,...u12Evidence.cards,...u13Evidence.cards,...u14Evidence.cards,...u15Evidence.cards,...u17Evidence.cards,...u18Evidence.cards,...u20Evidence.cards,...u30Evidence.cards,...u39Evidence.cards].find(c=>c.id===card.reviewId)!;
  expect(proof.pixelReview).toContain('actually viewed original');
  expect(proof.observation).toBeTruthy();
  expect(createHash('sha256').update(readFileSync('public/'+card.illustration.path)).digest('hex')).toBe(proof.publishedImageSha256);
  if(card.reviewId==='LV1-U08-92'){
   const change=captionTranslations.changes.find(c=>c.id==='LV1-U08-92')!;
   expect(change.previousIllustration).toMatchObject({captionEn:proof.captionEn,captionZh:proof.captionZh});
   expect(card.officialWordId).toBe('W001708');
   expect(card.illustration).toEqual({path:'wordbeast/audited-20261105/LV1-U08-92-185cf5437c0d.webp',captionEn:'She worked hard for ten years to realize her dream of opening a bakery.',captionZh:'為了實現開一家麵包店的夢想，她努力了十年。'});
   expect(change.currentIllustration).toEqual(card.illustration);expect(change.englishAndImageUnchanged).toBe(true);
  }else expect(card.illustration).toMatchObject({captionEn:proof.captionEn,captionZh:proof.captionZh});
  const word=words.find(w=>w.wordId===card.officialWordId)!;
  expect(word).toBeDefined();
  expect(approvedWordIllustration(word.word,word.wordId)).toEqual(card.illustration);
  expect(getWordBeastAsset(word.wordId,word.word)).toContain(card.illustration.path);
  expect(approvedWordIllustration(word.word,'W999999')).toBeUndefined();
  expect(approvedCurriculumIllustration(word.word,'/'+card.illustration.path+'?v=test')).toEqual(card.illustration);
  expect(approvedCurriculumIllustration('wrong-word','/'+card.illustration.path)).toBeUndefined();
 }
});

it('uses an exact audited general-card repair while retaining original unit-specific paths and other defaults',()=>{
 const repaired=cards.find(c=>c.reviewId==='LV1-U07-83')!;
 const original=publishedUnits.find(c=>c.id==='LV1-U10-76')!;
 expect(approvedWordIllustration('mind',repaired.officialWordId)).toEqual(repaired.illustration);
 expect(approvedLV1Images('mind',repaired.officialWordId)).toContainEqual(original);
 expect(approvedCurriculumIllustration('mind','/'+original.illustration.path)).toEqual(original.illustration);
 for(const c of publishedUnits){
  if(!c.officialWordId||cards.some(a=>a.officialWordId===c.officialWordId))continue;
  const expected=approvedCurriculumCard(c.aliases[0],c.officialWordId)?.illustration??approvedLV1Images(c.aliases[0],c.officialWordId)[0]?.illustration;
  expect(approvedWordIllustration(c.aliases[0],c.officialWordId)).toEqual(expected);
 }
});

it('keeps the twenty-four unpublished curriculum drafts out of the published unit manifest',()=>{
 expect(publishedUnits).toHaveLength(726);
 expect(publishedUnits.filter(c=>c.unit===3)).toHaveLength(22);
 expect(publishedUnits.filter(c=>c.unit===4)).toHaveLength(5);
 expect(publishedUnits.filter(c=>c.unit===5)).toHaveLength(13);
 expect(publishedUnits.filter(c=>c.unit===6)).toHaveLength(23);
 expect(publishedUnits.filter(c=>c.unit===7)).toHaveLength(37);
 expect(publishedUnits.filter(c=>c.unit===8)).toHaveLength(22);
 expect(publishedUnits.filter(c=>c.unit===9)).toHaveLength(51);
 expect(publishedUnits.filter(c=>c.unit===10)).toHaveLength(35);
 for(const draft of evidence.cards)expect(publishedUnits.some(c=>c.id===draft.id)).toBe(false);
 for(const draft of u4Evidence.cards.filter(c=>!c.sourceUnitPublished))expect(publishedUnits.some(c=>c.id===draft.id)).toBe(false);
 for(const draft of u5Evidence.cards.filter(c=>!c.sourceUnitPublished))expect(publishedUnits.some(c=>c.id===draft.id)).toBe(false);
 for(const draft of u6Evidence.cards.filter(c=>!c.sourceUnitPublished))expect(publishedUnits.some(c=>c.id===draft.id)).toBe(false);
 for(const draft of u7Evidence.cards.filter(c=>!c.sourceUnitPublished))expect(publishedUnits.some(c=>c.id===draft.id)).toBe(false);
 for(const draft of u8Evidence.cards.filter(c=>!c.sourceUnitPublished))expect(publishedUnits.some(c=>c.id===draft.id)).toBe(false);
 for(const draft of u9Evidence.cards.filter(c=>!c.sourceUnitPublished))expect(publishedUnits.some(c=>c.id===draft.id)).toBe(false);
 for(const draft of u10Evidence.cards.filter(c=>!c.sourceUnitPublished))expect(publishedUnits.some(c=>c.id===draft.id)).toBe(false);
 for(const draft of u11Evidence.cards.filter(c=>!c.sourceUnitPublished))expect(publishedUnits.some(c=>c.id===draft.id)).toBe(false);
 for(const draft of u12Evidence.cards.filter(c=>!c.sourceUnitPublished))expect(publishedUnits.some(c=>c.id===draft.id)).toBe(false);
 for(const draft of u13Evidence.cards.filter(c=>!c.sourceUnitPublished))expect(publishedUnits.some(c=>c.id===draft.id)).toBe(false);
 for(const draft of u14Evidence.cards.filter(c=>!c.sourceUnitPublished))expect(publishedUnits.some(c=>c.id===draft.id)).toBe(false);
 expect(publishedUnits.filter(c=>c.unit===14)).toHaveLength(23);
 expect(publishedUnits.filter(c=>c.unit===13)).toHaveLength(15);
 expect(cards.some(c=>c.reviewId==='LV1-U13-53')).toBe(false);
 expect(u13Evidence.cards.find(c=>c.id==='LV1-U13-53')?.generalCardIntegration).toBe('exact_existing_example_artwork_saved_and_general_card_reopened');
});

it('binds the wooden-door image only to the unchanged heavy-door example and retains the elevator source issue',()=>{
 const repaired=cards.find(c=>c.reviewId==='LV1-U12-31')!;
 const proof=u12Evidence.cards.find(c=>c.id===repaired.reviewId)!;
 expect(repaired.officialWordId).toBe('W000684');
 expect(repaired.illustration.captionEn).toBe('The little boy had to push the heavy door with all his strength to open it.');
 expect(repaired.illustration.captionZh).toBe('這個小男孩必須用盡全力推開那扇沉重的門。');
 expect(proof.sourceCaptionEn).toBe('Just push the button and the elevator door will open.');
 expect(proof.originalPairState).toBe('original_caption_mismatch_pending');
 expect(publishedUnits.some(c=>c.id===proof.id)).toBe(false);
 expect(approvedWordIllustration('push',repaired.officialWordId)).toEqual(repaired.illustration);
});

it('keeps the prepared elevator replacement outside published unit cards and the general wooden-door pair',()=>{
 expect(preparedElevator.id).toBe('LV1-U12-31');
 expect(preparedElevator.sourceUnitPublished).toBe(false);
 expect(preparedElevator.state).toBe('replacement_asset_prepared_and_pixels_viewed_not_integrated_into_reopenable_source_card');
 expect(preparedElevator.captionEn).toBe('Just push the button and the elevator door will open.');
 expect(preparedElevator.captionZh).toBe('只要按下按鈕，電梯門就會打開。');
 expect(createHash('sha256').update(readFileSync(preparedElevator.preparedReplacement.path)).digest('hex')).toBe('381392f19334f356505f5a8004596772026c244852a5af7e4ff1995a760a156a');
 expect(publishedUnits.some(c=>c.id===preparedElevator.id)).toBe(false);
 expect(approvedWordIllustration('push','W000684')).toEqual({
  path:'wordbeast/audited-20261105/LV1-U12-31-c3edbd6fdbf4.webp',
  captionEn:'The little boy had to push the heavy door with all his strength to open it.',
  captionZh:'這個小男孩必須用盡全力推開那扇沉重的門。',
 });
 expect(approvedCurriculumIllustration('push','/'+preparedElevator.preparedReplacement.path.replace(/^public\//,''))).toBeUndefined();
});

it('pairs the retained fat cat bytes with their own caption and preserves the puppy example',()=>{
 const pair=approvedWordIllustration('fat','W000299')!;
 expect(pair).toEqual({path:'wordbeast/lv1/W000299.png',captionEn:'The cat is fat and lies comfortably on a cushion.',captionZh:'這隻貓很胖，舒服地躺在墊子上。'});
 expect(approvedCurriculumIllustration('fat','/wordbeast/lv1/W000299.png?v=test')).toEqual(pair);
 expect(approvedCurriculumIllustration('wrong-word','/wordbeast/lv1/W000299.png')).toBeUndefined();
 const examples=JSON.parse(readFileSync('public/data/v1/examples.json','utf8'));
 expect(examples.find((e:{exampleId:string})=>e.exampleId==='EX845bc672')).toMatchObject({sentenceEn:'The puppy grew fat after eating too many treats.',sentenceZh:'這隻小狗因為吃太多零食而變胖了。',blankSentence:'The puppy grew _____ after eating too many treats.',answer:'fat',sensePos:'adj.'});
 expect(publishedUnits.some(c=>c.id==='LI-LV1U17-V027')).toBe(false);
});

it('pairs the retained crown bytes with their own caption and preserves the phone example',()=>{
 const pair=approvedWordIllustration('expensive','W000283')!;
 expect(pair).toEqual({path:'wordbeast/lv1/W000283.png',captionEn:'This crown costs a lot of money and is very expensive.',captionZh:'這頂皇冠要很多錢，非常昂貴。'});
 expect(approvedCurriculumIllustration('expensive','/wordbeast/lv1/W000283.png?v=test')).toEqual(pair);
 expect(approvedCurriculumIllustration('wrong-word','/wordbeast/lv1/W000283.png')).toBeUndefined();
 const examples=JSON.parse(readFileSync('public/data/v1/examples.json','utf8'));
 expect(examples.find((e:{exampleId:string})=>e.exampleId==='EX7c7366a9')).toMatchObject({sentenceEn:'This phone is too expensive for me.',sentenceZh:'這支手機對我來說太貴了。',blankSentence:'This phone is too _____ for me.',answer:'expensive',sensePos:'adj.'});
 expect(createHash('sha256').update(JSON.stringify(registryBeforeU30(cards).filter(c=>!['LI-LV1U18-V045','LI-LV1U20-V065','LI-LV1U20-V073'].includes(c.reviewId)))).digest('hex')).toBe(u18Evidence.previousRegistryHash);
 expect(publishedUnits.some(c=>c.id==='LI-LV1U18-V045')).toBe(false);
});

it('pairs the unchanged U20 fly and blueberry images with their own captions while retaining all previous pairs',()=>{
 expect(createHash('sha256').update(JSON.stringify(registryBeforeU30(cards).filter(c=>!['LI-LV1U20-V065','LI-LV1U20-V073'].includes(c.reviewId)))).digest('hex')).toBe(u20Evidence.previousRegistryHash);
 const examples=JSON.parse(readFileSync('public/data/v1/examples.json','utf8'));
 for(const proof of u20Evidence.cards){const pair=approvedWordIllustration(proof.word,proof.officialWordId)!;expect(pair).toMatchObject({captionEn:proof.captionEn,captionZh:proof.captionZh});expect(approvedCurriculumIllustration(proof.word,'/'+pair.path+'?v=test')).toEqual(pair);expect(approvedCurriculumIllustration('wrong-word','/'+pair.path)).toBeUndefined();expect(publishedUnits.some(c=>c.id===proof.id)).toBe(false);}
 expect(examples.find((e:{exampleId:string})=>e.exampleId==='EXe12abfed')).toMatchObject({sentenceEn:'The noise from the construction site really bothers me every morning.',sentenceZh:'每天早上工地傳來的噪音都讓我很煩。',blankSentence:'The noise from the construction site really _____ me every morning.',answer:'bothers'});
 expect(examples.find((e:{exampleId:string})=>e.exampleId==='EX0fecd40b')).toMatchObject({sentenceEn:'This restaurant serves the most delicious noodles in town.',sentenceZh:'這家餐廳供應鎮上最美味的麵。',blankSentence:'This restaurant serves the most _____ noodles in town.',answer:'delicious'});
});

it('changes only the exact particular general pair and retains all332 previous audited pairs',()=>{
 const added=cards.find(c=>c.reviewId==='LI-LV2U30-V035')!;
 expect(added).toEqual(particularAuditRow);
 expect(createHash('sha256').update(JSON.stringify(registryBeforeU30(cards))).digest('hex')).toBe('5bed66e484106d29474ba2da5704276c856b7af27cff72cb28c2e363f85efd70');
 expect(createHash('sha256').update(readFileSync('public/wordbeast/s/W001616.webp')).digest('hex')).toBe('c55ca3324db35925d9f74202b922acb9e391050aac34ed92ded81bd35af8a7b0');
 expect(publishedUnits.some(c=>c.officialWordId==='W001616')).toBe(false);
 expect(approvedWordIllustration('particular','W001616')).toEqual(added.illustration);
 expect(approvedWordIllustration('particular','W999999')).toBeUndefined();
 expect(approvedCurriculumIllustration('wrong-word','/'+added.illustration.path)).toBeUndefined();
});

it('rejects altered U30 pairs before reconstructing the immutable earlier registry',()=>{
 for(const field of ['reviewId','officialWordId']){const bad=structuredClone(cards);(bad.find(c=>c.reviewId===particularAuditRow.reviewId)! as Record<string,unknown>)[field]='invented';expect(()=>registryBeforeU30(bad)).toThrow();}
 for(const field of ['path','captionEn','captionZh']){const bad=structuredClone(cards);(bad.find(c=>c.reviewId===particularAuditRow.reviewId)!.illustration as Record<string,unknown>)[field]='unverified';expect(()=>registryBeforeU30(bad)).toThrow();}
 const extra=structuredClone(cards);(extra.find(c=>c.reviewId===particularAuditRow.reviewId)! as Record<string,unknown>).unrecorded='unverified';expect(()=>registryBeforeU30(extra)).toThrow();
 expect(()=>registryBeforeU30(cards.filter(c=>c.reviewId!==particularAuditRow.reviewId))).toThrow();
 const previous=structuredClone(cards);previous[0].illustration.captionEn='unrecorded';expect(createHash('sha256').update(JSON.stringify(registryBeforeU30(previous))).digest('hex')).not.toBe('5bed66e484106d29474ba2da5704276c856b7af27cff72cb28c2e363f85efd70');
});

it('binds only trust’s retained keys image and independent exercise without publishing a U39 image',()=>{expect(createHash('sha256').update(JSON.stringify(registryBeforeU39(cards))).digest('hex')).toBe(u39Evidence.priorAuditedCardsSha256);const pair=approvedWordIllustration('trust','W001933')!;expect(pair).toEqual(trustAuditRow.illustration);expect(approvedWordIllustration('trust','W999999')).toBeUndefined();expect(approvedCurriculumIllustration('wrong-word','/'+pair.path)).toBeUndefined();expect(approvedCurriculumIllustration('trust','/'+pair.path+'?v=test')).toEqual(pair);expect(getWordBeastAsset('W001933','trust')).toContain(pair.path);expect(publishedUnits.some(c=>c.officialWordId==='W001933')).toBe(false);expect(createHash('sha256').update(readFileSync('public/'+pair.path)).digest('hex')).toBe(u39Evidence.cards[0].publishedImageSha256);});
it('rejects any altered U39 pair or other historical pair before restoring the333-row registry',()=>{for(const field of ['reviewId','officialWordId','aliases']){const bad=structuredClone(cards);(bad.find(c=>c.reviewId===trustAuditRow.reviewId)! as Record<string,unknown>)[field]='invented';expect(()=>registryBeforeU39(bad)).toThrow();}for(const field of ['path','captionEn','captionZh']){const bad=structuredClone(cards);(bad.find(c=>c.reviewId===trustAuditRow.reviewId)!.illustration as Record<string,unknown>)[field]='invented';expect(()=>registryBeforeU39(bad)).toThrow();}const extra=structuredClone(cards);(extra.find(c=>c.reviewId===trustAuditRow.reviewId)! as Record<string,unknown>).unrecorded='x';expect(()=>registryBeforeU39(extra)).toThrow();const old=structuredClone(cards);old[0].illustration.captionZh='invented';expect(createHash('sha256').update(JSON.stringify(registryBeforeU39(old))).digest('hex')).not.toBe(u39Evidence.priorAuditedCardsSha256);expect(()=>registryBeforeU39(cards.filter(c=>c.reviewId!==trustAuditRow.reviewId))).toThrow();});
