import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {it} from 'vitest';
import type {SenseRecord, WordRecord} from '../../db/types';
import {hasVerbMeaning, recordedSummary, trustedVerbForms} from '../browser/meaningRecords';
import {getWordDisplaySense} from '../browser/wordDisplay';
import {findUnit} from './model';
import {auditHash, isAuditUnitStep, loadLV3Chain, lv3AfterUnitFile, lv3AfterUnitPublishedText, projectAuditStep} from './lv3Audit.testSupport';

type Row = Record<string, unknown>;
type Curriculum = {learningItems: Row[]; questions: unknown[]; relatedNotes: unknown[]; template: Row};
const unit = 'LV3-U06';
const curriculumPath = 'src/features/direct/curriculumLV3Unit6.json';
const step = loadLV3Chain().filter(isAuditUnitStep).find(candidate => candidate.entry.unit === unit)!;
assert.ok(step, 'U06 must be registered; prepared or absent data is not an actual-after pass');
const manifest = step.manifest;
const read = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8'));
const documents = new Map<string, unknown>();
const after = <T>(path: string): T => {
  if (!documents.has(path)) documents.set(path, lv3AfterUnitFile(unit, path, read(path)));
  return documents.get(path) as T;
};
const collection = (dataset: string): Row[] => {
  const contract = manifest.collections![dataset];
  const document = after<Row | Row[]>(contract.path);
  return (contract.rowsField ? (document as Row)[contract.rowsField] : document) as Row[];
};
const one = (rows: Row[], key: string, id: string): Row => {
  const matches = rows.filter(row => row[key] === id);
  assert.equal(matches.length, 1, id);
  return matches[0];
};
const word = (id: string) => one(collection('words'), 'wordId', id) as unknown as WordRecord;
const formalIds = () => new Set(after<Curriculum>(curriculumPath).learningItems.map(row => row.officialWordId).filter(Boolean));
const formalWords = () => {
  const ids = formalIds();
  return collection('words').filter(row => ids.has(row.wordId)) as unknown as WordRecord[];
};
const omit = (row: Row, key: string) => Object.fromEntries(Object.entries(row).filter(([field]) => field !== key));

// Independent anchors were read from the final accepted proposal bytes (51435e3b...)
// and source inventory bytes (2052d7e5...), before any U06 application. They are
// not reconstructed from the future manifest or from the current product data.
const acceptedRowsHash = 'bdf45618a5ad8ea9a901e239cb5e9bcecd3acbb5c720c9cef75d9ce8c73792f4';
const originalExamplesHash = '0acb9c0fb7a5f148a64c681cd37ecbf6edf0e2a2d2797a6f9b2f3f684901747a';

it('authenticates all 144 accepted U06 fields and 56 complete actual-after rows', () => {
  assert.equal(step.entry.status, 'committed');
  assert.equal(manifest.readiness, 'ready');
  assert.equal(auditHash(manifest), 'c59130eba2f8aeae6f0012dbdf1b052f3663dbbdebfcf875d183fddfd0730581');
  assert.equal(auditHash(step.scope), 'e00d9e122b980f9452f2c3be0d4ea10fc5549f37e044622e2d96342d98a9290d');
  assert.equal(manifest.parentManifestHash, '88ba19b48f296fc26b7abdac6468bc1dc26f474523ac78b309aabfed0456578b');
  assert.equal(manifest.patches.length, 56);
  assert.equal(manifest.patches.reduce((count, patch) => count + Object.keys(patch.after).length, 0), 144);
  const accepted = manifest.patches.map(patch => ({
    dataset: patch.dataset, path: patch.path, key: patch.key, id: patch.id, before: patch.before,
    after: Object.fromEntries(Object.entries(patch.after).sort(([a], [b]) => a.localeCompare(b))),
  })).sort((a, b) => (a.dataset + ':' + a.id).localeCompare(b.dataset + ':' + b.id));
  assert.equal(auditHash(accepted), acceptedRowsHash, 'exact accepted fields and original full rows');
  for (const [dataset, rowCount, fieldCount] of [['curriculum', 25, 89], ['words', 19, 43], ['examples', 10, 10], ['notes', 2, 2]] as const) {
    const patches = manifest.patches.filter(patch => patch.dataset === dataset);
    assert.equal(patches.length, rowCount, dataset);
    assert.equal(patches.reduce((count, patch) => count + Object.keys(patch.after).length, 0), fieldCount, dataset);
    for (const patch of patches) assert.deepEqual(one(collection(dataset), patch.key, patch.id), {...patch.before, ...patch.after}, patch.id);
  }
  const actual = Object.fromEntries(Object.keys(manifest.files!).map(path => [path, after(path)]));
  const before = projectAuditStep(manifest, actual, true, step.scope);
  assert.deepEqual(projectAuditStep(manifest, before, false, step.scope), actual, 'complete-file inverse and replay');
});

