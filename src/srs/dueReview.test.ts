import 'fake-indexeddb/auto';
import { beforeEach, afterEach, it, expect } from 'vitest';
import { contentDb } from '../db/contentDb';
import { progressDb } from '../db/progressDb';
import { newCardState } from './sm2';
import { getDueReviewQueue } from './dueReview';
import type { WordRecord } from '../db/types';

beforeEach(async()=>{await progressDb.delete();await progressDb.open();await contentDb.delete();await contentDb.open();});
afterEach(async()=>{await progressDb.delete();await contentDb.delete();});
it('only returns due installed learned words across levels, with no fresh or future cards',async()=>{
  const words=['due','future','fresh','unseen'].map((word,i)=>({word,wordId:`W${i}`,level:i===0?'LV6':'LV1',meaningZh:'詞義'})) as WordRecord[];
  await contentDb.words.bulkPut(words);
  await progressDb.cardStates.bulkPut([
    {...newCardState('due','2026-09-20'),state:'review',dueDate:'2026-09-21'},
    {...newCardState('future','2026-09-20'),state:'review',dueDate:'2026-09-23'},
    {...newCardState('fresh','2026-09-20'),dueDate:'2026-09-20',practicePending:true},
    {...newCardState('removed','2026-09-20'),state:'review',dueDate:'2026-09-20'},
  ]);
  const before=await progressDb.cardStates.toArray();
  expect((await getDueReviewQueue('2026-09-22')).map(i=>i.wordRecord.word)).toEqual(['due']);
  expect(await progressDb.cardStates.toArray()).toEqual(before);
  await progressDb.cardStates.update('due',{dueDate:'2026-09-24'});
  expect(await getDueReviewQueue('2026-09-22')).toEqual([]);
});
