import { contentDb } from '../../db/contentDb';
import { getSetting, progressDb } from '../../db/progressDb';
import { getProgressKeys } from '../../db/progressIdentity';
import type { Grade, ReviewMode, WordRecord } from '../../db/types';
import { todayStr } from '../../lib/dates';
import { buildStudyQueue, type QueueItem } from '../../srs/queue';
import { buildFunctionWordSet } from '../../quiz/examScope';
import { gradeFlashcard, markWordKnown, recordReviewWithoutScheduling } from '../../checkin/recordActivity';
import type { LearningCommitGuard } from '../../checkin/commitGuard';
import { TOWN_ITEMS } from './townModel';
import { getLV1TownItems } from './lv1TownModel';
import { pickDistractors, shuffle } from '../../quiz/distractors';
import { pickExamDistractors } from '../../quiz/examDistractors';

export type TownKey = 'LV1/1' | 'LV4/17';
export const isTownKey = (value:string):value is TownKey => value==='LV1/1' || value==='LV4/17';
export interface TownBinding {id:string;wordId:string;word:string;keys:string[]}
export async function townScope(town:TownKey, records?:WordRecord[]) {
  const words=records ?? await contentDb.words.toArray();
  const byId=new Map(words.map(word=>[word.wordId,word]));
  const entries=town==='LV4/17' ? TOWN_ITEMS.map(item=>({id:item.learningItemId,wordId:item.officialWordId,word:item.displayWord!}))
    : getLV1TownItems(words).map(item=>({id:item.id,wordId:item.wordId,word:item.word}));
  const matched=entries.flatMap(entry=>{const word=entry.wordId ? byId.get(entry.wordId) : undefined;return word?[{entry,word}]:[];});
  const bindings:TownBinding[]=await Promise.all(matched.map(async({entry,word})=>({id:entry.id,wordId:word.wordId,word:word.word,keys:await getProgressKeys(word.word)})));
  return {words:matched.map(row=>row.word),bindings,missing:entries.filter(entry=>!entry.wordId || !byId.has(entry.wordId)).map(entry=>entry.word)};
}
export async function townStudyQueue(town:TownKey) {
  const scope=await townScope(town);
  const functions=buildFunctionWordSet(await contentDb.examPriorities.toArray());
  // Chapter membership wins over dictionary level (e.g. Unit 1's woman is filed LV2).
  // This is the same configured-cap branch used by regular level-scoped review.
  return buildStudyQueue(undefined,scope.words.filter(word=>!functions.has(word.word)).map(word=>word.word));
}
interface StudyItem {wordId:string;word:string;isNew:boolean;isRecap?:boolean;isPractice?:boolean}
export interface TownStudyAnswer {logId:number;grade:Grade;mode:ReviewMode;word:string;reviewedAt:string}
export interface TownStudyRound {id:string;town:TownKey;day:string;createdAt:number;items:StudyItem[];index:number;choices:Record<string,string>;flipped:Record<string,boolean>;options:Record<string,string[]>;answers:Record<string,TownStudyAnswer>}
const roundKey=(id:string)=>`town-study:${id}`;
const activeKey=(town:TownKey)=>`town-study-active:${town}`;
export const townStudyUrl=(round:Pick<TownStudyRound,'id'|'town'>)=>`/town/${round.town}/study?session=${encodeURIComponent(round.id)}`;
function validRound(value:unknown):value is TownStudyRound {
  if (!value || typeof value!=='object') return false;
  const r=value as TownStudyRound;
  const object=(v:unknown)=>!!v && typeof v==='object' && !Array.isArray(v);
  return typeof r.id==='string' && !!r.id && isTownKey(r.town) && /^\d{4}-\d{2}-\d{2}$/.test(r.day) && Number.isFinite(r.createdAt)
    && Array.isArray(r.items) && r.items.every(item=>item && typeof item.wordId==='string' && typeof item.word==='string' && typeof item.isNew==='boolean')
    && new Set(r.items.map(item=>item.wordId)).size===r.items.length && Number.isInteger(r.index) && r.index>=0 && r.index<=r.items.length
    && object(r.choices) && Object.values(r.choices).every(value=>typeof value==='string') && object(r.flipped) && Object.values(r.flipped).every(value=>typeof value==='boolean')
    && object(r.options) && Object.values(r.options).every(value=>Array.isArray(value) && value.every(id=>typeof id==='string'))
    && object(r.answers) && Object.entries(r.answers).every(([index,a])=>/^\d+$/.test(index) && Number(index)<r.items.length && a && Number.isInteger(a.logId) && a.logId>0
      && [0,1,2,3].includes(a.grade) && ['flashcard','known','same-day-recap'].includes(a.mode) && typeof a.word==='string' && Number.isFinite(Date.parse(a.reviewedAt)));
}
export async function readTownStudyRound(id:string):Promise<TownStudyRound|undefined> {
  const value=(await progressDb.settings.get(roundKey(id)))?.value;
  return validRound(value) && value.id===id ? value : undefined;
}
export async function activeTownStudy(town:TownKey) {
  const id=(await progressDb.settings.get(activeKey(town)))?.value;
  const round=typeof id==='string' ? await readTownStudyRound(id) : undefined;
  return round?.town===town && round.day===todayStr() ? round : undefined;
}
export async function startTownStudy(town:TownKey) {
  const existing=await activeTownStudy(town);
  if (existing && existing.index<existing.items.length) return existing;
  const queue=await townStudyQueue(town), day=todayStr();
  return progressDb.transaction('rw',progressDb.settings,async()=>{
    const previous=await activeTownStudy(town);
    if (previous && previous.index<previous.items.length) return previous;
    const round:TownStudyRound={id:crypto.randomUUID(),town,day,createdAt:Date.now(),items:queue.map(item=>({wordId:item.wordRecord.wordId,word:item.wordRecord.word,isNew:item.isNew,
      ...(item.isRecap?{isRecap:true}:{}),...(item.isPractice?{isPractice:true}:{})})),index:0,choices:{},flipped:{},options:{},answers:{}};
    await progressDb.settings.put({key:roundKey(round.id),value:round});
    await progressDb.settings.put({key:activeKey(town),value:round.id});return round;
  });
}
export async function townStudyStatus(town:TownKey) {
  const [active,queue,scope]=await Promise.all([activeTownStudy(town),townStudyQueue(town),townScope(town)]);
  const answer=active?.answers[active.index], log=answer ? await progressDb.reviewLogs.get(answer.logId) : undefined;
  const currentSaved=!!answer && log?.sessionId===active?.id && log?.word===answer.word && log?.mode===answer.mode;
  return {active,currentSaved,queueCount:queue.length,recapOnly:!!queue.length && queue.every(item=>item.isRecap),missing:scope.missing};
}
export async function resolveTownStudy(id:string) {
  const round=await readTownStudyRound(id);
  if (!round) throw Error('找不到這輪日課，請回小鎮查看今天安排。');
  const scope=await townScope(round.town), byId=new Map(scope.words.map(word=>[word.wordId,word]));
  if (round.items.some(item=>!byId.has(item.wordId))) throw Error('這輪字卡暫時讀不到，原有紀錄保留；請重新整理後再試。');
  const queue:QueueItem[]=round.items.map(item=>({wordRecord:byId.get(item.wordId)!,isNew:item.isNew,isRecap:item.isRecap,isPractice:item.isPractice}));
  const answer=round.answers[round.index];
  const log=answer ? await progressDb.reviewLogs.get(answer.logId) : undefined;
  const saved=answer && log?.sessionId===round.id && log.word===answer.word && log.mode===answer.mode ? answer : undefined;
  const options=round.options[round.index];
  const allWords=options?.length ? await contentDb.words.bulkGet(options) : [];
  return {round,queue,scope,saved,options:options===undefined ? undefined : options.length===4 && allWords.every(Boolean) ? allWords as WordRecord[] : null};
}
/** Freeze distractors as well as the chosen answer so a reopened card stays recognizable. */
export async function prepareTownStudyOptions(id:string,index:number) {
  const data=await resolveTownStudy(id), word=data.queue[index]?.wordRecord;
  if(!word || data.round.options[index]!==undefined)return;
  const [words,priorities,relations]=await Promise.all([contentDb.words.toArray(),contentDb.examPriorities.toArray(),contentDb.relations.where('relationType').equals('exam_distractor').toArray()]);
  const functions=buildFunctionWordSet(priorities), pool=words.filter(word=>!functions.has(word.word));
  const distractors=relations.length?pickExamDistractors(word,pool,relations):pickDistractors(word,pool);
  const options=word.meaningZh && distractors.length>=3 ? shuffle([word,...distractors]).map(word=>word.wordId) : [];
  await progressDb.transaction('rw',progressDb.settings,async()=>{
    const round=await readTownStudyRound(id);if(!round || round.index!==index || round.options[index]!==undefined)return;
    round.options[index]=options;await progressDb.settings.put({key:roundKey(id),value:round});
  });
}
/** Keep the prior snapshot and its real answers; only replace the active pointer. */
export async function replanTownStudy(town:TownKey,id:string) {
  await progressDb.transaction('rw',progressDb.settings,async()=>{
    if((await progressDb.settings.get(activeKey(town)))?.value===id)await progressDb.settings.delete(activeKey(town));
  });
  return startTownStudy(town);
}
export async function pickTownStudy(id:string,index:number,choice?:string) {
  await progressDb.transaction('rw',progressDb.settings,async()=>{
    const round=await readTownStudyRound(id);if(!round || round.index!==index || round.answers[index]) return;
    round.flipped[index]=true;if(choice!==undefined)round.choices[index]=choice;
    await progressDb.settings.put({key:roundKey(id),value:round});
  });
}
export async function saveTownStudy(id:string,index:number,grade:Grade,known=false) {
  const data=await resolveTownStudy(id), item=data.queue[index];
  if (!item) throw Error('本輪已完成，請回小鎮。');
  const guard:LearningCommitGuard={tables:[progressDb.settings],before:async(card)=>{
    const current=await readTownStudyRound(id);if(!current || current.items[index]?.wordId!==item.wordRecord.wordId)throw Error('這輪日課已變更，請重新整理。');
    const answer=current.answers[index];
    if (answer) {const log=await progressDb.reviewLogs.get(answer.logId);if(log?.sessionId===id && log.word===answer.word && log.mode===answer.mode)return false;}
    if(current.index!==index || !current.flipped[index])throw Error('請先完成本題，再保存。');
    if(current.day!==todayStr())throw Error('本輪屬於前一日，請回小鎮查看今天安排。原紀錄保留。');
    if(known && current.choices[index]!==item.wordRecord.word)throw Error('請先完成本題選擇。');
    if(!known && !item.isRecap && !card && ((await progressDb.checkIns.get(todayStr()))?.newWordsCount ?? 0)>=await getSetting<number>('dailyNewWordCap'))
      throw Error('今天的新字額度已用完，本題尚未保存；請回小鎮重新查看安排。');
    return true;
  },after:async(log)=>{
    const current=await readTownStudyRound(id);if(!current)throw Error('日課紀錄暫時無法保存，請重試。');
    current.answers[index]={logId:log.id,grade:log.grade,mode:log.mode,word:log.word,reviewedAt:log.reviewedAt};
    await progressDb.settings.put({key:roundKey(id),value:current});
  }};
  if(known)await markWordKnown(item.wordRecord.word,id,guard);
  else if(item.isRecap)await recordReviewWithoutScheduling(item.wordRecord.word,grade,id,index===0,guard);
  else await gradeFlashcard(item.wordRecord.word,grade,id,index===0,'flashcard',guard);
}
export async function nextTownStudy(id:string,index:number) {
  await progressDb.transaction('rw',[progressDb.settings,progressDb.reviewLogs],async()=>{
    const round=await readTownStudyRound(id);if(!round || round.index!==index)return;
    const answer=round.answers[index], log=answer ? await progressDb.reviewLogs.get(answer.logId) : undefined;
    if(!answer || log?.sessionId!==id || log.word!==answer.word)throw Error('本題尚未保存，請先完成作答。');
    round.index=index+1;await progressDb.settings.put({key:roundKey(id),value:round});
  });
}
