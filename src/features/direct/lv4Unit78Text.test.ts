import 'fake-indexeddb/auto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import source7 from '../../../scripts/sources/LV4Unit7.json';
import source8 from '../../../scripts/sources/LV4Unit8.json';
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

for (const [source, count, usage, mapped] of [[source7,118,48,95],[source8,121,54,98]] as const) {
  const unit=findUnit(source.unit,'LV4')!;
  const rows=[...source.headwords,...source.related];
  it(`LV4 U${source.unit} preserves checked source meanings and pages without adopting pending practice`, () => {
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
  it(`LV4 U${source.unit} resolves all cards after an empty one-fetch installation`, async () => {
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

it('retains distinct content headwords, true blue/black roles and the repaired U8 boundary',()=>{
  expect(source7.headwords.filter(r=>r.printedNumber).map(r=>r.printedNumber)).toEqual(Array.from({length:32},(_,i)=>i+1));
  expect(source8.headwords.filter(r=>r.printedNumber).map(r=>r.printedNumber)).toEqual(Array.from({length:35},(_,i)=>i+1));
  expect(source7.photos.map(p=>p.page)).toEqual(Array.from({length:11},(_,i)=>i+67));
  expect(source8.photos.map(p=>p.page)).toEqual(Array.from({length:12},(_,i)=>i+79));
  expect(source7.boundaryEvidence).toMatchObject({nextUnitPage:79,nextUnitPrintedUnit:'Unit 08',notesPage:78,missingPages:[]});
  expect(source8.boundaryEvidence).toMatchObject({nextUnitPage:91,nextUnitPrintedUnit:'Unit 09',missingPages:[]});
  expect(source8.photos.find(p=>p.page===89)?.path).toContain('補拍_P.89.jpg');
  const u7=findUnit(7,'LV4')!.items,u8=findUnit(8,'LV4')!.items;
  const content=u7.filter(i=>i.displayWord==='content');
  expect(content.map(i=>[i.sourcePage,i.sensePos,i.sourceRole])).toEqual([[67,'adj./n./vt.','main'],[68,'n.','unnumbered_headword']]);
  expect(new Set(content.map(i=>i.officialWordId)).size).toBe(1);
  expect(new Set(content.map(i=>i.learningItemId)).size).toBe(2);
  expect(u7.find(i=>i.displayWord==='zip code')).toMatchObject({sourcePage:72,sourceRole:'unnumbered_headword',officialWordId:null});
  expect(source7.usage.some(r=>r.parentWord==='constitute')).toBe(false);
  expect(u8.find(i=>i.displayWord==='attached')).toMatchObject({sourcePage:84,sourceRole:'related',officialWordId:null});
  expect(u8.find(i=>i.displayWord==='attachment')).toMatchObject({sourcePage:84,sourceRole:'unnumbered_headword'});
});
