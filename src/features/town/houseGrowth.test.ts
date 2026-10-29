import 'fake-indexeddb/auto';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {houseGrowth} from './houseGrowth';
import {progressDb} from '../../db/progressDb';
import {contentDb} from '../../db/contentDb';
import {gradeFlashcard,markWordKnown,recordQuizAnswer,recordReviewWithoutScheduling} from '../../checkin/recordActivity';
import {exportProgress,importProgress} from '../../backup/backup';
import type {HouseGrowthEvidence} from '../../db/types';
const event=(id:number,kind:HouseGrowthEvidence['kind'],day=`2026-11-${String(id+1).padStart(2,'0')}`)=>({id:String(id),at:id,evidence:{kind,day}});
it('requires first learning and three successful due reviews on later distinct days; ignores repeats and failures',()=>{
 const learning=event(0,'learning'),due=event(1,'due-review');
 expect(houseGrowth([]).stage).toBe(0);expect(houseGrowth([event(0,'none')]).stage).toBe(0);
 expect(houseGrowth([learning,...Array.from({length:40},(_,i)=>event(i+1,'learning'))]).stage).toBe(1);
 expect(houseGrowth([learning,event(1,'due-review',learning.evidence.day)]).stage).toBe(1);
 expect(houseGrowth([learning,due,due,event(2,'due-review',due.evidence.day),event(3,'none')]).stage).toBe(2);
 expect(houseGrowth([learning,due,event(2,'due-review')]).stage).toBe(3);
 expect(houseGrowth([learning,due,event(2,'due-review'),event(3,'due-review'),event(4,'none')]).stage).toBe(4);
});
it('preserves legacy appearance without manufacturing successful review evidence or mutating history',()=>{
 const old={id:'old-wrong',at:0},events=[old,event(1,'none')],before=structuredClone(events);
 expect(houseGrowth(events)).toEqual({stage:4,legacy:true});expect(events).toEqual(before);
 expect(houseGrowth([{id:'bad',at:NaN,evidence:{kind:'due-review',day:'unknown'}}]).stage).toBe(0);
});
beforeEach(async()=>{await progressDb.delete();await progressDb.open();await contentDb.delete();await contentDb.open();vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-11-01T12:00:00'))});
afterEach(async()=>{vi.useRealTimers();await progressDb.delete();await contentDb.delete()});
const growth=async()=>houseGrowth((await progressDb.reviewLogs.toArray()).map(log=>({id:String(log.id),at:Date.parse(log.reviewedAt),evidence:log.houseGrowth})));
it('captures actual pre-answer due eligibility in the existing atomic scheduler; roof does not graduate the card',async()=>{
 await gradeFlashcard('synthetic-house',2,'first',true);expect((await growth()).stage).toBe(1);
 for(let i=0;i<5;i++)await gradeFlashcard('synthetic-house',2,`early-${i}`,false);
 expect((await growth()).stage).toBe(1);
 for(const [date,stage] of [['2026-11-02',2],['2026-11-08',3],['2026-11-23',4]] as const){
  vi.setSystemTime(new Date(`${date}T12:00:00`));await gradeFlashcard('synthetic-house',2,`due-${stage}`,false);expect((await growth()).stage).toBe(stage);
 }
 const card=await progressDb.cardStates.get('synthetic-house');expect(card).toMatchObject({state:'review',repetitions:4,intervalDays:38,dueDate:'2026-12-31'});
 await gradeFlashcard('synthetic-house',0,'wrong',false);expect((await growth()).stage).toBe(4);expect((await progressDb.cardStates.get('synthetic-house'))?.state).toBe('relearning');
 const backup=await exportProgress();await importProgress(backup);expect((await growth()).stage).toBe(4);expect((await exportProgress()).data).toEqual(backup.data);
});
it('does not turn known-word repetitions into stages, or repeated quiz/recap answers into due reviews',async()=>{
 await markWordKnown('synthetic-house','known');expect((await progressDb.cardStates.get('synthetic-house'))?.repetitions).toBeGreaterThanOrEqual(2);expect((await growth()).stage).toBe(0);
 await recordQuizAnswer('synthetic-house',false,'quiz-w2m','wrong',false);expect((await growth()).stage).toBe(0);
 for(let i=0;i<8;i++){await recordQuizAnswer('synthetic-house',true,'quiz-w2m',`quiz${i}`,false);await recordReviewWithoutScheduling('synthetic-house',2,`recap${i}`,false);}
 expect((await growth()).stage).toBe(1);
 vi.setSystemTime(new Date('2026-11-22T12:00:00'));await gradeFlashcard('synthetic-house',0,'due-wrong',false);expect((await growth()).stage).toBe(1);
 await gradeFlashcard('synthetic-house',2,'same-day-retry',false);expect((await growth()).stage).toBe(1);
 vi.setSystemTime(new Date('2026-11-23T12:00:00'));await gradeFlashcard('synthetic-house',2,'later-due',false);expect((await growth()).stage).toBe(2);
});
