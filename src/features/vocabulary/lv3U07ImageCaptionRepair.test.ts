import { expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeLV3U07RegistryText, beforeLV3U07CaptionText, u07ImageBytesHash, validateLV3U07ImageProof } from '../../../scripts/lv3_u07_image_caption_guard.mjs';
import { beforeU07Images } from './lv3U07ImageCaptionRepair.testSupport';
import { beforeLV3PuppetText } from '../../../scripts/lv3_puppet_image_guard.mjs';
import { beforeLV3ConfirmText } from '../../../scripts/lv3_confirm_image_guard.mjs';
import { beforeLV3ReplaceText } from '../../../scripts/lv3_replace_image_guard.mjs';
import { beforeLV3GeneralImages, lv3ImageHash } from '../../../scripts/lv3_image_repair_guard.mjs';
import { loadLV3Chain, lv3AfterUnitPublishedText } from '../direct/lv3Audit.testSupport';
import proof from '../../../docs/unit-audit-20261105/LV3-U07-image-caption-repairs.json';
import puppetProof from '../../../docs/unit-audit-20261105/LV3-puppet-image-repair.json';
import confirmProof from '../../../docs/unit-audit-20261105/LV3-confirm-image-repair.json';
import replaceProof from '../../../docs/unit-audit-20261105/LV3-replace-image-repair.json';
import bankProof from '../../../docs/unit-audit-20261105/LV3-bank-permissible-image-repairs.json';
import registry from './auditedWordIllustrations.json';
import captions from '../wordbeast/illustrationCaptions.json';
import words from '../../../public/data/v1/words.json';
import examples from '../../../public/data/v1/examples.json';
import media from '../../../public/data/v1/media.json';
import pack from '../../../public/data/v1/sa-pack.json';
import { approvedWordIllustration, approvedCurriculumIllustration, approvedCurriculumCard, approvedLV1Images } from './approvedCurriculum';
import { getWordBeastAsset } from '../wordbeast/wordBeastAssets';
import { getIllustrationCaption } from '../wordbeast/illustrationCaptions';
import StudyIllustration from '../wordbeast/StudyIllustration';
import { resolveWordImageClue } from '../../quiz/imageClue';

const lf = (path: string) => readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
const serialize = (value: unknown) => JSON.stringify(value, null, 2) + '\n';
const projected = ['public/data/v1/words.json', 'public/data/v1/examples.json', 'public/data/v1/senses.json', 'public/data/v1/media.json', 'public/data/v1/sa-pack.json', 'src/features/direct/curriculumLV3Unit7.json'];
const independent = ['docs/unit-audit-20261105/LV3-bank-permissible-image-repairs.json', 'docs/unit-audit-20261105/LV3-replace-image-repair.json', 'docs/unit-audit-20261105/LV3-confirm-image-repair.json', 'docs/unit-audit-20261105/LV3-puppet-image-repair.json', 'src/features/wordbeast/illustrationCaptions.ts', 'src/features/wordbeast/StudyIllustration.tsx', 'src/features/vocabulary/approvedCurriculum.ts'];

it('pins all proof fields and the exact U06 checkpoint with six text-domain and seven independent files', () => {
  validateLV3U07ImageProof(proof);
  for (const key of Object.keys(proof)) {
    const bad = structuredClone(proof) as Record<string, unknown>;
    bad[key] = 'unrecorded';
    expect(() => validateLV3U07ImageProof(bad)).toThrow(/immutable/);
  }
  const chain = loadLV3Chain();
  expect(chain.find(step => step.entry.unit === 'LV3-U06')?.entry.manifestHash).toBe(proof.textManifestSha256);
  const migration = chain.find(step => 'migrationId' in step.manifest)?.manifest;
  if (!migration || !('beforeInputs' in migration)) throw new Error('Missing authenticated input domain');
  const domain = new Set(Object.keys(migration.beforeInputs));
  expect(domain.size).toBe(144);
  expect(proof.protectedFiles).toHaveLength(13);
  expect(proof.protectedFiles.filter(file => domain.has(file.path)).map(file => file.path).sort()).toEqual([...projected].sort());
  expect(proof.protectedFiles.filter(file => !domain.has(file.path)).map(file => file.path).sort()).toEqual([...independent].sort());
  expect(proof.protectedFiles.filter(file => file.projection).map(file => file.path).sort()).toEqual([...projected].sort());
});

