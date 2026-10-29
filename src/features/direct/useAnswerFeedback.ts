import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { progressDb } from '../../db/progressDb';
import { AnswerFeedbackAudio } from './answerFeedbackAudio';
export const ANSWER_SOUND_KEY = 'answerFeedbackSound';

export function useAnswerFeedback() {
  const preference=useLiveQuery(async()=>{
    try { const row=await progressDb.settings.get(ANSWER_SOUND_KEY);return {enabled:row ? row.value===true : true}; }
    catch { return {enabled:false}; }
  },[]);
  const [override,setOverride]=useState<boolean>(),[saving,setSaving]=useState(false),[error,setError]=useState('');
  const enabled=override ?? preference?.enabled ?? false, enabledRef=useRef(enabled),lock=useRef(false);
  enabledRef.current=enabled;
  const player=useRef<AnswerFeedbackAudio | null>(null);
  if(!player.current)player.current=new AnswerFeedbackAudio(()=>enabledRef.current);
  useEffect(()=>()=>player.current?.dispose(),[]);
  useEffect(()=>{if(override!==undefined&&preference?.enabled===override)setOverride(undefined)},[override,preference?.enabled]);
  async function save(next:boolean) {
    if(lock.current)return;
    lock.current=true;enabledRef.current=next;setOverride(next);setSaving(true);setError('');
    if(!next)player.current?.silence();
    try { await progressDb.settings.put({key:ANSWER_SOUND_KEY,value:next}); }
    catch { setError('音效偏好尚未保存；目前設定仍適用，重新開啟後可能還原。'); }
    finally { lock.current=false;setSaving(false); }
  }
  return {enabled,ready:preference!==undefined,saving,error,toggle:()=>save(!enabledRef.current),retry:()=>save(enabledRef.current),
    prepare:()=>player.current?.prepare(),play:(id:string,correct:boolean,permit:ReturnType<AnswerFeedbackAudio['prepare']>)=>{void player.current?.playOnce(id,correct,permit)}};
}
