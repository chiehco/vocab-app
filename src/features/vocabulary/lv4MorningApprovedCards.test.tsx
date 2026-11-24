import {expect,it,vi} from 'vitest';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {renderToStaticMarkup} from 'react-dom/server';
import {MemoryRouter} from 'react-router-dom';
import cards from './lv4MorningApprovedCards.json';
import proof from '../../../docs/lv4-releases-20261125/U01-U10-morning-approved.json';
import {approvedCurriculumCards,approvedCurriculumItem,approvedWordIllustration} from './approvedCurriculum';
import {beforeLV4ResolverSource,beforeMorningResolverSource} from '../direct/lv4Published.testSupport';
import {findUnit} from '../direct/model';
import VocabularyScreen from './VocabularyScreen';
import {getWordBeastAsset} from '../wordbeast/wordBeastAssets';
import {canUsePicturePrompt} from '../wordbeast/picturePrompt';
import {resolveWordImageClue} from '../../quiz/imageClue';
vi.mock('../modes/useStudyBookmark',()=>({useStudyBookmark:vi.fn()}));
vi.mock('../../hooks/useCardPronunciation',()=>({useCardPronunciation:vi.fn()}));
vi.mock('../wordbeast/useIllustrationMedia',()=>({useIllustrationMedia:vi.fn()}));
const hash=(b:string|Buffer)=>createHash('sha256').update(b).digest('hex');
const escape=(s:string)=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#x27;');
const json=(path:string):unknown=>JSON.parse(readFileSync(path,'utf8'));

it('accepts the34 unchanged approvals and only the6 subsequently approved revisions',()=>{
 expect(cards).toEqual(proof.cards);expect(cards).toHaveLength(40);
 expect(new Set(cards.map(c=>c.learningItemId)).size).toBe(40);
 expect(new Set(cards.map(c=>c.officialWordId)).size).toBe(39);
 expect(proof.assets).toHaveLength(36);expect(proof.newIds).toBe(0);
 expect(proof.userApproval).toMatchObject({approvedPairs:40,originalPairs:34,revisedPairs:6,firstReply:'其餘通過',revisionsReply:'六張改稿都可用'});
 expect(cards.filter(c=>c.approval.source===proof.userApproval.revisionSource).map(c=>c.reviewId)).toEqual(['U03-01','U03-02','U03-03','U03-04','U08-04','U09-02']);
 expect(cards.filter(c=>c.approval.source==='D-119-user-reply-20261125')).toHaveLength(34);
 expect(proof.units).toEqual([1,2,3,4,5,6,7,8,9,10]);
 for(const n of proof.units)expect(cards.filter(c=>c.unitName===`LV4 Unit ${n}`)).toHaveLength(4);
});

it('preserves original textbook rows, formal words/examples, study inputs and all older approved registries',()=>{
 for(const [path,sha]of Object.entries(proof.protectedSourceLfHashes))expect(hash(readFileSync(path,'utf8').replaceAll('\r\n','\n'))).toBe(sha);
 expect(proof.formalWordsBefore).toHaveLength(39);expect(proof.sourceItemsBefore).toHaveLength(40);
 for(const saved of proof.sourceItemsBefore){
  const card=cards.find(c=>c.learningItemId===saved.learningItemId)!;
  const unit=findUnit(Number(card.unitName.split(' ').at(-1)),'LV4')!;
  expect(unit.deliveryMode).toBe('text_only');expect(unit.questions).toEqual([]);
  const raw=json(`src/features/direct/curriculumLV4Unit${Number(card.unitName.split(' ').at(-1))}.json`) as {learningItems:Array<{learningItemId:string}>};
  expect(raw.learningItems.find(i=>i.learningItemId===saved.learningItemId)).toEqual(saved);
  expect(unit.items.find(i=>i.learningItemId===saved.learningItemId)).toMatchObject({displayWord:card.displayWord,officialWordId:card.officialWordId,sensePos:card.sourcePos,targetMeaningZh:card.sourceMeaningZh});
 }
 const words=json('public/data/v1/words.json') as Array<{wordId:string}>;
 for(const saved of proof.formalWordsBefore)expect(words.find(w=>w.wordId===saved.wordId)).toEqual(saved);
 const examples=json('public/data/v1/examples.json') as Array<{exampleId:string}>;
 for(const saved of proof.formalExamplesBefore)expect(examples.find(x=>x.exampleId===saved.exampleId)).toEqual(saved);
});

