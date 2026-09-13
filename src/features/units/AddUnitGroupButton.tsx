import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { importWordGroup } from '../direct/store';
import type { ExamUnit } from './unitPlan';

export default function AddUnitGroupButton({ unit, orderLabel }: { unit: ExamUnit; orderLabel: string }) {
  const navigate = useNavigate();
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function add() {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try {
      const group = await importWordGroup(unit.words.map(w=>w.wordId), `${unit.level} ${orderLabel} ${unit.label}`);
      navigate(`/groups?group=${encodeURIComponent(group.id)}`);
    } catch {setError('未能建立群組，請稍後重試。');}
    finally {lock.current=false;setBusy(false);}
  }
  return <div className="unit-add-group"><button disabled={busy} onClick={()=>void add()}>{busy ? '建立中…' : '加入自建群組'}</button>{error && <p role="alert">{error}</p>}</div>;
}
