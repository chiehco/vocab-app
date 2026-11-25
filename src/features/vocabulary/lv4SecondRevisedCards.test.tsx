import {expect,it,vi} from 'vitest';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {renderToStaticMarkup} from 'react-dom/server';
import {MemoryRouter} from 'react-router-dom';
import cards from './lv4SecondRevisedCards.json';
import proof from '../../../docs/lv4-releases-20261125/U13-U16-approved-revisions.json';
import {approvedCurriculumCards,approvedCurriculumItem,approvedWordIllustration} from './approvedCurriculum';
import {beforeLV4ResolverSource,beforeSecondRevisedResolverSource} from '../direct/lv4Published.testSupport';
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
it('accepts only the four final approved revisions, including the corrected humanity sleeves',()=>{
 expect(cards).toEqual(proof.cards);expect(cards).toHaveLength(4);expect(proof.assets).toHaveLength(4);expect(proof.newIds).toBe(0);
 expect(cards.map(c=>c.reviewId)).toEqual(['U13-04','U14-03','U16-02','U16-03']);expect(proof.userApproval.pendingExcludedIds).toEqual([]);
 expect(cards[0].approval.source).toBe('call_43187defd22e4569a91e91f5f20a11d2');expect(cards[0].approval.reply).toBe('humanity這張可用');
 expect(cards[0].approval.originalPngSha256).toBe('09a3c569e3e66c4e7772641ff832e6d3f8e06812326461235c714c60ccaa3754');
 for(const c of cards.slice(1))expect(c.approval.source).toBe('call_7f7d350c347d40e0af123dd93b107164');
 expect(proof.units).toEqual([13,14,16]);
});
it('preserves prior textbook data, words, formal examples, all old registries and practice counts',()=>{
 for(const [path,sha]of Object.entries(proof.protectedSourceLfHashes))expect(hash(readFileSync(path,'utf8').replaceAll('\r\n','\n'))).toBe(sha);
 const units=unitsFor({track:'7000',publisher:'ivy',volume:'LV4'});
 for(const u of proof.practiceBaseline)expect(units.find(x=>x.unit===u.unit)!.wordIds).toHaveLength(u.practice);
 for(const old of proof.runtimeBefore){expect(old.primary).toBeNull();expect(old.existingApprovedItem).toBeNull();}
});
it('reverses only the authenticated four-revision registry addition and rejects unrelated resolver changes',()=>{
 const current=readFileSync(proof.path,'utf8').replaceAll('\r\n','\n');
 expect(current).toBe(proof.afterText);expect(hash(current)).toBe(proof.afterLfSha256);
 expect(beforeSecondRevisedResolverSource(proof.path,current)).toBe(proof.beforeText);
 expect(beforeLV4ResolverSource(proof.path,current)).toBe(beforeLV4ResolverSource(proof.path,proof.beforeText));
 expect(()=>beforeLV4ResolverSource(proof.path,current+'\n// unrelated change\n')).toThrow();
 expect(()=>beforeLV4ResolverSource(proof.path,current.replace(proof.afterSpread,proof.beforeSpread))).toThrow();
});
it.each(cards)('binds $reviewId $displayWord to the final exact approved image and captions',card=>{
 expect(approvedCurriculumItem(card.learningItemId)).toEqual(card);
 expect(approvedCurriculumCards(card.displayWord,card.officialWordId)).toContainEqual(card);expect(approvedCurriculumCards(card.displayWord,'W999999')).toEqual([]);
 expect(card.sensePos).toBe(card.illustratedSensePos);expect(card.targetMeaningZh).toBe(card.illustratedMeaningZh);
 expect(card.approval.artApproved&&card.approval.pairApproved).toBe(true);expect(card.secondaryOnGeneralCard).toBe(false);
 expect(approvedWordIllustration(card.displayWord,card.officialWordId)).toEqual(card.illustration);expect(getWordBeastAsset(card.officialWordId,card.displayWord)).toContain(card.illustration.path);expect(canUsePicturePrompt(card.officialWordId,card.displayWord)).toBe(false);
 expect(resolveWordImageClue(card.displayWord,'/vocab-app/'+card.illustration.path,'unrelated caption')?.text).toBe(card.illustration.captionZh);
 expect(hash(readFileSync('public/'+card.illustration.path))).toBe(card.approval.publishedSha256);expect(hash(card.illustration.captionEn+'\n'+card.illustration.captionZh)).toBe(card.approval.captionSha256);
 const n=Number(card.unitName.split(' ').at(-1));const html=renderToStaticMarkup(<MemoryRouter initialEntries={[`/vocabulary?level=LV4&unit=${n}&kind=vocabulary&item=${card.learningItemId}`]}><VocabularyScreen/></MemoryRouter>);
 expect(html).toContain(card.illustration.path);expect(html).toContain(escape(card.illustration.captionEn));expect(html).toContain(escape(card.illustration.captionZh));expect(html).toContain(escape(card.illustratedMeaningZh));
});
