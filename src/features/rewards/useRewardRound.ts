import { useCallback, useEffect, useRef, useState } from 'react';
import { presentRewardRound } from './store';
import type { ChallengeKind } from './model';

export function useRewardRound(id: string, count: number, visible: boolean, challenge:ChallengeKind, distinctWordCount:number) {
  const firstPresentation = useRef<{id:string; at:number} | null>(null);
  const [error, setError] = useState('');
  const prepare = useCallback(async () => {
    if (!id || !count) throw Error('No question presented');
    if (firstPresentation.current?.id !== id) firstPresentation.current = {id,at:Date.now()};
    await presentRewardRound(id, count, firstPresentation.current.at,challenge,distinctWordCount);
    setError('');
  }, [id,count,challenge,distinctWordCount]);
  useEffect(() => {
    if (visible) void prepare().catch(() => setError('暫時無法保存本輪計時，請重試作答；答案和金幣會一起保存。'));
  }, [visible,prepare]);
  return {prepare,error};
}