it('authenticates all six actual published files and all 31 affected starter rows', () => {
  const expected = {...Object.fromEntries(Object.entries(manifest.files!).map(([path, guard]) => [path, guard.afterByteHash])), ...manifest.derivedAfter};
  assert.equal(Object.keys(expected).length, 6);
  // Reuse only this test's fully authenticated raw projection; no shared mutable cache.
  let publishedPack: string | undefined;
  for (const [path, digest] of Object.entries(expected)) {
    const text = lv3AfterUnitPublishedText(unit, path, readFileSync(path, 'utf8').replace(/\r\n/g, '\n'));
    assert.equal(createHash('sha256').update(text).digest('hex'), digest, path);
    if (path === 'public/data/v1/sa-pack.json') publishedPack = text;
  }
  assert.ok(publishedPack, 'complete authenticated historical pack required');
  const pack = JSON.parse(publishedPack) as Record<string, Row[]>;
  // Fixed semantic anchor from the raw U07-before backup, independently matching
  // U06's existing sealed after-byte hash before this optimization.
  assert.equal(auditHash(pack), '2d1530af3c457ff87b7efd67e4898593949409dfc9f0b355f1e4dbfc07e89014', 'complete U06 starter semantic checkpoint');
  const publicPatches = manifest.patches.filter(patch => patch.dataset !== 'curriculum');
  assert.equal(publicPatches.length, 31);
  for (const patch of publicPatches) assert.deepEqual(one(pack[patch.dataset], patch.key, patch.id), {...patch.before, ...patch.after}, patch.id);
  assert.equal(pack.media.length, 1128);
});

it('exposes all 20 repaired supplement meanings in the actual U06 runtime and preserves their read-only identities', () => {
  const runtime = findUnit(6, 'LV3')!;
  assert.ok(runtime);
  assert.equal(runtime.templateId, 'TEXTBOOK-LV3-U06');
  assert.equal(runtime.items.length, 134);
  assert.deepEqual(runtime.items, after<Curriculum>(curriculumPath).learningItems);
  assert.deepEqual(runtime.questions, []);
  const supplements = manifest.patches.filter(patch => patch.dataset === 'curriculum' && patch.after.meaningSource === 'textbook_source_review');
  assert.equal(supplements.length, 20);
  for (const patch of supplements) {
    const item = one(runtime.items as unknown as Row[], 'learningItemId', patch.id);
    for (const field of ['sensePos', 'targetMeaningZh', 'chapterMeaningsZh', 'meaningSource']) assert.equal(item[field], patch.after[field], `${patch.id}: ${field}`);
    assert.equal(item.officialWordId, null);
    assert.equal(item.officialSenseId, null);
    assert.equal(item.practiceMode, 'read_only');
    for (const field of ['review', 'sourcePage', 'sourceRole', 'printedLabel', 'displayWord', 'lexemeRef']) assert.deepEqual(item[field], patch.before[field]);
  }
  assert.equal(runtime.items.filter(item => item.officialWordId === null).length, 22);
  assert.equal(auditHash(runtime.items.map(item => item.learningItemId)), '7306ba6fde42c70a9711f304b6a1f0c03fb9a77f1290cd12e5488abb2077ceb6');
});

it('preserves all 113 original example records except accepted POS, all eight senses, and the historical source bytes', () => {
  const words = formalWords();
  assert.equal(words.length, 82);
  const names = new Set(words.flatMap(record => [record.word, ...(record.wordVariants ?? [])]));
  const examples = collection('examples').filter(row => names.has(row.word as string));
  assert.equal(examples.length, 113);
  assert.equal(auditHash(examples.map(row => omit(row, 'sensePos'))), originalExamplesHash, 'English, Chinese, blank, answer, IDs, statuses and every other original field');
  const ids = formalIds();
  const senses = after<Row[]>('public/data/v1/senses.json').filter(row => ids.has(row.wordId));
  assert.equal(senses.length, 8);
  assert.equal(auditHash(senses), '820869c2bfe3d9511c3f7244c0b4b780a318e13de0498aa1811ac7b59c296908');
  const source = readFileSync('scripts/sources/LV3Unit6.json', 'utf8').replace(/\r\n/g, '\n');
  assert.equal(createHash('sha256').update(source).digest('hex'), '6951cc024aba8a3b5282c2dac094faf66fe3b1ffc51e5a88b63ec11b6aac22b8');
});

