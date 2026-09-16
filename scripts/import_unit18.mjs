// Import only the approved Unit18 pack; reject changed source approvals or web assets.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const source = process.argv[2];
if (!source) throw new Error('Pass the approved Unit18 pack directory.');
const read = name => JSON.parse(readFileSync(join(source, name), 'utf8'));
const pack = read('unit18.json'), current = read('unit18-review.json');
if (pack.approval.status !== 'approved' || pack.approval.cards.length !== 47) throw new Error('Unit18 approval incomplete');
for (const card of current.cards) {
  const approved = pack.approval.cards.find(a => a.reviewId === card.reviewId);
  const hash = createHash('sha256').update(readFileSync(card.image)).digest('hex');
  const text = JSON.stringify([card.displayWord, card.sensePos, card.targetMeaningZh, card.captionEn, card.captionZh]);
  if (approved?.pairApproval !== 'approved' || approved.artApproval !== 'approved' || approved.imageSha256 !== hash || approved.textSha256 !== createHash('sha256').update(text).digest('hex')) throw new Error(`Changed approval: ${card.reviewId}`);
  const item = pack.learningItems.find(i => i.approval?.reviewId === card.reviewId);
  if (!item || item.displayWord !== card.displayWord || item.officialWordId !== card.officialWordId || item.sensePos !== card.sensePos || item.targetMeaningZh !== card.targetMeaningZh || item.illustration.captionEn !== card.captionEn || item.illustration.captionZh !== card.captionZh || !pack.assets.some(a => item.illustration.path === `curriculum/lv4-u18/${a.file}`)) throw new Error(`Pack differs from approved content: ${card.reviewId}`);
}
const destination = join(root, 'public/curriculum/lv4-u18');
mkdirSync(destination, { recursive: true });
for (const asset of pack.assets) {
  const path = join(source, 'assets/web', asset.file);
  if (createHash('sha256').update(readFileSync(path)).digest('hex') !== asset.sha256) throw new Error(`Changed asset: ${asset.file}`);
  copyFileSync(path, join(destination, asset.file));
}
const { template, learningItems, questions, relatedNotes } = pack;
writeFileSync(join(root, 'src/features/direct/curriculumLV4Unit18.json'), JSON.stringify({ template, learningItems, questions, relatedNotes }, null, 1) + '\n');
console.log(`${learningItems.length} items, ${questions.length} questions, ${pack.assets.length} images imported.`);
