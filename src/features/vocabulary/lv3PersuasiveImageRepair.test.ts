import { expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforePersuasiveImageText, persuasiveImageHash, validatePersuasiveImageProof } from '../../../scripts/lv3_persuasive_image_guard.mjs';
import { beforePersuasiveImages, beforePersuasiveText } from './lv3PersuasiveImageRepair.testSupport';
import { beforeU07Images } from './lv3U07ImageCaptionRepair.testSupport';
import { loadLV3Chain, lv3AfterUnitPublishedText } from '../direct/lv3Audit.testSupport';
import proof from '../../../docs/image-repairs/20261108/W003733-persuasive-v2.integration.json';
import u07 from '../../../docs/unit-audit-20261105/LV3-U07-image-caption-repairs.json';
import puppet from '../../../docs/unit-audit-20261105/LV3-puppet-image-repair.json';
import registry from './auditedWordIllustrations.json';
import captions from '../wordbeast/illustrationCaptions.json';
import words from '../../../public/data/v1/words.json';
import media from '../../../public/data/v1/media.json';
import pack from '../../../public/data/v1/sa-pack.json';
import examples from '../../../public/data/v1/examples.json';
import { approvedWordIllustration, approvedCurriculumIllustration, approvedCurriculumCard, approvedLV1Images } from './approvedCurriculum';
import { getWordBeastAsset } from '../wordbeast/wordBeastAssets';
import { getIllustrationCaption } from '../wordbeast/illustrationCaptions';
import StudyIllustration from '../wordbeast/StudyIllustration';
import { resolveWordImageClue } from '../../quiz/imageClue';
import { curriculumUnits } from '../direct/model';

const lf = (path: string) => readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
const serialize = (value: unknown) => JSON.stringify(value, null, 2) + '\n';
const pair = proof.registry.added.illustration;

it('authenticates the entire proof and the unchanged 144-file U08 input domain', () => {
  validatePersuasiveImageProof(proof);
  for (const key of Object.keys(proof)) {
    const changed = structuredClone(proof) as Record<string, unknown>;
    changed[key] = 'unrecorded';
    expect(() => validatePersuasiveImageProof(changed)).toThrow(/immutable/);
  }
  const chain = loadLV3Chain();
  expect(chain.find(step => step.entry.unit === proof.checkpoint)?.entry.manifestHash).toBe(proof.textManifestSha256);
  const migration = chain.find(step => 'migrationId' in step.manifest)?.manifest;
  if (!migration || !('beforeInputs' in migration)) throw new Error('Missing authenticated input domain');
  const domain = Object.keys(migration.beforeInputs).sort();
  expect(domain).toHaveLength(144);
  expect(proof.protectedInputDomain.map(file => file.path)).toEqual(domain);
  expect(domain).not.toContain(proof.registry.path);
});

// Later authorized text changes must reverse through the existing sealed chain,
// never through a relaxed domain, subset comparison or rewritten baseline.
it.each(proof.protectedInputDomain)('retains the U08 checkpoint bytes of $path', file => {
  const text = lf(file.path);
  const before = lv3AfterUnitPublishedText(proof.checkpoint, file.path, text);
  expect(persuasiveImageHash(before), file.path).toBe(file.lfSha256);
  expect(() => lv3AfterUnitPublishedText(proof.checkpoint, file.path, text + ' ')).toThrow(/drift/);
});

it.each(proof.independentFiles)('retains exact independent source bytes of $path', file => {
  expect(persuasiveImageHash(lf(file.path))).toBe(file.lfSha256);
});

