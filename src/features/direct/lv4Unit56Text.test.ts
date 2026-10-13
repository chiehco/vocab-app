import 'fake-indexeddb/auto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import source5 from '../../../scripts/sources/LV4Unit5.json';
import source6 from '../../../scripts/sources/LV4Unit6.json';
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

for (const [source, count, usage, mapped] of [[source5,134,43,100],[source6,117,50,92]] as const) {
  const unit=findUnit(source.unit,'LV4')!;
  const rows=[...source.headwords,...source.related];
  it(`LV4 U${source.unit} preserves complete checked provenance and keeps textbook practice disabled`, () => {
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
  it(`LV4 U${source.unit} opens every formal card in a fresh one-fetch installation`, async () => {
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

it('preserves printed U5/U6 boundaries, replacement page and distinct repeated source occurrences',()=>{
  expect(source5.headwords.filter(r=>r.printedNumber).map(r=>r.printedNumber)).toEqual(Array.from({length:33},(_,i)=>i+1));
  expect(source6.headwords.filter(r=>r.printedNumber).map(r=>r.printedNumber)).toEqual(Array.from({length:27},(_,i)=>i+1));
  expect(source5.photos.map(p=>p.page)).toEqual(Array.from({length:11},(_,i)=>i+43));
  expect(source6.photos.map(p=>p.page)).toEqual(Array.from({length:12},(_,i)=>i+55));
  expect(source5.boundaryEvidence).toMatchObject({nextUnitPage:55,nextUnitPrintedUnit:'Unit 06',notesPage:54,missingPages:[]});
  expect(source6.boundaryEvidence).toMatchObject({nextUnitPage:67,nextUnitPrintedUnit:'Unit 07',missingPages:[]});
  expect(source6.photos.find(p=>p.page===61)?.path).toContain('補拍_P.61.jpg');
  const u5=findUnit(5,'LV4')!.items,u6=findUnit(6,'LV4')!.items;
  expect(u5.find(i=>i.displayWord==='demonstration')).toMatchObject({sourcePage:48,sourceRole:'unnumbered_headword'});
  expect(u5.find(i=>i.displayWord==='occupied')).toMatchObject({sourcePage:43,sourceRole:'related',officialWordId:null});
  expect(u5.find(i=>i.displayWord==='demo')).toMatchObject({sourcePage:48,sourceRole:'related',officialWordId:null});
  expect(u6.find(i=>i.displayWord==='approve')?.chapterMeaningsZh).toContain('of');
  const intensive=u6.filter(i=>i.displayWord==='intensive');
  expect(intensive.map(i=>[i.sourcePage,i.sourceRole])).toEqual([[56,'unnumbered_headword'],[55,'related']]);
  expect(new Set(intensive.map(i=>i.officialWordId)).size).toBe(1);
  expect(new Set(intensive.map(i=>i.learningItemId)).size).toBe(2);
  expect(u6.filter(i=>i.displayWord==='comment').map(i=>i.sensePos)).toEqual(['vi.','n.']);
});
