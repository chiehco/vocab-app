import type { WordRecord } from '../../db/types';
import { normalizeImportWord, wordCatalog } from './groupWords';

export const MAX_IMPORT_ROWS = 7000;
export interface ImportRow { row: number; word: string; meaning: string; invalid?: string }
export interface ImportMatch extends ImportRow { candidates: WordRecord[]; status: 'matched' | 'choose' | 'pending' | 'unlisted' | 'invalid' }

/** CSV with quoted commas, embedded newlines and escaped double quotes. No formula evaluation. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = [], cell = '', quoted = false, closed = false;
  text = text.replace(/^\uFEFF/, '');
  const pushCell = () => { row.push(cell); cell = ''; closed = false; };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else { quoted = false; closed = true; } }
      else cell += c;
    } else if (c === ',' || c === '\n' || c === '\r') {
      pushCell();
      if (c !== ',') { rows.push(row); row = []; if (c === '\r' && text[i + 1] === '\n') i++; }
    } else if (c === '"' && !cell && !closed) quoted = true;
    else if (closed || c === '"') throw new Error('CSV 引號格式不正確，請另存為 CSV UTF-8 後重試。');
    else cell += c;
    if (rows.length > MAX_IMPORT_ROWS + 1 || row.length > 50) throw new Error('檔案過大，請使用範本並將每次匯入控制在 7000 列內。');
  }
  if (quoted) throw new Error('CSV 引號未成對，請檢查檔案。');
  if (cell || row.length || closed) { pushCell(); rows.push(row); }
  return rows;
}

export function parseImportRows(rows: unknown[][]): ImportRow[] {
  const headers = (rows[0] ?? []).map(v => typeof v === 'string' ? v.replace(/^\uFEFF/, '').trim() : '');
  const english = headers.indexOf('英文單字'), chinese = headers.indexOf('中文意思');
  if (english < 0 || headers.filter(h => h === '英文單字').length !== 1 || headers.filter(h => h === '中文意思').length > 1)
    throw new Error('第一列須包含「英文單字」欄；「中文意思」為選填。欄名不可重複。');
  if (rows.length > MAX_IMPORT_ROWS + 1) throw new Error('一次最多匯入 7000 列，請拆成數個檔案。');
  const result = rows.slice(1).flatMap((cells, index): ImportRow[] => {
    if (cells.every(v => v == null || v === '')) return [];
    const raw = cells[english], zh = chinese >= 0 ? cells[chinese] : '';
    const word = typeof raw === 'string' ? raw.trim() : '', meaning = typeof zh === 'string' ? zh.trim() : '';
    const invalid = !word ? '缺少英文單字，或儲存格不是文字' : word.length > 120 || !/^[a-zA-Z][a-zA-Z '\u2019\u2018\u2010\u2011\u2013.\-/]*$/.test(word)
      ? '請填英文單字原形，不含編號、公式或中文' : undefined;
    return [{ row: index + 2, word: word || String(raw ?? ''), meaning, invalid }];
  });
  if (!result.length) throw new Error('檔案沒有單字，請在欄名下方填入內容。');
  return result;
}

export function matchImportRows(rows: ImportRow[], installed: WordRecord[]): ImportMatch[] {
  const index = new Map<string, Set<string>>();
  for (const w of wordCatalog) for (const label of [w.word, ...w.variants]) {
    const key = normalizeImportWord(label);
    if (!index.has(key)) index.set(key, new Set());
    index.get(key)!.add(w.wordId);
  }
  const ready = new Map(installed.map(w => [w.wordId, w]));
  return rows.map(row => {
    const ids = [...(index.get(normalizeImportWord(row.word)) ?? [])];
    const candidates = ids.flatMap(id => ready.has(id) ? [ready.get(id)!] : []);
    return { ...row, candidates, status: row.invalid ? 'invalid' : !ids.length ? 'unlisted' : !candidates.length ? 'pending' : ids.length > 1 ? 'choose' : 'matched' };
  });
}

export function selectedImportIds(matches: ImportMatch[], choices: Record<number, string>, existing: string[] = []) {
  const seen = new Set(existing); const ids: string[] = []; let duplicates = 0;
  for (const m of matches) {
    const id = m.status === 'matched' ? m.candidates[0].wordId : m.status === 'choose' ? choices[m.row] : undefined;
    if (!id || !m.candidates.some(w => w.wordId === id)) continue;
    if (seen.has(id)) { duplicates++; continue; }
    seen.add(id); ids.push(id);
  }
  return { ids, duplicates };
}

export async function readImportFile(file: File, sheet?: string): Promise<{ sheets: string[]; rows: unknown[][] }> {
  if (file.size > 5 * 1024 * 1024) throw new Error('檔案須小於 5 MB，請只保留要匯入的單字表。');
  if (/\.csv$/i.test(file.name)) {
    let text: string;
    try { text = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer()); }
    catch { throw new Error('CSV 須使用 UTF-8 編碼，請在 Excel 另存為「CSV UTF-8」。'); }
    return { sheets: [], rows: parseCsv(text) };
  }
  if (!/\.xlsx$/i.test(file.name)) throw new Error('支援 .xlsx 與 .csv；舊版 .xls 請先另存為 .xlsx。');
  const { default: readExcelFile } = await import('read-excel-file/browser');
  try {
    const workbook = await readExcelFile(file);
    const selected = sheet ? workbook.find(s => s.sheet === sheet) : workbook[0];
    if (!selected) throw new Error('找不到工作表');
    return { sheets: workbook.map(s => s.sheet), rows: selected.data };
  } catch { throw new Error('無法讀取 Excel，請確認檔案未加密，並另存為 .xlsx 後重試。'); }
}
