import 'fake-indexeddb/auto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import source22 from '../../../scripts/sources/LV5Unit22.json';
import pack from '../../../public/data/v1/sa-pack.json';
import { allQuestions, findUnit, templateGroup, validGroup } from './model';
import { groupWordIds, resolveGroupWords } from './groupScope';
import { textbookUnits } from '../vocabulary/textbookCatalog';
import { practiceIds, reviewedExample } from '../vocabulary/model';
import { contentDb } from '../../db/contentDb';
import { progressDb } from '../../db/progressDb';
import { ensureContentAvailable } from '../../db/seed';
beforeEach(async()=>{await Promise.all([...contentDb.tables,...progressDb.tables].map(t=>t.clear()));});
afterEach(()=>vi.unstubAllGlobals());
for(const [source,vocab,usage,mapped] of [[source22,101,42,72]] as const){
  const unit=findUnit(source.unit,'LV5')!;
  it(`LV5 U${source.unit} retains checked book fields and excludes unapproved textbook practice`,()=>{
    const rows=[...source.headwords,...source.related];
    expect(unit.deliveryMode).toBe('text_only');
    expect(textbookUnits.find(u=>u.level==='LV5'&&u.unit===source.unit)).toMatchObject({count:vocab,usageCount:usage});
    expect(unit.items.filter(i=>i.kind==='vocabulary').map(i=>[i.displayWord,i.sourcePage,i.sourceRole,i.sensePos,i.chapterMeaningsZh,i.officialWordId]))
      .toEqual(rows.map(r=>[r.word,r.sourcePage,r.role,r.sourcePos,r.chapterMeaningsZh,r.officialWordId]));
    expect(unit.items.filter(i=>i.kind==='grammar').map(i=>[i.pattern,i.sourcePage,i.explanationZh]))
      .toEqual(source.usage.map(r=>[r.label,r.sourcePage,r.explanationZh]));
    expect(unit.items).toHaveLength(vocab+usage);
    expect(new Set(unit.items.map(i=>i.learningItemId)).size).toBe(vocab+usage);
    expect(unit.questions).toEqual([]);expect(practiceIds(unit.items)).toEqual([]);
    expect(unit.items.every(i=>i.practiceMode==='read_only'&&!i.illustration&&!i.originalExample&&!i.officialSenseId&&!reviewedExample(i))).toBe(true);
    expect(allQuestions.some(q=>unit.items.some(i=>i.learningItemId===q.learningItemId))).toBe(false);
    for(const row of rows.filter(r=>r.officialWordId))expect(pack.words.find(w=>w.wordId===row.officialWordId)?.word).toBe(row.word);
  });
  it(`LV5 U${source.unit} resolves every formal card from a fresh single-fetch lightweight bootstrap`,async()=>{
    vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(pack))));
    await ensureContentAvailable();
    const group=templateGroup(unit.templateId),ids=groupWordIds(group);
    expect(validGroup(group)).toBe(true);expect(group.itemIds).toHaveLength(vocab+usage);
    expect(ids).toHaveLength(mapped);expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);
    expect(resolveGroupWords(group,await contentDb.words.toArray())).toHaveLength(mapped);
    expect(fetch).toHaveBeenCalledTimes(1);expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('sa-pack.json');
  });
  it(`LV5 U${source.unit} retains every printed number and full body photograph`,()=>{
    const numbered=source.headwords.filter(r=>r.printedNumber).map(r=>r.printedNumber);
    expect(numbered).toEqual(Array.from({length:numbered.length},(_,i)=>i+1));
    expect(source.photos.map(p=>p.page)).toEqual(Array.from({length:source.sourcePages[1]-source.sourcePages[0]+1},(_,i)=>i+source.sourcePages[0]));
    expect(source.boundaryEvidence.missingPages).toEqual([]);
    expect(unit.items.every(i=>typeof i.sourcePage==='number'&&i.sourcePage>=source.sourcePages[0]&&i.sourcePage<=source.sourcePages[1])).toBe(true);
  });
}
