import 'fake-indexeddb/auto';
import { afterAll, expect, it } from 'vitest';
import { contentDb } from './contentDb';
import type { ExampleRecord } from './types';

afterAll(()=>contentDb.delete());
it('returns consistent corrected examples through single and bulk reads without rewriting source rows',async()=>{
  const raw:ExampleRecord={exampleId:'EXeca05c9e',word:'passage',sensePos:'n.',meaningHint:null,
    exampleType:'exam',sentenceEn:'Read the following passage carefully and answer the questions below.',
    sentenceZh:'舊譯文',blankSentence:'old blank',answer:'passage',difficulty:'LV3',status:'reviewed'};
  await contentDb.examples.put(raw);
  const single=await contentDb.examples.get(raw.exampleId);
  const bulk=await contentDb.examples.where('word').equals('passage').toArray();
  expect(bulk[0]).toEqual(single);
  expect(single?.sentenceEn).toContain('The editor removed');
  expect(single?.blankSentence?.replace('_____',single.answer!)).toBe(single?.sentenceEn);
  expect(single?.sentenceZh).toContain('編輯刪掉');
  expect((await contentDb.examples.toCollection().raw().toArray())[0]).toEqual(raw);
  expect(await contentDb.examples.get('missing')).toBeUndefined();
});
