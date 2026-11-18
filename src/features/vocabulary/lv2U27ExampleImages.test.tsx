import { beforeEach, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import cards from './lv2U27ExampleImages.json';
import words from '../../../public/data/v1/words.json';
import examples from '../../../public/data/v1/examples.json';
import oldCards from './approvedExampleImages.json';
import WordDetailScreen from '../browser/WordDetailScreen';
import { approvedWordIllustration, approvedCurriculumIllustration } from './approvedCurriculum';
import { getWordBeastAsset } from '../wordbeast/wordBeastAssets';
vi.mock('dexie-react-hooks', () => ({ useLiveQuery: vi.fn() }));
vi.mock('../modes/useStudyBookmark', () => ({ useStudyBookmark: vi.fn() }));
vi.mock('../../hooks/useCardPronunciation', () => ({ useCardPronunciation: vi.fn() }));
vi.mock('../wordbeast/useIllustrationMedia', () => ({ useIllustrationMedia: vi.fn() }));
beforeEach(() => vi.clearAllMocks());
it('binds only the exact pride garden example and preserves unrelated historical approvals', () => {
 expect(cards).toHaveLength(1);
 const card=cards[0];
 expect(card).toMatchObject({officialWordId:'W001666',word:'pride',exampleId:'EX7938bf7f',sensePos:'n.'});
 expect(oldCards.map(c=>c.exampleId)).toEqual(['EX0577146b','EX24d99801','EX9ecb5a77']);
 const example=examples.find(e=>e.exampleId===card.exampleId)!;
 expect(example).toMatchObject({word:'pride',sentenceEn:card.illustration.captionEn,sentenceZh:card.illustration.captionZh,status:'reviewed'});
 expect(example.sentenceEn).toBe('My grandma takes great pride in her lovely little garden.');
 expect(examples.find(e=>e.exampleId==='EX9ab40440')).toMatchObject({sentenceEn:'The students felt great pride when their team won the science competition.',sentenceZh:'當隊伍贏得科學競賽時，學生們感到十分自豪。'});
 const bytes=readFileSync('public/'+card.illustration.path);
 expect(bytes.subarray(0,8).toString('hex')).toBe('89504e470d0a1a0a');
 expect([bytes.readUInt32BE(16),bytes.readUInt32BE(20)]).toEqual([1254,1254]);
 expect(createHash('sha256').update(bytes).digest('hex')).toBe('f6b6cbb0f0ab8a18590f1c28d528d209e46943c4729583d3d7a928379483c5d5');
 const url=getWordBeastAsset('W001666','pride')!;
 expect(url).toContain(card.illustration.path+'?v=');
 expect(approvedWordIllustration('pride','W001666')).toEqual(card.illustration);
 expect(approvedCurriculumIllustration('pride',url)).toEqual(card.illustration);
 expect(approvedWordIllustration('pride','W999999')).toBeUndefined();
 expect(approvedCurriculumIllustration('wrong-word',url)).toBeUndefined();
 expect(approvedCurriculumIllustration('pride','/unrelated.png')).toBeUndefined();
});
it('renders the real pride word card with its exact garden caption', () => {
 const card=cards[0],word=words.find(w=>w.wordId===card.officialWordId)!,example=examples.find(e=>e.exampleId===card.exampleId)!;
 vi.mocked(useLiveQuery).mockReturnValue(undefined)
  .mockReturnValueOnce(undefined).mockReturnValueOnce(word).mockReturnValueOnce([])
  .mockReturnValueOnce([]).mockReturnValueOnce([example]).mockReturnValueOnce([])
  .mockReturnValueOnce([]).mockReturnValueOnce([]).mockReturnValueOnce([]);
 const html=renderToStaticMarkup(<MemoryRouter initialEntries={['/word/W001666']}><Routes><Route path="/word/:wordId" element={<WordDetailScreen />} /></Routes></MemoryRouter>);
 expect(html).toContain(card.illustration.path);
 expect(html).toContain(card.illustration.captionEn);
 expect(html).toContain(card.illustration.captionZh);
 expect(html).not.toContain('圖片尚未收錄');
 expect(html).not.toContain('圖片／圖說對應：');
});

