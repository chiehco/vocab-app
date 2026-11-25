import {expect,it,vi} from 'vitest';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {renderToStaticMarkup} from 'react-dom/server';
import {MemoryRouter} from 'react-router-dom';
import cards from './lv4NextTailApprovedCards.json';
import proof from '../../../docs/lv4-releases-20261125/U21-U24-next-tail-approved.json';
import {approvedCurriculumCards,approvedCurriculumItem,approvedWordIllustration} from './approvedCurriculum';
import {beforeLV4ResolverSource,beforeNextTailResolverSource} from '../direct/lv4Published.testSupport';
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

it('accepts16 exact approved pairs including slogan v2 and lawful exact reuse',()=>{
 expect(cards).toEqual(proof.cards);expect(cards).toHaveLength(17);
 expect(new Set(cards.map(c=>c.learningItemId)).size).toBe(17);
 expect(new Set(cards.map(c=>c.officialWordId)).size).toBe(17);
 expect(proof.assets).toHaveLength(14);expect(proof.newIds).toBe(0);
 expect(proof.userApproval).toMatchObject({decision:'D-125',reply:'通過',newApprovedPairs:16,existingExactReuses:1,pendingExcludedIds:[]});
 expect(cards.filter(c=>c.secondaryOnGeneralCard).map(c=>c.displayWord)).toEqual(['lawful']);
 expect(cards.find(c=>c.displayWord==='slogan')!.approval.reply).toBe('通過');
 expect(proof.units).toEqual([21,22,23,24]);
 for(const pair of [['admirable','admiration'],['surgeon','surgery']]){
  const a=cards.find(c=>c.displayWord===pair[0])!,b=cards.find(c=>c.displayWord===pair[1])!;
  expect(a.illustration.path).toBe(b.illustration.path);expect(a.officialWordId).not.toBe(b.officialWordId);
  expect(a.illustration.captionEn).not.toBe(b.illustration.captionEn);
 }
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
 expect(beforeNextTailResolverSource(proof.path,current)).toBe(proof.beforeText);
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