it('reverses exactly the authenticated additive registry edit and still rejects source drift',()=>{
 const current=readFileSync(proof.path,'utf8').replaceAll('\r\n','\n');
 expect(current).toBe(proof.afterText);expect(hash(current)).toBe(proof.afterLfSha256);
 expect(beforeMorningResolverSource(proof.path,current)).toBe(proof.beforeText);
 expect(beforeLV4ResolverSource(proof.path,current)).toBe(beforeLV4ResolverSource(proof.path,proof.beforeText));
 expect(()=>beforeLV4ResolverSource(proof.path,current+'\n// unrelated change\n')).toThrow();
 expect(()=>beforeLV4ResolverSource(proof.path,current.replace(proof.afterSpread,proof.beforeSpread))).toThrow();
});

it('keeps the two content learning items distinct and shares images only where approved',()=>{
 const content=cards.filter(c=>c.displayWord==='content');
 expect(content.map(c=>c.learningItemId)).toEqual(['LI-LV4U07-V004','LI-LV4U07-V005']);
 expect(content.map(c=>c.sensePos)).toEqual(['adj.','n.']);
 expect(content[0].illustration.path).not.toBe(content[1].illustration.path);
 expect(content.map(c=>c.secondaryOnGeneralCard)).toEqual([false,true]);
 for(const [a,b]of [['obtain','license'],['analyze','analysis'],['expand','expansion'],['intense','intensity']]){
  expect(cards.find(c=>c.displayWord===a)!.illustration.path).toBe(cards.find(c=>c.displayWord===b)!.illustration.path);
 }
});

it.each(cards)('binds $reviewId $displayWord to its exact sense, image, captions and both card consumers',card=>{
 expect(approvedCurriculumItem(card.learningItemId)).toEqual(card);
 expect(approvedCurriculumCards(card.displayWord,card.officialWordId)).toContainEqual(card);
 expect(approvedCurriculumCards(card.displayWord,'W999999')).toEqual([]);
 expect(card.purpose).toBe('教材卡／一般字卡');expect(card.imageQuizAllowed).toBe(false);
 expect(card.sensePos).toBe(card.illustratedSensePos);expect(card.targetMeaningZh).toBe(card.illustratedMeaningZh);
 expect(card.approval.artApproved&&card.approval.pairApproved).toBe(true);
 const primary=cards.find(c=>c.officialWordId===card.officialWordId&&!c.secondaryOnGeneralCard)!;
 expect(approvedWordIllustration(card.displayWord,card.officialWordId)).toEqual(primary.illustration);
 expect(getWordBeastAsset(card.officialWordId,card.displayWord)).toContain(primary.illustration.path);
 expect(canUsePicturePrompt(card.officialWordId,card.displayWord)).toBe(false);
 expect(resolveWordImageClue(card.displayWord,'/vocab-app/'+card.illustration.path,'unrelated caption')?.text).toBe(card.illustration.captionZh);
 const bytes=readFileSync('public/'+card.illustration.path);expect(hash(bytes)).toBe(card.approval.publishedSha256);
 expect(bytes.subarray(0,4).toString()).toBe('RIFF');expect(bytes.subarray(8,12).toString()).toBe('WEBP');
 expect(hash(card.illustration.captionEn+'\n'+card.illustration.captionZh)).toBe(card.approval.captionSha256);
 const n=Number(card.unitName.split(' ').at(-1));
 const html=renderToStaticMarkup(<MemoryRouter initialEntries={[`/vocabulary?level=LV4&unit=${n}&kind=vocabulary&item=${card.learningItemId}`]}><VocabularyScreen/></MemoryRouter>);
 expect(html).toContain(card.illustration.path);expect(html).toContain(escape(card.illustration.captionEn));expect(html).toContain(escape(card.illustration.captionZh));
 expect(html).toContain(escape(card.illustratedMeaningZh));
});
