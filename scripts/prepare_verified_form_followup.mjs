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
  'U07': {
    sources: ['U07-VERB-FORMS-VERIFICATION.json'],
    ids: 'W000008 W000041 W000046 W000082 W000146 W000387 W000432 W000476 W000498 W000525 W000529 W000534 W000541 W000569 W000613 W000632 W000672 W000699 W000724 W000732 W000745 W000755 W000784 W000822 W000920 W001086 W001523 W001598 W001768 W001779 W002047 W003270 W003306 W003352 W003553 W003959 W004780'.split(' '),
    sourceSnapshot: {researchCommit:'89f9fd242ed94d69393bf24ba10c8b39486669a1', sourceBlob:'46aef54ff3137de0c538391a0283523cfe21a8e7'},
  },
  'U08-U09': {
    sources: ['U08-U09-VERB-FORMS-VERIFICATION.json'],
    ids: 'W000635 W000655 W003289 W000630 W000366 W000653 W004820 W000011 W000376 W001594 W000976 W000504 W000016 W001390 W000572 W000224 W001045 W003329 W000478 W000169 W003154 W000204 W001708 W001932 W000125 W000291 W002227 W000718 W001456 W000328 W000677 W000707 W000364 W000326 W000316 W000207 W002711 W001184 W001307 W002292 W000117 W000467 W004786 W004804 W003584 W000239 W000622 W000892 W000945 W000266 W001331 W000194 W000992 W000219'.split(' '),
    sourceSnapshot: {researchCommit:'72d91393e73bc487f9bded8baa2ed76942e1d816', sourceBlob:'7a0fab10a5cfb4480b51a489a01acbd296b52100'},
    preserveVariantEvidence: true,
  },
  'U10': {
    sources: ['U10-U15-PUBLISHED-VERB-FORMS-VERIFICATION.json','U10-ADDITIONAL-VERB-FORMS-VERIFICATION.json'],
    ids: 'W000023 W002636 W003416 W003020 W000698 W001517 W002983 W000171 W000201 W000170 W004944 W001261 W001454 W002734 W000645 W000307 W000709 W000243 W001159 W000313 W000826 W000814 W000949 W003672 W000748 W000895 W000700'.split(' '),
    sourceSnapshot: {researchCommit:'526314ba006d8c22432d88f0be1bd7eb94407a09', sourceBlobs:{'U10-U15-PUBLISHED-VERB-FORMS-VERIFICATION.json':'5215e48aadd050f5118e85727bc391ad7150738b','U10-ADDITIONAL-VERB-FORMS-VERIFICATION.json':'4e8d63b49481801b17a68cef1bfe5336044ce7d7'}},
    preserveVariantEvidence: true,
    preserveUnitContexts: true,
  },
  'U11': {
    sources: ['U10-U15-PUBLISHED-VERB-FORMS-VERIFICATION.json','U11-ADDITIONAL-VERB-FORMS-VERIFICATION.json'],
    ids: 'W000409 W000980 W000591 W000522 W001854 W000018 W001259 W000156 W000889 W005939 W000305 W000711 W000955 W003188 W000497 W000444 W000730 W000701 W000310 W000454 W000674 W000908 W000785 W000819 W000110 W000670'.split(' '),
    sourceSnapshot: {researchCommit:'872786556e223809a88c3a315ecba1f843de718d',sourceBlobs:{'U10-U15-PUBLISHED-VERB-FORMS-VERIFICATION.json':'5215e48aadd050f5118e85727bc391ad7150738b','U11-ADDITIONAL-VERB-FORMS-VERIFICATION.json':'eb3742b2155fd5b652df7788f76408c036d1d2a2'}},
    readVerifiedGitBlobs: true,
    preserveVariantEvidence: true,
    preserveUnitContexts: true,
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
const sourceRef=config.readVerifiedGitBlobs?config.sourceSnapshot.researchCommit:'HEAD';
const entries = config.sources.flatMap(name => {
  const path=root+'source-followup-candidates/'+name;
  const source=config.readVerifiedGitBlobs?JSON.parse(execFileSync('git',['show',sourceRef+':'+path],{encoding:'utf8',maxBuffer:8e6})):read(path);
  return source.entries.map(entry => ({...entry,researchFile:name}));
});
if (config.sourceSnapshot) for(const name of config.sources){
  const expected=config.sourceSnapshot.sourceBlobs?.[name]??config.sourceSnapshot.sourceBlob;
  assert.ok(expected,'Every source needs an exact verified blob');
  assert.equal(execFileSync('git',['rev-parse',sourceRef+':'+root+'source-followup-candidates/'+name],{encoding:'utf8'}).trim(),expected,'Current source must match the verified latest research blob');
}
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
  if (id === 'W004780') verbForms.sourceRef = 'https://www.collinsdictionary.com/conjugation/english/sequence';
  return {wordId:id, word:word.word, batch, units:entry.units,
    verbForms, evidence:entry.evidence,
    restriction:entry.homographAndVariantRestrictions,
    applicableSense:entry.applicableSense,
    researchFile:entry.researchFile,
    originalPos:word.pos,
    ...(config.sourceSnapshot ? {sourceSnapshot:{researchCommit:config.sourceSnapshot.researchCommit,sourceBlob:config.sourceSnapshot.sourceBlobs?.[entry.researchFile]??config.sourceSnapshot.sourceBlob}} : {}),
    ...(config.preserveUnitContexts ? {cardIds:entry.cardIds,cardContexts:entry.cardContexts} : {}),
    ...(config.preserveVariantEvidence ? {sourceSupportedForms:entry.sourceSupportedForms,variantAssessment:entry.variantAssessment,
      ...(entry.displayQualificationRecommended?{displayQualificationRecommended:entry.displayQualificationRecommended}:{}),
      ...(entry.presentationPriority?{presentationPriority:entry.presentationPriority}:{}),
      ...(entry.senseAndVariantRecords?{senseAndVariantRecords:entry.senseAndVariantRecords}:{}),
      ...(entry.regionalAndConstructionRestrictions?{regionalAndConstructionRestrictions:entry.regionalAndConstructionRestrictions}:{}),
      currentSourceCheck:{method:'Direct official dictionary forms and applicable verb construction; conjugation and regional notes checked where needed',checkedAt:new Date().toISOString(),success:true}} : {}),
    ...(id === 'W004780' ? {currentSourceCheck:{verifiedUrl:verbForms.sourceRef,method:'Direct Collins Past and Past Participle table',unavailableRecheck:{url:'https://www.oxfordlearnersdictionaries.com/definition/english/sequence_2',status:403},note:'Original research evidence is retained; this pass does not claim a successful direct Oxford read.'}} : {}),
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
