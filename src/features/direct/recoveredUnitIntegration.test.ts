import currentLV2Unit41 from './curriculumLV2Unit41.json';
import {lv2Unit41BeforeAudit} from './lv2Unit41Audit.testSupport';
import currentLV2Unit40 from './curriculumLV2Unit40.json';
import {lv2Unit40BeforeAudit} from './lv2Unit40Audit.testSupport';
import currentLV2Unit39 from './curriculumLV2Unit39.json';
import {lv2Unit39BeforeAudit} from './lv2Unit39Audit.testSupport';
import currentLV2Unit38 from './curriculumLV2Unit38.json';
import {lv2Unit38BeforeAudit} from './lv2Unit38Audit.testSupport';
import currentLV2Unit37 from './curriculumLV2Unit37.json';
import {lv2Unit37BeforeAudit} from './lv2Unit37Audit.testSupport';
import currentLV2Unit36 from './curriculumLV2Unit36.json';
import {lv2Unit36BeforeAudit} from './lv2Unit36Audit.testSupport';
import currentLV2Unit35 from './curriculumLV2Unit35.json';
import {lv2Unit35BeforeAudit} from './lv2Unit35Audit.testSupport';
import currentLV2Unit34 from './curriculumLV2Unit34.json';
import {lv2Unit34BeforeAudit} from './lv2Unit34Audit.testSupport';
import currentLV2Unit33 from './curriculumLV2Unit33.json';
import {lv2Unit33BeforeAudit} from './lv2Unit33Audit.testSupport';
import currentLV2Unit32 from './curriculumLV2Unit32.json';
import {lv2Unit32BeforeAudit} from './lv2Unit32Audit.testSupport';
import currentLV2Unit31 from './curriculumLV2Unit31.json';
import {lv2Unit31BeforeAudit} from './lv2Unit31Audit.testSupport';
import currentLV2Unit30 from './curriculumLV2Unit30.json';
import {lv2Unit30BeforeAudit} from './lv2Unit30Audit.testSupport';
import currentLV2Unit29 from './curriculumLV2Unit29.json';
import {lv2Unit29BeforeAudit} from './lv2Unit29Audit.testSupport';
import currentLV2Unit28 from './curriculumLV2Unit28.json';
import {lv2Unit28BeforeAudit} from './lv2Unit28Audit.testSupport';
import currentLV2Unit27 from './curriculumLV2Unit27.json';
import {lv2Unit27BeforeAudit} from './lv2Unit27Audit.testSupport';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { expect, it } from 'vitest';
import baseline from '../../../scripts/fixtures/recovered-unit-integration-baseline.json';
import pack12 from './curriculumLV3Unit12.json';
import pack18 from './curriculumLV3Unit18.json';
import pack21 from './curriculumLV6Unit21.json';
import { findUnit, templateGroup, type LearningItem } from './model';
import { groupWordIds } from './groupScope';
import { textbookUnits } from '../vocabulary/textbookCatalog';
import { practiceIds } from '../vocabulary/model';
import { releasedUnit20BeforePracticeRevision } from './lv4U20PracticeRevision.testSupport';
import currentUnit16 from './curriculumLV1Unit16.json';
import { unit16BeforeAudit } from './lv1Unit16Audit.testSupport';
import currentUnit17 from './curriculumLV1Unit17.json';
import { unit17BeforeAudit } from './lv1Unit17Audit.testSupport';

import currentUnit18 from './curriculumLV1Unit18.json';
import { unit18BeforeAudit } from './lv1Unit18Audit.testSupport';

import currentUnit19 from './curriculumLV1Unit19.json';
import { unit19BeforeAudit } from './lv1Unit19Audit.testSupport';

import currentUnit20 from './curriculumLV1Unit20.json';
import { unit20BeforeAudit } from './lv1Unit20Audit.testSupport';

import currentUnit21 from './curriculumLV1Unit21.json';
import { unit21BeforeAudit } from './lv1Unit21Audit.testSupport';

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    const row = value as Record<string, unknown>;
    return Object.fromEntries(Object.keys(row).sort().map(key => [key, stable(row[key])]));
  }
  return value;
}
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');

