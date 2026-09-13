import { useMemo, useState } from 'react';
import type { WordRecord } from '../../db/types';
import type { CustomGroup } from './model';
import { importWordGroup } from './store';
import { matchImportRows, parseImportRows, readImportFile, selectedImportIds } from './groupImport';
import type { ImportRow } from './groupImport';

const statusText = { matched: '可加入', choose: '請選擇字卡', pending: '已收錄，目前尚無可用字卡', unlisted: '目前字庫未找到，暫不產生字卡', invalid: '格式需修正' };
export default function GroupImportPanel({ words, groups, onSaved }: { words: WordRecord[] | undefined; groups: CustomGroup[]; onSaved: (g: CustomGroup) => void }) {
  const [file, setFile] = useState<File>();
  const [sheets, setSheets] = useState<string[]>([]);
  const [sheet, setSheet] = useState('');
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [choices, setChoices] = useState<Record<number, string>>({});
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(0);
  const matches = useMemo(() => matchImportRows(rows, words ?? []), [rows, words]);
  const existing = groups.find(g => g.id === target);
  const selected = selectedImportIds(matches, choices, existing?.wordIds);
  const skipped = matches.filter(m => ['pending', 'unlisted', 'invalid'].includes(m.status) || m.status === 'choose' && choices[m.row] === 'skip').length;
  const unresolved = matches.filter(m => m.status === 'choose' && !choices[m.row]).length;

  async function read(file: File, selectedSheet?: string) {
    setBusy(true); setError(''); setNotice(''); setRows([]); setChoices({}); setPage(0);
    try {
      const data = await readImportFile(file, selectedSheet);
      setFile(file); setSheets(data.sheets); setSheet(selectedSheet || data.sheets[0] || '');
      if (!selectedSheet) setName(file.name.replace(/\.(csv|xlsx)$/i, '').slice(0, 80));
      setRows(parseImportRows(data.rows));
    } catch (e) { setError(e instanceof Error ? e.message : '無法讀取檔案，請重試。'); }
    finally { setBusy(false); }
  }
  async function confirm() {
    if (busy || unresolved || !selected.ids.length) return;
    setBusy(true); setError('');
    try {
      const group = await importWordGroup(selected.ids, name, target || undefined);
      setNotice(`已加入 ${selected.ids.length} 個單字至「${group.name}」。`);
      setRows([]); setFile(undefined); setSheets([]); setSheet(''); onSaved(group);
    } catch (e) { setError(e instanceof Error ? e.message : '匯入未完成，請重試。'); }
    finally { setBusy(false); }
  }
  return <section className="group-import" aria-labelledby="group-import-heading">
    <h2 id="group-import-heading">從 Excel／CSV 匯入</h2>
    <p>僅支援萬詞譜 7000 單字範圍，範圍外的字暫不產生字卡。能否加入以目前可用字卡為準，匯入前會列出配對結果。</p>
    <p className="direct-muted">一列一個單字，第一列欄名為「英文單字」（必填）與「中文意思」（選填）。請填原形；中文只供核對，不改寫既有字卡。檔案在本機讀取，不會上傳。</p>
    <div className="group-import-links"><a href={`${import.meta.env.BASE_URL}templates/group-import.xlsx`} download>下載 Excel 範本</a><a href={`${import.meta.env.BASE_URL}templates/group-import.csv`} download>下載 CSV 範本</a></div>
    <label>選擇單字檔案<input type="file" accept=".xlsx,.csv" disabled={busy || !words} onChange={e => { const next = e.target.files?.[0]; e.target.value = ''; if (next) { setSheets([]); setFile(undefined); void read(next); } }} /></label>
    <p className="direct-muted">支援 .xlsx、CSV UTF-8；每次最多 7000 列、5 MB。舊版 .xls 請先另存為 .xlsx。</p>
    {sheets.length > 1 && <label>Excel 工作表<select value={sheet} disabled={busy} onChange={e => file && void read(file, e.target.value)}>{sheets.map(s => <option key={s}>{s}</option>)}</select></label>}
    {busy && <p role="status">處理中…</p>}{error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    {!!rows.length && <>
      <h3>匯入預覽 · {file?.name}</h3>
      <label>加入方式<select value={target} disabled={busy} onChange={e => setTarget(e.target.value)}><option value="">建立新群組</option>{groups.map(g => <option value={g.id} key={g.id}>加入「{g.name}」</option>)}</select></label>
      {!target && <label>新群組名稱<input value={name} maxLength={80} disabled={busy} onChange={e => setName(e.target.value)} /></label>}
      <p aria-live="polite">可加入 {selected.ids.length} 字 · 重複略過 {selected.duplicates} 列 · 無法加入 {skipped} 列{unresolved > 0 && ` · 待選擇 ${unresolved} 列`}</p>
      <ol className="group-import-preview">{matches.slice(page * 30, page * 30 + 30).map(m => <li key={m.row}>
        <div><small>第 {m.row} 列</small> <strong>{m.word || '（空白）'}</strong>{m.meaning && <p>檔案中文：{m.meaning}</p>}</div>
        {m.status === 'choose' ? <label>選擇「{m.word}」字卡<select disabled={busy} value={choices[m.row] ?? ''} onChange={e => setChoices({ ...choices, [m.row]: e.target.value })}><option value="">請選擇</option><option value="skip">略過這列</option>{m.candidates.map(w => <option key={w.wordId} value={w.wordId}>{w.word} · {w.pos} {w.meaningZh}</option>)}</select></label>
          : <p>{m.invalid || statusText[m.status]}{m.status === 'matched' && ` · ${m.candidates[0].word}：${m.candidates[0].meaningZh ?? '字義待整理'}`}</p>}
      </li>)}</ol>
      {matches.length > 30 && <div className="group-import-pages"><button disabled={!page} onClick={() => setPage(page - 1)}>上一頁</button><span>{page + 1} / {Math.ceil(matches.length / 30)}</span><button disabled={(page + 1) * 30 >= matches.length} onClick={() => setPage(page + 1)}>下一頁</button></div>}
      <p className="direct-muted">只加入配對成功的單字，保留檔案順序；重複字卡只留一次。未配對項目可修改檔案後重試。</p>
      <button className="direct-primary" disabled={busy || !selected.ids.length || unresolved > 0 || !target && !name.trim()} onClick={() => void confirm()}>確認加入 {selected.ids.length} 個單字</button>
      <button disabled={busy} onClick={() => { setRows([]); setFile(undefined); setSheets([]); setError(''); }}>取消匯入</button>
    </>}
  </section>;
}
