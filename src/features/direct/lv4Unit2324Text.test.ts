import 'fake-indexeddb/auto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import source23 from '../../../scripts/sources/LV4Unit23.json';
import source24 from '../../../scripts/sources/LV4Unit24.json';
import pack from '../../../public/data/v1/sa-pack.json';
import { allQuestions, findUnit, templateGroup, validGroup } from './model';
import { groupWordIds, resolveGroupWords } from './groupScope';
import { textbookUnits } from '../vocabulary/textbookCatalog';
import { practiceIds, reviewedExample } from '../vocabulary/model';
import { contentDb } from '../../db/contentDb';
import { progressDb } from '../../db/progressDb';
import { ensureContentAvailable } from '../../db/seed';

beforeEach(async () => {
  await Promise.all([...contentDb.tables, ...progressDb.tables].map(table => table.clear()));
});
afterEach(() => vi.unstubAllGlobals());

for (const [source, count, usage, mapped] of [[source23,117,44,93],[source24,104,38,84]] as const) {
  const unit=findUnit(source.unit,'LV4')!;
  const rows=[...source.headwords,...source.related];
  it(`LV4 U${source.unit} keeps source scope and disables pending textbook practice`, () => {
    expect(unit.deliveryMode).toBe('text_only');
    expect(textbookUnits.find(u=>u.level==='LV4'&&u.unit===source.unit)).toMatchObject({count,usageCount:usage});
    expect(unit.items.filter(i=>i.kind==='vocabulary').map(i=>[i.displayWord,i.sourcePage,i.sourceRole,i.sensePos,i.chapterMeaningsZh,i.officialWordId]))
      .toEqual(rows.map(r=>[r.word,r.sourcePage,r.role,r.sourcePos,r.chapterMeaningsZh,r.officialWordId]));
    expect(unit.items.filter(i=>i.kind==='grammar').map(i=>[i.pattern,i.sourcePage,i.explanationZh]))
      .toEqual(source.usage.map(r=>[r.label,r.sourcePage,r.explanationZh]));
    expect(new Set(unit.items.map(i=>i.learningItemId)).size).toBe(count+usage);
    expect(unit.questions).toEqual([]);
    expect(practiceIds(unit.items)).toEqual([]);
    expect(unit.items.every(i=>!i.illustration&&!i.originalExample&&!i.officialSenseId&&!reviewedExample(i))).toBe(true);
    expect(allQuestions.some(q=>unit.items.some(i=>i.learningItemId===q.learningItemId))).toBe(false);
    for (const row of rows.filter(r=>r.officialWordId)) {
      expect(pack.words.find(w=>w.wordId===row.officialWordId)?.word).toBe(row.word);
    }
  });
  it(`LV4 U${source.unit} resolves every formal card after a one-fetch empty installation`, async () => {
    vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(pack))));
    await ensureContentAvailable();
    const group=templateGroup(unit.templateId),ids=groupWordIds(group);
    expect(validGroup(group)).toBe(true);
    expect(group.itemIds).toHaveLength(count+usage);
    expect(ids).toHaveLength(mapped);
    expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);
    expect(resolveGroupWords(group,await contentDb.words.toArray())).toHaveLength(mapped);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('sa-pack.json');
  });
}

it('keeps checked U23/U24 body coverage and printed numbering',()=>{
  expect(source23.headwords).toHaveLength(47);
  expect(source23.headwords.filter(r=>r.printedNumber).map(r=>r.printedNumber)).toEqual(Array.from({length:42},(_,i)=>i+1));
  expect(source23.photos.map(p=>p.page)).toEqual(Array.from({length:10},(_,i)=>i+247));
  expect(source23.boundaryEvidence.missingPages).toEqual([]);
  expect(source24.headwords).toHaveLength(46);
  expect(source24.headwords.filter(r=>r.printedNumber).map(r=>r.printedNumber)).toEqual(Array.from({length:40},(_,i)=>i+1));
  expect(source24.photos.map(p=>p.page)).toEqual(Array.from({length:10},(_,i)=>i+257));
  expect(source24.boundaryEvidence.missingPages).toEqual([]);
  expect(source23.photos.find(p=>p.page===249)?.path).toContain('2-Photo-2.jpg');
  expect(source24.boundaryEvidence).toMatchObject({endOfVocabularyBody:true,bodyEndPage:266,lastNumberedHeadword:40,lastHeadword:'nutritious',nextUnitPage:null,nextSection:'alphabetical_vocabulary_index'});
  expect(findUnit(23,'LV4')!.items.find(i=>i.displayWord==='surgery')).toMatchObject({sourcePage:249,sourceRole:'unnumbered_headword'});
  expect(findUnit(24,'LV4')!.items.find(i=>i.displayWord==='nutritious')).toMatchObject({sourcePage:266,printedNumber:40,sourceRole:'main'});
});
