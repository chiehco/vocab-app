import 'fake-indexeddb/auto';
import { beforeEach, afterEach, it, expect } from 'vitest';
import { progressDb } from '../../db/progressDb';
import { contentDb } from '../../db/contentDb';
import { rememberStudy, getStudyResume, RESUME_KEY, resolveStudyBookmark } from './studyResume';
import { curriculumUnits } from '../direct/model';
import { startSession, nextQuestion, updateQuestion, submitAnswer } from '../direct/store';
import { saveWordList, readWordList } from './wordLists';
import { exportProgress, importProgress } from '../../backup/backup';
import type { WordRecord } from '../../db/types';
import images from '../vocabulary/lv1ReviewedImages.json';

beforeEach(async () => { await progressDb.delete(); await progressDb.open(); await contentDb.delete(); await contentDb.open(); });
afterEach(async () => { await progressDb.delete(); await contentDb.delete(); });
const unit = curriculumUnits[0];
const items = unit.items.filter(i => i.kind === 'vocabulary');
const location = { href: `/vocabulary?level=${unit.level}&unit=${unit.unit}&kind=vocabulary&item=${items[3].learningItemId}`, title: unit.name, position: 4, total: items.length };

it('new users have no fabricated progress; catalog visits do not create any progress', async () => {
  expect(await getStudyResume()).toBeUndefined();
  expect(await progressDb.settings.count()).toBe(0);
  expect(await progressDb.cardStates.count()).toBe(0);
});
it('restores the exact card across backup, without creating SRS state or groups', async () => {
  await rememberStudy(location);
  const before = await getStudyResume();
  expect(before).toMatchObject(location);
  const backup = await exportProgress();
  await progressDb.settings.clear(); await importProgress(backup);
  expect(await getStudyResume()).toEqual(before);
  expect(await progressDb.cardStates.count()).toBe(0);
  expect(await progressDb.customGroups.count()).toBe(0);
});
it('discards missing curriculum items and malformed bookmarks', async () => {
  await progressDb.settings.put({key:RESUME_KEY,value:{...location,href:'/vocabulary?item=missing',updatedAt:1}});
  expect(await getStudyResume()).toBeUndefined();
  await expect(rememberStudy({...location,href:'https://example.com'})).rejects.toThrow();
  expect(await resolveStudyBookmark({...location,position:NaN,updatedAt:1})).toBeUndefined();
});
it('restores approved LV1 supplementary cards without inventing a word ID', async () => {
  const card=images.find(i=>!i.officialWordId)!;
  const cards=images.filter(i=>i.unit===card.unit);
  await rememberStudy({href:`/textbook/LV1/${card.unit}/cards?item=${card.id}`,title:'LV1 圖句',position:cards.indexOf(card)+1,total:cards.length});
  expect((await getStudyResume())?.href).toContain(card.id);
  expect(await contentDb.words.count()).toBe(0);
});
it('opens textbook word lists without custom groups; deleted lists do not leave a resume link', async () => {
  const words=[{wordId:'W000114',word:'boy',level:'LV1',meaningZh:'男孩'}] as WordRecord[];
  await contentDb.words.bulkPut(words);
  const list=await saveWordList(words,'LV1 Unit 01','/textbook/LV1/1');
  expect((await readWordList(list.id))?.returnTo).toBe('/textbook/LV1/1');
  await rememberStudy({href:`/word/W000114?list=${list.id}`,title:list.name,position:1,total:1});
  expect(await getStudyResume()).toBeDefined();
  await progressDb.settings.delete(`word-list:${list.id}`);
  expect(await getStudyResume()).toBeUndefined();
  expect(await progressDb.customGroups.count()).toBe(0);
});
it('recovers existing unfinished practice and excludes completed sessions', async () => {
  const s=await startSession();
  expect((await getStudyResume())?.href).toBe(`/practice/direct?session=${s.id}`);
  await progressDb.directSessions.update(s.id,{index:s.questionIds.length});
  expect(await getStudyResume()).toBeUndefined();
});
it('chooses the more recent valid activity and preserves submitted answers on resume', async () => {
  const s=await startSession();
  await updateQuestion(s.id,s.questionIds[0],{choice:'A'});
  await submitAnswer(s.id,s.questionIds[0]);
  await nextQuestion(s.id);
  expect((await getStudyResume())?.position).toBe(2);
  await rememberStudy(location);
  await progressDb.directSessions.update(s.id,{updatedAt:1});
  expect((await getStudyResume())?.href).toBe(location.href);
  expect(await progressDb.directAttempts.count()).toBe(1);
});
