import {expect,it,vi} from 'vitest';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {renderToStaticMarkup} from 'react-dom/server';
import {MemoryRouter} from 'react-router-dom';
import cards from './lv4ThirdMiddleApprovedCards.json';
import proof from '../../../docs/lv4-releases-20261126/U11-U16-third-middle-approved.json';
import {approvedCurriculumCards,approvedCurriculumItem,approvedWordIllustration} from './approvedCurriculum';
import {beforeLV4ResolverSource,beforeThirdMiddleResolverSource,beforeThirdTailResolverSource} from '../direct/lv4Published.testSupport';
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

it('binds24 approved third-middle pairs, explicit outcome v3 and4 exact prior reuses',()=>{
 expect(cards).toEqual(proof.cards);expect(cards).toHaveLength(28);
 expect(new Set(cards.map(c=>c.learningItemId)).size).toBe(28);
 expect(new Set(cards.map(c=>c.officialWordId)).size).toBe(28);
 expect(proof.assets).toHaveLength(23);expect(proof.newIds).toBe(0);
 expect(proof.userApproval).toMatchObject({decision:'D-127',newApprovedPairs:24,existingExactReuses:4,pendingExcludedIds:[]});
 expect(proof.userApproval.reply).toContain('另外兩張也通過');
 expect(cards.filter(c=>c.secondaryOnGeneralCard).map(c=>c.displayWord)).toEqual(['allowance','outstanding','landscape','mineral']);
 expect(proof.units).toEqual([11,12,13,14,15,16]);
 const outcome=cards.find(c=>c.displayWord==='outcome')!;
 expect(outcome.approval.originalPngSha256).toBe('8157beee78b3c7a1ef9c44b8592ac86462a1de1c105c050b4bc6f68217fc0e70');expect(outcome.approval.source).toContain('outcome-v3');
 const wit=cards.find(c=>c.displayWord==='wit')!,costume=cards.find(c=>c.displayWord==='costume')!;
 expect(wit.illustration.captionEn).toBe('She uses her wits to retrieve the keys with a magnet.');
 expect(costume.illustration.captionEn).toBe('For the Halloween party, she dressed up in a witch costume.');
 expect(costume.illustration.captionZh).toBe('為了萬聖節派對，她穿上了女巫的服裝。');
 const a=cards.find(c=>c.displayWord==='violate')!,b=cards.find(c=>c.displayWord==='violation')!;
 expect(a.illustration.path).toBe(b.illustration.path);expect(a.officialWordId).not.toBe(b.officialWordId);expect(a.illustration.captionEn).not.toBe(b.illustration.captionEn);
 for(const c of cards)expect(c.illustration.captionEn).not.toMatch(/\b(Amy|John|Mary|Tom|Peter)\b/);
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
 const current=beforeThirdTailResolverSource(proof.path,readFileSync(proof.path,'utf8').replaceAll('\r\n','\n'));
 expect(current).toBe(proof.afterText);expect(hash(current)).toBe(proof.afterLfSha256);
 expect(beforeThirdMiddleResolverSource(proof.path,current)).toBe(proof.beforeText);
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
