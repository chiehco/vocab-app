import {beforeEach,expect,it,vi} from 'vitest';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {renderToStaticMarkup} from 'react-dom/server';
import {MemoryRouter,Route,Routes} from 'react-router-dom';
import {useLiveQuery} from 'dexie-react-hooks';
import cards from './lv1U16ExampleImages.json';
import pride from './lv2U27ExampleImages.json';
import words from '../../../public/data/v1/words.json';
import examples from '../../../public/data/v1/examples.json';
import WordDetailScreen from '../browser/WordDetailScreen';
import {approvedWordIllustration,approvedCurriculumIllustration} from './approvedCurriculum';
import {getWordBeastAsset} from '../wordbeast/wordBeastAssets';
vi.mock('dexie-react-hooks',()=>({useLiveQuery:vi.fn()}));
vi.mock('../modes/useStudyBookmark',()=>({useStudyBookmark:vi.fn()}));
vi.mock('../../hooks/useCardPronunciation',()=>({useCardPronunciation:vi.fn()}));
vi.mock('../wordbeast/useIllustrationMedia',()=>({useIllustrationMedia:vi.fn()}));
beforeEach(()=>vi.clearAllMocks());
it('binds exactly three reviewed examples and preserves pride',()=>{
 expect(cards.map(c=>[c.word,c.exampleId])).toEqual([['guess','EXb14d23b8'],['lake','EX86662182'],['pond','EXe0f6bf82']]);
 for(const c of cards){
  expect(words.find(w=>w.wordId===c.officialWordId)?.word).toBe(c.word);
  expect(examples.find(e=>e.exampleId===c.exampleId)).toMatchObject({word:c.word,sensePos:c.sensePos,status:'reviewed',sentenceEn:c.illustration.captionEn,sentenceZh:c.illustration.captionZh});
  const bytes=readFileSync('public/'+c.illustration.path);
  expect(bytes.subarray(0,4).toString()).toBe('RIFF');expect(bytes.subarray(8,12).toString()).toBe('WEBP');
  expect(c.illustration.path).toContain(createHash('sha256').update(bytes).digest('hex').slice(0,12));
  const url=getWordBeastAsset(c.officialWordId,c.word)!;
  expect(url).toContain(c.illustration.path+'?v=');expect(approvedWordIllustration(c.word,c.officialWordId)).toEqual(c.illustration);
  expect(approvedCurriculumIllustration(c.word,url)).toEqual(c.illustration);
  expect(approvedWordIllustration(c.word,'wrong-id')).toBeUndefined();
  expect(approvedCurriculumIllustration('wrong-word',url)).toBeUndefined();
  expect(approvedCurriculumIllustration(c.word,'/unrelated.webp')).toBeUndefined();
 }
 expect(approvedWordIllustration('pride','W001666')).toEqual(pride[0].illustration);
});
it.each(cards)('renders $word with the exact source caption (SSR, not browser acceptance)',c=>{
 const word=words.find(w=>w.wordId===c.officialWordId)!,example=examples.find(e=>e.exampleId===c.exampleId)!;
 vi.mocked(useLiveQuery).mockReturnValue(undefined).mockReturnValueOnce(undefined).mockReturnValueOnce(word).mockReturnValueOnce([]).mockReturnValueOnce([]).mockReturnValueOnce([example]).mockReturnValueOnce([]).mockReturnValueOnce([]).mockReturnValueOnce([]).mockReturnValueOnce([]);
 const html=renderToStaticMarkup(<MemoryRouter initialEntries={['/word/'+c.officialWordId]}><Routes><Route path="/word/:wordId" element={<WordDetailScreen/>}/></Routes></MemoryRouter>);
 expect(html).toContain(c.illustration.path);expect(html).toContain(c.illustration.captionEn);expect(html).toContain(c.illustration.captionZh);expect(html).not.toContain('圖片尚未收錄');
});