it('adds exactly one pair and reverses to every existing U07 and puppet registry row', () => {
  const text = lf(proof.registry.path);
  const before = beforePersuasiveText(text);
  expect(registry).toHaveLength(342);
  expect(registry.at(-1)).toEqual(proof.registry.added);
  expect(registry.filter(row => row.officialWordId === 'W003733')).toEqual([proof.registry.added]);
  expect(registry.filter(row => row.aliases.includes('persuasive'))).toEqual([proof.registry.added]);
  expect(beforePersuasiveImages(registry)).toEqual(registry.slice(0, -1));
  expect(persuasiveImageHash(before)).toBe(u07.registry.afterLfSha256);
  expect(beforeU07Images(registry)).toEqual(puppet.after);
  expect(beforePersuasiveText(text.replace(/\n/g, '\r\n'))).toBe(before);
  const changed = structuredClone(registry); changed[0].aliases.push('unrecorded');
  expect(() => beforePersuasiveImages(changed)).toThrow(/Imported registry/);
});

it('rejects raw formatting, duplicate keys, ordering, identity, pair and unrelated drift', () => {
  const text = lf(proof.registry.path);
  const reordered = structuredClone(registry);
  reordered[0] = Object.fromEntries(Object.entries(reordered[0]).reverse()) as typeof reordered[number];
  const badValues = [text + ' ', text + '\n', '\ufeff' + text, text.replace('  {', ' {'),
    text.replace('"reviewId":', '"reviewId":"duplicate","reviewId":'),
    serialize([...registry].reverse()), serialize([...registry, registry[0]]),
    serialize(reordered), beforePersuasiveText(text)];
  for (const text of badValues) expect(() => beforePersuasiveImageText(text, proof)).toThrow(/raw-byte drift/);
  for (const field of ['reviewId', 'officialWordId', 'aliases', 'extra']) {
    const changed = structuredClone(registry);
    (changed.at(-1)! as Record<string, unknown>)[field] = 'unrecorded';
    expect(() => beforePersuasiveText(serialize(changed))).toThrow(/raw-byte drift/);
  }
  for (const field of ['path', 'captionEn', 'captionZh']) {
    const changed = structuredClone(registry);
    (changed.at(-1)!.illustration as Record<string, unknown>)[field] = 'unrecorded';
    expect(() => beforePersuasiveText(serialize(changed))).toThrow(/raw-byte drift/);
  }
  const unrelated = structuredClone(registry); unrelated[0].illustration.captionZh = 'unrecorded';
  expect(() => beforePersuasiveText(serialize(unrelated))).toThrow(/raw-byte drift/);
});

it('retains the original and exact 1024-square candidate bytes', () => {
  for (const asset of proof.assets) {
    const bytes = readFileSync(asset.path);
    expect(persuasiveImageHash(bytes)).toBe(asset.sha256);
    expect(bytes).toHaveLength(asset.bytes);
    expect(bytes.subarray(0, 4).toString()).toBe('RIFF');
    expect(bytes.subarray(8, 12).toString()).toBe('WEBP');
    // Both source and candidate use the VP8 lossy frame header.
    expect(bytes.subarray(12, 16).toString()).toBe('VP8 ');
    expect(bytes.subarray(23, 26)).toEqual(Buffer.from([0x9d, 0x01, 0x2a]));
    expect([bytes.readUInt16LE(26) & 0x3fff, bytes.readUInt16LE(28) & 0x3fff]).toEqual([1024, 1024]);
    const changed = Buffer.from(bytes); changed[changed.length - 1] ^= 1;
    expect(persuasiveImageHash(changed)).not.toBe(asset.sha256);
  }
  expect(proof.review.manualUserApproved).toBe(false);
  expect(proof.review.authorizedRepairWithoutPerImageApproval).toBe(true);
  expect(proof.review.publicationReady).toBe(false);
});

