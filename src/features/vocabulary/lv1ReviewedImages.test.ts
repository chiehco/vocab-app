import {beforeU38PlaygroundPair} from './lv2ImageRepairs.testSupport';
import imageRepairs from '../../../docs/unit-audit-20261105/LV2-U38-U41-image-repairs.json';
import buildingRepair from '../../../docs/unit-audit-20261105/LV2-U44-building-image-repair.json';
import {beforeU25Pairs} from './u25Pairs.testSupport';
import {beforeU23Pairs} from './u23Pairs.testSupport';
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import cards from './lv1ReviewedImages.json';
import audit from '../../../scripts/approvals/lv1-images-20260922.json';
import words from '../../../public/data/v1/words.json';
import bootstrap from '../../../public/data/v1/sa-pack.json';
import auditedGeneralCards from './auditedWordIllustrations.json';
import lowCaptionProof from '../../../docs/unit-audit-20261105/LV1-U02-low-caption-review.json';
import { approvedCurriculumCard, approvedCurriculumIllustration, approvedLV1Images, approvedWordIllustration } from './approvedCurriculum';
import { getWordBeastAsset } from '../wordbeast/wordBeastAssets';
import { resolveWordImageClue } from '../../quiz/imageClue';

const hash = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex');
const latestPublishedCards=cards;

