import type { SenseRecord, WordRecord } from '../../db/types';
import { hasVerbMeaning, recordedMeanings, recordedSummary, trustedVerbForms } from './meaningRecords';
import './recorded-meanings.css';

export default function RecordedMeanings({ word, senses }: { word: WordRecord; senses: SenseRecord[] }) {
  const rows = recordedMeanings(word, senses);
  const summary = recordedSummary(word, senses);
  const forms = trustedVerbForms(word);
  return <div className="recorded-meanings" aria-label="已收錄字義">
    {rows.length > 0 && <ul>{rows.map(row => <li key={row.key}>
      <span className="recorded-pos">{row.pos || '詞性待補'}</span><span>{row.meaning}</span>
      {row.pending && <small>待核對</small>}
      {row.source === 'curriculum' && <small>教材收錄義</small>}
    </li>)}</ul>}
    {summary && !rows.some(row => row.meaning === summary) && <p className="recorded-summary">
      <small>詞條摘要（尚未逐義整理） · {word.posAll?.join(' ') || word.pos || '詞性待補'}</small>{summary}
    </p>}
    {!rows.length && !summary && <p>字義尚未收錄。</p>}
    <p className="recorded-coverage">以上為目前已收錄資料，其他義項可能尚未整理。</p>
    {hasVerbMeaning(word, senses) && (forms ? <div className="recorded-verb-forms" aria-label="動詞三態">
      <p>動詞三態</p><dl>{[['原形', forms.base], ['過去式', forms.past], ['過去分詞', forms.pastParticiple]].map(([label, value]) =>
        <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    </div> : <p className="recorded-forms-missing">動詞三態尚未收錄。</p>)}
  </div>;
}
