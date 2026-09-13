import 'fake-indexeddb/auto';
import {beforeEach,afterEach,expect,it} from 'vitest';
import {progressDb} from '../../db/progressDb';
import {workspaceWords,saveWordList,readWordList} from './wordLists';
import {templateGroup} from '../direct/model';
import type {WordRecord} from '../../db/types';
import {exportProgress,importProgress,validateBackup} from '../../backup/backup';
const words=[{wordId:'W002951',word:'unite',level:'LV3',meaningZh:'團結'},{wordId:'W000002',word:'ability',level:'LV1',meaningZh:'能力'},{wordId:'W002952',word:'unity',level:'LV3',meaningZh:'團結'}] as WordRecord[];
beforeEach(async()=>{await progressDb.delete();await progressDb.open();});
afterEach(async()=>{await progressDb.delete();});
it('intersects group membership, level and query including available original cards in curriculum groups',()=>{
 const group={...templateGroup(),itemIds:templateGroup().itemIds.slice(0,2),wordIds:['W000002','W002951']};
 expect(workspaceWords(words,group,'LV3','團結').map(w=>w.word)).toEqual(['unite','unity']);
 expect(workspaceWords(words,group,'LV1','unity')).toEqual([]);
 expect(workspaceWords(words,undefined,'LV1','').map(w=>w.word)).toEqual(['ability']);
 expect(workspaceWords(words,{...group,itemIds:[],wordIds:[]},'all','')).toEqual([]);
});
it('keeps the exact filtered order for reading and quizzes, reload and backup without creating a custom group',async()=>{
 const list=await saveWordList([words[2],words[0]],'考前 · LV3','/modes/words?level=LV3&group=test');
 expect((await readWordList(list.id))?.wordIds).toEqual(['W002952','W002951']);
 expect(await progressDb.customGroups.count()).toBe(0);
 const backup=await exportProgress();expect(validateBackup(backup)).toBeNull();await importProgress(backup);
 expect(await readWordList(list.id)).toEqual(list);
 await expect(saveWordList([],'empty','/modes/words')).rejects.toThrow();
 await progressDb.settings.put({key:'word-list:bad',value:{...list,id:'bad',returnTo:'https://example.com'}});
 expect(await readWordList('bad')).toBeUndefined();
});
