import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {expect,it} from 'vitest';
import cards from './auditedWordIllustrations.json';
import evidence from '../../../docs/unit-audit-20261105/LV1-U03-original-image-review.json';
import u4Evidence from '../../../docs/unit-audit-20261105/LV1-U04-original-image-review.json';
import u5Evidence from '../../../docs/unit-audit-20261105/LV1-U05-original-image-review.json';
import publishedUnits from './lv1ReviewedImages.json';
import words from '../../../public/data/v1/words.json';
import {approvedCurriculumIllustration,approvedWordIllustration} from './approvedCurriculum';
import {getWordBeastAsset} from '../wordbeast/wordBeastAssets';

it('binds the explicitly reviewed general-card repairs to exact images and captions',()=>{
 expect(cards).toHaveLength(41);
 expect(cards.filter(c=>c.reviewId.startsWith('LV1-U03-'))).toHaveLength(18);
 expect(cards.filter(c=>c.reviewId.startsWith('LV1-U04-'))).toHaveLength(19);
 expect(cards.filter(c=>c.reviewId.startsWith('LV1-U05-'))).toHaveLength(4);
 expect(new Set(cards.map(c=>c.officialWordId)).size).toBe(41);
 for(const card of cards){
  const proof=[...evidence.cards,...u4Evidence.cards,...u5Evidence.cards].find(c=>c.id===card.reviewId)!;
  expect(proof.pixelReview).toContain('actually viewed original');
  expect(proof.observation).toBeTruthy();
  expect(createHash('sha256').update(readFileSync('public/'+card.illustration.path)).digest('hex')).toBe(proof.publishedImageSha256);
  expect(card.illustration).toMatchObject({captionEn:proof.captionEn,captionZh:proof.captionZh});
  const word=words.find(w=>w.wordId===card.officialWordId)!;
  expect(word).toBeDefined();
  expect(approvedWordIllustration(word.word,word.wordId)).toEqual(card.illustration);
  expect(getWordBeastAsset(word.wordId,word.word)).toContain(card.illustration.path);
  expect(approvedWordIllustration(word.word,'W999999')).toBeUndefined();
  expect(approvedCurriculumIllustration(word.word,'/'+card.illustration.path+'?v=test')).toEqual(card.illustration);
  expect(approvedCurriculumIllustration('wrong-word','/'+card.illustration.path)).toBeUndefined();
 }
});

it('keeps the twenty-four unpublished curriculum drafts out of the published unit manifest',()=>{
 expect(publishedUnits).toHaveLength(726);
 expect(publishedUnits.filter(c=>c.unit===3)).toHaveLength(22);
 expect(publishedUnits.filter(c=>c.unit===4)).toHaveLength(5);
 expect(publishedUnits.filter(c=>c.unit===5)).toHaveLength(13);
 for(const draft of evidence.cards)expect(publishedUnits.some(c=>c.id===draft.id)).toBe(false);
 for(const draft of u4Evidence.cards.filter(c=>!c.sourceUnitPublished))expect(publishedUnits.some(c=>c.id===draft.id)).toBe(false);
 for(const draft of u5Evidence.cards.filter(c=>!c.sourceUnitPublished))expect(publishedUnits.some(c=>c.id===draft.id)).toBe(false);
});