it.each(proof.protectedFiles)('retains U06 checkpoint or direct original bytes for $path', file => {
  validateLV3U07ImageProof(proof);
  const current = lf(file.path);
  expect(projected.includes(file.path) || independent.includes(file.path)).toBe(true);
  const before = projected.includes(file.path) ? lv3AfterUnitPublishedText('LV3-U06', file.path, current) : current;
  expect(u07ImageBytesHash(before)).toBe(file.lfSha256);
  if (projected.includes(file.path)) {
    expect(file.projection).toBe('LV3-U06');
    expect(() => lv3AfterUnitPublishedText('LV3-U06', file.path, current + ' ')).toThrow(/drift/);
  } else {
    expect(file.projection).toBeNull();
    expect(u07ImageBytesHash(current + ' ')).not.toBe(file.lfSha256);
  }
});

it('replaces one existing attraction path without appending, then preserves puppet-confirm-replace-bank history', () => {
  const current = lf(proof.registry.path);
  const before = beforeLV3U07RegistryText(current, proof);
  expect(registry).toHaveLength(341);
  expect(registry.filter(row => row.reviewId === 'LV1-U09-62')).toEqual([proof.registry.after]);
  expect(registry.filter(row => row.officialWordId === 'W003081')).toEqual([proof.registry.after]);
  expect(registry[proof.registry.index]).toEqual(proof.registry.after);
  expect(proof.registry.index).toBe(128);
  expect(JSON.parse(before)[128]).toEqual(proof.registry.before);
  expect(beforeU07Images(registry)).toEqual(puppetProof.after);
  expect(u07ImageBytesHash(before)).toBe(puppetProof.afterLfSha256);
  expect(beforeLV3U07RegistryText(current.replace(/\n/g, '\r\n'), proof)).toBe(before);
  expect({ ...proof.registry.after, illustration: { ...proof.registry.after.illustration, path: proof.registry.before.illustration.path } }).toEqual(proof.registry.before);
  const old = beforeLV3ReplaceText(beforeLV3ConfirmText(beforeLV3PuppetText(before, puppetProof), confirmProof), replaceProof);
  expect(lv3ImageHash(beforeLV3GeneralImages(JSON.parse(old), bankProof))).toBe('d9905ded7a45f66015643b401ad1b57d6e8dcb44142218cf131710e99a91dc6a');
  const drift = structuredClone(registry); drift[0].aliases.push('unrecorded');
  expect(() => beforeU07Images(drift)).toThrow(/Imported registry/);
});

it('changes only the exact observation English token and restores every old raw and semantic caption hash', () => {
  const current = lf(proof.captions.path);
  const before = beforeLV3U07CaptionText(current, proof);
  expect(captions).toHaveLength(742);
  expect(captions.filter(row => row.captionZh === proof.captions.after.captionZh)).toEqual([proof.captions.after]);
  expect(proof.captions.before.en).toBe('Doudou uses a telescope for close observation of the bird in the tree.');
  expect(proof.captions.after.en).toBe('Doudou uses binoculars for close observation of the bird in the tree.');
  expect({ ...proof.captions.after, en: proof.captions.before.en }).toEqual(proof.captions.before);
  expect(current.replace(proof.captions.afterToken, proof.captions.beforeToken)).toBe(before);
  expect(beforeLV3U07CaptionText(current.replace(/\n/g, '\r\n'), proof)).toBe(before);
  for (const old of [replaceProof, confirmProof, puppetProof]) {
    expect(u07ImageBytesHash(before)).toBe(old.unchangedFiles.find(file => file.path === proof.captions.path)!.lfSha256);
  }
  expect(lv3ImageHash(JSON.parse(before))).toBe(bankProof.unchangedFiles.find(file => file.path === proof.captions.path)!.normalizedJsonSha256);
  expect(u07ImageBytesHash(before.replace(/\n/g, '\r\n'))).toBe('c94e87f99a26cedd404c1b1d13ef6abb4f837cc214b8d5ef456fa9ed50b4f6ee');
});

