import 'fake-indexeddb/auto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import source9 from '../../../scripts/sources/LV4Unit9.json';
import source10 from '../../../scripts/sources/LV4Unit10.json';
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

for (const [source, count, usage, mapped] of [[source9,119,35,85],[source10,115,47,82]] as const) {
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

it('preserves actual U10 head counts and the printed continuation and primary/supplement distinctions',()=>{
  expect(source9.headwords).toHaveLength(46);
  expect(source10.headwords).toHaveLength(45);
  for(const source of [source9,source10]) {
    expect(source.headwords.filter(r=>r.printedNumber).map(r=>r.printedNumber)).toEqual(Array.from({length:29},(_,i)=>i+1));
  }
  expect(source9.photos.map(p=>p.page)).toEqual(Array.from({length:10},(_,i)=>i+91));
  expect(source10.photos.map(p=>p.page)).toEqual(Array.from({length:11},(_,i)=>i+101));
  expect(source9.boundaryEvidence).toMatchObject({nextUnitPage:101,nextUnitPrintedUnit:'Unit 10',missingPages:[]});
  expect(source10.boundaryEvidence).toMatchObject({nextUnitPage:113,nextUnitPrintedUnit:'Unit 11',notesPage:112,missingPages:[]});
  const u9=findUnit(9,'LV4')!.items,u10=findUnit(10,'LV4')!.items;
  expect(u9.find(i=>i.displayWord==='authentic')).toMatchObject({sourcePage:98,sourceRole:'unnumbered_headword'});
  expect(u9.find(i=>i.displayWord==='annoying')).toMatchObject({sourcePage:100,sourceRole:'unnumbered_headword'});
  expect(u10.find(i=>i.displayWord==='restriction')).toMatchObject({sourcePage:105,printedNumber:15});
  expect(u10.find(i=>i.displayWord==='restrict')).toMatchObject({sourcePage:106,sourceRole:'related'});
  expect(u10.find(i=>i.displayWord==='illogical')).toMatchObject({sourcePage:108,sourceRole:'unnumbered_headword'});
  expect(u10.find(i=>i.displayWord==='admittance')).toMatchObject({sourcePage:109,sourceRole:'related',officialWordId:null});
  expect(u10.filter(i=>i.displayWord==='limit').map(i=>i.sensePos)).toEqual(['n.','vt.']);
});
