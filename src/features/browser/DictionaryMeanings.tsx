import { useLiveQuery } from 'dexie-react-hooks';
import { contentDb } from '../../db/contentDb';
import RecordedMeanings from './RecordedMeanings';
import { linkedSenseLabel } from './meaningRecords';

export function DictionarySenseLabel({ wordId, senseId }: {wordId?: string | null; senseId?: string | null}) {
  const label = useLiveQuery(async()=>{
    if (!wordId || !senseId) return null;
    const word=await contentDb.words.get(wordId);
    return { wordId, senseId, text: word ? linkedSenseLabel(word,await contentDb.senses.where('wordId').equals(wordId).toArray(),senseId) ?? null : null };
  },[wordId,senseId]);
  const senseText = label && label.wordId===wordId && label.senseId===senseId ? label.text : undefined;
  return <small>{senseText ? `圖片／圖說對應：${senseText}` : '圖說'}</small>;
}

export default function DictionaryMeanings({ wordId }: { wordId?: string | null }) {
  const details = useLiveQuery(async () => {
    if (!wordId) return null;
    const word = await contentDb.words.get(wordId);
    return word ? { word, senses: await contentDb.senses.where('wordId').equals(wordId).toArray() } : null;
  }, [wordId]);
  if (!wordId) return null;
  return <section className="dictionary-meanings"><h3>已收錄字義</h3>{details?.word.wordId===wordId
    ? <RecordedMeanings word={details.word} senses={details.senses} />
    : <p role="status">{details === undefined ? '字義載入中…' : '一般字義尚未收錄。'}</p>}</section>;
}