it.each(['registry', 'captions'] as const)('rejects all unknown %s raw, identity, ordering, caption and unrelated drift', key => {
  const delta = proof[key], text = lf(delta.path);
  const inverse = key === 'registry' ? beforeLV3U07RegistryText : beforeLV3U07CaptionText;
  const rows = JSON.parse(text) as Record<string, unknown>[];
  const field = key === 'registry' ? 'reviewId' : 'word';
  const reordered = structuredClone(rows);
  reordered[0] = Object.fromEntries(Object.entries(reordered[0]).reverse());
  const other = structuredClone(rows); other[0].unrecorded = true;
  const badValues = [text + ' ', text + '\n', '\ufeff' + text, text.replace('  {', ' {'), text.replace('"' + field + '":', '"' + field + '":"duplicate","' + field + '":'), serialize([...rows].reverse()), serialize([...rows, rows[0]]), serialize(reordered), serialize(other), inverse(text, proof)];
  for (const changed of badValues) expect(() => inverse(changed, proof)).toThrow(/raw-byte drift/);
  for (const property of Object.keys(rows[delta.index])) {
    const changed = structuredClone(rows); changed[delta.index][property] = 'unrecorded';
    expect(() => inverse(serialize(changed), proof)).toThrow(/raw-byte drift/);
  }
  if (key === 'registry') for (const property of ['path', 'captionEn', 'captionZh']) {
    const changed = structuredClone(rows);
    (changed[delta.index].illustration as Record<string, unknown>)[property] = 'unrecorded';
    expect(() => inverse(serialize(changed), proof)).toThrow(/raw-byte drift/);
  }
});

it('retains source/candidate pixels, all 26 original U07 assets, old guards and LV1 evidence bytes', () => {
  for (const asset of proof.assets) {
    const bytes = readFileSync(asset.path);
    expect(u07ImageBytesHash(bytes)).toBe(asset.sha256);
    expect(bytes.subarray(0, 4).toString()).toBe('RIFF');
    expect(bytes.subarray(8, 12).toString()).toBe('WEBP');
    const bad = Buffer.from(bytes); bad[bad.length - 1] ^= 1;
    expect(u07ImageBytesHash(bad)).not.toBe(asset.sha256);
  }
  expect(readFileSync(proof.assets[1].path)).toHaveLength(366450);
  expect(proof.retainedU07Images).toHaveLength(26);
  for (const asset of proof.retainedU07Images) expect(u07ImageBytesHash(readFileSync('public/' + asset.path))).toBe(asset.sha256);
  for (const file of proof.historyFiles) expect(u07ImageBytesHash(lf(file.path)), file.path).toBe(file.lfSha256);
  expect(proof.review.manualUserApproved).toBe(false);
  expect(proof.review.publicationReady).toBe(false);
});

