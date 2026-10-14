import 'fake-indexeddb/auto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import source13 from '../../../scripts/sources/LV4Unit13.json';
import source14 from '../../../scripts/sources/LV4Unit14.json';
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

for (const [source, count, usage, mapped] of [[source13,138,39,97],[source14,127,52,90]] as const) {
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

it('keeps visually checked U13/U14 boundaries, headword roles and annotations',()=>{
  for (const source of [source13,source14]) {
    expect(source.headwords).toHaveLength(46);
    const pages=source.related.map(r=>r.sourcePage);
    expect(pages).toEqual([...pages].sort((a,b)=>a-b));
  }
  for (const [source,numbered,start,end,next] of [[source13,32,137,148,149],[source14,38,149,159,161]] as const) {
    expect(source.headwords.filter(r=>r.printedNumber).map(r=>r.printedNumber)).toEqual(Array.from({length:numbered},(_,i)=>i+1));
    expect(source.photos.map(p=>p.page)).toEqual(Array.from({length:end-start+1},(_,i)=>i+start));
    expect(source.boundaryEvidence).toMatchObject({nextUnitPage:next,missingPages:[]});
  }
  expect(source14.boundaryEvidence).toMatchObject({notesPage:160,nextUnitPrintedUnit:'Unit 15'});
  const u13=findUnit(13,'LV4')!.items,u14=findUnit(14,'LV4')!.items;
  expect(u13.find(i=>i.displayWord==='chewing gum')).toMatchObject({sourcePage:147,sourceRole:'related',officialWordId:null,chapterMeaningsZh:'口香糖'});
  expect(u13.find(i=>i.kind==='grammar'&&i.pattern==='give off...')).toMatchObject({sourcePage:144,explanationZh:'釋放／排放（氣體）。'});
  expect(u14.filter(i=>i.displayWord==='obstacle').map(i=>i.sourceRole)).toEqual(['unnumbered_headword','related']);
  expect(groupWordIds(templateGroup(findUnit(14,'LV4')!.templateId)).filter(id=>id===u14.find(i=>i.displayWord==='obstacle')!.officialWordId)).toHaveLength(1);
  expect(u14.find(i=>i.displayWord==='courageous')).toMatchObject({sourcePage:159,printedNumber:38,sourceRole:'main'});
  expect(u14.find(i=>i.displayWord==='fantasy')).toMatchObject({sourcePage:158,sourceRole:'unnumbered_headword'});
  expect(u14.find(i=>i.displayWord==='presidency')).toMatchObject({sourcePage:155,sourceRole:'related'});
});
