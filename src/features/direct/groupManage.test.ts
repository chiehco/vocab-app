import 'fake-indexeddb/auto';
import { afterEach,beforeEach,expect,it } from 'vitest';
import { progressDb } from '../../db/progressDb';
import { deleteGroup,restoreGroup,saveGroup,startGroupSession,updateQuestion,submitAnswer } from './store';
import { templateGroup,practiceQuestions } from './model';
import { exportProgress,importProgress,validateBackup } from '../../backup/backup';
import { filterGroups } from './groupFilter';
import type { WordRecord } from '../../db/types';

beforeEach(async()=>{await progressDb.delete();await progressDb.open();});
afterEach(async()=>{await progressDb.delete();});
it('deletes only the selected duplicate group, keeps practice evidence and restores membership',async()=>{
 const a=templateGroup(),b=templateGroup();await saveGroup(a);await saveGroup(b);
 const s=await startGroupSession(a.id),q=practiceQuestions.find(q=>q.questionId===s.questionIds[0])!;
 await updateQuestion(s.id,q.questionId,{choice:q.answer});await submitAnswer(s.id,q.questionId);
 const before=await exportProgress();const deleted=await deleteGroup(a.id);
 expect(await progressDb.customGroups.get(a.id)).toBeUndefined();expect(await progressDb.customGroups.get(b.id)).toBeDefined();
 const after=await exportProgress();for(const key of ['cardStates','reviewLogs','directSessions','directAttempts'] as const)expect(after.data[key]).toEqual(before.data[key]);
 expect(validateBackup(after)).toBeNull();await importProgress(after);
 await restoreGroup(deleted);expect(await progressDb.customGroups.get(a.id)).toEqual(deleted);
 await expect(restoreGroup(deleted)).rejects.toThrow();expect(await progressDb.customGroups.get(a.id)).toEqual(deleted);
});
it('filters many groups by name, contained word and type without conflating identical names',()=>{
 const groups=Array.from({length:43},(_,i)=>({...templateGroup(),id:`group-${i}`,name:i<2?'同名群組':`Unit ${i}`,updatedAt:i,itemIds:i===2?[]:templateGroup().itemIds}));
 groups[2].wordIds=['W000002'];
 const words=[{wordId:'W000002',word:'ability',meaningZh:'能力',level:'LV5'} as WordRecord];
 expect(filterGroups(groups,words,'同名','all','recent').map(g=>g.id)).toEqual(['group-1','group-0']);
 expect(filterGroups(groups,words,'ABILITY LV5','cards','recent').map(g=>g.id)).toEqual(['group-2']);
 expect(filterGroups(groups,words,'unite','curriculum','recent')).toHaveLength(42);
 expect(filterGroups(groups,words,'','empty','recent')).toHaveLength(0);
 expect(filterGroups(groups,words,'查無此字','all','recent')).toHaveLength(0);
 expect(filterGroups(groups.filter(g=>g.name.startsWith('Unit')) ,words,'','all','name').slice(0,3).map(g=>g.name)).toEqual(['Unit 2','Unit 3','Unit 4']);
 expect(groups[0].id).toBe('group-0');
});
it('narrows the sidebar groups to the chosen level by name, unit template or contained words',()=>{
 const words=[{wordId:'W000002',word:'ability',meaningZh:'能力',level:'LV5'} as WordRecord,{wordId:'W000009',word:'able',meaningZh:'能夠的',level:'LV1'} as WordRecord];
 const base={...templateGroup(),itemIds:[] as string[],templateId:null,templateRevision:null};
 const groups=[
  {...base,id:'by-name',name:'LV1 學測優先 第 1 組',updatedAt:4},
  {...base,id:'by-word',name:'匯入清單',wordIds:['W000009','W000002'],updatedAt:3},
  {...templateGroup(),id:'by-unit',name:'教材',updatedAt:2},
  {...base,id:'other',name:'LV10 補充',wordIds:['W000002'],updatedAt:1},
 ];
 expect(filterGroups(groups,words,'','all','recent','LV1').map(g=>g.id)).toEqual(['by-name','by-word']);
 expect(filterGroups(groups,words,'','all','recent','LV3').map(g=>g.id)).toEqual(['by-unit']);
 expect(filterGroups(groups,words,'','all','recent','LV5').map(g=>g.id)).toEqual(['by-word','other']);
 expect(filterGroups(groups,words,'','all','recent','LV2')).toHaveLength(0);
 expect(filterGroups(groups,words,'','all','recent')).toHaveLength(4);
});
