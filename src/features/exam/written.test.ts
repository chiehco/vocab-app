import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import {beforeEach,afterEach,it,expect} from 'vitest';
import {progressDb} from '../../db/progressDb';
import {exportProgress,importProgress,validateBackup} from '../../backup/backup';
import {multipleScore,validRaw,wordCount} from './writtenModel';
import {startWritten,editWritten,submitWritten,assessWritten} from './writtenStore';
beforeEach(async()=>{await progressDb.delete();await progressDb.open();});
afterEach(async()=>{await progressDb.delete();});
async function mixed(){const s=await startWritten('mixed');for(const [n,value] of [[47,'innovation'],[48,'blend'],[49,'AD'],[50,'one of a kind']] as const)await editWritten(s.id,{questionId:`gsat-115-q${n}`,answer:value});return s;}
it('migrates v2 without removing prior settings or direct sessions',async()=>{
 await progressDb.delete();const old=new Dexie('VocabProgressDB');old.version(2).stores({cardStates:'word, dueDate, state',reviewLogs:'++id, word, reviewedAt, sessionId',checkIns:'date',quizStats:'word',settings:'key',customGroups:'id, updatedAt',directSessions:'id, updatedAt',directAttempts:'id, questionId, sessionId, answeredAt'});
 await old.table('settings').put({key:'keep',value:7});await old.table('directSessions').put({id:'keep-session',updatedAt:3});old.close();await progressDb.open();
 expect(await progressDb.directSessions.get('keep-session')).toBeTruthy();expect((await progressDb.settings.get('keep'))?.value).toBe(7);expect(await progressDb.writtenSessions.count()).toBe(0);
});
it('scores six-option multiple choice with partial credit and rejects duplicate or unknown choices',()=>{
 expect(multipleScore('ADE')).toBe(4);expect(multipleScore('AD')).toBeCloseTo(8/3);expect(multipleScore('ABE')).toBeCloseTo(4/3);expect(multipleScore('ABCDEF')).toBe(0);expect(multipleScore('')).toBe(0);expect(validRaw('gsat-115-q49','AA')).toBe(false);expect(validRaw('gsat-115-q49','G')).toBe(false);
});
it('persists drafts and submits the whole mixed group exactly once; constructed responses stay ungraded',async()=>{
 const s=await mixed();await editWritten(s.id,{lookup:'local'});progressDb.close();await progressDb.open();expect((await progressDb.writtenSessions.get(s.id))?.answers['gsat-115-q48']).toBe('blend');
 await Promise.all([submitWritten(s.id),submitWritten(s.id)]);const rows=await progressDb.writtenSubmissions.toArray();expect(rows).toHaveLength(4);expect(rows.every(a=>a.firstAttempt&&a.lookedUpWords.includes('local'))).toBe(true);expect(rows.filter(a=>a.autoScore===undefined)).toHaveLength(3);expect(rows.every(a=>a.assessments.length===0)).toBe(true);
 await editWritten(s.id,{questionId:'gsat-115-q48',answer:'blended',lookup:'after'});expect((await progressDb.writtenSessions.get(s.id))?.answers['gsat-115-q48']).toBe('blend');
 expect(await progressDb.directAttempts.count()).toBe(0);expect(await progressDb.cardStates.count()).toBe(0);
});
it('preserves original answers and assessment history through retries and export/import',async()=>{
 const s=await mixed();await submitWritten(s.id);const id=`${s.id}:gsat-115-q48`;await assessWritten(id,1);await assessWritten(id,null);await assessWritten(id,2);
 await expect(assessWritten(id,1.5)).rejects.toThrow();await expect(assessWritten(`${s.id}:gsat-115-q49`,4)).rejects.toThrow();
 const retry=await mixed();await editWritten(retry.id,{questionId:'gsat-115-q48',answer:'blended'});await submitWritten(retry.id);
 const b=await exportProgress();expect(b.schemaVersion).toBe(4);expect(validateBackup(b)).toBeNull();await importProgress(b);
 const first=await progressDb.writtenSubmissions.get(id);expect(first?.rawAnswer).toBe('blend');expect(first?.assessments.map(a=>a.score)).toEqual([1,null,2]);expect((await progressDb.writtenSubmissions.toArray()).filter(a=>a.firstAttempt)).toHaveLength(4);
 b.data.writtenSubmissions!.pop();await expect(importProgress(b)).rejects.toThrow();expect(await progressDb.writtenSubmissions.count()).toBe(8);
});
it('allows explicit blank submissions, supports half-point translation self-scores and preserves writing on old restores',async()=>{
 const s=await startWritten('translation1');await expect(submitWritten(s.id)).rejects.toThrow();await submitWritten(s.id,true);await assessWritten(`${s.id}:gsat-115-t01`,3.5);
 const b=await exportProgress();b.schemaVersion=2;delete b.data.writtenSessions;delete b.data.writtenSubmissions;await importProgress(b);expect(await progressDb.writtenSubmissions.count()).toBe(1);
 expect(wordCount("It's a well-known story.\nTwo lines.")).toBe(6);
});
it('rolls back all mixed submissions if a write fails and rejects forged auto-scores on restore',async()=>{
 const s=await mixed();const fail=(_key:unknown,obj:{questionId:string})=>{if(obj.questionId==='gsat-115-q49')throw Error('storage failure');};progressDb.writtenSubmissions.hook('creating',fail);
 try{await expect(submitWritten(s.id)).rejects.toThrow();}finally{progressDb.writtenSubmissions.hook('creating').unsubscribe(fail);}
 expect(await progressDb.writtenSubmissions.count()).toBe(0);await submitWritten(s.id);const b=await exportProgress();b.data.writtenSubmissions!.find(a=>a.questionId==='gsat-115-q49')!.autoScore=4;expect(validateBackup(b)).not.toBeNull();
});
