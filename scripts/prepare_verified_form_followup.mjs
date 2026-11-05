import assert from 'node:assert/strict';
import {readFileSync, writeFileSync, mkdirSync, existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';

const root = 'docs/unit-audit-20261105/';
const batches = {
  'U03-U04': {
    sources: ['U03-U04-VERB-FORMS-VERIFICATION.json'],
    ids: 'W000113 W000155 W000183 W000184 W000343 W000363 W000507 W000633 W000650 W000695 W000740 W000823 W000851 W000858 W000894 W000995'.split(' '),
  },
  'U05-U06': {
    sources: ['U05-U06-VERB-FORMS-VERIFICATION.json'],
    ids: 'W000348 W000309 W000270 W000933 W000493 W000881 W000618 W000500 W000986 W000870 W000256 W000242 W000074 W000864 W000049 W000055 W000772 W000136 W000480 W000741 W000199 W000968 W000628 W000262 W000824 W000080 W000302 W000595 W000319 W000924 W000688 W000403 W000450 W000685 W000121 W000365 W000147 W000661 W000494 W000486 W000922 W000950 W001054 W005996 W000559 W001723'.split(' '),
  },
};
const batch = process.argv[2];
assert.ok(batches[batch], 'Select an explicitly reviewed batch');
const config = batches[batch];
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const save = (path, data) => writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
const words = read('public/data/v1/words.json');
const sourcePath = root + 'VERIFIED-FOLLOWUP-VERB-FORMS-SOURCES.json';
const sources = existsSync(sourcePath) ? read(sourcePath) : {
  baseCheckpoint: 'd26603868f60e60069d29ea00613d2e86f94d7bd',
  researchCommit: '08aaf5f92c375e29635ea623aa5b5339a1280418',
  scope: 'Only explicitly listed missing verbForms fields. No meaning, example, POS or whole-word review approval.',
  facts: [],
};
const entries = config.sources.flatMap(name => read(root + 'source-followup-candidates/' + name).entries.map(entry => ({...entry, researchFile: name})));
const facts = config.ids.map(id => {
  const matches = entries.filter(entry => entry.wordId === id);
  assert.equal(matches.length, 1, 'Exactly one research entry: ' + id);
  const entry = matches[0];
  assert.ok(entry.proposedVerbForms && !entry.pendingReason, 'Pending or unrepresented forms: ' + id);
  const matchesNow = words.filter(word => word.wordId === id);
  assert.equal(matchesNow.length, 1, 'Immutable unique identity: ' + id);
  const word = matchesNow[0];
  assert.equal(word.word, entry.word);
  assert.match(word.pos, /(?:^|\/)(?:v|vt|vi)\./);
  assert.ok(!Object.hasOwn(word, 'verbForms'), 'Preserve existing user/new values: ' + id);
  const verbForms = {...entry.proposedVerbForms, status: 'approved'};
  // Cambridge direct access failed; the directly read government reference
  // explicitly distinguishes got (past) from got/gotten (past participle).
  if (id === 'W000343') verbForms.sourceRef = 'https://our-languages.canada.ca/en/writing-tips-plus/got-gotten-';
  return {wordId:id, word:word.word, batch, units:entry.units,
    verbForms, evidence:entry.evidence,
    restriction:entry.homographAndVariantRestrictions,
    applicableSense:entry.applicableSense,
    researchFile:entry.researchFile,
    originalPos:word.pos,
    verification:'Exact current field absence, headword/POS and source forms checked before mutation.'};
});
assert.equal(new Set([...sources.facts, ...facts].map(fact => fact.wordId)).size, sources.facts.length + facts.length, 'Do not duplicate an earlier correction');
sources.facts.push(...facts);
const checkpoint = execFileSync('git', ['rev-parse', 'HEAD'], {encoding:'utf8'}).trim();
const manifest = {
  baseCommit:'29cfc684d7a11b07f09988c478d30358830f1951',
  baseCheckpoint:sources.baseCheckpoint, checkpointBefore:checkpoint,
  batch, scope:'Only genuinely absent, independently sourced principal parts. Delete the new key to restore absence. Existing statuses, examples, senses and all other fields remain unchanged.',
  patches:facts.map(fact => ({dataset:'words', key:'wordId', id:fact.wordId,
    before:{verbForms:{$absent:true}}, after:{verbForms:fact.verbForms},
    reason:'Fill independently verified missing principal parts. ' + fact.restriction,
    evidence:fact.evidence.map(item => item.url).join(' ; ')})),
};
mkdirSync(root, {recursive:true});
save(sourcePath, sources);
save(root + 'LV1-' + batch + '-verified-forms-patches.json', manifest);
console.log(JSON.stringify({batch, checkpoint, fields:facts.length, words:facts.map(fact => fact.word)}));