describe('reviewed LV1 image-only release', () => {
  it('contains exactly the reviewed scope and preserves every final image and caption hash', () => {
    expect(cards).toHaveLength(726);
    expect(new Set(cards.map(c => c.id)).size).toBe(726);
    expect(cards.filter(c => c.unit === 1)).toHaveLength(38);
    expect(cards.filter(c => c.unit === 2)).toHaveLength(38);
    expect(cards.filter(c => c.unit === 3)).toHaveLength(22);
    expect(cards.filter(c => c.unit === 22)).toHaveLength(79);
    expect(cards.filter(c => c.unit === 23)).toHaveLength(109);
    expect(cards.filter(c => c.unit === 24)).toHaveLength(52);
    expect(cards.filter(c => c.unit === 25)).toHaveLength(52);
  });

  it.each([...new Set(cards.map(c=>c.unit))])('preserves every final image caption and default in LV1 unit %s',(unit)=>{
    for (const card of cards.filter(c=>c.unit===unit)) {
      const record = audit.find(a => a.id === card.id)!;
      expect(record).toBeDefined();
      if(card.id==='LV1-U09-04'){expect(card).toEqual(buildingRepair.after);expect(record).toEqual(buildingRepair.originalApproval);expect(hash(readFileSync('public/'+card.illustration.path))).toBe(buildingRepair.replacementImageSha256);expect(hash(readFileSync('public/'+buildingRepair.before.illustration.path))).toBe(record.publishedImageSha256);}
      else if(card.id==='LV1-U09-27'){expect(card).toEqual(imageRepairs.playground.after);expect(record).toEqual(imageRepairs.playground.originalApproval);expect(hash(readFileSync('public/'+card.illustration.path))).toBe(imageRepairs.playground.replacementImageSha256);expect(hash(readFileSync('public/'+imageRepairs.playground.before.illustration.path))).toBe(record.publishedImageSha256);}else expect(hash(readFileSync('public/' + card.illustration.path))).toBe(record.publishedImageSha256);
      expect(hash(card.illustration.captionEn + '\n' + card.illustration.captionZh)).toBe(record.textSha256);
      const src = '/' + card.illustration.path + '?v=test';
      expect(approvedCurriculumIllustration(card.displayWord, src)).toEqual(card.illustration);
      expect(resolveWordImageClue(card.displayWord, src, 'unrelated old caption')?.text).toBe(card.illustration.captionZh);
      if (card.officialWordId) {
        const official = words.find(w => w.wordId === card.officialWordId)!;
        expect(official).toBeDefined();
        expect(bootstrap.words.some(w => w.wordId === official.wordId)).toBe(true);
        expect(approvedLV1Images(official.word, official.wordId)).toContainEqual(card);
        // Only this exact inspected general-card repair supersedes a published
        // LV1 default. All unit-specific bytes/captions above remain protected.
        const override = card.id === 'LV1-U10-76'
          ? auditedGeneralCards.find(c => c.reviewId === 'LV1-U07-83') : undefined;
        if (card.id === 'LV1-U10-76') {
          expect(official.wordId).toBe('W000541');
          expect(override?.officialWordId).toBe(official.wordId);
          expect(override?.illustration).toEqual({
            path: 'wordbeast/audited-20261105/LV1-U07-83-2f2adec62019.webp',
            captionEn: "Would you mind closing the window? It's a bit cold in here.",
            captionZh: '你介意把窗戶關上嗎？這裡有點冷。',
          });
        }
        const expected = approvedCurriculumCard(official.word, official.wordId)?.illustration
          ?? override?.illustration
          ?? approvedLV1Images(official.word, official.wordId)[0].illustration;
        expect(getWordBeastAsset(official.wordId, official.word)).toContain(expected.path);
      }
    }
  });

  it('does not invent IDs, promote dictionary senses, or match the wrong ID', () => {
    expect(cards.filter(c => !c.officialWordId)).toHaveLength(67);
    expect(approvedLV1Images('boy', 'W999999')).toEqual([]);
    expect(approvedWordIllustration('boy', 'W999999')).toBeUndefined();
    expect(approvedCurriculumCard('boy', 'W000114')).toBeUndefined();
    expect(approvedCurriculumIllustration('boy', '/wordbeast/unrelated.webp')).toBeUndefined();
    expect(approvedCurriculumIllustration('wrong-word', '/' + cards[0].illustration.path)).toBeUndefined();
  });

  it('repairs only the U02 sunrise pair and retains the old image and sun-yourself example',()=>{
    const sun=cards.find(c=>c.id==='LV1-U02-32')!;
    expect(sun.illustration).toMatchObject({path:'wordbeast/lv1-reviewed/LV1-U02-32-972fd78d0fe4.webp',captionEn:'The sun rises in the east.'});
    expect(hash(readFileSync('public/'+sun.illustration.path))).toBe('fefa5b56747479f118879d64d67b32b8ef651e328b1efaa705e18cd49d2cbdde');
    expect(hash(readFileSync('public/wordbeast/lv1-reviewed/LV1-U02-32-af5bdc9689ae.webp'))).toBe('1078eaf972da567a977c5a08bcc54b67ef65c7b705e5a96a880a77472d76c327');
    const example=bootstrap.examples.find(e=>e.exampleId==='EX3ebf8dd3')!;
    expect(example.sentenceEn).toBe('On summer afternoons, my grandfather likes to sun himself on the porch.');
    expect(example.sensePos).toBe('v.');
  });

  it('changes only the verified low reach character and retains its exact image and original text hash',()=>{
    const low=cards.find(c=>c.id==='LV1-U02-15')!;
    expect(low.illustration).toEqual({path:'wordbeast/lv1-reviewed/LV1-U02-15-00fe16b1863b.webp',captionEn:'The shelf is low enough for a child to reach.',captionZh:'這個架子夠低，小孩搆得到。'});
    expect(hash(readFileSync('public/'+low.illustration.path))).toBe('8ecc15140b00b724f14a74038587339c23d363385049e91ed48fcb832c413b83');
    expect(lowCaptionProof.previousApproval.textSha256).toBe('32fb1a861bf09ea5a24bc62926d8e5751c68299e9cc8958011b76ebe5fcfb481');
    expect(hash(lowCaptionProof.previousIllustration.captionEn+'\n'+lowCaptionProof.previousIllustration.captionZh)).toBe(lowCaptionProof.previousApproval.textSha256);
    expect(hash(low.illustration.captionEn+'\n'+low.illustration.captionZh)).toBe('ef8900cdf11335a1d4501dca72d9aeff2d5c14318e58b0d048b2206182489ca0');
    expect(bootstrap.examples.find(e=>e.exampleId==='EX2ff9ba41')?.sentenceZh).toBe(low.illustration.captionZh);
  });

  it('repairs the U02 elephant anatomy with an exact replacement and recoverable original',()=>{
    const elephant=cards.find(c=>c.id==='LV1-U02-08')!;
    expect(elephant.illustration).toMatchObject({path:'wordbeast/lv1-reviewed/LV1-U02-08-7426b87a0d8e.webp',captionEn:'The elephant used its trunk to spray water.'});
    expect(hash(readFileSync('public/'+elephant.illustration.path))).toBe('445728d61fb0f9c4b7ca8cd52c9861a93d2c9baadd7d08644b5b1e4c7d15257f');
    expect(hash(readFileSync('public/wordbeast/lv1-reviewed/LV1-U02-08-d5dd7302b647.webp'))).toBe('4e05c2d51561a77fd81c7649ec3ab41a82842df48caec83a7706f5a57ec95375');
  });

  it('uses the final Unit01 redraws and marriage correction', () => {
    for (const id of ['15', '27', '32', '36', '38']) {
      expect(audit.find(c => c.id === 'LV1-U01-' + id)?.sourceImage).toContain('_v2_');
    }
    expect(cards.find(c => c.id === 'LV1-U01-32')?.illustration.captionEn).toBe('They laughed at her jokes.');
    expect(cards.find(c => c.id === 'LV1-U12-33')?.illustration.captionEn)
      .toBe('They celebrated another year of marriage with a small cake.');
    for (const id of ['07-04', '08-73', '11-15', '12-24']) {
      expect(audit.find(c => c.id === 'LV1-U' + id)?.sourceImage).toContain('_v2.png');
    }
  });

  it('narrows only the verified shirt translation and preserves its exact image and English',()=>{
    const enough=cards.find(c=>c.id==='LV1-U01-30')!;
    expect(enough.illustration).toEqual({path:'wordbeast/lv1-reviewed/LV1-U01-30-d34e8ac01d69.webp',captionEn:"This shirt isn't big enough for him anymore.",captionZh:'這件上衣對他來說已經不夠大了。'});
    const record=audit.find(c=>c.id===enough.id)!;
    expect(record.publishedImageSha256).toBe(record.previousApproval?.publishedImageSha256);
    const example=bootstrap.examples.find(e=>e.exampleId==='EX51e703b4')!;
    expect(example.sentenceEn).toBe(enough.illustration.captionEn);expect(example.sentenceZh).toBe(enough.illustration.captionZh);
  });

  it('keeps the repaired U10 opening-door unit pair separate from the U07 general closing-window pair',()=>{
    const door=cards.find(c=>c.id==='LV1-U10-76')!;
    expect(door.illustration).toEqual({path:'wordbeast/lv1-reviewed/LV1-U10-76-0eae26fedc0f.webp',captionEn:'Would you mind opening the door? My hands are full.',captionZh:'你介意幫我開門嗎？我手上都是東西。'});
    expect(hash(readFileSync('public/'+door.illustration.path))).toBe('0fd830ed1759186fe4b0253cf46e19fbb8142147d821f99a7fb76fac44eb931a');
    const record=audit.find(c=>c.id===door.id)!;expect(hash(readFileSync('public/wordbeast/lv1-reviewed/LV1-U10-76-0f10b49c443c.webp'))).toBe(record.previousApproval?.publishedImageSha256);
    const window=auditedGeneralCards.find(c=>c.reviewId==='LV1-U07-83')!;
    expect(window.illustration.captionEn).toBe("Would you mind closing the window? It's a bit cold in here.");
    expect(getWordBeastAsset('W000541','mind')).toContain(window.illustration.path);
    expect(approvedCurriculumIllustration('mind','/'+door.illustration.path)).toEqual(door.illustration);
  });

  it('repairs only the exact U13 valley chart while retaining old bytes and both different formal examples',()=>{
    const card=cards.find(c=>c.id==='LV1-U13-65')!;
    expect(card.officialWordId).toBe('W001242');
    expect(card.illustration).toEqual({path:'wordbeast/lv1-reviewed/LV1-U13-65-3dc230fb571f.webp',captionEn:'The teacher showed the depth of the valley on the chart.',captionZh:'老師在圖表上展示了山谷的深度。'});
    expect(hash(readFileSync('public/'+card.illustration.path))).toBe('924029ff52b7e8848d30e86f21f8616f32303e0b6ae7aedd33df1a951af2527e');
    expect(hash(readFileSync('public/wordbeast/lv1-reviewed/LV1-U13-65-439edb15ebab.webp'))).toBe('efff15ae8aa4bab09f042caa62af9ace6a3576d93e954df7feb28b2c4a11c882');
    const approval=audit.find(c=>c.id===card.id)!;
    expect(approval.previousApproval?.publishedImageSha256).toBe('efff15ae8aa4bab09f042caa62af9ace6a3576d93e954df7feb28b2c4a11c882');
    expect(approval.previousApproval?.textSha256).toBe(approval.textSha256);
    expect(getWordBeastAsset('W001242','depth')).toContain(card.illustration.path);
    expect(approvedWordIllustration('depth','W001242')).toEqual(card.illustration);
    expect(approvedCurriculumIllustration('depth','/'+card.illustration.path)).toEqual(card.illustration);
    const formal=bootstrap.examples.filter(e=>e.word==='depth');
    expect(formal.map(e=>[e.exampleId,e.sentenceEn])).toEqual([
      ['EX4b50cf68','The teacher explained the topic in depth so everyone could fully understand it.'],
      ['EX63e39700','Scientists measured the depth of the lake before building the new bridge nearby.'],
    ]);
    expect(formal.some(e=>e.sentenceEn===card.illustration.captionEn)).toBe(false);
  });

  it('repairs only the exact U15 zipped-jacket pair while keeping both different formal fairly sentences',()=>{
    const card=cards.find(c=>c.id==='LV1-U15-62')!;
    expect(card.officialWordId).toBe('W002311');
    expect(card.illustration).toEqual({path:'wordbeast/lv1-reviewed/LV1-U15-62-90932acf02e3.webp',captionEn:"It's fairly cold outside, so he zipped up his thick jacket.",captionZh:'外面相當冷，所以他把厚外套的拉鍊拉上。'});
    expect(hash(readFileSync('public/'+card.illustration.path))).toBe('ca8b4a50b626289b295db4beb1dbe7cece3934f94438920e23d68f8a0087e865');
    const record=audit.find(c=>c.id===card.id)!;
    expect(hash(readFileSync('public/wordbeast/lv1-reviewed/LV1-U15-62-b6655d2d2032.webp'))).toBe(record.previousApproval?.publishedImageSha256);
    expect(record.previousApproval?.textSha256).toBe(record.textSha256);
    expect(getWordBeastAsset('W002311','fairly')).toContain(card.illustration.path);
    expect(approvedWordIllustration('fairly','W002311')).toEqual(card.illustration);
    expect(approvedCurriculumIllustration('fairly','/'+card.illustration.path)).toEqual(card.illustration);
    expect(bootstrap.examples.filter(e=>e.word==='fairly').map(e=>[e.exampleId,e.sentenceEn])).toEqual([
      ['EX74b62599','The weather was fairly cold this morning, so I put on a thick jacket.'],
      ['EXdc08c0df','The judges were praised for evaluating every contestant fairly during the competition.'],
    ]);
    expect(cards.filter(c=>c.unit===15)).toHaveLength(23);
  });

  it('uses the corrected five-finger glove and the final proxy-reviewed Unit22-25 captions', () => {
    expect(audit.find(c => c.id === 'LV1-U23-77')?.sourceImage).toBe('77_NOID_glove_v2.png');
    expect(cards.find(c => c.id === 'LV1-U23-77')?.illustration.captionEn)
      .toBe('He put on one glove before touching the cold snow.');
    expect(cards.find(c => c.id === 'LV1-U22-03')?.illustration.captionEn)
      .toBe('The gift looked perfect, but there was a catch inside.');
    expect(cards.find(c => c.id === 'LV1-U25-46')?.illustration.captionEn)
      .toBe('This shirt is the last item he bought during the sale.');
    expect(cards.filter(c => c.unit >= 22 && c.unit <= 25)
      .some(c => /Doumo|Mr\. Bean|Mrs\. Bean|Ms\. Bean/.test(c.illustration.captionEn))).toBe(false);
  });
});

