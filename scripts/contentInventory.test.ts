import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildContentInventory, runCli } from './content_inventory.mjs';

const roots: string[] = [];
function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'vocab-content-inventory-'));
  roots.push(root);
  mkdirSync(join(root, 'src/features/direct'), { recursive: true });
  mkdirSync(join(root, 'src/features/vocabulary'), { recursive: true });
  const path = 'src/features/direct/curriculumLV6Unit21.json';
  const data = {
    template: { templateId: 'TEXTBOOK-LV6-U21', level: 'LV6', unit: 21, deliveryMode: 'text_only' },
    learningItems: [
      { learningItemId: 'mapped', kind: 'vocabulary', officialWordId: 'W1', review: 'machine_verified', practiceMode: 'read_only' },
      { learningItemId: 'unmapped', kind: 'vocabulary', officialWordId: null, review: 'draft' },
      { learningItemId: 'grammar', kind: 'grammar', officialWordId: null },
    ],
    questions: [],
  };
  const put = (file: string, content: unknown) => writeFileSync(join(root, file), JSON.stringify(content));
  put(path, data);
  put('src/features/vocabulary/lv1ReviewedImages.json', [
    { unit: 1, officialWordId: 'W1' }, { unit: 1, officialWordId: 'W1' }, { unit: 1, officialWordId: null },
  ]);
  return { root, path, data, put };
}
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });

describe('checked-in content inventory boundaries', () => {
  it('counts vocabulary mappings separately from grammar and LV1 image pairs', () => {
    const { root } = fixture(), report = buildContentInventory(root);
    expect(report.units[0]).toMatchObject({ vocabularyCount: 2, mappedVocabularyCount: 1, unmappedVocabularyIds: ['unmapped'] });
    expect(report.lv1ImageGroups[0]).toMatchObject({ pairCount: 3, pairsWithWordId: 2, uniqueWordIds: 1 });
    expect(report.levels[0].compiledVocabularyCount).toBe(0);
  });
  it('preserves draft and machine labels without inventing acceptance or absent-unit zeros', () => {
    const { root } = fixture(), report = buildContentInventory(root);
    expect(report.units[0].itemReviewLabels).toEqual({ draft: 1, machine_verified: 1, unknown: 1 });
    expect(report.units[0].semanticAcceptance).toBe('unknown');
    expect(Object.values(report.units[0].corePracticeAcceptance)).toEqual(Array(5).fill('unknown'));
    expect(report.levels[5]).toMatchObject({ expectedBookUnitCount: null, observedUnitNumbers: [21] });
    expect(report.units[0].directIllustrationFieldCount).toBe(0);
    expect(report.units[0].physicalDeviceAcceptance).toBe('unknown');
  });
  it('distinguishes a declared empty question set from an unrecorded one', () => {
    const { root, path, data, put } = fixture();
    expect(buildContentInventory(root).units[0].packagedQuestions.count).toBe(0);
    put(path, { ...data, questions: undefined });
    expect(buildContentInventory(root).units[0].packagedQuestions.count).toBeNull();
    expect(buildContentInventory(root).levels[5].unitsWithUnknownPackagedQuestions).toBe(1);
  });
  it('counts missing option explanations without claiming mode acceptance', () => {
    const { root, path, data, put } = fixture();
    put(path, { ...data, questions: [{ sourceType: 'original_choice', options: [{ rationaleZh: '已記錄' }, { rationaleZh: '' }] }] });
    expect(buildContentInventory(root).units[0].packagedQuestions).toMatchObject({ count: 1, optionCount: 2, optionsWithoutRationale: 1 });
  });
  it('fingerprints local source manifests and records missing ones as unknown evidence', () => {
    const { root, path, data, put } = fixture();
    put(path, { ...data, template: { ...data.template, sourceManifest: 'source.json' } });
    expect(buildContentInventory(root).units[0].sourceManifest).toMatchObject({ state: 'missing_from_checkout', sha256: null });
    put('source.json', { review: 'draft' });
    expect(buildContentInventory(root).units[0].sourceManifest).toMatchObject({ state: 'checked_in_manifest_present', sha256: expect.stringMatching(/^[a-f0-9]{64}$/) });
  });
  it('rejects out-of-repository source paths and conflicting unit identities', () => {
    const { root, path, data, put } = fixture();
    put(path, { ...data, template: { ...data.template, sourceManifest: '../private.json' } });
    expect(() => buildContentInventory(root)).toThrow('inside the repository');
    put(path, { ...data, template: { ...data.template, unit: 22 } });
    expect(() => buildContentInventory(root)).toThrow('Conflicting template identity');
  });
  it('fails closed on malformed, duplicate unit or duplicate item identities', () => {
    const { root, path, data, put } = fixture();
    put('src/features/direct/curriculumExtra.json', data);
    expect(() => buildContentInventory(root)).toThrow('Duplicate compiled unit');
    rmSync(join(root, 'src/features/direct/curriculumExtra.json'));
    put(path, { ...data, learningItems: [data.learningItems[0], data.learningItems[0]] });
    expect(() => buildContentInventory(root)).toThrow('Invalid learning item identities');
    put(path, { learningItems: [] });
    expect(() => buildContentInventory(root)).toThrow('Unrecognized curriculum schema');
  });
  it('writes once, checks without mutation, and detects later content drift', () => {
    const { root, path, data, put } = fixture(), output = join(root, 'report.json');
    runCli(['--write', output], root);
    const before = readFileSync(output, 'utf8');
    runCli(['--check', output], root);
    expect(readFileSync(output, 'utf8')).toBe(before);
    expect(() => runCli(['--write', output], root)).toThrow();
    put(path, { ...data, learningItems: [] });
    expect(() => runCli(['--check', output], root)).toThrow('drifted');
    expect(readFileSync(output, 'utf8')).toBe(before);
  });
  it('can inventory the current repo deterministically and preserves recovered LV6 U21', () => {
    const a = buildContentInventory(process.cwd()), b = buildContentInventory(process.cwd());
    expect(a).toEqual(b);
    expect(a.units.find(u => u.key === 'LV6-U21')).toMatchObject({ packagedQuestions: { count: 0 }, semanticAcceptance: 'unknown' });
    expect(a.levels.map(l => l.level)).toEqual(['LV1', 'LV2', 'LV3', 'LV4', 'LV5', 'LV6']);
  });
});
