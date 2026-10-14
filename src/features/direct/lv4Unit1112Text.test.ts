import 'fake-indexeddb/auto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import source11 from '../../../scripts/sources/LV4Unit11.json';
import source12 from '../../../scripts/sources/LV4Unit12.json';
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

for (const [source, count, usage, mapped] of [[source11,103,38,74],[source12,143,47,112]] as const) {
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

it('keeps actual printed boundaries, repeated psychology roles and separate protest frames',()=>{
  expect(source11.headwords).toHaveLength(46);
  expect(source12.headwords).toHaveLength(47);
  for(const [source,numbered] of [[source11,30],[source12,38]] as const) {
    expect(source.headwords.filter(r=>r.printedNumber).map(r=>r.printedNumber)).toEqual(Array.from({length:numbered},(_,i)=>i+1));
  }
  expect(source11.photos.map(p=>p.page)).toEqual(Array.from({length:10},(_,i)=>i+113));
  expect(source12.photos.map(p=>p.page)).toEqual(Array.from({length:13},(_,i)=>i+123));
  expect(source11.boundaryEvidence).toMatchObject({nextUnitPage:123,nextUnitPrintedUnit:'Unit 12',missingPages:[]});
  expect(source12.boundaryEvidence).toMatchObject({nextUnitPage:137,nextUnitPrintedUnit:'Unit 13',notesPage:136,missingPages:[]});
  const u11=findUnit(11,'LV4')!.items,u12=findUnit(12,'LV4')!.items;
  expect(u11.filter(i=>i.displayWord==='psychology').map(i=>i.sourceRole)).toEqual(['main','related']);
  expect(u11.filter(i=>i.displayWord==='psychologist').map(i=>i.sourceRole)).toEqual(['unnumbered_headword','related']);
  expect(u11.find(i=>i.displayWord==='frail')).toMatchObject({sourcePage:121,sensePos:'adj.',chapterMeaningsZh:'虛弱的'});
  expect(u12.filter(i=>i.displayWord==='protest').map(i=>[i.sourcePage,i.sensePos,i.sourceRole]))
    .toEqual([[124,'vt./vi.','main'],[125,'n.','unnumbered_headword']]);
  expect(new Set(u12.filter(i=>i.displayWord==='protest').map(i=>i.learningItemId)).size).toBe(2);
  expect(groupWordIds(templateGroup(findUnit(12,'LV4')!.templateId)).filter(id=>id===u12.find(i=>i.displayWord==='protest')!.officialWordId)).toHaveLength(1);
  expect(u12.find(i=>i.displayWord==='grind')?.chapterMeaningsZh).toContain('書呆子');
  expect(u12.find(i=>i.displayWord==='ground')).toMatchObject({sourcePage:129,sensePos:'n./vt.',chapterMeaningsZh:'土地；使某人禁足；使停飛'});
  expect(u12.find(i=>i.displayWord==='calligraphy')).toMatchObject({sourcePage:130,sourceRole:'related'});
});