it('changes only the two exact U22 pairs while preserving original assets captions and every other row',()=>{
 const cards=beforeU38PlaygroundPair(latestPublishedCards);
 const proof=JSON.parse(readFileSync('docs/unit-audit-20261105/LV1-U22-exact-pair-review.json','utf8'));
 const ids=new Set(['LV1-U22-04','LV1-U22-46']);
 expect(hash(JSON.stringify(beforeU23Pairs(cards,'cards').filter(c=>!ids.has(c.id))))).toBe(proof.unchangedCardRowsSha256);
 expect(hash(JSON.stringify(beforeU23Pairs(audit,'approvals').filter(c=>!ids.has(c.id))))).toBe(proof.unchangedApprovalRowsSha256);
 for(const old of proof.before){
  const now=cards.find(c=>c.id===old.id)!;const record=audit.find(c=>c.id===old.id)!;
  expect(record.previousApproval).toEqual(old.approval);
  expect(hash(readFileSync('public/'+old.illustration.path))).toBe(old.approval.publishedImageSha256);
  expect(hash(old.illustration.captionEn+'\n'+old.illustration.captionZh)).toBe(old.approval.textSha256);
  expect(now.illustration.captionEn).toBe(old.illustration.captionEn);
 }
 const umbrella=cards.find(c=>c.id==='LV1-U22-04')!;
 expect(umbrella.officialWordId).toBeNull();
 expect(umbrella.illustration.path).toBe('wordbeast/lv1-reviewed/LV1-U22-04-da76e7c6def2.webp');
 expect(hash(readFileSync('public/'+umbrella.illustration.path))).toBe('ed9f96ee831e60d943961326c6eff970280a31e048a8b9d991941f6ad0792700');
 expect(umbrella.illustration.captionZh).toBe(proof.before[0].illustration.captionZh);
 const choose=cards.find(c=>c.id==='LV1-U22-46')!;
 expect(choose.officialWordId).toBe('W000165');
 expect(choose.illustration).toEqual({path:'wordbeast/lv1-reviewed/LV1-U22-46-c0b8effa6d8b.webp',captionEn:'He chose the blue shirt instead of the red one.',captionZh:'他選了藍色上衣，而不是紅色的。'});
 expect(getWordBeastAsset('W000165','choose')).toContain(choose.illustration.path);
 expect(approvedWordIllustration('choose','W000165')).toEqual(choose.illustration);
 expect(bootstrap.examples.find(e=>e.exampleId==='EX93dc7fe9')?.sentenceZh).toBe(choose.illustration.captionZh);
 for(const [word,id,path]of [['arrive','W000046','LV1-U07-86-'],['circular','W003145','curriculum/lv4-u17/circular.webp'],['circulation','W003147','curriculum/lv4-u17/circulate.webp'],['oval','W003706','curriculum/lv4-u17/oval-v7.webp']]){
  if(word==='arrive')expect(getWordBeastAsset(id,word)).toContain('LV1-U07-86-');
  else expect(getWordBeastAsset(id,word)).toContain(path);
 }
});