it('retains historical curriculum and question identities with the audited cubes gloss addition', () => {
  const existing = new Map<string, {items: unknown[]; questions: unknown[]}>();
  const record = (value: unknown) => {
    if (Array.isArray(value)) { value.forEach(record); return; }
    if (!value || typeof value !== 'object') return;
    const row = value as Record<string, unknown>;
    const template = row.template as {templateId: string} | undefined;
    if (template && Array.isArray(row.learningItems)) existing.set(template.templateId,
      {items: row.learningItems, questions: (row.questions ?? row.grammarQuestions ?? []) as unknown[]});
    else if (typeof row.templateId === 'string' && Array.isArray(row.items)) existing.set(row.templateId,
      {items: row.items, questions: (row.questions ?? []) as unknown[]});
  };
  const dir = new URL('./', import.meta.url);
  for (const file of readdirSync(dir).filter(name => name.endsWith('.json'))) record(JSON.parse(readFileSync(new URL(file, dir), 'utf8')));
  expect(baseline.previousUnits).toHaveLength(124);
  for (const old of baseline.previousUnits) {
    const retained = existing.get(old.templateId)!;
    expect(retained, old.templateId).toBeDefined();
    expect(retained.items).toHaveLength(old.count);
    // Undo only exact recorded edits for the immutable historical fingerprint.
    // The real installed units remain checked below; no unit or old hash is omitted.
    const priorPractice = old.templateId === 'LV4-U20' ? releasedUnit20BeforePracticeRevision() : undefined;
    let priorItems=priorPractice?.learningItems ?? retained.items;
    if(old.templateId === 'TEXTBOOK-LV1-U16'){
      expect(retained.items).toEqual(currentUnit16.learningItems);
      priorItems=unit16BeforeAudit(currentUnit16).learningItems;
    }
    if(old.templateId === 'TEXTBOOK-LV1-U17'){
      expect(retained.items).toEqual(currentUnit17.learningItems);
      priorItems=unit17BeforeAudit(currentUnit17).learningItems;
    }
    if(old.templateId === 'TEXTBOOK-LV1-U18'){
      expect(retained.items).toEqual(currentUnit18.learningItems);
      priorItems=unit18BeforeAudit(currentUnit18).learningItems;
    }
    if(old.templateId === 'TEXTBOOK-LV1-U19'){
      expect(retained.items).toEqual(currentUnit19.learningItems);
      priorItems=unit19BeforeAudit(currentUnit19).learningItems;
    }
    if(old.templateId === 'TEXTBOOK-LV1-U20'){
      expect(retained.items).toEqual(currentUnit20.learningItems);
      priorItems=unit20BeforeAudit(currentUnit20).learningItems;
    }
    if(old.templateId === 'TEXTBOOK-LV1-U21'){
      expect(retained.items).toEqual(currentUnit21.learningItems);
      priorItems=unit21BeforeAudit(currentUnit21).learningItems;
    }
    if(old.templateId === 'TEXTBOOK-LV2-U41'){
      expect(retained.items).toEqual(currentLV2Unit41.learningItems);
      priorItems=lv2Unit41BeforeAudit(currentLV2Unit41).learningItems;
    }
    if(old.templateId === 'TEXTBOOK-LV2-U40'){
      expect(retained.items).toEqual(currentLV2Unit40.learningItems);
      priorItems=lv2Unit40BeforeAudit(currentLV2Unit40).learningItems;
    }
    if(old.templateId === 'TEXTBOOK-LV2-U39'){
      expect(retained.items).toEqual(currentLV2Unit39.learningItems);
      priorItems=lv2Unit39BeforeAudit(currentLV2Unit39).learningItems;
    }
    if(old.templateId === 'TEXTBOOK-LV2-U38'){
      expect(retained.items).toEqual(currentLV2Unit38.learningItems);
      priorItems=lv2Unit38BeforeAudit(currentLV2Unit38).learningItems;
    }
    if(old.templateId === 'TEXTBOOK-LV2-U37'){
      expect(retained.items).toEqual(currentLV2Unit37.learningItems);
      priorItems=lv2Unit37BeforeAudit(currentLV2Unit37).learningItems;
    }
    if(old.templateId === 'TEXTBOOK-LV2-U36'){
      expect(retained.items).toEqual(currentLV2Unit36.learningItems);
      priorItems=lv2Unit36BeforeAudit(currentLV2Unit36).learningItems;
    }
    if(old.templateId === 'TEXTBOOK-LV2-U35'){
      expect(retained.items).toEqual(currentLV2Unit35.learningItems);
      priorItems=lv2Unit35BeforeAudit(currentLV2Unit35).learningItems;
    }
    if(old.templateId === 'TEXTBOOK-LV2-U34'){
      expect(retained.items).toEqual(currentLV2Unit34.learningItems);
      priorItems=lv2Unit34BeforeAudit(currentLV2Unit34).learningItems;
    }
    if(old.templateId === 'TEXTBOOK-LV2-U33'){
      expect(retained.items).toEqual(currentLV2Unit33.learningItems);
      priorItems=lv2Unit33BeforeAudit(currentLV2Unit33).learningItems;
    }
    if(old.templateId === 'TEXTBOOK-LV2-U32'){
      expect(retained.items).toEqual(currentLV2Unit32.learningItems);
      priorItems=lv2Unit32BeforeAudit(currentLV2Unit32).learningItems;
    }
    if(old.templateId === 'TEXTBOOK-LV2-U31'){
      expect(retained.items).toEqual(currentLV2Unit31.learningItems);
      priorItems=lv2Unit31BeforeAudit(currentLV2Unit31).learningItems;
    }
    if(old.templateId === 'TEXTBOOK-LV2-U30'){
      expect(retained.items).toEqual(currentLV2Unit30.learningItems);
      priorItems=lv2Unit30BeforeAudit(currentLV2Unit30).learningItems;
    }
    if(old.templateId === 'TEXTBOOK-LV2-U29'){
      expect(retained.items).toEqual(currentLV2Unit29.learningItems);
      priorItems=lv2Unit29BeforeAudit(currentLV2Unit29).learningItems;
    }
    if(old.templateId === 'TEXTBOOK-LV2-U28'){
      expect(retained.items).toEqual(currentLV2Unit28.learningItems);
      priorItems=lv2Unit28BeforeAudit(currentLV2Unit28).learningItems;
    }
    if(old.templateId === 'TEXTBOOK-LV2-U27'){
      expect(retained.items).toEqual(currentLV2Unit27.learningItems);
      priorItems=lv2Unit27BeforeAudit(currentLV2Unit27).learningItems;
    }
    expect(hash(priorItems), old.templateId).toBe(old.itemsHash);
    const originalQuestions = structuredClone(priorPractice?.questions ?? retained.questions);
    if (old.templateId === 'LV4-U20') {
      // The 2026-10-31 rationale batch adds this one existing optional field.
      // Verify the exact new payload, then restore only that field for the
      // immutable historical snapshot; never exclude the unit or other fields.
      expect(hash(originalQuestions)).toBe('2e3fab8927f0f56429931272eee4fa54b8897f11ded5e47cbb6a6ee4341cfcee');
      const cube = originalQuestions.find(q => (q as {questionId?: string}).questionId === 'CHOICE-CLOZE-ORIG-LV4U20-cube') as {
        options: {id: string; text: string; meaningZh?: string}[];
      } | undefined;
      const option = cube?.options.find(o => o.id === 'A' && o.text === 'cubes');
      expect(option?.meaningZh).toBe('n. 立方體；方塊（cube 的複數）');
      delete option!.meaningZh;
    }
    expect(hash(originalQuestions), old.templateId).toBe(old.questionsHash);
    expect(findUnit(old.templateId)?.items).toEqual(retained.items);
  }
});