it('finds exactly one active word consumer and no remaining active source-image consumer', () => {
  const consumers = (path: string) => words.filter(row => {
    const imageWordId = 'imageWordId' in row ? String(row.imageWordId ?? '') || undefined : undefined;
    return getWordBeastAsset(row.wordId, row.word, imageWordId)?.split(/[?#]/)[0].endsWith('/' + path);
  });
  expect(consumers(pair.path).map(row => [row.wordId, row.word])).toEqual([['W003733', 'persuasive']]);
  expect(consumers('wordbeast/a/W003733.webp')).toEqual([]);
  expect(approvedWordIllustration('persuasive', 'W003733')).toEqual(pair);
  expect(getWordBeastAsset('W003733', 'persuasive')).toContain(pair.path + '?v=');
  expect(approvedCurriculumCard('persuasive', 'W003733')).toBeUndefined();
  expect(approvedLV1Images('persuasive', 'W003733')).toEqual([]);
  expect(approvedWordIllustration('persuasive', 'W999999')).toBeUndefined();
  expect(approvedWordIllustration('wrong-word', 'W003733')).toBeUndefined();
  expect(approvedCurriculumIllustration('wrong-word', '/' + pair.path)).toBeUndefined();
  expect(approvedCurriculumIllustration('persuasive', '/unrelated.webp')).toBeUndefined();
  expect(approvedCurriculumIllustration('persuasive', '/wordbeast/a/W003733.webp')).toBeUndefined();
});

it('renders the unchanged bilingual caption and image clue without reassigning an exercise', () => {
  expect(captions.filter(row => row.captionZh === pair.captionZh)).toEqual([proof.caption]);
  expect(media.filter(row => row.targetWord === 'persuasive')).toEqual([proof.media]);
  expect(pack.media.filter(row => row.targetWord === 'persuasive')).toEqual([proof.media]);
  expect(examples.filter(row => row.word === 'persuasive')).toEqual(proof.formalExamples);
  expect(getIllustrationCaption(pair.captionZh)).toEqual({ en: pair.captionEn, zh: pair.captionZh });
  for (const src of ['/' + pair.path, '/vocab-app/' + pair.path + '?v=integration']) {
    expect(approvedCurriculumIllustration('persuasive', src)).toEqual(pair);
    const rendered = renderToStaticMarkup(createElement(StudyIllustration, { src, word: 'persuasive', caption: 'unrelated' }));
    expect(rendered).toContain(src);
    expect(rendered).toContain(pair.captionEn.replace(/'/g, '&#x27;'));
    expect(rendered).toContain(pair.captionZh);
    expect(rendered).not.toContain('unrelated');
    expect(resolveWordImageClue('persuasive', src, 'unrelated media', 'unrelated exercise')).toEqual({ label: '這張圖在畫什麼', text: pair.captionZh, targetHint: undefined });
  }
});

it('retains exactly two text-only textbook links in every source schema and the real runtime catalog', () => {
  const matches: { path: string; pointer: string; id: string }[] = [];
  const bindings: string[] = [];
  const identities = new Set(['W003733', 'persuasive']);
  const paths = new Set([pair.path, 'wordbeast/a/W003733.webp']);
  for (const name of readdirSync('src/features/direct').filter(file => file.endsWith('.json'))) {
    const path = 'src/features/direct/' + name;
    const document = JSON.parse(lf(path));
    const walk = (value: unknown, pointer: string) => {
      if (Array.isArray(value)) value.forEach((child, index) => walk(child, pointer + '/' + index));
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
          if (child === pair.captionZh || (typeof child === 'string' && paths.has(child.replace(/^\//, '').split(/[?#]/)[0]))) bindings.push(path + '#' + pointer + '/' + key);
          walk(child, pointer + '/' + key);
        }
      }
    };
    walk(document, '');
  }
  expect(matches).toHaveLength(2);
  expect(matches).toEqual(proof.textbookReferences.map(ref => ({ path: ref.path, pointer: ref.pointer, id: ref.row.learningItemId })));
  expect(bindings).toEqual([]);
  const runtime = curriculumUnits.flatMap(unit => unit.items.filter(row => row.officialWordId === 'W003733').map(row => ({ unit, row })));
  expect(runtime.map(({ row }) => row.learningItemId).sort()).toEqual(['LI-LV3U09-V089', 'LI-LV4U01-V042']);
  for (const { unit, row } of runtime) {
    expect(unit.deliveryMode).toBe('text_only');
    expect(row.practiceMode).toBe('read_only');
    expect(row).not.toHaveProperty('illustration');
  }
});
