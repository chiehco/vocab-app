import {expect,it,vi} from 'vitest';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {renderToStaticMarkup} from 'react-dom/server';
import {MemoryRouter} from 'react-router-dom';
import cards from './lv4U01NextApprovedCards.json';
import original from './lv4U01ApprovedCards.json';
import seven from './lv4U01SupplementCards.json';
import proof from '../../../docs/lv4-releases-20261125/U01-next-pairs.json';
import originalResolver from '../../../docs/lv4-releases-20261122/resolver-U01.json';
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

it('adds four exact approved narrow-sense bindings to the immutable17 and seven, totaling28 unique U01 entries',()=>{
 expect(cards).toEqual(proof.cards);
 expect(cards.map(c=>[c.displayWord,c.learningItemId,c.officialWordId,c.illustratedSensePos,c.illustratedMeaningZh])).toEqual([
  ['physics','LI-LV4U01-V031','W003744','n.','物理學'],
  ['physicist','LI-LV4U01-V032','W003743','n.','物理學家'],
  ['district','LI-LV4U01-V034','W003313','n.','行政區'],
  ['labor','LI-LV4U01-V035','W003580','vi.','勞動；辛苦工作'],
 ]);
 expect(original).toHaveLength(17);expect(seven).toHaveLength(7);expect(cards).toHaveLength(4);
 const all=[...original,...seven,...cards];
 expect(all).toHaveLength(28);expect(new Set(all.map(c=>c.learningItemId)).size).toBe(28);
 for(const card of all)expect(approvedCurriculumItem(card.learningItemId)).toEqual(card);
 expect(proof.assets).toHaveLength(3);
 expect(cards[0].illustration.path).toBe(cards[1].illustration.path);
 expect(new Set(cards.map(c=>c.illustration.path)).size).toBe(3);
 expect(proof.userApproval.approvalSource).toBe('call_a930f384ee4a40108424233a10fcf163');
 expect(proof.userApproval.reply).toBe('三張圖、四組圖句都可用');expect(proof.newIds).toBe(0);
});

it('keeps the four original textbook rows, all six existing examples and all four formal word snapshots unchanged',()=>{
 const rawUnit=json('src/features/direct/curriculumLV4Unit1.json') as {learningItems:Array<Record<string,unknown>>};
 expect(proof.sourceItemsBefore).toHaveLength(4);expect(proof.formalExamplesBefore).toHaveLength(6);expect(proof.formalWordsBefore).toHaveLength(4);
 for(const saved of proof.sourceItemsBefore)expect(rawUnit.learningItems.find(r=>r.learningItemId===saved.learningItemId)).toEqual(saved);
 const examples=json('public/data/v1/examples.json') as Array<{exampleId:string}>;
 for(const saved of proof.formalExamplesBefore)expect(examples.find(r=>r.exampleId===saved.exampleId)).toEqual(saved);
 const words=json('public/data/v1/words.json') as Array<{wordId:string}>;
 for(const saved of proof.formalWordsBefore)expect(words.find(r=>r.wordId===saved.wordId)).toEqual(saved);
 expect(proof.protectedSourceHashMethod).toContain('CRLF normalized to LF');
 for(const [path,sha]of Object.entries(proof.protectedSourceLfHashes))expect(hash(readFileSync(path,'utf8').replaceAll('\r\n','\n'))).toBe(sha);
 const labor=cards.find(c=>c.displayWord==='labor')!;
 expect(labor.sourcePos).toBe('n./vi.');expect(labor.sourceMeaningZh).toBe('勞動；勞力；分娩；勞動；工作');
 expect(labor.sensePos).toBe('vi.');expect(labor.targetMeaningZh).toBe('勞動；辛苦工作');
 const unit=findUnit(1,'LV4')!;expect(unit.deliveryMode).toBe('text_only');expect(unit.questions).toEqual([]);
 expect(unit.items.every(i=>i.practiceMode==='read_only')).toBe(true);
});

it('authenticates and reverses only the two new resolver edits before the existing seven-pair and original U01 inverses',()=>{
 const current=beforeMorningResolverSource(proof.path,readFileSync(proof.path,'utf8').replaceAll('\r\n','\n'));
 expect(hash(current)).toBe(proof.afterLfSha256);expect(current).toBe(proof.afterText);
 expect(current.split(proof.importLine)).toHaveLength(2);expect(current.split(proof.afterSpread)).toHaveLength(2);
 const exact35=current.replace(proof.importLine,'').replace(proof.afterSpread,proof.beforeSpread);
 expect(exact35).toBe(proof.beforeText);expect(hash(exact35)).toBe(proof.beforeLfSha256);
 expect(hash(beforeLV4ResolverSource(proof.path,current))).toBe(originalResolver.beforeLfSha256);
 expect(beforeLV4ResolverSource(proof.path,current)).toBe(beforeLV4ResolverSource(proof.path,exact35));
 expect(()=>beforeLV4ResolverSource(proof.path,current+'\n// unauthenticated drift\n')).toThrow();
});

it.each(cards)('uses $displayWord as its exact general-card default and renders its approved textbook image and bilingual captions',card=>{
 const source=findUnit(1,'LV4')!.items.find(i=>i.learningItemId===card.learningItemId)!;
 expect(source).toMatchObject({displayWord:card.displayWord,officialWordId:card.officialWordId,sensePos:card.sourcePos,targetMeaningZh:card.sourceMeaningZh});
 expect(source.illustration).toBeUndefined();
 expect(card.purpose).toBe('教材卡／一般字卡');expect(card.secondaryOnGeneralCard).toBe(false);
 expect(card.sensePos).toBe(card.illustratedSensePos);expect(card.targetMeaningZh).toBe(card.illustratedMeaningZh);
 expect(card.imageQuizAllowed).toBe(false);expect(canUsePicturePrompt(card.officialWordId,card.displayWord)).toBe(false);
 expect(approvedWordIllustration(card.displayWord,card.officialWordId)).toEqual(card.illustration);
 expect(approvedCurriculumItem(card.learningItemId)).toEqual(card);
 expect(approvedCurriculumCards(card.displayWord,card.officialWordId)).toEqual([card]);
 expect(approvedCurriculumCards(card.displayWord,'W999999')).toEqual([]);
 const src=getWordBeastAsset(card.officialWordId,card.displayWord)!;expect(src).toContain('/'+card.illustration.path);
 expect(resolveWordImageClue(card.displayWord,src,'unrelated legacy caption')?.text).toBe(card.illustration.captionZh);
 const bytes=readFileSync('public/'+card.illustration.path);
 expect(bytes.subarray(0,4).toString()).toBe('RIFF');expect(bytes.subarray(8,12).toString()).toBe('WEBP');
 expect(hash(bytes)).toBe(card.approval.publishedSha256);
 expect(hash(card.illustration.captionEn+'\n'+card.illustration.captionZh)).toBe(card.approval.captionSha256);
 const html=renderToStaticMarkup(<MemoryRouter initialEntries={['/vocabulary?level=LV4&unit=1&kind=vocabulary&item='+card.learningItemId]}><VocabularyScreen/></MemoryRouter>);
 expect(html).toContain(card.illustration.path);expect(html).toContain(escape(card.illustration.captionEn));expect(html).toContain(escape(card.illustration.captionZh));
 expect(html).toContain(escape(card.illustratedMeaningZh));
});
