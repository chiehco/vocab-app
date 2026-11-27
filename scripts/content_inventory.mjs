/** Read-only, reproducible inventory of compiled LV1–LV6 records.
 * This deliberately does not infer runtime availability or content approval.
 */
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, existsSync, writeFileSync } from 'node:fs';
import { resolve, relative, isAbsolute, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIRECT = 'src/features/direct';
const IMAGE_PAIRS = 'src/features/vocabulary/lv1ReviewedImages.json';
const UNKNOWN = 'unknown';
const CORE_MODES = ['english_to_chinese', 'spelling', 'sentence_word_choice', 'passage_cloze', 'passage_matching'];
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
// Git checkouts may use CRLF on Windows. Hash the same logical UTF-8 text everywhere.
const normalizedText = text => text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
const tally = values => Object.fromEntries([...new Set(values)].sort().map(value => [value, values.filter(v => v === value).length]));

export function buildContentInventory(root, baseCommit = null) {
  root = resolve(root);
  const inputs = new Map();
  function localPath(path) {
    const full = resolve(root, path), rel = relative(root, full);
    if (isAbsolute(path) || rel === '..' || rel.startsWith('..\\') || rel.startsWith('../') || isAbsolute(rel)) {
      throw new Error('Inventory input must stay inside the repository');
    }
    return full;
  }
  function read(path) {
    const text = normalizedText(readFileSync(localPath(path), 'utf8'));
    inputs.set(path, { path, sha256: sha256(text) });
    return JSON.parse(text);
  }
  function manifest(path) {
    if (!nonempty(path)) return { path: null, state: 'not_recorded', sha256: null };
    const full = localPath(path);
    if (!existsSync(full)) {
      inputs.set(path, { path, sha256: null });
      return { path, state: 'missing_from_checkout', sha256: null };
    }
    read(path);
    return { ...inputs.get(path), state: 'checked_in_manifest_present' };
  }
  const seen = new Set();
  const units = readdirSync(localPath(DIRECT)).filter(name => /^curriculum.*\.json$/.test(name)).sort().map(name => {
    const path = `${DIRECT}/${name}`, data = read(path), template = data.template;
    const identity = /^(?:(?:TEXTBOOK|IVY)-)?(LV[1-6])-U(\d+)$/.exec(template?.templateId ?? '');
    if (!identity || !Array.isArray(data.learningItems)) throw new Error(`Unrecognized curriculum schema: ${path}`);
    const [, level, number] = identity, unit = Number(number), key = `${level}-U${number.padStart(2, '0')}`;
    if (seen.has(key)) throw new Error(`Duplicate compiled unit: ${key}`);
    seen.add(key);
    if (template.level !== undefined && template.level !== level || template.unit !== undefined && template.unit !== unit) {
      throw new Error(`Conflicting template identity: ${path}`);
    }
    const items = data.learningItems, ids = items.map(item => item.learningItemId);
    if (ids.some(id => !nonempty(id)) || new Set(ids).size !== ids.length) throw new Error(`Invalid learning item identities: ${path}`);
    const vocabulary = items.filter(item => item.kind === 'vocabulary');
    let questions = data.questions ?? data.grammarQuestions ?? null;
    let questionPath = questions === null ? null : path;
    // LV3 U01 retains its grammar questions in a separate checked-in file.
    if (name === 'curriculum.json') { questionPath = `${DIRECT}/grammarQuestions.json`; questions = read(questionPath); }
    if (questions !== null && !Array.isArray(questions)) throw new Error(`Invalid question list: ${path}`);
    const options = questions?.flatMap(q => {
      if (!Array.isArray(q.options)) throw new Error(`Invalid question options: ${path}`);
      return q.options;
    });
    return {
      key, level, unit, templateId: template.templateId, revision: template.revision ?? null, compiledPath: path,
      sourceManifest: manifest(template.sourceManifest),
      deliveryMode: template.deliveryMode ?? null,
      learningItemCount: items.length, itemKinds: tally(items.map(i => i.kind ?? UNKNOWN)),
      vocabularyCount: vocabulary.length,
      mappedVocabularyCount: vocabulary.filter(i => nonempty(i.officialWordId)).length,
      unmappedVocabularyIds: vocabulary.filter(i => !nonempty(i.officialWordId)).map(i => i.learningItemId),
      vocabularyWithSenseId: vocabulary.filter(i => nonempty(i.officialSenseId)).length,
      vocabularyWithOriginalExample: vocabulary.filter(i => i.originalExample != null).length,
      directIllustrationFieldCount: items.filter(i => i.illustration != null).length,
      itemReviewLabels: tally(items.map(i => i.review ?? UNKNOWN)),
      itemPracticeModeLabels: tally(items.map(i => i.practiceMode ?? UNKNOWN)),
      recordedReleaseReview: data.releaseReview ?? null,
      packagedQuestions: { path: questionPath, count: questions?.length ?? null,
        sourceTypes: questions === null ? null : tally(questions.map(q => q.sourceType ?? UNKNOWN)),
        optionCount: options?.length ?? null,
        optionsWithoutRationale: options?.filter(o => !nonempty(o.rationaleZh)).length ?? null },
      latestMotherTableVerified: UNKNOWN, semanticAcceptance: UNKNOWN, runtimeCatalogVisibility: UNKNOWN,
      physicalDeviceAcceptance: UNKNOWN,
      corePracticeAcceptance: Object.fromEntries(CORE_MODES.map(mode => [mode, UNKNOWN])),
    };
  }).sort((a, b) => a.level.localeCompare(b.level) || a.unit - b.unit);
  const pairs = read(IMAGE_PAIRS);
  if (!Array.isArray(pairs) || pairs.some(p => !Number.isInteger(p.unit) || p.unit < 1)) throw new Error('Invalid LV1 image-pair registry');
  const lv1ImageGroups = [...new Set(pairs.map(p => p.unit))].sort((a, b) => a - b).map(unit => {
    const rows = pairs.filter(p => p.unit === unit);
    return { level: 'LV1', unit, registryPath: IMAGE_PAIRS, pairCount: rows.length,
      pairsWithWordId: rows.filter(p => nonempty(p.officialWordId)).length,
      uniqueWordIds: new Set(rows.filter(p => nonempty(p.officialWordId)).map(p => p.officialWordId)).size,
      semanticAcceptance: UNKNOWN, physicalDeviceAcceptance: UNKNOWN };
  });
  const levels = Array.from({ length: 6 }, (_, i) => `LV${i + 1}`).map(level => {
    const rows = units.filter(u => u.level === level), groups = lv1ImageGroups.filter(g => g.level === level);
    const sum = field => rows.reduce((total, u) => total + u[field], 0);
    return { level, expectedBookUnitCount: null, compiledUnitCount: rows.length,
      observedUnitNumbers: [...new Set([...rows, ...groups].map(u => u.unit))].sort((a, b) => a - b),
      compiledVocabularyCount: sum('vocabularyCount'), mappedVocabularyCount: sum('mappedVocabularyCount'),
      unmappedVocabularyCount: rows.reduce((n, u) => n + u.unmappedVocabularyIds.length, 0),
      vocabularyWithOriginalExample: sum('vocabularyWithOriginalExample'),
      knownPackagedQuestionCount: rows.reduce((n, u) => n + (u.packagedQuestions.count ?? 0), 0),
      unitsWithUnknownPackagedQuestions: rows.filter(u => u.packagedQuestions.count === null).length,
      lv1ImagePairCount: groups.reduce((n, g) => n + g.pairCount, 0) };
  });
  return { schemaVersion: 1, baseCommit, scope: 'checked_in_compiled_content_only',
    inputHashFormat: 'SHA-256 of UTF-8 text with BOM removed and CRLF/CR normalized to LF',
    limitations: [
      'Counts describe records, not semantic correctness, approval, publication or whole-book completeness.',
      'A source manifest is a checked-in transcription, not verification of the latest mother table or original photographs.',
      'Packaged questions exclude runtime-derived choice/cloze variants and standalone question banks; counts are not five-mode coverage.',
      'LV1 image pairs are separate from compiled vocabulary rows; do not add them as unique words.',
      'Illustration fields exclude resolver registries and are not missing-art counts; text-only units need no inferred artwork.',
      'Raw review/practice labels and releaseReview are preserved, never promoted to approval. Device acceptance stays unknown.',
      'Absent unit numbers have no inferred zero counts; the expected whole-book unit denominator is unknown.',
    ], levels, units, lv1ImageGroups,
    inputs: [...inputs.values()].sort((a, b) => a.path.localeCompare(b.path)) };
}

export function runCli(args, root = resolve(dirname(fileURLToPath(import.meta.url)), '..')) {
  if (!['--write', '--check'].includes(args[0]) || !args[1] || args.length > 4 ||
      (args.length !== 2 && (args.length !== 4 || args[2] !== '--base-commit' || !/^[a-f0-9]{40}$/.test(args[3])))) {
    throw new Error('Usage: node scripts/content_inventory.mjs (--write|--check) report.json [--base-commit <40-character SHA>]');
  }
  const output = resolve(args[1]);
  const savedText = args[0] === '--check' ? normalizedText(readFileSync(output, 'utf8')) : null;
  const saved = savedText === null ? null : JSON.parse(savedText);
  const report = buildContentInventory(root, args[3] ?? saved?.baseCommit ?? null);
  const text = JSON.stringify(report, null, 2) + '\n';
  if (args[0] === '--check') {
    if (text !== savedText) throw new Error('Content inventory has drifted; generate a new snapshot and review the diff');
  } else {
    // Refuse to overwrite source files or existing evidence; snapshots are append-only.
    writeFileSync(output, text, { flag: 'wx', encoding: 'utf8' });
  }
  return report.levels;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(JSON.stringify(runCli(process.argv.slice(2)), null, 2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