it('finds only the intended general consumers across the full current word registry', () => {
  for (const [id, word, path] of [['W003081', 'attraction', proof.registry.after.illustration.path], ['W003687', 'observation', 'wordbeast/a/W003687.webp']]) {
    const consumers = words.filter(row => {
      const imageWordId = 'imageWordId' in row ? String(row.imageWordId ?? '') || undefined : undefined;
      return getWordBeastAsset(row.wordId, row.word, imageWordId)?.split(/[?#]/)[0].endsWith('/' + path);
    });
    expect(consumers.map(row => [row.wordId, row.word])).toEqual([[id, word]]);
    expect(approvedCurriculumCard(word, id)).toBeUndefined();
    expect(approvedLV1Images(word, id)).toEqual([]);
  }
  const pair = proof.registry.after.illustration;
  expect(approvedWordIllustration('attraction', 'W003081')).toEqual(pair);
  expect(approvedCurriculumIllustration('attraction', '/' + pair.path + '?v=test')).toEqual(pair);
  expect(resolveWordImageClue('attraction', '/' + pair.path, 'unrelated', 'unrelated')?.text).toBe(pair.captionZh);
  expect(approvedWordIllustration('attraction', 'W999999')).toBeUndefined();
  expect(approvedWordIllustration('wrong-word', 'W003081')).toBeUndefined();
  expect(approvedCurriculumIllustration('wrong-word', '/' + pair.path)).toBeUndefined();
  expect(approvedCurriculumIllustration('attraction', '/unrelated.webp')).toBeUndefined();
  expect(approvedCurriculumIllustration('attraction', '/' + proof.registry.before.illustration.path)).toBeUndefined();
});

it('keeps the one media row, starter mirror, Chinese image clue and all four formal examples unchanged', () => {
  const zh = proof.captions.after.captionZh;
  expect(media.filter(row => row.captionZh === zh)).toEqual([proof.observationMedia]);
  expect(pack.media.filter(row => row.captionZh === zh)).toEqual([proof.observationMedia]);
  expect(examples.filter(row => ['attraction', 'observation'].includes(row.word))).toEqual(proof.formalExamples);
  expect(proof.formalExamples.map(row => row.exampleId).sort()).toEqual(['EX3de55eef', 'EXd320ceef', 'EX49074a78', 'EXc45c7209'].sort());
  expect(getIllustrationCaption(zh)).toEqual({ en: proof.captions.after.en, zh });
  expect(getIllustrationCaption(zh + ' ')).toEqual({ en: '', zh: zh + ' ' });
  expect(resolveWordImageClue('observation', '/wordbeast/a/W003687.webp', zh)?.text).toBe(zh);
  const rendered = renderToStaticMarkup(createElement(StudyIllustration, { src: '/wordbeast/a/W003687.webp', word: 'observation', caption: zh }));
  expect(rendered).toContain(proof.captions.after.en);
  expect(rendered).toContain(zh);
  expect(rendered).not.toContain(proof.captions.before.en);
  const hidden = renderToStaticMarkup(createElement(StudyIllustration, { src: '/wordbeast/a/W003687.webp', word: 'observation' }));
  expect(hidden).not.toContain('<figcaption>');
  expect(hidden).not.toContain(proof.captions.after.en);
});

it('recursively scans all direct JSON schemas and keeps exactly eight textbook references text-only and unbound', () => {
  const matches: { path: string; pointer: string; id: string }[] = [];
  const identities = new Set(['W003081', 'W003687', 'attraction', 'observation']);
  const forbiddenImagePaths = new Set([proof.registry.before.illustration.path, proof.registry.after.illustration.path, 'wordbeast/a/W003687.webp']);
  const authoredImageBindings: string[] = [];
  const authoredCaptionBindings: string[] = [];
  for (const name of readdirSync('src/features/direct').filter(file => file.endsWith('.json'))) {
    const path = 'src/features/direct/' + name;
    const document = JSON.parse(readFileSync(path, 'utf8'));
    const walk = (value: unknown, pointer: string) => {
      if (Array.isArray(value)) value.forEach((item, index) => walk(item, pointer + '/' + index));
      else if (value && typeof value === 'object') {
        const row = value as Record<string, unknown>;
        if (row.learningItemId && ['officialWordId', 'lexemeRef', 'imageWordId', 'displayWord'].some(key => identities.has(String(row[key])))) {
          matches.push({ path, pointer, id: String(row.learningItemId) });
          expect(document.template.deliveryMode).toBe('text_only');
          expect(row.practiceMode).toBe('read_only');
          expect(row.review).toBe('source_checked_text_only');
          expect(row).not.toHaveProperty('illustration');
          expect(row).not.toHaveProperty('originalExample');
        }
        for (const [key, child] of Object.entries(row)) {
          if (typeof child === 'string' && forbiddenImagePaths.has(child.replace(/^\//, '').split(/[?#]/)[0])) authoredImageBindings.push(path + '#' + pointer + '/' + key);
          if (child === proof.captions.after.captionZh) authoredCaptionBindings.push(path + '#' + pointer + '/' + key);
          walk(child, pointer + '/' + key);
        }
      }
    };
    walk(document, '');
  }
  expect(matches.sort((a, b) => a.id.localeCompare(b.id))).toEqual(proof.textbookReferences.map(ref => ({ path: ref.path, pointer: ref.pointer, id: ref.row.learningItemId })).sort((a, b) => a.id.localeCompare(b.id)));
  expect(matches).toHaveLength(8);
  expect(authoredImageBindings).toEqual([]);
  expect(authoredCaptionBindings).toEqual([]);
  for (const path of ['src/features/vocabulary/lv1ReviewedImages.json', 'src/features/vocabulary/approvedExampleImages.json', 'scripts/approvals/lv1-images-20260922.json']) {
    const rows = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>[];
    expect(rows.filter(row => identities.has(String(row.officialWordId)) || (Array.isArray(row.aliases) && row.aliases.some(word => identities.has(String(word)))))).toEqual([]);
  }
});
