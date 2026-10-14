import 'fake-indexeddb/auto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import source3 from '../../../scripts/sources/LV4Unit3.json';
import source4 from '../../../scripts/sources/LV4Unit4.json';
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

for (const [source, count, usage, mapped] of [[source3,106,40,89],[source4,123,43,105]] as const) {
  const unit=findUnit(source.unit,'LV4')!;
  const vocabulary=unit.items.filter(i=>i.kind==='vocabulary');
  const rows=[...source.headwords,...source.related];
  it(`LV4 U${source.unit} preserves the complete checked text, nullable mappings and original printed scope`, () => {
    expect(unit.deliveryMode).toBe('text_only');
    expect(textbookUnits.find(u=>u.level==='LV4'&&u.unit===source.unit)).toMatchObject({count,usageCount:usage});
    expect(vocabulary.map(i=>[i.displayWord,i.sourcePage,i.sourceRole,i.sensePos,i.chapterMeaningsZh,i.officialWordId]))
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
  it(`LV4 U${source.unit} installs every mapped word in an empty DB without a full dictionary fetch`, async () => {
    vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(pack))));
    await ensureContentAvailable();
    const group=templateGroup(unit.templateId), ids=groupWordIds(group);
    expect(validGroup(group)).toBe(true);
    expect(group.itemIds).toHaveLength(count+usage);
    expect(ids).toHaveLength(mapped);
    expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);
    expect(resolveGroupWords(group,await contentDb.words.toArray())).toHaveLength(mapped);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('sa-pack.json');
  });
}

it('retains visually verified boundaries and fixes the raw draft spelling, continuation and supplement mistakes',()=>{
  expect(source3.headwords.filter(r=>r.printedNumber).map(r=>r.printedNumber)).toEqual(Array.from({length:28},(_,i)=>i+1));
  expect(source4.headwords.filter(r=>r.printedNumber).map(r=>r.printedNumber)).toEqual(Array.from({length:25},(_,i)=>i+1));
  expect(source3.photos.map(p=>p.page)).toEqual(Array.from({length:10},(_,i)=>i+23));
  expect(source4.photos.map(p=>p.page)).toEqual(Array.from({length:10},(_,i)=>i+33));
  expect(source3.boundaryEvidence).toMatchObject({nextUnitPage:33,nextUnitPrintedUnit:'Unit 04',missingPages:[]});
  expect(source4.boundaryEvidence).toMatchObject({nextUnitPage:43,nextUnitPrintedUnit:'Unit 05',missingPages:[]});
  const u3=findUnit(3,'LV4')!.items,u4=findUnit(4,'LV4')!.items;
  expect(u3.find(i=>i.displayWord==='anniversary')).toMatchObject({sourcePage:29,sourceRole:'unnumbered_headword',printedNumber:null});
  expect(u3.find(i=>i.displayWord==='disappointment')).toMatchObject({sourcePage:30});
  expect(u4.find(i=>i.displayWord==='intend')).toMatchObject({sourcePage:35,printedNumber:7,sensePos:'vt.'});
  expect(u4.find(i=>i.displayWord==='intent')).toMatchObject({sourcePage:35,sourceRole:'related',sensePos:'adj.'});
  expect(u4.find(i=>i.displayWord==='financial')).toMatchObject({sourcePage:36,sourceRole:'unnumbered_headword'});
  expect(u4.find(i=>i.displayWord==='company')).toMatchObject({sourcePage:37,sourceRole:'related'});
  expect(u4.find(i=>i.displayWord==='preservative')).toMatchObject({sourcePage:39,sourceRole:'related',officialWordId:null});
  expect(u4.find(i=>i.displayWord==='minister')).toMatchObject({sourcePage:42,printedNumber:24});
});