it('exposes the exact 13 dictionary-verified new verb forms, including both squirrel spellings, without changing the 15 existing forms', () => {
  const expected = [
    ['W002018', 'afford', 'afforded'], ['W002207', 'credit', 'credited'], ['W002273', 'dust', 'dusted'],
    ['W002300', 'exchange', 'exchanged'], ['W002563', 'murder', 'murdered'], ['W002617', 'parrot', 'parroted'],
    ['W002681', 'profit', 'profited'], ['W002740', 'roast', 'roasted'], ['W002878', 'suspect', 'suspected'],
    ['W003586', 'launch', 'launched'], ['W004343', 'envision', 'envisioned'], ['W002744', 'rocket', 'rocketed'],
    ['W002835', 'squirrel', 'squirrelled / squirreled（美式）'],
  ];
  const patches = manifest.patches.filter(patch => patch.dataset === 'words' && Object.hasOwn(patch.after, 'verbForms'));
  assert.deepEqual(patches.map(patch => patch.id).sort(), expected.map(([id]) => id).sort());
  const senses = after<SenseRecord[]>('public/data/v1/senses.json');
  for (const [id, base, form] of expected) {
    const patch = patches.find(patch => patch.id === id)!;
    assert.equal(Object.hasOwn(patch.before, 'verbForms'), false, id);
    const sourceRef = `https://www.collinsdictionary.com/dictionary/english/${base}`;
    const forms = {base, past: form, pastParticiple: form, sourceRef, status: 'approved'};
    const record = word(id);
    assert.deepEqual(patch.after.verbForms, forms);
    assert.deepEqual(record.verbForms, forms, id);
    assert.deepEqual(trustedVerbForms(record), forms, `${id}: actual runtime forms`);
    assert.ok(record.posAll.includes('v.'), id);
    assert.equal(hasVerbMeaning(record, senses), true, id);
    assert.equal(record.status, patch.before.status, id);
  }
  const newIds = new Set(expected.map(([id]) => id));
  const retained = formalWords().filter(record => record.verbForms && !newIds.has(record.wordId)).map(record => ({wordId: record.wordId, verbForms: record.verbForms}));
  assert.equal(retained.length, 15);
  assert.equal(auditHash(retained), 'b2d84483b457eda17e8444fdf8e9a1e47be2c882e85ff4802468bf548ee6df12');
});

it('restores the printed for and corrects koala and donkey without rewriting source history or approving other meanings', () => {
  const item = findUnit(6, 'LV3')!.items.find(item => item.learningItemId === 'LI-LV3U06-G015')!;
  assert.equal(item.pattern, 'be not cut out for sth（原書星號註記）');
  assert.equal(item.sourcePage, 56);
  const source = read<{usage: {label: string}[]}>('scripts/sources/LV3Unit6.json');
  assert.equal(source.usage[14].label, 'be not cut out sth（原書星號註記）', 'historical import remains unchanged; this was an import error, not a book error');
  const koala = word('W002477');
  assert.equal(koala.meaningZh, '無尾熊');
  assert.equal(recordedSummary(koala, []), '無尾熊');
  assert.deepEqual(getWordDisplaySense(koala, []), {meaning: '無尾熊', pos: 'n.', needsReview: true, source: 'summary'});
  const donkey = word('W002257');
  assert.equal(donkey.meaningEn, 'the symbol of the Democratic Party; also, a domesticated animal related to the horse, with long ears, often used for carrying loads');
  assert.doesNotMatch(donkey.meaningEn!, /1874|introduced|Nast/);
  for (const id of ['W002477', 'W002257']) assert.equal(word(id).status, manifest.patches.find(patch => patch.dataset === 'words' && patch.id === id)!.before.status);
});

it('uses the ten corrected example POS values and both reason notes while preserving each full original row outside the accepted fields', () => {
  const expected = {EX104c84ed: 'v.', EX1c7c613e: 'n.', EX2e556bd5: 'v.', EX4a0dfd5e: 'v.', EX2c5e3573: 'n.', EX64c8bb42: 'v.', EX64ec618c: 'n.', EX9060c71f: 'v.', EXb37be58b: 'v.', EXf81f15c8: 'n.'};
  const patches = manifest.patches.filter(patch => patch.dataset === 'examples');
  assert.deepEqual(patches.map(patch => patch.id).sort(), Object.keys(expected).sort());
  for (const [id, pos] of Object.entries(expected)) {
    const actual = one(collection('examples'), 'exampleId', id);
    const patch = patches.find(patch => patch.id === id)!;
    assert.equal(actual.sensePos, pos);
    assert.deepEqual(omit(actual, 'sensePos'), omit(patch.before, 'sensePos'), id);
  }
  assert.equal(one(collection('notes'), 'noteId', 'NXfc051061').title, 'a reason + 關係副詞 why 引導的關係子句');
  assert.equal(one(collection('notes'), 'noteId', 'NX8f70c3c3').content, '推論／推理……。');
});
