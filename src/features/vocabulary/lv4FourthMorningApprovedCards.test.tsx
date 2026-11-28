import {expect,it,vi} from 'vitest';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {renderToStaticMarkup} from 'react-dom/server';
import {MemoryRouter} from 'react-router-dom';
import cards from './lv4FourthMorningApprovedCards.json';
import proof from '../../../docs/lv4-releases-20261128/U01-U10-fourth-morning-approved.json';
import {approvedCurriculumCards,approvedCurriculumItem,approvedWordIllustration} from './approvedCurriculum';
import {beforeLV4ResolverSource,beforeFourthMorningResolverSource} from '../direct/lv4Published.testSupport';
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

it('binds40 approved fourth-morning pairs, exact appropriate He edit and3 prior reuses',()=>{
 expect(cards).toEqual(proof.cards);expect(cards).toHaveLength(43);
 expect(new Set(cards.map(c=>c.learningItemId)).size).toBe(43);
 expect(new Set(cards.map(c=>c.officialWordId)).size).toBe(43);
 expect(proof.assets).toHaveLength(36);expect(proof.newIds).toBe(0);
 expect(proof.userApproval).toMatchObject({decision:'D-130',newApprovedPairs:40,existingExactReuses:3,pendingExcludedIds:[]});
 expect(proof.userApproval.reply).toContain('例句應改為He');
 expect(cards.filter(c=>c.secondaryOnGeneralCard).map(c=>c.displayWord)).toEqual(proof.runtimeBefore.filter(r=>r.primary!==null).map(r=>r.word));
 expect(proof.units).toEqual([1,2,3,4,5,6,7,8,9,10]);
 const appropriate=cards.find(c=>c.displayWord==='appropriate')!;
 expect(appropriate.illustration.captionEn).toBe('He wears appropriate clothes for the interview.');
 expect(appropriate.illustration.captionZh).toBe('他穿著合適的服裝參加面試。');
 expect(appropriate.approval.originalPngSha256).toBe('a5392c53ad202ab00ea619f6f432ce3502c49876eaa194bd6619508f4a9bff74');
 for(const [a,b]of [['assure','assurance'],['philosopher','philosophical'],['critical','critic'],['translation','translator']]){
  const first=cards.find(c=>c.displayWord===a)!,second=cards.find(c=>c.displayWord===b)!;
  expect(first.illustration.path).toBe(second.illustration.path);expect(first.officialWordId).not.toBe(second.officialWordId);expect(first.illustration.captionEn).not.toBe(second.illustration.captionEn);
 }
 for(const c of cards)expect(c.illustration.captionEn).not.toMatch(/\b(Amy|John|Mary|Tom|Peter)\b/);
});

it('preserves every protected source, all prior defaults, picture-prompt eligibility and practice count',()=>{
 for(const [path,sha]of Object.entries(proof.protectedSourceLfHashes))expect(hash(readFileSync(path,'utf8').replaceAll('\r\n','\n'))).toBe(sha);
 const units=unitsFor({track:'7000',publisher:'ivy',volume:'LV4'});
 for(const u of proof.practiceBaseline)expect(units.find(x=>x.unit===u.unit)!.wordIds).toHaveLength(u.practice);
 for(const card of cards.filter(c=>proof.runtimeBefore.find(r=>r.learningItemId===c.learningItemId)?.primary!==null)){
  const old=proof.runtimeBefore.find(r=>r.learningItemId===card.learningItemId)!;
  expect(approvedWordIllustration(card.displayWord,card.officialWordId)).toEqual(old.primary);
  expect(canUsePicturePrompt(card.officialWordId,card.displayWord)).toBe(old.pictureAllowed);
 }
});

it('reverses only the authenticated additive import/spread and rejects unrelated resolver edits',()=>{
 const current=readFileSync(proof.path,'utf8').replaceAll('\r\n','\n');
 expect(current).toBe(proof.afterText);expect(hash(current)).toBe(proof.afterLfSha256);
 expect(beforeFourthMorningResolverSource(proof.path,current)).toBe(proof.beforeText);
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
