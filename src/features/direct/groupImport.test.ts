import 'fake-indexeddb/auto';
import { beforeEach, afterEach, expect, it } from 'vitest';
import { parseCsv, parseImportRows, matchImportRows, selectedImportIds, readImportFile } from './groupImport';
import { wordCatalog, groupWords } from './groupWords';
import { contentDb } from '../../db/contentDb';
import { progressDb } from '../../db/progressDb';
import { importWordGroup, saveGroup } from './store';
import { templateGroup, validGroup } from './model';
import { exportProgress, importProgress, validateBackup } from '../../backup/backup';
import type { WordRecord } from '../../db/types';

function word(wordId: string): WordRecord {
  const c = wordCatalog.find(w => w.wordId === wordId)!;
  return { ...c, level:'LV3', pos:'n.',posAll:['n.'],meaningZh:'字義',meaningEn:null,usagePattern:null,syllables:null,stressPattern:null,phoneticUs:null,familyKey:null,isCore:false,sourceNote:null,status:'reviewed' };
}
const passage = word('W002618'), ability = word('W000002');
beforeEach(async () => { await progressDb.delete(); await contentDb.delete(); await progressDb.open(); await contentDb.open(); });
afterEach(async () => { await progressDb.delete(); await contentDb.delete(); });

it('parses UTF-8 BOM, quoted commas, escaped quotes, multiline fields, CRLF and blank rows', () => {
  const rows = parseImportRows(parseCsv('\uFEFF英文單字,中文意思\r\npassage,"文章,段落"\r\n\r\nability,"能""力\n說明"\r\n'));
  expect(rows).toEqual([{row:2,word:'passage',meaning:'文章,段落',invalid:undefined},{row:4,word:'ability',meaning:'能"力\n說明',invalid:undefined}]);
  expect(() => parseCsv('英文單字\n"passage')).toThrow('引號');
  expect(() => parseCsv('英文單字\n"passage"junk')).toThrow('引號');
});
it('requires header, accepts a single column, rejects empty files, flags non-text and formula rows', () => {
  expect(() => parseImportRows([['passage']])).toThrow('第一列');
  expect(() => parseImportRows([['英文單字','英文單字']])).toThrow('不可重複');
  expect(() => parseImportRows([['英文單字']])).toThrow('沒有單字');
  expect(parseImportRows([['英文單字'],['passage']])[0].word).toBe('passage');
  const rows = parseImportRows([['英文單字'],[123],['=HYPERLINK("x")'],['1.passage']]);
  expect(rows.every(r => !!r.invalid)).toBe(true);
  expect(() => parseImportRows([['英文單字'], ...Array.from({length:7001},()=>['passage'])])).toThrow('7000');
});
it('matches existing words and variants, distinguishes unavailable cards, and deduplicates by stable ID in file order', () => {
  const rows = parseImportRows([['英文單字'],[' PASSAGE '],['ability'],['passage'],['abandon'],['qwertyxylophone']]);
  const matches = matchImportRows(rows, [passage, ability]);
  expect(matches.map(m => m.status)).toEqual(['matched','matched','matched','pending','unlisted']);
  expect(selectedImportIds(matches, {})).toEqual({ids:[passage.wordId,ability.wordId],duplicates:1});
  expect(selectedImportIds(matches, {}, [ability.wordId])).toEqual({ids:[passage.wordId],duplicates:2});
  expect(matchImportRows(parseImportRows([['英文單字'],['an']]), [word('W000001')])[0].candidates[0].wordId).toBe('W000001');
});
it('never guesses between ambiguous catalogue entries, including when one card is not installed', () => {
  const rows = parseImportRows([['英文單字'],['chair']]);
  const matches = matchImportRows(rows, [word('W000155')]);
  expect(matches[0].status).toBe('choose');
  expect(selectedImportIds(matches, {}).ids).toEqual([]);
  expect(selectedImportIds(matches, {2:'skip'}).ids).toEqual([]);
  expect(selectedImportIds(matches, {2:'W000155'}).ids).toEqual(['W000155']);
  expect(selectedImportIds(matches, {2:'W999999'}).ids).toEqual([]);
});
it('imports into existing groups atomically, preserves unit items and supports backup round trip', async () => {
  await contentDb.words.bulkPut([passage, ability]);
  const base = templateGroup(); await saveGroup(base);
  await progressDb.settings.put({key:'sentinel', value:'keep'});
  await importWordGroup([passage.wordId], 'ignored', base.id);
  await importWordGroup([passage.wordId, ability.wordId], 'ignored', base.id);
  const group = (await progressDb.customGroups.get(base.id))!;
  expect(group.itemIds).toEqual(base.itemIds); expect(group.name).toBe(base.name);
  expect(group.wordIds).toEqual([passage.wordId, ability.wordId]);
  expect(groupWords(group.wordIds!, [ability, passage]).map(w=>w.word)).toEqual(['passage','ability']);
  const backup = await exportProgress(); expect(backup.schemaVersion).toBe(5); expect(validateBackup(backup)).toBeNull();
  await progressDb.customGroups.clear(); await importProgress(backup);
  expect((await progressDb.customGroups.get(base.id))?.wordIds).toEqual(group.wordIds);
  expect((await progressDb.settings.get('sentinel'))?.value).toBe('keep');
  expect(validGroup({...group,wordIds:['W999999']})).toBe(false);
  expect(validGroup({...group,wordIds:[passage.wordId,passage.wordId]})).toBe(false);
  await expect(importWordGroup(['W003007'], 'unavailable')).rejects.toThrow();
  await expect(importWordGroup([passage.wordId], 'missing', 'missing')).rejects.toThrow();
  expect(await progressDb.customGroups.count()).toBe(1);
});
it('creates an independent word group without altering content or progress', async () => {
  await contentDb.words.put(passage);
  const g = await importWordGroup([passage.wordId], ' 自選 ');
  expect(g.name).toBe('自選'); expect(g.itemIds).toEqual([]); expect(validGroup(g)).toBe(true);
  expect(await contentDb.words.get(passage.wordId)).toEqual(passage);
  expect(await progressDb.cardStates.count()).toBe(0);
});
it('rejects unsupported file types, oversize files and non UTF-8 CSV', async () => {
  await expect(readImportFile(new File(['test'],'old.xls'))).rejects.toThrow('.xls');
  await expect(readImportFile(new File([new Uint8Array(5*1024*1024+1)],'big.csv'))).rejects.toThrow('5 MB');
  await expect(readImportFile(new File([new Uint8Array([0xff,0xff])],'big5.csv'))).rejects.toThrow('UTF-8');
});
