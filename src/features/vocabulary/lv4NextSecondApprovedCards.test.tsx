import {expect,it,vi} from 'vitest';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {renderToStaticMarkup} from 'react-dom/server';
import {MemoryRouter} from 'react-router-dom';
import cards from './lv4NextSecondApprovedCards.json';
import proof from '../../../docs/lv4-releases-20261125/U11-U16-next-second-approved.json';
import {approvedCurriculumCards,approvedCurriculumItem,approvedWordIllustration} from './approvedCurriculum';
import {beforeLV4ResolverSource,beforeNextSecondResolverSource} from '../direct/lv4Published.testSupport';
import {unitsFor} from './textbookCatalog';
import VocabularyScreen from './VocabularyScreen';
import {getWordBeastAsset} from '../wordbeast/wordBeastAssets';
import {canUsePicturePrompt} from '../wordbeast/picturePrompt';
import {resolveWordImageClue} from '../../quiz/imageClue';
vi.mock('../modes/useStudyBookmark',()=>({useStudyBookmark:vi.fn()}));
vi.mock('../../hooks/useCardPronunciation',()=>({useCardPronunciation:vi.fn()}));
vi.mock('../wordbeast/useIllustrationMedia',()=>({useIllustrationMedia:vi.fn()}));
const hash=(b:string|Buffer)=>createHash('sha256').update(b).digest('hex');
const escape=(s:string)=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#x27;');

it('accepts24 exact approved pairs and partial reuse, with shared protest identity',()=>{
 expect(cards).toEqual(proof.cards);expect(cards).toHaveLength(25);
 expect(new Set(cards.map(c=>c.learningItemId)).size).toBe(25);
 expect(new Set(cards.map(c=>c.officialWordId)).size).toBe(24);
 expect(proof.assets).toHaveLength(23);expect(proof.newIds).toBe(0);
 expect(proof.userApproval).toMatchObject({decision:'D-124',reply:'兩張改稿都可用，接著繼續處理，需要我裁決的再停。',newApprovedPairs:24,existingExactReuses:1,pendingExcludedIds:[]});
 expect(cards.filter(c=>c.secondaryOnGeneralCard).map(c=>c.displayWord)).toEqual(['protest','partial']);
 for(const word of ['sacrifice','conservative'])expect(cards.find(c=>c.displayWord===word)!.approval.reply).toBe(proof.userApproval.reply);
 expect(proof.units).toEqual([11,12,13,14,15,16]);
 const p=cards.filter(c=>c.displayWord==='protest');expect(p).toHaveLength(2);
 expect(p[0].officialWordId).toBe(p[1].officialWordId);expect(p[0].illustration.path).not.toBe(p[1].illustration.path);expect(p[0].approval.publishedSha256).toBe(p[1].approval.publishedSha256);
 expect(p[0].illustration.captionEn).not.toBe(p[1].illustration.captionEn);
 expect(p.map(c=>c.sensePos)).toEqual(['vi.','n.']);
});

it('preserves every protected source, all prior defaults, picture-prompt eligibility and practice count',()=>{
 for(const [path,sha]of Object.entries(proof.protectedSourceLfHashes))expect(hash(readFileSync(path,'utf8').replaceAll('\r\n','\n'))).toBe(sha);
 const units=unitsFor({track:'7000',publisher:'ivy',volume:'LV4'});
 for(const u of proof.practiceBaseline)expect(units.find(x=>x.unit===u.unit)!.wordIds).toHaveLength(u.practice);
 for(const card of cards.filter(c=>c.approval.source==='existing-exact-approved-pair')){
  const old=proof.runtimeBefore.find(r=>r.learningItemId===card.learningItemId)!;
  expect(approvedWordIllustration(card.displayWord,card.officialWordId)).toEqual(old.primary);
  expect(canUsePicturePrompt(card.officialWordId,card.displayWord)).toBe(old.pictureAllowed);
 }
});

it('reverses only the authenticated additive import/spread and rejects unrelated resolver edits',()=>{
 const current=readFileSync(proof.path,'utf8').replaceAll('\r\n','\n');
 expect(current).toBe(proof.afterText);expect(hash(current)).toBe(proof.afterLfSha256);
 expect(beforeNextSecondResolverSource(proof.path,current)).toBe(proof.beforeText);
 expect(beforeLV4ResolverSource(proof.path,current)).toBe(beforeLV4ResolverSource(proof.path,proof.beforeText));
 expect(()=>beforeLV4ResolverSource(proof.path,current+'\n// unrelated change\n')).toThrow();
 expect(()=>beforeLV4ResolverSource(proof.path,current.replace(proof.afterSpread,proof.beforeSpread))).toThrow();
});

it.each(cards)('routes $reviewId $displayWord to its exact approved image and bilingual captions',card=>{
 expect(approvedCurriculumItem(card.learningItemId)).toEqual(card);
 expect(approvedCurriculumCards(card.displayWord,card.officialWordId)).toContainEqual(card);
 expect(approvedCurriculumCards(card.displayWord,'W999999')).toEqual([]);
 expect(card.sensePos).toBe(card.illustratedSensePos);expect(card.targetMeaningZh).toBe(card.illustratedMeaningZh);
 expect(card.approval.artApproved&&card.approval.pairApproved).toBe(true);
 if(!card.secondaryOnGeneralCard){
  expect(approvedWordIllustration(card.displayWord,card.officialWordId)).toEqual(card.illustration);
  expect(getWordBeastAsset(card.officialWordId,card.displayWord)).toContain(card.illustration.path);
  expect(canUsePicturePrompt(card.officialWordId,card.displayWord)).toBe(false);
 }
 expect(resolveWordImageClue(card.displayWord,'/vocab-app/'+card.illustration.path,'unrelated caption')?.text).toBe(approvedCurriculumCards(card.displayWord,card.officialWordId).find(c=>c.illustration.path===card.illustration.path)!.illustration.captionZh);
 expect(hash(readFileSync('public/'+card.illustration.path))).toBe(card.approval.publishedSha256);
 expect(hash(card.illustration.captionEn+'\n'+card.illustration.captionZh)).toBe(card.approval.captionSha256);
 const n=Number(card.unitName.split(' ').at(-1));
 const html=renderToStaticMarkup(<MemoryRouter initialEntries={[`/vocabulary?level=LV4&unit=${n}&kind=vocabulary&item=${card.learningItemId}`]}><VocabularyScreen/></MemoryRouter>);
 expect(html).toContain(card.illustration.path);expect(html).toContain(escape(card.illustration.captionEn));expect(html).toContain(escape(card.illustration.captionZh));expect(html).toContain(escape(card.illustratedMeaningZh));
});
