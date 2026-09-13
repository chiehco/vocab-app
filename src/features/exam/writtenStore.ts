import { progressDb } from '../../db/progressDb';
import { WRITTEN_REVISION, multipleScore, isMultiple, validRaw, validSelfScore, writtenGroups } from './writtenModel';
import type { WrittenSession, WrittenSubmission } from './writtenModel';

export async function startWritten(groupId:string) {
  if(!writtenGroups.some(g=>g.id===groupId))throw Error('找不到題組。');
  const s:WrittenSession={id:crypto.randomUUID(),groupId,revision:WRITTEN_REVISION,answers:{},lookups:[],createdAt:Date.now(),updatedAt:Date.now()};
  await progressDb.writtenSessions.add(s);return s;
}
export async function editWritten(id:string,change:{questionId?:string;answer?:string;lookup?:string}) {
  await progressDb.transaction('rw',progressDb.writtenSessions,progressDb.writtenSubmissions,async()=>{
    const s=await progressDb.writtenSessions.get(id);
    if(!s||s.revision!==WRITTEN_REVISION)throw Error('找不到可續寫的進度。');
    if(await progressDb.writtenSubmissions.where('sessionId').equals(id).count())return;
    if(change.questionId&&change.answer!==undefined){
      if(!writtenGroups.find(g=>g.id===s.groupId)?.ids.includes(change.questionId)||!validRaw(change.questionId,change.answer))throw Error('答案格式無效或超過長度上限。');
      s.answers[change.questionId]=change.answer;
    }
    if(change.lookup?.trim())s.lookups=[...new Set([...s.lookups,change.lookup.trim().toLowerCase()])];
    await progressDb.writtenSessions.put({...s,updatedAt:Date.now()});
  });
}
export async function submitWritten(id:string,allowBlank=false) {
  await progressDb.transaction('rw',progressDb.writtenSessions,progressDb.writtenSubmissions,async()=>{
    const s=await progressDb.writtenSessions.get(id),g=writtenGroups.find(g=>g.id===s?.groupId);
    if(!s||!g||s.revision!==WRITTEN_REVISION)throw Error('找不到可提交的進度。');
    const existing=await progressDb.writtenSubmissions.where('sessionId').equals(id).count();
    if(existing===g.ids.length)return;if(existing)throw Error('題組紀錄不完整，請還原備份。');
    if(!allowBlank&&g.ids.some(qid=>!s.answers[qid]?.trim()))throw Error('仍有未答題目，請填答或確認留白。');
    const last=await progressDb.writtenSubmissions.orderBy('submittedAt').last();const now=Math.max(Date.now(),(last?.submittedAt??0)+1);
    for(const qid of g.ids){
      const rawAnswer=s.answers[qid]??'';
      if(!validRaw(qid,rawAnswer))throw Error('答案格式無效。');
      const row:WrittenSubmission={id:`${id}:${qid}`,sessionId:id,questionId:qid,rawAnswer,submittedAt:now,revision:WRITTEN_REVISION,
        firstAttempt:!(await progressDb.writtenSubmissions.where('questionId').equals(qid).count()),lookedUpWords:[...s.lookups],assessments:[],
        ...(isMultiple(qid)?{autoScore:multipleScore(rawAnswer,qid)}:{})};
      await progressDb.writtenSubmissions.add(row);
    }
    await progressDb.writtenSessions.put({...s,updatedAt:now});
  });
}
export async function assessWritten(id:string,score:number|null) {
  await progressDb.transaction('rw',progressDb.writtenSubmissions,async()=>{
    const a=await progressDb.writtenSubmissions.get(id);
    if(!a||!validSelfScore(a.questionId,score))throw Error('自评分數無效。');
    const at=Math.max(Date.now(),a.submittedAt,(a.assessments.at(-1)?.at??0)+1);
    await progressDb.writtenSubmissions.put({...a,assessments:[...a.assessments,{at,score}]});
  });
}