it('repairs only the exact U23 trophy pair and two Chinese captions while retaining all other historical rows',()=>{
 const cards=beforeU38PlaygroundPair(latestPublishedCards);
 const proof=JSON.parse(readFileSync('docs/unit-audit-20261105/LV1-U23-exact-pair-review.json','utf8'));const ids=new Set(['LV1-U23-50','LV1-U23-84','LV1-U23-97']);
 expect(hash(JSON.stringify(beforeU25Pairs(cards,'cards').filter(c=>!ids.has(c.id))))).toBe(proof.unchangedCardRowsSha256);expect(hash(JSON.stringify(beforeU25Pairs(audit,'approvals').filter(c=>!ids.has(c.id))))).toBe(proof.unchangedApprovalRowsSha256);
 expect(beforeU23Pairs(cards,'cards')).toHaveLength(726);expect(beforeU23Pairs(audit,'approvals')).toHaveLength(726);
 for(const change of proof.changes){const now=cards.find(c=>c.id===change.id)!;expect(now).toEqual(change.after.card);expect(now.illustration.captionEn).toBe(change.before.card.illustration.captionEn);expect(hash(readFileSync('public/'+change.before.card.illustration.path))).toBe(change.before.approval.publishedImageSha256);expect(hash(change.before.card.illustration.captionEn+'\n'+change.before.card.illustration.captionZh)).toBe(change.before.approval.textSha256);}
 const trophy=cards.find(c=>c.id==='LV1-U23-50')!;expect(trophy.illustration.path).toBe('wordbeast/lv1-reviewed/LV1-U23-50-c4476d14caae.webp');expect(hash(readFileSync('public/'+trophy.illustration.path))).toBe('a205d42a31e67d46ea93ad89149b84fc35562c3e0f1f2dd9f546df2a628cd94c');expect(trophy.illustration.captionEn).toBe('His team won the final and lifted the trophy.');
 expect(getWordBeastAsset('W001356','final')).toContain('LV1-U10-44-dd0a6dc4ec60.webp');expect(approvedWordIllustration('final','W001356')).toMatchObject({captionEn:'Our basketball team made it to the final.',captionZh:'我們的籃球隊晉級了決賽。'});
 expect(bootstrap.examples.filter(e=>e.word==='final').map(e=>e.sentenceEn)).toEqual(["Our school's basketball team made it to the final of the city competition.",'Many students stay up late in the library before their final exams.']);
 expect(cards.find(c=>c.id==='LV1-U23-84')!.illustration.captionZh).toBe('他總是被這張桌子的角絆到。');expect(bootstrap.examples.find(e=>e.exampleId==='EXff6b330f')!.sentenceZh).toBe('我總是被這張桌子的角絆到。');
 expect(cards.find(c=>c.id==='LV1-U23-97')!.illustration.captionZh).toBe('他打算在大學研讀電腦科學。');expect(bootstrap.examples.find(e=>e.exampleId==='EXf7d6aec6')!.sentenceZh).toBe('我哥哥打算在大學研讀電腦科學。');
 const bad=structuredClone(cards);bad.find(c=>c.id==='LV1-U23-50')!.illustration.captionZh='unverified';expect(()=>beforeU23Pairs(bad,'cards')).toThrow();
 const badApproval=structuredClone(audit);badApproval.find(a=>a.id==='LV1-U23-50')!.publishedImageSha256='unverified';expect(()=>beforeU23Pairs(badApproval,'approvals')).toThrow();
 const other=structuredClone(cards);other.find(c=>!ids.has(c.id))!.illustration.captionEn='unrecorded';expect(hash(JSON.stringify(beforeU23Pairs(other,'cards').filter(c=>!['LV1-U22-04','LV1-U22-46'].includes(c.id))))).not.toBe(JSON.parse(readFileSync('docs/unit-audit-20261105/LV1-U22-exact-pair-review.json','utf8')).unchangedCardRowsSha256);
 expect(()=>beforeU23Pairs([...cards,cards.find(c=>c.id==='LV1-U23-50')!],'cards')).toThrow();
});