it.each([
  {pack: pack12, vocabulary: 119, usage: 63, mapped: 96, unmapped: 22},
  {pack: pack18, vocabulary: 102, usage: 44, mapped: 85, unmapped: 16},
  {pack: pack21, vocabulary: 119, usage: 36, mapped: 74, unmapped: 44},
])('registers $pack.template.templateId as complete text with honest supplement and practice boundaries', ({pack, vocabulary, usage, mapped, unmapped}) => {
  const unit = findUnit(pack.template.templateId)!;
  const catalog = textbookUnits.find(u => u.level === unit.level && u.unit === unit.unit)!;
  expect(unit.items).toEqual(pack.learningItems);
  expect(catalog).toMatchObject({count: vocabulary, usageCount: usage, partial: false});
  expect(catalog.wordIds).toHaveLength(mapped);
  const group = templateGroup(unit.templateId);
  expect(group.itemIds).toEqual(unit.items.map(item => item.learningItemId));
  expect(group.itemIds).toHaveLength(vocabulary + usage);
  expect(groupWordIds(group)).toEqual(catalog.wordIds);
  expect(unit.items.filter(item => item.kind === 'vocabulary' && !item.officialWordId)).toHaveLength(unmapped);
  expect(unit.items.every(item => item.practiceMode === 'read_only' && !item.officialSenseId && !item.illustration && !item.originalExample)).toBe(true);
  expect(practiceIds(unit.items as LearningItem[])).toEqual([]);
  expect(unit.questions).toEqual([]);
  expect(pack.releaseReview).toMatchObject({requiresSeparateDataRelease: true, senseApprovalChange: false, artworkAdopted: false});
  const historical = JSON.parse(readFileSync(new URL(`../../../scripts/drafts/recovered-units/${unit.level}Unit${unit.unit}.curriculum.json`, import.meta.url), 'utf8'));
  expect(unit.items).toEqual(historical.learningItems);
});
