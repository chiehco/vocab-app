import content from './writtenContent.json';
import { examArchive } from './archive';
import type { ExamQuestion, WrittenGroup } from './archive';

export const WRITTEN_REVISION = 'gsat-115-written-20260912-1';
export const writtenQuestions:ExamQuestion[] = [...content.questions as unknown as ExamQuestion[], ...examArchive.writtenQuestions];
export const mixedPassage = content.passages[0];
export const writtenGroups:WrittenGroup[] = [
  {id:'mixed',year:'115',title:'混合題 · 47–50',ids:writtenQuestions.slice(0,4).map(q=>q.question_id)},
  {id:'translation1',year:'115',title:'中譯英 · 第 1 題',ids:['gsat-115-t01']},
  {id:'translation2',year:'115',title:'中譯英 · 第 2 題',ids:['gsat-115-t02']},
  {id:'essay',year:'115',title:'英文作文',ids:['gsat-115-e01']},
  ...examArchive.writtenGroups,
];
export interface WrittenSession {
  id:string; groupId:string; revision:string; answers:Record<string,string>; lookups:string[];
  createdAt:number; updatedAt:number;
}
export interface SelfAssessment { at:number; score:number|null }
export interface WrittenSubmission {
  id:string; sessionId:string; questionId:string; rawAnswer:string; submittedAt:number; firstAttempt:boolean;
  revision:string; lookedUpWords:string[]; assessments:SelfAssessment[]; autoScore?:number;
}
export const isMultiple=(id:string)=>writtenQuestions.find(q=>q.question_id===id)?.question_type==='multiple_choice';
export function multipleScore(raw:string,id='gsat-115-q49') {
  const q=writtenQuestions.find(q=>q.question_id===id);
  if(!q||!isMultiple(id)||!q.options)throw Error('找不到多選題。');
  const keys=Object.keys(q.options), correct=q.answerKey??'ADE', selected=new Set(raw.split(''));
  const errors=keys.filter(k=>selected.has(k)!==correct.includes(k)).length;
  return selected.size ? Math.max(0,q.points*(keys.length-2*errors)/keys.length) : 0;
}
export function validRaw(id:string,value:unknown): value is string {
  const q=writtenQuestions.find(q=>q.question_id===id);
  if(!q||typeof value!=='string'||value.length>20000)return false;
  if(!isMultiple(id))return true;
  return value===[...new Set(value)].sort().join('')&&[...value].every(k=>Object.keys(q.options??{}).includes(k));
}
export function validSelfScore(id:string,score:unknown): score is number|null {
  const q=writtenQuestions.find(q=>q.question_id===id);
  if (!q || isMultiple(id)) return false;
  return score===null || typeof score==='number' && Number.isFinite(score) && score>=0 && score<=q.points &&
    Number.isInteger(score*(q.question_type==='translation'?2:1));
}
export function wordCount(text:string) { return (text.match(/[A-Za-z]+(?:['’-][A-Za-z]+)*/g)??[]).length; }
const stringArray=(v:unknown):v is string[]=>Array.isArray(v)&&v.every(x=>typeof x==='string');
const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
export function validWrittenBackup(sessions:unknown,submissions:unknown):boolean {
  if (!Array.isArray(sessions)||!Array.isArray(submissions))return false;
  const ss=sessions as WrittenSession[], aa=submissions as WrittenSubmission[];
  if(ss.some(s=>!s||typeof s.id!=='string'||!s.id||s.revision!==WRITTEN_REVISION||!writtenGroups.some(g=>g.id===s.groupId)||!record(s.answers)||!stringArray(s.lookups)||!Number.isFinite(s.createdAt)||!Number.isFinite(s.updatedAt)))return false;
  if(new Set(ss.map(s=>s.id)).size!==ss.length)return false;
  if(ss.some(s=>Object.entries(s.answers).some(([id,value])=>!writtenGroups.find(g=>g.id===s.groupId)!.ids.includes(id)||!validRaw(id,value))))return false;
  if(aa.some(a=>!a||typeof a.id!=='string'||a.id!==`${a.sessionId}:${a.questionId}`||a.revision!==WRITTEN_REVISION||!validRaw(a.questionId,a.rawAnswer)||!Number.isFinite(a.submittedAt)||typeof a.firstAttempt!=='boolean'||!stringArray(a.lookedUpWords)||!Array.isArray(a.assessments)))return false;
  if(new Set(aa.map(a=>a.id)).size!==aa.length)return false;
  for(const a of aa){
    const s=ss.find(s=>s.id===a.sessionId),q=writtenQuestions.find(q=>q.question_id===a.questionId);
    if(!s||!q||!writtenGroups.find(g=>g.id===s.groupId)!.ids.includes(a.questionId)||(s.answers[a.questionId]??'')!==a.rawAnswer||JSON.stringify(a.lookedUpWords)!==JSON.stringify(s.lookups))return false;
    if(isMultiple(a.questionId) ? a.autoScore!==multipleScore(a.rawAnswer,a.questionId)||a.assessments.length>0 : a.autoScore!==undefined)return false;
    if(a.assessments.some((v,i)=>!v||!Number.isFinite(v.at)||v.at<a.submittedAt||i>0&&v.at<=a.assessments[i-1].at||!validSelfScore(a.questionId,v.score)))return false;
  }
  for(const s of ss){const count=aa.filter(a=>a.sessionId===s.id).length;if(count&&count!==writtenGroups.find(g=>g.id===s.groupId)!.ids.length)return false;}
  for(const q of writtenQuestions){const rows=aa.filter(a=>a.questionId===q.question_id).sort((a,b)=>a.submittedAt-b.submittedAt);if(rows.length&&(rows.filter(a=>a.firstAttempt).length!==1||!rows[0].firstAttempt))return false;}
  return true;
}