it('repairs only the U25 wake clock and preserves both formal examples and every other pair',()=>{
 const cards=beforeU38PlaygroundPair(latestPublishedCards);
 const proof=JSON.parse(readFileSync('docs/unit-audit-20261105/LV1-U25-exact-pair-review.json','utf8')),c=proof.changes[0];
 expect(proof.changes.map((x:{id:string})=>x.id)).toEqual(['LV1-U25-31']);expect(hash(JSON.stringify(cards.filter(x=>x.id!==c.id)))).toBe(proof.unchangedCardRowsSha256);expect(hash(JSON.stringify(audit.filter(x=>x.id!==c.id)))).toBe(proof.unchangedApprovalRowsSha256);
 const now=cards.find(x=>x.id===c.id)!;expect(now).toEqual(c.after.card);expect(now.illustration.captionEn).toBe(c.before.card.illustration.captionEn);expect(now.illustration.captionZh).toBe(c.before.card.illustration.captionZh);
 expect(hash(readFileSync('public/'+now.illustration.path))).toBe('2f5d8f250cb26ded297d2e1e02060fff1202aada9ac78bb299b5cc0f7e53c1e7');expect(hash(readFileSync('public/'+c.before.card.illustration.path))).toBe(c.before.approval.publishedImageSha256);
 expect(beforeU25Pairs(cards,'cards')).toHaveLength(726);expect(beforeU25Pairs(audit,'approvals')).toHaveLength(726);expect(getWordBeastAsset('W000944','wake')).toContain(now.illustration.path);expect(approvedWordIllustration('wake','W000944')).toEqual(now.illustration);
 expect(bootstrap.examples.filter(e=>e.word==='wake')).toEqual(c.formalExamples);expect(words.find(w=>w.wordId==='W000944')).not.toHaveProperty('verbForms');
 for(const field of ['captionEn','captionZh','path']){const bad=structuredClone(cards);bad.find(x=>x.id===c.id)!.illustration[field as 'path']='unverified';expect(()=>beforeU25Pairs(bad,'cards')).toThrow();}
 const bad=structuredClone(audit);bad.find(x=>x.id===c.id)!.publishedImageSha256='unverified';expect(()=>beforeU25Pairs(bad,'approvals')).toThrow();expect(()=>beforeU25Pairs([...cards,now],'cards')).toThrow();
 const other=structuredClone(cards);other[0].illustration.captionEn='unrecorded';expect(hash(JSON.stringify(other.filter(x=>x.id!==c.id)))).not.toBe(proof.unchangedCardRowsSha256);
});
