import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

// Read-only source inspection. This report never promotes review states.
const unit = Number(process.argv[2] ?? 1);
const root = resolve(import.meta.dirname, '..');
const read = name => JSON.parse(readFileSync(resolve(root, name), 'utf8'));
const cards = read('src/features/vocabulary/lv1ReviewedImages.json').filter(c => c.unit === unit);
const words = read('public/data/v1/words.json');
const senses = read('public/data/v1/senses.json');
const examples = read('public/data/v1/examples.json');
const media = read('public/data/v1/media.json');
const publicRow = row => ['approved','reviewed','draft','needs_check'].includes(row.status)
  && (row.distributionScope === undefined || row.distributionScope === 'public_ok') && row.active !== false;
const records = cards.map(card => {
  const word = words.find(w => w.wordId === card.officialWordId);
  const imagePath = resolve(root, 'public', card.illustration.path);
  return { ...card, word, senses: senses.filter(s => s.wordId === card.officialWordId && publicRow(s)),
    examples: examples.filter(e => e.word === word?.word && publicRow(e)),
    media: media.filter(m => m.targetWord === word?.word),
    imageExists: existsSync(imagePath),
    imageSha256: existsSync(imagePath) ? createHash('sha256').update(readFileSync(imagePath)).digest('hex') : null,
    uiChecked: false, semanticChecked: false, status: 'not_checked' };
});
const dir = resolve(root, 'output', 'unit-audit-20261105');
mkdirSync(dir, { recursive: true });
writeFileSync(resolve(dir, `LV1-U${String(unit).padStart(2,'0')}-source.json`), JSON.stringify(records, null, 2)+'\n');
console.log(JSON.stringify({unit,cards:records.length,examples:records.reduce((n,c)=>n+c.examples.length,0),missingImages:records.filter(c=>!c.imageExists).map(c=>c.id)}));
for (const c of records) {
  console.log(`\n${c.id} ${c.displayWord} / ${c.word?.pos} / ${c.word?.meaningZh} / ${c.word?.status}`);
  console.log(`CAPTION ${c.illustration.captionEn} | ${c.illustration.captionZh}`);
  for (const s of c.senses) console.log(`SENSE ${s.senseId} ${s.sensePos} ${s.meaningZh} [${s.status}]`);
  for (const e of c.examples) console.log(`EX ${e.exampleId} ${e.sensePos} ${e.meaningHint ?? ''} [${e.status}] ${e.sentenceEn} | ${e.sentenceZh}`);
}
