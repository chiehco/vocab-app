import 'fake-indexeddb/auto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import source from '../../../scripts/sources/LV3Unit11.json';
import pack from '../../../public/data/v1/sa-pack.json';
import { allQuestions, findUnit, templateGroup, validGroup } from './model';
import { groupWordIds, resolveGroupWords } from './groupScope';
import { getOrCreateTemplateGroup, saveGroup } from './store';
import { textbookUnits } from '../vocabulary/textbookCatalog';
import { practiceIds } from '../vocabulary/model';
import { contentDb } from '../../db/contentDb';
import { progressDb } from '../../db/progressDb';
import { ensureContentAvailable, refreshInstalledContent } from '../../db/seed';
import { siegeUnitWords } from '../siege/model';
import { gradeFlashcard } from '../../checkin/recordActivity';

const unit = findUnit(11, 'LV3')!;
const vocabulary = unit.items.filter(i => i.kind === 'vocabulary');
beforeEach(async () => {
  await Promise.all([...contentDb.tables, ...progressDb.tables].map(t => t.clear()));
});
afterEach(() => vi.unstubAllGlobals());

it('retains all original independent boxes and numbered 1–34 in printed order', () => {
  const expected = ['forever','temporary','temporarily','maid','resist','guidance','accurate','sake',
    'toss','reserve','harbor','dock','trail','faint','trace','steady','steadily','stable','injury',
    'dealer','trader','admire','heel','satisfactory','satisfactorily','splash','impress','melt',
    'desirable','desire','badly','colony','efficient','inefficient','stale','ambassador',
    'alphabet','crab','global','foggy','dumb','pump','subtract','minus','multiply'];
  expect(source.headwordOrder).toEqual(expected);
  expect(vocabulary.slice(0, 45).map(i => i.displayWord)).toEqual(expected);
  expect(source.headwords.filter(h => h.printedNumber).map(h => h.printedNumber))
    .toEqual(Array.from({length:34}, (_, i) => i + 1));
  expect(source.photos.map(p => p.sourcePage)).toEqual(Array.from({length:13},(_,i)=>107+i));
  expect(source.photos.at(-1)).toMatchObject({sourcePage:119,printedUnit:'Unit 12',pageType:'boundary'});
  expect(source.photos.filter(p => p.pageType === 'content')).toHaveLength(12);
  expect(textbookUnits.find(u => u.level === 'LV3' && u.unit === 11))
    .toMatchObject({count:137,usageCount:75,partial:false});
  expect(new Set(unit.items.map(i=>i.learningItemId)).size).toBe(212);
});

it('preserves every printed supplement and usage marker with its source page', () => {
  const originalItems = originalU11Items();
  const vocabulary = originalItems.filter(i => i.kind === 'vocabulary');
  expect(vocabulary.slice(45).map(i=>[i.displayWord,i.sourcePage,i.printedLabel]))
    .toEqual(source.related.map(r=>[r.word,r.sourcePage,r.printedLabel]));
  expect(originalItems.filter(i=>i.kind==='grammar').map(i=>[i.pattern,i.sourcePage]))
    .toEqual(source.usage.map(r=>[r.label,r.sourcePage]));
  expect(vocabulary.find(i=>i.displayWord==='injury')).toMatchObject({
    sourcePage:112,chapterMeaningsZh:'（身體）傷害（可數）；（名譽）損壞（不可數）'});
  expect(vocabulary.find(i=>i.displayWord==='satisfactorily')).toMatchObject({
    sourcePage:113,sourceRole:'unnumbered_headword',officialWordId:null,chapterMeaningsZh:'令人滿意地'});
});

it('uses existing dictionary identities and leaves unmapped supplements pending', () => {
  const vocabulary = originalU11Items().filter(i => i.kind === 'vocabulary');
  for (const [index,row] of [...source.headwords,...source.related].entries()) {
    const item=vocabulary[index];
    expect(item.officialWordId).toBe(row.officialWordId);
    if (!row.officialWordId) continue;
    const word=pack.words.find(w=>w.wordId===row.officialWordId)!;
    expect(word.word).toBe(row.officialWord);
    expect(word.word===row.word || word.wordVariants.includes(row.word)).toBe(true);
  }
  expect(vocabulary.filter(i=>!i.officialWordId)).toHaveLength(24);
  expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')).toHaveLength(20);
  expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')
    .every(i=>i.targetMeaningZh==='教材補充詞；義項待核對。')).toBe(true);
});

it('adopts no pictures, examples, senses or textbook questions', () => {
  expect(unit.deliveryMode).toBe('text_only');
  expect(unit.questions).toEqual([]);
  expect(unit.items.every(i=>!i.illustration && !i.originalExample && !i.officialSenseId && i.practiceMode==='read_only')).toBe(true);
  expect(practiceIds(unit.items)).toEqual([]);
  expect(allQuestions.some(q=>unit.items.some(i=>i.learningItemId===q.learningItemId))).toBe(false);
});

it('fresh lightweight installation resolves all 112 unique mapped identities', async () => {
  vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(pack))));
  await ensureContentAvailable();
  const group=templateGroup(unit.templateId);
  const ids=groupWordIds(group);
  expect(validGroup(group)).toBe(true);
  expect(group.itemIds).toHaveLength(212);
  expect(ids).toHaveLength(112);
  expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);
  expect(resolveGroupWords(group,await contentDb.words.toArray())).toHaveLength(112);
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('sa-pack.json');
});

it('siege excludes pending clues while retaining checked unmapped independent heads', () => {
  withOriginalU11Items(() => {
  const vocabulary = unit.items.filter(i => i.kind === 'vocabulary');
  const words=siegeUnitWords('LV3',11,[]);
  expect(words.some(([,m])=>m.includes('義項待核對'))).toBe(false);
  for (const word of ['temporarily','steadily','satisfactorily','inefficient']) {
    const item=vocabulary.find(i=>i.displayWord===word)!;
    expect(item.officialWordId).toBeNull();
    expect(words).toContainEqual([word.toUpperCase(),item.chapterMeaningsZh]);
  }
  });
});

it('content refresh retains all progress tables, personal group name and order', async () => {
  const ids=groupWordIds(templateGroup(unit.templateId));
  const oldWords=pack.words.filter(w=>!ids.includes(w.wordId));
  let incoming={...pack,words:oldWords,meta:{...pack.meta,contentHash:'sa:before-U11',counts:{...pack.meta.counts,words:oldWords.length}}};
  vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(incoming))));
  await ensureContentAvailable();
  await gradeFlashcard(oldWords[0].word,2,'before-U11',true);
  const {group}=await getOrCreateTemplateGroup(unit.templateId);
  await saveGroup({...group,name:'U11 personal order',itemIds:[...group.itemIds].reverse()});
  await progressDb.settings.put({key:'fontScale',value:1.15});
  const before=await Promise.all(progressDb.tables.map(t=>t.toArray()));
  incoming=pack;
  await refreshInstalledContent();
  expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);
  expect(await Promise.all(progressDb.tables.map(t=>t.toArray()))).toEqual(before);
  const saved=await getOrCreateTemplateGroup(unit.templateId);
  expect(saved.added).toBe(false);
  expect(saved.group.name).toBe('U11 personal order');
  expect(saved.group.itemIds).toEqual([...group.itemIds].reverse());
});

// Independent source expectations. No actual-after/compiler data used.
const u11Fixture: U11Fixture = {
  "expectedName": "independent-expected-after-v4.json",
  "acceptedName": "accepted-proposals-merged-v3.json",
  "inputRawHashes": {
    "expected": "8319c034fae6583fed2c26cb29f0394fcc0cafdae2b6dc4d762d3416b91f333b",
    "accepted": "526c3ba3e3c51f29706d4f5330a2e4ceb6039317b6dcc5f326a4126bebc295c2",
    "frozen": "88620469055a957a7ce52f8df9cb71feac59497b9d02a9fc303b33235be7765a"
  },
  "documents": [
    {
      "dataset": "words",
      "path": "public/data/v1/words.json",
      "beforeHash": "1b9264c38eef7fd30ad867c3ef8098d91e8b9a1e5ded767d3c8a22c7f7fa43b1",
      "afterHash": "12c4682feeec799fe2b4e69a7b7f805f8501f74426c5667aa10be4ae1e2f2714",
      "rows": 6090
    },
    {
      "dataset": "examples",
      "path": "public/data/v1/examples.json",
      "beforeHash": "321cd6306d1ad321b762908f5b5e4c25e8168fda73fd47abfd6d1d999b0f5f51",
      "afterHash": "92546fdf5f7d98c8476ce13b2a15820041a2d9066c170f4f0e178a2db0dccead",
      "rows": 7871
    },
    {
      "dataset": "notes",
      "path": "public/data/v1/notes.json",
      "beforeHash": "d66fd676d1b17e841d071628ffd5b521cd6cadf9002509c612833542ae672a45",
      "afterHash": "4c54a2add9041d0cf279a007c5ea08ec38517bb12b9d111cedf71d2a80103df4",
      "rows": 4290
    },
    {
      "dataset": "senses",
      "path": "public/data/v1/senses.json",
      "beforeHash": "3aa3604943243a98042914453bc34d86896c2daf40baa03b275bd548da847e56",
      "afterHash": "3aa3604943243a98042914453bc34d86896c2daf40baa03b275bd548da847e56",
      "rows": 772
    },
    {
      "dataset": "media",
      "path": "public/data/v1/media.json",
      "beforeHash": "82f8bcd1c91f15870af7b7e6ad115bbc337fa8af237251b91eadd0ee3c55c92a",
      "afterHash": "82f8bcd1c91f15870af7b7e6ad115bbc337fa8af237251b91eadd0ee3c55c92a",
      "rows": 1177
    },
    {
      "dataset": "curriculum",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "beforeHash": "166deecc3615dab009f45260218e080d082a26ad29244957180c31aa0ae74141",
      "afterHash": "020abb690fdb363e5a0baad046c14144a7388dd96dea4d1cb5f298a6451cb645",
      "rows": 212
    }
  ],
  "rows": [
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V046",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V046",
        "kind": "vocabulary",
        "displayWord": "permanent",
        "lexemeRef": "W003731",
        "officialWordId": "W003731",
        "officialSenseId": null,
        "sensePos": "adj.",
        "targetMeaningZh": "永久的；不變的；固定的；持久的",
        "chapterMeaningsZh": "永久的；不變的；固定的；持久的",
        "sourcePage": 107,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "反",
        "meaningSource": "existing_dictionary",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V046",
        "kind": "vocabulary",
        "displayWord": "permanent",
        "lexemeRef": "W003731",
        "officialWordId": "W003731",
        "officialSenseId": null,
        "sensePos": "adj.",
        "targetMeaningZh": "永久的",
        "chapterMeaningsZh": "永久的",
        "sourcePage": 107,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "反",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "298320a289f4ecbc7312d86034de0c4aa2dd3f86c5a9ffe8f97b828eaecb38bd",
      "expectedAfterRowSha256": "6a0b355377bdabeaa1c93ca8db87890e2a7ffa577694d0eb4ebedccbca1e5bac",
      "fields": {
        "targetMeaningZh": "永久的",
        "chapterMeaningsZh": "永久的",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101032.jpg",
            "page": 107,
            "sha256": "cf76ed44cc90e2660588faa3cd443d200366ed419bf32991e2d1fcfb7f5bc8aa",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "permanent adj. 永久的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101032.jpg",
            "page": 107,
            "sha256": "cf76ed44cc90e2660588faa3cd443d200366ed419bf32991e2d1fcfb7f5bc8aa",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "permanent adj. 永久的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101032.jpg",
            "page": 107,
            "sha256": "cf76ed44cc90e2660588faa3cd443d200366ed419bf32991e2d1fcfb7f5bc8aa",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "permanent adj. 永久的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V047",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "sensePos",
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V047",
        "kind": "vocabulary",
        "displayWord": "momentarily",
        "lexemeRef": "momentarily",
        "officialWordId": null,
        "officialSenseId": null,
        "sensePos": "",
        "targetMeaningZh": "教材補充詞；義項待核對。",
        "chapterMeaningsZh": "教材補充詞；義項待核對。",
        "sourcePage": 107,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "似",
        "meaningSource": "unmapped_supplement",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V047",
        "kind": "vocabulary",
        "displayWord": "momentarily",
        "lexemeRef": "momentarily",
        "officialWordId": null,
        "officialSenseId": null,
        "sensePos": "adv.",
        "targetMeaningZh": "臨時地",
        "chapterMeaningsZh": "臨時地",
        "sourcePage": 107,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "似",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "01cb73af17244f35d5979a0332b9ee1b360c71dd381adcec35665173334520d0",
      "expectedAfterRowSha256": "416b0e0c450435e9799e9c9d1790762678e1f6498a9e3b342a2971ba36237f72",
      "fields": {
        "sensePos": "adv.",
        "targetMeaningZh": "臨時地",
        "chapterMeaningsZh": "臨時地",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "sensePos": [
          {
            "type": "textbook_photo",
            "file": "20260815_101032.jpg",
            "page": 107,
            "sha256": "cf76ed44cc90e2660588faa3cd443d200366ed419bf32991e2d1fcfb7f5bc8aa",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "momentarily adv. 臨時地",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101032.jpg",
            "page": 107,
            "sha256": "cf76ed44cc90e2660588faa3cd443d200366ed419bf32991e2d1fcfb7f5bc8aa",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "momentarily adv. 臨時地",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101032.jpg",
            "page": 107,
            "sha256": "cf76ed44cc90e2660588faa3cd443d200366ed419bf32991e2d1fcfb7f5bc8aa",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "momentarily adv. 臨時地",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101032.jpg",
            "page": 107,
            "sha256": "cf76ed44cc90e2660588faa3cd443d200366ed419bf32991e2d1fcfb7f5bc8aa",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "momentarily adv. 臨時地",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V048",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "sensePos",
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V048",
        "kind": "vocabulary",
        "displayWord": "permanently",
        "lexemeRef": "permanently",
        "officialWordId": null,
        "officialSenseId": null,
        "sensePos": "",
        "targetMeaningZh": "教材補充詞；義項待核對。",
        "chapterMeaningsZh": "教材補充詞；義項待核對。",
        "sourcePage": 107,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "反",
        "meaningSource": "unmapped_supplement",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V048",
        "kind": "vocabulary",
        "displayWord": "permanently",
        "lexemeRef": "permanently",
        "officialWordId": null,
        "officialSenseId": null,
        "sensePos": "adv.",
        "targetMeaningZh": "永久地",
        "chapterMeaningsZh": "永久地",
        "sourcePage": 107,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "反",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "acb22352a0b566eb715cc7ddaac787e8b6520aeca1f1ae97d5c3384c5683ff59",
      "expectedAfterRowSha256": "44d76832fbcea3d55c40e316d5287928a8dc9cabb9b62f31c04c8d505c864167",
      "fields": {
        "sensePos": "adv.",
        "targetMeaningZh": "永久地",
        "chapterMeaningsZh": "永久地",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "sensePos": [
          {
            "type": "textbook_photo",
            "file": "20260815_101032.jpg",
            "page": 107,
            "sha256": "cf76ed44cc90e2660588faa3cd443d200366ed419bf32991e2d1fcfb7f5bc8aa",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "permanently adv. 永久地",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101032.jpg",
            "page": 107,
            "sha256": "cf76ed44cc90e2660588faa3cd443d200366ed419bf32991e2d1fcfb7f5bc8aa",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "permanently adv. 永久地",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101032.jpg",
            "page": 107,
            "sha256": "cf76ed44cc90e2660588faa3cd443d200366ed419bf32991e2d1fcfb7f5bc8aa",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "permanently adv. 永久地",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101032.jpg",
            "page": 107,
            "sha256": "cf76ed44cc90e2660588faa3cd443d200366ed419bf32991e2d1fcfb7f5bc8aa",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "permanently adv. 永久地",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V049",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V049",
        "kind": "vocabulary",
        "displayWord": "servant",
        "lexemeRef": "W001778",
        "officialWordId": "W001778",
        "officialSenseId": null,
        "sensePos": "n.",
        "targetMeaningZh": "僕人；有用物；公務員；僱員",
        "chapterMeaningsZh": "僕人；有用物；公務員；僱員",
        "sourcePage": 107,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "似",
        "meaningSource": "existing_dictionary",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V049",
        "kind": "vocabulary",
        "displayWord": "servant",
        "lexemeRef": "W001778",
        "officialWordId": "W001778",
        "officialSenseId": null,
        "sensePos": "n.",
        "targetMeaningZh": "僕人",
        "chapterMeaningsZh": "僕人",
        "sourcePage": 107,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "似",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "e4308ae4b1a815c70ccfeb1696f4e32c253bed59bad12f7ac128521697796f1a",
      "expectedAfterRowSha256": "aeea4849e601534487182b4fd13b34cf8f5747043d73cd85c02f31f587eba332",
      "fields": {
        "targetMeaningZh": "僕人",
        "chapterMeaningsZh": "僕人",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101032.jpg",
            "page": 107,
            "sha256": "cf76ed44cc90e2660588faa3cd443d200366ed419bf32991e2d1fcfb7f5bc8aa",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "servant n. 僕人",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101032.jpg",
            "page": 107,
            "sha256": "cf76ed44cc90e2660588faa3cd443d200366ed419bf32991e2d1fcfb7f5bc8aa",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "servant n. 僕人",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101032.jpg",
            "page": 107,
            "sha256": "cf76ed44cc90e2660588faa3cd443d200366ed419bf32991e2d1fcfb7f5bc8aa",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "servant n. 僕人",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V050",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "sensePos",
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V050",
        "kind": "vocabulary",
        "displayWord": "relieved",
        "lexemeRef": "relieved",
        "officialWordId": null,
        "officialSenseId": null,
        "sensePos": "",
        "targetMeaningZh": "教材補充詞；義項待核對。",
        "chapterMeaningsZh": "教材補充詞；義項待核對。",
        "sourcePage": 107,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "*",
        "meaningSource": "unmapped_supplement",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V050",
        "kind": "vocabulary",
        "displayWord": "relieved",
        "lexemeRef": "relieved",
        "officialWordId": null,
        "officialSenseId": null,
        "sensePos": "adj.",
        "targetMeaningZh": "舒緩的",
        "chapterMeaningsZh": "舒緩的",
        "sourcePage": 107,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "*",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "22e95c6cdd0c586ac4d6ea22d4d361df8d5ff3d81bdcba0373de750aa96a9a4f",
      "expectedAfterRowSha256": "12334a6324fa532e7bfd9afdf98f4283df73f02699da31db23f766071f30ce5c",
      "fields": {
        "sensePos": "adj.",
        "targetMeaningZh": "舒緩的",
        "chapterMeaningsZh": "舒緩的",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "sensePos": [
          {
            "type": "textbook_photo",
            "file": "20260815_101032.jpg",
            "page": 107,
            "sha256": "cf76ed44cc90e2660588faa3cd443d200366ed419bf32991e2d1fcfb7f5bc8aa",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "relieved adj. 舒緩的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101032.jpg",
            "page": 107,
            "sha256": "cf76ed44cc90e2660588faa3cd443d200366ed419bf32991e2d1fcfb7f5bc8aa",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "relieved adj. 舒緩的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101032.jpg",
            "page": 107,
            "sha256": "cf76ed44cc90e2660588faa3cd443d200366ed419bf32991e2d1fcfb7f5bc8aa",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "relieved adj. 舒緩的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101032.jpg",
            "page": 107,
            "sha256": "cf76ed44cc90e2660588faa3cd443d200366ed419bf32991e2d1fcfb7f5bc8aa",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "relieved adj. 舒緩的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V051",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "sensePos",
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V051",
        "kind": "vocabulary",
        "displayWord": "butler",
        "lexemeRef": "butler",
        "officialWordId": null,
        "officialSenseId": null,
        "sensePos": "",
        "targetMeaningZh": "教材補充詞；義項待核對。",
        "chapterMeaningsZh": "教材補充詞；義項待核對。",
        "sourcePage": 107,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "*",
        "meaningSource": "unmapped_supplement",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V051",
        "kind": "vocabulary",
        "displayWord": "butler",
        "lexemeRef": "butler",
        "officialWordId": null,
        "officialSenseId": null,
        "sensePos": "n.",
        "targetMeaningZh": "男管家",
        "chapterMeaningsZh": "男管家",
        "sourcePage": 107,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "*",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "1a940c7c8c638097bbd47bd834a890e64d4392978d6e69722e698c9ef20bedb1",
      "expectedAfterRowSha256": "58f0c84f0deba596142c257f65e0d6c88a0aa5000883eae2570a9f95d431295e",
      "fields": {
        "sensePos": "n.",
        "targetMeaningZh": "男管家",
        "chapterMeaningsZh": "男管家",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "sensePos": [
          {
            "type": "textbook_photo",
            "file": "20260815_101032.jpg",
            "page": 107,
            "sha256": "cf76ed44cc90e2660588faa3cd443d200366ed419bf32991e2d1fcfb7f5bc8aa",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "butler n. 男管家",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101032.jpg",
            "page": 107,
            "sha256": "cf76ed44cc90e2660588faa3cd443d200366ed419bf32991e2d1fcfb7f5bc8aa",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "butler n. 男管家",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101032.jpg",
            "page": 107,
            "sha256": "cf76ed44cc90e2660588faa3cd443d200366ed419bf32991e2d1fcfb7f5bc8aa",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "butler n. 男管家",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101032.jpg",
            "page": 107,
            "sha256": "cf76ed44cc90e2660588faa3cd443d200366ed419bf32991e2d1fcfb7f5bc8aa",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "butler n. 男管家",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V052",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V052",
        "kind": "vocabulary",
        "displayWord": "luxurious",
        "lexemeRef": "W003613",
        "officialWordId": "W003613",
        "officialSenseId": null,
        "sensePos": "adj.",
        "targetMeaningZh": "豪華的；奢侈的；放縱的",
        "chapterMeaningsZh": "豪華的；奢侈的；放縱的",
        "sourcePage": 107,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "*",
        "meaningSource": "existing_dictionary",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V052",
        "kind": "vocabulary",
        "displayWord": "luxurious",
        "lexemeRef": "W003613",
        "officialWordId": "W003613",
        "officialSenseId": null,
        "sensePos": "adj.",
        "targetMeaningZh": "豪華的；奢侈的",
        "chapterMeaningsZh": "豪華的；奢侈的",
        "sourcePage": 107,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "*",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "e7d90a2f4c3411eb178eb3b572ee6f55cc1ffa23ee4e3d954611e64234138bca",
      "expectedAfterRowSha256": "60ee87c332f2eefa3227d647e8cb6e342a5acec623ed57ada1e50f33e9b31c3a",
      "fields": {
        "targetMeaningZh": "豪華的；奢侈的",
        "chapterMeaningsZh": "豪華的；奢侈的",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101032.jpg",
            "page": 107,
            "sha256": "cf76ed44cc90e2660588faa3cd443d200366ed419bf32991e2d1fcfb7f5bc8aa",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "luxurious adj. 豪華的；奢侈的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101032.jpg",
            "page": 107,
            "sha256": "cf76ed44cc90e2660588faa3cd443d200366ed419bf32991e2d1fcfb7f5bc8aa",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "luxurious adj. 豪華的；奢侈的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101032.jpg",
            "page": 107,
            "sha256": "cf76ed44cc90e2660588faa3cd443d200366ed419bf32991e2d1fcfb7f5bc8aa",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "luxurious adj. 豪華的；奢侈的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V053",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V053",
        "kind": "vocabulary",
        "displayWord": "resistant",
        "lexemeRef": "W005769",
        "officialWordId": "W005769",
        "officialSenseId": null,
        "sensePos": "adj.",
        "targetMeaningZh": "抵抗者；反抗者；抵抗的；反抗的",
        "chapterMeaningsZh": "抵抗者；反抗者；抵抗的；反抗的",
        "sourcePage": 108,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "衍",
        "meaningSource": "existing_dictionary",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V053",
        "kind": "vocabulary",
        "displayWord": "resistant",
        "lexemeRef": "W005769",
        "officialWordId": "W005769",
        "officialSenseId": null,
        "sensePos": "adj.",
        "targetMeaningZh": "抵抗的",
        "chapterMeaningsZh": "抵抗的",
        "sourcePage": 108,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "衍",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "47332780b7a1b2681f1cbe0196f3c8b400a1341905e2d4b1bb5f471a49e89b2f",
      "expectedAfterRowSha256": "7b5ba614dc36f9dfc812925581c1d118cd98ad30f462b87bf82c2ef4cba1d939",
      "fields": {
        "targetMeaningZh": "抵抗的",
        "chapterMeaningsZh": "抵抗的",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101041.jpg",
            "page": 108,
            "sha256": "2486397e839df9a89789d792858a4d93aa949bcac5033d97e2ac4f55a0a42e19",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "resistant adj. 抵抗的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101041.jpg",
            "page": 108,
            "sha256": "2486397e839df9a89789d792858a4d93aa949bcac5033d97e2ac4f55a0a42e19",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "resistant adj. 抵抗的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101041.jpg",
            "page": 108,
            "sha256": "2486397e839df9a89789d792858a4d93aa949bcac5033d97e2ac4f55a0a42e19",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "resistant adj. 抵抗的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V054",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V054",
        "kind": "vocabulary",
        "displayWord": "resistance",
        "lexemeRef": "W003849",
        "officialWordId": "W003849",
        "officialSenseId": null,
        "sensePos": "n.",
        "targetMeaningZh": "抵抗力；反抗；耐力；阻力",
        "chapterMeaningsZh": "抵抗力；反抗；耐力；阻力",
        "sourcePage": 108,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "衍",
        "meaningSource": "existing_dictionary",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V054",
        "kind": "vocabulary",
        "displayWord": "resistance",
        "lexemeRef": "W003849",
        "officialWordId": "W003849",
        "officialSenseId": null,
        "sensePos": "n.",
        "targetMeaningZh": "抵抗",
        "chapterMeaningsZh": "抵抗",
        "sourcePage": 108,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "衍",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "b1aa60c0eae773644e09c1e014fe1a4ddb34a4697b2f96cc6de93aa0e5c64db9",
      "expectedAfterRowSha256": "278650c53f4c293ad6713a65ddc9f5a40f0948a3d6673f638b3c6934d2660f8b",
      "fields": {
        "targetMeaningZh": "抵抗",
        "chapterMeaningsZh": "抵抗",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101041.jpg",
            "page": 108,
            "sha256": "2486397e839df9a89789d792858a4d93aa949bcac5033d97e2ac4f55a0a42e19",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "resistance n. 抵抗",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101041.jpg",
            "page": 108,
            "sha256": "2486397e839df9a89789d792858a4d93aa949bcac5033d97e2ac4f55a0a42e19",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "resistance n. 抵抗",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101041.jpg",
            "page": 108,
            "sha256": "2486397e839df9a89789d792858a4d93aa949bcac5033d97e2ac4f55a0a42e19",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "resistance n. 抵抗",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V055",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "sensePos",
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V055",
        "kind": "vocabulary",
        "displayWord": "guide",
        "lexemeRef": "W001419",
        "officialWordId": "W001419",
        "officialSenseId": null,
        "sensePos": "n./v.",
        "targetMeaningZh": "引導者；導遊；指南；路標",
        "chapterMeaningsZh": "引導者；導遊；指南；路標",
        "sourcePage": 108,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "衍",
        "meaningSource": "existing_dictionary",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V055",
        "kind": "vocabulary",
        "displayWord": "guide",
        "lexemeRef": "W001419",
        "officialWordId": "W001419",
        "officialSenseId": null,
        "sensePos": "vt.",
        "targetMeaningZh": "引導",
        "chapterMeaningsZh": "引導",
        "sourcePage": 108,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "衍",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "acb2d423ec84ca8674ba1460ed1b254340a63dc8347b5548cbebca0191f2646c",
      "expectedAfterRowSha256": "76b0477577bdb70c80cdaabb7dfbb0b80453a20fbfc6d2c8705c04903f756338",
      "fields": {
        "sensePos": "vt.",
        "targetMeaningZh": "引導",
        "chapterMeaningsZh": "引導",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "sensePos": [
          {
            "type": "textbook_photo",
            "file": "20260815_101041.jpg",
            "page": 108,
            "sha256": "2486397e839df9a89789d792858a4d93aa949bcac5033d97e2ac4f55a0a42e19",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "guide vt. 引導",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101041.jpg",
            "page": 108,
            "sha256": "2486397e839df9a89789d792858a4d93aa949bcac5033d97e2ac4f55a0a42e19",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "guide vt. 引導",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101041.jpg",
            "page": 108,
            "sha256": "2486397e839df9a89789d792858a4d93aa949bcac5033d97e2ac4f55a0a42e19",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "guide vt. 引導",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101041.jpg",
            "page": 108,
            "sha256": "2486397e839df9a89789d792858a4d93aa949bcac5033d97e2ac4f55a0a42e19",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "guide vt. 引導",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V056",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V056",
        "kind": "vocabulary",
        "displayWord": "instruction",
        "lexemeRef": "W001469",
        "officialWordId": "W001469",
        "officialSenseId": null,
        "sensePos": "n.",
        "targetMeaningZh": "指令；教導；命令",
        "chapterMeaningsZh": "指令；教導；命令",
        "sourcePage": 108,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "似",
        "meaningSource": "existing_dictionary",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V056",
        "kind": "vocabulary",
        "displayWord": "instruction",
        "lexemeRef": "W001469",
        "officialWordId": "W001469",
        "officialSenseId": null,
        "sensePos": "n.",
        "targetMeaningZh": "教導",
        "chapterMeaningsZh": "教導",
        "sourcePage": 108,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "似",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "d22baa74459e0f189b88dcc5982dd1a5040106d6c09a137c1f7eea5444985580",
      "expectedAfterRowSha256": "bb7ee69f63ec6f3626bb9a7058a308bc54fa9a94e8bb7c46ff86cab222ca5ee2",
      "fields": {
        "targetMeaningZh": "教導",
        "chapterMeaningsZh": "教導",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101041.jpg",
            "page": 108,
            "sha256": "2486397e839df9a89789d792858a4d93aa949bcac5033d97e2ac4f55a0a42e19",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "instruction n. 教導",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101041.jpg",
            "page": 108,
            "sha256": "2486397e839df9a89789d792858a4d93aa949bcac5033d97e2ac4f55a0a42e19",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "instruction n. 教導",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101041.jpg",
            "page": 108,
            "sha256": "2486397e839df9a89789d792858a4d93aa949bcac5033d97e2ac4f55a0a42e19",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "instruction n. 教導",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V057",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V057",
        "kind": "vocabulary",
        "displayWord": "accuracy",
        "lexemeRef": "W003019",
        "officialWordId": "W003019",
        "officialSenseId": null,
        "sensePos": "n.",
        "targetMeaningZh": "精確；正確；準確度",
        "chapterMeaningsZh": "精確；正確；準確度",
        "sourcePage": 108,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "衍",
        "meaningSource": "existing_dictionary",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V057",
        "kind": "vocabulary",
        "displayWord": "accuracy",
        "lexemeRef": "W003019",
        "officialWordId": "W003019",
        "officialSenseId": null,
        "sensePos": "n.",
        "targetMeaningZh": "準確性",
        "chapterMeaningsZh": "準確性",
        "sourcePage": 108,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "衍",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "cab30b75d452b53b59701870fb517ad43d6c4753a6af111e7cb164ec64e5ec09",
      "expectedAfterRowSha256": "e6d66e984ded128991bed3addb7e84f4a10f991618740d0ec9208e5d5049c57b",
      "fields": {
        "targetMeaningZh": "準確性",
        "chapterMeaningsZh": "準確性",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101041.jpg",
            "page": 108,
            "sha256": "2486397e839df9a89789d792858a4d93aa949bcac5033d97e2ac4f55a0a42e19",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "accuracy n. 準確性",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101041.jpg",
            "page": 108,
            "sha256": "2486397e839df9a89789d792858a4d93aa949bcac5033d97e2ac4f55a0a42e19",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "accuracy n. 準確性",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101041.jpg",
            "page": 108,
            "sha256": "2486397e839df9a89789d792858a4d93aa949bcac5033d97e2ac4f55a0a42e19",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "accuracy n. 準確性",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V058",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V058",
        "kind": "vocabulary",
        "displayWord": "precise",
        "lexemeRef": "W003760",
        "officialWordId": "W003760",
        "officialSenseId": null,
        "sensePos": "adj.",
        "targetMeaningZh": "精確的；嚴謹的；明確的；精密的",
        "chapterMeaningsZh": "精確的；嚴謹的；明確的；精密的",
        "sourcePage": 108,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "似",
        "meaningSource": "existing_dictionary",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V058",
        "kind": "vocabulary",
        "displayWord": "precise",
        "lexemeRef": "W003760",
        "officialWordId": "W003760",
        "officialSenseId": null,
        "sensePos": "adj.",
        "targetMeaningZh": "精確的",
        "chapterMeaningsZh": "精確的",
        "sourcePage": 108,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "似",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "2ad9cc1e4160b90f7ac3ac3b46c24384604af8da7a92ad4c04698c5d4e329c43",
      "expectedAfterRowSha256": "927dd37310de581d854545f9c98f474f9662f88db727b277bb86baa38bac8978",
      "fields": {
        "targetMeaningZh": "精確的",
        "chapterMeaningsZh": "精確的",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101041.jpg",
            "page": 108,
            "sha256": "2486397e839df9a89789d792858a4d93aa949bcac5033d97e2ac4f55a0a42e19",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "precise adj. 精確的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101041.jpg",
            "page": 108,
            "sha256": "2486397e839df9a89789d792858a4d93aa949bcac5033d97e2ac4f55a0a42e19",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "precise adj. 精確的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101041.jpg",
            "page": 108,
            "sha256": "2486397e839df9a89789d792858a4d93aa949bcac5033d97e2ac4f55a0a42e19",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "precise adj. 精確的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V059",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "sensePos",
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V059",
        "kind": "vocabulary",
        "displayWord": "inaccurate",
        "lexemeRef": "inaccurate",
        "officialWordId": null,
        "officialSenseId": null,
        "sensePos": "",
        "targetMeaningZh": "教材補充詞；義項待核對。",
        "chapterMeaningsZh": "教材補充詞；義項待核對。",
        "sourcePage": 108,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "反",
        "meaningSource": "unmapped_supplement",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V059",
        "kind": "vocabulary",
        "displayWord": "inaccurate",
        "lexemeRef": "inaccurate",
        "officialWordId": null,
        "officialSenseId": null,
        "sensePos": "adj.",
        "targetMeaningZh": "不精確的",
        "chapterMeaningsZh": "不精確的",
        "sourcePage": 108,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "反",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "c17638276f7c4164a607a2386f5915af02043dd02a28326c0d7d8be39be36f50",
      "expectedAfterRowSha256": "5f35a10d4b24a825279b65cdd801c3148f915e1c7fc1daaa1bdc7a9c7b321a66",
      "fields": {
        "sensePos": "adj.",
        "targetMeaningZh": "不精確的",
        "chapterMeaningsZh": "不精確的",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "sensePos": [
          {
            "type": "textbook_photo",
            "file": "20260815_101041.jpg",
            "page": 108,
            "sha256": "2486397e839df9a89789d792858a4d93aa949bcac5033d97e2ac4f55a0a42e19",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "inaccurate adj. 不精確的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101041.jpg",
            "page": 108,
            "sha256": "2486397e839df9a89789d792858a4d93aa949bcac5033d97e2ac4f55a0a42e19",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "inaccurate adj. 不精確的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101041.jpg",
            "page": 108,
            "sha256": "2486397e839df9a89789d792858a4d93aa949bcac5033d97e2ac4f55a0a42e19",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "inaccurate adj. 不精確的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101041.jpg",
            "page": 108,
            "sha256": "2486397e839df9a89789d792858a4d93aa949bcac5033d97e2ac4f55a0a42e19",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "inaccurate adj. 不精確的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V060",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "sensePos",
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V060",
        "kind": "vocabulary",
        "displayWord": "contest",
        "lexemeRef": "W003209",
        "officialWordId": "W003209",
        "officialSenseId": null,
        "sensePos": "n./v.",
        "targetMeaningZh": "競賽；爭論；競爭；爭取",
        "chapterMeaningsZh": "競賽；爭論；競爭；爭取",
        "sourcePage": 108,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "*",
        "meaningSource": "existing_dictionary",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V060",
        "kind": "vocabulary",
        "displayWord": "contest",
        "lexemeRef": "W003209",
        "officialWordId": "W003209",
        "officialSenseId": null,
        "sensePos": "n.",
        "targetMeaningZh": "比賽；競賽",
        "chapterMeaningsZh": "比賽；競賽",
        "sourcePage": 108,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "*",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "7b6727f7377c8e7b935907beb3ad082208659a0f4998a1acab50c4c8566a0a6d",
      "expectedAfterRowSha256": "b41afd62403773a4103b27b2bc666aa2c656599381112b5068f0afe6b35729af",
      "fields": {
        "sensePos": "n.",
        "targetMeaningZh": "比賽；競賽",
        "chapterMeaningsZh": "比賽；競賽",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "sensePos": [
          {
            "type": "textbook_photo",
            "file": "20260815_101041.jpg",
            "page": 108,
            "sha256": "2486397e839df9a89789d792858a4d93aa949bcac5033d97e2ac4f55a0a42e19",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "contest n. 比賽；競賽",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101041.jpg",
            "page": 108,
            "sha256": "2486397e839df9a89789d792858a4d93aa949bcac5033d97e2ac4f55a0a42e19",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "contest n. 比賽；競賽",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101041.jpg",
            "page": 108,
            "sha256": "2486397e839df9a89789d792858a4d93aa949bcac5033d97e2ac4f55a0a42e19",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "contest n. 比賽；競賽",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101041.jpg",
            "page": 108,
            "sha256": "2486397e839df9a89789d792858a4d93aa949bcac5033d97e2ac4f55a0a42e19",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "contest n. 比賽；競賽",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V061",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "sensePos",
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V061",
        "kind": "vocabulary",
        "displayWord": "throw",
        "lexemeRef": "W000889",
        "officialWordId": "W000889",
        "officialSenseId": null,
        "sensePos": "v./n.",
        "targetMeaningZh": "投；擲；拋；發射",
        "chapterMeaningsZh": "投；擲；拋；發射",
        "sourcePage": 109,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "似",
        "meaningSource": "existing_dictionary",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V061",
        "kind": "vocabulary",
        "displayWord": "throw",
        "lexemeRef": "W000889",
        "officialWordId": "W000889",
        "officialSenseId": null,
        "sensePos": "vt.",
        "targetMeaningZh": "投；擲",
        "chapterMeaningsZh": "投；擲",
        "sourcePage": 109,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "似",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "4ab034206f1878d4f34feb17e47acc482dde81406ead204387db002e8e1f425b",
      "expectedAfterRowSha256": "131c23dffb07600b0c0646e016f499574f5b981b7189687d142036e0a36b967e",
      "fields": {
        "sensePos": "vt.",
        "targetMeaningZh": "投；擲",
        "chapterMeaningsZh": "投；擲",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "sensePos": [
          {
            "type": "textbook_photo",
            "file": "20260815_101046.jpg",
            "page": 109,
            "sha256": "4da68e6ee600559f778da74cba344592b1cb7d9e0e1c496ce9b00dd92981c3b3",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "throw vt. 投；擲",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101046.jpg",
            "page": 109,
            "sha256": "4da68e6ee600559f778da74cba344592b1cb7d9e0e1c496ce9b00dd92981c3b3",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "throw vt. 投；擲",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101046.jpg",
            "page": 109,
            "sha256": "4da68e6ee600559f778da74cba344592b1cb7d9e0e1c496ce9b00dd92981c3b3",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "throw vt. 投；擲",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101046.jpg",
            "page": 109,
            "sha256": "4da68e6ee600559f778da74cba344592b1cb7d9e0e1c496ce9b00dd92981c3b3",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "throw vt. 投；擲",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V062",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "sensePos",
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V062",
        "kind": "vocabulary",
        "displayWord": "crumple",
        "lexemeRef": "crumple",
        "officialWordId": null,
        "officialSenseId": null,
        "sensePos": "",
        "targetMeaningZh": "教材補充詞；義項待核對。",
        "chapterMeaningsZh": "教材補充詞；義項待核對。",
        "sourcePage": 109,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "*",
        "meaningSource": "unmapped_supplement",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V062",
        "kind": "vocabulary",
        "displayWord": "crumple",
        "lexemeRef": "crumple",
        "officialWordId": null,
        "officialSenseId": null,
        "sensePos": "vt.",
        "targetMeaningZh": "弄皺",
        "chapterMeaningsZh": "弄皺",
        "sourcePage": 109,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "*",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "93a694eb4289a4a4e7217c8d4885e1f7bb6fc975f2de12139a5bba271d76f8ee",
      "expectedAfterRowSha256": "e98e03bdcfe83d54d9e5a82b964951e7433e1f7cebc71162bea460dfaf98873c",
      "fields": {
        "sensePos": "vt.",
        "targetMeaningZh": "弄皺",
        "chapterMeaningsZh": "弄皺",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "sensePos": [
          {
            "type": "textbook_photo",
            "file": "20260815_101046.jpg",
            "page": 109,
            "sha256": "4da68e6ee600559f778da74cba344592b1cb7d9e0e1c496ce9b00dd92981c3b3",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "crumple vt. 弄皺",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101046.jpg",
            "page": 109,
            "sha256": "4da68e6ee600559f778da74cba344592b1cb7d9e0e1c496ce9b00dd92981c3b3",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "crumple vt. 弄皺",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101046.jpg",
            "page": 109,
            "sha256": "4da68e6ee600559f778da74cba344592b1cb7d9e0e1c496ce9b00dd92981c3b3",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "crumple vt. 弄皺",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101046.jpg",
            "page": 109,
            "sha256": "4da68e6ee600559f778da74cba344592b1cb7d9e0e1c496ce9b00dd92981c3b3",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "crumple vt. 弄皺",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V063",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V063",
        "kind": "vocabulary",
        "displayWord": "venue",
        "lexemeRef": "W004968",
        "officialWordId": "W004968",
        "officialSenseId": null,
        "sensePos": "n.",
        "targetMeaningZh": "犯罪地點；審判地；發生地點",
        "chapterMeaningsZh": "犯罪地點；審判地；發生地點",
        "sourcePage": 109,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "*",
        "meaningSource": "existing_dictionary",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V063",
        "kind": "vocabulary",
        "displayWord": "venue",
        "lexemeRef": "W004968",
        "officialWordId": "W004968",
        "officialSenseId": null,
        "sensePos": "n.",
        "targetMeaningZh": "地點",
        "chapterMeaningsZh": "地點",
        "sourcePage": 109,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "*",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "f380385f3a37aae8ec61aa6cedd7f207b8ab672e11fbff48f4a8c46990d65adc",
      "expectedAfterRowSha256": "1a76c79af3096ccc65913ee6ba688bfedf8c47483f6e68b02b4380dc56c3645d",
      "fields": {
        "targetMeaningZh": "地點",
        "chapterMeaningsZh": "地點",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101046.jpg",
            "page": 109,
            "sha256": "4da68e6ee600559f778da74cba344592b1cb7d9e0e1c496ce9b00dd92981c3b3",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "venue n. 地點",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101046.jpg",
            "page": 109,
            "sha256": "4da68e6ee600559f778da74cba344592b1cb7d9e0e1c496ce9b00dd92981c3b3",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "venue n. 地點",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101046.jpg",
            "page": 109,
            "sha256": "4da68e6ee600559f778da74cba344592b1cb7d9e0e1c496ce9b00dd92981c3b3",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "venue n. 地點",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V064",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V064",
        "kind": "vocabulary",
        "displayWord": "reservation",
        "lexemeRef": "W003846",
        "officialWordId": "W003846",
        "officialSenseId": null,
        "sensePos": "n.",
        "targetMeaningZh": "保留；預定；保留品；保留地",
        "chapterMeaningsZh": "保留；預定；保留品；保留地",
        "sourcePage": 109,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "衍",
        "meaningSource": "existing_dictionary",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V064",
        "kind": "vocabulary",
        "displayWord": "reservation",
        "lexemeRef": "W003846",
        "officialWordId": "W003846",
        "officialSenseId": null,
        "sensePos": "n.",
        "targetMeaningZh": "預訂",
        "chapterMeaningsZh": "預訂",
        "sourcePage": 109,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "衍",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "c676b20bd33202ef23d783e60edb0e66842f77f70ecf9820d72cc5fd42815504",
      "expectedAfterRowSha256": "035736a1320d509591abb88c22307a09d817972f6b3258941316b1ad0a884247",
      "fields": {
        "targetMeaningZh": "預訂",
        "chapterMeaningsZh": "預訂",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101046.jpg",
            "page": 109,
            "sha256": "4da68e6ee600559f778da74cba344592b1cb7d9e0e1c496ce9b00dd92981c3b3",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "reservation n. 預訂",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101046.jpg",
            "page": 109,
            "sha256": "4da68e6ee600559f778da74cba344592b1cb7d9e0e1c496ce9b00dd92981c3b3",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "reservation n. 預訂",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101046.jpg",
            "page": 109,
            "sha256": "4da68e6ee600559f778da74cba344592b1cb7d9e0e1c496ce9b00dd92981c3b3",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "reservation n. 預訂",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V065",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V065",
        "kind": "vocabulary",
        "displayWord": "reservoir",
        "lexemeRef": "W004732",
        "officialWordId": "W004732",
        "officialSenseId": null,
        "sensePos": "n.",
        "targetMeaningZh": "貯水池；貯藏處；貯備；水庫",
        "chapterMeaningsZh": "貯水池；貯藏處；貯備；水庫",
        "sourcePage": 109,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "衍",
        "meaningSource": "existing_dictionary",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V065",
        "kind": "vocabulary",
        "displayWord": "reservoir",
        "lexemeRef": "W004732",
        "officialWordId": "W004732",
        "officialSenseId": null,
        "sensePos": "n.",
        "targetMeaningZh": "水庫",
        "chapterMeaningsZh": "水庫",
        "sourcePage": 109,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "衍",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "78bad55497769495b63acaef521bf7b1640a396ede3c4992121a5593abec452d",
      "expectedAfterRowSha256": "357b8d94397eecf182872e73a2031ce5008dfb55f268a81d039acc21b35d5016",
      "fields": {
        "targetMeaningZh": "水庫",
        "chapterMeaningsZh": "水庫",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101046.jpg",
            "page": 109,
            "sha256": "4da68e6ee600559f778da74cba344592b1cb7d9e0e1c496ce9b00dd92981c3b3",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "reservoir n. 水庫",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101046.jpg",
            "page": 109,
            "sha256": "4da68e6ee600559f778da74cba344592b1cb7d9e0e1c496ce9b00dd92981c3b3",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "reservoir n. 水庫",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101046.jpg",
            "page": 109,
            "sha256": "4da68e6ee600559f778da74cba344592b1cb7d9e0e1c496ce9b00dd92981c3b3",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "reservoir n. 水庫",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V066",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "sensePos",
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V066",
        "kind": "vocabulary",
        "displayWord": "preserve",
        "lexemeRef": "W003767",
        "officialWordId": "W003767",
        "officialSenseId": null,
        "sensePos": "v.",
        "targetMeaningZh": "保護；保持；保存；維持",
        "chapterMeaningsZh": "保護；保持；保存；維持",
        "sourcePage": 109,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "似",
        "meaningSource": "existing_dictionary",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V066",
        "kind": "vocabulary",
        "displayWord": "preserve",
        "lexemeRef": "W003767",
        "officialWordId": "W003767",
        "officialSenseId": null,
        "sensePos": "vt./n.",
        "targetMeaningZh": "保護；保存；果醬；蜜餞（常用複數）",
        "chapterMeaningsZh": "保護；保存；果醬；蜜餞（常用複數）",
        "sourcePage": 109,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "似",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "7d8ef13031f7c5d3ebffe9b3049931eb60e2eb464c84d7f7b21ddd7357cc213c",
      "expectedAfterRowSha256": "95b62da4eb943f191bbb5cd23dada7a31a1d91495d6fbbd701f89803a4806f62",
      "fields": {
        "sensePos": "vt./n.",
        "targetMeaningZh": "保護；保存；果醬；蜜餞（常用複數）",
        "chapterMeaningsZh": "保護；保存；果醬；蜜餞（常用複數）",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "sensePos": [
          {
            "type": "textbook_photo",
            "file": "20260815_101046.jpg",
            "page": 109,
            "sha256": "4da68e6ee600559f778da74cba344592b1cb7d9e0e1c496ce9b00dd92981c3b3",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "preserve vt./n. 保護；保存；果醬；蜜餞（常用複數）",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101046.jpg",
            "page": 109,
            "sha256": "4da68e6ee600559f778da74cba344592b1cb7d9e0e1c496ce9b00dd92981c3b3",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "preserve vt./n. 保護；保存；果醬；蜜餞（常用複數）",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101046.jpg",
            "page": 109,
            "sha256": "4da68e6ee600559f778da74cba344592b1cb7d9e0e1c496ce9b00dd92981c3b3",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "preserve vt./n. 保護；保存；果醬；蜜餞（常用複數）",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101046.jpg",
            "page": 109,
            "sha256": "4da68e6ee600559f778da74cba344592b1cb7d9e0e1c496ce9b00dd92981c3b3",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "preserve vt./n. 保護；保存；果醬；蜜餞（常用複數）",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V067",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "sensePos",
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V067",
        "kind": "vocabulary",
        "displayWord": "prohibit",
        "lexemeRef": "W004676",
        "officialWordId": "W004676",
        "officialSenseId": null,
        "sensePos": "v.",
        "targetMeaningZh": "禁止；阻止",
        "chapterMeaningsZh": "禁止；阻止",
        "sourcePage": 109,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "*",
        "meaningSource": "existing_dictionary",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V067",
        "kind": "vocabulary",
        "displayWord": "prohibit",
        "lexemeRef": "W004676",
        "officialWordId": "W004676",
        "officialSenseId": null,
        "sensePos": "vt.",
        "targetMeaningZh": "禁止",
        "chapterMeaningsZh": "禁止",
        "sourcePage": 109,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "*",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "d280aef858bc9fac3e30f199efbf146c2da5155de50f6ffc345c737f867db9a5",
      "expectedAfterRowSha256": "3811985c87dd04a14ad7c47b819acdc3ee31dc4fd7507b2ac74b25972d86c1c6",
      "fields": {
        "sensePos": "vt.",
        "targetMeaningZh": "禁止",
        "chapterMeaningsZh": "禁止",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "sensePos": [
          {
            "type": "textbook_photo",
            "file": "20260815_101046.jpg",
            "page": 109,
            "sha256": "4da68e6ee600559f778da74cba344592b1cb7d9e0e1c496ce9b00dd92981c3b3",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "prohibit vt. 禁止",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101046.jpg",
            "page": 109,
            "sha256": "4da68e6ee600559f778da74cba344592b1cb7d9e0e1c496ce9b00dd92981c3b3",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "prohibit vt. 禁止",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101046.jpg",
            "page": 109,
            "sha256": "4da68e6ee600559f778da74cba344592b1cb7d9e0e1c496ce9b00dd92981c3b3",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "prohibit vt. 禁止",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101046.jpg",
            "page": 109,
            "sha256": "4da68e6ee600559f778da74cba344592b1cb7d9e0e1c496ce9b00dd92981c3b3",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "prohibit vt. 禁止",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V068",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "sensePos",
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V068",
        "kind": "vocabulary",
        "displayWord": "grudge",
        "lexemeRef": "grudge",
        "officialWordId": null,
        "officialSenseId": null,
        "sensePos": "",
        "targetMeaningZh": "教材補充詞；義項待核對。",
        "chapterMeaningsZh": "教材補充詞；義項待核對。",
        "sourcePage": 110,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "*",
        "meaningSource": "unmapped_supplement",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V068",
        "kind": "vocabulary",
        "displayWord": "grudge",
        "lexemeRef": "grudge",
        "officialWordId": null,
        "officialSenseId": null,
        "sensePos": "n.",
        "targetMeaningZh": "怨恨",
        "chapterMeaningsZh": "怨恨",
        "sourcePage": 110,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "*",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "848dad6dd9c229700bebd595d143254fd4d6eb5ba8c4ac4d3e9333f8c1e083e9",
      "expectedAfterRowSha256": "6d4e72437700a060535935a848bb251d776e0b71c07a472fee42bc4e5e5d16ba",
      "fields": {
        "sensePos": "n.",
        "targetMeaningZh": "怨恨",
        "chapterMeaningsZh": "怨恨",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "sensePos": [
          {
            "type": "textbook_photo",
            "file": "20260815_101056.jpg",
            "page": 110,
            "sha256": "509ee199bff48e08e4a590fa149b34d6d8655a75788ad24aa0d740fff1c198e6",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "grudge n. 怨恨",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101056.jpg",
            "page": 110,
            "sha256": "509ee199bff48e08e4a590fa149b34d6d8655a75788ad24aa0d740fff1c198e6",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "grudge n. 怨恨",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101056.jpg",
            "page": 110,
            "sha256": "509ee199bff48e08e4a590fa149b34d6d8655a75788ad24aa0d740fff1c198e6",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "grudge n. 怨恨",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101056.jpg",
            "page": 110,
            "sha256": "509ee199bff48e08e4a590fa149b34d6d8655a75788ad24aa0d740fff1c198e6",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "grudge n. 怨恨",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V069",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V069",
        "kind": "vocabulary",
        "displayWord": "port",
        "lexemeRef": "W001650",
        "officialWordId": "W001650",
        "officialSenseId": null,
        "sensePos": "n.",
        "targetMeaningZh": "港口；埠；艙門；避風港",
        "chapterMeaningsZh": "港口；埠；艙門；避風港",
        "sourcePage": 110,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "似",
        "meaningSource": "existing_dictionary",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V069",
        "kind": "vocabulary",
        "displayWord": "port",
        "lexemeRef": "W001650",
        "officialWordId": "W001650",
        "officialSenseId": null,
        "sensePos": "n.",
        "targetMeaningZh": "港口",
        "chapterMeaningsZh": "港口",
        "sourcePage": 110,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "似",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "5ba6c15351c10e05899e64f334cc27a8fc4214b18e526a89e15777961f399237",
      "expectedAfterRowSha256": "288e8aa42245e8f9a4d2b180d8e6b44e6e552fd49a8e6c59105eabbbc71d0ef7",
      "fields": {
        "targetMeaningZh": "港口",
        "chapterMeaningsZh": "港口",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101056.jpg",
            "page": 110,
            "sha256": "509ee199bff48e08e4a590fa149b34d6d8655a75788ad24aa0d740fff1c198e6",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "port n. 港口",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101056.jpg",
            "page": 110,
            "sha256": "509ee199bff48e08e4a590fa149b34d6d8655a75788ad24aa0d740fff1c198e6",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "port n. 港口",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101056.jpg",
            "page": 110,
            "sha256": "509ee199bff48e08e4a590fa149b34d6d8655a75788ad24aa0d740fff1c198e6",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "port n. 港口",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V070",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "sensePos",
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V070",
        "kind": "vocabulary",
        "displayWord": "outlaw",
        "lexemeRef": "W005635",
        "officialWordId": "W005635",
        "officialSenseId": null,
        "sensePos": "n./v.",
        "targetMeaningZh": "被剝奪法律保護的人；罪犯；使...失去法律保護；將...逐出社會",
        "chapterMeaningsZh": "被剝奪法律保護的人；罪犯；使...失去法律保護；將...逐出社會",
        "sourcePage": 110,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "*",
        "meaningSource": "existing_dictionary",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V070",
        "kind": "vocabulary",
        "displayWord": "outlaw",
        "lexemeRef": "W005635",
        "officialWordId": "W005635",
        "officialSenseId": null,
        "sensePos": "n.",
        "targetMeaningZh": "亡命之徒",
        "chapterMeaningsZh": "亡命之徒",
        "sourcePage": 110,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "*",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "99ebdc67a3e92c241a844276f2a0e74c0e9661be97feecd58574eabb33141729",
      "expectedAfterRowSha256": "85e96f3499a677f9d130bff7ac8d8239738d51e862cdd751bb141d854b245cd2",
      "fields": {
        "sensePos": "n.",
        "targetMeaningZh": "亡命之徒",
        "chapterMeaningsZh": "亡命之徒",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "sensePos": [
          {
            "type": "textbook_photo",
            "file": "20260815_101056.jpg",
            "page": 110,
            "sha256": "509ee199bff48e08e4a590fa149b34d6d8655a75788ad24aa0d740fff1c198e6",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "outlaw n. 亡命之徒",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101056.jpg",
            "page": 110,
            "sha256": "509ee199bff48e08e4a590fa149b34d6d8655a75788ad24aa0d740fff1c198e6",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "outlaw n. 亡命之徒",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101056.jpg",
            "page": 110,
            "sha256": "509ee199bff48e08e4a590fa149b34d6d8655a75788ad24aa0d740fff1c198e6",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "outlaw n. 亡命之徒",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101056.jpg",
            "page": 110,
            "sha256": "509ee199bff48e08e4a590fa149b34d6d8655a75788ad24aa0d740fff1c198e6",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "outlaw n. 亡命之徒",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V071",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "sensePos",
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V071",
        "kind": "vocabulary",
        "displayWord": "quarrel",
        "lexemeRef": "W003800",
        "officialWordId": "W003800",
        "officialSenseId": null,
        "sensePos": "n./v.",
        "targetMeaningZh": "吵架；反目；怨言；方頭鑿",
        "chapterMeaningsZh": "吵架；反目；怨言；方頭鑿",
        "sourcePage": 110,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "*",
        "meaningSource": "existing_dictionary",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V071",
        "kind": "vocabulary",
        "displayWord": "quarrel",
        "lexemeRef": "W003800",
        "officialWordId": "W003800",
        "officialSenseId": null,
        "sensePos": "vi.",
        "targetMeaningZh": "爭吵",
        "chapterMeaningsZh": "爭吵",
        "sourcePage": 110,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "*",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "a5c005d9eeb7204c8a019af98a0dc5e5a0a6dd6cd95c3a8b197db8eee528dd85",
      "expectedAfterRowSha256": "eac14f728ef6afb2142055bf14890ed62795ca0d2cc82fb84a4fb640e0d2aa98",
      "fields": {
        "sensePos": "vi.",
        "targetMeaningZh": "爭吵",
        "chapterMeaningsZh": "爭吵",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "sensePos": [
          {
            "type": "textbook_photo",
            "file": "20260815_101056.jpg",
            "page": 110,
            "sha256": "509ee199bff48e08e4a590fa149b34d6d8655a75788ad24aa0d740fff1c198e6",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "quarrel vi. 爭吵",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101056.jpg",
            "page": 110,
            "sha256": "509ee199bff48e08e4a590fa149b34d6d8655a75788ad24aa0d740fff1c198e6",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "quarrel vi. 爭吵",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101056.jpg",
            "page": 110,
            "sha256": "509ee199bff48e08e4a590fa149b34d6d8655a75788ad24aa0d740fff1c198e6",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "quarrel vi. 爭吵",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101056.jpg",
            "page": 110,
            "sha256": "509ee199bff48e08e4a590fa149b34d6d8655a75788ad24aa0d740fff1c198e6",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "quarrel vi. 爭吵",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V072",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "sensePos",
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V072",
        "kind": "vocabulary",
        "displayWord": "wharf",
        "lexemeRef": "W005998",
        "officialWordId": "W005998",
        "officialSenseId": null,
        "sensePos": "n./v.",
        "targetMeaningZh": "碼頭；卸在碼頭上；靠碼頭；入塢",
        "chapterMeaningsZh": "碼頭；卸在碼頭上；靠碼頭；入塢",
        "sourcePage": 110,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "似",
        "meaningSource": "existing_dictionary",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V072",
        "kind": "vocabulary",
        "displayWord": "wharf",
        "lexemeRef": "W005998",
        "officialWordId": "W005998",
        "officialSenseId": null,
        "sensePos": "n.",
        "targetMeaningZh": "碼頭",
        "chapterMeaningsZh": "碼頭",
        "sourcePage": 110,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "似",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "d14b3dc90d6387f57dd96d3f2d90126441d317a12441c3e9e9d3581cbba983a9",
      "expectedAfterRowSha256": "54fdc87620eca00c6bd2b8d65f21b5b52446eca1fa6e55ac3f12eef2aa343139",
      "fields": {
        "sensePos": "n.",
        "targetMeaningZh": "碼頭",
        "chapterMeaningsZh": "碼頭",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "sensePos": [
          {
            "type": "textbook_photo",
            "file": "20260815_101056.jpg",
            "page": 110,
            "sha256": "509ee199bff48e08e4a590fa149b34d6d8655a75788ad24aa0d740fff1c198e6",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "wharf n. 碼頭",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101056.jpg",
            "page": 110,
            "sha256": "509ee199bff48e08e4a590fa149b34d6d8655a75788ad24aa0d740fff1c198e6",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "wharf n. 碼頭",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101056.jpg",
            "page": 110,
            "sha256": "509ee199bff48e08e4a590fa149b34d6d8655a75788ad24aa0d740fff1c198e6",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "wharf n. 碼頭",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101056.jpg",
            "page": 110,
            "sha256": "509ee199bff48e08e4a590fa149b34d6d8655a75788ad24aa0d740fff1c198e6",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "wharf n. 碼頭",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V073",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "sensePos",
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V073",
        "kind": "vocabulary",
        "displayWord": "track",
        "lexemeRef": "W001921",
        "officialWordId": "W001921",
        "officialSenseId": null,
        "sensePos": "n./v.",
        "targetMeaningZh": "軌跡；足跡；徑跡；小道",
        "chapterMeaningsZh": "軌跡；足跡；徑跡；小道",
        "sourcePage": 110,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "似",
        "meaningSource": "existing_dictionary",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V073",
        "kind": "vocabulary",
        "displayWord": "track",
        "lexemeRef": "W001921",
        "officialWordId": "W001921",
        "officialSenseId": null,
        "sensePos": "vt.",
        "targetMeaningZh": "跟蹤",
        "chapterMeaningsZh": "跟蹤",
        "sourcePage": 110,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "似",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "616fbc5e5bbd9643e828277963d49e7efe29c951dd1987f5127fe1d7452143fd",
      "expectedAfterRowSha256": "3f23cce171d47beb9ea93b97ab136a117cd3529dec299c186925a230d2e774be",
      "fields": {
        "sensePos": "vt.",
        "targetMeaningZh": "跟蹤",
        "chapterMeaningsZh": "跟蹤",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "sensePos": [
          {
            "type": "textbook_photo",
            "file": "20260815_101056.jpg",
            "page": 110,
            "sha256": "509ee199bff48e08e4a590fa149b34d6d8655a75788ad24aa0d740fff1c198e6",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "track vt. 跟蹤",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101056.jpg",
            "page": 110,
            "sha256": "509ee199bff48e08e4a590fa149b34d6d8655a75788ad24aa0d740fff1c198e6",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "track vt. 跟蹤",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101056.jpg",
            "page": 110,
            "sha256": "509ee199bff48e08e4a590fa149b34d6d8655a75788ad24aa0d740fff1c198e6",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "track vt. 跟蹤",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101056.jpg",
            "page": 110,
            "sha256": "509ee199bff48e08e4a590fa149b34d6d8655a75788ad24aa0d740fff1c198e6",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "track vt. 跟蹤",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V074",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V074",
        "kind": "vocabulary",
        "displayWord": "path",
        "lexemeRef": "W001620",
        "officialWordId": "W001620",
        "officialSenseId": null,
        "sensePos": "n.",
        "targetMeaningZh": "路徑；小路；道路；途徑",
        "chapterMeaningsZh": "路徑；小路；道路；途徑",
        "sourcePage": 110,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "似",
        "meaningSource": "existing_dictionary",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V074",
        "kind": "vocabulary",
        "displayWord": "path",
        "lexemeRef": "W001620",
        "officialWordId": "W001620",
        "officialSenseId": null,
        "sensePos": "n.",
        "targetMeaningZh": "小徑",
        "chapterMeaningsZh": "小徑",
        "sourcePage": 110,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "似",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "9d46d1fc6fac153af87f315fb378d468570390472d5e2f372c25201aa2e1b3c9",
      "expectedAfterRowSha256": "8a92b6f6ee4c7fc2d92deee0e53a0efa62d72e74ab937d63c25ed05d904c9a7a",
      "fields": {
        "targetMeaningZh": "小徑",
        "chapterMeaningsZh": "小徑",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101056.jpg",
            "page": 110,
            "sha256": "509ee199bff48e08e4a590fa149b34d6d8655a75788ad24aa0d740fff1c198e6",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "path n. 小徑",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101056.jpg",
            "page": 110,
            "sha256": "509ee199bff48e08e4a590fa149b34d6d8655a75788ad24aa0d740fff1c198e6",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "path n. 小徑",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101056.jpg",
            "page": 110,
            "sha256": "509ee199bff48e08e4a590fa149b34d6d8655a75788ad24aa0d740fff1c198e6",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "path n. 小徑",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V075",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "sensePos",
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V075",
        "kind": "vocabulary",
        "displayWord": "tug",
        "lexemeRef": "W002941",
        "officialWordId": "W002941",
        "officialSenseId": null,
        "sensePos": "n./v.",
        "targetMeaningZh": "用力拉；拖曳；苦幹；掙扎",
        "chapterMeaningsZh": "用力拉；拖曳；苦幹；掙扎",
        "sourcePage": 110,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "*",
        "meaningSource": "existing_dictionary",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V075",
        "kind": "vocabulary",
        "displayWord": "tug",
        "lexemeRef": "W002941",
        "officialWordId": "W002941",
        "officialSenseId": null,
        "sensePos": "vt.",
        "targetMeaningZh": "拖；拉",
        "chapterMeaningsZh": "拖；拉",
        "sourcePage": 110,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "*",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "98ad59df6d6459f8d19d225fcc7f416eed5c9653993e87ccc75185cee020be14",
      "expectedAfterRowSha256": "37ff2b1050bdcd5529be10c765eeae5f63f0ce0304441d688471eb5a498fd0f3",
      "fields": {
        "sensePos": "vt.",
        "targetMeaningZh": "拖；拉",
        "chapterMeaningsZh": "拖；拉",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "sensePos": [
          {
            "type": "textbook_photo",
            "file": "20260815_101056.jpg",
            "page": 110,
            "sha256": "509ee199bff48e08e4a590fa149b34d6d8655a75788ad24aa0d740fff1c198e6",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "tug vt. 拖；拉",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101056.jpg",
            "page": 110,
            "sha256": "509ee199bff48e08e4a590fa149b34d6d8655a75788ad24aa0d740fff1c198e6",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "tug vt. 拖；拉",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101056.jpg",
            "page": 110,
            "sha256": "509ee199bff48e08e4a590fa149b34d6d8655a75788ad24aa0d740fff1c198e6",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "tug vt. 拖；拉",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101056.jpg",
            "page": 110,
            "sha256": "509ee199bff48e08e4a590fa149b34d6d8655a75788ad24aa0d740fff1c198e6",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "tug vt. 拖；拉",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V076",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "sensePos",
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V076",
        "kind": "vocabulary",
        "displayWord": "foggiest",
        "lexemeRef": "foggiest",
        "officialWordId": null,
        "officialSenseId": null,
        "sensePos": "",
        "targetMeaningZh": "教材補充詞；義項待核對。",
        "chapterMeaningsZh": "教材補充詞；義項待核對。",
        "sourcePage": 110,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "*",
        "meaningSource": "unmapped_supplement",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V076",
        "kind": "vocabulary",
        "displayWord": "foggiest",
        "lexemeRef": "foggiest",
        "officialWordId": null,
        "officialSenseId": null,
        "sensePos": "adj.",
        "targetMeaningZh": "最模糊的",
        "chapterMeaningsZh": "最模糊的",
        "sourcePage": 110,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "*",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "8d910ee3dbb2934dd00c5cc8b841c5754c29ed5486218059daeda4a1b2e2513f",
      "expectedAfterRowSha256": "9a120d125a7bbc3203a14b6173c14cb30dd00d1ecd66967a3b11b04b87f8d187",
      "fields": {
        "sensePos": "adj.",
        "targetMeaningZh": "最模糊的",
        "chapterMeaningsZh": "最模糊的",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "sensePos": [
          {
            "type": "textbook_photo",
            "file": "20260815_101056.jpg",
            "page": 110,
            "sha256": "509ee199bff48e08e4a590fa149b34d6d8655a75788ad24aa0d740fff1c198e6",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "foggiest adj. 最模糊的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101056.jpg",
            "page": 110,
            "sha256": "509ee199bff48e08e4a590fa149b34d6d8655a75788ad24aa0d740fff1c198e6",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "foggiest adj. 最模糊的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101056.jpg",
            "page": 110,
            "sha256": "509ee199bff48e08e4a590fa149b34d6d8655a75788ad24aa0d740fff1c198e6",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "foggiest adj. 最模糊的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101056.jpg",
            "page": 110,
            "sha256": "509ee199bff48e08e4a590fa149b34d6d8655a75788ad24aa0d740fff1c198e6",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "foggiest adj. 最模糊的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V077",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "sensePos",
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V077",
        "kind": "vocabulary",
        "displayWord": "track",
        "lexemeRef": "W001921",
        "officialWordId": "W001921",
        "officialSenseId": null,
        "sensePos": "n./v.",
        "targetMeaningZh": "軌跡；足跡；徑跡；小道",
        "chapterMeaningsZh": "軌跡；足跡；徑跡；小道",
        "sourcePage": 111,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "比",
        "meaningSource": "existing_dictionary",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V077",
        "kind": "vocabulary",
        "displayWord": "track",
        "lexemeRef": "W001921",
        "officialWordId": "W001921",
        "officialSenseId": null,
        "sensePos": "vt./n.",
        "targetMeaningZh": "追蹤；小徑；軌道",
        "chapterMeaningsZh": "追蹤；小徑；軌道",
        "sourcePage": 111,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "比",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "1929110e78a9f439012bb762a8cfdb57cec38a232617f51cccd0c0648847c1f4",
      "expectedAfterRowSha256": "83072499471e17c01d29a7c8c6a694f238aaff83ebe8d5ccf433a9afc860c82e",
      "fields": {
        "sensePos": "vt./n.",
        "targetMeaningZh": "追蹤；小徑；軌道",
        "chapterMeaningsZh": "追蹤；小徑；軌道",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "sensePos": [
          {
            "type": "textbook_photo",
            "file": "20260815_101059.jpg",
            "page": 111,
            "sha256": "9d7e7ff74bc09809e7bf4f746b1b8cd071c6fd42ab1397ee8fbbb8b977e84eaf",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "track vt./n. 追蹤；小徑；軌道",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101059.jpg",
            "page": 111,
            "sha256": "9d7e7ff74bc09809e7bf4f746b1b8cd071c6fd42ab1397ee8fbbb8b977e84eaf",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "track vt./n. 追蹤；小徑；軌道",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101059.jpg",
            "page": 111,
            "sha256": "9d7e7ff74bc09809e7bf4f746b1b8cd071c6fd42ab1397ee8fbbb8b977e84eaf",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "track vt./n. 追蹤；小徑；軌道",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101059.jpg",
            "page": 111,
            "sha256": "9d7e7ff74bc09809e7bf4f746b1b8cd071c6fd42ab1397ee8fbbb8b977e84eaf",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "track vt./n. 追蹤；小徑；軌道",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V078",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V078",
        "kind": "vocabulary",
        "displayWord": "ancestor",
        "lexemeRef": "W003046",
        "officialWordId": "W003046",
        "officialSenseId": null,
        "sensePos": "n.",
        "targetMeaningZh": "祖先；祖宗",
        "chapterMeaningsZh": "祖先；祖宗",
        "sourcePage": 111,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "*",
        "meaningSource": "existing_dictionary",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V078",
        "kind": "vocabulary",
        "displayWord": "ancestor",
        "lexemeRef": "W003046",
        "officialWordId": "W003046",
        "officialSenseId": null,
        "sensePos": "n.",
        "targetMeaningZh": "祖先",
        "chapterMeaningsZh": "祖先",
        "sourcePage": 111,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "*",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "5547294f4b361c2c069486c62ad5b642ab1b6630153b84fadb319dc1110d7427",
      "expectedAfterRowSha256": "af0347085a9c2cba39bab3a10b6c67447c837de74679d67630f50b6e8c784efe",
      "fields": {
        "targetMeaningZh": "祖先",
        "chapterMeaningsZh": "祖先",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101059.jpg",
            "page": 111,
            "sha256": "9d7e7ff74bc09809e7bf4f746b1b8cd071c6fd42ab1397ee8fbbb8b977e84eaf",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "ancestor n. 祖先",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101059.jpg",
            "page": 111,
            "sha256": "9d7e7ff74bc09809e7bf4f746b1b8cd071c6fd42ab1397ee8fbbb8b977e84eaf",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "ancestor n. 祖先",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101059.jpg",
            "page": 111,
            "sha256": "9d7e7ff74bc09809e7bf4f746b1b8cd071c6fd42ab1397ee8fbbb8b977e84eaf",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "ancestor n. 祖先",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V079",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "sensePos",
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V079",
        "kind": "vocabulary",
        "displayWord": "lean",
        "lexemeRef": "W003588",
        "officialWordId": "W003588",
        "officialSenseId": null,
        "sensePos": "v./adj.",
        "targetMeaningZh": "瘦肉；傾斜；傾斜度；瘦的",
        "chapterMeaningsZh": "瘦肉；傾斜；傾斜度；瘦的",
        "sourcePage": 111,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "*",
        "meaningSource": "existing_dictionary",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V079",
        "kind": "vocabulary",
        "displayWord": "lean",
        "lexemeRef": "W003588",
        "officialWordId": "W003588",
        "officialSenseId": null,
        "sensePos": "vi.",
        "targetMeaningZh": "倚；靠",
        "chapterMeaningsZh": "倚；靠",
        "sourcePage": 111,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "*",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "f025da5d96739f2257886023fe3fe9813b21d98a0e82e8985f8c7a1586a5fa19",
      "expectedAfterRowSha256": "d23b88b69d424100606fc32ec2235ff711195368a0928b9d401de28b931ab6ae",
      "fields": {
        "sensePos": "vi.",
        "targetMeaningZh": "倚；靠",
        "chapterMeaningsZh": "倚；靠",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "sensePos": [
          {
            "type": "textbook_photo",
            "file": "20260815_101059.jpg",
            "page": 111,
            "sha256": "9d7e7ff74bc09809e7bf4f746b1b8cd071c6fd42ab1397ee8fbbb8b977e84eaf",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "lean vi. 倚；靠",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101059.jpg",
            "page": 111,
            "sha256": "9d7e7ff74bc09809e7bf4f746b1b8cd071c6fd42ab1397ee8fbbb8b977e84eaf",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "lean vi. 倚；靠",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101059.jpg",
            "page": 111,
            "sha256": "9d7e7ff74bc09809e7bf4f746b1b8cd071c6fd42ab1397ee8fbbb8b977e84eaf",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "lean vi. 倚；靠",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101059.jpg",
            "page": 111,
            "sha256": "9d7e7ff74bc09809e7bf4f746b1b8cd071c6fd42ab1397ee8fbbb8b977e84eaf",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "lean vi. 倚；靠",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V080",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "sensePos",
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V080",
        "kind": "vocabulary",
        "displayWord": "progressively",
        "lexemeRef": "progressively",
        "officialWordId": null,
        "officialSenseId": null,
        "sensePos": "",
        "targetMeaningZh": "教材補充詞；義項待核對。",
        "chapterMeaningsZh": "教材補充詞；義項待核對。",
        "sourcePage": 111,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "似",
        "meaningSource": "unmapped_supplement",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V080",
        "kind": "vocabulary",
        "displayWord": "progressively",
        "lexemeRef": "progressively",
        "officialWordId": null,
        "officialSenseId": null,
        "sensePos": "adv.",
        "targetMeaningZh": "不斷地",
        "chapterMeaningsZh": "不斷地",
        "sourcePage": 111,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "似",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "bcc5749a0464ba51147e18c3a7290b9ccf3520319691e8410b97470aaa7284bc",
      "expectedAfterRowSha256": "02a21ea06d60a87aff92cdde0117c372d3b4ae243f74ecf49a7e98ceeb0e4851",
      "fields": {
        "sensePos": "adv.",
        "targetMeaningZh": "不斷地",
        "chapterMeaningsZh": "不斷地",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "sensePos": [
          {
            "type": "textbook_photo",
            "file": "20260815_101059.jpg",
            "page": 111,
            "sha256": "9d7e7ff74bc09809e7bf4f746b1b8cd071c6fd42ab1397ee8fbbb8b977e84eaf",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "progressively adv. 不斷地",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101059.jpg",
            "page": 111,
            "sha256": "9d7e7ff74bc09809e7bf4f746b1b8cd071c6fd42ab1397ee8fbbb8b977e84eaf",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "progressively adv. 不斷地",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101059.jpg",
            "page": 111,
            "sha256": "9d7e7ff74bc09809e7bf4f746b1b8cd071c6fd42ab1397ee8fbbb8b977e84eaf",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "progressively adv. 不斷地",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101059.jpg",
            "page": 111,
            "sha256": "9d7e7ff74bc09809e7bf4f746b1b8cd071c6fd42ab1397ee8fbbb8b977e84eaf",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "progressively adv. 不斷地",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V081",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "sensePos",
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V081",
        "kind": "vocabulary",
        "displayWord": "gradually",
        "lexemeRef": "gradually",
        "officialWordId": null,
        "officialSenseId": null,
        "sensePos": "",
        "targetMeaningZh": "教材補充詞；義項待核對。",
        "chapterMeaningsZh": "教材補充詞；義項待核對。",
        "sourcePage": 111,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "似",
        "meaningSource": "unmapped_supplement",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V081",
        "kind": "vocabulary",
        "displayWord": "gradually",
        "lexemeRef": "gradually",
        "officialWordId": null,
        "officialSenseId": null,
        "sensePos": "adv.",
        "targetMeaningZh": "漸漸地",
        "chapterMeaningsZh": "漸漸地",
        "sourcePage": 111,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "似",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "2ca898412368ecc52d49859d77e77b8e7edd65ce5d091ed2813b211d2378ad74",
      "expectedAfterRowSha256": "859086065f56722185bacffd7da43e9dcdd0f49184100fe09c385e6f9f6480ca",
      "fields": {
        "sensePos": "adv.",
        "targetMeaningZh": "漸漸地",
        "chapterMeaningsZh": "漸漸地",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "sensePos": [
          {
            "type": "textbook_photo",
            "file": "20260815_101059.jpg",
            "page": 111,
            "sha256": "9d7e7ff74bc09809e7bf4f746b1b8cd071c6fd42ab1397ee8fbbb8b977e84eaf",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "gradually adv. 漸漸地",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101059.jpg",
            "page": 111,
            "sha256": "9d7e7ff74bc09809e7bf4f746b1b8cd071c6fd42ab1397ee8fbbb8b977e84eaf",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "gradually adv. 漸漸地",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101059.jpg",
            "page": 111,
            "sha256": "9d7e7ff74bc09809e7bf4f746b1b8cd071c6fd42ab1397ee8fbbb8b977e84eaf",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "gradually adv. 漸漸地",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101059.jpg",
            "page": 111,
            "sha256": "9d7e7ff74bc09809e7bf4f746b1b8cd071c6fd42ab1397ee8fbbb8b977e84eaf",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "gradually adv. 漸漸地",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V082",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V082",
        "kind": "vocabulary",
        "displayWord": "critical",
        "lexemeRef": "W003243",
        "officialWordId": "W003243",
        "officialSenseId": null,
        "sensePos": "adj.",
        "targetMeaningZh": "批評的；決定性的；危險的；臨界的",
        "chapterMeaningsZh": "批評的；決定性的；危險的；臨界的",
        "sourcePage": 112,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "*",
        "meaningSource": "existing_dictionary",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V082",
        "kind": "vocabulary",
        "displayWord": "critical",
        "lexemeRef": "W003243",
        "officialWordId": "W003243",
        "officialSenseId": null,
        "sensePos": "adj.",
        "targetMeaningZh": "危急的",
        "chapterMeaningsZh": "危急的",
        "sourcePage": 112,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "*",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "03ef147584256a6fabf336d087b4e38d2d760e7097c12707c19670406783d98a",
      "expectedAfterRowSha256": "fd9656aca1e39b2dbb75b1955b568d104bf7eba596f4a2d3a0d5485a88dece4b",
      "fields": {
        "targetMeaningZh": "危急的",
        "chapterMeaningsZh": "危急的",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101110.jpg",
            "page": 112,
            "sha256": "f465aa4501b701ba249c53556cf681d2be3f1d1f28a3656f31b6da8910201bf9",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "critical adj. 危急的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101110.jpg",
            "page": 112,
            "sha256": "f465aa4501b701ba249c53556cf681d2be3f1d1f28a3656f31b6da8910201bf9",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "critical adj. 危急的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101110.jpg",
            "page": 112,
            "sha256": "f465aa4501b701ba249c53556cf681d2be3f1d1f28a3656f31b6da8910201bf9",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "critical adj. 危急的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V083",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "sensePos",
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V083",
        "kind": "vocabulary",
        "displayWord": "stabilize",
        "lexemeRef": "W005864",
        "officialWordId": "W005864",
        "officialSenseId": null,
        "sensePos": "v.",
        "targetMeaningZh": "使安定；使穩固；穩定；安定",
        "chapterMeaningsZh": "使安定；使穩固；穩定；安定",
        "sourcePage": 112,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "衍",
        "meaningSource": "existing_dictionary",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V083",
        "kind": "vocabulary",
        "displayWord": "stabilize",
        "lexemeRef": "W005864",
        "officialWordId": "W005864",
        "officialSenseId": null,
        "sensePos": "vt.",
        "targetMeaningZh": "使穩定",
        "chapterMeaningsZh": "使穩定",
        "sourcePage": 112,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "衍",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "5d1a349135b2dd941af9fd7b6e8ace548e8682ba1c38b2a8445214bdceb5de74",
      "expectedAfterRowSha256": "6915dc3643fee242cb7962d1410780c06fe53bf4d55f373556cd856568b479a8",
      "fields": {
        "sensePos": "vt.",
        "targetMeaningZh": "使穩定",
        "chapterMeaningsZh": "使穩定",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "sensePos": [
          {
            "type": "textbook_photo",
            "file": "20260815_101110.jpg",
            "page": 112,
            "sha256": "f465aa4501b701ba249c53556cf681d2be3f1d1f28a3656f31b6da8910201bf9",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "stabilize vt. 使穩定",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101110.jpg",
            "page": 112,
            "sha256": "f465aa4501b701ba249c53556cf681d2be3f1d1f28a3656f31b6da8910201bf9",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "stabilize vt. 使穩定",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101110.jpg",
            "page": 112,
            "sha256": "f465aa4501b701ba249c53556cf681d2be3f1d1f28a3656f31b6da8910201bf9",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "stabilize vt. 使穩定",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101110.jpg",
            "page": 112,
            "sha256": "f465aa4501b701ba249c53556cf681d2be3f1d1f28a3656f31b6da8910201bf9",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "stabilize vt. 使穩定",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V084",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "sensePos",
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V084",
        "kind": "vocabulary",
        "displayWord": "injure",
        "lexemeRef": "W003538",
        "officialWordId": "W003538",
        "officialSenseId": null,
        "sensePos": "v.",
        "targetMeaningZh": "傷害；損害；使受冤屈；損傷",
        "chapterMeaningsZh": "傷害；損害；使受冤屈；損傷",
        "sourcePage": 112,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "衍",
        "meaningSource": "existing_dictionary",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V084",
        "kind": "vocabulary",
        "displayWord": "injure",
        "lexemeRef": "W003538",
        "officialWordId": "W003538",
        "officialSenseId": null,
        "sensePos": "vt.",
        "targetMeaningZh": "使受傷",
        "chapterMeaningsZh": "使受傷",
        "sourcePage": 112,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "衍",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "654e9000f9dd3fbe4eff83bbb1c80f3595de1ba2a875938e984b6016ca880653",
      "expectedAfterRowSha256": "11d281017199a41e14e8183b2853b5591d649c8ca2373fbe76691b960391d722",
      "fields": {
        "sensePos": "vt.",
        "targetMeaningZh": "使受傷",
        "chapterMeaningsZh": "使受傷",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "sensePos": [
          {
            "type": "textbook_photo",
            "file": "20260815_101110.jpg",
            "page": 112,
            "sha256": "f465aa4501b701ba249c53556cf681d2be3f1d1f28a3656f31b6da8910201bf9",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "injure vt. 使受傷",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101110.jpg",
            "page": 112,
            "sha256": "f465aa4501b701ba249c53556cf681d2be3f1d1f28a3656f31b6da8910201bf9",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "injure vt. 使受傷",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101110.jpg",
            "page": 112,
            "sha256": "f465aa4501b701ba249c53556cf681d2be3f1d1f28a3656f31b6da8910201bf9",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "injure vt. 使受傷",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101110.jpg",
            "page": 112,
            "sha256": "f465aa4501b701ba249c53556cf681d2be3f1d1f28a3656f31b6da8910201bf9",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "injure vt. 使受傷",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V085",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V085",
        "kind": "vocabulary",
        "displayWord": "scandal",
        "lexemeRef": "W004762",
        "officialWordId": "W004762",
        "officialSenseId": null,
        "sensePos": "n.",
        "targetMeaningZh": "醜聞；中傷；恥辱；反感",
        "chapterMeaningsZh": "醜聞；中傷；恥辱；反感",
        "sourcePage": 112,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "*",
        "meaningSource": "existing_dictionary",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V085",
        "kind": "vocabulary",
        "displayWord": "scandal",
        "lexemeRef": "W004762",
        "officialWordId": "W004762",
        "officialSenseId": null,
        "sensePos": "n.",
        "targetMeaningZh": "醜聞",
        "chapterMeaningsZh": "醜聞",
        "sourcePage": 112,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "*",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "373d69470eaf00b8ed5f5806873a446def05059c27e86b2dd74f7216b39e5f88",
      "expectedAfterRowSha256": "ad8b307c32b29c07dda89ea31c06d7f84613a1d27205b8da66b329078d21627e",
      "fields": {
        "targetMeaningZh": "醜聞",
        "chapterMeaningsZh": "醜聞",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101110.jpg",
            "page": 112,
            "sha256": "f465aa4501b701ba249c53556cf681d2be3f1d1f28a3656f31b6da8910201bf9",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "scandal n. 醜聞",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101110.jpg",
            "page": 112,
            "sha256": "f465aa4501b701ba249c53556cf681d2be3f1d1f28a3656f31b6da8910201bf9",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "scandal n. 醜聞",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101110.jpg",
            "page": 112,
            "sha256": "f465aa4501b701ba249c53556cf681d2be3f1d1f28a3656f31b6da8910201bf9",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "scandal n. 醜聞",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V086",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V086",
        "kind": "vocabulary",
        "displayWord": "reputation",
        "lexemeRef": "W003841",
        "officialWordId": "W003841",
        "officialSenseId": null,
        "sensePos": "n.",
        "targetMeaningZh": "名譽；名聲；聲望；公認證據",
        "chapterMeaningsZh": "名譽；名聲；聲望；公認證據",
        "sourcePage": 112,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "*",
        "meaningSource": "existing_dictionary",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V086",
        "kind": "vocabulary",
        "displayWord": "reputation",
        "lexemeRef": "W003841",
        "officialWordId": "W003841",
        "officialSenseId": null,
        "sensePos": "n.",
        "targetMeaningZh": "名譽；名聲",
        "chapterMeaningsZh": "名譽；名聲",
        "sourcePage": 112,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "*",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "832d106a19a584f7b6bd0e8082e1954277cec3281480d5ea242082669ad3eefc",
      "expectedAfterRowSha256": "38b4f5f9f4623c35d856d25e4cab09ef5cb1af3c9aba63b9b103a668c9c9ecd1",
      "fields": {
        "targetMeaningZh": "名譽；名聲",
        "chapterMeaningsZh": "名譽；名聲",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101110.jpg",
            "page": 112,
            "sha256": "f465aa4501b701ba249c53556cf681d2be3f1d1f28a3656f31b6da8910201bf9",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "reputation n. 名譽；名聲",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101110.jpg",
            "page": 112,
            "sha256": "f465aa4501b701ba249c53556cf681d2be3f1d1f28a3656f31b6da8910201bf9",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "reputation n. 名譽；名聲",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101110.jpg",
            "page": 112,
            "sha256": "f465aa4501b701ba249c53556cf681d2be3f1d1f28a3656f31b6da8910201bf9",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "reputation n. 名譽；名聲",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V087",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "sensePos",
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V087",
        "kind": "vocabulary",
        "displayWord": "deal",
        "lexemeRef": "W000216",
        "officialWordId": "W000216",
        "officialSenseId": null,
        "sensePos": "n./v.",
        "targetMeaningZh": "交易；協定；數量；買賣",
        "chapterMeaningsZh": "交易；協定；數量；買賣",
        "sourcePage": 112,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "衍",
        "meaningSource": "existing_dictionary",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V087",
        "kind": "vocabulary",
        "displayWord": "deal",
        "lexemeRef": "W000216",
        "officialWordId": "W000216",
        "officialSenseId": null,
        "sensePos": "vi./n.",
        "targetMeaningZh": "交易",
        "chapterMeaningsZh": "交易",
        "sourcePage": 112,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "衍",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "933ef26593e639368eb47fe758ef5ebf172db09503b0bb9d69711ab9b20647a0",
      "expectedAfterRowSha256": "5e559c4815f1a2b393a748e506ef577b9b5eb2dc713b35b18939ec5a730168e0",
      "fields": {
        "sensePos": "vi./n.",
        "targetMeaningZh": "交易",
        "chapterMeaningsZh": "交易",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "sensePos": [
          {
            "type": "textbook_photo",
            "file": "20260815_101110.jpg",
            "page": 112,
            "sha256": "f465aa4501b701ba249c53556cf681d2be3f1d1f28a3656f31b6da8910201bf9",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "deal vi./n. 交易",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101110.jpg",
            "page": 112,
            "sha256": "f465aa4501b701ba249c53556cf681d2be3f1d1f28a3656f31b6da8910201bf9",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "deal vi./n. 交易",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101110.jpg",
            "page": 112,
            "sha256": "f465aa4501b701ba249c53556cf681d2be3f1d1f28a3656f31b6da8910201bf9",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "deal vi./n. 交易",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101110.jpg",
            "page": 112,
            "sha256": "f465aa4501b701ba249c53556cf681d2be3f1d1f28a3656f31b6da8910201bf9",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "deal vi./n. 交易",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V088",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V088",
        "kind": "vocabulary",
        "displayWord": "merchant",
        "lexemeRef": "W003633",
        "officialWordId": "W003633",
        "officialSenseId": null,
        "sensePos": "n.",
        "targetMeaningZh": "商人；店主；商業的；商人的",
        "chapterMeaningsZh": "商人；店主；商業的；商人的",
        "sourcePage": 112,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "似",
        "meaningSource": "existing_dictionary",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V088",
        "kind": "vocabulary",
        "displayWord": "merchant",
        "lexemeRef": "W003633",
        "officialWordId": "W003633",
        "officialSenseId": null,
        "sensePos": "n.",
        "targetMeaningZh": "商人",
        "chapterMeaningsZh": "商人",
        "sourcePage": 112,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "似",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "ae1ac8f3650eeb8c6cfc55e73628e5680fad40d545da4f55c11ec2f7c72d4184",
      "expectedAfterRowSha256": "462b2fe3dbf3f24681b1e511d067ba24bac243fd59f99cc6543edb36327ff835",
      "fields": {
        "targetMeaningZh": "商人",
        "chapterMeaningsZh": "商人",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101110.jpg",
            "page": 112,
            "sha256": "f465aa4501b701ba249c53556cf681d2be3f1d1f28a3656f31b6da8910201bf9",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "merchant n. 商人",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101110.jpg",
            "page": 112,
            "sha256": "f465aa4501b701ba249c53556cf681d2be3f1d1f28a3656f31b6da8910201bf9",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "merchant n. 商人",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101110.jpg",
            "page": 112,
            "sha256": "f465aa4501b701ba249c53556cf681d2be3f1d1f28a3656f31b6da8910201bf9",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "merchant n. 商人",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V089",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "sensePos",
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V089",
        "kind": "vocabulary",
        "displayWord": "antique",
        "lexemeRef": "W004055",
        "officialWordId": "W004055",
        "officialSenseId": null,
        "sensePos": "adj./n.",
        "targetMeaningZh": "古董；古物；古老的；古風的",
        "chapterMeaningsZh": "古董；古物；古老的；古風的",
        "sourcePage": 112,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "*",
        "meaningSource": "existing_dictionary",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V089",
        "kind": "vocabulary",
        "displayWord": "antique",
        "lexemeRef": "W004055",
        "officialWordId": "W004055",
        "officialSenseId": null,
        "sensePos": "n.",
        "targetMeaningZh": "古董；古玩",
        "chapterMeaningsZh": "古董；古玩",
        "sourcePage": 112,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "*",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "e7db23621bf7faf28108427de7604030a151f165fa12a0b6f0762b85df334b90",
      "expectedAfterRowSha256": "5ba775cec9645c512df654ab8963be73de8181733ace8ffefed1b0bec3e29a7b",
      "fields": {
        "sensePos": "n.",
        "targetMeaningZh": "古董；古玩",
        "chapterMeaningsZh": "古董；古玩",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "sensePos": [
          {
            "type": "textbook_photo",
            "file": "20260815_101110.jpg",
            "page": 112,
            "sha256": "f465aa4501b701ba249c53556cf681d2be3f1d1f28a3656f31b6da8910201bf9",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "antique n. 古董；古玩",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101110.jpg",
            "page": 112,
            "sha256": "f465aa4501b701ba249c53556cf681d2be3f1d1f28a3656f31b6da8910201bf9",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "antique n. 古董；古玩",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101110.jpg",
            "page": 112,
            "sha256": "f465aa4501b701ba249c53556cf681d2be3f1d1f28a3656f31b6da8910201bf9",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "antique n. 古董；古玩",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101110.jpg",
            "page": 112,
            "sha256": "f465aa4501b701ba249c53556cf681d2be3f1d1f28a3656f31b6da8910201bf9",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "antique n. 古董；古玩",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V090",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "sensePos",
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V090",
        "kind": "vocabulary",
        "displayWord": "trade",
        "lexemeRef": "W001922",
        "officialWordId": "W001922",
        "officialSenseId": null,
        "sensePos": "n./v.",
        "targetMeaningZh": "貿易；商業；交易；生意",
        "chapterMeaningsZh": "貿易；商業；交易；生意",
        "sourcePage": 112,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "衍",
        "meaningSource": "existing_dictionary",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V090",
        "kind": "vocabulary",
        "displayWord": "trade",
        "lexemeRef": "W001922",
        "officialWordId": "W001922",
        "officialSenseId": null,
        "sensePos": "n.",
        "targetMeaningZh": "交易",
        "chapterMeaningsZh": "交易",
        "sourcePage": 112,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "衍",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "73c3c5f278717a9dcc0837ce5bddb362da2636324245f13f1d7c095031c38348",
      "expectedAfterRowSha256": "e2130941cc147254f2ee3dc21aa3f0ab570f1a21e3d699c7c801254db6c7947d",
      "fields": {
        "sensePos": "n.",
        "targetMeaningZh": "交易",
        "chapterMeaningsZh": "交易",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "sensePos": [
          {
            "type": "textbook_photo",
            "file": "20260815_101110.jpg",
            "page": 112,
            "sha256": "f465aa4501b701ba249c53556cf681d2be3f1d1f28a3656f31b6da8910201bf9",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "trade n. 交易",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101110.jpg",
            "page": 112,
            "sha256": "f465aa4501b701ba249c53556cf681d2be3f1d1f28a3656f31b6da8910201bf9",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "trade n. 交易",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101110.jpg",
            "page": 112,
            "sha256": "f465aa4501b701ba249c53556cf681d2be3f1d1f28a3656f31b6da8910201bf9",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "trade n. 交易",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101110.jpg",
            "page": 112,
            "sha256": "f465aa4501b701ba249c53556cf681d2be3f1d1f28a3656f31b6da8910201bf9",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "trade n. 交易",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V091",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V091",
        "kind": "vocabulary",
        "displayWord": "admirable",
        "lexemeRef": "W003028",
        "officialWordId": "W003028",
        "officialSenseId": null,
        "sensePos": "adj.",
        "targetMeaningZh": "可欽佩的；極好的；令人驚奇的",
        "chapterMeaningsZh": "可欽佩的；極好的；令人驚奇的",
        "sourcePage": 112,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "衍",
        "meaningSource": "existing_dictionary",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V091",
        "kind": "vocabulary",
        "displayWord": "admirable",
        "lexemeRef": "W003028",
        "officialWordId": "W003028",
        "officialSenseId": null,
        "sensePos": "adj.",
        "targetMeaningZh": "值得讚賞的",
        "chapterMeaningsZh": "值得讚賞的",
        "sourcePage": 112,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "衍",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "312a7e5c715310d62c296811e028fa4349e86b076caa8bf66f5245ffae677a3c",
      "expectedAfterRowSha256": "a181b28b8dcd5aa9369ebda081910aff1af99e0bb2a6ad6f01e57fb4776f3731",
      "fields": {
        "targetMeaningZh": "值得讚賞的",
        "chapterMeaningsZh": "值得讚賞的",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101110.jpg",
            "page": 112,
            "sha256": "f465aa4501b701ba249c53556cf681d2be3f1d1f28a3656f31b6da8910201bf9",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "admirable adj. 值得讚賞的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101110.jpg",
            "page": 112,
            "sha256": "f465aa4501b701ba249c53556cf681d2be3f1d1f28a3656f31b6da8910201bf9",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "admirable adj. 值得讚賞的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101110.jpg",
            "page": 112,
            "sha256": "f465aa4501b701ba249c53556cf681d2be3f1d1f28a3656f31b6da8910201bf9",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "admirable adj. 值得讚賞的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V092",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V092",
        "kind": "vocabulary",
        "displayWord": "admiration",
        "lexemeRef": "W003029",
        "officialWordId": "W003029",
        "officialSenseId": null,
        "sensePos": "n.",
        "targetMeaningZh": "讚賞；欽佩；引人讚賞的對象",
        "chapterMeaningsZh": "讚賞；欽佩；引人讚賞的對象",
        "sourcePage": 112,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "衍",
        "meaningSource": "existing_dictionary",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V092",
        "kind": "vocabulary",
        "displayWord": "admiration",
        "lexemeRef": "W003029",
        "officialWordId": "W003029",
        "officialSenseId": null,
        "sensePos": "n.",
        "targetMeaningZh": "欽佩；羨慕",
        "chapterMeaningsZh": "欽佩；羨慕",
        "sourcePage": 112,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "衍",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "65ba1d71c56993f09a18c7d726e2b77126c42e5a120f3f14bd9c60f5414c5272",
      "expectedAfterRowSha256": "9eb084fa784ccc6b451f0eaaef5fc6e2d031ec87d18117c8dfc0b43db43eff38",
      "fields": {
        "targetMeaningZh": "欽佩；羨慕",
        "chapterMeaningsZh": "欽佩；羨慕",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101110.jpg",
            "page": 112,
            "sha256": "f465aa4501b701ba249c53556cf681d2be3f1d1f28a3656f31b6da8910201bf9",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "admiration n. 欽佩；羨慕",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101110.jpg",
            "page": 112,
            "sha256": "f465aa4501b701ba249c53556cf681d2be3f1d1f28a3656f31b6da8910201bf9",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "admiration n. 欽佩；羨慕",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101110.jpg",
            "page": 112,
            "sha256": "f465aa4501b701ba249c53556cf681d2be3f1d1f28a3656f31b6da8910201bf9",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "admiration n. 欽佩；羨慕",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V093",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V093",
        "kind": "vocabulary",
        "displayWord": "proficiency",
        "lexemeRef": "W005710",
        "officialWordId": "W005710",
        "officialSenseId": null,
        "sensePos": "n.",
        "targetMeaningZh": "精通；熟練；精練",
        "chapterMeaningsZh": "精通；熟練；精練",
        "sourcePage": 112,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "*",
        "meaningSource": "existing_dictionary",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V093",
        "kind": "vocabulary",
        "displayWord": "proficiency",
        "lexemeRef": "W005710",
        "officialWordId": "W005710",
        "officialSenseId": null,
        "sensePos": "n.",
        "targetMeaningZh": "精通",
        "chapterMeaningsZh": "精通",
        "sourcePage": 112,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "*",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "e301a7c1d1b7c2824e031ad42463617d4eea52bda1fe3ba7216cd48bb435238c",
      "expectedAfterRowSha256": "eca912c5e50be2180e68ab5c510ca1165a2b1e812dbf65f444726f0623c71e0e",
      "fields": {
        "targetMeaningZh": "精通",
        "chapterMeaningsZh": "精通",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101110.jpg",
            "page": 112,
            "sha256": "f465aa4501b701ba249c53556cf681d2be3f1d1f28a3656f31b6da8910201bf9",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "proficiency n. 精通",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101110.jpg",
            "page": 112,
            "sha256": "f465aa4501b701ba249c53556cf681d2be3f1d1f28a3656f31b6da8910201bf9",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "proficiency n. 精通",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101110.jpg",
            "page": 112,
            "sha256": "f465aa4501b701ba249c53556cf681d2be3f1d1f28a3656f31b6da8910201bf9",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "proficiency n. 精通",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V094",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "sensePos",
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V094",
        "kind": "vocabulary",
        "displayWord": "appreciate",
        "lexemeRef": "W001044",
        "officialWordId": "W001044",
        "officialSenseId": null,
        "sensePos": "v.",
        "targetMeaningZh": "賞識；鑑別；爲...而感激；領會",
        "chapterMeaningsZh": "賞識；鑑別；爲...而感激；領會",
        "sourcePage": 113,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "似",
        "meaningSource": "existing_dictionary",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V094",
        "kind": "vocabulary",
        "displayWord": "appreciate",
        "lexemeRef": "W001044",
        "officialWordId": "W001044",
        "officialSenseId": null,
        "sensePos": "vt.",
        "targetMeaningZh": "欣賞",
        "chapterMeaningsZh": "欣賞",
        "sourcePage": 113,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "似",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "6acb18ab9d177e1cdd10e3af19907da683247a1c5dc0998dcdfb7431a6c93a06",
      "expectedAfterRowSha256": "decbbc0a5d1829d48a66504aba17223f3a4da69d12056ba6021fac1de846159a",
      "fields": {
        "sensePos": "vt.",
        "targetMeaningZh": "欣賞",
        "chapterMeaningsZh": "欣賞",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "sensePos": [
          {
            "type": "textbook_photo",
            "file": "20260815_101115.jpg",
            "page": 113,
            "sha256": "20a53277f9db8df4f0ea2da5f7734a3cb328532e1925fc716eec84a9d24aaec6",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "appreciate vt. 欣賞",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101115.jpg",
            "page": 113,
            "sha256": "20a53277f9db8df4f0ea2da5f7734a3cb328532e1925fc716eec84a9d24aaec6",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "appreciate vt. 欣賞",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101115.jpg",
            "page": 113,
            "sha256": "20a53277f9db8df4f0ea2da5f7734a3cb328532e1925fc716eec84a9d24aaec6",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "appreciate vt. 欣賞",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101115.jpg",
            "page": 113,
            "sha256": "20a53277f9db8df4f0ea2da5f7734a3cb328532e1925fc716eec84a9d24aaec6",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "appreciate vt. 欣賞",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V095",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V095",
        "kind": "vocabulary",
        "displayWord": "cliff",
        "lexemeRef": "W003156",
        "officialWordId": "W003156",
        "officialSenseId": null,
        "sensePos": "n.",
        "targetMeaningZh": "懸崖；絕壁",
        "chapterMeaningsZh": "懸崖；絕壁",
        "sourcePage": 113,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "*",
        "meaningSource": "existing_dictionary",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V095",
        "kind": "vocabulary",
        "displayWord": "cliff",
        "lexemeRef": "W003156",
        "officialWordId": "W003156",
        "officialSenseId": null,
        "sensePos": "n.",
        "targetMeaningZh": "懸崖",
        "chapterMeaningsZh": "懸崖",
        "sourcePage": 113,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "*",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "0005f2c6c342ee2fc393b84ffffb0d35f2f7c191172a2f79c5812f830989e8b7",
      "expectedAfterRowSha256": "389f92dcd470c377e0860e9dfac7978f40ffba2f2a23a817415cf07ea96b38d9",
      "fields": {
        "targetMeaningZh": "懸崖",
        "chapterMeaningsZh": "懸崖",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101115.jpg",
            "page": 113,
            "sha256": "20a53277f9db8df4f0ea2da5f7734a3cb328532e1925fc716eec84a9d24aaec6",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "cliff n. 懸崖",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101115.jpg",
            "page": 113,
            "sha256": "20a53277f9db8df4f0ea2da5f7734a3cb328532e1925fc716eec84a9d24aaec6",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "cliff n. 懸崖",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101115.jpg",
            "page": 113,
            "sha256": "20a53277f9db8df4f0ea2da5f7734a3cb328532e1925fc716eec84a9d24aaec6",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "cliff n. 懸崖",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V096",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "sensePos",
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V096",
        "kind": "vocabulary",
        "displayWord": "gracefully",
        "lexemeRef": "gracefully",
        "officialWordId": null,
        "officialSenseId": null,
        "sensePos": "",
        "targetMeaningZh": "教材補充詞；義項待核對。",
        "chapterMeaningsZh": "教材補充詞；義項待核對。",
        "sourcePage": 113,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "*",
        "meaningSource": "unmapped_supplement",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V096",
        "kind": "vocabulary",
        "displayWord": "gracefully",
        "lexemeRef": "gracefully",
        "officialWordId": null,
        "officialSenseId": null,
        "sensePos": "adv.",
        "targetMeaningZh": "優雅地",
        "chapterMeaningsZh": "優雅地",
        "sourcePage": 113,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "*",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "ec209676dd48a0ac8b90d7ed8bc07058d8b945192d24127ce4941083660e68df",
      "expectedAfterRowSha256": "66c95ae3d6f9a0b47a7a552297cebe64d8b5e74e324d0b3921deca23f2538a9c",
      "fields": {
        "sensePos": "adv.",
        "targetMeaningZh": "優雅地",
        "chapterMeaningsZh": "優雅地",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "sensePos": [
          {
            "type": "textbook_photo",
            "file": "20260815_101115.jpg",
            "page": 113,
            "sha256": "20a53277f9db8df4f0ea2da5f7734a3cb328532e1925fc716eec84a9d24aaec6",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "gracefully adv. 優雅地",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101115.jpg",
            "page": 113,
            "sha256": "20a53277f9db8df4f0ea2da5f7734a3cb328532e1925fc716eec84a9d24aaec6",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "gracefully adv. 優雅地",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101115.jpg",
            "page": 113,
            "sha256": "20a53277f9db8df4f0ea2da5f7734a3cb328532e1925fc716eec84a9d24aaec6",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "gracefully adv. 優雅地",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101115.jpg",
            "page": 113,
            "sha256": "20a53277f9db8df4f0ea2da5f7734a3cb328532e1925fc716eec84a9d24aaec6",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "gracefully adv. 優雅地",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V097",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "sensePos",
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V097",
        "kind": "vocabulary",
        "displayWord": "satisfy",
        "lexemeRef": "W001753",
        "officialWordId": "W001753",
        "officialSenseId": null,
        "sensePos": "v.",
        "targetMeaningZh": "使滿意；滿足；符合；使確信",
        "chapterMeaningsZh": "使滿意；滿足；符合；使確信",
        "sourcePage": 113,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "衍",
        "meaningSource": "existing_dictionary",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V097",
        "kind": "vocabulary",
        "displayWord": "satisfy",
        "lexemeRef": "W001753",
        "officialWordId": "W001753",
        "officialSenseId": null,
        "sensePos": "vt.",
        "targetMeaningZh": "使滿足；符合（要求、條件）",
        "chapterMeaningsZh": "使滿足；符合（要求、條件）",
        "sourcePage": 113,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "衍",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "2925e229b86ca296d8d6a09db2586a5c814eb21b2f8e6637e2905298b02e73c0",
      "expectedAfterRowSha256": "2cf9aaf97228e9acfcf3fad4b8de4ade03c5dc2b3bfbc7720334021982b9b8db",
      "fields": {
        "sensePos": "vt.",
        "targetMeaningZh": "使滿足；符合（要求、條件）",
        "chapterMeaningsZh": "使滿足；符合（要求、條件）",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "sensePos": [
          {
            "type": "textbook_photo",
            "file": "20260815_101115.jpg",
            "page": 113,
            "sha256": "20a53277f9db8df4f0ea2da5f7734a3cb328532e1925fc716eec84a9d24aaec6",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "satisfy vt. 使滿足；符合（要求、條件）",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101115.jpg",
            "page": 113,
            "sha256": "20a53277f9db8df4f0ea2da5f7734a3cb328532e1925fc716eec84a9d24aaec6",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "satisfy vt. 使滿足；符合（要求、條件）",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101115.jpg",
            "page": 113,
            "sha256": "20a53277f9db8df4f0ea2da5f7734a3cb328532e1925fc716eec84a9d24aaec6",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "satisfy vt. 使滿足；符合（要求、條件）",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101115.jpg",
            "page": 113,
            "sha256": "20a53277f9db8df4f0ea2da5f7734a3cb328532e1925fc716eec84a9d24aaec6",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "satisfy vt. 使滿足；符合（要求、條件）",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V098",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "sensePos",
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V098",
        "kind": "vocabulary",
        "displayWord": "satisfying",
        "lexemeRef": "satisfying",
        "officialWordId": null,
        "officialSenseId": null,
        "sensePos": "",
        "targetMeaningZh": "教材補充詞；義項待核對。",
        "chapterMeaningsZh": "教材補充詞；義項待核對。",
        "sourcePage": 113,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "衍",
        "meaningSource": "unmapped_supplement",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V098",
        "kind": "vocabulary",
        "displayWord": "satisfying",
        "lexemeRef": "satisfying",
        "officialWordId": null,
        "officialSenseId": null,
        "sensePos": "adj.",
        "targetMeaningZh": "令人愉悅的；令人飽足的",
        "chapterMeaningsZh": "令人愉悅的；令人飽足的",
        "sourcePage": 113,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "衍",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "803f7755229fa4f4b83775fa11234f7bc5defa886e561eb149cae700cf29e0c6",
      "expectedAfterRowSha256": "878d528ff61385749cd64baa75e578c92e951f810f845e693a131a8c221080ba",
      "fields": {
        "sensePos": "adj.",
        "targetMeaningZh": "令人愉悅的；令人飽足的",
        "chapterMeaningsZh": "令人愉悅的；令人飽足的",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "sensePos": [
          {
            "type": "textbook_photo",
            "file": "20260815_101115.jpg",
            "page": 113,
            "sha256": "20a53277f9db8df4f0ea2da5f7734a3cb328532e1925fc716eec84a9d24aaec6",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "satisfying adj. 令人愉悅的；令人飽足的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101115.jpg",
            "page": 113,
            "sha256": "20a53277f9db8df4f0ea2da5f7734a3cb328532e1925fc716eec84a9d24aaec6",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "satisfying adj. 令人愉悅的；令人飽足的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101115.jpg",
            "page": 113,
            "sha256": "20a53277f9db8df4f0ea2da5f7734a3cb328532e1925fc716eec84a9d24aaec6",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "satisfying adj. 令人愉悅的；令人飽足的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101115.jpg",
            "page": 113,
            "sha256": "20a53277f9db8df4f0ea2da5f7734a3cb328532e1925fc716eec84a9d24aaec6",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "satisfying adj. 令人愉悅的；令人飽足的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V099",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "sensePos",
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V099",
        "kind": "vocabulary",
        "displayWord": "satisfied",
        "lexemeRef": "satisfied",
        "officialWordId": null,
        "officialSenseId": null,
        "sensePos": "",
        "targetMeaningZh": "教材補充詞；義項待核對。",
        "chapterMeaningsZh": "教材補充詞；義項待核對。",
        "sourcePage": 113,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "衍",
        "meaningSource": "unmapped_supplement",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V099",
        "kind": "vocabulary",
        "displayWord": "satisfied",
        "lexemeRef": "satisfied",
        "officialWordId": null,
        "officialSenseId": null,
        "sensePos": "adj.",
        "targetMeaningZh": "感到滿意的",
        "chapterMeaningsZh": "感到滿意的",
        "sourcePage": 113,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "衍",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "15a657b6c83f9ea78b7383b78ed2e746125b24f56d788da89e057c77d67250bd",
      "expectedAfterRowSha256": "d5a12e2f493f0036a730eebe496314a822b799c4cb9588ae989184c1e7ceb658",
      "fields": {
        "sensePos": "adj.",
        "targetMeaningZh": "感到滿意的",
        "chapterMeaningsZh": "感到滿意的",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "sensePos": [
          {
            "type": "textbook_photo",
            "file": "20260815_101115.jpg",
            "page": 113,
            "sha256": "20a53277f9db8df4f0ea2da5f7734a3cb328532e1925fc716eec84a9d24aaec6",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "satisfied adj. 感到滿意的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101115.jpg",
            "page": 113,
            "sha256": "20a53277f9db8df4f0ea2da5f7734a3cb328532e1925fc716eec84a9d24aaec6",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "satisfied adj. 感到滿意的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101115.jpg",
            "page": 113,
            "sha256": "20a53277f9db8df4f0ea2da5f7734a3cb328532e1925fc716eec84a9d24aaec6",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "satisfied adj. 感到滿意的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101115.jpg",
            "page": 113,
            "sha256": "20a53277f9db8df4f0ea2da5f7734a3cb328532e1925fc716eec84a9d24aaec6",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "satisfied adj. 感到滿意的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V100",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V100",
        "kind": "vocabulary",
        "displayWord": "satisfaction",
        "lexemeRef": "W003877",
        "officialWordId": "W003877",
        "officialSenseId": null,
        "sensePos": "n.",
        "targetMeaningZh": "滿足；滿意；快事；賠償",
        "chapterMeaningsZh": "滿足；滿意；快事；賠償",
        "sourcePage": 113,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "衍",
        "meaningSource": "existing_dictionary",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V100",
        "kind": "vocabulary",
        "displayWord": "satisfaction",
        "lexemeRef": "W003877",
        "officialWordId": "W003877",
        "officialSenseId": null,
        "sensePos": "n.",
        "targetMeaningZh": "滿足；滿意",
        "chapterMeaningsZh": "滿足；滿意",
        "sourcePage": 113,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "衍",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "ff6873ea912dac851c083a7e1f09e3d204f4a8c63b78d4b4affe58d8521bb804",
      "expectedAfterRowSha256": "6d35d90becdbd2ac73fa77f7d52397469108262a369370af838603e605d4158e",
      "fields": {
        "targetMeaningZh": "滿足；滿意",
        "chapterMeaningsZh": "滿足；滿意",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101115.jpg",
            "page": 113,
            "sha256": "20a53277f9db8df4f0ea2da5f7734a3cb328532e1925fc716eec84a9d24aaec6",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "satisfaction n. 滿足；滿意",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101115.jpg",
            "page": 113,
            "sha256": "20a53277f9db8df4f0ea2da5f7734a3cb328532e1925fc716eec84a9d24aaec6",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "satisfaction n. 滿足；滿意",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101115.jpg",
            "page": 113,
            "sha256": "20a53277f9db8df4f0ea2da5f7734a3cb328532e1925fc716eec84a9d24aaec6",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "satisfaction n. 滿足；滿意",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V101",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V101",
        "kind": "vocabulary",
        "displayWord": "sensation",
        "lexemeRef": "W004775",
        "officialWordId": "W004775",
        "officialSenseId": null,
        "sensePos": "n.",
        "targetMeaningZh": "感覺；轟動",
        "chapterMeaningsZh": "感覺；轟動",
        "sourcePage": 114,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "*",
        "meaningSource": "existing_dictionary",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V101",
        "kind": "vocabulary",
        "displayWord": "sensation",
        "lexemeRef": "W004775",
        "officialWordId": "W004775",
        "officialSenseId": null,
        "sensePos": "n.",
        "targetMeaningZh": "轟動",
        "chapterMeaningsZh": "轟動",
        "sourcePage": 114,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "*",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "15b081c2c5bb54ec302aef670af766e123d8386ba1ed5bc6390e9c323a3bfa34",
      "expectedAfterRowSha256": "3adaa278eac121a88c4e46c0241c72169f006f00f757c380dcbf4bbdd4093923",
      "fields": {
        "targetMeaningZh": "轟動",
        "chapterMeaningsZh": "轟動",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101130.jpg",
            "page": 114,
            "sha256": "3dcc30eaaf9bb0f3170f3f342253ecfc56f238222c6055cc63055f035c8403a8",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "sensation n. 轟動",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101130.jpg",
            "page": 114,
            "sha256": "3dcc30eaaf9bb0f3170f3f342253ecfc56f238222c6055cc63055f035c8403a8",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "sensation n. 轟動",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101130.jpg",
            "page": 114,
            "sha256": "3dcc30eaaf9bb0f3170f3f342253ecfc56f238222c6055cc63055f035c8403a8",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "sensation n. 轟動",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V102",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "sensePos",
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V102",
        "kind": "vocabulary",
        "displayWord": "bathe",
        "lexemeRef": "W001078",
        "officialWordId": "W001078",
        "officialSenseId": null,
        "sensePos": "v.",
        "targetMeaningZh": "沐浴；用水洗；洗澡",
        "chapterMeaningsZh": "沐浴；用水洗；洗澡",
        "sourcePage": 114,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "*",
        "meaningSource": "existing_dictionary",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V102",
        "kind": "vocabulary",
        "displayWord": "bathe",
        "lexemeRef": "W001078",
        "officialWordId": "W001078",
        "officialSenseId": null,
        "sensePos": "vt.",
        "targetMeaningZh": "為……洗澡",
        "chapterMeaningsZh": "為……洗澡",
        "sourcePage": 114,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "*",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "5ac9ec65adea603c1ed515817938a22f9035d974306cb2675204b93a5373d40f",
      "expectedAfterRowSha256": "72f93462bfe1e6be767ae7fdb8f399ce5e447e87003217e89bcdd73904ae3948",
      "fields": {
        "sensePos": "vt.",
        "targetMeaningZh": "為……洗澡",
        "chapterMeaningsZh": "為……洗澡",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "sensePos": [
          {
            "type": "textbook_photo",
            "file": "20260815_101130.jpg",
            "page": 114,
            "sha256": "3dcc30eaaf9bb0f3170f3f342253ecfc56f238222c6055cc63055f035c8403a8",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "bathe vt. 為……洗澡",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101130.jpg",
            "page": 114,
            "sha256": "3dcc30eaaf9bb0f3170f3f342253ecfc56f238222c6055cc63055f035c8403a8",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "bathe vt. 為……洗澡",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101130.jpg",
            "page": 114,
            "sha256": "3dcc30eaaf9bb0f3170f3f342253ecfc56f238222c6055cc63055f035c8403a8",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "bathe vt. 為……洗澡",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101130.jpg",
            "page": 114,
            "sha256": "3dcc30eaaf9bb0f3170f3f342253ecfc56f238222c6055cc63055f035c8403a8",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "bathe vt. 為……洗澡",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V103",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V103",
        "kind": "vocabulary",
        "displayWord": "debut",
        "lexemeRef": "W004264",
        "officialWordId": "W004264",
        "officialSenseId": null,
        "sensePos": "n.",
        "targetMeaningZh": "初次登臺；開張",
        "chapterMeaningsZh": "初次登臺；開張",
        "sourcePage": 114,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "*",
        "meaningSource": "existing_dictionary",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V103",
        "kind": "vocabulary",
        "displayWord": "debut",
        "lexemeRef": "W004264",
        "officialWordId": "W004264",
        "officialSenseId": null,
        "sensePos": "n.",
        "targetMeaningZh": "初次露面",
        "chapterMeaningsZh": "初次露面",
        "sourcePage": 114,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "*",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "81d01387bbf0623ce8870c991f0781fed30f06839a527e8e3aaa8d0bfb77fa38",
      "expectedAfterRowSha256": "7cff87051abd841b19dfb485260924bdef0f49e2cee11f1e88724d9c8d367c79",
      "fields": {
        "targetMeaningZh": "初次露面",
        "chapterMeaningsZh": "初次露面",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101130.jpg",
            "page": 114,
            "sha256": "3dcc30eaaf9bb0f3170f3f342253ecfc56f238222c6055cc63055f035c8403a8",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "debut n. 初次露面",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101130.jpg",
            "page": 114,
            "sha256": "3dcc30eaaf9bb0f3170f3f342253ecfc56f238222c6055cc63055f035c8403a8",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "debut n. 初次露面",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101130.jpg",
            "page": 114,
            "sha256": "3dcc30eaaf9bb0f3170f3f342253ecfc56f238222c6055cc63055f035c8403a8",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "debut n. 初次露面",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V104",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V104",
        "kind": "vocabulary",
        "displayWord": "impressive",
        "lexemeRef": "W001452",
        "officialWordId": "W001452",
        "officialSenseId": null,
        "sensePos": "adj.",
        "targetMeaningZh": "給人深刻印象的；威嚴的",
        "chapterMeaningsZh": "給人深刻印象的；威嚴的",
        "sourcePage": 114,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "衍",
        "meaningSource": "existing_dictionary",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V104",
        "kind": "vocabulary",
        "displayWord": "impressive",
        "lexemeRef": "W001452",
        "officialWordId": "W001452",
        "officialSenseId": null,
        "sensePos": "adj.",
        "targetMeaningZh": "令人印象深刻的",
        "chapterMeaningsZh": "令人印象深刻的",
        "sourcePage": 114,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "衍",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "c5645efec4c2482c3d62035b2f3fe767ddc087bc19dd7f522e40dfabd49311f6",
      "expectedAfterRowSha256": "ff2751fa598bf734c63bfdcd0ace17b96e29e149fc449cf476ef6aa94dd8412e",
      "fields": {
        "targetMeaningZh": "令人印象深刻的",
        "chapterMeaningsZh": "令人印象深刻的",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101130.jpg",
            "page": 114,
            "sha256": "3dcc30eaaf9bb0f3170f3f342253ecfc56f238222c6055cc63055f035c8403a8",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "impressive adj. 令人印象深刻的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101130.jpg",
            "page": 114,
            "sha256": "3dcc30eaaf9bb0f3170f3f342253ecfc56f238222c6055cc63055f035c8403a8",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "impressive adj. 令人印象深刻的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101130.jpg",
            "page": 114,
            "sha256": "3dcc30eaaf9bb0f3170f3f342253ecfc56f238222c6055cc63055f035c8403a8",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "impressive adj. 令人印象深刻的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V105",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V105",
        "kind": "vocabulary",
        "displayWord": "impression",
        "lexemeRef": "W003526",
        "officialWordId": "W003526",
        "officialSenseId": null,
        "sensePos": "n.",
        "targetMeaningZh": "印象；意念；蓋印；印記",
        "chapterMeaningsZh": "印象；意念；蓋印；印記",
        "sourcePage": 114,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "衍",
        "meaningSource": "existing_dictionary",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V105",
        "kind": "vocabulary",
        "displayWord": "impression",
        "lexemeRef": "W003526",
        "officialWordId": "W003526",
        "officialSenseId": null,
        "sensePos": "n.",
        "targetMeaningZh": "印象；想法；感覺；痕跡",
        "chapterMeaningsZh": "印象；想法；感覺；痕跡",
        "sourcePage": 114,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "衍",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "b46d62bab834f6acf80ff61298c3840261c0758eb8b174bca260b8b66394f003",
      "expectedAfterRowSha256": "6513e1e4420c6ba03c975977c04c669c7e25d98dac20be2306da339571ad79a0",
      "fields": {
        "targetMeaningZh": "印象；想法；感覺；痕跡",
        "chapterMeaningsZh": "印象；想法；感覺；痕跡",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101130.jpg",
            "page": 114,
            "sha256": "3dcc30eaaf9bb0f3170f3f342253ecfc56f238222c6055cc63055f035c8403a8",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "impression n. 印象；想法；感覺；痕跡",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101130.jpg",
            "page": 114,
            "sha256": "3dcc30eaaf9bb0f3170f3f342253ecfc56f238222c6055cc63055f035c8403a8",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "impression n. 印象；想法；感覺；痕跡",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101130.jpg",
            "page": 114,
            "sha256": "3dcc30eaaf9bb0f3170f3f342253ecfc56f238222c6055cc63055f035c8403a8",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "impression n. 印象；想法；感覺；痕跡",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V106",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V106",
        "kind": "vocabulary",
        "displayWord": "boulevard",
        "lexemeRef": "W005103",
        "officialWordId": "W005103",
        "officialSenseId": null,
        "sensePos": "n.",
        "targetMeaningZh": "林蔭大道",
        "chapterMeaningsZh": "林蔭大道",
        "sourcePage": 114,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "*",
        "meaningSource": "existing_dictionary",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V106",
        "kind": "vocabulary",
        "displayWord": "boulevard",
        "lexemeRef": "W005103",
        "officialWordId": "W005103",
        "officialSenseId": null,
        "sensePos": "n.",
        "targetMeaningZh": "林蔭大道",
        "chapterMeaningsZh": "林蔭大道",
        "sourcePage": 114,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "*",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "26c495fe8896a35590426e01254f85682166bc0404370ca30cf1d9f5f4a04389",
      "expectedAfterRowSha256": "e0a702018cdbe0ec57f8f852143976740fc32286308477a2026ede0cd2a7017e",
      "fields": {
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101130.jpg",
            "page": 114,
            "sha256": "3dcc30eaaf9bb0f3170f3f342253ecfc56f238222c6055cc63055f035c8403a8",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "boulevard n. 林蔭大道",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V107",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V107",
        "kind": "vocabulary",
        "displayWord": "bucket",
        "lexemeRef": "W002107",
        "officialWordId": "W002107",
        "officialSenseId": null,
        "sensePos": "n.",
        "targetMeaningZh": "桶；存儲桶",
        "chapterMeaningsZh": "桶；存儲桶",
        "sourcePage": 114,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "*",
        "meaningSource": "existing_dictionary",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V107",
        "kind": "vocabulary",
        "displayWord": "bucket",
        "lexemeRef": "W002107",
        "officialWordId": "W002107",
        "officialSenseId": null,
        "sensePos": "n.",
        "targetMeaningZh": "桶子；小桶",
        "chapterMeaningsZh": "桶子；小桶",
        "sourcePage": 114,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "*",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "2e4a3cd915849285884a170859643340de0a10137e617ab8a357dc7fde35cb7a",
      "expectedAfterRowSha256": "edd65b896beacac38d2286acddfceafa547717fb295643eeea7c94b474b64454",
      "fields": {
        "targetMeaningZh": "桶子；小桶",
        "chapterMeaningsZh": "桶子；小桶",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101130.jpg",
            "page": 114,
            "sha256": "3dcc30eaaf9bb0f3170f3f342253ecfc56f238222c6055cc63055f035c8403a8",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "bucket n. 桶子；小桶",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101130.jpg",
            "page": 114,
            "sha256": "3dcc30eaaf9bb0f3170f3f342253ecfc56f238222c6055cc63055f035c8403a8",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "bucket n. 桶子；小桶",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101130.jpg",
            "page": 114,
            "sha256": "3dcc30eaaf9bb0f3170f3f342253ecfc56f238222c6055cc63055f035c8403a8",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "bucket n. 桶子；小桶",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V108",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V108",
        "kind": "vocabulary",
        "displayWord": "diversity",
        "lexemeRef": "W003316",
        "officialWordId": "W003316",
        "officialSenseId": null,
        "sensePos": "n.",
        "targetMeaningZh": "差異；多樣性",
        "chapterMeaningsZh": "差異；多樣性",
        "sourcePage": 115,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "*",
        "meaningSource": "existing_dictionary",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V108",
        "kind": "vocabulary",
        "displayWord": "diversity",
        "lexemeRef": "W003316",
        "officialWordId": "W003316",
        "officialSenseId": null,
        "sensePos": "n.",
        "targetMeaningZh": "多樣性",
        "chapterMeaningsZh": "多樣性",
        "sourcePage": 115,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "*",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "65b07cbb756b0bc11e522ad77bf32c4a7fab59b46ec08c1cb1609f9829c407dc",
      "expectedAfterRowSha256": "d3bf8e4cbcd65a0ad05c0ec6a616c1ef8e30f61e1acfb752cb778b53b94ef7dd",
      "fields": {
        "targetMeaningZh": "多樣性",
        "chapterMeaningsZh": "多樣性",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101154.jpg",
            "page": 115,
            "sha256": "f209d8b46ccbb46893daf48a01b46ccd2aab1fdf49ad990972aaae5ca3638336",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "diversity n. 多樣性",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101154.jpg",
            "page": 115,
            "sha256": "f209d8b46ccbb46893daf48a01b46ccd2aab1fdf49ad990972aaae5ca3638336",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "diversity n. 多樣性",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101154.jpg",
            "page": 115,
            "sha256": "f209d8b46ccbb46893daf48a01b46ccd2aab1fdf49ad990972aaae5ca3638336",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "diversity n. 多樣性",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V109",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "sensePos",
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V109",
        "kind": "vocabulary",
        "displayWord": "colonial",
        "lexemeRef": "W004164",
        "officialWordId": "W004164",
        "officialSenseId": null,
        "sensePos": "adj./n.",
        "targetMeaningZh": "殖民的；殖民地的；殖民地居民",
        "chapterMeaningsZh": "殖民的；殖民地的；殖民地居民",
        "sourcePage": 116,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "衍",
        "meaningSource": "existing_dictionary",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V109",
        "kind": "vocabulary",
        "displayWord": "colonial",
        "lexemeRef": "W004164",
        "officialWordId": "W004164",
        "officialSenseId": null,
        "sensePos": "adj.",
        "targetMeaningZh": "殖民地的；殖民的",
        "chapterMeaningsZh": "殖民地的；殖民的",
        "sourcePage": 116,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "衍",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "db249461844860a14be7494a31510278499f3d822235c074beb2ecd07edfa9f8",
      "expectedAfterRowSha256": "c2f81cdaa5002cb3012848197aba49e528c3fae38e00af12c4217567123e408d",
      "fields": {
        "sensePos": "adj.",
        "targetMeaningZh": "殖民地的；殖民的",
        "chapterMeaningsZh": "殖民地的；殖民的",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "sensePos": [
          {
            "type": "textbook_photo",
            "file": "20260815_101205.jpg",
            "page": 116,
            "sha256": "bac53daf334a9614ba784360e2f7f64837bd177ea4c5283bdb6d8f7df403dd03",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "colonial adj. 殖民地的；殖民的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101205.jpg",
            "page": 116,
            "sha256": "bac53daf334a9614ba784360e2f7f64837bd177ea4c5283bdb6d8f7df403dd03",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "colonial adj. 殖民地的；殖民的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101205.jpg",
            "page": 116,
            "sha256": "bac53daf334a9614ba784360e2f7f64837bd177ea4c5283bdb6d8f7df403dd03",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "colonial adj. 殖民地的；殖民的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101205.jpg",
            "page": 116,
            "sha256": "bac53daf334a9614ba784360e2f7f64837bd177ea4c5283bdb6d8f7df403dd03",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "colonial adj. 殖民地的；殖民的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V110",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "sensePos",
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V110",
        "kind": "vocabulary",
        "displayWord": "colonize",
        "lexemeRef": "colonize",
        "officialWordId": null,
        "officialSenseId": null,
        "sensePos": "",
        "targetMeaningZh": "教材補充詞；義項待核對。",
        "chapterMeaningsZh": "教材補充詞；義項待核對。",
        "sourcePage": 116,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "衍",
        "meaningSource": "unmapped_supplement",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V110",
        "kind": "vocabulary",
        "displayWord": "colonize",
        "lexemeRef": "colonize",
        "officialWordId": null,
        "officialSenseId": null,
        "sensePos": "vt.",
        "targetMeaningZh": "將……開拓為殖民地",
        "chapterMeaningsZh": "將……開拓為殖民地",
        "sourcePage": 116,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "衍",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "670ea63a5dcd96002b04d5ab49631aa53d6bfa6ecf96ad2527cfc90369a6c5de",
      "expectedAfterRowSha256": "46920ba1ffd21656a08c99e8b103bd3df3117298025a16510e8f40e17c4f5fa2",
      "fields": {
        "sensePos": "vt.",
        "targetMeaningZh": "將……開拓為殖民地",
        "chapterMeaningsZh": "將……開拓為殖民地",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "sensePos": [
          {
            "type": "textbook_photo",
            "file": "20260815_101205.jpg",
            "page": 116,
            "sha256": "bac53daf334a9614ba784360e2f7f64837bd177ea4c5283bdb6d8f7df403dd03",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "colonize vt. 將……開拓為殖民地",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101205.jpg",
            "page": 116,
            "sha256": "bac53daf334a9614ba784360e2f7f64837bd177ea4c5283bdb6d8f7df403dd03",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "colonize vt. 將……開拓為殖民地",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101205.jpg",
            "page": 116,
            "sha256": "bac53daf334a9614ba784360e2f7f64837bd177ea4c5283bdb6d8f7df403dd03",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "colonize vt. 將……開拓為殖民地",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101205.jpg",
            "page": 116,
            "sha256": "bac53daf334a9614ba784360e2f7f64837bd177ea4c5283bdb6d8f7df403dd03",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "colonize vt. 將……開拓為殖民地",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V111",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V111",
        "kind": "vocabulary",
        "displayWord": "effective",
        "lexemeRef": "W001297",
        "officialWordId": "W001297",
        "officialSenseId": null,
        "sensePos": "adj.",
        "targetMeaningZh": "有效的；有力的；實際的；有生力量",
        "chapterMeaningsZh": "有效的；有力的；實際的；有生力量",
        "sourcePage": 116,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "比",
        "meaningSource": "existing_dictionary",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V111",
        "kind": "vocabulary",
        "displayWord": "effective",
        "lexemeRef": "W001297",
        "officialWordId": "W001297",
        "officialSenseId": null,
        "sensePos": "adj.",
        "targetMeaningZh": "有效的",
        "chapterMeaningsZh": "有效的",
        "sourcePage": 116,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "比",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "04029dee49390d8545a483af93319f3c22e7a684d67156273bbfa551e5e571b5",
      "expectedAfterRowSha256": "df4a72105cce30a55eb91777a97d2a77fcc45198344c021f479bb1c4762817e8",
      "fields": {
        "targetMeaningZh": "有效的",
        "chapterMeaningsZh": "有效的",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101205.jpg",
            "page": 116,
            "sha256": "bac53daf334a9614ba784360e2f7f64837bd177ea4c5283bdb6d8f7df403dd03",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "effective adj. 有效的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101205.jpg",
            "page": 116,
            "sha256": "bac53daf334a9614ba784360e2f7f64837bd177ea4c5283bdb6d8f7df403dd03",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "effective adj. 有效的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101205.jpg",
            "page": 116,
            "sha256": "bac53daf334a9614ba784360e2f7f64837bd177ea4c5283bdb6d8f7df403dd03",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "effective adj. 有效的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V112",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "sensePos",
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V112",
        "kind": "vocabulary",
        "displayWord": "consume",
        "lexemeRef": "W003204",
        "officialWordId": "W003204",
        "officialSenseId": null,
        "sensePos": "v.",
        "targetMeaningZh": "消耗；消費；消滅；耗盡",
        "chapterMeaningsZh": "消耗；消費；消滅；耗盡",
        "sourcePage": 116,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "*",
        "meaningSource": "existing_dictionary",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V112",
        "kind": "vocabulary",
        "displayWord": "consume",
        "lexemeRef": "W003204",
        "officialWordId": "W003204",
        "officialSenseId": null,
        "sensePos": "vt.",
        "targetMeaningZh": "消耗",
        "chapterMeaningsZh": "消耗",
        "sourcePage": 116,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "*",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "1bdc30b932536ae5ac44ec5030d4cf12d20e72c9751808d6834f8af2ab6fead1",
      "expectedAfterRowSha256": "5d038b1b929a31e0188208fbe39b06b0b6856b17d1ea78839b69152f10f99e0b",
      "fields": {
        "sensePos": "vt.",
        "targetMeaningZh": "消耗",
        "chapterMeaningsZh": "消耗",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "sensePos": [
          {
            "type": "textbook_photo",
            "file": "20260815_101205.jpg",
            "page": 116,
            "sha256": "bac53daf334a9614ba784360e2f7f64837bd177ea4c5283bdb6d8f7df403dd03",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "consume vt. 消耗",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101205.jpg",
            "page": 116,
            "sha256": "bac53daf334a9614ba784360e2f7f64837bd177ea4c5283bdb6d8f7df403dd03",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "consume vt. 消耗",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101205.jpg",
            "page": 116,
            "sha256": "bac53daf334a9614ba784360e2f7f64837bd177ea4c5283bdb6d8f7df403dd03",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "consume vt. 消耗",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101205.jpg",
            "page": 116,
            "sha256": "bac53daf334a9614ba784360e2f7f64837bd177ea4c5283bdb6d8f7df403dd03",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "consume vt. 消耗",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V113",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "sensePos",
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V113",
        "kind": "vocabulary",
        "displayWord": "decayed",
        "lexemeRef": "decayed",
        "officialWordId": null,
        "officialSenseId": null,
        "sensePos": "",
        "targetMeaningZh": "教材補充詞；義項待核對。",
        "chapterMeaningsZh": "教材補充詞；義項待核對。",
        "sourcePage": 116,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "似",
        "meaningSource": "unmapped_supplement",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V113",
        "kind": "vocabulary",
        "displayWord": "decayed",
        "lexemeRef": "decayed",
        "officialWordId": null,
        "officialSenseId": null,
        "sensePos": "adj.",
        "targetMeaningZh": "腐壞的",
        "chapterMeaningsZh": "腐壞的",
        "sourcePage": 116,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "似",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "239116cc96ef7acf79abbb796f4ba28e7a41a3d6539cab12f8a8915528e7fb0d",
      "expectedAfterRowSha256": "64e50d1ca35f282713cf89240e6977a739e61a743f7277501d273ada7b972958",
      "fields": {
        "sensePos": "adj.",
        "targetMeaningZh": "腐壞的",
        "chapterMeaningsZh": "腐壞的",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "sensePos": [
          {
            "type": "textbook_photo",
            "file": "20260815_101205.jpg",
            "page": 116,
            "sha256": "bac53daf334a9614ba784360e2f7f64837bd177ea4c5283bdb6d8f7df403dd03",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "decayed adj. 腐壞的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101205.jpg",
            "page": 116,
            "sha256": "bac53daf334a9614ba784360e2f7f64837bd177ea4c5283bdb6d8f7df403dd03",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "decayed adj. 腐壞的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101205.jpg",
            "page": 116,
            "sha256": "bac53daf334a9614ba784360e2f7f64837bd177ea4c5283bdb6d8f7df403dd03",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "decayed adj. 腐壞的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101205.jpg",
            "page": 116,
            "sha256": "bac53daf334a9614ba784360e2f7f64837bd177ea4c5283bdb6d8f7df403dd03",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "decayed adj. 腐壞的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V114",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "sensePos",
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V114",
        "kind": "vocabulary",
        "displayWord": "flat",
        "lexemeRef": "W001363",
        "officialWordId": "W001363",
        "officialSenseId": null,
        "sensePos": "adj./adv./n.",
        "targetMeaningZh": "平坦的；單調的；無力的；淺的",
        "chapterMeaningsZh": "平坦的；單調的；無力的；淺的",
        "sourcePage": 116,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "似",
        "meaningSource": "existing_dictionary",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V114",
        "kind": "vocabulary",
        "displayWord": "flat",
        "lexemeRef": "W001363",
        "officialWordId": "W001363",
        "officialSenseId": null,
        "sensePos": "adj.",
        "targetMeaningZh": "單調的",
        "chapterMeaningsZh": "單調的",
        "sourcePage": 116,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "似",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "46b0147bad81eda1d3afb6c7b9677c8a13aa4044fb339e68b77a0d70211725b9",
      "expectedAfterRowSha256": "d0b32aada93844e67ef3a467c5bc883c406ff6139bb686eca67b33d75d468a88",
      "fields": {
        "sensePos": "adj.",
        "targetMeaningZh": "單調的",
        "chapterMeaningsZh": "單調的",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "sensePos": [
          {
            "type": "textbook_photo",
            "file": "20260815_101205.jpg",
            "page": 116,
            "sha256": "bac53daf334a9614ba784360e2f7f64837bd177ea4c5283bdb6d8f7df403dd03",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "flat adj. 單調的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101205.jpg",
            "page": 116,
            "sha256": "bac53daf334a9614ba784360e2f7f64837bd177ea4c5283bdb6d8f7df403dd03",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "flat adj. 單調的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101205.jpg",
            "page": 116,
            "sha256": "bac53daf334a9614ba784360e2f7f64837bd177ea4c5283bdb6d8f7df403dd03",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "flat adj. 單調的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101205.jpg",
            "page": 116,
            "sha256": "bac53daf334a9614ba784360e2f7f64837bd177ea4c5283bdb6d8f7df403dd03",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "flat adj. 單調的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V115",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V115",
        "kind": "vocabulary",
        "displayWord": "boring",
        "lexemeRef": "W000104",
        "officialWordId": "W000104",
        "officialSenseId": null,
        "sensePos": "adj.",
        "targetMeaningZh": "煩人的；無聊的；無趣的；成孔期",
        "chapterMeaningsZh": "煩人的；無聊的；無趣的；成孔期",
        "sourcePage": 116,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "似",
        "meaningSource": "existing_dictionary",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V115",
        "kind": "vocabulary",
        "displayWord": "boring",
        "lexemeRef": "W000104",
        "officialWordId": "W000104",
        "officialSenseId": null,
        "sensePos": "adj.",
        "targetMeaningZh": "令人無聊的",
        "chapterMeaningsZh": "令人無聊的",
        "sourcePage": 116,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "似",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "1d0ee57b24a7df98cc84ec310a35f4c252e503248715b772791992d96522d60e",
      "expectedAfterRowSha256": "a82867e696faf3c689c18ad17b9c8fdc7dcbaa417978ad9f0493c7b876049768",
      "fields": {
        "targetMeaningZh": "令人無聊的",
        "chapterMeaningsZh": "令人無聊的",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101205.jpg",
            "page": 116,
            "sha256": "bac53daf334a9614ba784360e2f7f64837bd177ea4c5283bdb6d8f7df403dd03",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "boring adj. 令人無聊的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101205.jpg",
            "page": 116,
            "sha256": "bac53daf334a9614ba784360e2f7f64837bd177ea4c5283bdb6d8f7df403dd03",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "boring adj. 令人無聊的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101205.jpg",
            "page": 116,
            "sha256": "bac53daf334a9614ba784360e2f7f64837bd177ea4c5283bdb6d8f7df403dd03",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "boring adj. 令人無聊的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V116",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V116",
        "kind": "vocabulary",
        "displayWord": "fresh",
        "lexemeRef": "W000329",
        "officialWordId": "W000329",
        "officialSenseId": null,
        "sensePos": "adj.",
        "targetMeaningZh": "新鮮的；新奇的；另外的；淡的",
        "chapterMeaningsZh": "新鮮的；新奇的；另外的；淡的",
        "sourcePage": 116,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "反",
        "meaningSource": "existing_dictionary",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V116",
        "kind": "vocabulary",
        "displayWord": "fresh",
        "lexemeRef": "W000329",
        "officialWordId": "W000329",
        "officialSenseId": null,
        "sensePos": "adj.",
        "targetMeaningZh": "新鮮的",
        "chapterMeaningsZh": "新鮮的",
        "sourcePage": 116,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "反",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "9c3c322dc2d0082758b6a9b63c902838b2b9536a976c44c9652f4bd05fd12aa3",
      "expectedAfterRowSha256": "3eb396e0ad9d9c409421e79c5385a12dccd33c2cddc61627d9cec7f5a777d9ea",
      "fields": {
        "targetMeaningZh": "新鮮的",
        "chapterMeaningsZh": "新鮮的",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101205.jpg",
            "page": 116,
            "sha256": "bac53daf334a9614ba784360e2f7f64837bd177ea4c5283bdb6d8f7df403dd03",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "fresh adj. 新鮮的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101205.jpg",
            "page": 116,
            "sha256": "bac53daf334a9614ba784360e2f7f64837bd177ea4c5283bdb6d8f7df403dd03",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "fresh adj. 新鮮的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101205.jpg",
            "page": 116,
            "sha256": "bac53daf334a9614ba784360e2f7f64837bd177ea4c5283bdb6d8f7df403dd03",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "fresh adj. 新鮮的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V117",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "sensePos",
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V117",
        "kind": "vocabulary",
        "displayWord": "consul",
        "lexemeRef": "consul",
        "officialWordId": null,
        "officialSenseId": null,
        "sensePos": "",
        "targetMeaningZh": "教材補充詞；義項待核對。",
        "chapterMeaningsZh": "教材補充詞；義項待核對。",
        "sourcePage": 117,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "似",
        "meaningSource": "unmapped_supplement",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V117",
        "kind": "vocabulary",
        "displayWord": "consul",
        "lexemeRef": "consul",
        "officialWordId": null,
        "officialSenseId": null,
        "sensePos": "n.",
        "targetMeaningZh": "領事",
        "chapterMeaningsZh": "領事",
        "sourcePage": 117,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "似",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "e3dec8710f442b756a8837b0b341ca10fa9844f9c5d9364cb8f48a27c872c33f",
      "expectedAfterRowSha256": "deae8d10b60d9f0c0e6575b85546d532fd482d4351bad86d7ddadd52681475c7",
      "fields": {
        "sensePos": "n.",
        "targetMeaningZh": "領事",
        "chapterMeaningsZh": "領事",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "sensePos": [
          {
            "type": "textbook_photo",
            "file": "20260815_101211.jpg",
            "page": 117,
            "sha256": "c993a3403ccbfcc7cf9c0de2a1bcfc74de8410f407c1ac204a03537f9616f77b",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "consul n. 領事",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101211.jpg",
            "page": 117,
            "sha256": "c993a3403ccbfcc7cf9c0de2a1bcfc74de8410f407c1ac204a03537f9616f77b",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "consul n. 領事",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101211.jpg",
            "page": 117,
            "sha256": "c993a3403ccbfcc7cf9c0de2a1bcfc74de8410f407c1ac204a03537f9616f77b",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "consul n. 領事",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101211.jpg",
            "page": 117,
            "sha256": "c993a3403ccbfcc7cf9c0de2a1bcfc74de8410f407c1ac204a03537f9616f77b",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "consul n. 領事",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V118",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V118",
        "kind": "vocabulary",
        "displayWord": "diplomat",
        "lexemeRef": "W003296",
        "officialWordId": "W003296",
        "officialSenseId": null,
        "sensePos": "n.",
        "targetMeaningZh": "外交官；有外交手腕的人；外交家；有權謀的人",
        "chapterMeaningsZh": "外交官；有外交手腕的人；外交家；有權謀的人",
        "sourcePage": 117,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "似",
        "meaningSource": "existing_dictionary",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V118",
        "kind": "vocabulary",
        "displayWord": "diplomat",
        "lexemeRef": "W003296",
        "officialWordId": "W003296",
        "officialSenseId": null,
        "sensePos": "n.",
        "targetMeaningZh": "外交官",
        "chapterMeaningsZh": "外交官",
        "sourcePage": 117,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "似",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "9f7662b5a6c7e51ca8ecc8b8b3e8d7e26d3f0358ffc2ecde7f47a85cb5b19e88",
      "expectedAfterRowSha256": "52465a5c8ef0092bb7026ef7f1636078571d1c14799e6e45026c6b66535effa5",
      "fields": {
        "targetMeaningZh": "外交官",
        "chapterMeaningsZh": "外交官",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101211.jpg",
            "page": 117,
            "sha256": "c993a3403ccbfcc7cf9c0de2a1bcfc74de8410f407c1ac204a03537f9616f77b",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "diplomat n. 外交官",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101211.jpg",
            "page": 117,
            "sha256": "c993a3403ccbfcc7cf9c0de2a1bcfc74de8410f407c1ac204a03537f9616f77b",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "diplomat n. 外交官",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101211.jpg",
            "page": 117,
            "sha256": "c993a3403ccbfcc7cf9c0de2a1bcfc74de8410f407c1ac204a03537f9616f77b",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "diplomat n. 外交官",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V119",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V119",
        "kind": "vocabulary",
        "displayWord": "embassy",
        "lexemeRef": "W003347",
        "officialWordId": "W003347",
        "officialSenseId": null,
        "sensePos": "n.",
        "targetMeaningZh": "大使館；大使館全體人員",
        "chapterMeaningsZh": "大使館；大使館全體人員",
        "sourcePage": 117,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "衍",
        "meaningSource": "existing_dictionary",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V119",
        "kind": "vocabulary",
        "displayWord": "embassy",
        "lexemeRef": "W003347",
        "officialWordId": "W003347",
        "officialSenseId": null,
        "sensePos": "n.",
        "targetMeaningZh": "大使館",
        "chapterMeaningsZh": "大使館",
        "sourcePage": 117,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "衍",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "3bf7bf78586c4f1cb2a1acde96c8730799d31f68685081b67b78ca19f06d6135",
      "expectedAfterRowSha256": "4257e5f22182d6d108ec326a7e6f628ea049c46d176148579758e8260a528b67",
      "fields": {
        "targetMeaningZh": "大使館",
        "chapterMeaningsZh": "大使館",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101211.jpg",
            "page": 117,
            "sha256": "c993a3403ccbfcc7cf9c0de2a1bcfc74de8410f407c1ac204a03537f9616f77b",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "embassy n. 大使館",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101211.jpg",
            "page": 117,
            "sha256": "c993a3403ccbfcc7cf9c0de2a1bcfc74de8410f407c1ac204a03537f9616f77b",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "embassy n. 大使館",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101211.jpg",
            "page": 117,
            "sha256": "c993a3403ccbfcc7cf9c0de2a1bcfc74de8410f407c1ac204a03537f9616f77b",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "embassy n. 大使館",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V120",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "sensePos",
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V120",
        "kind": "vocabulary",
        "displayWord": "alphabetical",
        "lexemeRef": "alphabetical",
        "officialWordId": null,
        "officialSenseId": null,
        "sensePos": "",
        "targetMeaningZh": "教材補充詞；義項待核對。",
        "chapterMeaningsZh": "教材補充詞；義項待核對。",
        "sourcePage": 117,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "衍",
        "meaningSource": "unmapped_supplement",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V120",
        "kind": "vocabulary",
        "displayWord": "alphabetical",
        "lexemeRef": "alphabetical",
        "officialWordId": null,
        "officialSenseId": null,
        "sensePos": "adj.",
        "targetMeaningZh": "按字母順序的",
        "chapterMeaningsZh": "按字母順序的",
        "sourcePage": 117,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "衍",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "3021e90a765fcc756566d67cb828c57f001ead45d65e85728be57339a201f3dc",
      "expectedAfterRowSha256": "aa6e387bb77ad88ea75546f0d87246ab543d77362c47ae4051d3cc45cdd02d39",
      "fields": {
        "sensePos": "adj.",
        "targetMeaningZh": "按字母順序的",
        "chapterMeaningsZh": "按字母順序的",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "sensePos": [
          {
            "type": "textbook_photo",
            "file": "20260815_101211.jpg",
            "page": 117,
            "sha256": "c993a3403ccbfcc7cf9c0de2a1bcfc74de8410f407c1ac204a03537f9616f77b",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "alphabetical adj. 按字母順序的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101211.jpg",
            "page": 117,
            "sha256": "c993a3403ccbfcc7cf9c0de2a1bcfc74de8410f407c1ac204a03537f9616f77b",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "alphabetical adj. 按字母順序的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101211.jpg",
            "page": 117,
            "sha256": "c993a3403ccbfcc7cf9c0de2a1bcfc74de8410f407c1ac204a03537f9616f77b",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "alphabetical adj. 按字母順序的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101211.jpg",
            "page": 117,
            "sha256": "c993a3403ccbfcc7cf9c0de2a1bcfc74de8410f407c1ac204a03537f9616f77b",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "alphabetical adj. 按字母順序的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V121",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "sensePos",
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V121",
        "kind": "vocabulary",
        "displayWord": "crabbed",
        "lexemeRef": "crabbed",
        "officialWordId": null,
        "officialSenseId": null,
        "sensePos": "",
        "targetMeaningZh": "教材補充詞；義項待核對。",
        "chapterMeaningsZh": "教材補充詞；義項待核對。",
        "sourcePage": 117,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "衍",
        "meaningSource": "unmapped_supplement",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V121",
        "kind": "vocabulary",
        "displayWord": "crabbed",
        "lexemeRef": "crabbed",
        "officialWordId": null,
        "officialSenseId": null,
        "sensePos": "adj.",
        "targetMeaningZh": "（字跡）潦草難讀的",
        "chapterMeaningsZh": "（字跡）潦草難讀的",
        "sourcePage": 117,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "衍",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "89d78a74d3f0922a354c79d1f9a1a83819b836e4f714fd4c9ea825d3ee6c77b7",
      "expectedAfterRowSha256": "e1192369353b986509e9da1c1d7ca43cbdc666793a308f381b425a3fcdb070c1",
      "fields": {
        "sensePos": "adj.",
        "targetMeaningZh": "（字跡）潦草難讀的",
        "chapterMeaningsZh": "（字跡）潦草難讀的",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "sensePos": [
          {
            "type": "textbook_photo",
            "file": "20260815_101211.jpg",
            "page": 117,
            "sha256": "c993a3403ccbfcc7cf9c0de2a1bcfc74de8410f407c1ac204a03537f9616f77b",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "crabbed adj. （字跡）潦草難讀的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101211.jpg",
            "page": 117,
            "sha256": "c993a3403ccbfcc7cf9c0de2a1bcfc74de8410f407c1ac204a03537f9616f77b",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "crabbed adj. （字跡）潦草難讀的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101211.jpg",
            "page": 117,
            "sha256": "c993a3403ccbfcc7cf9c0de2a1bcfc74de8410f407c1ac204a03537f9616f77b",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "crabbed adj. （字跡）潦草難讀的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101211.jpg",
            "page": 117,
            "sha256": "c993a3403ccbfcc7cf9c0de2a1bcfc74de8410f407c1ac204a03537f9616f77b",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "crabbed adj. （字跡）潦草難讀的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V122",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V122",
        "kind": "vocabulary",
        "displayWord": "globe",
        "lexemeRef": "W003455",
        "officialWordId": "W003455",
        "officialSenseId": null,
        "sensePos": "n.",
        "targetMeaningZh": "球；球狀物；地球儀；天體",
        "chapterMeaningsZh": "球；球狀物；地球儀；天體",
        "sourcePage": 117,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "衍",
        "meaningSource": "existing_dictionary",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V122",
        "kind": "vocabulary",
        "displayWord": "globe",
        "lexemeRef": "W003455",
        "officialWordId": "W003455",
        "officialSenseId": null,
        "sensePos": "n.",
        "targetMeaningZh": "地球儀；地球",
        "chapterMeaningsZh": "地球儀；地球",
        "sourcePage": 117,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "衍",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "83cf8659838f93bd71ba36dfc8f4ed7f768dab7194683523b309563a6d923152",
      "expectedAfterRowSha256": "131a423e62c75596dc419ce35083ded0d473f944475519b98056f87a0e231c67",
      "fields": {
        "targetMeaningZh": "地球儀；地球",
        "chapterMeaningsZh": "地球儀；地球",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101211.jpg",
            "page": 117,
            "sha256": "c993a3403ccbfcc7cf9c0de2a1bcfc74de8410f407c1ac204a03537f9616f77b",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "globe n. 地球儀；地球",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101211.jpg",
            "page": 117,
            "sha256": "c993a3403ccbfcc7cf9c0de2a1bcfc74de8410f407c1ac204a03537f9616f77b",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "globe n. 地球儀；地球",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101211.jpg",
            "page": 117,
            "sha256": "c993a3403ccbfcc7cf9c0de2a1bcfc74de8410f407c1ac204a03537f9616f77b",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "globe n. 地球儀；地球",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V123",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "sensePos",
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V123",
        "kind": "vocabulary",
        "displayWord": "fog",
        "lexemeRef": "W001368",
        "officialWordId": "W001368",
        "officialSenseId": null,
        "sensePos": "n./v.",
        "targetMeaningZh": "霧；迷惑；(割後的)最生草；苔蘚",
        "chapterMeaningsZh": "霧；迷惑；(割後的)最生草；苔蘚",
        "sourcePage": 117,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "衍",
        "meaningSource": "existing_dictionary",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V123",
        "kind": "vocabulary",
        "displayWord": "fog",
        "lexemeRef": "W001368",
        "officialWordId": "W001368",
        "officialSenseId": null,
        "sensePos": "n.",
        "targetMeaningZh": "霧",
        "chapterMeaningsZh": "霧",
        "sourcePage": 117,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "衍",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "f99def8192de34b0f090963e86d16843d0b5ed87831a3b8e1703396086f2730e",
      "expectedAfterRowSha256": "2e08cf2f694b09bca6ff7c3e4211460f84701e251e8606fff80dc34d9cca09e4",
      "fields": {
        "sensePos": "n.",
        "targetMeaningZh": "霧",
        "chapterMeaningsZh": "霧",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "sensePos": [
          {
            "type": "textbook_photo",
            "file": "20260815_101211.jpg",
            "page": 117,
            "sha256": "c993a3403ccbfcc7cf9c0de2a1bcfc74de8410f407c1ac204a03537f9616f77b",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "fog n. 霧",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101211.jpg",
            "page": 117,
            "sha256": "c993a3403ccbfcc7cf9c0de2a1bcfc74de8410f407c1ac204a03537f9616f77b",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "fog n. 霧",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101211.jpg",
            "page": 117,
            "sha256": "c993a3403ccbfcc7cf9c0de2a1bcfc74de8410f407c1ac204a03537f9616f77b",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "fog n. 霧",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101211.jpg",
            "page": 117,
            "sha256": "c993a3403ccbfcc7cf9c0de2a1bcfc74de8410f407c1ac204a03537f9616f77b",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "fog n. 霧",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V124",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V124",
        "kind": "vocabulary",
        "displayWord": "sunny",
        "lexemeRef": "W000843",
        "officialWordId": "W000843",
        "officialSenseId": null,
        "sensePos": "adj.",
        "targetMeaningZh": "陽光充足的；樂觀的；快樂的；像太陽的",
        "chapterMeaningsZh": "陽光充足的；樂觀的；快樂的；像太陽的",
        "sourcePage": 117,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "延伸",
        "meaningSource": "existing_dictionary",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V124",
        "kind": "vocabulary",
        "displayWord": "sunny",
        "lexemeRef": "W000843",
        "officialWordId": "W000843",
        "officialSenseId": null,
        "sensePos": "adj.",
        "targetMeaningZh": "晴朗的",
        "chapterMeaningsZh": "晴朗的",
        "sourcePage": 117,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "延伸",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "9ebe8d638d253d4ce98b86ff8ee14831b2e6534813420c7221b4c697a3048963",
      "expectedAfterRowSha256": "7cd59964ef36309d233a9ec2142d018eb2789804501e4f23aff7518fbd501609",
      "fields": {
        "targetMeaningZh": "晴朗的",
        "chapterMeaningsZh": "晴朗的",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101211.jpg",
            "page": 117,
            "sha256": "c993a3403ccbfcc7cf9c0de2a1bcfc74de8410f407c1ac204a03537f9616f77b",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "sunny adj. 晴朗的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101211.jpg",
            "page": 117,
            "sha256": "c993a3403ccbfcc7cf9c0de2a1bcfc74de8410f407c1ac204a03537f9616f77b",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "sunny adj. 晴朗的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101211.jpg",
            "page": 117,
            "sha256": "c993a3403ccbfcc7cf9c0de2a1bcfc74de8410f407c1ac204a03537f9616f77b",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "sunny adj. 晴朗的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V125",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V125",
        "kind": "vocabulary",
        "displayWord": "cloudy",
        "lexemeRef": "W001169",
        "officialWordId": "W001169",
        "officialSenseId": null,
        "sensePos": "adj.",
        "targetMeaningZh": "多雲的；有愁容的；雲的；渾濁的",
        "chapterMeaningsZh": "多雲的；有愁容的；雲的；渾濁的",
        "sourcePage": 117,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "延伸",
        "meaningSource": "existing_dictionary",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V125",
        "kind": "vocabulary",
        "displayWord": "cloudy",
        "lexemeRef": "W001169",
        "officialWordId": "W001169",
        "officialSenseId": null,
        "sensePos": "adj.",
        "targetMeaningZh": "多雲的；陰的",
        "chapterMeaningsZh": "多雲的；陰的",
        "sourcePage": 117,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "延伸",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "1bd8cfce3789b2e76c65d7450c0daada02c9bc3160d3307b14e978386eb31349",
      "expectedAfterRowSha256": "022d2f2c1c069f5cea7491659424b51429c35af18e4963c140eadb15958ae58f",
      "fields": {
        "targetMeaningZh": "多雲的；陰的",
        "chapterMeaningsZh": "多雲的；陰的",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101211.jpg",
            "page": 117,
            "sha256": "c993a3403ccbfcc7cf9c0de2a1bcfc74de8410f407c1ac204a03537f9616f77b",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "cloudy adj. 多雲的；陰的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101211.jpg",
            "page": 117,
            "sha256": "c993a3403ccbfcc7cf9c0de2a1bcfc74de8410f407c1ac204a03537f9616f77b",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "cloudy adj. 多雲的；陰的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101211.jpg",
            "page": 117,
            "sha256": "c993a3403ccbfcc7cf9c0de2a1bcfc74de8410f407c1ac204a03537f9616f77b",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "cloudy adj. 多雲的；陰的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V126",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V126",
        "kind": "vocabulary",
        "displayWord": "rainy",
        "lexemeRef": "W000697",
        "officialWordId": "W000697",
        "officialSenseId": null,
        "sensePos": "adj.",
        "targetMeaningZh": "下雨的；多雨的",
        "chapterMeaningsZh": "下雨的；多雨的",
        "sourcePage": 117,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "延伸",
        "meaningSource": "existing_dictionary",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V126",
        "kind": "vocabulary",
        "displayWord": "rainy",
        "lexemeRef": "W000697",
        "officialWordId": "W000697",
        "officialSenseId": null,
        "sensePos": "adj.",
        "targetMeaningZh": "下雨的",
        "chapterMeaningsZh": "下雨的",
        "sourcePage": 117,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "延伸",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "c57b3057051863330e466093b7724561edd5a33f2c89aa7b794c9d74bc585207",
      "expectedAfterRowSha256": "f8007fe5d6d33c291fb8f9662d0e59bc0d011527521544026bb54bd2cedd7138",
      "fields": {
        "targetMeaningZh": "下雨的",
        "chapterMeaningsZh": "下雨的",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101211.jpg",
            "page": 117,
            "sha256": "c993a3403ccbfcc7cf9c0de2a1bcfc74de8410f407c1ac204a03537f9616f77b",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "rainy adj. 下雨的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101211.jpg",
            "page": 117,
            "sha256": "c993a3403ccbfcc7cf9c0de2a1bcfc74de8410f407c1ac204a03537f9616f77b",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "rainy adj. 下雨的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101211.jpg",
            "page": 117,
            "sha256": "c993a3403ccbfcc7cf9c0de2a1bcfc74de8410f407c1ac204a03537f9616f77b",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "rainy adj. 下雨的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V127",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V127",
        "kind": "vocabulary",
        "displayWord": "snowy",
        "lexemeRef": "W001813",
        "officialWordId": "W001813",
        "officialSenseId": null,
        "sensePos": "adj.",
        "targetMeaningZh": "多雪的；雪的；被雪所覆蓋着的；下雪的",
        "chapterMeaningsZh": "多雪的；雪的；被雪所覆蓋着的；下雪的",
        "sourcePage": 117,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "延伸",
        "meaningSource": "existing_dictionary",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V127",
        "kind": "vocabulary",
        "displayWord": "snowy",
        "lexemeRef": "W001813",
        "officialWordId": "W001813",
        "officialSenseId": null,
        "sensePos": "adj.",
        "targetMeaningZh": "下雪的",
        "chapterMeaningsZh": "下雪的",
        "sourcePage": 117,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "延伸",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "eb08bf2d416aac8b62b4d385b539c38f1486621c49db524b8a7ecb6177a146fa",
      "expectedAfterRowSha256": "cce0834a76bbfb8abe304a33c87a461b15936e4d7a71aa724b27bc9cb7bc9740",
      "fields": {
        "targetMeaningZh": "下雪的",
        "chapterMeaningsZh": "下雪的",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101211.jpg",
            "page": 117,
            "sha256": "c993a3403ccbfcc7cf9c0de2a1bcfc74de8410f407c1ac204a03537f9616f77b",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "snowy adj. 下雪的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101211.jpg",
            "page": 117,
            "sha256": "c993a3403ccbfcc7cf9c0de2a1bcfc74de8410f407c1ac204a03537f9616f77b",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "snowy adj. 下雪的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101211.jpg",
            "page": 117,
            "sha256": "c993a3403ccbfcc7cf9c0de2a1bcfc74de8410f407c1ac204a03537f9616f77b",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "snowy adj. 下雪的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V128",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V128",
        "kind": "vocabulary",
        "displayWord": "windy",
        "lexemeRef": "W001986",
        "officialWordId": "W001986",
        "officialSenseId": null,
        "sensePos": "adj.",
        "targetMeaningZh": "多風的；風強的；腹脹的；吹牛的",
        "chapterMeaningsZh": "多風的；風強的；腹脹的；吹牛的",
        "sourcePage": 117,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "延伸",
        "meaningSource": "existing_dictionary",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V128",
        "kind": "vocabulary",
        "displayWord": "windy",
        "lexemeRef": "W001986",
        "officialWordId": "W001986",
        "officialSenseId": null,
        "sensePos": "adj.",
        "targetMeaningZh": "多風的",
        "chapterMeaningsZh": "多風的",
        "sourcePage": 117,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "延伸",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "596bf08982c3271094142336f0d4e3a2871a0f5bfcae801161be75b48f34cfb8",
      "expectedAfterRowSha256": "a247b04b0c70c83c3fcd7985a298403f9018a28294c290406d20b2b756c4f2fb",
      "fields": {
        "targetMeaningZh": "多風的",
        "chapterMeaningsZh": "多風的",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101211.jpg",
            "page": 117,
            "sha256": "c993a3403ccbfcc7cf9c0de2a1bcfc74de8410f407c1ac204a03537f9616f77b",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "windy adj. 多風的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101211.jpg",
            "page": 117,
            "sha256": "c993a3403ccbfcc7cf9c0de2a1bcfc74de8410f407c1ac204a03537f9616f77b",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "windy adj. 多風的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101211.jpg",
            "page": 117,
            "sha256": "c993a3403ccbfcc7cf9c0de2a1bcfc74de8410f407c1ac204a03537f9616f77b",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "windy adj. 多風的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V129",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V129",
        "kind": "vocabulary",
        "displayWord": "stupid",
        "lexemeRef": "W000838",
        "officialWordId": "W000838",
        "officialSenseId": null,
        "sensePos": "adj.",
        "targetMeaningZh": "愚蠢的；麻木的",
        "chapterMeaningsZh": "愚蠢的；麻木的",
        "sourcePage": 117,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "似",
        "meaningSource": "existing_dictionary",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V129",
        "kind": "vocabulary",
        "displayWord": "stupid",
        "lexemeRef": "W000838",
        "officialWordId": "W000838",
        "officialSenseId": null,
        "sensePos": "adj.",
        "targetMeaningZh": "愚蠢的",
        "chapterMeaningsZh": "愚蠢的",
        "sourcePage": 117,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "似",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "069bddf32f1230172c8d1be950c32458de56970ebc1bd112cd1614e796d04ed1",
      "expectedAfterRowSha256": "33e8292daa8901ce02b975a91d16a10b28448b290cf915a0d0327aa704fc2e83",
      "fields": {
        "targetMeaningZh": "愚蠢的",
        "chapterMeaningsZh": "愚蠢的",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101211.jpg",
            "page": 117,
            "sha256": "c993a3403ccbfcc7cf9c0de2a1bcfc74de8410f407c1ac204a03537f9616f77b",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "stupid adj. 愚蠢的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101211.jpg",
            "page": 117,
            "sha256": "c993a3403ccbfcc7cf9c0de2a1bcfc74de8410f407c1ac204a03537f9616f77b",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "stupid adj. 愚蠢的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101211.jpg",
            "page": 117,
            "sha256": "c993a3403ccbfcc7cf9c0de2a1bcfc74de8410f407c1ac204a03537f9616f77b",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "stupid adj. 愚蠢的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V130",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "sensePos",
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V130",
        "kind": "vocabulary",
        "displayWord": "mute",
        "lexemeRef": "W005591",
        "officialWordId": "W005591",
        "officialSenseId": null,
        "sensePos": "adj./v./n.",
        "targetMeaningZh": "啞子；啞音字母；弱音器；啞的",
        "chapterMeaningsZh": "啞子；啞音字母；弱音器；啞的",
        "sourcePage": 117,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "似",
        "meaningSource": "existing_dictionary",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V130",
        "kind": "vocabulary",
        "displayWord": "mute",
        "lexemeRef": "W005591",
        "officialWordId": "W005591",
        "officialSenseId": null,
        "sensePos": "adj.",
        "targetMeaningZh": "啞的",
        "chapterMeaningsZh": "啞的",
        "sourcePage": 117,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "似",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "41fec4ad9e3fee2bd2869387792b7c9f7d5ce3e34fc22e8e3ac00f6582e4e9c2",
      "expectedAfterRowSha256": "86cfc4d285c75129f8e27ebf642065fe876e8d9781d27a67a81bcd01bec2e79d",
      "fields": {
        "sensePos": "adj.",
        "targetMeaningZh": "啞的",
        "chapterMeaningsZh": "啞的",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "sensePos": [
          {
            "type": "textbook_photo",
            "file": "20260815_101211.jpg",
            "page": 117,
            "sha256": "c993a3403ccbfcc7cf9c0de2a1bcfc74de8410f407c1ac204a03537f9616f77b",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "mute adj. 啞的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101211.jpg",
            "page": 117,
            "sha256": "c993a3403ccbfcc7cf9c0de2a1bcfc74de8410f407c1ac204a03537f9616f77b",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "mute adj. 啞的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101211.jpg",
            "page": 117,
            "sha256": "c993a3403ccbfcc7cf9c0de2a1bcfc74de8410f407c1ac204a03537f9616f77b",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "mute adj. 啞的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101211.jpg",
            "page": 117,
            "sha256": "c993a3403ccbfcc7cf9c0de2a1bcfc74de8410f407c1ac204a03537f9616f77b",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "mute adj. 啞的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V131",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "sensePos",
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V131",
        "kind": "vocabulary",
        "displayWord": "blind",
        "lexemeRef": "W000096",
        "officialWordId": "W000096",
        "officialSenseId": null,
        "sensePos": "adj./v.",
        "targetMeaningZh": "矇蔽物；窗簾；盲目的；瞎的",
        "chapterMeaningsZh": "矇蔽物；窗簾；盲目的；瞎的",
        "sourcePage": 118,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "延伸",
        "meaningSource": "existing_dictionary",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V131",
        "kind": "vocabulary",
        "displayWord": "blind",
        "lexemeRef": "W000096",
        "officialWordId": "W000096",
        "officialSenseId": null,
        "sensePos": "adj.",
        "targetMeaningZh": "盲的",
        "chapterMeaningsZh": "盲的",
        "sourcePage": 118,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "延伸",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "c083e168c7936046067e5e8d9776a6b8783ceabe27f5397145079f6ca501a8da",
      "expectedAfterRowSha256": "63f1c25e3ef50bfa18db89f4e1815679bc68c0a70c8b072224bc6ec5433dba56",
      "fields": {
        "sensePos": "adj.",
        "targetMeaningZh": "盲的",
        "chapterMeaningsZh": "盲的",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "sensePos": [
          {
            "type": "textbook_photo",
            "file": "20260815_101223.jpg",
            "page": 118,
            "sha256": "daced8e490b64cdb43c6ff4b71a144ba3b80a0ee6e2d37531cbf5e6d08eecd29",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "blind adj. 盲的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101223.jpg",
            "page": 118,
            "sha256": "daced8e490b64cdb43c6ff4b71a144ba3b80a0ee6e2d37531cbf5e6d08eecd29",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "blind adj. 盲的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101223.jpg",
            "page": 118,
            "sha256": "daced8e490b64cdb43c6ff4b71a144ba3b80a0ee6e2d37531cbf5e6d08eecd29",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "blind adj. 盲的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101223.jpg",
            "page": 118,
            "sha256": "daced8e490b64cdb43c6ff4b71a144ba3b80a0ee6e2d37531cbf5e6d08eecd29",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "blind adj. 盲的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V132",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V132",
        "kind": "vocabulary",
        "displayWord": "deaf",
        "lexemeRef": "W001228",
        "officialWordId": "W001228",
        "officialSenseId": null,
        "sensePos": "adj.",
        "targetMeaningZh": "聾的",
        "chapterMeaningsZh": "聾的",
        "sourcePage": 118,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "延伸",
        "meaningSource": "existing_dictionary",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V132",
        "kind": "vocabulary",
        "displayWord": "deaf",
        "lexemeRef": "W001228",
        "officialWordId": "W001228",
        "officialSenseId": null,
        "sensePos": "adj.",
        "targetMeaningZh": "失聰的",
        "chapterMeaningsZh": "失聰的",
        "sourcePage": 118,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "延伸",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "14c785254a615b4e55a17effa00d853acc50e876250894900dffe00bbbdd69f6",
      "expectedAfterRowSha256": "bf6376e162e199522ea130c275b538e2ece8365562965809a13da8e22d4ed6ba",
      "fields": {
        "targetMeaningZh": "失聰的",
        "chapterMeaningsZh": "失聰的",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101223.jpg",
            "page": 118,
            "sha256": "daced8e490b64cdb43c6ff4b71a144ba3b80a0ee6e2d37531cbf5e6d08eecd29",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "deaf adj. 失聰的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101223.jpg",
            "page": 118,
            "sha256": "daced8e490b64cdb43c6ff4b71a144ba3b80a0ee6e2d37531cbf5e6d08eecd29",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "deaf adj. 失聰的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101223.jpg",
            "page": 118,
            "sha256": "daced8e490b64cdb43c6ff4b71a144ba3b80a0ee6e2d37531cbf5e6d08eecd29",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "deaf adj. 失聰的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V133",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "sensePos",
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V133",
        "kind": "vocabulary",
        "displayWord": "pumper",
        "lexemeRef": "pumper",
        "officialWordId": null,
        "officialSenseId": null,
        "sensePos": "",
        "targetMeaningZh": "教材補充詞；義項待核對。",
        "chapterMeaningsZh": "教材補充詞；義項待核對。",
        "sourcePage": 118,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "衍",
        "meaningSource": "unmapped_supplement",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V133",
        "kind": "vocabulary",
        "displayWord": "pumper",
        "lexemeRef": "pumper",
        "officialWordId": null,
        "officialSenseId": null,
        "sensePos": "n.",
        "targetMeaningZh": "抽水機",
        "chapterMeaningsZh": "抽水機",
        "sourcePage": 118,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "衍",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "544c36dbe3615e98aa08fbef7c4a0fe974302af9fbf8374ef3a8836ea979944d",
      "expectedAfterRowSha256": "c3db44866ac4ff79e1a42443d50f53c5ac771f5aee2284e80d72c4ee49fc2a70",
      "fields": {
        "sensePos": "n.",
        "targetMeaningZh": "抽水機",
        "chapterMeaningsZh": "抽水機",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "sensePos": [
          {
            "type": "textbook_photo",
            "file": "20260815_101223.jpg",
            "page": 118,
            "sha256": "daced8e490b64cdb43c6ff4b71a144ba3b80a0ee6e2d37531cbf5e6d08eecd29",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "pumper n. 抽水機",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101223.jpg",
            "page": 118,
            "sha256": "daced8e490b64cdb43c6ff4b71a144ba3b80a0ee6e2d37531cbf5e6d08eecd29",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "pumper n. 抽水機",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101223.jpg",
            "page": 118,
            "sha256": "daced8e490b64cdb43c6ff4b71a144ba3b80a0ee6e2d37531cbf5e6d08eecd29",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "pumper n. 抽水機",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101223.jpg",
            "page": 118,
            "sha256": "daced8e490b64cdb43c6ff4b71a144ba3b80a0ee6e2d37531cbf5e6d08eecd29",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "pumper n. 抽水機",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V134",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "sensePos",
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V134",
        "kind": "vocabulary",
        "displayWord": "add",
        "lexemeRef": "W000011",
        "officialWordId": "W000011",
        "officialSenseId": null,
        "sensePos": "v.",
        "targetMeaningZh": "增加；添加；附帶說明；計算...總和",
        "chapterMeaningsZh": "增加；添加；附帶說明；計算...總和",
        "sourcePage": 118,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "反",
        "meaningSource": "existing_dictionary",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V134",
        "kind": "vocabulary",
        "displayWord": "add",
        "lexemeRef": "W000011",
        "officialWordId": "W000011",
        "officialSenseId": null,
        "sensePos": "vt.",
        "targetMeaningZh": "增加",
        "chapterMeaningsZh": "增加",
        "sourcePage": 118,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "反",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "d107caec37aac71d4d1a8ea8ddfd0ceac1912676bacc3a61e2d19df39a05346e",
      "expectedAfterRowSha256": "73af75e40c277f096f55cb046dc49fa180e187fddb73e39a93f62d7ff4f05bb2",
      "fields": {
        "sensePos": "vt.",
        "targetMeaningZh": "增加",
        "chapterMeaningsZh": "增加",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "sensePos": [
          {
            "type": "textbook_photo",
            "file": "20260815_101223.jpg",
            "page": 118,
            "sha256": "daced8e490b64cdb43c6ff4b71a144ba3b80a0ee6e2d37531cbf5e6d08eecd29",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "add vt. 增加",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101223.jpg",
            "page": 118,
            "sha256": "daced8e490b64cdb43c6ff4b71a144ba3b80a0ee6e2d37531cbf5e6d08eecd29",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "add vt. 增加",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101223.jpg",
            "page": 118,
            "sha256": "daced8e490b64cdb43c6ff4b71a144ba3b80a0ee6e2d37531cbf5e6d08eecd29",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "add vt. 增加",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101223.jpg",
            "page": 118,
            "sha256": "daced8e490b64cdb43c6ff4b71a144ba3b80a0ee6e2d37531cbf5e6d08eecd29",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "add vt. 增加",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V135",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "sensePos",
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V135",
        "kind": "vocabulary",
        "displayWord": "plus",
        "lexemeRef": "W001640",
        "officialWordId": "W001640",
        "officialSenseId": null,
        "sensePos": "prep./n./adj.",
        "targetMeaningZh": "加上；加；外加；正的",
        "chapterMeaningsZh": "加上；加；外加；正的",
        "sourcePage": 118,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "反",
        "meaningSource": "existing_dictionary",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V135",
        "kind": "vocabulary",
        "displayWord": "plus",
        "lexemeRef": "W001640",
        "officialWordId": "W001640",
        "officialSenseId": null,
        "sensePos": "prep.",
        "targetMeaningZh": "（算數）加",
        "chapterMeaningsZh": "（算數）加",
        "sourcePage": 118,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "反",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "b82f79f8ce8da8133bcd876169178e6e7699cf96945a70602792d4c29b4a5588",
      "expectedAfterRowSha256": "b3b70e142f03851fea641bfcdfa106f66fa9cc3081c895e7dc44e2b96c105301",
      "fields": {
        "sensePos": "prep.",
        "targetMeaningZh": "（算數）加",
        "chapterMeaningsZh": "（算數）加",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "sensePos": [
          {
            "type": "textbook_photo",
            "file": "20260815_101223.jpg",
            "page": 118,
            "sha256": "daced8e490b64cdb43c6ff4b71a144ba3b80a0ee6e2d37531cbf5e6d08eecd29",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "plus prep. （算數）加",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101223.jpg",
            "page": 118,
            "sha256": "daced8e490b64cdb43c6ff4b71a144ba3b80a0ee6e2d37531cbf5e6d08eecd29",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "plus prep. （算數）加",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101223.jpg",
            "page": 118,
            "sha256": "daced8e490b64cdb43c6ff4b71a144ba3b80a0ee6e2d37531cbf5e6d08eecd29",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "plus prep. （算數）加",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101223.jpg",
            "page": 118,
            "sha256": "daced8e490b64cdb43c6ff4b71a144ba3b80a0ee6e2d37531cbf5e6d08eecd29",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "plus prep. （算數）加",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V136",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "sensePos",
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V136",
        "kind": "vocabulary",
        "displayWord": "times",
        "lexemeRef": "times",
        "officialWordId": null,
        "officialSenseId": null,
        "sensePos": "",
        "targetMeaningZh": "教材補充詞；義項待核對。",
        "chapterMeaningsZh": "教材補充詞；義項待核對。",
        "sourcePage": 118,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "似",
        "meaningSource": "unmapped_supplement",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V136",
        "kind": "vocabulary",
        "displayWord": "times",
        "lexemeRef": "times",
        "officialWordId": null,
        "officialSenseId": null,
        "sensePos": "prep./vt.",
        "targetMeaningZh": "數字相乘",
        "chapterMeaningsZh": "數字相乘",
        "sourcePage": 118,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "似",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "65e99151448acd90ac802106a9129de3a6b8bb1dd98d12d351d9ef23e75250cc",
      "expectedAfterRowSha256": "2be55a498450e8e82c1880e7bd8b8a2d6e09de4a796ef25991b86877d36ce523",
      "fields": {
        "sensePos": "prep./vt.",
        "targetMeaningZh": "數字相乘",
        "chapterMeaningsZh": "數字相乘",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "sensePos": [
          {
            "type": "textbook_photo",
            "file": "20260815_101223.jpg",
            "page": 118,
            "sha256": "daced8e490b64cdb43c6ff4b71a144ba3b80a0ee6e2d37531cbf5e6d08eecd29",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "times prep./vt. 數字相乘",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101223.jpg",
            "page": 118,
            "sha256": "daced8e490b64cdb43c6ff4b71a144ba3b80a0ee6e2d37531cbf5e6d08eecd29",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "times prep./vt. 數字相乘",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101223.jpg",
            "page": 118,
            "sha256": "daced8e490b64cdb43c6ff4b71a144ba3b80a0ee6e2d37531cbf5e6d08eecd29",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "times prep./vt. 數字相乘",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101223.jpg",
            "page": 118,
            "sha256": "daced8e490b64cdb43c6ff4b71a144ba3b80a0ee6e2d37531cbf5e6d08eecd29",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "times prep./vt. 數字相乘",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-V137",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "sensePos",
        "targetMeaningZh",
        "chapterMeaningsZh",
        "meaningSource"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-V137",
        "kind": "vocabulary",
        "displayWord": "divide",
        "lexemeRef": "W001269",
        "officialWordId": "W001269",
        "officialSenseId": null,
        "sensePos": "v./n.",
        "targetMeaningZh": "分開；分配；分裂；分",
        "chapterMeaningsZh": "分開；分配；分裂；分",
        "sourcePage": 118,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "反",
        "meaningSource": "existing_dictionary",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-V137",
        "kind": "vocabulary",
        "displayWord": "divide",
        "lexemeRef": "W001269",
        "officialWordId": "W001269",
        "officialSenseId": null,
        "sensePos": "vt.",
        "targetMeaningZh": "除以",
        "chapterMeaningsZh": "除以",
        "sourcePage": 118,
        "printedNumber": null,
        "sourceRole": "printed_related_word",
        "printedLabel": "反",
        "meaningSource": "textbook_source_review",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "1ae117e7bac62c2f7bed768083cb0c8504b1a1756f7c085ea0752e4215d54523",
      "expectedAfterRowSha256": "1d0cf67b8ec65aa99a18cd48a3d0a81e526a0dc823e9cc3cb0025a4c0d9e7cdd",
      "fields": {
        "sensePos": "vt.",
        "targetMeaningZh": "除以",
        "chapterMeaningsZh": "除以",
        "meaningSource": "textbook_source_review"
      },
      "sources": {
        "sensePos": [
          {
            "type": "textbook_photo",
            "file": "20260815_101223.jpg",
            "page": 118,
            "sha256": "daced8e490b64cdb43c6ff4b71a144ba3b80a0ee6e2d37531cbf5e6d08eecd29",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "divide vt. 除以",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "targetMeaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101223.jpg",
            "page": 118,
            "sha256": "daced8e490b64cdb43c6ff4b71a144ba3b80a0ee6e2d37531cbf5e6d08eecd29",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "divide vt. 除以",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "chapterMeaningsZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101223.jpg",
            "page": 118,
            "sha256": "daced8e490b64cdb43c6ff4b71a144ba3b80a0ee6e2d37531cbf5e6d08eecd29",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "divide vt. 除以",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningSource": [
          {
            "type": "textbook_photo",
            "file": "20260815_101223.jpg",
            "page": 118,
            "sha256": "daced8e490b64cdb43c6ff4b71a144ba3b80a0ee6e2d37531cbf5e6d08eecd29",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "divide vt. 除以",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "review_status",
            "status": "textbook_source_review",
            "basis": "本列已依sources所列U11原照片實像逐筆核對；教材本章義項為來源審閱結果，非僅原始轉錄。",
            "contractReferences": [
              "scripts/lv3_audit_pipeline.py:698-700",
              "src/features/direct/lv3Audit.testSupport.ts:606"
            ],
            "scope": "只校正審閱狀態metadata，不改詞義、詞性或照片證據。"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "words",
      "id": "W002836",
      "path": "public/data/v1/words.json",
      "key": "wordId",
      "changedFields": [
        "pos",
        "posAll",
        "meaningZh",
        "meaningEn",
        "verbForms"
      ],
      "beforeRow": {
        "wordId": "W002836",
        "word": "stable",
        "wordVariants": [
          "stable"
        ],
        "level": "LV3",
        "pos": "adj.",
        "posAll": [
          "adj."
        ],
        "meaningZh": "馬房；牛棚；穩定的；安定的",
        "meaningEn": "a farm building for housing horses or other livestock; shelter in a stable",
        "usagePattern": "be stable; stable + N",
        "syllables": null,
        "stressPattern": null,
        "phoneticUs": null,
        "familyKey": "stable",
        "isCore": true,
        "sourceNote": "高中英文參考詞彙表（111學年度起適用，大考中心）",
        "status": "draft",
        "usagePatternZh": "表現得穩定；穩定的狀態"
      },
      "expectedAfterRow": {
        "wordId": "W002836",
        "word": "stable",
        "wordVariants": [
          "stable"
        ],
        "level": "LV3",
        "pos": "adj./n./v.",
        "posAll": [
          "adj.",
          "n.",
          "v."
        ],
        "meaningZh": "（形容詞）穩定的；安定的；（名詞）馬房；牛棚；（動詞）把馬等安置於廄中",
        "meaningEn": "(adj.) remaining steady and unlikely to change suddenly; (n.) a building for keeping horses or other livestock; (v.) to put or keep an animal in a stable.",
        "usagePattern": "be stable; stable + N",
        "syllables": null,
        "stressPattern": null,
        "phoneticUs": null,
        "familyKey": "stable",
        "isCore": true,
        "sourceNote": "高中英文參考詞彙表（111學年度起適用，大考中心）",
        "status": "draft",
        "usagePatternZh": "表現得穩定；穩定的狀態",
        "verbForms": {
          "base": "stable",
          "past": "stabled",
          "pastParticiple": "stabled",
          "sourceRef": "https://www.collinsdictionary.com/dictionary/english/stable",
          "status": "approved"
        }
      },
      "beforeRowSha256": "04046efe09b5072d0c25ad66b83e8f7a2a2d4178a30a8afefb2ec1debe56c760",
      "expectedAfterRowSha256": "633cb233407106c0fa4de31f559c64511aacbec778ec042585807c2732bca010",
      "fields": {
        "pos": "adj./n./v.",
        "posAll": [
          "adj.",
          "n.",
          "v."
        ],
        "meaningZh": "（形容詞）穩定的；安定的；（名詞）馬房；牛棚；（動詞）把馬等安置於廄中",
        "meaningEn": "(adj.) remaining steady and unlikely to change suddenly; (n.) a building for keeping horses or other livestock; (v.) to put or keep an animal in a stable.",
        "verbForms": {
          "base": "stable",
          "past": "stabled",
          "pastParticiple": "stabled",
          "sourceRef": "https://www.collinsdictionary.com/dictionary/english/stable",
          "status": "approved"
        }
      },
      "sources": {
        "pos": [
          {
            "type": "dictionary",
            "url": "https://www.collinsdictionary.com/dictionary/english/stable",
            "excerpt": "not likely to change",
            "summary": "正文列穩定的形容詞、飼養馬匹的建築名詞及把馬安置入廄的動詞。",
            "locator": "COBUILD senses 1–8, lines 224–281",
            "verification": "web_text_direct_or_indexed_dictionary_text_read",
            "readDate": "2026-11-08"
          },
          {
            "type": "textbook_photo",
            "file": "20260815_101110.jpg",
            "page": 112,
            "sha256": "f465aa4501b701ba249c53556cf681d2be3f1d1f28a3656f31b6da8910201bf9",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "stable adj. 穩定的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "posAll": [
          {
            "type": "dictionary",
            "url": "https://www.collinsdictionary.com/dictionary/english/stable",
            "excerpt": "not likely to change",
            "summary": "正文列穩定的形容詞、飼養馬匹的建築名詞及把馬安置入廄的動詞。",
            "locator": "COBUILD senses 1–8, lines 224–281",
            "verification": "web_text_direct_or_indexed_dictionary_text_read",
            "readDate": "2026-11-08"
          },
          {
            "type": "textbook_photo",
            "file": "20260815_101110.jpg",
            "page": 112,
            "sha256": "f465aa4501b701ba249c53556cf681d2be3f1d1f28a3656f31b6da8910201bf9",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "stable adj. 穩定的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningZh": [
          {
            "type": "dictionary",
            "url": "https://www.collinsdictionary.com/dictionary/english/stable",
            "excerpt": "not likely to change",
            "summary": "正文列穩定的形容詞、飼養馬匹的建築名詞及把馬安置入廄的動詞。",
            "locator": "COBUILD senses 1–8, lines 224–281",
            "verification": "web_text_direct_or_indexed_dictionary_text_read",
            "readDate": "2026-11-08"
          },
          {
            "type": "textbook_photo",
            "file": "20260815_101110.jpg",
            "page": 112,
            "sha256": "f465aa4501b701ba249c53556cf681d2be3f1d1f28a3656f31b6da8910201bf9",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "stable adj. 穩定的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningEn": [
          {
            "type": "dictionary",
            "url": "https://www.collinsdictionary.com/dictionary/english/stable",
            "excerpt": "not likely to change",
            "summary": "正文列穩定的形容詞、飼養馬匹的建築名詞及把馬安置入廄的動詞。",
            "locator": "COBUILD senses 1–8, lines 224–281",
            "verification": "web_text_direct_or_indexed_dictionary_text_read",
            "readDate": "2026-11-08"
          },
          {
            "type": "textbook_photo",
            "file": "20260815_101110.jpg",
            "page": 112,
            "sha256": "f465aa4501b701ba249c53556cf681d2be3f1d1f28a3656f31b6da8910201bf9",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "stable adj. 穩定的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "url": "https://www.collinsdictionary.com/dictionary/english/stable",
            "locator": "COBUILD sense1 L224–226; British English2 sense1 L395–399",
            "excerpt": "steady in position",
            "sense": "adj stable",
            "interpretation": "Added adjective: stable over time or in position.",
            "retrieval": "Direct web open of dictionary body, followed by open/find within the same body; not a search-result snippet."
          },
          {
            "url": "https://www.collinsdictionary.com/dictionary/english/stable",
            "locator": "British English1 sense1 L333–337",
            "excerpt": "horses or other livestock",
            "sense": "noun livestock building",
            "interpretation": "Retains original building and livestock sense.",
            "retrieval": "Direct web open of dictionary body, followed by open/find within the same body; not a search-result snippet."
          },
          {
            "url": "https://www.collinsdictionary.com/dictionary/english/stable",
            "locator": "British English1 sense7 L376–380",
            "excerpt": "to put, keep, or be kept",
            "sense": "verb housing",
            "interpretation": "Retains original shelter/house sense.",
            "retrieval": "Direct web open of dictionary body, followed by open/find within the same body; not a search-result snippet."
          }
        ],
        "verbForms": [
          {
            "word": "stable",
            "url": "https://www.collinsdictionary.com/dictionary/english/stable",
            "excerpt": "past tense, past participle stabled",
            "location": "L222"
          }
        ]
      },
      "starterIncluded": true
    },
    {
      "dataset": "words",
      "id": "W004264",
      "path": "public/data/v1/words.json",
      "key": "wordId",
      "changedFields": [
        "pos",
        "posAll",
        "meaningZh",
        "meaningEn",
        "verbForms"
      ],
      "beforeRow": {
        "wordId": "W004264",
        "word": "debut",
        "wordVariants": [
          "debut"
        ],
        "level": "LV5",
        "pos": "n.",
        "posAll": [
          "n."
        ],
        "meaningZh": "初次登臺；開張",
        "meaningEn": "a person's first public appearance or performance",
        "usagePattern": "make one's debut; debut as/in + role",
        "syllables": null,
        "stressPattern": null,
        "phoneticUs": null,
        "familyKey": "debut",
        "isCore": true,
        "sourceNote": "高中英文參考詞彙表（111學年度起適用，大考中心）",
        "status": "reviewed",
        "usagePatternZh": "初次登台；以……角色初次亮相"
      },
      "expectedAfterRow": {
        "wordId": "W004264",
        "word": "debut",
        "wordVariants": [
          "debut"
        ],
        "level": "LV5",
        "pos": "n./v.",
        "posAll": [
          "n.",
          "v."
        ],
        "meaningZh": "（名詞）初次登臺；開張；（動詞）首次亮相；初次登場",
        "meaningEn": "(n.) a first public appearance or performance; (v.) to appear or perform publicly for the first time.",
        "usagePattern": "make one's debut; debut as/in + role",
        "syllables": null,
        "stressPattern": null,
        "phoneticUs": null,
        "familyKey": "debut",
        "isCore": true,
        "sourceNote": "高中英文參考詞彙表（111學年度起適用，大考中心）",
        "status": "reviewed",
        "usagePatternZh": "初次登台；以……角色初次亮相",
        "verbForms": {
          "base": "debut",
          "past": "debuted",
          "pastParticiple": "debuted",
          "sourceRef": "https://www.dictionary.com/browse/debuted",
          "status": "approved"
        }
      },
      "beforeRowSha256": "fe2e38f2354e819fe030f8576541e1dd271bff4b375d959b0a7aff9c1a0f515b",
      "expectedAfterRowSha256": "18fdc8735522833a005e3e5f54b8f42231f2e3ca1b3416768baa6e126af13480",
      "fields": {
        "pos": "n./v.",
        "posAll": [
          "n.",
          "v."
        ],
        "meaningZh": "（名詞）初次登臺；開張；（動詞）首次亮相；初次登場",
        "meaningEn": "(n.) a first public appearance or performance; (v.) to appear or perform publicly for the first time.",
        "verbForms": {
          "base": "debut",
          "past": "debuted",
          "pastParticiple": "debuted",
          "sourceRef": "https://www.dictionary.com/browse/debuted",
          "status": "approved"
        }
      },
      "sources": {
        "pos": [
          {
            "type": "dictionary",
            "url": "https://www.collinsdictionary.com/dictionary/english/debut",
            "excerpt": "verb (intransitive); to make a debut",
            "summary": "名詞首次公開亮相；動詞首次登場。原例句 The new phone will debut 使用動詞。",
            "locator": "Collins British sense 3, lines 283–287",
            "verification": "web_text_direct_or_indexed_dictionary_text_read",
            "readDate": "2026-11-08"
          }
        ],
        "posAll": [
          {
            "type": "dictionary",
            "url": "https://www.collinsdictionary.com/dictionary/english/debut",
            "excerpt": "verb (intransitive); to make a debut",
            "summary": "名詞首次公開亮相；動詞首次登場。原例句 The new phone will debut 使用動詞。",
            "locator": "Collins British sense 3, lines 283–287",
            "verification": "web_text_direct_or_indexed_dictionary_text_read",
            "readDate": "2026-11-08"
          }
        ],
        "meaningZh": [
          {
            "type": "dictionary",
            "url": "https://www.collinsdictionary.com/dictionary/english/debut",
            "excerpt": "verb (intransitive); to make a debut",
            "summary": "名詞首次公開亮相；動詞首次登場。原例句 The new phone will debut 使用動詞。",
            "locator": "Collins British sense 3, lines 283–287",
            "verification": "web_text_direct_or_indexed_dictionary_text_read",
            "readDate": "2026-11-08"
          }
        ],
        "meaningEn": [
          {
            "type": "dictionary",
            "url": "https://www.collinsdictionary.com/dictionary/english/debut",
            "excerpt": "verb (intransitive); to make a debut",
            "summary": "名詞首次公開亮相；動詞首次登場。原例句 The new phone will debut 使用動詞。",
            "locator": "Collins British sense 3, lines 283–287",
            "verification": "web_text_direct_or_indexed_dictionary_text_read",
            "readDate": "2026-11-08"
          },
          {
            "url": "https://www.collinsdictionary.com/dictionary/english/debut",
            "locator": "COBUILD countable noun L224–226",
            "excerpt": "first public performance",
            "sense": "noun public first appearance",
            "interpretation": "Retains first public appearance or performance.",
            "retrieval": "Direct web open of dictionary body, followed by open/find within the same body; not a search-result snippet."
          },
          {
            "url": "https://www.collinsdictionary.com/dictionary/english/debut",
            "locator": "British English sense3 L283–287",
            "excerpt": "to make a debut",
            "sense": "verb first appearance",
            "interpretation": "Added intransitive verb explicitly defined.",
            "retrieval": "Direct web open of dictionary body, followed by open/find within the same body; not a search-result snippet."
          }
        ],
        "verbForms": [
          {
            "word": "debut",
            "url": "https://www.dictionary.com/browse/debuted",
            "excerpt": "debuted; past participle; of debut; past tense form; of debut",
            "location": "L11-33"
          }
        ]
      },
      "starterIncluded": true
    },
    {
      "dataset": "words",
      "id": "W002270",
      "path": "public/data/v1/words.json",
      "key": "wordId",
      "changedFields": [
        "meaningZh"
      ],
      "beforeRow": {
        "wordId": "W002270",
        "word": "dumb",
        "wordVariants": [
          "dumb"
        ],
        "level": "LV3",
        "pos": "adj.",
        "posAll": [
          "adj."
        ],
        "meaningZh": "啞的；不說話的；無聲音的",
        "meaningEn": "lacking the power of human speech; unable to speak because of hereditary deafness",
        "usagePattern": "be dumb; dumb + N",
        "syllables": null,
        "stressPattern": null,
        "phoneticUs": null,
        "familyKey": "dumb",
        "isCore": true,
        "sourceNote": "高中英文參考詞彙表（111學年度起適用，大考中心）",
        "status": "draft",
        "usagePatternZh": "啞的；愚蠢的……"
      },
      "expectedAfterRow": {
        "wordId": "W002270",
        "word": "dumb",
        "wordVariants": [
          "dumb"
        ],
        "level": "LV3",
        "pos": "adj.",
        "posAll": [
          "adj."
        ],
        "meaningZh": "愚蠢的；不說話的；無聲音的；啞的（指人不能說話時屬冒犯性用語）",
        "meaningEn": "lacking the power of human speech; unable to speak because of hereditary deafness",
        "usagePattern": "be dumb; dumb + N",
        "syllables": null,
        "stressPattern": null,
        "phoneticUs": null,
        "familyKey": "dumb",
        "isCore": true,
        "sourceNote": "高中英文參考詞彙表（111學年度起適用，大考中心）",
        "status": "draft",
        "usagePatternZh": "啞的；愚蠢的……"
      },
      "beforeRowSha256": "f9e6a283ae02625ccd2e0dfec41d6e08b963dafcb5cc1f5eb45d7d455741051b",
      "expectedAfterRowSha256": "cb99d9d10e4e5347cc61ab415df48dbc95330697c576d62eb0cc011e39e73ccf",
      "fields": {
        "meaningZh": "愚蠢的；不說話的；無聲音的；啞的（指人不能說話時屬冒犯性用語）"
      },
      "sources": {
        "meaningZh": [
          {
            "type": "dictionary",
            "url": "https://www.collinsdictionary.com/dictionary/english/dumb",
            "excerpt": "stupid or foolish; offensive",
            "summary": "形容詞另有愚蠢的；用於不能說話的人是冒犯性用語，不能據此推定失聰。",
            "locator": "COBUILD senses 1–3",
            "verification": "web_text_direct_or_indexed_dictionary_text_read",
            "readDate": "2026-11-08"
          },
          {
            "type": "textbook_photo",
            "file": "20260815_101211.jpg",
            "page": 117,
            "sha256": "c993a3403ccbfcc7cf9c0de2a1bcfc74de8410f407c1ac204a03537f9616f77b",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "dumb adj. 啞的；愚笨的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ]
      },
      "starterIncluded": true
    },
    {
      "dataset": "words",
      "id": "W002310",
      "path": "public/data/v1/words.json",
      "key": "wordId",
      "changedFields": [
        "meaningZh",
        "meaningEn",
        "usagePattern",
        "usagePatternZh",
        "verbForms"
      ],
      "beforeRow": {
        "wordId": "W002310",
        "word": "faint",
        "wordVariants": [
          "faint"
        ],
        "level": "LV3",
        "pos": "adj./v./n.",
        "posAll": [
          "adj.",
          "v.",
          "n."
        ],
        "meaningZh": "昏厥；昏倒；模糊的；微弱的",
        "meaningEn": "a spontaneous loss of consciousness caused by insufficient blood to the brain; pass out from weakness, physical or emotional distress due to a loss of blood supply to the brain",
        "usagePattern": "faint + N; faint to V; a/the faint",
        "syllables": null,
        "stressPattern": null,
        "phoneticUs": null,
        "familyKey": "faint",
        "isCore": true,
        "sourceNote": "高中英文參考詞彙表（111學年度起適用，大考中心）",
        "status": "draft",
        "usagePatternZh": "微弱的……；微弱地去做某事；昏厥"
      },
      "expectedAfterRow": {
        "wordId": "W002310",
        "word": "faint",
        "wordVariants": [
          "faint"
        ],
        "level": "LV3",
        "pos": "adj./v./n.",
        "posAll": [
          "adj.",
          "v.",
          "n."
        ],
        "meaningZh": "（形容詞）頭暈的；模糊的；微弱的；（動詞）昏倒；（名詞）昏厥",
        "meaningEn": "(adj.) weak, dim or barely noticeable; feeling as if about to lose consciousness; (v.) to lose consciousness briefly, as from weakness, pain, heat or shock; (n.) a brief, sudden loss of consciousness caused by inadequate blood flow to the brain.",
        "usagePattern": "feel faint; a faint voice; fall into a faint",
        "syllables": null,
        "stressPattern": null,
        "phoneticUs": null,
        "familyKey": "faint",
        "isCore": true,
        "sourceNote": "高中英文參考詞彙表（111學年度起適用，大考中心）",
        "status": "draft",
        "usagePatternZh": "感到頭暈；微弱的聲音；昏倒",
        "verbForms": {
          "base": "faint",
          "past": "fainted",
          "pastParticiple": "fainted",
          "sourceRef": "https://www.collinsdictionary.com/dictionary/english/faint",
          "status": "approved"
        }
      },
      "beforeRowSha256": "22dce65fbaacc04bd3be09d2cf02a6a166ddfd02e5bad5b2866029ce24a70eeb",
      "expectedAfterRowSha256": "338ef516c579092fa6b57a72d7c35cbd2cd80fa7976b2463d776abfb3c192129",
      "fields": {
        "meaningZh": "（形容詞）頭暈的；模糊的；微弱的；（動詞）昏倒；（名詞）昏厥",
        "meaningEn": "(adj.) weak, dim or barely noticeable; feeling as if about to lose consciousness; (v.) to lose consciousness briefly, as from weakness, pain, heat or shock; (n.) a brief, sudden loss of consciousness caused by inadequate blood flow to the brain.",
        "usagePattern": "feel faint; a faint voice; fall into a faint",
        "usagePatternZh": "感到頭暈；微弱的聲音；昏倒",
        "verbForms": {
          "base": "faint",
          "past": "fainted",
          "pastParticiple": "fainted",
          "sourceRef": "https://www.collinsdictionary.com/dictionary/english/faint",
          "status": "approved"
        }
      },
      "sources": {
        "meaningZh": [
          {
            "type": "dictionary",
            "url": "https://www.collinsdictionary.com/dictionary/english/faint",
            "excerpt": "has very little strength or intensity",
            "summary": "形容詞微弱、不清楚或感到將昏倒；動詞短暫失去意識；名詞昏厥。",
            "locator": "COBUILD senses 1,3,4, lines 224–284",
            "verification": "web_text_direct_or_indexed_dictionary_text_read",
            "readDate": "2026-11-08"
          },
          {
            "type": "textbook_photo",
            "file": "20260815_101056.jpg",
            "page": 110,
            "sha256": "509ee199bff48e08e4a590fa149b34d6d8655a75788ad24aa0d740fff1c198e6",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "faint adj./vi./n. 頭暈的；微弱的；暈倒；昏厥（恆用單數）",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningEn": [
          {
            "type": "dictionary",
            "url": "https://www.collinsdictionary.com/dictionary/english/faint",
            "excerpt": "has very little strength or intensity",
            "summary": "形容詞微弱、不清楚或感到將昏倒；動詞短暫失去意識；名詞昏厥。",
            "locator": "COBUILD senses 1,3,4, lines 224–284",
            "verification": "web_text_direct_or_indexed_dictionary_text_read",
            "readDate": "2026-11-08"
          },
          {
            "type": "textbook_photo",
            "file": "20260815_101056.jpg",
            "page": 110,
            "sha256": "509ee199bff48e08e4a590fa149b34d6d8655a75788ad24aa0d740fff1c198e6",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "faint adj./vi./n. 頭暈的；微弱的；暈倒；昏厥（恆用單數）",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "url": "https://www.collinsdictionary.com/dictionary/english/faint",
            "locator": "British English sense1 L326–328",
            "excerpt": "lacking clarity",
            "sense": "dim weak",
            "interpretation": "Added sensory weak/dim sense.",
            "retrieval": "Direct web open of dictionary body, followed by open/find within the same body; not a search-result snippet."
          },
          {
            "url": "https://www.collinsdictionary.com/dictionary/english/faint",
            "locator": "British English sense3 L338–340",
            "excerpt": "feeling dizzy or weak",
            "sense": "feeling faint",
            "interpretation": "Added near-unconscious feeling.",
            "retrieval": "Direct web open of dictionary body, followed by open/find within the same body; not a search-result snippet."
          },
          {
            "url": "https://www.collinsdictionary.com/dictionary/english/faint",
            "locator": "British English sense6 L348–352",
            "excerpt": "to lose consciousness",
            "sense": "verb loss of consciousness",
            "interpretation": "Retains passing-out sense; COBUILD sense3 L263–265 lists hunger, pain, heat, shock.",
            "retrieval": "Direct web open of dictionary body, followed by open/find within the same body; not a search-result snippet."
          },
          {
            "url": "https://www.collinsdictionary.com/dictionary/english/faint",
            "locator": "British English sense8 L357–363",
            "excerpt": "insufficient supply of blood",
            "sense": "noun blood-flow explanation",
            "interpretation": "Original physiological explanation directly supported. Restore explicit qualification rather than silently omit.",
            "retrieval": "Direct web open of dictionary body, followed by open/find within the same body; not a search-result snippet."
          }
        ],
        "usagePattern": [
          {
            "type": "dictionary",
            "url": "https://www.collinsdictionary.com/dictionary/english/faint",
            "excerpt": "has very little strength or intensity",
            "summary": "形容詞微弱、不清楚或感到將昏倒；動詞短暫失去意識；名詞昏厥。",
            "locator": "COBUILD senses 1,3,4, lines 224–284",
            "verification": "web_text_direct_or_indexed_dictionary_text_read",
            "readDate": "2026-11-08"
          },
          {
            "type": "textbook_photo",
            "file": "20260815_101056.jpg",
            "page": 110,
            "sha256": "509ee199bff48e08e4a590fa149b34d6d8655a75788ad24aa0d740fff1c198e6",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "faint adj./vi./n. 頭暈的；微弱的；暈倒；昏厥（恆用單數）",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "usagePatternZh": [
          {
            "type": "dictionary",
            "url": "https://www.collinsdictionary.com/dictionary/english/faint",
            "excerpt": "has very little strength or intensity",
            "summary": "形容詞微弱、不清楚或感到將昏倒；動詞短暫失去意識；名詞昏厥。",
            "locator": "COBUILD senses 1,3,4, lines 224–284",
            "verification": "web_text_direct_or_indexed_dictionary_text_read",
            "readDate": "2026-11-08"
          },
          {
            "type": "textbook_photo",
            "file": "20260815_101056.jpg",
            "page": 110,
            "sha256": "509ee199bff48e08e4a590fa149b34d6d8655a75788ad24aa0d740fff1c198e6",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "faint adj./vi./n. 頭暈的；微弱的；暈倒；昏厥（恆用單數）",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "verbForms": [
          {
            "word": "faint",
            "url": "https://www.collinsdictionary.com/dictionary/english/faint",
            "excerpt": "past tense, past participle fainted",
            "location": "L222"
          }
        ]
      },
      "starterIncluded": true
    },
    {
      "dataset": "words",
      "id": "W005591",
      "path": "public/data/v1/words.json",
      "key": "wordId",
      "changedFields": [
        "meaningZh",
        "meaningEn",
        "usagePattern",
        "usagePatternZh",
        "verbForms"
      ],
      "beforeRow": {
        "wordId": "W005591",
        "word": "mute",
        "wordVariants": [
          "mute"
        ],
        "level": "LV6",
        "pos": "adj./v./n.",
        "posAll": [
          "adj.",
          "v.",
          "n."
        ],
        "meaningZh": "啞子；啞音字母；弱音器；啞的",
        "meaningEn": "a deaf person who is unable to speak; a device used to soften the tone of a musical instrument",
        "usagePattern": "mute + N; mute to V; a/the mute",
        "syllables": null,
        "stressPattern": null,
        "phoneticUs": null,
        "familyKey": "mute",
        "isCore": true,
        "sourceNote": "高中英文參考詞彙表（111學年度起適用，大考中心）",
        "status": "draft",
        "usagePatternZh": "使……靜音；靜音以……；該啞巴"
      },
      "expectedAfterRow": {
        "wordId": "W005591",
        "word": "mute",
        "wordVariants": [
          "mute"
        ],
        "level": "LV6",
        "pos": "adj./v./n.",
        "posAll": [
          "adj.",
          "v.",
          "n."
        ],
        "meaningZh": "（形容詞）沉默的；啞的（指人不能說話時屬過時、冒犯性用語）；（動詞）使消音；減弱聲音；（名詞）弱音器；啞音字母；不能說話的人（過時用語）",
        "meaningEn": "(adj.) silent; unable to speak (old-fashioned and offensive when applied to a person); (v.) to lower or turn off sound; (n.) a device for softening a musical instrument, or a silent letter; (n., offensive) a person unable to speak.",
        "usagePattern": "remain mute; mute the sound; a violin mute",
        "syllables": null,
        "stressPattern": null,
        "phoneticUs": null,
        "familyKey": "mute",
        "isCore": true,
        "sourceNote": "高中英文參考詞彙表（111學年度起適用，大考中心）",
        "status": "draft",
        "usagePatternZh": "保持沉默；將聲音靜音；小提琴弱音器",
        "verbForms": {
          "base": "mute",
          "past": "muted",
          "pastParticiple": "muted",
          "sourceRef": "https://www.collinsdictionary.com/dictionary/english/mute",
          "status": "approved"
        }
      },
      "beforeRowSha256": "7629055308e881923a05490918ca61a728278633fcb2986116ebea92946d45bd",
      "expectedAfterRowSha256": "4aada2748067b704ab967498dccc15d11c0c47212e3a1a0b704f4a78277df029",
      "fields": {
        "meaningZh": "（形容詞）沉默的；啞的（指人不能說話時屬過時、冒犯性用語）；（動詞）使消音；減弱聲音；（名詞）弱音器；啞音字母；不能說話的人（過時用語）",
        "meaningEn": "(adj.) silent; unable to speak (old-fashioned and offensive when applied to a person); (v.) to lower or turn off sound; (n.) a device for softening a musical instrument, or a silent letter; (n., offensive) a person unable to speak.",
        "usagePattern": "remain mute; mute the sound; a violin mute",
        "usagePatternZh": "保持沉默；將聲音靜音；小提琴弱音器",
        "verbForms": {
          "base": "mute",
          "past": "muted",
          "pastParticiple": "muted",
          "sourceRef": "https://www.collinsdictionary.com/dictionary/english/mute",
          "status": "approved"
        }
      },
      "sources": {
        "meaningZh": [
          {
            "type": "dictionary",
            "url": "https://www.collinsdictionary.com/dictionary/english/mute",
            "excerpt": "unable to speak; offensive, old-fashioned; lower its volume",
            "summary": "形容詞沉默及不能說話；後者標為過時冒犯用語。動詞降低／關閉聲音；保留原有樂器與字母名詞義。",
            "locator": "COBUILD senses 1–4, lines 224–269",
            "verification": "web_text_direct_or_indexed_dictionary_text_read",
            "readDate": "2026-11-08"
          }
        ],
        "meaningEn": [
          {
            "type": "dictionary",
            "url": "https://www.collinsdictionary.com/dictionary/english/mute",
            "excerpt": "unable to speak; offensive, old-fashioned; lower its volume",
            "summary": "形容詞沉默及不能說話；後者標為過時冒犯用語。動詞降低／關閉聲音；保留原有樂器與字母名詞義。",
            "locator": "COBUILD senses 1–4, lines 224–269",
            "verification": "web_text_direct_or_indexed_dictionary_text_read",
            "readDate": "2026-11-08"
          },
          {
            "url": "https://www.collinsdictionary.com/dictionary/english/mute",
            "locator": "British English1 sense1 L325–329",
            "excerpt": "silent",
            "sense": "adjective silent",
            "interpretation": "Added silent adjective.",
            "retrieval": "Direct web open of dictionary body, followed by open/find within the same body; not a search-result snippet."
          },
          {
            "url": "https://www.collinsdictionary.com/dictionary/english/mute",
            "locator": "COBUILD sense2 L245–249",
            "excerpt": "offensive, old-fashioned",
            "sense": "adjective cannot speak",
            "interpretation": "Human speech-inability adjective, with register label.",
            "retrieval": "Direct web open of dictionary body, followed by open/find within the same body; not a search-result snippet."
          },
          {
            "url": "https://www.collinsdictionary.com/dictionary/english/mute",
            "locator": "British English1 senses15–16 L391–399",
            "excerpt": "render silent",
            "sense": "verb sound reduction/off",
            "interpretation": "Added lowering/silencing sound, supported by COBUILD sense4 L264–269 too.",
            "retrieval": "Direct web open of dictionary body, followed by open/find within the same body; not a search-result snippet."
          },
          {
            "url": "https://www.collinsdictionary.com/dictionary/english/mute",
            "locator": "British English1 sense8 L364–366",
            "excerpt": "soften the tone",
            "sense": "instrument device noun",
            "interpretation": "Original instrument device sense retained.",
            "retrieval": "Direct web open of dictionary body, followed by open/find within the same body; not a search-result snippet."
          },
          {
            "url": "https://www.collinsdictionary.com/dictionary/english/mute",
            "locator": "British English1 sense9 L368–370",
            "excerpt": "a person who is unable to speak",
            "sense": "person noun",
            "interpretation": "Original human noun must be restored and explicitly marked offensive. Source does not require deafness.",
            "retrieval": "Direct web open of dictionary body, followed by open/find within the same body; not a search-result snippet."
          },
          {
            "url": "https://www.collinsdictionary.com/dictionary/english/mute",
            "locator": "British English1 sense12 L379–381",
            "excerpt": "a silent letter",
            "sense": "silent letter noun",
            "interpretation": "Added letter noun explicitly supported.",
            "retrieval": "Direct web open of dictionary body, followed by open/find within the same body; not a search-result snippet."
          }
        ],
        "usagePattern": [
          {
            "type": "dictionary",
            "url": "https://www.collinsdictionary.com/dictionary/english/mute",
            "excerpt": "unable to speak; offensive, old-fashioned; lower its volume",
            "summary": "形容詞沉默及不能說話；後者標為過時冒犯用語。動詞降低／關閉聲音；保留原有樂器與字母名詞義。",
            "locator": "COBUILD senses 1–4, lines 224–269",
            "verification": "web_text_direct_or_indexed_dictionary_text_read",
            "readDate": "2026-11-08"
          }
        ],
        "usagePatternZh": [
          {
            "type": "dictionary",
            "url": "https://www.collinsdictionary.com/dictionary/english/mute",
            "excerpt": "unable to speak; offensive, old-fashioned; lower its volume",
            "summary": "形容詞沉默及不能說話；後者標為過時冒犯用語。動詞降低／關閉聲音；保留原有樂器與字母名詞義。",
            "locator": "COBUILD senses 1–4, lines 224–269",
            "verification": "web_text_direct_or_indexed_dictionary_text_read",
            "readDate": "2026-11-08"
          }
        ],
        "verbForms": [
          {
            "word": "mute",
            "url": "https://www.collinsdictionary.com/dictionary/english/mute",
            "excerpt": "past tense, past participle muted",
            "location": "L222"
          }
        ]
      },
      "starterIncluded": true
    },
    {
      "dataset": "words",
      "id": "W005998",
      "path": "public/data/v1/words.json",
      "key": "wordId",
      "changedFields": [
        "meaningEn",
        "usagePattern",
        "usagePatternZh",
        "verbForms"
      ],
      "beforeRow": {
        "wordId": "W005998",
        "word": "wharf",
        "wordVariants": [
          "wharf"
        ],
        "level": "LV6",
        "pos": "n./v.",
        "posAll": [
          "n.",
          "v."
        ],
        "meaningZh": "碼頭；卸在碼頭上；靠碼頭；入塢",
        "meaningEn": "provide with a wharf; store on a wharf",
        "usagePattern": "wharf + N; wharf to V; a/the wharf",
        "syllables": null,
        "stressPattern": null,
        "phoneticUs": null,
        "familyKey": "wharf",
        "isCore": true,
        "sourceNote": "高中英文參考詞彙表（111學年度起適用，大考中心）",
        "status": "draft",
        "usagePatternZh": "碼頭裝卸……；wharf 後接 to 不定詞；該碼頭"
      },
      "expectedAfterRow": {
        "wordId": "W005998",
        "word": "wharf",
        "wordVariants": [
          "wharf"
        ],
        "level": "LV6",
        "pos": "n./v.",
        "posAll": [
          "n.",
          "v."
        ],
        "meaningZh": "碼頭；卸在碼頭上；靠碼頭；入塢",
        "meaningEn": "(n.) a waterside platform where vessels tie up and load or unload; (v.) to dock at, equip with, or store goods on a wharf.",
        "usagePattern": "at a wharf; unload goods on a wharf; wharf a vessel",
        "syllables": null,
        "stressPattern": null,
        "phoneticUs": null,
        "familyKey": "wharf",
        "isCore": true,
        "sourceNote": "高中英文參考詞彙表（111學年度起適用，大考中心）",
        "status": "draft",
        "usagePatternZh": "在碼頭；把貨物卸在碼頭；使船停靠碼頭",
        "verbForms": {
          "base": "wharf",
          "past": "wharfed",
          "pastParticiple": "wharfed",
          "sourceRef": "https://www.collinsdictionary.com/conjugation/english/wharf",
          "status": "approved"
        }
      },
      "beforeRowSha256": "dfe6f02d152016209df54f490211c65cec4757446770877304902ed7f282187e",
      "expectedAfterRowSha256": "41aef1b679ab3242e4dfde290b084f3cb16f184a6ffbcbab89c179b9d1fcd96c",
      "fields": {
        "meaningEn": "(n.) a waterside platform where vessels tie up and load or unload; (v.) to dock at, equip with, or store goods on a wharf.",
        "usagePattern": "at a wharf; unload goods on a wharf; wharf a vessel",
        "usagePatternZh": "在碼頭；把貨物卸在碼頭；使船停靠碼頭",
        "verbForms": {
          "base": "wharf",
          "past": "wharfed",
          "pastParticiple": "wharfed",
          "sourceRef": "https://www.collinsdictionary.com/conjugation/english/wharf",
          "status": "approved"
        }
      },
      "sources": {
        "meaningEn": [
          {
            "type": "dictionary",
            "url": "https://www.collinsdictionary.com/dictionary/english/wharf",
            "excerpt": "platform by a river or the sea",
            "summary": "名詞為船隻停靠、裝卸貨物的岸邊碼頭；動詞裝備碼頭或把貨物存放／卸在碼頭。",
            "locator": "COBUILD noun and Collins British senses 4–6, lines 224–263",
            "verification": "web_text_direct_or_indexed_dictionary_text_read",
            "readDate": "2026-11-08"
          },
          {
            "url": "https://www.collinsdictionary.com/dictionary/english/wharf",
            "locator": "British English sense1 L242–246",
            "excerpt": "docking, loading, and unloading",
            "sense": "noun waterside structure",
            "interpretation": "Added noun platform supports loading and tying up.",
            "retrieval": "Direct web open of dictionary body, followed by open/find within the same body; not a search-result snippet."
          },
          {
            "url": "https://www.collinsdictionary.com/dictionary/english/wharf",
            "locator": "British English sense4 L252–256",
            "excerpt": "moor or dock",
            "sense": "verb dock",
            "interpretation": "Docking verb explicit.",
            "retrieval": "Direct web open of dictionary body, followed by open/find within the same body; not a search-result snippet."
          },
          {
            "url": "https://www.collinsdictionary.com/dictionary/english/wharf",
            "locator": "British English sense5 L258–260",
            "excerpt": "provide or equip",
            "sense": "verb equip",
            "interpretation": "Retains original equip with wharf.",
            "retrieval": "Direct web open of dictionary body, followed by open/find within the same body; not a search-result snippet."
          },
          {
            "url": "https://www.collinsdictionary.com/dictionary/english/wharf",
            "locator": "British English sense6 L262–263",
            "excerpt": "store or unload",
            "sense": "verb store",
            "interpretation": "Retains original store on wharf.",
            "retrieval": "Direct web open of dictionary body, followed by open/find within the same body; not a search-result snippet."
          }
        ],
        "usagePattern": [
          {
            "type": "dictionary",
            "url": "https://www.collinsdictionary.com/dictionary/english/wharf",
            "excerpt": "platform by a river or the sea",
            "summary": "名詞為船隻停靠、裝卸貨物的岸邊碼頭；動詞裝備碼頭或把貨物存放／卸在碼頭。",
            "locator": "COBUILD noun and Collins British senses 4–6, lines 224–263",
            "verification": "web_text_direct_or_indexed_dictionary_text_read",
            "readDate": "2026-11-08"
          }
        ],
        "usagePatternZh": [
          {
            "type": "dictionary",
            "url": "https://www.collinsdictionary.com/dictionary/english/wharf",
            "excerpt": "platform by a river or the sea",
            "summary": "名詞為船隻停靠、裝卸貨物的岸邊碼頭；動詞裝備碼頭或把貨物存放／卸在碼頭。",
            "locator": "COBUILD noun and Collins British senses 4–6, lines 224–263",
            "verification": "web_text_direct_or_indexed_dictionary_text_read",
            "readDate": "2026-11-08"
          }
        ],
        "verbForms": [
          {
            "word": "wharf",
            "url": "https://www.collinsdictionary.com/conjugation/english/wharf",
            "excerpt": "Infinitive to wharf; Past Participle wharfed; Past I wharfed",
            "location": "Infinitive, Past Participle and Past headings"
          }
        ]
      },
      "starterIncluded": true
    },
    {
      "dataset": "words",
      "id": "W005635",
      "path": "public/data/v1/words.json",
      "key": "wordId",
      "changedFields": [
        "meaningEn",
        "meaningZh",
        "usagePattern",
        "usagePatternZh",
        "verbForms"
      ],
      "beforeRow": {
        "wordId": "W005635",
        "word": "outlaw",
        "wordVariants": [
          "outlaw"
        ],
        "level": "LV6",
        "pos": "n./v.",
        "posAll": [
          "n.",
          "v."
        ],
        "meaningZh": "被剝奪法律保護的人；罪犯；使...失去法律保護；將...逐出社會",
        "meaningEn": "declare illegal; outlaw",
        "usagePattern": "outlaw + N; outlaw to V; an/the outlaw",
        "syllables": null,
        "stressPattern": null,
        "phoneticUs": null,
        "familyKey": "outlaw",
        "isCore": true,
        "sourceNote": "高中英文參考詞彙表（111學年度起適用，大考中心）",
        "status": "draft",
        "usagePatternZh": "將……列為非法；將……列為非法以……；該罪犯"
      },
      "expectedAfterRow": {
        "wordId": "W005635",
        "word": "outlaw",
        "wordVariants": [
          "outlaw"
        ],
        "level": "LV6",
        "pos": "n./v.",
        "posAll": [
          "n.",
          "v."
        ],
        "meaningZh": "被剝奪法律保護的人；罪犯；使...失去法律保護；將...逐出社會；（動詞）宣布……為非法",
        "meaningEn": "(n.) a criminal hiding from the authorities, historically a person outside the protection of the law; (v.) to declare something illegal; historically, to place a person outside the protection of the law.",
        "usagePattern": "outlaw an activity; an escaped outlaw",
        "syllables": null,
        "stressPattern": null,
        "phoneticUs": null,
        "familyKey": "outlaw",
        "isCore": true,
        "sourceNote": "高中英文參考詞彙表（111學年度起適用，大考中心）",
        "status": "draft",
        "usagePatternZh": "宣布某活動非法；逃亡的罪犯",
        "verbForms": {
          "base": "outlaw",
          "past": "outlawed",
          "pastParticiple": "outlawed",
          "sourceRef": "https://www.collinsdictionary.com/dictionary/english/outlaw",
          "status": "approved"
        }
      },
      "beforeRowSha256": "c78caa455eff820589597d2bd1cf041d734293da608d0e1fac6a1d63a6145061",
      "expectedAfterRowSha256": "de9f78940f51228ba7a8e9ca41d96c77c7e0042f06aaf7c7988908c317f8a494",
      "fields": {
        "meaningEn": "(n.) a criminal hiding from the authorities, historically a person outside the protection of the law; (v.) to declare something illegal; historically, to place a person outside the protection of the law.",
        "meaningZh": "被剝奪法律保護的人；罪犯；使...失去法律保護；將...逐出社會；（動詞）宣布……為非法",
        "usagePattern": "outlaw an activity; an escaped outlaw",
        "usagePatternZh": "宣布某活動非法；逃亡的罪犯",
        "verbForms": {
          "base": "outlaw",
          "past": "outlawed",
          "pastParticiple": "outlawed",
          "sourceRef": "https://www.collinsdictionary.com/dictionary/english/outlaw",
          "status": "approved"
        }
      },
      "sources": {
        "meaningEn": [
          {
            "type": "dictionary",
            "url": "https://www.collinsdictionary.com/dictionary/english/outlaw",
            "excerpt": "to declare unlawful or illegal",
            "summary": "名詞亡命之徒、逃避當局的罪犯；動詞宣布為非法。",
            "locator": "dictionary entry; accessed 2026-11-08",
            "verification": "web_text_direct_or_indexed_dictionary_text_read",
            "readDate": "2026-11-08"
          },
          {
            "type": "textbook_photo",
            "file": "20260815_101056.jpg",
            "page": 110,
            "sha256": "509ee199bff48e08e4a590fa149b34d6d8655a75788ad24aa0d740fff1c198e6",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "outlaw n. 亡命之徒",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "url": "https://www.collinsdictionary.com/dictionary/english/outlaw",
            "locator": "COBUILD sense2 L235–239",
            "excerpt": "hiding from the authorities",
            "sense": "noun fugitive",
            "interpretation": "Added fugitive criminal sense, old-fashioned.",
            "retrieval": "Direct web open of dictionary body, followed by open/find within the same body; not a search-result snippet."
          },
          {
            "url": "https://www.collinsdictionary.com/dictionary/english/outlaw",
            "locator": "British English sense1 L278–282",
            "excerpt": "deprived of its protection",
            "sense": "historical noun",
            "interpretation": "Added historical loss-of-law-protection sense.",
            "retrieval": "Direct web open of dictionary body, followed by open/find within the same body; not a search-result snippet."
          },
          {
            "url": "https://www.collinsdictionary.com/dictionary/english/outlaw",
            "locator": "COBUILD sense1 L224–226",
            "excerpt": "made illegal",
            "sense": "illegal verb",
            "interpretation": "Retains original declare illegal.",
            "retrieval": "Direct web open of dictionary body, followed by open/find within the same body; not a search-result snippet."
          },
          {
            "url": "https://www.collinsdictionary.com/dictionary/english/outlaw",
            "locator": "British English sense4 L292–296",
            "excerpt": "outside the law",
            "sense": "historical verb",
            "interpretation": "Old original self-gloss outlaw is ambiguous; preserve directly documented historical verb explicitly in amendment.",
            "retrieval": "Direct web open of dictionary body, followed by open/find within the same body; not a search-result snippet."
          }
        ],
        "meaningZh": [
          {
            "type": "dictionary",
            "url": "https://www.collinsdictionary.com/dictionary/english/outlaw",
            "excerpt": "to declare unlawful or illegal",
            "summary": "名詞亡命之徒、逃避當局的罪犯；動詞宣布為非法。",
            "locator": "dictionary entry; accessed 2026-11-08",
            "verification": "web_text_direct_or_indexed_dictionary_text_read",
            "readDate": "2026-11-08"
          },
          {
            "type": "textbook_photo",
            "file": "20260815_101056.jpg",
            "page": 110,
            "sha256": "509ee199bff48e08e4a590fa149b34d6d8655a75788ad24aa0d740fff1c198e6",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "outlaw n. 亡命之徒",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "usagePattern": [
          {
            "type": "dictionary",
            "url": "https://www.collinsdictionary.com/dictionary/english/outlaw",
            "excerpt": "to declare unlawful or illegal",
            "summary": "名詞亡命之徒、逃避當局的罪犯；動詞宣布為非法。",
            "locator": "dictionary entry; accessed 2026-11-08",
            "verification": "web_text_direct_or_indexed_dictionary_text_read",
            "readDate": "2026-11-08"
          },
          {
            "type": "textbook_photo",
            "file": "20260815_101056.jpg",
            "page": 110,
            "sha256": "509ee199bff48e08e4a590fa149b34d6d8655a75788ad24aa0d740fff1c198e6",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "outlaw n. 亡命之徒",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "usagePatternZh": [
          {
            "type": "dictionary",
            "url": "https://www.collinsdictionary.com/dictionary/english/outlaw",
            "excerpt": "to declare unlawful or illegal",
            "summary": "名詞亡命之徒、逃避當局的罪犯；動詞宣布為非法。",
            "locator": "dictionary entry; accessed 2026-11-08",
            "verification": "web_text_direct_or_indexed_dictionary_text_read",
            "readDate": "2026-11-08"
          },
          {
            "type": "textbook_photo",
            "file": "20260815_101056.jpg",
            "page": 110,
            "sha256": "509ee199bff48e08e4a590fa149b34d6d8655a75788ad24aa0d740fff1c198e6",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "outlaw n. 亡命之徒",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "verbForms": [
          {
            "word": "outlaw",
            "url": "https://www.collinsdictionary.com/dictionary/english/outlaw",
            "excerpt": "past tense, past participle outlawed",
            "location": "L222"
          }
        ]
      },
      "starterIncluded": true
    },
    {
      "dataset": "words",
      "id": "W002941",
      "path": "public/data/v1/words.json",
      "key": "wordId",
      "changedFields": [
        "usagePattern",
        "usagePatternZh",
        "verbForms"
      ],
      "beforeRow": {
        "wordId": "W002941",
        "word": "tug",
        "wordVariants": [
          "tug"
        ],
        "level": "LV3",
        "pos": "n./v.",
        "posAll": [
          "n.",
          "v."
        ],
        "meaningZh": "用力拉；拖曳；苦幹；掙扎",
        "meaningEn": "a sudden abrupt pull; pull hard",
        "usagePattern": "tug + N; tug to V; a/the tug",
        "syllables": null,
        "stressPattern": null,
        "phoneticUs": null,
        "familyKey": "tug",
        "isCore": true,
        "sourceNote": "高中英文參考詞彙表（111學年度起適用，大考中心）",
        "status": "draft",
        "usagePatternZh": "用力拉某物；用力拉以做某事；猛力一拉"
      },
      "expectedAfterRow": {
        "wordId": "W002941",
        "word": "tug",
        "wordVariants": [
          "tug"
        ],
        "level": "LV3",
        "pos": "n./v.",
        "posAll": [
          "n.",
          "v."
        ],
        "meaningZh": "用力拉；拖曳；苦幹；掙扎",
        "meaningEn": "a sudden abrupt pull; pull hard",
        "usagePattern": "tug sth; tug at sth; give sth a tug",
        "syllables": null,
        "stressPattern": null,
        "phoneticUs": null,
        "familyKey": "tug",
        "isCore": true,
        "sourceNote": "高中英文參考詞彙表（111學年度起適用，大考中心）",
        "status": "draft",
        "usagePatternZh": "用力拉某物；拉扯某物；把某物猛拉一下",
        "verbForms": {
          "base": "tug",
          "past": "tugged",
          "pastParticiple": "tugged",
          "sourceRef": "https://www.collinsdictionary.com/dictionary/english/tug",
          "status": "approved"
        }
      },
      "beforeRowSha256": "5bf3aaeefdf2b459f87d5ebc81f207e2e20b441f9a60fb96d82a864ec391d44e",
      "expectedAfterRowSha256": "eb7294aff3568252e9496295005d808231aed004015da50da8f2e8546c24a181",
      "fields": {
        "usagePattern": "tug sth; tug at sth; give sth a tug",
        "usagePatternZh": "用力拉某物；拉扯某物；把某物猛拉一下",
        "verbForms": {
          "base": "tug",
          "past": "tugged",
          "pastParticiple": "tugged",
          "sourceRef": "https://www.collinsdictionary.com/dictionary/english/tug",
          "status": "approved"
        }
      },
      "sources": {
        "usagePattern": [
          {
            "type": "dictionary",
            "url": "https://www.collinsdictionary.com/dictionary/english/tug",
            "excerpt": "tug something or tug at it",
            "summary": "動詞用力拉；名詞猛拉。",
            "locator": "dictionary entry; accessed 2026-11-08",
            "verification": "web_text_direct_or_indexed_dictionary_text_read",
            "readDate": "2026-11-08"
          },
          {
            "type": "textbook_photo",
            "file": "20260815_101056.jpg",
            "page": 110,
            "sha256": "509ee199bff48e08e4a590fa149b34d6d8655a75788ad24aa0d740fff1c198e6",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "tug vt. 拖；拉",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "usagePatternZh": [
          {
            "type": "dictionary",
            "url": "https://www.collinsdictionary.com/dictionary/english/tug",
            "excerpt": "tug something or tug at it",
            "summary": "動詞用力拉；名詞猛拉。",
            "locator": "dictionary entry; accessed 2026-11-08",
            "verification": "web_text_direct_or_indexed_dictionary_text_read",
            "readDate": "2026-11-08"
          },
          {
            "type": "textbook_photo",
            "file": "20260815_101056.jpg",
            "page": 110,
            "sha256": "509ee199bff48e08e4a590fa149b34d6d8655a75788ad24aa0d740fff1c198e6",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "tug vt. 拖；拉",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "verbForms": [
          {
            "word": "tug",
            "url": "https://www.collinsdictionary.com/dictionary/english/tug",
            "excerpt": "past tense, past participle tugged",
            "location": "L222"
          }
        ]
      },
      "starterIncluded": true
    },
    {
      "dataset": "words",
      "id": "W005864",
      "path": "public/data/v1/words.json",
      "key": "wordId",
      "changedFields": [
        "usagePattern",
        "usagePatternZh",
        "verbForms"
      ],
      "beforeRow": {
        "wordId": "W005864",
        "word": "stabilize",
        "wordVariants": [
          "stabilize"
        ],
        "level": "LV6",
        "pos": "v.",
        "posAll": [
          "v."
        ],
        "meaningZh": "使安定；使穩固；穩定；安定",
        "meaningEn": "make stable and keep from fluctuating or put into an equilibrium; become stable or more stable",
        "usagePattern": "stabilize + N; stabilize to V",
        "syllables": null,
        "stressPattern": null,
        "phoneticUs": null,
        "familyKey": "stabilize",
        "isCore": true,
        "sourceNote": "高中英文參考詞彙表（111學年度起適用，大考中心）",
        "status": "draft",
        "usagePatternZh": "穩定某物；stabilize 後接 to 不定詞"
      },
      "expectedAfterRow": {
        "wordId": "W005864",
        "word": "stabilize",
        "wordVariants": [
          "stabilize"
        ],
        "level": "LV6",
        "pos": "v.",
        "posAll": [
          "v."
        ],
        "meaningZh": "使安定；使穩固；穩定；安定",
        "meaningEn": "make stable and keep from fluctuating or put into an equilibrium; become stable or more stable",
        "usagePattern": "stabilize prices; stabilize the economy; prices stabilize",
        "syllables": null,
        "stressPattern": null,
        "phoneticUs": null,
        "familyKey": "stabilize",
        "isCore": true,
        "sourceNote": "高中英文參考詞彙表（111學年度起適用，大考中心）",
        "status": "draft",
        "usagePatternZh": "穩定價格；使經濟穩定；價格趨於穩定",
        "verbForms": {
          "base": "stabilize",
          "past": "stabilized",
          "pastParticiple": "stabilized",
          "sourceRef": "https://www.collinsdictionary.com/dictionary/english/stabilize",
          "status": "approved"
        }
      },
      "beforeRowSha256": "2d1ae14afb51b272cc7afa1be0dc85ba14942a9abc31688cc6632c95df8c7468",
      "expectedAfterRowSha256": "fb32d811ecab9fa0183bef6db68ba7788be4c27252015adcc7ae8d866ad46a23",
      "fields": {
        "usagePattern": "stabilize prices; stabilize the economy; prices stabilize",
        "usagePatternZh": "穩定價格；使經濟穩定；價格趨於穩定",
        "verbForms": {
          "base": "stabilize",
          "past": "stabilized",
          "pastParticiple": "stabilized",
          "sourceRef": "https://www.collinsdictionary.com/dictionary/english/stabilize",
          "status": "approved"
        }
      },
      "sources": {
        "usagePattern": [
          {
            "type": "dictionary",
            "url": "https://www.collinsdictionary.com/dictionary/english/stabilize",
            "excerpt": "stabilize exchange rates",
            "summary": "及物動詞使穩定；不及物動詞變得穩定。",
            "locator": "dictionary entry; accessed 2026-11-08",
            "verification": "web_text_direct_or_indexed_dictionary_text_read",
            "readDate": "2026-11-08"
          }
        ],
        "usagePatternZh": [
          {
            "type": "dictionary",
            "url": "https://www.collinsdictionary.com/dictionary/english/stabilize",
            "excerpt": "stabilize exchange rates",
            "summary": "及物動詞使穩定；不及物動詞變得穩定。",
            "locator": "dictionary entry; accessed 2026-11-08",
            "verification": "web_text_direct_or_indexed_dictionary_text_read",
            "readDate": "2026-11-08"
          }
        ],
        "verbForms": [
          {
            "word": "stabilize",
            "url": "https://www.collinsdictionary.com/dictionary/english/stabilize",
            "excerpt": "past tense, past participle stabilized",
            "location": "L222"
          }
        ]
      },
      "starterIncluded": true
    },
    {
      "dataset": "words",
      "id": "W003209",
      "path": "public/data/v1/words.json",
      "key": "wordId",
      "changedFields": [
        "meaningEn",
        "usagePattern",
        "usagePatternZh",
        "verbForms"
      ],
      "beforeRow": {
        "wordId": "W003209",
        "word": "contest",
        "wordVariants": [
          "contest"
        ],
        "level": "LV4",
        "pos": "n./v.",
        "posAll": [
          "n.",
          "v."
        ],
        "meaningZh": "競賽；爭論；競爭；爭取",
        "meaningEn": "an occasion on which a winner is selected from among two or more contestants; a struggle between rivals",
        "usagePattern": "contest + N; contest to V; a/the contest",
        "syllables": null,
        "stressPattern": null,
        "phoneticUs": null,
        "familyKey": "contest",
        "isCore": true,
        "sourceNote": "高中英文參考詞彙表（111學年度起適用，大考中心）",
        "status": "draft",
        "usagePatternZh": "競爭某事；爭取去做某事；某場競賽／該競賽"
      },
      "expectedAfterRow": {
        "wordId": "W003209",
        "word": "contest",
        "wordVariants": [
          "contest"
        ],
        "level": "LV4",
        "pos": "n./v.",
        "posAll": [
          "n.",
          "v."
        ],
        "meaningZh": "競賽；爭論；競爭；爭取",
        "meaningEn": "an occasion on which a winner is selected from among two or more contestants; a struggle between rivals; (v.) to challenge a result or claim, or compete for something.",
        "usagePattern": "a contest; enter a contest; contest a result",
        "syllables": null,
        "stressPattern": null,
        "phoneticUs": null,
        "familyKey": "contest",
        "isCore": true,
        "sourceNote": "高中英文參考詞彙表（111學年度起適用，大考中心）",
        "status": "draft",
        "usagePatternZh": "一場比賽；參加比賽；對結果提出異議",
        "verbForms": {
          "base": "contest",
          "past": "contested",
          "pastParticiple": "contested",
          "sourceRef": "https://www.collinsdictionary.com/dictionary/english/contest",
          "status": "approved"
        }
      },
      "beforeRowSha256": "8b718ee12692e243d09bc1de588434918856d7bf52a189bce2538874d6c3a5dd",
      "expectedAfterRowSha256": "ae510ca55ef9f7020622822e5d99a30baab00da00226463f729e90fa26022b0e",
      "fields": {
        "meaningEn": "an occasion on which a winner is selected from among two or more contestants; a struggle between rivals; (v.) to challenge a result or claim, or compete for something.",
        "usagePattern": "a contest; enter a contest; contest a result",
        "usagePatternZh": "一場比賽；參加比賽；對結果提出異議",
        "verbForms": {
          "base": "contest",
          "past": "contested",
          "pastParticiple": "contested",
          "sourceRef": "https://www.collinsdictionary.com/dictionary/english/contest",
          "status": "approved"
        }
      },
      "sources": {
        "meaningEn": [
          {
            "type": "dictionary",
            "url": "https://www.collinsdictionary.com/dictionary/english/contest",
            "excerpt": "contest a result",
            "summary": "動詞對結果提出爭議；名詞比賽。",
            "locator": "dictionary entry; accessed 2026-11-08",
            "verification": "web_text_direct_or_indexed_dictionary_text_read",
            "readDate": "2026-11-08"
          },
          {
            "type": "textbook_photo",
            "file": "20260815_101041.jpg",
            "page": 108,
            "sha256": "2486397e839df9a89789d792858a4d93aa949bcac5033d97e2ac4f55a0a42e19",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "contest n. 比賽；競賽",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "url": "https://www.collinsdictionary.com/dictionary/english/contest",
            "locator": "COBUILD sense1 L224–226",
            "excerpt": "competition or game",
            "sense": "competition noun",
            "interpretation": "Retains winning competition.",
            "retrieval": "Direct web open of dictionary body, followed by open/find within the same body; not a search-result snippet."
          },
          {
            "url": "https://www.collinsdictionary.com/dictionary/english/contest",
            "locator": "COBUILD sense3 L235–237",
            "excerpt": "struggle to win power or control",
            "sense": "struggle noun",
            "interpretation": "Retains rival struggle.",
            "retrieval": "Direct web open of dictionary body, followed by open/find within the same body; not a search-result snippet."
          },
          {
            "url": "https://www.collinsdictionary.com/dictionary/english/contest",
            "locator": "COBUILD sense4 L243–252",
            "excerpt": "compete in",
            "sense": "compete verb",
            "interpretation": "Added participation sense, mainly British.",
            "retrieval": "Direct web open of dictionary body, followed by open/find within the same body; not a search-result snippet."
          },
          {
            "url": "https://www.collinsdictionary.com/dictionary/english/contest",
            "locator": "COBUILD sense5 L254–261",
            "excerpt": "object to it formally",
            "sense": "challenge verb",
            "interpretation": "Added challenge decision/claim.",
            "retrieval": "Direct web open of dictionary body, followed by open/find within the same body; not a search-result snippet."
          }
        ],
        "usagePattern": [
          {
            "type": "dictionary",
            "url": "https://www.collinsdictionary.com/dictionary/english/contest",
            "excerpt": "contest a result",
            "summary": "動詞對結果提出爭議；名詞比賽。",
            "locator": "dictionary entry; accessed 2026-11-08",
            "verification": "web_text_direct_or_indexed_dictionary_text_read",
            "readDate": "2026-11-08"
          },
          {
            "type": "textbook_photo",
            "file": "20260815_101041.jpg",
            "page": 108,
            "sha256": "2486397e839df9a89789d792858a4d93aa949bcac5033d97e2ac4f55a0a42e19",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "contest n. 比賽；競賽",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "usagePatternZh": [
          {
            "type": "dictionary",
            "url": "https://www.collinsdictionary.com/dictionary/english/contest",
            "excerpt": "contest a result",
            "summary": "動詞對結果提出爭議；名詞比賽。",
            "locator": "dictionary entry; accessed 2026-11-08",
            "verification": "web_text_direct_or_indexed_dictionary_text_read",
            "readDate": "2026-11-08"
          },
          {
            "type": "textbook_photo",
            "file": "20260815_101041.jpg",
            "page": 108,
            "sha256": "2486397e839df9a89789d792858a4d93aa949bcac5033d97e2ac4f55a0a42e19",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "contest n. 比賽；競賽",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "verbForms": [
          {
            "word": "contest",
            "url": "https://www.collinsdictionary.com/dictionary/english/contest",
            "excerpt": "past tense, past participle contested",
            "location": "L222"
          }
        ]
      },
      "starterIncluded": true
    },
    {
      "dataset": "words",
      "id": "W003588",
      "path": "public/data/v1/words.json",
      "key": "wordId",
      "changedFields": [
        "usagePattern",
        "usagePatternZh",
        "verbForms"
      ],
      "beforeRow": {
        "wordId": "W003588",
        "word": "lean",
        "wordVariants": [
          "lean"
        ],
        "level": "LV4",
        "pos": "v./adj.",
        "posAll": [
          "v.",
          "adj."
        ],
        "meaningZh": "瘦肉；傾斜；傾斜度；瘦的",
        "meaningEn": "to incline or bend from a vertical position; cause to lean or incline",
        "usagePattern": "lean + N; lean to V; be lean",
        "syllables": null,
        "stressPattern": null,
        "phoneticUs": null,
        "familyKey": "lean",
        "isCore": true,
        "sourceNote": "高中英文參考詞彙表（111學年度起適用，大考中心）",
        "status": "draft",
        "usagePatternZh": "瘦肉；傾向於做某事；瘦的"
      },
      "expectedAfterRow": {
        "wordId": "W003588",
        "word": "lean",
        "wordVariants": [
          "lean"
        ],
        "level": "LV4",
        "pos": "v./adj.",
        "posAll": [
          "v.",
          "adj."
        ],
        "meaningZh": "瘦肉；傾斜；傾斜度；瘦的",
        "meaningEn": "to incline or bend from a vertical position; cause to lean or incline",
        "usagePattern": "lean on/against sth; lean forward; be lean",
        "syllables": null,
        "stressPattern": null,
        "phoneticUs": null,
        "familyKey": "lean",
        "isCore": true,
        "sourceNote": "高中英文參考詞彙表（111學年度起適用，大考中心）",
        "status": "draft",
        "usagePatternZh": "倚靠某物；向前傾；瘦的",
        "verbForms": {
          "base": "lean",
          "past": "leaned / leant",
          "pastParticiple": "leaned / leant",
          "sourceRef": "https://www.collinsdictionary.com/dictionary/english/lean",
          "status": "approved"
        }
      },
      "beforeRowSha256": "04b29f4d4b10f6e7be0a2e9e98e134637e8611a2c9976983b7c5d26fa99f1fc9",
      "expectedAfterRowSha256": "a2b2c3ecfe7121f4380e4ec4ef1076fae3c870dc6fb6fac86937bdf13fe1d95d",
      "fields": {
        "usagePattern": "lean on/against sth; lean forward; be lean",
        "usagePatternZh": "倚靠某物；向前傾；瘦的",
        "verbForms": {
          "base": "lean",
          "past": "leaned / leant",
          "pastParticiple": "leaned / leant",
          "sourceRef": "https://www.collinsdictionary.com/dictionary/english/lean",
          "status": "approved"
        }
      },
      "sources": {
        "usagePattern": [
          {
            "type": "dictionary",
            "url": "https://www.collinsdictionary.com/dictionary/english/lean",
            "excerpt": "lean on or against",
            "summary": "靠在支撐物上以支撐重量；不是名詞瘦肉的動詞句型。",
            "locator": "dictionary entry; accessed 2026-11-08",
            "verification": "web_text_direct_or_indexed_dictionary_text_read",
            "readDate": "2026-11-08"
          },
          {
            "type": "textbook_photo",
            "file": "20260815_101059.jpg",
            "page": 111,
            "sha256": "9d7e7ff74bc09809e7bf4f746b1b8cd071c6fd42ab1397ee8fbbb8b977e84eaf",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "lean vi. 倚；靠",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "usagePatternZh": [
          {
            "type": "dictionary",
            "url": "https://www.collinsdictionary.com/dictionary/english/lean",
            "excerpt": "lean on or against",
            "summary": "靠在支撐物上以支撐重量；不是名詞瘦肉的動詞句型。",
            "locator": "dictionary entry; accessed 2026-11-08",
            "verification": "web_text_direct_or_indexed_dictionary_text_read",
            "readDate": "2026-11-08"
          },
          {
            "type": "textbook_photo",
            "file": "20260815_101059.jpg",
            "page": 111,
            "sha256": "9d7e7ff74bc09809e7bf4f746b1b8cd071c6fd42ab1397ee8fbbb8b977e84eaf",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "lean vi. 倚；靠",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "verbForms": [
          {
            "word": "lean",
            "url": "https://www.collinsdictionary.com/dictionary/english/lean",
            "excerpt": "past tense, past participle leaned or leant",
            "location": "L222"
          }
        ]
      },
      "starterIncluded": true
    },
    {
      "dataset": "words",
      "id": "W001269",
      "path": "public/data/v1/words.json",
      "key": "wordId",
      "changedFields": [
        "meaningZh"
      ],
      "beforeRow": {
        "wordId": "W001269",
        "word": "divide",
        "wordVariants": [
          "divide"
        ],
        "level": "LV2",
        "pos": "v./n.",
        "posAll": [
          "v.",
          "n."
        ],
        "meaningZh": "分開；分配；分裂；分",
        "meaningEn": "(v.) to separate something into two or more parts; (n.) a big difference between two groups that causes disagreement or conflict",
        "usagePattern": "divide N into N; a divide between A and B",
        "syllables": null,
        "stressPattern": null,
        "phoneticUs": null,
        "familyKey": "divide",
        "isCore": true,
        "sourceNote": "高中英文參考詞彙表（111學年度起適用，大考中心）",
        "status": "reviewed",
        "usagePatternZh": "將……分成……；A 與 B 之間的分歧",
        "verbForms": {
          "base": "divide",
          "past": "divided",
          "pastParticiple": "divided",
          "sourceRef": "https://www.collinsdictionary.com/dictionary/english/divide",
          "status": "approved"
        }
      },
      "expectedAfterRow": {
        "wordId": "W001269",
        "word": "divide",
        "wordVariants": [
          "divide"
        ],
        "level": "LV2",
        "pos": "v./n.",
        "posAll": [
          "v.",
          "n."
        ],
        "meaningZh": "分開；分配；分裂；分；（算術）除以",
        "meaningEn": "(v.) to separate something into two or more parts; (n.) a big difference between two groups that causes disagreement or conflict",
        "usagePattern": "divide N into N; a divide between A and B",
        "syllables": null,
        "stressPattern": null,
        "phoneticUs": null,
        "familyKey": "divide",
        "isCore": true,
        "sourceNote": "高中英文參考詞彙表（111學年度起適用，大考中心）",
        "status": "reviewed",
        "usagePatternZh": "將……分成……；A 與 B 之間的分歧",
        "verbForms": {
          "base": "divide",
          "past": "divided",
          "pastParticiple": "divided",
          "sourceRef": "https://www.collinsdictionary.com/dictionary/english/divide",
          "status": "approved"
        }
      },
      "beforeRowSha256": "381452f77baefe80da335c43c0aeff3ff13040076e92e9af1f434b746c672556",
      "expectedAfterRowSha256": "76ad814367bf02f0fb9dc062215536296e650420be49d58dffe31eae3d3c6722",
      "fields": {
        "meaningZh": "分開；分配；分裂；分；（算術）除以"
      },
      "sources": {
        "meaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101223.jpg",
            "page": 118,
            "sha256": "daced8e490b64cdb43c6ff4b71a144ba3b80a0ee6e2d37531cbf5e6d08eecd29",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "divide vt. 除以",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ]
      },
      "starterIncluded": true
    },
    {
      "dataset": "words",
      "id": "W002171",
      "path": "public/data/v1/words.json",
      "key": "wordId",
      "changedFields": [
        "meaningZh"
      ],
      "beforeRow": {
        "wordId": "W002171",
        "word": "colony",
        "wordVariants": [
          "colony"
        ],
        "level": "LV3",
        "pos": "n.",
        "posAll": [
          "n."
        ],
        "meaningZh": "殖民地；移民隊；菌(集)落；菌叢",
        "meaningEn": "a country or area that is controlled by another, more powerful country; a group of the same type of animals, insects, or plants living or growing together in one place",
        "usagePattern": "a British colony; a colony of ants/bacteria",
        "syllables": null,
        "stressPattern": null,
        "phoneticUs": null,
        "familyKey": "colony",
        "isCore": true,
        "sourceNote": "高中英文參考詞彙表（111學年度起適用，大考中心）",
        "status": "reviewed",
        "usagePatternZh": "英國殖民地；蟻群／菌落"
      },
      "expectedAfterRow": {
        "wordId": "W002171",
        "word": "colony",
        "wordVariants": [
          "colony"
        ],
        "level": "LV3",
        "pos": "n.",
        "posAll": [
          "n."
        ],
        "meaningZh": "殖民地；移民隊；菌(集)落；菌叢；一群同類且有組織的動物",
        "meaningEn": "a country or area that is controlled by another, more powerful country; a group of the same type of animals, insects, or plants living or growing together in one place",
        "usagePattern": "a British colony; a colony of ants/bacteria",
        "syllables": null,
        "stressPattern": null,
        "phoneticUs": null,
        "familyKey": "colony",
        "isCore": true,
        "sourceNote": "高中英文參考詞彙表（111學年度起適用，大考中心）",
        "status": "reviewed",
        "usagePatternZh": "英國殖民地；蟻群／菌落"
      },
      "beforeRowSha256": "85d05752ce640135fae5f5647fc6b52482f2958fc413d2220531a709184c1f97",
      "expectedAfterRowSha256": "7b7f0a05c0815c794d742d357ada4a347688553c97a4f0dc27ba2653153b83b6",
      "fields": {
        "meaningZh": "殖民地；移民隊；菌(集)落；菌叢；一群同類且有組織的動物"
      },
      "sources": {
        "meaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101205.jpg",
            "page": 116,
            "sha256": "bac53daf334a9614ba784360e2f7f64837bd177ea4c5283bdb6d8f7df403dd03",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "colony n. 殖民地；一群同類且有組織的動物",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ]
      },
      "starterIncluded": true
    },
    {
      "dataset": "words",
      "id": "W002255",
      "path": "public/data/v1/words.json",
      "key": "wordId",
      "changedFields": [
        "meaningZh",
        "verbForms"
      ],
      "beforeRow": {
        "wordId": "W002255",
        "word": "dock",
        "wordVariants": [
          "dock"
        ],
        "level": "LV3",
        "pos": "n./v.",
        "posAll": [
          "n.",
          "v."
        ],
        "meaningZh": "碼頭；船塢；被告席；尾巴的骨肉部分",
        "meaningEn": "(n.) a structure at the edge of water where ships are loaded, unloaded, or repaired; (v.) (of a ship) to come into a dock; to take away part of someone's pay",
        "usagePattern": "dock at N (harbor/port); dock sb's pay",
        "syllables": null,
        "stressPattern": null,
        "phoneticUs": null,
        "familyKey": "dock",
        "isCore": true,
        "sourceNote": "高中英文參考詞彙表（111學年度起適用，大考中心）",
        "status": "reviewed",
        "usagePatternZh": "停靠港口；扣除某人薪水"
      },
      "expectedAfterRow": {
        "wordId": "W002255",
        "word": "dock",
        "wordVariants": [
          "dock"
        ],
        "level": "LV3",
        "pos": "n./v.",
        "posAll": [
          "n.",
          "v."
        ],
        "meaningZh": "碼頭；船塢；被告席；尾巴的骨肉部分；（動詞）停靠碼頭；扣減（薪資）",
        "meaningEn": "(n.) a structure at the edge of water where ships are loaded, unloaded, or repaired; (v.) (of a ship) to come into a dock; to take away part of someone's pay",
        "usagePattern": "dock at N (harbor/port); dock sb's pay",
        "syllables": null,
        "stressPattern": null,
        "phoneticUs": null,
        "familyKey": "dock",
        "isCore": true,
        "sourceNote": "高中英文參考詞彙表（111學年度起適用，大考中心）",
        "status": "reviewed",
        "usagePatternZh": "停靠港口；扣除某人薪水",
        "verbForms": {
          "base": "dock",
          "past": "docked",
          "pastParticiple": "docked",
          "sourceRef": "https://www.collinsdictionary.com/dictionary/english/dock",
          "status": "approved"
        }
      },
      "beforeRowSha256": "735cc7ccacb0926a03e122ef239c20ae29f3f4e2e49e1994ab3a61446c22033a",
      "expectedAfterRowSha256": "ef946be2534ae57ea006482646922eb75c40df5baf1f75aa4c70eae5f1f118ff",
      "fields": {
        "meaningZh": "碼頭；船塢；被告席；尾巴的骨肉部分；（動詞）停靠碼頭；扣減（薪資）",
        "verbForms": {
          "base": "dock",
          "past": "docked",
          "pastParticiple": "docked",
          "sourceRef": "https://www.collinsdictionary.com/dictionary/english/dock",
          "status": "approved"
        }
      },
      "sources": {
        "meaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101056.jpg",
            "page": 110,
            "sha256": "509ee199bff48e08e4a590fa149b34d6d8655a75788ad24aa0d740fff1c198e6",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "dock n./vt. 碼頭；減少",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "verbForms": [
          {
            "word": "dock",
            "url": "https://www.collinsdictionary.com/dictionary/english/dock",
            "excerpt": "past tense, past participle docked",
            "location": "L222"
          }
        ]
      },
      "starterIncluded": true
    },
    {
      "dataset": "words",
      "id": "W002399",
      "path": "public/data/v1/words.json",
      "key": "wordId",
      "changedFields": [
        "meaningZh",
        "meaningEn",
        "verbForms"
      ],
      "beforeRow": {
        "wordId": "W002399",
        "word": "heel",
        "wordVariants": [
          "heel"
        ],
        "level": "LV3",
        "pos": "n./v.",
        "posAll": [
          "n.",
          "v."
        ],
        "meaningZh": "腳後跟；踵；後部；傾側",
        "meaningEn": "(n.) the back part of the foot below the ankle, or the part of a shoe beneath it; (v.) (of a dog) to follow closely behind its owner",
        "usagePattern": "the heel of one's foot; high heels; Achilles' heel; on someone's heels",
        "syllables": null,
        "stressPattern": null,
        "phoneticUs": null,
        "familyKey": "heel",
        "isCore": true,
        "sourceNote": "高中英文參考詞彙表（111學年度起適用，大考中心）",
        "status": "reviewed",
        "usagePatternZh": "腳後跟；高跟鞋；阿基里斯腱（致命弱點）；緊跟在某人身後"
      },
      "expectedAfterRow": {
        "wordId": "W002399",
        "word": "heel",
        "wordVariants": [
          "heel"
        ],
        "level": "LV3",
        "pos": "n./v.",
        "posAll": [
          "n.",
          "v."
        ],
        "meaningZh": "腳後跟；踵；後部；傾側；（動詞）修理鞋跟；裝鞋跟；緊跟",
        "meaningEn": "(n.) the back part of the foot below the ankle, or the part of a shoe beneath it; (v.) (of a dog) to follow closely behind its owner; (v.) to fit or repair the heel of a shoe.",
        "usagePattern": "the heel of one's foot; high heels; Achilles' heel; on someone's heels",
        "syllables": null,
        "stressPattern": null,
        "phoneticUs": null,
        "familyKey": "heel",
        "isCore": true,
        "sourceNote": "高中英文參考詞彙表（111學年度起適用，大考中心）",
        "status": "reviewed",
        "usagePatternZh": "腳後跟；高跟鞋；阿基里斯腱（致命弱點）；緊跟在某人身後",
        "verbForms": {
          "base": "heel",
          "past": "heeled",
          "pastParticiple": "heeled",
          "sourceRef": "https://www.collinsdictionary.com/dictionary/english/heel",
          "status": "approved"
        }
      },
      "beforeRowSha256": "1f886472df5d3b0d5f13fe569bccec8a433de3e90a6c7f4aeb890217ffdc7b03",
      "expectedAfterRowSha256": "03f5c9e758b6603242c78a6767e310d1038436f764b6e4f86b1ecf9e55e31f4e",
      "fields": {
        "meaningZh": "腳後跟；踵；後部；傾側；（動詞）修理鞋跟；裝鞋跟；緊跟",
        "meaningEn": "(n.) the back part of the foot below the ankle, or the part of a shoe beneath it; (v.) (of a dog) to follow closely behind its owner; (v.) to fit or repair the heel of a shoe.",
        "verbForms": {
          "base": "heel",
          "past": "heeled",
          "pastParticiple": "heeled",
          "sourceRef": "https://www.collinsdictionary.com/dictionary/english/heel",
          "status": "approved"
        }
      },
      "sources": {
        "meaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101115.jpg",
            "page": 113,
            "sha256": "20a53277f9db8df4f0ea2da5f7734a3cb328532e1925fc716eec84a9d24aaec6",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "heel n./vt./vi. 腳後跟；高跟鞋；修理（鞋跟）；裝鞋跟；緊跟",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningEn": [
          {
            "type": "textbook_photo",
            "file": "20260815_101115.jpg",
            "page": 113,
            "sha256": "20a53277f9db8df4f0ea2da5f7734a3cb328532e1925fc716eec84a9d24aaec6",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "heel n./vt./vi. 腳後跟；高跟鞋；修理（鞋跟）；裝鞋跟；緊跟",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "url": "https://www.collinsdictionary.com/dictionary/english/heel",
            "locator": "COBUILD sense1 L224–226",
            "excerpt": "back part",
            "sense": "foot noun",
            "interpretation": "Retains anatomical heel.",
            "retrieval": "Direct web open of dictionary body, followed by open/find within the same body; not a search-result snippet."
          },
          {
            "url": "https://www.collinsdictionary.com/dictionary/english/heel",
            "locator": "COBUILD sense2 L228–230",
            "excerpt": "raised part",
            "sense": "shoe noun",
            "interpretation": "Retains shoe heel.",
            "retrieval": "Direct web open of dictionary body, followed by open/find within the same body; not a search-result snippet."
          },
          {
            "url": "https://www.collinsdictionary.com/dictionary/english/heel",
            "locator": "American English Webster sense13 L548–551",
            "excerpt": "said of a dog",
            "sense": "dog follow verb",
            "interpretation": "Retains original dog-following sense, not deleted.",
            "retrieval": "Direct web open of dictionary body, followed by open/find within the same body; not a search-result snippet."
          },
          {
            "url": "https://www.collinsdictionary.com/dictionary/english/heel",
            "locator": "American English Webster sense7 L516–520",
            "excerpt": "furnish with a heel",
            "sense": "fit heel",
            "interpretation": "Added fitting heel supported.",
            "retrieval": "Direct web open of dictionary body, followed by open/find within the same body; not a search-result snippet."
          },
          {
            "url": "https://www.collinsdictionary.com/dictionary/english/heel",
            "locator": "British English1 sense20 L403–407",
            "excerpt": "repair or replace",
            "sense": "repair heel",
            "interpretation": "Added repairing heel supported.",
            "retrieval": "Direct web open of dictionary body, followed by open/find within the same body; not a search-result snippet."
          }
        ],
        "verbForms": [
          {
            "word": "heel",
            "url": "https://www.collinsdictionary.com/dictionary/english/heel",
            "excerpt": "past tense, past participle heeled",
            "location": "L222"
          }
        ]
      },
      "starterIncluded": true
    },
    {
      "dataset": "words",
      "id": "W002728",
      "path": "public/data/v1/words.json",
      "key": "wordId",
      "changedFields": [
        "meaningZh",
        "verbForms"
      ],
      "beforeRow": {
        "wordId": "W002728",
        "word": "reserve",
        "wordVariants": [
          "reserve"
        ],
        "level": "LV3",
        "pos": "n./v.",
        "posAll": [
          "n.",
          "v."
        ],
        "meaningZh": "儲備品；貯量；後備軍；自然保護區",
        "meaningEn": "(n.) a supply of something kept for future use; an area of land kept in a natural, protected state; (v.) to arrange in advance to have something kept for you",
        "usagePattern": "reserve a table/seat; in reserve; a nature reserve",
        "syllables": null,
        "stressPattern": null,
        "phoneticUs": null,
        "familyKey": "reserve",
        "isCore": true,
        "sourceNote": "高中英文參考詞彙表（111學年度起適用，大考中心）",
        "status": "reviewed",
        "usagePatternZh": "預訂桌位／座位；備用；自然保護區"
      },
      "expectedAfterRow": {
        "wordId": "W002728",
        "word": "reserve",
        "wordVariants": [
          "reserve"
        ],
        "level": "LV3",
        "pos": "n./v.",
        "posAll": [
          "n.",
          "v."
        ],
        "meaningZh": "儲備品；貯量；後備軍；自然保護區；（動詞）預訂；儲備",
        "meaningEn": "(n.) a supply of something kept for future use; an area of land kept in a natural, protected state; (v.) to arrange in advance to have something kept for you",
        "usagePattern": "reserve a table/seat; in reserve; a nature reserve",
        "syllables": null,
        "stressPattern": null,
        "phoneticUs": null,
        "familyKey": "reserve",
        "isCore": true,
        "sourceNote": "高中英文參考詞彙表（111學年度起適用，大考中心）",
        "status": "reviewed",
        "usagePatternZh": "預訂桌位／座位；備用；自然保護區",
        "verbForms": {
          "base": "reserve",
          "past": "reserved",
          "pastParticiple": "reserved",
          "sourceRef": "https://www.collinsdictionary.com/dictionary/english/reserve",
          "status": "approved"
        }
      },
      "beforeRowSha256": "fbd1d8015f117de1672282e6d53f6a4bbd90ed0a465ace46352ac193e3feb56e",
      "expectedAfterRowSha256": "51a40b4e87ea705995b47e412aff40d89b8a85794d4fe8e2aec6eaf6ea34876d",
      "fields": {
        "meaningZh": "儲備品；貯量；後備軍；自然保護區；（動詞）預訂；儲備",
        "verbForms": {
          "base": "reserve",
          "past": "reserved",
          "pastParticiple": "reserved",
          "sourceRef": "https://www.collinsdictionary.com/dictionary/english/reserve",
          "status": "approved"
        }
      },
      "sources": {
        "meaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101046.jpg",
            "page": 109,
            "sha256": "4da68e6ee600559f778da74cba344592b1cb7d9e0e1c496ce9b00dd92981c3b3",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "reserve vt./n. 預訂；儲備；保護區",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "verbForms": [
          {
            "word": "reserve",
            "url": "https://www.collinsdictionary.com/dictionary/english/reserve",
            "excerpt": "past tense, past participle reserved",
            "location": "L222"
          }
        ]
      },
      "starterIncluded": true
    },
    {
      "dataset": "words",
      "id": "W002843",
      "path": "public/data/v1/words.json",
      "key": "wordId",
      "changedFields": [
        "meaningZh",
        "usagePattern",
        "usagePatternZh",
        "meaningEn",
        "verbForms"
      ],
      "beforeRow": {
        "wordId": "W002843",
        "word": "steady",
        "wordVariants": [
          "steady"
        ],
        "level": "LV3",
        "pos": "adj./v./adv./n.",
        "posAll": [
          "adj.",
          "v.",
          "adv.",
          "n."
        ],
        "meaningZh": "穩定的；不動搖的；沉着的；穩固的",
        "meaningEn": "make steady; not subject to change or variation especially in behavior",
        "usagePattern": "steady + N; steady to V; a/the steady",
        "syllables": null,
        "stressPattern": null,
        "phoneticUs": null,
        "familyKey": "steady",
        "isCore": true,
        "sourceNote": "高中英文參考詞彙表（111學年度起適用，大考中心）",
        "status": "draft",
        "usagePatternZh": "穩定的某物；穩定地去做某事；一個穩定的狀態"
      },
      "expectedAfterRow": {
        "wordId": "W002843",
        "word": "steady",
        "wordVariants": [
          "steady"
        ],
        "level": "LV3",
        "pos": "adj./v./adv./n.",
        "posAll": [
          "adj.",
          "v.",
          "adv.",
          "n."
        ],
        "meaningZh": "穩定的；不動搖的；沉着的；穩固的；（動詞）使穩定；（副詞）穩定地；（名詞）（關係確定的）情侶",
        "meaningEn": "(adj.) stable, firm or consistent; (v.) to make or become stable; (adv.) steadily; (n.) a regular romantic partner.",
        "usagePattern": "a steady job; steady oneself; go steady with sb; one's steady",
        "syllables": null,
        "stressPattern": null,
        "phoneticUs": null,
        "familyKey": "steady",
        "isCore": true,
        "sourceNote": "高中英文參考詞彙表（111學年度起適用，大考中心）",
        "status": "draft",
        "usagePatternZh": "穩定的工作；使自己站穩；與某人穩定交往；固定交往的對象",
        "verbForms": {
          "base": "steady",
          "past": "steadied",
          "pastParticiple": "steadied",
          "sourceRef": "https://www.collinsdictionary.com/dictionary/english/steady",
          "status": "approved"
        }
      },
      "beforeRowSha256": "f08616752eeeb581b7c19e7b3b0e4e1ec3cfaf696734b463afe89b45628d1907",
      "expectedAfterRowSha256": "54426ef5a9304d7aaa947442cb0ffc6ecd2bc3b5fa83e0cbc2b9f526908cb3dc",
      "fields": {
        "meaningZh": "穩定的；不動搖的；沉着的；穩固的；（動詞）使穩定；（副詞）穩定地；（名詞）（關係確定的）情侶",
        "usagePattern": "a steady job; steady oneself; go steady with sb; one's steady",
        "usagePatternZh": "穩定的工作；使自己站穩；與某人穩定交往；固定交往的對象",
        "meaningEn": "(adj.) stable, firm or consistent; (v.) to make or become stable; (adv.) steadily; (n.) a regular romantic partner.",
        "verbForms": {
          "base": "steady",
          "past": "steadied",
          "pastParticiple": "steadied",
          "sourceRef": "https://www.collinsdictionary.com/dictionary/english/steady",
          "status": "approved"
        }
      },
      "sources": {
        "meaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101059.jpg",
            "page": 111,
            "sha256": "9d7e7ff74bc09809e7bf4f746b1b8cd071c6fd42ab1397ee8fbbb8b977e84eaf",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "steady adj./vt./adv./n. 穩定的；使穩定；穩定地；（關係確定的）情侶",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "usagePattern": [
          {
            "type": "textbook_photo",
            "file": "20260815_101059.jpg",
            "page": 111,
            "sha256": "9d7e7ff74bc09809e7bf4f746b1b8cd071c6fd42ab1397ee8fbbb8b977e84eaf",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "steady adj./vt./adv./n. 穩定的；使穩定；穩定地；（關係確定的）情侶",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "usagePatternZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101059.jpg",
            "page": 111,
            "sha256": "9d7e7ff74bc09809e7bf4f746b1b8cd071c6fd42ab1397ee8fbbb8b977e84eaf",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "steady adj./vt./adv./n. 穩定的；使穩定；穩定地；（關係確定的）情侶",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "meaningEn": [
          {
            "type": "textbook_photo",
            "file": "20260815_101059.jpg",
            "page": 111,
            "sha256": "9d7e7ff74bc09809e7bf4f746b1b8cd071c6fd42ab1397ee8fbbb8b977e84eaf",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "steady adj./vt./adv./n. 穩定的；使穩定；穩定地；（關係確定的）情侶",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "url": "https://www.collinsdictionary.com/dictionary/english/steady",
            "locator": "British English senses1–2 L331–341",
            "excerpt": "free from fluctuation",
            "sense": "stable adjective",
            "interpretation": "Retains stable/unchanging meaning; behavior explicit American Webster sense3 L440–442.",
            "retrieval": "Direct web open of dictionary body, followed by open/find within the same body; not a search-result snippet."
          },
          {
            "url": "https://www.collinsdictionary.com/dictionary/english/steady",
            "locator": "British English sense8 L367–370",
            "excerpt": "to make or become steady",
            "sense": "verb stabilize",
            "interpretation": "Retains make steady.",
            "retrieval": "Direct web open of dictionary body, followed by open/find within the same body; not a search-result snippet."
          },
          {
            "url": "https://www.collinsdictionary.com/dictionary/english/steady",
            "locator": "British English sense9 L372–376",
            "excerpt": "in a steady manner",
            "sense": "adverb",
            "interpretation": "Added adverb directly listed.",
            "retrieval": "Direct web open of dictionary body, followed by open/find within the same body; not a search-result snippet."
          },
          {
            "url": "https://www.collinsdictionary.com/dictionary/english/steady",
            "locator": "British English sense11 L380–384",
            "excerpt": "one's regular boyfriend or girlfriend",
            "sense": "romantic partner noun",
            "interpretation": "Added noun directly listed, informal.",
            "retrieval": "Direct web open of dictionary body, followed by open/find within the same body; not a search-result snippet."
          }
        ],
        "verbForms": [
          {
            "word": "steady",
            "url": "https://www.collinsdictionary.com/dictionary/english/steady",
            "excerpt": "past tense, past participle steadied",
            "location": "L222"
          }
        ]
      },
      "starterIncluded": true
    },
    {
      "dataset": "words",
      "id": "W002926",
      "path": "public/data/v1/words.json",
      "key": "wordId",
      "changedFields": [
        "meaningZh",
        "verbForms"
      ],
      "beforeRow": {
        "wordId": "W002926",
        "word": "trace",
        "wordVariants": [
          "trace"
        ],
        "level": "LV3",
        "pos": "n./v.",
        "posAll": [
          "n.",
          "v."
        ],
        "meaningZh": "痕跡；蹤跡；微量；跡線",
        "meaningEn": "(n.) a sign that shows something existed or happened; (n.) a very small amount of something; (v.) to find or follow the origin of something",
        "usagePattern": "without a trace; a trace of N; trace sth back to N",
        "syllables": null,
        "stressPattern": null,
        "phoneticUs": null,
        "familyKey": "trace",
        "isCore": true,
        "sourceNote": "高中英文參考詞彙表（111學年度起適用，大考中心）",
        "status": "reviewed",
        "usagePatternZh": "不留痕跡；微量的……；追溯某事至……"
      },
      "expectedAfterRow": {
        "wordId": "W002926",
        "word": "trace",
        "wordVariants": [
          "trace"
        ],
        "level": "LV3",
        "pos": "n./v.",
        "posAll": [
          "n.",
          "v."
        ],
        "meaningZh": "痕跡；蹤跡；微量；跡線；（動詞）追蹤；追溯",
        "meaningEn": "(n.) a sign that shows something existed or happened; (n.) a very small amount of something; (v.) to find or follow the origin of something",
        "usagePattern": "without a trace; a trace of N; trace sth back to N",
        "syllables": null,
        "stressPattern": null,
        "phoneticUs": null,
        "familyKey": "trace",
        "isCore": true,
        "sourceNote": "高中英文參考詞彙表（111學年度起適用，大考中心）",
        "status": "reviewed",
        "usagePatternZh": "不留痕跡；微量的……；追溯某事至……",
        "verbForms": {
          "base": "trace",
          "past": "traced",
          "pastParticiple": "traced",
          "sourceRef": "https://www.collinsdictionary.com/dictionary/english/trace",
          "status": "approved"
        }
      },
      "beforeRowSha256": "8ce8cf1691fb0487ffcd4468f21ab21794d3032bcb9e58176c1755f6fc1f846c",
      "expectedAfterRowSha256": "f355b82c62afe53bc322163d72c93ed3f0701b403d7d3926df3df9fbcd245920",
      "fields": {
        "meaningZh": "痕跡；蹤跡；微量；跡線；（動詞）追蹤；追溯",
        "verbForms": {
          "base": "trace",
          "past": "traced",
          "pastParticiple": "traced",
          "sourceRef": "https://www.collinsdictionary.com/dictionary/english/trace",
          "status": "approved"
        }
      },
      "sources": {
        "meaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101059.jpg",
            "page": 111,
            "sha256": "9d7e7ff74bc09809e7bf4f746b1b8cd071c6fd42ab1397ee8fbbb8b977e84eaf",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "trace vt./n. 追蹤；蹤跡",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "verbForms": [
          {
            "word": "trace",
            "url": "https://www.collinsdictionary.com/dictionary/english/trace",
            "excerpt": "past tense, past participle traced",
            "location": "L222"
          }
        ]
      },
      "starterIncluded": true
    },
    {
      "dataset": "words",
      "id": "W002928",
      "path": "public/data/v1/words.json",
      "key": "wordId",
      "changedFields": [
        "meaningZh",
        "verbForms"
      ],
      "beforeRow": {
        "wordId": "W002928",
        "word": "trail",
        "wordVariants": [
          "trail"
        ],
        "level": "LV3",
        "pos": "n./v.",
        "posAll": [
          "n.",
          "v."
        ],
        "meaningZh": "蹤跡；痕跡；一串；尾部",
        "meaningEn": "(n.) a path through a rough area such as a forest or mountains, or a series of marks left behind (v.) to move slowly behind someone or something",
        "usagePattern": "hike/follow a trail; leave a trail of N; trail behind N",
        "syllables": null,
        "stressPattern": null,
        "phoneticUs": null,
        "familyKey": "trail",
        "isCore": true,
        "sourceNote": "高中英文參考詞彙表（111學年度起適用，大考中心）",
        "status": "reviewed",
        "usagePatternZh": "健行／跟隨步道；留下一串……；跟隨在……後面"
      },
      "expectedAfterRow": {
        "wordId": "W002928",
        "word": "trail",
        "wordVariants": [
          "trail"
        ],
        "level": "LV3",
        "pos": "n./v.",
        "posAll": [
          "n.",
          "v."
        ],
        "meaningZh": "蹤跡；痕跡；一串；尾部；小徑；（動詞）跟蹤；拖",
        "meaningEn": "(n.) a path through a rough area such as a forest or mountains, or a series of marks left behind (v.) to move slowly behind someone or something",
        "usagePattern": "hike/follow a trail; leave a trail of N; trail behind N",
        "syllables": null,
        "stressPattern": null,
        "phoneticUs": null,
        "familyKey": "trail",
        "isCore": true,
        "sourceNote": "高中英文參考詞彙表（111學年度起適用，大考中心）",
        "status": "reviewed",
        "usagePatternZh": "健行／跟隨步道；留下一串……；跟隨在……後面",
        "verbForms": {
          "base": "trail",
          "past": "trailed",
          "pastParticiple": "trailed",
          "sourceRef": "https://www.collinsdictionary.com/dictionary/english/trail",
          "status": "approved"
        }
      },
      "beforeRowSha256": "fc225f8c5fa7bba2eaf7519beee99b1e3b3bcfab30fe206446b1661acc97f7be",
      "expectedAfterRowSha256": "bd797fda9b5ec7542b5ae48b5421cf774a6820e52d224b9ca6122a3167ad344f",
      "fields": {
        "meaningZh": "蹤跡；痕跡；一串；尾部；小徑；（動詞）跟蹤；拖",
        "verbForms": {
          "base": "trail",
          "past": "trailed",
          "pastParticiple": "trailed",
          "sourceRef": "https://www.collinsdictionary.com/dictionary/english/trail",
          "status": "approved"
        }
      },
      "sources": {
        "meaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101056.jpg",
            "page": 110,
            "sha256": "509ee199bff48e08e4a590fa149b34d6d8655a75788ad24aa0d740fff1c198e6",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "trail vt./n. 跟蹤；拖；小徑",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "verbForms": [
          {
            "word": "trail",
            "url": "https://www.collinsdictionary.com/dictionary/english/trail",
            "excerpt": "past tense, past participle trailed",
            "location": "L222"
          }
        ]
      },
      "starterIncluded": true
    },
    {
      "dataset": "words",
      "id": "W002562",
      "path": "public/data/v1/words.json",
      "key": "wordId",
      "changedFields": [
        "usagePattern",
        "usagePatternZh",
        "verbForms"
      ],
      "beforeRow": {
        "wordId": "W002562",
        "word": "multiply",
        "wordVariants": [
          "multiply"
        ],
        "level": "LV3",
        "pos": "v.",
        "posAll": [
          "v."
        ],
        "meaningZh": "繁殖；乘；增加",
        "meaningEn": "combine by multiplication; combine or increase by multiplication",
        "usagePattern": "multiply + N; multiply to V",
        "syllables": null,
        "stressPattern": null,
        "phoneticUs": null,
        "familyKey": "multiply",
        "isCore": true,
        "sourceNote": "高中英文參考詞彙表（111學年度起適用，大考中心）",
        "status": "draft",
        "usagePatternZh": "乘以……；乘以以做……"
      },
      "expectedAfterRow": {
        "wordId": "W002562",
        "word": "multiply",
        "wordVariants": [
          "multiply"
        ],
        "level": "LV3",
        "pos": "v.",
        "posAll": [
          "v."
        ],
        "meaningZh": "繁殖；乘；增加",
        "meaningEn": "combine by multiplication; combine or increase by multiplication",
        "usagePattern": "multiply A by B; multiply A and B",
        "syllables": null,
        "stressPattern": null,
        "phoneticUs": null,
        "familyKey": "multiply",
        "isCore": true,
        "sourceNote": "高中英文參考詞彙表（111學年度起適用，大考中心）",
        "status": "draft",
        "usagePatternZh": "A 乘以 B；A 和 B 相乘",
        "verbForms": {
          "base": "multiply",
          "past": "multiplied",
          "pastParticiple": "multiplied",
          "sourceRef": "https://www.collinsdictionary.com/dictionary/english/multiply",
          "status": "approved"
        }
      },
      "beforeRowSha256": "821bfa2cd05b8a56c2411990391d443c057e588a71bf5b6fb5c379e727a1e061",
      "expectedAfterRowSha256": "5cc8d5442dc42fdb87b114d71ab54420bb099fea2b1cecb4a70e299cdba11417",
      "fields": {
        "usagePattern": "multiply A by B; multiply A and B",
        "usagePatternZh": "A 乘以 B；A 和 B 相乘",
        "verbForms": {
          "base": "multiply",
          "past": "multiplied",
          "pastParticiple": "multiplied",
          "sourceRef": "https://www.collinsdictionary.com/dictionary/english/multiply",
          "status": "approved"
        }
      },
      "sources": {
        "usagePattern": [
          {
            "type": "textbook_photo",
            "file": "20260815_101223.jpg",
            "page": 118,
            "sha256": "daced8e490b64cdb43c6ff4b71a144ba3b80a0ee6e2d37531cbf5e6d08eecd29",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "multiply vt. 乘",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "usagePatternZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101223.jpg",
            "page": 118,
            "sha256": "daced8e490b64cdb43c6ff4b71a144ba3b80a0ee6e2d37531cbf5e6d08eecd29",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "multiply vt. 乘",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "verbForms": [
          {
            "word": "multiply",
            "url": "https://www.collinsdictionary.com/dictionary/english/multiply",
            "excerpt": "past tense, past participle multiplied",
            "location": "L222"
          }
        ]
      },
      "starterIncluded": true
    },
    {
      "dataset": "words",
      "id": "W002865",
      "path": "public/data/v1/words.json",
      "key": "wordId",
      "changedFields": [
        "usagePattern",
        "usagePatternZh",
        "verbForms"
      ],
      "beforeRow": {
        "wordId": "W002865",
        "word": "subtract",
        "wordVariants": [
          "subtract"
        ],
        "level": "LV3",
        "pos": "v.",
        "posAll": [
          "v."
        ],
        "meaningZh": "減去；扣掉；減少；做減法",
        "meaningEn": "make a subtraction; take off or away",
        "usagePattern": "subtract + N; subtract to V",
        "syllables": null,
        "stressPattern": null,
        "phoneticUs": null,
        "familyKey": "subtract",
        "isCore": true,
        "sourceNote": "高中英文參考詞彙表（111學年度起適用，大考中心）",
        "status": "draft",
        "usagePatternZh": "減去……；減去以……"
      },
      "expectedAfterRow": {
        "wordId": "W002865",
        "word": "subtract",
        "wordVariants": [
          "subtract"
        ],
        "level": "LV3",
        "pos": "v.",
        "posAll": [
          "v."
        ],
        "meaningZh": "減去；扣掉；減少；做減法",
        "meaningEn": "make a subtraction; take off or away",
        "usagePattern": "subtract A from B",
        "syllables": null,
        "stressPattern": null,
        "phoneticUs": null,
        "familyKey": "subtract",
        "isCore": true,
        "sourceNote": "高中英文參考詞彙表（111學年度起適用，大考中心）",
        "status": "draft",
        "usagePatternZh": "從 B 中減去 A（B 減 A）",
        "verbForms": {
          "base": "subtract",
          "past": "subtracted",
          "pastParticiple": "subtracted",
          "sourceRef": "https://www.collinsdictionary.com/dictionary/english/subtract",
          "status": "approved"
        }
      },
      "beforeRowSha256": "10e27094997af3074967c5a045edfd2db03f4691ac9b83809d375cd6480f2bb4",
      "expectedAfterRowSha256": "621f9f3d21bf77ee33cfbe2f5b42eefc63f35cf258fa25b6c44542f39c234e7b",
      "fields": {
        "usagePattern": "subtract A from B",
        "usagePatternZh": "從 B 中減去 A（B 減 A）",
        "verbForms": {
          "base": "subtract",
          "past": "subtracted",
          "pastParticiple": "subtracted",
          "sourceRef": "https://www.collinsdictionary.com/dictionary/english/subtract",
          "status": "approved"
        }
      },
      "sources": {
        "usagePattern": [
          {
            "type": "textbook_photo",
            "file": "20260815_101223.jpg",
            "page": 118,
            "sha256": "daced8e490b64cdb43c6ff4b71a144ba3b80a0ee6e2d37531cbf5e6d08eecd29",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "subtract vt. 減",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "usagePatternZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101223.jpg",
            "page": 118,
            "sha256": "daced8e490b64cdb43c6ff4b71a144ba3b80a0ee6e2d37531cbf5e6d08eecd29",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "subtract vt. 減",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "verbForms": [
          {
            "word": "subtract",
            "url": "https://www.collinsdictionary.com/dictionary/english/subtract",
            "excerpt": "past tense, past participle subtracted",
            "location": "L222"
          }
        ]
      },
      "starterIncluded": true
    },
    {
      "dataset": "words",
      "id": "W002542",
      "path": "public/data/v1/words.json",
      "key": "wordId",
      "changedFields": [
        "meaningEn",
        "usagePattern",
        "usagePatternZh"
      ],
      "beforeRow": {
        "wordId": "W002542",
        "word": "minus",
        "wordVariants": [
          "minus"
        ],
        "level": "LV3",
        "pos": "prep./n./adj.",
        "posAll": [
          "prep.",
          "n.",
          "adj."
        ],
        "meaningZh": "負號；不足；減的；負的",
        "meaningEn": "on the negative side or lower end of a scale; involving disadvantage or harm",
        "usagePattern": "a/the minus; minus of N; be minus",
        "syllables": null,
        "stressPattern": null,
        "phoneticUs": null,
        "familyKey": "minus",
        "isCore": true,
        "sourceNote": "高中英文參考詞彙表（111學年度起適用，大考中心）",
        "status": "draft",
        "usagePatternZh": "負號；某物的負值；為負數"
      },
      "expectedAfterRow": {
        "wordId": "W002542",
        "word": "minus",
        "wordVariants": [
          "minus"
        ],
        "level": "LV3",
        "pos": "prep./n./adj.",
        "posAll": [
          "prep.",
          "n.",
          "adj."
        ],
        "meaningZh": "負號；不足；減的；負的",
        "meaningEn": "(prep.) with a number or amount subtracted; (adj.) below zero or negative; involving disadvantage or harm; (n.) a minus sign, a disadvantage or a negative amount.",
        "usagePattern": "A minus B; minus three degrees; a minus sign",
        "syllables": null,
        "stressPattern": null,
        "phoneticUs": null,
        "familyKey": "minus",
        "isCore": true,
        "sourceNote": "高中英文參考詞彙表（111學年度起適用，大考中心）",
        "status": "draft",
        "usagePatternZh": "A 減 B；零下三度；減號／負號"
      },
      "beforeRowSha256": "e83cec206f96cf16533503b547957641807b98cdd468d86a4bacb1e710c06a09",
      "expectedAfterRowSha256": "4318a6254bcf94959d373b0f31f445e61d4ded1b8729da824b2f25adb6ddfede",
      "fields": {
        "meaningEn": "(prep.) with a number or amount subtracted; (adj.) below zero or negative; involving disadvantage or harm; (n.) a minus sign, a disadvantage or a negative amount.",
        "usagePattern": "A minus B; minus three degrees; a minus sign",
        "usagePatternZh": "A 減 B；零下三度；減號／負號"
      },
      "sources": {
        "meaningEn": [
          {
            "type": "textbook_photo",
            "file": "20260815_101223.jpg",
            "page": 118,
            "sha256": "daced8e490b64cdb43c6ff4b71a144ba3b80a0ee6e2d37531cbf5e6d08eecd29",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "minus prep./adj. （算術）減；零以下的；負數的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          },
          {
            "type": "dictionary",
            "url": "https://www.collinsdictionary.com/dictionary/english/minus",
            "excerpt": "involving a disadvantage, harm; minus sign; a negative quantity; a disadvantage, loss, or deficit",
            "locator": "British adjective sense 5 L334; noun senses 9–11 L352–362",
            "verification": "direct_dictionary_page_read_2026-11-08",
            "claim": "直接證實原形容詞不利／有害義及新增名詞三義；照片僅證本章prep./adj.。"
          }
        ],
        "usagePattern": [
          {
            "type": "textbook_photo",
            "file": "20260815_101223.jpg",
            "page": 118,
            "sha256": "daced8e490b64cdb43c6ff4b71a144ba3b80a0ee6e2d37531cbf5e6d08eecd29",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "minus prep./adj. （算術）減；零以下的；負數的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "usagePatternZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101223.jpg",
            "page": 118,
            "sha256": "daced8e490b64cdb43c6ff4b71a144ba3b80a0ee6e2d37531cbf5e6d08eecd29",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "minus prep./adj. （算術）減；零以下的；負數的",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ]
      },
      "starterIncluded": true
    },
    {
      "dataset": "words",
      "id": "W002431",
      "path": "public/data/v1/words.json",
      "key": "wordId",
      "changedFields": [
        "meaningZh",
        "verbForms"
      ],
      "beforeRow": {
        "wordId": "W002431",
        "word": "impress",
        "wordVariants": [
          "impress"
        ],
        "level": "LV3",
        "pos": "v.",
        "posAll": [
          "v."
        ],
        "meaningZh": "印象；特徵；印記；使有印象",
        "meaningEn": "to make someone feel admiration and respect; (impress sth on/upon sb) to make someone fully understand how important something is",
        "usagePattern": "impress sb (with N); be impressed by/with N; impress sth upon sb",
        "syllables": null,
        "stressPattern": null,
        "phoneticUs": null,
        "familyKey": "impress",
        "isCore": true,
        "sourceNote": "高中英文參考詞彙表（111學年度起適用，大考中心）",
        "status": "reviewed",
        "usagePatternZh": "以……給某人留下印象；對……印象深刻；使某人銘記……"
      },
      "expectedAfterRow": {
        "wordId": "W002431",
        "word": "impress",
        "wordVariants": [
          "impress"
        ],
        "level": "LV3",
        "pos": "v.",
        "posAll": [
          "v."
        ],
        "meaningZh": "印象；特徵；印記；使有印象；（動詞）使印象深刻；使銘記",
        "meaningEn": "to make someone feel admiration and respect; (impress sth on/upon sb) to make someone fully understand how important something is",
        "usagePattern": "impress sb (with N); be impressed by/with N; impress sth upon sb",
        "syllables": null,
        "stressPattern": null,
        "phoneticUs": null,
        "familyKey": "impress",
        "isCore": true,
        "sourceNote": "高中英文參考詞彙表（111學年度起適用，大考中心）",
        "status": "reviewed",
        "usagePatternZh": "以……給某人留下印象；對……印象深刻；使某人銘記……",
        "verbForms": {
          "base": "impress",
          "past": "impressed",
          "pastParticiple": "impressed",
          "sourceRef": "https://www.collinsdictionary.com/dictionary/english/impress",
          "status": "approved"
        }
      },
      "beforeRowSha256": "64dab849dc57bb405c7abab3397922ad58d8523b3e4e8687519f3424ed8f3978",
      "expectedAfterRowSha256": "17f66988b34ab1acf77f98dd6a0b9b80743d0956f196b9a80e1265d1c63dfa13",
      "fields": {
        "meaningZh": "印象；特徵；印記；使有印象；（動詞）使印象深刻；使銘記",
        "verbForms": {
          "base": "impress",
          "past": "impressed",
          "pastParticiple": "impressed",
          "sourceRef": "https://www.collinsdictionary.com/dictionary/english/impress",
          "status": "approved"
        }
      },
      "sources": {
        "meaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101130.jpg",
            "page": 114,
            "sha256": "3dcc30eaaf9bb0f3170f3f342253ecfc56f238222c6055cc63055f035c8403a8",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "impress vt. 使印象深刻；使銘記",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ],
        "verbForms": [
          {
            "word": "impress",
            "url": "https://www.collinsdictionary.com/dictionary/english/impress",
            "excerpt": "past tense, past participle impressed",
            "location": "L222"
          }
        ]
      },
      "starterIncluded": true
    },
    {
      "dataset": "words",
      "id": "W003767",
      "path": "public/data/v1/words.json",
      "key": "wordId",
      "changedFields": [
        "meaningZh"
      ],
      "beforeRow": {
        "wordId": "W003767",
        "word": "preserve",
        "wordVariants": [
          "preserve"
        ],
        "level": "LV4",
        "pos": "v.",
        "posAll": [
          "v."
        ],
        "meaningZh": "保護；保持；保存；維持",
        "meaningEn": "to keep something as it is, especially in order to prevent it from being damaged, destroyed, or lost",
        "usagePattern": "preserve + N (tradition/food/environment)",
        "syllables": null,
        "stressPattern": null,
        "phoneticUs": null,
        "familyKey": "preserve",
        "isCore": true,
        "sourceNote": "高中英文參考詞彙表（111學年度起適用，大考中心）",
        "status": "reviewed",
        "usagePatternZh": "保存傳統、食物或環境",
        "verbForms": {
          "base": "preserve",
          "past": "preserved",
          "pastParticiple": "preserved",
          "sourceRef": "https://www.collinsdictionary.com/dictionary/english/preserve",
          "status": "approved"
        }
      },
      "expectedAfterRow": {
        "wordId": "W003767",
        "word": "preserve",
        "wordVariants": [
          "preserve"
        ],
        "level": "LV4",
        "pos": "v.",
        "posAll": [
          "v."
        ],
        "meaningZh": "保護；保持；保存；維持；（名詞，常用複數 preserves）果醬；蜜餞",
        "meaningEn": "to keep something as it is, especially in order to prevent it from being damaged, destroyed, or lost",
        "usagePattern": "preserve + N (tradition/food/environment)",
        "syllables": null,
        "stressPattern": null,
        "phoneticUs": null,
        "familyKey": "preserve",
        "isCore": true,
        "sourceNote": "高中英文參考詞彙表（111學年度起適用，大考中心）",
        "status": "reviewed",
        "usagePatternZh": "保存傳統、食物或環境",
        "verbForms": {
          "base": "preserve",
          "past": "preserved",
          "pastParticiple": "preserved",
          "sourceRef": "https://www.collinsdictionary.com/dictionary/english/preserve",
          "status": "approved"
        }
      },
      "beforeRowSha256": "9e6897605904b4ad5ae1787e9f88b5a77ee5ecfc0fe7228bc27788805f580121",
      "expectedAfterRowSha256": "5b5ccf425720db3451b6dbd11819db2314e2e79c94a6fa5887d8036639d1b6e9",
      "fields": {
        "meaningZh": "保護；保持；保存；維持；（名詞，常用複數 preserves）果醬；蜜餞"
      },
      "sources": {
        "meaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101046.jpg",
            "page": 109,
            "sha256": "4da68e6ee600559f778da74cba344592b1cb7d9e0e1c496ce9b00dd92981c3b3",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "preserve vt./n. 保護；保存；果醬；蜜餞（常用複數）",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ]
      },
      "starterIncluded": true
    },
    {
      "dataset": "notes",
      "id": "NXe270511b",
      "path": "public/data/v1/notes.json",
      "key": "noteId",
      "changedFields": [
        "content"
      ],
      "beforeRow": {
        "noteId": "NXe270511b",
        "word": "track",
        "noteType": "usage",
        "title": "track down...",
        "content": "追蹤查／到……。",
        "status": "approved"
      },
      "expectedAfterRow": {
        "noteId": "NXe270511b",
        "word": "track",
        "noteType": "usage",
        "title": "track down...",
        "content": "追蹤找到／查到……。",
        "status": "approved"
      },
      "beforeRowSha256": "3f8f56ca40e4b32ce8978c99ad2a1e6e62f98288f4adae2f7f6780e9a49fa697",
      "expectedAfterRowSha256": "37df0c26f3146dfc2befb1b14bb2fff49d4076169edfe8e4267a33ffe953cb10",
      "fields": {
        "content": "追蹤找到／查到……。"
      },
      "sources": {
        "content": [
          {
            "type": "dictionary",
            "url": "https://www.collinsdictionary.com/dictionary/english/track-down",
            "excerpt": "find them, or find information about them",
            "summary": "經搜尋後找到某人／某物；修復原中文字串錯置。",
            "locator": "dictionary entry; accessed 2026-11-08",
            "verification": "web_text_direct_or_indexed_dictionary_text_read",
            "readDate": "2026-11-08"
          }
        ]
      },
      "starterIncluded": true
    },
    {
      "dataset": "examples",
      "id": "EXa746dcc7",
      "path": "public/data/v1/examples.json",
      "key": "exampleId",
      "changedFields": [
        "sentenceZh"
      ],
      "beforeRow": {
        "exampleId": "EXa746dcc7",
        "word": "trace",
        "sensePos": "n.",
        "meaningHint": null,
        "exampleType": "exam",
        "sentenceEn": "Some ships in the Bermuda Triangle were reported to have disappeared without a trace.",
        "sentenceZh": "據報導，有些船隻在百慕達三角洲消失得無影無蹤。",
        "blankSentence": "Some ships in the Bermuda Triangle were reported to have disappeared without a ______.",
        "answer": "trace",
        "difficulty": "LV3",
        "status": "reviewed"
      },
      "expectedAfterRow": {
        "exampleId": "EXa746dcc7",
        "word": "trace",
        "sensePos": "n.",
        "meaningHint": null,
        "exampleType": "exam",
        "sentenceEn": "Some ships in the Bermuda Triangle were reported to have disappeared without a trace.",
        "sentenceZh": "據報導，有些船隻在百慕達三角地帶消失得無影無蹤。",
        "blankSentence": "Some ships in the Bermuda Triangle were reported to have disappeared without a ______.",
        "answer": "trace",
        "difficulty": "LV3",
        "status": "reviewed"
      },
      "beforeRowSha256": "81919d182489cf714c86e0de848af128492c33400211ce6ee9adb937fefe31ce",
      "expectedAfterRowSha256": "1cd5876ec7ea921483124f0e59d610a1598c9c652340e63b1619c791238705e7",
      "fields": {
        "sentenceZh": "據報導，有些船隻在百慕達三角地帶消失得無影無蹤。"
      },
      "sources": {
        "sentenceZh": [
          {
            "type": "official_reference",
            "url": "https://oceanservice.noaa.gov/facts/bermudatri.html",
            "excerpt": "a region in the western part of the North Atlantic Ocean",
            "summary": "Bermuda Triangle 指北大西洋海域而非河口三角洲；原句 reported/alleged 語氣維持。",
            "readDate": "2026-11-08"
          },
          {
            "url": "https://oceanservice.noaa.gov/facts/bermudatri.html",
            "title": "What is the Bermuda Triangle?",
            "retrieval": "Direct open of exact .html URL, not search snippet. Returned 30 body lines.",
            "locator": "Heading and lead L4–5; context L15–18",
            "excerpt": "a region in the western part of the North Atlantic Ocean",
            "interpretation": "Confirms an ocean region, not a river delta. Supports changing 三角洲 to 三角地帶 only. Does not independently certify Chinese wording or supernatural claims. L16 says no evidence of unusually frequent mysterious disappearances; no change to the original attributed/reported English sentence is proposed."
          }
        ]
      },
      "starterIncluded": true
    },
    {
      "dataset": "examples",
      "id": "EX35afe929",
      "path": "public/data/v1/examples.json",
      "key": "exampleId",
      "changedFields": [
        "sensePos"
      ],
      "beforeRow": {
        "exampleId": "EX35afe929",
        "word": "dock",
        "sensePos": "n.",
        "meaningHint": null,
        "exampleType": "exam",
        "sentenceEn": "The ship docked at the harbor early in the morning to unload its cargo.",
        "sentenceZh": "這艘船一大早就停靠在港口卸貨。",
        "blankSentence": "The ship _____ at the harbor early in the morning to unload its cargo.",
        "answer": "docked",
        "difficulty": "LV3",
        "status": "reviewed"
      },
      "expectedAfterRow": {
        "exampleId": "EX35afe929",
        "word": "dock",
        "sensePos": "v.",
        "meaningHint": null,
        "exampleType": "exam",
        "sentenceEn": "The ship docked at the harbor early in the morning to unload its cargo.",
        "sentenceZh": "這艘船一大早就停靠在港口卸貨。",
        "blankSentence": "The ship _____ at the harbor early in the morning to unload its cargo.",
        "answer": "docked",
        "difficulty": "LV3",
        "status": "reviewed"
      },
      "beforeRowSha256": "152930ede59ec73270a880ee2457fe19e26c999a8eee249a7906577da08c7797",
      "expectedAfterRowSha256": "cda7425c129618a81c77537c1e35d533b1fc5da1963619d794ec98c70f3e0aec",
      "fields": {
        "sensePos": "v."
      },
      "sources": {
        "sensePos": [
          {
            "type": "frozen_example",
            "exampleId": "EX35afe929",
            "sentenceEn": "The ship docked at the harbor early in the morning to unload its cargo.",
            "answer": "docked",
            "claim": "依原句實際挖空詞辨識句法角色，不改英文、中文或情境。"
          },
          {
            "type": "dictionary",
            "url": "https://www.collinsdictionary.com/dictionary/english/dock",
            "excerpt": "When a ship docks or is docked",
            "summary": "動詞停靠；另一動詞義扣薪。",
            "verification": "indexed_dictionary_text_read",
            "readDate": "2026-11-08"
          }
        ]
      },
      "starterIncluded": true
    },
    {
      "dataset": "examples",
      "id": "EXcbade46d",
      "path": "public/data/v1/examples.json",
      "key": "exampleId",
      "changedFields": [
        "sensePos"
      ],
      "beforeRow": {
        "exampleId": "EXcbade46d",
        "word": "dock",
        "sensePos": "n.",
        "meaningHint": null,
        "exampleType": "daily",
        "sentenceEn": "The boss decided to dock his pay for being late three times this month.",
        "sentenceZh": "老闆決定扣他的薪水，因為他這個月遲到三次。",
        "blankSentence": "The boss decided to _____ his pay for being late three times this month.",
        "answer": "dock",
        "difficulty": "LV3",
        "status": "reviewed"
      },
      "expectedAfterRow": {
        "exampleId": "EXcbade46d",
        "word": "dock",
        "sensePos": "v.",
        "meaningHint": null,
        "exampleType": "daily",
        "sentenceEn": "The boss decided to dock his pay for being late three times this month.",
        "sentenceZh": "老闆決定扣他的薪水，因為他這個月遲到三次。",
        "blankSentence": "The boss decided to _____ his pay for being late three times this month.",
        "answer": "dock",
        "difficulty": "LV3",
        "status": "reviewed"
      },
      "beforeRowSha256": "44aec36a575bf0ddb7bcf53df1a88a7e9631470e70708c13270f3395b268c8a4",
      "expectedAfterRowSha256": "ff504b02d16fe92a1a2983018afb6e03f3258e219fba97990492a78f932a8e03",
      "fields": {
        "sensePos": "v."
      },
      "sources": {
        "sensePos": [
          {
            "type": "frozen_example",
            "exampleId": "EXcbade46d",
            "sentenceEn": "The boss decided to dock his pay for being late three times this month.",
            "answer": "dock",
            "claim": "依原句實際挖空詞辨識句法角色，不改英文、中文或情境。"
          },
          {
            "type": "dictionary",
            "url": "https://www.collinsdictionary.com/dictionary/english/dock",
            "excerpt": "When a ship docks or is docked",
            "summary": "動詞停靠；另一動詞義扣薪。",
            "verification": "indexed_dictionary_text_read",
            "readDate": "2026-11-08"
          }
        ]
      },
      "starterIncluded": true
    },
    {
      "dataset": "examples",
      "id": "EX4117b172",
      "path": "public/data/v1/examples.json",
      "key": "exampleId",
      "changedFields": [
        "sensePos"
      ],
      "beforeRow": {
        "exampleId": "EX4117b172",
        "word": "splash",
        "sensePos": "v.",
        "meaningHint": null,
        "exampleType": "daily",
        "sentenceEn": "The little dog jumped into the pool and made a big splash.",
        "sentenceZh": "那隻小狗跳進泳池裡，濺起一大片水花。",
        "blankSentence": "The little dog jumped into the pool and made a big _____.",
        "answer": "splash",
        "difficulty": "LV3",
        "status": "reviewed"
      },
      "expectedAfterRow": {
        "exampleId": "EX4117b172",
        "word": "splash",
        "sensePos": "n.",
        "meaningHint": null,
        "exampleType": "daily",
        "sentenceEn": "The little dog jumped into the pool and made a big splash.",
        "sentenceZh": "那隻小狗跳進泳池裡，濺起一大片水花。",
        "blankSentence": "The little dog jumped into the pool and made a big _____.",
        "answer": "splash",
        "difficulty": "LV3",
        "status": "reviewed"
      },
      "beforeRowSha256": "d1218016c69496aa168f2c675678f1067faf38882995127c4a7b2423eb728591",
      "expectedAfterRowSha256": "55b95171dcbf924c8d467fac40c8d7d80bf2b12c79ba2502468ad6d334de13bb",
      "fields": {
        "sensePos": "n."
      },
      "sources": {
        "sensePos": [
          {
            "type": "frozen_example",
            "exampleId": "EX4117b172",
            "sentenceEn": "The little dog jumped into the pool and made a big splash.",
            "answer": "splash",
            "claim": "依原句實際挖空詞辨識句法角色，不改英文、中文或情境。"
          },
          {
            "type": "textbook_photo",
            "file": "20260815_101130.jpg",
            "page": 114,
            "sha256": "3dcc30eaaf9bb0f3170f3f342253ecfc56f238222c6055cc63055f035c8403a8",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "splash vt./vi./n. 潑水；濺起水花；濺起的水花聲",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ]
      },
      "starterIncluded": true
    },
    {
      "dataset": "examples",
      "id": "EX451c0f57",
      "path": "public/data/v1/examples.json",
      "key": "exampleId",
      "changedFields": [
        "sensePos"
      ],
      "beforeRow": {
        "exampleId": "EX451c0f57",
        "word": "desire",
        "sensePos": "n.",
        "meaningHint": null,
        "exampleType": "daily",
        "sentenceEn": "She has always desired a quiet life in the countryside.",
        "sentenceZh": "她一直渴望在鄉下過寧靜的生活。",
        "blankSentence": "She has always _____ a quiet life in the countryside.",
        "answer": "desired",
        "difficulty": "LV3",
        "status": "reviewed"
      },
      "expectedAfterRow": {
        "exampleId": "EX451c0f57",
        "word": "desire",
        "sensePos": "v.",
        "meaningHint": null,
        "exampleType": "daily",
        "sentenceEn": "She has always desired a quiet life in the countryside.",
        "sentenceZh": "她一直渴望在鄉下過寧靜的生活。",
        "blankSentence": "She has always _____ a quiet life in the countryside.",
        "answer": "desired",
        "difficulty": "LV3",
        "status": "reviewed"
      },
      "beforeRowSha256": "f8bcba84f6067486172b812dfff0385498d8c19782bf55479cd1ca3b146ef83b",
      "expectedAfterRowSha256": "e8db26179c0e1e51fc41beef57f9522ba137a8f4e8f9035af00fe2211d5ed234",
      "fields": {
        "sensePos": "v."
      },
      "sources": {
        "sensePos": [
          {
            "type": "frozen_example",
            "exampleId": "EX451c0f57",
            "sentenceEn": "She has always desired a quiet life in the countryside.",
            "answer": "desired",
            "claim": "依原句實際挖空詞辨識句法角色，不改英文、中文或情境。"
          },
          {
            "type": "textbook_photo",
            "file": "20260815_101154.jpg",
            "page": 115,
            "sha256": "f209d8b46ccbb46893daf48a01b46ccd2aab1fdf49ad990972aaae5ca3638336",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "desire vt./n. 渴望；想要；慾望",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ]
      },
      "starterIncluded": true
    },
    {
      "dataset": "examples",
      "id": "EXa0ea8c50",
      "path": "public/data/v1/examples.json",
      "key": "exampleId",
      "changedFields": [
        "sensePos"
      ],
      "beforeRow": {
        "exampleId": "EXa0ea8c50",
        "word": "debut",
        "sensePos": "n.",
        "meaningHint": null,
        "exampleType": "daily",
        "sentenceEn": "The new phone will debut at the tech show next month.",
        "sentenceZh": "這款新手機將於下個月的科技展首次亮相。",
        "blankSentence": "The new phone will _____ at the tech show next month.",
        "answer": "debut",
        "difficulty": "LV5",
        "status": "reviewed"
      },
      "expectedAfterRow": {
        "exampleId": "EXa0ea8c50",
        "word": "debut",
        "sensePos": "v.",
        "meaningHint": null,
        "exampleType": "daily",
        "sentenceEn": "The new phone will debut at the tech show next month.",
        "sentenceZh": "這款新手機將於下個月的科技展首次亮相。",
        "blankSentence": "The new phone will _____ at the tech show next month.",
        "answer": "debut",
        "difficulty": "LV5",
        "status": "reviewed"
      },
      "beforeRowSha256": "d7e5e209ebc0f888f5a2f06104778d7c6f91ffa7d5d0972a3bddf78a45c42158",
      "expectedAfterRowSha256": "f1d55d63fcaa28fd6d650ae4129c7e368e2dcc11bb423021561150174d342c37",
      "fields": {
        "sensePos": "v."
      },
      "sources": {
        "sensePos": [
          {
            "type": "frozen_example",
            "exampleId": "EXa0ea8c50",
            "sentenceEn": "The new phone will debut at the tech show next month.",
            "answer": "debut",
            "claim": "依原句實際挖空詞辨識句法角色，不改英文、中文或情境。"
          },
          {
            "type": "dictionary",
            "url": "https://www.collinsdictionary.com/dictionary/english/debut",
            "excerpt": "verb (intransitive); to make a debut",
            "summary": "名詞首次公開亮相；動詞首次登場。原例句 The new phone will debut 使用動詞。",
            "locator": "Collins British sense 3, lines 283–287",
            "verification": "web_text_direct_or_indexed_dictionary_text_read",
            "readDate": "2026-11-08"
          }
        ]
      },
      "starterIncluded": true
    },
    {
      "dataset": "examples",
      "id": "EXaafdfe01",
      "path": "public/data/v1/examples.json",
      "key": "exampleId",
      "changedFields": [
        "sensePos"
      ],
      "beforeRow": {
        "exampleId": "EXaafdfe01",
        "word": "antique",
        "sensePos": "n.",
        "meaningHint": null,
        "exampleType": "daily",
        "sentenceEn": "My aunt collects antique furniture from the early 1900s.",
        "sentenceZh": "我阿姨收集1900年代早期的古董傢俱。",
        "blankSentence": "My aunt collects _____ furniture from the early 1900s.",
        "answer": "antique",
        "difficulty": "LV5",
        "status": "reviewed"
      },
      "expectedAfterRow": {
        "exampleId": "EXaafdfe01",
        "word": "antique",
        "sensePos": "adj.",
        "meaningHint": null,
        "exampleType": "daily",
        "sentenceEn": "My aunt collects antique furniture from the early 1900s.",
        "sentenceZh": "我阿姨收集1900年代早期的古董傢俱。",
        "blankSentence": "My aunt collects _____ furniture from the early 1900s.",
        "answer": "antique",
        "difficulty": "LV5",
        "status": "reviewed"
      },
      "beforeRowSha256": "57d855884f137b24c993a5e396bab3afb72feec04a88a10b7bedeaf01a0e96a1",
      "expectedAfterRowSha256": "689e54b475b52534ff72fc4145f395a7682672bf856e7792dd89ed8a9ae7d457",
      "fields": {
        "sensePos": "adj."
      },
      "sources": {
        "sensePos": [
          {
            "type": "frozen_example",
            "exampleId": "EXaafdfe01",
            "sentenceEn": "My aunt collects antique furniture from the early 1900s.",
            "answer": "antique",
            "claim": "依原句實際挖空詞辨識句法角色，不改英文、中文或情境。"
          },
          {
            "type": "dictionary",
            "url": "https://www.collinsdictionary.com/dictionary/english/antique",
            "excerpt": "adjective",
            "summary": "修飾 furniture 的 antique 是形容詞。",
            "verification": "indexed_dictionary_text_read",
            "readDate": "2026-11-08"
          }
        ]
      },
      "starterIncluded": true
    },
    {
      "dataset": "examples",
      "id": "EXb0d84df9",
      "path": "public/data/v1/examples.json",
      "key": "exampleId",
      "changedFields": [
        "sensePos"
      ],
      "beforeRow": {
        "exampleId": "EXb0d84df9",
        "word": "reserve",
        "sensePos": "n.",
        "meaningHint": null,
        "exampleType": "daily",
        "sentenceEn": "I'd like to reserve a table for two this Friday evening.",
        "sentenceZh": "我想預訂本週五晚上兩人的座位。",
        "blankSentence": "I'd like to _____ a table for two this Friday evening.",
        "answer": "reserve",
        "difficulty": "LV3",
        "status": "reviewed"
      },
      "expectedAfterRow": {
        "exampleId": "EXb0d84df9",
        "word": "reserve",
        "sensePos": "v.",
        "meaningHint": null,
        "exampleType": "daily",
        "sentenceEn": "I'd like to reserve a table for two this Friday evening.",
        "sentenceZh": "我想預訂本週五晚上兩人的座位。",
        "blankSentence": "I'd like to _____ a table for two this Friday evening.",
        "answer": "reserve",
        "difficulty": "LV3",
        "status": "reviewed"
      },
      "beforeRowSha256": "0e80576adb8b4c7bbed366a1241eade413ef47083d99adb386ce35b1e340595b",
      "expectedAfterRowSha256": "4bb88b9fa36442c73b6782f4e9aa5628fd3ef512b15a3a7b9cfae0c768dd5f74",
      "fields": {
        "sensePos": "v."
      },
      "sources": {
        "sensePos": [
          {
            "type": "frozen_example",
            "exampleId": "EXb0d84df9",
            "sentenceEn": "I'd like to reserve a table for two this Friday evening.",
            "answer": "reserve",
            "claim": "依原句實際挖空詞辨識句法角色，不改英文、中文或情境。"
          },
          {
            "type": "dictionary",
            "url": "https://www.collinsdictionary.com/dictionary/english/reserve",
            "excerpt": "reserve something such as a table",
            "summary": "預訂是動詞。",
            "verification": "indexed_dictionary_text_read",
            "readDate": "2026-11-08"
          }
        ]
      },
      "starterIncluded": true
    },
    {
      "dataset": "words",
      "id": "W000104",
      "path": "public/data/v1/words.json",
      "key": "wordId",
      "changedFields": [
        "meaningZh"
      ],
      "beforeRow": {
        "wordId": "W000104",
        "word": "boring",
        "wordVariants": [
          "boring"
        ],
        "level": "LV1",
        "pos": "adj.",
        "posAll": [
          "adj."
        ],
        "meaningZh": "煩人的；無聊的；無趣的；成孔期",
        "meaningEn": "(related noun boring) the act of drilling a hole in the earth in the hope of producing petroleum; (adj.) so lacking in interest as to cause mental weariness",
        "usagePattern": "be boring; a boring class/story",
        "syllables": null,
        "stressPattern": null,
        "phoneticUs": null,
        "familyKey": "boring",
        "isCore": true,
        "sourceNote": "高中英文參考詞彙表（111學年度起適用，大考中心）",
        "status": "draft",
        "usagePatternZh": "很無聊；無聊的課／故事"
      },
      "expectedAfterRow": {
        "wordId": "W000104",
        "word": "boring",
        "wordVariants": [
          "boring"
        ],
        "level": "LV1",
        "pos": "adj.",
        "posAll": [
          "adj."
        ],
        "meaningZh": "（形容詞）煩人的；無聊的；無趣的；（相關名詞）鑽孔；鏜孔",
        "meaningEn": "(related noun boring) the act of drilling a hole in the earth in the hope of producing petroleum; (adj.) so lacking in interest as to cause mental weariness",
        "usagePattern": "be boring; a boring class/story",
        "syllables": null,
        "stressPattern": null,
        "phoneticUs": null,
        "familyKey": "boring",
        "isCore": true,
        "sourceNote": "高中英文參考詞彙表（111學年度起適用，大考中心）",
        "status": "draft",
        "usagePatternZh": "很無聊；無聊的課／故事"
      },
      "beforeRowSha256": "1796fbc6e15b8ed2c0e9a9683702a424cadac0dab06ff2e3ae2e19e999ba308a",
      "expectedAfterRowSha256": "48ebef3e5c231d749613a8b440f843770fdf892d9afd0f69a63e3b0d4f3596eb",
      "fields": {
        "meaningZh": "（形容詞）煩人的；無聊的；無趣的；（相關名詞）鑽孔；鏜孔"
      },
      "sources": {
        "meaningZh": [
          {
            "type": "dictionary",
            "url": "https://www.collinsdictionary.com/us/dictionary/english/boring",
            "excerpt": "Boring is the enlarging of a hole",
            "summary": "工程名詞指鑽孔／鏜孔過程，不是時間「期」。形容詞義保留。",
            "verification": "indexed_dictionary_text_read",
            "readDate": "2026-11-08"
          }
        ]
      },
      "starterIncluded": true
    },
    {
      "dataset": "words",
      "id": "W002839",
      "path": "public/data/v1/words.json",
      "key": "wordId",
      "changedFields": [
        "meaningZh"
      ],
      "beforeRow": {
        "wordId": "W002839",
        "word": "stale",
        "wordVariants": [
          "stale"
        ],
        "level": "LV3",
        "pos": "adj.",
        "posAll": [
          "adj."
        ],
        "meaningZh": "尿；不新鮮的；陳腐的；疲憊的",
        "meaningEn": "no longer fresh; food or drink that has lost its good taste or quality because it is old",
        "usagePattern": "stale bread; go stale; stale air",
        "syllables": null,
        "stressPattern": null,
        "phoneticUs": null,
        "familyKey": "stale",
        "isCore": true,
        "sourceNote": "高中英文參考詞彙表（111學年度起適用，大考中心）",
        "status": "reviewed",
        "usagePatternZh": "不新鮮的麵包；變陳舊；陳腐的空氣"
      },
      "expectedAfterRow": {
        "wordId": "W002839",
        "word": "stale",
        "wordVariants": [
          "stale"
        ],
        "level": "LV3",
        "pos": "adj.",
        "posAll": [
          "adj."
        ],
        "meaningZh": "（形容詞）不新鮮的；陳腐的；疲憊的；（另有名詞用法）馬或牛的尿",
        "meaningEn": "no longer fresh; food or drink that has lost its good taste or quality because it is old",
        "usagePattern": "stale bread; go stale; stale air",
        "syllables": null,
        "stressPattern": null,
        "phoneticUs": null,
        "familyKey": "stale",
        "isCore": true,
        "sourceNote": "高中英文參考詞彙表（111學年度起適用，大考中心）",
        "status": "reviewed",
        "usagePatternZh": "不新鮮的麵包；變陳舊；陳腐的空氣"
      },
      "beforeRowSha256": "38fbfb2a03e05aeb06c534b700fa6663599abc1d7dba6ffbaa91ff636830f997",
      "expectedAfterRowSha256": "0b42366c36ea8ff72db373d0c112b8195d3a32ed011d72eaa7423306ba98b9cf",
      "fields": {
        "meaningZh": "（形容詞）不新鮮的；陳腐的；疲憊的；（另有名詞用法）馬或牛的尿"
      },
      "sources": {
        "meaningZh": [
          {
            "type": "dictionary",
            "url": "https://www.collinsdictionary.com/zh/dictionary/english/stale",
            "excerpt": "the urine of horses or cattle",
            "summary": "保留同形名詞的動物尿義並區分詞性，不把罕義當成錯誤刪除。",
            "verification": "indexed_dictionary_text_read",
            "readDate": "2026-11-08"
          }
        ]
      },
      "starterIncluded": true
    },
    {
      "dataset": "words",
      "id": "W002024",
      "path": "public/data/v1/words.json",
      "key": "wordId",
      "changedFields": [
        "meaningZh"
      ],
      "beforeRow": {
        "wordId": "W002024",
        "word": "alphabet",
        "wordVariants": [
          "alphabet"
        ],
        "level": "LV3",
        "pos": "n.",
        "posAll": [
          "n."
        ],
        "meaningZh": "字母；字母表",
        "meaningEn": "a character set that includes letters and is used to write a language",
        "usagePattern": "an/the alphabet; alphabet of N",
        "syllables": null,
        "stressPattern": null,
        "phoneticUs": null,
        "familyKey": "alphabet",
        "isCore": true,
        "sourceNote": "高中英文參考詞彙表（111學年度起適用，大考中心）",
        "status": "draft",
        "usagePatternZh": "一個／那套字母表；……的字母"
      },
      "expectedAfterRow": {
        "wordId": "W002024",
        "word": "alphabet",
        "wordVariants": [
          "alphabet"
        ],
        "level": "LV3",
        "pos": "n.",
        "posAll": [
          "n."
        ],
        "meaningZh": "字母（總稱）；字母表",
        "meaningEn": "a character set that includes letters and is used to write a language",
        "usagePattern": "an/the alphabet; alphabet of N",
        "syllables": null,
        "stressPattern": null,
        "phoneticUs": null,
        "familyKey": "alphabet",
        "isCore": true,
        "sourceNote": "高中英文參考詞彙表（111學年度起適用，大考中心）",
        "status": "draft",
        "usagePatternZh": "一個／那套字母表；……的字母"
      },
      "beforeRowSha256": "59fb0130a98e56182e1404ac50596123211755a65de4090c3ad5cf73a31292dc",
      "expectedAfterRowSha256": "bd6170722caf2354ecc45190e12388bc03d154bcf7ab4a516c7cff435df33abb",
      "fields": {
        "meaningZh": "字母（總稱）；字母表"
      },
      "sources": {
        "meaningZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101211.jpg",
            "page": 117,
            "sha256": "c993a3403ccbfcc7cf9c0de2a1bcfc74de8410f407c1ac204a03537f9616f77b",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "alphabet n. 字母（總稱）",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "本章直接印刷詞性及中文義項；不表示一般詞條其他義錯誤"
          }
        ]
      },
      "starterIncluded": true
    },
    {
      "dataset": "words",
      "id": "W002026",
      "path": "public/data/v1/words.json",
      "key": "wordId",
      "changedFields": [
        "usagePattern",
        "usagePatternZh"
      ],
      "beforeRow": {
        "wordId": "W002026",
        "word": "ambassador",
        "wordVariants": [
          "ambassador"
        ],
        "level": "LV3",
        "pos": "n.",
        "posAll": [
          "n."
        ],
        "meaningZh": "大使；使節；代理",
        "meaningEn": "a diplomat of the highest rank; accredited as representative from one country to another; an informal representative",
        "usagePattern": "an/the ambassador; ambassador of N",
        "syllables": null,
        "stressPattern": null,
        "phoneticUs": null,
        "familyKey": "ambassador",
        "isCore": true,
        "sourceNote": "高中英文參考詞彙表（111學年度起適用，大考中心）",
        "status": "draft",
        "usagePatternZh": "一位／那名大使；……的大使"
      },
      "expectedAfterRow": {
        "wordId": "W002026",
        "word": "ambassador",
        "wordVariants": [
          "ambassador"
        ],
        "level": "LV3",
        "pos": "n.",
        "posAll": [
          "n."
        ],
        "meaningZh": "大使；使節；代理",
        "meaningEn": "a diplomat of the highest rank; accredited as representative from one country to another; an informal representative",
        "usagePattern": "an ambassador to a country; an ambassador of a country",
        "syllables": null,
        "stressPattern": null,
        "phoneticUs": null,
        "familyKey": "ambassador",
        "isCore": true,
        "sourceNote": "高中英文參考詞彙表（111學年度起適用，大考中心）",
        "status": "draft",
        "usagePatternZh": "派駐某國的大使；代表某國的大使"
      },
      "beforeRowSha256": "3accdd94f027c7168910b3b67bacddd2274362da5509e72792c449dc51335776",
      "expectedAfterRowSha256": "8c76bfeee6a97606c3128d7232391cbbc42355047d64643056e476cb70082e46",
      "fields": {
        "usagePattern": "an ambassador to a country; an ambassador of a country",
        "usagePatternZh": "派駐某國的大使；代表某國的大使"
      },
      "sources": {
        "usagePattern": [
          {
            "type": "textbook_photo",
            "file": "20260815_101211.jpg",
            "page": 117,
            "sha256": "c993a3403ccbfcc7cf9c0de2a1bcfc74de8410f407c1ac204a03537f9616f77b",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "ambassador n. 大使（與介詞 to 並用）；Who is the Japanese ambassador to South Africa?",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "教材明示與to並用，原有of保留為代表的國家。"
          }
        ],
        "usagePatternZh": [
          {
            "type": "textbook_photo",
            "file": "20260815_101211.jpg",
            "page": 117,
            "sha256": "c993a3403ccbfcc7cf9c0de2a1bcfc74de8410f407c1ac204a03537f9616f77b",
            "verification": "pixels_displayed_and_visually_read",
            "readDate": "2026-11-08",
            "excerpt": "ambassador n. 大使（與介詞 to 並用）；Who is the Japanese ambassador to South Africa?",
            "excerptNormalization": "音標、圈號略去；a. 正規化為 adj.；分號與換行正規化。",
            "claim": "教材明示與to並用，原有of保留為代表的國家。"
          }
        ]
      },
      "starterIncluded": true
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-G001",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "explanationZh",
        "pattern"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-G001",
        "kind": "grammar",
        "sourcePage": 107,
        "pattern": "forever 之後亦可加 a day（原書誇大用法註記）",
        "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-G001",
        "kind": "grammar",
        "sourcePage": 107,
        "pattern": "forever and a day（誇大用法）",
        "explanationZh": "forever and a day 是誇大說法，表示永遠、長長久久；原書註記只寫加 a day，同頁例句顯示完整片語含 and。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "edf90980ede8be15c31b2eda5a6ab1cacec7e71370ee08784a334ca78e98a6f5",
      "expectedAfterRowSha256": "75d338df3ec97b1d9992533b835142f9e8948ffad4c8ea2d0f18be5a224619f2",
      "fields": {
        "explanationZh": "forever and a day 是誇大說法，表示永遠、長長久久；原書註記只寫加 a day，同頁例句顯示完整片語含 and。",
        "pattern": "forever and a day（誇大用法）"
      },
      "sources": {
        "explanationZh": [
          {
            "type": "textbook_photo",
            "manifest": "scripts/sources/LV3Unit11.json",
            "file": "20260815_101032.jpg",
            "sha256": "cf76ed44cc90e2660588faa3cd443d200366ed419bf32991e2d1fcfb7f5bc8aa",
            "page": 107,
            "printedLevel": "Level 3",
            "printedUnit": "Unit 11",
            "printedText": "I'll love you forever and a day.；我會永遠愛你，而且還多愛你一天。",
            "pixelsViewed": true,
            "viewMethod": "Original photo pixels viewed in proportional 1600px preview, rotated 90 degrees clockwise; no OCR substituted."
          }
        ],
        "pattern": [
          {
            "type": "textbook_photo",
            "manifest": "scripts/sources/LV3Unit11.json",
            "file": "20260815_101032.jpg",
            "sha256": "cf76ed44cc90e2660588faa3cd443d200366ed419bf32991e2d1fcfb7f5bc8aa",
            "page": 107,
            "printedLevel": "Level 3",
            "printedUnit": "Unit 11",
            "printedText": "I'll love you forever and a day.；我會永遠愛你，而且還多愛你一天。",
            "pixelsViewed": true,
            "viewMethod": "Original photo pixels viewed in proportional 1600px preview, rotated 90 degrees clockwise; no OCR substituted."
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-G002",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "explanationZh"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-G002",
        "kind": "grammar",
        "sourcePage": 107,
        "pattern": "forever = for good = permanently（常置句尾，修飾之前的動詞）",
        "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-G002",
        "kind": "grammar",
        "sourcePage": 107,
        "pattern": "forever = for good = permanently（常置句尾，修飾之前的動詞）",
        "explanationZh": "此處 forever、for good 與 permanently 都表示永遠、永久地；原書說它們在這個用法中多置於句尾修飾動詞。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "c2ab2c486bf946d26887de3d93f55ed7ca2792de98fe9d8b95b3ae3e9c94256d",
      "expectedAfterRowSha256": "fe371df3a18450b6b3d65e51b08ff1cf51047cf09523bb16810fd96a2ef33527",
      "fields": {
        "explanationZh": "此處 forever、for good 與 permanently 都表示永遠、永久地；原書說它們在這個用法中多置於句尾修飾動詞。"
      },
      "sources": {
        "explanationZh": [
          {
            "type": "textbook_photo",
            "manifest": "scripts/sources/LV3Unit11.json",
            "file": "20260815_101032.jpg",
            "sha256": "cf76ed44cc90e2660588faa3cd443d200366ed419bf32991e2d1fcfb7f5bc8aa",
            "page": 107,
            "printedLevel": "Level 3",
            "printedUnit": "Unit 11",
            "printedText": "forever 與 for good 及 permanently 同義，均表「永遠」，使用時多置於句尾，修飾之前的動詞。",
            "pixelsViewed": true,
            "viewMethod": "Original photo pixels viewed in proportional 1600px preview, rotated 90 degrees clockwise; no OCR substituted."
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-G003",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "explanationZh"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-G003",
        "kind": "grammar",
        "sourcePage": 107,
        "pattern": "on a temporary basis",
        "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-G003",
        "kind": "grammar",
        "sourcePage": 107,
        "pattern": "on a temporary basis",
        "explanationZh": "on a temporary basis 表示暫時地。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "b47cae092fb2cdfb2c03c3e4c23ddc4a3c203a3f891d3fe7d5513665fbd27977",
      "expectedAfterRowSha256": "3bfd4cc2b52b32a909a3da33973bf3709774d743aeb20a5fea424c8c53a6240d",
      "fields": {
        "explanationZh": "on a temporary basis 表示暫時地。"
      },
      "sources": {
        "explanationZh": [
          {
            "type": "textbook_photo",
            "manifest": "scripts/sources/LV3Unit11.json",
            "file": "20260815_101032.jpg",
            "sha256": "cf76ed44cc90e2660588faa3cd443d200366ed419bf32991e2d1fcfb7f5bc8aa",
            "page": 107,
            "printedLevel": "Level 3",
            "printedUnit": "Unit 11",
            "printedText": "on a temporary basis = temporarily 暫時地",
            "pixelsViewed": true,
            "viewMethod": "Original photo pixels viewed in proportional 1600px preview, rotated 90 degrees clockwise; no OCR substituted."
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-G004",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "explanationZh"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-G004",
        "kind": "grammar",
        "sourcePage": 107,
        "pattern": "on a temporary basis = temporarily",
        "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-G004",
        "kind": "grammar",
        "sourcePage": 107,
        "pattern": "on a temporary basis = temporarily",
        "explanationZh": "on a temporary basis 與 temporarily 在此都表示暫時地。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "1d833859ae3c4a1a82e35c7c5c84e367f4e3371e19f5b12ef3112051c43511ad",
      "expectedAfterRowSha256": "15f07a9f556ecaf870477e62c6f814efda86f4916891678c37534cb5f596d879",
      "fields": {
        "explanationZh": "on a temporary basis 與 temporarily 在此都表示暫時地。"
      },
      "sources": {
        "explanationZh": [
          {
            "type": "textbook_photo",
            "manifest": "scripts/sources/LV3Unit11.json",
            "file": "20260815_101032.jpg",
            "sha256": "cf76ed44cc90e2660588faa3cd443d200366ed419bf32991e2d1fcfb7f5bc8aa",
            "page": 107,
            "printedLevel": "Level 3",
            "printedUnit": "Unit 11",
            "printedText": "on a temporary basis = temporarily 暫時地",
            "pixelsViewed": true,
            "viewMethod": "Original photo pixels viewed in proportional 1600px preview, rotated 90 degrees clockwise; no OCR substituted."
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-G005",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "explanationZh"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-G005",
        "kind": "grammar",
        "sourcePage": 108,
        "pattern": "cannot resist + V-ing",
        "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-G005",
        "kind": "grammar",
        "sourcePage": 108,
        "pattern": "cannot resist + V-ing",
        "explanationZh": "cannot resist + V-ing 表示忍不住做某事，resist 後接動名詞。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "579d76b20175746d953de4068a58850c6d462a2bd472e588fdc45ed025a1d0cc",
      "expectedAfterRowSha256": "e44f73732c688e24714d3ca5f2613d7d73c1962c92aa0a0443ae13a9962193ee",
      "fields": {
        "explanationZh": "cannot resist + V-ing 表示忍不住做某事，resist 後接動名詞。"
      },
      "sources": {
        "explanationZh": [
          {
            "type": "textbook_photo",
            "manifest": "scripts/sources/LV3Unit11.json",
            "file": "20260815_101041.jpg",
            "sha256": "2486397e839df9a89789d792858a4d93aa949bcac5033d97e2ac4f55a0a42e19",
            "page": 108,
            "printedLevel": "Level 3",
            "printedUnit": "Unit 11",
            "printedText": "cannot resist + V-ing 忍不住……",
            "pixelsViewed": true,
            "viewMethod": "Original photo pixels viewed in proportional 1600px preview, rotated 90 degrees clockwise; no OCR substituted."
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-G006",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "explanationZh"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-G006",
        "kind": "grammar",
        "sourcePage": 108,
        "pattern": "cannot help + V-ing",
        "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-G006",
        "kind": "grammar",
        "sourcePage": 108,
        "pattern": "cannot help + V-ing",
        "explanationZh": "cannot help + V-ing 表示忍不住做某事，help 後接動名詞。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "5790e52a702801e0ec746bf46f09f2fee7829dd011ed52d6b76e3a37ac057176",
      "expectedAfterRowSha256": "1bc845c0b9448e5d4de8533945eed21178c42d4644b5bcba036b51476f1d6c49",
      "fields": {
        "explanationZh": "cannot help + V-ing 表示忍不住做某事，help 後接動名詞。"
      },
      "sources": {
        "explanationZh": [
          {
            "type": "textbook_photo",
            "manifest": "scripts/sources/LV3Unit11.json",
            "file": "20260815_101041.jpg",
            "sha256": "2486397e839df9a89789d792858a4d93aa949bcac5033d97e2ac4f55a0a42e19",
            "page": 108,
            "printedLevel": "Level 3",
            "printedUnit": "Unit 11",
            "printedText": "cannot resist + V-ing = cannot help + V-ing",
            "pixelsViewed": true,
            "viewMethod": "Original photo pixels viewed in proportional 1600px preview, rotated 90 degrees clockwise; no OCR substituted."
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-G007",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "explanationZh"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-G007",
        "kind": "grammar",
        "sourcePage": 108,
        "pattern": "cannot help but + V",
        "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-G007",
        "kind": "grammar",
        "sourcePage": 108,
        "pattern": "cannot help but + V",
        "explanationZh": "cannot help but + V 表示忍不住做某事，but 後接原形動詞。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "797be68ab0b942fd46982744dac96b873731c4c47bb8e5add0b2532fedaeeac1",
      "expectedAfterRowSha256": "2d001fb1fe36531f849f47490cecf71acefc4112a2accae764a2e02725053e95",
      "fields": {
        "explanationZh": "cannot help but + V 表示忍不住做某事，but 後接原形動詞。"
      },
      "sources": {
        "explanationZh": [
          {
            "type": "textbook_photo",
            "manifest": "scripts/sources/LV3Unit11.json",
            "file": "20260815_101041.jpg",
            "sha256": "2486397e839df9a89789d792858a4d93aa949bcac5033d97e2ac4f55a0a42e19",
            "page": 108,
            "printedLevel": "Level 3",
            "printedUnit": "Unit 11",
            "printedText": "cannot help but + V；I couldn't help but take a look at that beautiful girl when she passed by.",
            "pixelsViewed": true,
            "viewMethod": "Original photo pixels viewed in proportional 1600px preview, rotated 90 degrees clockwise; no OCR substituted."
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-G008",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "explanationZh"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-G008",
        "kind": "grammar",
        "sourcePage": 108,
        "pattern": "be resistant to sth",
        "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-G008",
        "kind": "grammar",
        "sourcePage": 108,
        "pattern": "be resistant to sth",
        "explanationZh": "be resistant to sth 表示抗拒某物。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "a0105b4efd985f4a3ab9170a5a7b23496b764329aed3fca13aad26195135acaf",
      "expectedAfterRowSha256": "10589b6caa0aa8f08b66d99ebfc74046009c7dfa2a7aaeae4c9e2667af9974cf",
      "fields": {
        "explanationZh": "be resistant to sth 表示抗拒某物。"
      },
      "sources": {
        "explanationZh": [
          {
            "type": "textbook_photo",
            "manifest": "scripts/sources/LV3Unit11.json",
            "file": "20260815_101041.jpg",
            "sha256": "2486397e839df9a89789d792858a4d93aa949bcac5033d97e2ac4f55a0a42e19",
            "page": 108,
            "printedLevel": "Level 3",
            "printedUnit": "Unit 11",
            "printedText": "be resistant to sth 抗拒某物",
            "pixelsViewed": true,
            "viewMethod": "Original photo pixels viewed in proportional 1600px preview, rotated 90 degrees clockwise; no OCR substituted."
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-G009",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "explanationZh"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-G009",
        "kind": "grammar",
        "sourcePage": 108,
        "pattern": "under sb's guidance",
        "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-G009",
        "kind": "grammar",
        "sourcePage": 108,
        "pattern": "under sb's guidance",
        "explanationZh": "under sb's guidance 表示在某人的指導下。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "c8da3988c644ae0925b381291fb2d61935eb6d442b87ea7047f348b1e2c5aed7",
      "expectedAfterRowSha256": "fe99dc53a0c4b6140468e194f4a387ad39fecf0e03e75e4a45f0103c83816295",
      "fields": {
        "explanationZh": "under sb's guidance 表示在某人的指導下。"
      },
      "sources": {
        "explanationZh": [
          {
            "type": "textbook_photo",
            "manifest": "scripts/sources/LV3Unit11.json",
            "file": "20260815_101041.jpg",
            "sha256": "2486397e839df9a89789d792858a4d93aa949bcac5033d97e2ac4f55a0a42e19",
            "page": 108,
            "printedLevel": "Level 3",
            "printedUnit": "Unit 11",
            "printedText": "under sb's guidance 在某人指導下",
            "pixelsViewed": true,
            "viewMethod": "Original photo pixels viewed in proportional 1600px preview, rotated 90 degrees clockwise; no OCR substituted."
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-G010",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "explanationZh"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-G010",
        "kind": "grammar",
        "sourcePage": 108,
        "pattern": "for the sake of...",
        "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-G010",
        "kind": "grammar",
        "sourcePage": 108,
        "pattern": "for the sake of...",
        "explanationZh": "for the sake of... 表示為了……的緣故。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "f66cb80d0a18e53e9057ebaa35f7894dc55bfabbc5edac500689916b9421ccf6",
      "expectedAfterRowSha256": "677f8c8c1a30e4a8334df1e1660cdf56916d1d554b4af58b7fd9a666a9c56209",
      "fields": {
        "explanationZh": "for the sake of... 表示為了……的緣故。"
      },
      "sources": {
        "explanationZh": [
          {
            "type": "textbook_photo",
            "manifest": "scripts/sources/LV3Unit11.json",
            "file": "20260815_101041.jpg",
            "sha256": "2486397e839df9a89789d792858a4d93aa949bcac5033d97e2ac4f55a0a42e19",
            "page": 108,
            "printedLevel": "Level 3",
            "printedUnit": "Unit 11",
            "printedText": "for the sake of... 為了……的緣故",
            "pixelsViewed": true,
            "viewMethod": "Original photo pixels viewed in proportional 1600px preview, rotated 90 degrees clockwise; no OCR substituted."
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-G011",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "explanationZh"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-G011",
        "kind": "grammar",
        "sourcePage": 108,
        "pattern": "for sb's sake",
        "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-G011",
        "kind": "grammar",
        "sourcePage": 108,
        "pattern": "for sb's sake",
        "explanationZh": "for sb's sake 表示為了某人的緣故。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "56378e1d9d516c1397674954a20c83a4e07da0ff618833878a311ee3c67e4399",
      "expectedAfterRowSha256": "d6b78eb862a5e96265b9679748d261a2972f329c5a5faf87ab17ec60068efbb1",
      "fields": {
        "explanationZh": "for sb's sake 表示為了某人的緣故。"
      },
      "sources": {
        "explanationZh": [
          {
            "type": "textbook_photo",
            "manifest": "scripts/sources/LV3Unit11.json",
            "file": "20260815_101041.jpg",
            "sha256": "2486397e839df9a89789d792858a4d93aa949bcac5033d97e2ac4f55a0a42e19",
            "page": 108,
            "printedLevel": "Level 3",
            "printedUnit": "Unit 11",
            "printedText": "for sb's sake 為了某人的緣故",
            "pixelsViewed": true,
            "viewMethod": "Original photo pixels viewed in proportional 1600px preview, rotated 90 degrees clockwise; no OCR substituted."
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-G012",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "explanationZh"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-G012",
        "kind": "grammar",
        "sourcePage": 109,
        "pattern": "toss and turn",
        "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-G012",
        "kind": "grammar",
        "sourcePage": 109,
        "pattern": "toss and turn",
        "explanationZh": "toss and turn 表示輾轉難眠。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "b25acf683c5f57ac7e3bc1bfb8b777e13d53c3d6c9a52cd2add5403c8b366a05",
      "expectedAfterRowSha256": "478e2e9c902fe632585d214401c82af02eb7db71f455e1b36a7b41da3b331908",
      "fields": {
        "explanationZh": "toss and turn 表示輾轉難眠。"
      },
      "sources": {
        "explanationZh": [
          {
            "type": "textbook_photo",
            "manifest": "scripts/sources/LV3Unit11.json",
            "file": "20260815_101046.jpg",
            "sha256": "4da68e6ee600559f778da74cba344592b1cb7d9e0e1c496ce9b00dd92981c3b3",
            "page": 109,
            "printedLevel": "Level 3",
            "printedUnit": "Unit 11",
            "printedText": "toss and turn 輾轉難眠",
            "pixelsViewed": true,
            "viewMethod": "Original photo pixels viewed in proportional 1600px preview, rotated 90 degrees clockwise; no OCR substituted."
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-G013",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "explanationZh"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-G013",
        "kind": "grammar",
        "sourcePage": 109,
        "pattern": "a toss of a coin",
        "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-G013",
        "kind": "grammar",
        "sourcePage": 109,
        "pattern": "a toss of a coin",
        "explanationZh": "a toss of a coin 指擲硬幣作決定。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "69823f84e89dcf507fac0efb90f5a744ead4eee555076f571b64c96f591dea4c",
      "expectedAfterRowSha256": "8c3cbba4c5ca1914e24f31ef40ad0c232994993615532a89c82172bf236b14df",
      "fields": {
        "explanationZh": "a toss of a coin 指擲硬幣作決定。"
      },
      "sources": {
        "explanationZh": [
          {
            "type": "textbook_photo",
            "manifest": "scripts/sources/LV3Unit11.json",
            "file": "20260815_101046.jpg",
            "sha256": "4da68e6ee600559f778da74cba344592b1cb7d9e0e1c496ce9b00dd92981c3b3",
            "page": 109,
            "printedLevel": "Level 3",
            "printedUnit": "Unit 11",
            "printedText": "a toss of a coin 擲硬幣決定",
            "pixelsViewed": true,
            "viewMethod": "Original photo pixels viewed in proportional 1600px preview, rotated 90 degrees clockwise; no OCR substituted."
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-G014",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "explanationZh"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-G014",
        "kind": "grammar",
        "sourcePage": 109,
        "pattern": "keep sth in reserve",
        "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-G014",
        "kind": "grammar",
        "sourcePage": 109,
        "pattern": "keep sth in reserve",
        "explanationZh": "keep sth in reserve 表示儲備某物，以備需要時使用。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "f3bc58134c40d584a6abbfc97f39156bf4f9c3182e876cf95bb34569910ef622",
      "expectedAfterRowSha256": "464e72e62295ca7c14e017351e72c5ac9f583ac02c78643722e1782461b33a9c",
      "fields": {
        "explanationZh": "keep sth in reserve 表示儲備某物，以備需要時使用。"
      },
      "sources": {
        "explanationZh": [
          {
            "type": "textbook_photo",
            "manifest": "scripts/sources/LV3Unit11.json",
            "file": "20260815_101046.jpg",
            "sha256": "4da68e6ee600559f778da74cba344592b1cb7d9e0e1c496ce9b00dd92981c3b3",
            "page": 109,
            "printedLevel": "Level 3",
            "printedUnit": "Unit 11",
            "printedText": "keep sth in reserve 儲備某物；You should keep some money in reserve for a rainy day.",
            "pixelsViewed": true,
            "viewMethod": "Original photo pixels viewed in proportional 1600px preview, rotated 90 degrees clockwise; no OCR substituted."
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-G015",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "explanationZh"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-G015",
        "kind": "grammar",
        "sourcePage": 109,
        "pattern": "a harbor city = a port city",
        "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-G015",
        "kind": "grammar",
        "sourcePage": 109,
        "pattern": "a harbor city = a port city",
        "explanationZh": "a harbor city 與 a port city 都指港都、港口城市。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "c6a15b732cfb7dfd260a4d6661feb649adaf1949253f4f4cca8879ed56eccfb5",
      "expectedAfterRowSha256": "a6c8c595693bb1dfd33705216d1db6dd0cf87a8fb18bb678ea1c462b1d584a03",
      "fields": {
        "explanationZh": "a harbor city 與 a port city 都指港都、港口城市。"
      },
      "sources": {
        "explanationZh": [
          {
            "type": "textbook_photo",
            "manifest": "scripts/sources/LV3Unit11.json",
            "file": "20260815_101046.jpg",
            "sha256": "4da68e6ee600559f778da74cba344592b1cb7d9e0e1c496ce9b00dd92981c3b3",
            "page": 109,
            "printedLevel": "Level 3",
            "printedUnit": "Unit 11",
            "printedText": "a harbor city 港都 = a port city",
            "pixelsViewed": true,
            "viewMethod": "Original photo pixels viewed in proportional 1600px preview, rotated 90 degrees clockwise; no OCR substituted."
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-G016",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "explanationZh"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-G016",
        "kind": "grammar",
        "sourcePage": 110,
        "pattern": "harbor a grudge against sb",
        "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-G016",
        "kind": "grammar",
        "sourcePage": 110,
        "pattern": "harbor a grudge against sb",
        "explanationZh": "harbor a grudge against sb 表示對某人懷恨。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "19b0e0b2c22c94696a7d8cf9508b63d496b8eca28f7f91086096dad42c3cb379",
      "expectedAfterRowSha256": "84066847c4513e6222b5c29e0ce9f189ae740eb6790700ae7d09a05211f3ee49",
      "fields": {
        "explanationZh": "harbor a grudge against sb 表示對某人懷恨。"
      },
      "sources": {
        "explanationZh": [
          {
            "type": "textbook_photo",
            "manifest": "scripts/sources/LV3Unit11.json",
            "file": "20260815_101056.jpg",
            "sha256": "509ee199bff48e08e4a590fa149b34d6d8655a75788ad24aa0d740fff1c198e6",
            "page": 110,
            "printedLevel": "Level 3",
            "printedUnit": "Unit 11",
            "printedText": "harbor a grudge against sb 對某人懷恨",
            "pixelsViewed": true,
            "viewMethod": "Original photo pixels viewed in proportional 1600px preview, rotated 90 degrees clockwise; no OCR substituted."
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-G017",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "explanationZh"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-G017",
        "kind": "grammar",
        "sourcePage": 110,
        "pattern": "bear a grudge against sb",
        "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-G017",
        "kind": "grammar",
        "sourcePage": 110,
        "pattern": "bear a grudge against sb",
        "explanationZh": "bear a grudge against sb 與 harbor a grudge against sb 都表示對某人懷恨。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "f8e21590f4f7ae808ceefec05993eed457b05a67727764fdb5394257b9647481",
      "expectedAfterRowSha256": "af7e77afaeabf49322f9669e37f93ba4a36333f50b9bc0d5d95e2399b2d27018",
      "fields": {
        "explanationZh": "bear a grudge against sb 與 harbor a grudge against sb 都表示對某人懷恨。"
      },
      "sources": {
        "explanationZh": [
          {
            "type": "textbook_photo",
            "manifest": "scripts/sources/LV3Unit11.json",
            "file": "20260815_101056.jpg",
            "sha256": "509ee199bff48e08e4a590fa149b34d6d8655a75788ad24aa0d740fff1c198e6",
            "page": 110,
            "printedLevel": "Level 3",
            "printedUnit": "Unit 11",
            "printedText": "harbor a grudge against sb 對某人懷恨 = bear a grudge against sb",
            "pixelsViewed": true,
            "viewMethod": "Original photo pixels viewed in proportional 1600px preview, rotated 90 degrees clockwise; no OCR substituted."
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-G018",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "explanationZh"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-G018",
        "kind": "grammar",
        "sourcePage": 110,
        "pattern": "in dock",
        "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-G018",
        "kind": "grammar",
        "sourcePage": 110,
        "pattern": "in dock",
        "explanationZh": "in dock 在此表示船停靠碼頭。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "59c6f39eedc96990cbbbee0808b64ec19829d264db213a58ceaca3f5ff894cd2",
      "expectedAfterRowSha256": "8a1d6a61208226f8ee22389d3163af4912ce073e85627abb45a65c7d2c69fb8a",
      "fields": {
        "explanationZh": "in dock 在此表示船停靠碼頭。"
      },
      "sources": {
        "explanationZh": [
          {
            "type": "textbook_photo",
            "manifest": "scripts/sources/LV3Unit11.json",
            "file": "20260815_101056.jpg",
            "sha256": "509ee199bff48e08e4a590fa149b34d6d8655a75788ad24aa0d740fff1c198e6",
            "page": 110,
            "printedLevel": "Level 3",
            "printedUnit": "Unit 11",
            "printedText": "in dock 靠碼頭；The ships were all in dock before the typhoon approached.",
            "pixelsViewed": true,
            "viewMethod": "Original photo pixels viewed in proportional 1600px preview, rotated 90 degrees clockwise; no OCR substituted."
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-G019",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "explanationZh"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-G019",
        "kind": "grammar",
        "sourcePage": 110,
        "pattern": "dock sb's pay / wages / salary",
        "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-G019",
        "kind": "grammar",
        "sourcePage": 110,
        "pattern": "dock sb's pay / wages / salary",
        "explanationZh": "dock sb's pay / wages / salary 表示扣減某人的薪資。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "96848bb282963c895488fff5d342763d83b4e4be3b08fc1592bff1a3bbd3ce77",
      "expectedAfterRowSha256": "47b00a2f6f40d6870c48521ea99f18549ec4c5169ab87288fcddb201a48a807d",
      "fields": {
        "explanationZh": "dock sb's pay / wages / salary 表示扣減某人的薪資。"
      },
      "sources": {
        "explanationZh": [
          {
            "type": "textbook_photo",
            "manifest": "scripts/sources/LV3Unit11.json",
            "file": "20260815_101056.jpg",
            "sha256": "509ee199bff48e08e4a590fa149b34d6d8655a75788ad24aa0d740fff1c198e6",
            "page": 110,
            "printedLevel": "Level 3",
            "printedUnit": "Unit 11",
            "printedText": "dock sb's pay / wages / salary 減某人的薪資",
            "pixelsViewed": true,
            "viewMethod": "Original photo pixels viewed in proportional 1600px preview, rotated 90 degrees clockwise; no OCR substituted."
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-G020",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "explanationZh"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-G020",
        "kind": "grammar",
        "sourcePage": 110,
        "pattern": "wharf（複數為 wharves）",
        "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-G020",
        "kind": "grammar",
        "sourcePage": 110,
        "pattern": "wharf（複數為 wharves）",
        "explanationZh": "原書列出的 wharf 複數形式為 wharves。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "91173644d85aae2c15b4766fb193622749a4e85c58330da9e692d15effeded7e",
      "expectedAfterRowSha256": "5817805c30a4b3e64db4c06deaa59775141f903f8401cb6d0f1fca0fa47faf5c",
      "fields": {
        "explanationZh": "原書列出的 wharf 複數形式為 wharves。"
      },
      "sources": {
        "explanationZh": [
          {
            "type": "textbook_photo",
            "manifest": "scripts/sources/LV3Unit11.json",
            "file": "20260815_101056.jpg",
            "sha256": "509ee199bff48e08e4a590fa149b34d6d8655a75788ad24aa0d740fff1c198e6",
            "page": 110,
            "printedLevel": "Level 3",
            "printedUnit": "Unit 11",
            "printedText": "wharf 碼頭（複數形為 wharves）",
            "pixelsViewed": true,
            "viewMethod": "Original photo pixels viewed in proportional 1600px preview, rotated 90 degrees clockwise; no OCR substituted."
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-G021",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "explanationZh"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-G021",
        "kind": "grammar",
        "sourcePage": 110,
        "pattern": "trail sb to + 地方",
        "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-G021",
        "kind": "grammar",
        "sourcePage": 110,
        "pattern": "trail sb to + 地方",
        "explanationZh": "trail sb to + 地方 表示跟蹤某人到某地。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "c70a080c4a77f87f91012745661e6d11a77f40178ece35b881adec750651efec",
      "expectedAfterRowSha256": "3dacea2372c444dbad1268f2675bbed05af9dc51d356e4ea9e666c9e77f65d9e",
      "fields": {
        "explanationZh": "trail sb to + 地方 表示跟蹤某人到某地。"
      },
      "sources": {
        "explanationZh": [
          {
            "type": "textbook_photo",
            "manifest": "scripts/sources/LV3Unit11.json",
            "file": "20260815_101056.jpg",
            "sha256": "509ee199bff48e08e4a590fa149b34d6d8655a75788ad24aa0d740fff1c198e6",
            "page": 110,
            "printedLevel": "Level 3",
            "printedUnit": "Unit 11",
            "printedText": "trail sb to + 地方 跟蹤某人到某地",
            "pixelsViewed": true,
            "viewMethod": "Original photo pixels viewed in proportional 1600px preview, rotated 90 degrees clockwise; no OCR substituted."
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-G022",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "explanationZh"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-G022",
        "kind": "grammar",
        "sourcePage": 110,
        "pattern": "track sb to + 地方",
        "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-G022",
        "kind": "grammar",
        "sourcePage": 110,
        "pattern": "track sb to + 地方",
        "explanationZh": "track sb to + 地方 在此表示跟蹤某人到某地。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "0d5967b610670843eb6454a43c2e39359011ff8eb9e26649e4c17ca348d74eb4",
      "expectedAfterRowSha256": "b7d69559df6dd58248c904631fe4de3c147cad1e97058ddc95348f9dc7d6695f",
      "fields": {
        "explanationZh": "track sb to + 地方 在此表示跟蹤某人到某地。"
      },
      "sources": {
        "explanationZh": [
          {
            "type": "textbook_photo",
            "manifest": "scripts/sources/LV3Unit11.json",
            "file": "20260815_101056.jpg",
            "sha256": "509ee199bff48e08e4a590fa149b34d6d8655a75788ad24aa0d740fff1c198e6",
            "page": 110,
            "printedLevel": "Level 3",
            "printedUnit": "Unit 11",
            "printedText": "trail sb to + 地方 = track sb to + 地方",
            "pixelsViewed": true,
            "viewMethod": "Original photo pixels viewed in proportional 1600px preview, rotated 90 degrees clockwise; no OCR substituted."
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-G023",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "explanationZh"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-G023",
        "kind": "grammar",
        "sourcePage": 110,
        "pattern": "follow sb to + 地方",
        "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-G023",
        "kind": "grammar",
        "sourcePage": 110,
        "pattern": "follow sb to + 地方",
        "explanationZh": "follow sb to + 地方 在此表示跟隨某人到某地。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "dbb8617f276ddd4c3701fe15c0c05120edc3b05fb950619a933e7fde27664f61",
      "expectedAfterRowSha256": "6a5b134f1a31b92665627714345d85cd8929fa7329b6872bd001e511729d8df4",
      "fields": {
        "explanationZh": "follow sb to + 地方 在此表示跟隨某人到某地。"
      },
      "sources": {
        "explanationZh": [
          {
            "type": "textbook_photo",
            "manifest": "scripts/sources/LV3Unit11.json",
            "file": "20260815_101056.jpg",
            "sha256": "509ee199bff48e08e4a590fa149b34d6d8655a75788ad24aa0d740fff1c198e6",
            "page": 110,
            "printedLevel": "Level 3",
            "printedUnit": "Unit 11",
            "printedText": "trail sb to + 地方 = follow sb to + 地方",
            "pixelsViewed": true,
            "viewMethod": "Original photo pixels viewed in proportional 1600px preview, rotated 90 degrees clockwise; no OCR substituted."
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-G024",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "explanationZh"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-G024",
        "kind": "grammar",
        "sourcePage": 110,
        "pattern": "feel faint",
        "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-G024",
        "kind": "grammar",
        "sourcePage": 110,
        "pattern": "feel faint",
        "explanationZh": "feel faint 表示感到暈眩、快要昏倒。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "147bbf549eae88f6ca26336f4fd497dcc30a056702f434774c07dbe606756806",
      "expectedAfterRowSha256": "47a2fc0ebafa48f94c603344a91cc55f1a43109b6e2102b1b8c28e814771fc64",
      "fields": {
        "explanationZh": "feel faint 表示感到暈眩、快要昏倒。"
      },
      "sources": {
        "explanationZh": [
          {
            "type": "textbook_photo",
            "manifest": "scripts/sources/LV3Unit11.json",
            "file": "20260815_101056.jpg",
            "sha256": "509ee199bff48e08e4a590fa149b34d6d8655a75788ad24aa0d740fff1c198e6",
            "page": 110,
            "printedLevel": "Level 3",
            "printedUnit": "Unit 11",
            "printedText": "feel faint 感到暈暈的 = feel dizzy；I didn't eat anything today and I feel faint with hunger now.",
            "pixelsViewed": true,
            "viewMethod": "Original photo pixels viewed in proportional 1600px preview, rotated 90 degrees clockwise; no OCR substituted."
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-G025",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "explanationZh"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-G025",
        "kind": "grammar",
        "sourcePage": 110,
        "pattern": "feel dizzy",
        "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-G025",
        "kind": "grammar",
        "sourcePage": 110,
        "pattern": "feel dizzy",
        "explanationZh": "feel dizzy 表示感到暈眩。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "63ba2c99ddcf2494b24362e2ba3501dff8c1e96ee4741256bf775804c80da9ed",
      "expectedAfterRowSha256": "d58d808423e186dc277c290fa0ada8b955d1d4871770e4a147ca33be6e4cff0b",
      "fields": {
        "explanationZh": "feel dizzy 表示感到暈眩。"
      },
      "sources": {
        "explanationZh": [
          {
            "type": "textbook_photo",
            "manifest": "scripts/sources/LV3Unit11.json",
            "file": "20260815_101056.jpg",
            "sha256": "509ee199bff48e08e4a590fa149b34d6d8655a75788ad24aa0d740fff1c198e6",
            "page": 110,
            "printedLevel": "Level 3",
            "printedUnit": "Unit 11",
            "printedText": "feel faint 感到暈暈的 = feel dizzy",
            "pixelsViewed": true,
            "viewMethod": "Original photo pixels viewed in proportional 1600px preview, rotated 90 degrees clockwise; no OCR substituted."
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-G026",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "explanationZh"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-G026",
        "kind": "grammar",
        "sourcePage": 110,
        "pattern": "not have the faintest idea",
        "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-G026",
        "kind": "grammar",
        "sourcePage": 110,
        "pattern": "not have the faintest idea",
        "explanationZh": "not have the faintest idea 表示毫不知情、一點也不知道。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "4a27f6747de3b703db2e025284e665d0a0f205d74bfa99a7974f88425d79bc91",
      "expectedAfterRowSha256": "774940f6dff323c9e50af50ae45a673339c61dc850402ef9b66ebd7d29fafd4e",
      "fields": {
        "explanationZh": "not have the faintest idea 表示毫不知情、一點也不知道。"
      },
      "sources": {
        "explanationZh": [
          {
            "type": "textbook_photo",
            "manifest": "scripts/sources/LV3Unit11.json",
            "file": "20260815_101056.jpg",
            "sha256": "509ee199bff48e08e4a590fa149b34d6d8655a75788ad24aa0d740fff1c198e6",
            "page": 110,
            "printedLevel": "Level 3",
            "printedUnit": "Unit 11",
            "printedText": "not have the faintest idea 毫不知情",
            "pixelsViewed": true,
            "viewMethod": "Original photo pixels viewed in proportional 1600px preview, rotated 90 degrees clockwise; no OCR substituted."
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-G027",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "explanationZh"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-G027",
        "kind": "grammar",
        "sourcePage": 110,
        "pattern": "not have the foggiest idea",
        "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-G027",
        "kind": "grammar",
        "sourcePage": 110,
        "pattern": "not have the foggiest idea",
        "explanationZh": "not have the foggiest idea 表示毫不知情、一點也不知道。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "a59729846fb4009a0b735b4e4a38dbc79278d3b7506f8517aacc8dfe0f129c94",
      "expectedAfterRowSha256": "cc3e9806740fc1a2820d46998a324d1c7b74bcb66d55e5596a7be5e5a1769c09",
      "fields": {
        "explanationZh": "not have the foggiest idea 表示毫不知情、一點也不知道。"
      },
      "sources": {
        "explanationZh": [
          {
            "type": "textbook_photo",
            "manifest": "scripts/sources/LV3Unit11.json",
            "file": "20260815_101056.jpg",
            "sha256": "509ee199bff48e08e4a590fa149b34d6d8655a75788ad24aa0d740fff1c198e6",
            "page": 110,
            "printedLevel": "Level 3",
            "printedUnit": "Unit 11",
            "printedText": "not have the faintest idea 毫不知情 = not have the foggiest idea",
            "pixelsViewed": true,
            "viewMethod": "Original photo pixels viewed in proportional 1600px preview, rotated 90 degrees clockwise; no OCR substituted."
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-G028",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "explanationZh"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-G028",
        "kind": "grammar",
        "sourcePage": 110,
        "pattern": "not have the slightest idea",
        "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-G028",
        "kind": "grammar",
        "sourcePage": 110,
        "pattern": "not have the slightest idea",
        "explanationZh": "not have the slightest idea 表示毫不知情、一點也不知道。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "a57c2d895321e7d3cf38968d76ba6d76d838c8902b29a9324c9351e099a4eaca",
      "expectedAfterRowSha256": "84ba14332f5ff54c5e506695c3964ebc2aa12c0757d88ccded14a4368ed6cc89",
      "fields": {
        "explanationZh": "not have the slightest idea 表示毫不知情、一點也不知道。"
      },
      "sources": {
        "explanationZh": [
          {
            "type": "textbook_photo",
            "manifest": "scripts/sources/LV3Unit11.json",
            "file": "20260815_101056.jpg",
            "sha256": "509ee199bff48e08e4a590fa149b34d6d8655a75788ad24aa0d740fff1c198e6",
            "page": 110,
            "printedLevel": "Level 3",
            "printedUnit": "Unit 11",
            "printedText": "not have the faintest idea 毫不知情 = not have the slightest idea",
            "pixelsViewed": true,
            "viewMethod": "Original photo pixels viewed in proportional 1600px preview, rotated 90 degrees clockwise; no OCR substituted."
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-G029",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "explanationZh"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-G029",
        "kind": "grammar",
        "sourcePage": 110,
        "pattern": "have no idea",
        "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-G029",
        "kind": "grammar",
        "sourcePage": 110,
        "pattern": "have no idea",
        "explanationZh": "have no idea 表示不知道、毫不知情。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "625c7e3af05b4a4ba9bb94dd0b92cbc1111fd7581f00eac4a4b23353a2e95f52",
      "expectedAfterRowSha256": "eda1b14ad1785e28a1f841032920ee0c6cdafd396e0d1b6fa07e910da29f65a1",
      "fields": {
        "explanationZh": "have no idea 表示不知道、毫不知情。"
      },
      "sources": {
        "explanationZh": [
          {
            "type": "textbook_photo",
            "manifest": "scripts/sources/LV3Unit11.json",
            "file": "20260815_101056.jpg",
            "sha256": "509ee199bff48e08e4a590fa149b34d6d8655a75788ad24aa0d740fff1c198e6",
            "page": 110,
            "printedLevel": "Level 3",
            "printedUnit": "Unit 11",
            "printedText": "not have the faintest idea 毫不知情 = have no idea",
            "pixelsViewed": true,
            "viewMethod": "Original photo pixels viewed in proportional 1600px preview, rotated 90 degrees clockwise; no OCR substituted."
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-G030",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "explanationZh"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-G030",
        "kind": "grammar",
        "sourcePage": 111,
        "pattern": "pass out",
        "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-G030",
        "kind": "grammar",
        "sourcePage": 111,
        "pattern": "pass out",
        "explanationZh": "pass out 在本頁是昏倒的意思。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "0afb378ed7e16ad5ff48d6a6770ec47733f5bedc7ac380088cfa71944a8e87bc",
      "expectedAfterRowSha256": "182980f5ce3d86c0ce96574cf5c396135ad70aba1da11aaee3f09c56ddd47f77",
      "fields": {
        "explanationZh": "pass out 在本頁是昏倒的意思。"
      },
      "sources": {
        "explanationZh": [
          {
            "type": "textbook_photo",
            "manifest": "scripts/sources/LV3Unit11.json",
            "file": "20260815_101059.jpg",
            "sha256": "9d7e7ff74bc09809e7bf4f746b1b8cd071c6fd42ab1397ee8fbbb8b977e84eaf",
            "page": 111,
            "printedLevel": "Level 3",
            "printedUnit": "Unit 11",
            "printedText": "pass out 昏倒",
            "pixelsViewed": true,
            "viewMethod": "Original photo pixels viewed in proportional 1600px preview, rotated 90 degrees clockwise; no OCR substituted."
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-G031",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "explanationZh"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-G031",
        "kind": "grammar",
        "sourcePage": 111,
        "pattern": "disappear without a trace",
        "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-G031",
        "kind": "grammar",
        "sourcePage": 111,
        "pattern": "disappear without a trace",
        "explanationZh": "disappear without a trace 表示消失得無影無蹤。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "4c719d21ab3c429240ca59ba61be10e4f780b7d424090d92fb03c64ff8735a6d",
      "expectedAfterRowSha256": "a3c5f4bb1e14c8a132d1a43a96395897f9b83791b61708d46f3293537dd0f3a3",
      "fields": {
        "explanationZh": "disappear without a trace 表示消失得無影無蹤。"
      },
      "sources": {
        "explanationZh": [
          {
            "type": "textbook_photo",
            "manifest": "scripts/sources/LV3Unit11.json",
            "file": "20260815_101059.jpg",
            "sha256": "9d7e7ff74bc09809e7bf4f746b1b8cd071c6fd42ab1397ee8fbbb8b977e84eaf",
            "page": 111,
            "printedLevel": "Level 3",
            "printedUnit": "Unit 11",
            "printedText": "disappear without a trace 消失得無影無蹤",
            "pixelsViewed": true,
            "viewMethod": "Original photo pixels viewed in proportional 1600px preview, rotated 90 degrees clockwise; no OCR substituted."
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-G032",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "explanationZh"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-G032",
        "kind": "grammar",
        "sourcePage": 111,
        "pattern": "steady, steadied, steadied",
        "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-G032",
        "kind": "grammar",
        "sourcePage": 111,
        "pattern": "steady, steadied, steadied",
        "explanationZh": "原書所列 steady 的動詞三態為 steady（原形）、steadied（過去式）、steadied（過去分詞）。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "dce831ff7255e235199c869d68383f5fab60859eb8a97a7cf4609d3986f4c6e5",
      "expectedAfterRowSha256": "b0170c9420167b608257ce309971fd86e3d4a4674926d6e5863110671e92b015",
      "fields": {
        "explanationZh": "原書所列 steady 的動詞三態為 steady（原形）、steadied（過去式）、steadied（過去分詞）。"
      },
      "sources": {
        "explanationZh": [
          {
            "type": "textbook_photo",
            "manifest": "scripts/sources/LV3Unit11.json",
            "file": "20260815_101059.jpg",
            "sha256": "9d7e7ff74bc09809e7bf4f746b1b8cd071c6fd42ab1397ee8fbbb8b977e84eaf",
            "page": 111,
            "printedLevel": "Level 3",
            "printedUnit": "Unit 11",
            "printedText": "steady, steadied, steadied",
            "pixelsViewed": true,
            "viewMethod": "Original photo pixels viewed in proportional 1600px preview, rotated 90 degrees clockwise; no OCR substituted."
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-G033",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "explanationZh"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-G033",
        "kind": "grammar",
        "sourcePage": 111,
        "pattern": "go steady（常與介詞 with 並用）",
        "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-G033",
        "kind": "grammar",
        "sourcePage": 111,
        "pattern": "go steady（常與介詞 with 並用）",
        "explanationZh": "原書以 go steady 表示穩定交往；與 with 並用時，後面接交往對象。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "d150228fdebd1be8372aed87c687749dd0754f83947d07e5f5e546592906da07",
      "expectedAfterRowSha256": "6aa60c92cdbfba2c418206c99004b3b926ccb7e07be6bfcb505872430f132a3b",
      "fields": {
        "explanationZh": "原書以 go steady 表示穩定交往；與 with 並用時，後面接交往對象。"
      },
      "sources": {
        "explanationZh": [
          {
            "type": "textbook_photo",
            "manifest": "scripts/sources/LV3Unit11.json",
            "file": "20260815_101059.jpg",
            "sha256": "9d7e7ff74bc09809e7bf4f746b1b8cd071c6fd42ab1397ee8fbbb8b977e84eaf",
            "page": 111,
            "printedLevel": "Level 3",
            "printedUnit": "Unit 11",
            "printedText": "go steady（男女）穩定交往（與介詞 with 並用）",
            "pixelsViewed": true,
            "viewMethod": "Original photo pixels viewed in proportional 1600px preview, rotated 90 degrees clockwise; no OCR substituted."
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-G034",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "explanationZh"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-G034",
        "kind": "grammar",
        "sourcePage": 112,
        "pattern": "be in stable / critical condition",
        "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-G034",
        "kind": "grammar",
        "sourcePage": 112,
        "pattern": "be in stable / critical condition",
        "explanationZh": "be in stable condition 表示病人情況穩定；be in critical condition 表示病人情況危急。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "2db39a83eb4b8c3c26a0e83a8513054fa9127aa12e4251809855756ad41247df",
      "expectedAfterRowSha256": "5268a0bcfd024e2b06ac462b44a12bbdb2d0b80d78cea8cc134dbf831f6aeb35",
      "fields": {
        "explanationZh": "be in stable condition 表示病人情況穩定；be in critical condition 表示病人情況危急。"
      },
      "sources": {
        "explanationZh": [
          {
            "type": "textbook_photo",
            "manifest": "scripts/sources/LV3Unit11.json",
            "file": "20260815_101110.jpg",
            "sha256": "f465aa4501b701ba249c53556cf681d2be3f1d1f28a3656f31b6da8910201bf9",
            "page": 112,
            "printedLevel": "Level 3",
            "printedUnit": "Unit 11",
            "printedText": "be in stable / critical condition（病人）處於穩定／危急的狀況",
            "pixelsViewed": true,
            "viewMethod": "Original photo pixels viewed in proportional 1600px preview, rotated 90 degrees clockwise; no OCR substituted."
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-G035",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "explanationZh"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-G035",
        "kind": "grammar",
        "sourcePage": 112,
        "pattern": "injury（複數為 injuries）",
        "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-G035",
        "kind": "grammar",
        "sourcePage": 112,
        "pattern": "injury（複數為 injuries）",
        "explanationZh": "injury 表示身體傷害時可數，複數為 injuries；原書另列名譽損壞義為不可數。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "42b55e09058e8c18ec94c7ac1691d0cc74add8854170d059600300e39266c28e",
      "expectedAfterRowSha256": "607526d71213ed9080b8c3c6f4eb0448e175dbd491abb9f93f9a669a7e6264ee",
      "fields": {
        "explanationZh": "injury 表示身體傷害時可數，複數為 injuries；原書另列名譽損壞義為不可數。"
      },
      "sources": {
        "explanationZh": [
          {
            "type": "textbook_photo",
            "manifest": "scripts/sources/LV3Unit11.json",
            "file": "20260815_101110.jpg",
            "sha256": "f465aa4501b701ba249c53556cf681d2be3f1d1f28a3656f31b6da8910201bf9",
            "page": 112,
            "printedLevel": "Level 3",
            "printedUnit": "Unit 11",
            "printedText": "injury n.（身體）傷害（可數）；（名譽）損壞（不可數）；injuries",
            "pixelsViewed": true,
            "viewMethod": "Original photo pixels viewed in proportional 1600px preview, rotated 90 degrees clockwise; no OCR substituted."
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-G036",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "explanationZh"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-G036",
        "kind": "grammar",
        "sourcePage": 112,
        "pattern": "recover from...",
        "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-G036",
        "kind": "grammar",
        "sourcePage": 112,
        "pattern": "recover from...",
        "explanationZh": "recover from... 表示從……恢復、康復。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "3c21d2b583ab4c75e7127c59687cbb92e031155cd3f47c4314ab344f8c473291",
      "expectedAfterRowSha256": "19e2599e6f8b53df1c90f4bc5d12bbf5beb99625235b1b65e67d53e343527337",
      "fields": {
        "explanationZh": "recover from... 表示從……恢復、康復。"
      },
      "sources": {
        "explanationZh": [
          {
            "type": "textbook_photo",
            "manifest": "scripts/sources/LV3Unit11.json",
            "file": "20260815_101110.jpg",
            "sha256": "f465aa4501b701ba249c53556cf681d2be3f1d1f28a3656f31b6da8910201bf9",
            "page": 112,
            "printedLevel": "Level 3",
            "printedUnit": "Unit 11",
            "printedText": "recover from... 從……復原",
            "pixelsViewed": true,
            "viewMethod": "Original photo pixels viewed in proportional 1600px preview, rotated 90 degrees clockwise; no OCR substituted."
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-G037",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "explanationZh"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-G037",
        "kind": "grammar",
        "sourcePage": 112,
        "pattern": "a car dealer",
        "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-G037",
        "kind": "grammar",
        "sourcePage": 112,
        "pattern": "a car dealer",
        "explanationZh": "a car dealer 指汽車商。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "937f9156295554a145b7ffbeab67f0fa20d38144a47929848340e9900990e3f5",
      "expectedAfterRowSha256": "8c5c1ae5827a051c13e811513da697fe0b53a97cea1999fa6f78aab74bc702cb",
      "fields": {
        "explanationZh": "a car dealer 指汽車商。"
      },
      "sources": {
        "explanationZh": [
          {
            "type": "textbook_photo",
            "manifest": "scripts/sources/LV3Unit11.json",
            "file": "20260815_101110.jpg",
            "sha256": "f465aa4501b701ba249c53556cf681d2be3f1d1f28a3656f31b6da8910201bf9",
            "page": 112,
            "printedLevel": "Level 3",
            "printedUnit": "Unit 11",
            "printedText": "a car dealer 汽車商",
            "pixelsViewed": true,
            "viewMethod": "Original photo pixels viewed in proportional 1600px preview, rotated 90 degrees clockwise; no OCR substituted."
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-G038",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "explanationZh"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-G038",
        "kind": "grammar",
        "sourcePage": 112,
        "pattern": "an antique dealer",
        "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-G038",
        "kind": "grammar",
        "sourcePage": 112,
        "pattern": "an antique dealer",
        "explanationZh": "an antique dealer 指古董商。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "51e4b5a55bef863085c64c82e56f19a86af259804cd7d5e833be2c385540ecc7",
      "expectedAfterRowSha256": "183310aadbc92bbd95eb058ad4c3cfca762b3245f7f9f4da46838edeae3e0472",
      "fields": {
        "explanationZh": "an antique dealer 指古董商。"
      },
      "sources": {
        "explanationZh": [
          {
            "type": "textbook_photo",
            "manifest": "scripts/sources/LV3Unit11.json",
            "file": "20260815_101110.jpg",
            "sha256": "f465aa4501b701ba249c53556cf681d2be3f1d1f28a3656f31b6da8910201bf9",
            "page": 112,
            "printedLevel": "Level 3",
            "printedUnit": "Unit 11",
            "printedText": "an antique dealer 古董商",
            "pixelsViewed": true,
            "viewMethod": "Original photo pixels viewed in proportional 1600px preview, rotated 90 degrees clockwise; no OCR substituted."
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-G039",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "explanationZh"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-G039",
        "kind": "grammar",
        "sourcePage": 112,
        "pattern": "deal in used cars = buy and sell used cars",
        "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-G039",
        "kind": "grammar",
        "sourcePage": 112,
        "pattern": "deal in used cars = buy and sell used cars",
        "explanationZh": "deal in used cars 表示買賣中古汽車，相當於 buy and sell used cars。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "04affbd07e5bad4aa5edbba0a5c56cc7f544f89af4c10895dfaaf8964fa1111e",
      "expectedAfterRowSha256": "8b8ef44dbcd12f3562c6783e1b20902126979007a45c498ce567e6ade4930a62",
      "fields": {
        "explanationZh": "deal in used cars 表示買賣中古汽車，相當於 buy and sell used cars。"
      },
      "sources": {
        "explanationZh": [
          {
            "type": "textbook_photo",
            "manifest": "scripts/sources/LV3Unit11.json",
            "file": "20260815_101110.jpg",
            "sha256": "f465aa4501b701ba249c53556cf681d2be3f1d1f28a3656f31b6da8910201bf9",
            "page": 112,
            "printedLevel": "Level 3",
            "printedUnit": "Unit 11",
            "printedText": "deal in used cars 買賣中古汽車 = buy and sell used cars",
            "pixelsViewed": true,
            "viewMethod": "Original photo pixels viewed in proportional 1600px preview, rotated 90 degrees clockwise; no OCR substituted."
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-G040",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "explanationZh"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-G040",
        "kind": "grammar",
        "sourcePage": 112,
        "pattern": "admire sb for sth",
        "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-G040",
        "kind": "grammar",
        "sourcePage": 112,
        "pattern": "admire sb for sth",
        "explanationZh": "admire sb for sth 表示因某事物而欣賞、欽佩某人。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "c80904b2b7ffd2aeedc3423e0ea8e7edb69f8dc1165758cbe82d100329abf8ea",
      "expectedAfterRowSha256": "bfdeab8bb5859bf84e7df220aa6f385c84a4f8b4226d0c5e295c627d1f0e31c9",
      "fields": {
        "explanationZh": "admire sb for sth 表示因某事物而欣賞、欽佩某人。"
      },
      "sources": {
        "explanationZh": [
          {
            "type": "textbook_photo",
            "manifest": "scripts/sources/LV3Unit11.json",
            "file": "20260815_101110.jpg",
            "sha256": "f465aa4501b701ba249c53556cf681d2be3f1d1f28a3656f31b6da8910201bf9",
            "page": 112,
            "printedLevel": "Level 3",
            "printedUnit": "Unit 11",
            "printedText": "admire sb for sth 因某事物而欣賞某人",
            "pixelsViewed": true,
            "viewMethod": "Original photo pixels viewed in proportional 1600px preview, rotated 90 degrees clockwise; no OCR substituted."
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-G041",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "explanationZh"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-G041",
        "kind": "grammar",
        "sourcePage": 113,
        "pattern": "think highly of...",
        "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-G041",
        "kind": "grammar",
        "sourcePage": 113,
        "pattern": "think highly of...",
        "explanationZh": "think highly of... 表示看得起、對……評價很高。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "a8485e550e5397a534da3e4a025d6b8561f8549f71fa3a7c0f0fabf83262aa0e",
      "expectedAfterRowSha256": "6d5e31d8ff58139c7f9f2d706cbab3b80ca8bf5caa016f015b80a9426562dedd",
      "fields": {
        "explanationZh": "think highly of... 表示看得起、對……評價很高。"
      },
      "sources": {
        "explanationZh": [
          {
            "type": "textbook_photo",
            "manifest": "scripts/sources/LV3Unit11.json",
            "file": "20260815_101115.jpg",
            "sha256": "20a53277f9db8df4f0ea2da5f7734a3cb328532e1925fc716eec84a9d24aaec6",
            "page": 113,
            "printedLevel": "Level 3",
            "printedUnit": "Unit 11",
            "printedText": "think highly of... 看得起……",
            "pixelsViewed": true,
            "viewMethod": "Original photo pixels viewed in proportional 1600px preview, rotated 90 degrees clockwise; no OCR substituted."
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-G042",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "explanationZh"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-G042",
        "kind": "grammar",
        "sourcePage": 113,
        "pattern": "hard on one's heels",
        "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-G042",
        "kind": "grammar",
        "sourcePage": 113,
        "pattern": "hard on one's heels",
        "explanationZh": "hard on one's heels 表示緊跟某人、緊追不捨。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "cad9d97fffc4eed08f413f3698007a685a61b611b9889221b8ca159653b27678",
      "expectedAfterRowSha256": "49f2212d03667abd7e48de856788b44193a6119da91212f02c833b7d89c7da67",
      "fields": {
        "explanationZh": "hard on one's heels 表示緊跟某人、緊追不捨。"
      },
      "sources": {
        "explanationZh": [
          {
            "type": "textbook_photo",
            "manifest": "scripts/sources/LV3Unit11.json",
            "file": "20260815_101115.jpg",
            "sha256": "20a53277f9db8df4f0ea2da5f7734a3cb328532e1925fc716eec84a9d24aaec6",
            "page": 113,
            "printedLevel": "Level 3",
            "printedUnit": "Unit 11",
            "printedText": "hard on one's heels 緊跟某人",
            "pixelsViewed": true,
            "viewMethod": "Original photo pixels viewed in proportional 1600px preview, rotated 90 degrees clockwise; no OCR substituted."
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-G043",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "explanationZh"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-G043",
        "kind": "grammar",
        "sourcePage": 113,
        "pattern": "high heels",
        "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-G043",
        "kind": "grammar",
        "sourcePage": 113,
        "pattern": "high heels",
        "explanationZh": "high heels 指高跟鞋。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "a9294a4b4a2ac652a45898a94c62c679d1e6545e1a13ee69d931c014fcfe032e",
      "expectedAfterRowSha256": "88efe4e29e02f6b2b44f934dcb67f571aeccdff7f6be6c95519f1d47fcdfb737",
      "fields": {
        "explanationZh": "high heels 指高跟鞋。"
      },
      "sources": {
        "explanationZh": [
          {
            "type": "textbook_photo",
            "manifest": "scripts/sources/LV3Unit11.json",
            "file": "20260815_101115.jpg",
            "sha256": "20a53277f9db8df4f0ea2da5f7734a3cb328532e1925fc716eec84a9d24aaec6",
            "page": 113,
            "printedLevel": "Level 3",
            "printedUnit": "Unit 11",
            "printedText": "high heels 高跟鞋",
            "pixelsViewed": true,
            "viewMethod": "Original photo pixels viewed in proportional 1600px preview, rotated 90 degrees clockwise; no OCR substituted."
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-G044",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "explanationZh"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-G044",
        "kind": "grammar",
        "sourcePage": 113,
        "pattern": "a pair of high heels",
        "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-G044",
        "kind": "grammar",
        "sourcePage": 113,
        "pattern": "a pair of high heels",
        "explanationZh": "a pair of high heels 指一雙高跟鞋。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "9f32fc07ba00ed8c52becfcfd9e7cbb9654525adb27d2107d6306afd70109ed5",
      "expectedAfterRowSha256": "532eb065d6e2fa985fa15b8ae131d56d0db0ad75d53138f250986219fef0e127",
      "fields": {
        "explanationZh": "a pair of high heels 指一雙高跟鞋。"
      },
      "sources": {
        "explanationZh": [
          {
            "type": "textbook_photo",
            "manifest": "scripts/sources/LV3Unit11.json",
            "file": "20260815_101115.jpg",
            "sha256": "20a53277f9db8df4f0ea2da5f7734a3cb328532e1925fc716eec84a9d24aaec6",
            "page": 113,
            "printedLevel": "Level 3",
            "printedUnit": "Unit 11",
            "printedText": "a pair of high heels 一雙高跟鞋",
            "pixelsViewed": true,
            "viewMethod": "Original photo pixels viewed in proportional 1600px preview, rotated 90 degrees clockwise; no OCR substituted."
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-G045",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "explanationZh"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-G045",
        "kind": "grammar",
        "sourcePage": 113,
        "pattern": "be satisfied with...",
        "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-G045",
        "kind": "grammar",
        "sourcePage": 113,
        "pattern": "be satisfied with...",
        "explanationZh": "be satisfied with... 表示對……感到滿意。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "9560fa6f929ba9ae863fbebc04fe679ce0225163192d7b7f208b2caf1f18fae6",
      "expectedAfterRowSha256": "22415bc8a3e6feefdb32c5b5a14cb2b62fb5ffe8c84f5b4b0ad7e1b0f1582e7a",
      "fields": {
        "explanationZh": "be satisfied with... 表示對……感到滿意。"
      },
      "sources": {
        "explanationZh": [
          {
            "type": "textbook_photo",
            "manifest": "scripts/sources/LV3Unit11.json",
            "file": "20260815_101115.jpg",
            "sha256": "20a53277f9db8df4f0ea2da5f7734a3cb328532e1925fc716eec84a9d24aaec6",
            "page": 113,
            "printedLevel": "Level 3",
            "printedUnit": "Unit 11",
            "printedText": "be satisfied with... 對……感到滿意",
            "pixelsViewed": true,
            "viewMethod": "Original photo pixels viewed in proportional 1600px preview, rotated 90 degrees clockwise; no OCR substituted."
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-G046",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "explanationZh"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-G046",
        "kind": "grammar",
        "sourcePage": 114,
        "pattern": "splash water on sb",
        "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-G046",
        "kind": "grammar",
        "sourcePage": 114,
        "pattern": "splash water on sb",
        "explanationZh": "splash water on sb 表示把水潑到某人身上。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "469b6c76810b5ece232a650eb3b8e42376c611b441de5271f79aaeb1e2877301",
      "expectedAfterRowSha256": "1376fa9a0c1087177d90815f52350a2c386acc3ac758c63708624380165376f9",
      "fields": {
        "explanationZh": "splash water on sb 表示把水潑到某人身上。"
      },
      "sources": {
        "explanationZh": [
          {
            "type": "textbook_photo",
            "manifest": "scripts/sources/LV3Unit11.json",
            "file": "20260815_101130.jpg",
            "sha256": "3dcc30eaaf9bb0f3170f3f342253ecfc56f238222c6055cc63055f035c8403a8",
            "page": 114,
            "printedLevel": "Level 3",
            "printedUnit": "Unit 11",
            "printedText": "splash water on sb 把水潑到某人身上",
            "pixelsViewed": true,
            "viewMethod": "Original photo pixels viewed in proportional 1600px preview, rotated 90 degrees clockwise; no OCR substituted."
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-G047",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "explanationZh"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-G047",
        "kind": "grammar",
        "sourcePage": 114,
        "pattern": "splash about / around",
        "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-G047",
        "kind": "grammar",
        "sourcePage": 114,
        "pattern": "splash about / around",
        "explanationZh": "splash about / around 表示到處潑水、戲水。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "f77521b4312ebf9b8da956ff39ddcdf9181f0a06141bd1d8b17f4628f2a1c613",
      "expectedAfterRowSha256": "398967d2e8b257c7f36fb7e9f335bab5b987ea71b1ac2e144e9090a224a00f1a",
      "fields": {
        "explanationZh": "splash about / around 表示到處潑水、戲水。"
      },
      "sources": {
        "explanationZh": [
          {
            "type": "textbook_photo",
            "manifest": "scripts/sources/LV3Unit11.json",
            "file": "20260815_101130.jpg",
            "sha256": "3dcc30eaaf9bb0f3170f3f342253ecfc56f238222c6055cc63055f035c8403a8",
            "page": 114,
            "printedLevel": "Level 3",
            "printedUnit": "Unit 11",
            "printedText": "splash about / around 到處潑水",
            "pixelsViewed": true,
            "viewMethod": "Original photo pixels viewed in proportional 1600px preview, rotated 90 degrees clockwise; no OCR substituted."
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-G048",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "explanationZh"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-G048",
        "kind": "grammar",
        "sourcePage": 114,
        "pattern": "make a splash = cause a sensation",
        "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-G048",
        "kind": "grammar",
        "sourcePage": 114,
        "pattern": "make a splash = cause a sensation",
        "explanationZh": "make a splash 在此比喻引起轟動，相當於 cause a sensation。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "ce9ba6f76dd90a222fecf4f888363c14a06a7a39ab322d9d276770d3e47048e8",
      "expectedAfterRowSha256": "5dfebd6f0c66cbd126b35aa5203070150a316cfd10205f6a2dc7340a1e4adc22",
      "fields": {
        "explanationZh": "make a splash 在此比喻引起轟動，相當於 cause a sensation。"
      },
      "sources": {
        "explanationZh": [
          {
            "type": "textbook_photo",
            "manifest": "scripts/sources/LV3Unit11.json",
            "file": "20260815_101130.jpg",
            "sha256": "3dcc30eaaf9bb0f3170f3f342253ecfc56f238222c6055cc63055f035c8403a8",
            "page": 114,
            "printedLevel": "Level 3",
            "printedUnit": "Unit 11",
            "printedText": "make a splash 引起轟動 = cause a sensation",
            "pixelsViewed": true,
            "viewMethod": "Original photo pixels viewed in proportional 1600px preview, rotated 90 degrees clockwise; no OCR substituted."
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-G049",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "explanationZh"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-G049",
        "kind": "grammar",
        "sourcePage": 114,
        "pattern": "be impressed with sth",
        "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-G049",
        "kind": "grammar",
        "sourcePage": 114,
        "pattern": "be impressed with sth",
        "explanationZh": "be impressed with sth 表示對某事物留下深刻印象。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "ae940f48778604d1612e2ebd8527595d384882205286752a6c3c6ee5b5498058",
      "expectedAfterRowSha256": "25daefd86b81a58b9453d5d679ca7fa766d2e1158f0fb60a18054ef34a5ef718",
      "fields": {
        "explanationZh": "be impressed with sth 表示對某事物留下深刻印象。"
      },
      "sources": {
        "explanationZh": [
          {
            "type": "textbook_photo",
            "manifest": "scripts/sources/LV3Unit11.json",
            "file": "20260815_101130.jpg",
            "sha256": "3dcc30eaaf9bb0f3170f3f342253ecfc56f238222c6055cc63055f035c8403a8",
            "page": 114,
            "printedLevel": "Level 3",
            "printedUnit": "Unit 11",
            "printedText": "be impressed with sth 對某事物有深刻的印象",
            "pixelsViewed": true,
            "viewMethod": "Original photo pixels viewed in proportional 1600px preview, rotated 90 degrees clockwise; no OCR substituted."
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-G050",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "explanationZh",
        "pattern"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-G050",
        "kind": "grammar",
        "sourcePage": 114,
        "pattern": "impress sb with sth = impress sth on / upon sb",
        "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-G050",
        "kind": "grammar",
        "sourcePage": 114,
        "pattern": "impress sb with sth；impress sth on / upon sb（用法辨析）",
        "explanationZh": "原書把兩種搭配並列為同義，學習時須區分：impress sb with sth 指以某事物使某人讚賞、留下深刻印象；impress sth on / upon sb 指向某人強調某事的重要性，使其銘記。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "e0714e099f26071bba02fe8e02acbc87af57fa5451cef81c454bb2ff8fbaf082",
      "expectedAfterRowSha256": "63e498fab30d1d9791ab32dbd22f5eccd1c7f8fbd6e9959e7032ebffc28d4410",
      "fields": {
        "explanationZh": "原書把兩種搭配並列為同義，學習時須區分：impress sb with sth 指以某事物使某人讚賞、留下深刻印象；impress sth on / upon sb 指向某人強調某事的重要性，使其銘記。",
        "pattern": "impress sb with sth；impress sth on / upon sb（用法辨析）"
      },
      "sources": {
        "explanationZh": [
          {
            "type": "textbook_photo",
            "manifest": "scripts/sources/LV3Unit11.json",
            "file": "20260815_101130.jpg",
            "sha256": "3dcc30eaaf9bb0f3170f3f342253ecfc56f238222c6055cc63055f035c8403a8",
            "page": 114,
            "printedLevel": "Level 3",
            "printedUnit": "Unit 11",
            "printedText": "impress sb with sth = impress sth on / upon sb；The teacher impressed the importance of honesty upon the class.",
            "pixelsViewed": true,
            "viewMethod": "Original photo pixels viewed in proportional 1600px preview, rotated 90 degrees clockwise; no OCR substituted."
          },
          {
            "url": "https://dictionary.cambridge.org/dictionary/english/impress",
            "title": "Cambridge Dictionary: impress",
            "quote": "to cause someone to admire or respect you",
            "checked": "2026-11-08",
            "supports": "impress sb with sth 的讚賞義"
          },
          {
            "url": "https://dictionary.cambridge.org/dictionary/english/impress-on-upon",
            "title": "Cambridge Dictionary: impress something on/upon someone",
            "quote": "to make someone understand or be familiar with the importance or value of something",
            "checked": "2026-11-08",
            "supports": "impress sth on/upon sb 的強調重要性義"
          }
        ],
        "pattern": [
          {
            "type": "textbook_photo",
            "manifest": "scripts/sources/LV3Unit11.json",
            "file": "20260815_101130.jpg",
            "sha256": "3dcc30eaaf9bb0f3170f3f342253ecfc56f238222c6055cc63055f035c8403a8",
            "page": 114,
            "printedLevel": "Level 3",
            "printedUnit": "Unit 11",
            "printedText": "impress sb with sth = impress sth on / upon sb；The teacher impressed the importance of honesty upon the class.",
            "pixelsViewed": true,
            "viewMethod": "Original photo pixels viewed in proportional 1600px preview, rotated 90 degrees clockwise; no OCR substituted."
          },
          {
            "url": "https://dictionary.cambridge.org/dictionary/english/impress",
            "title": "Cambridge Dictionary: impress",
            "quote": "to cause someone to admire or respect you",
            "checked": "2026-11-08",
            "supports": "impress sb with sth 的讚賞義"
          },
          {
            "url": "https://dictionary.cambridge.org/dictionary/english/impress-on-upon",
            "title": "Cambridge Dictionary: impress something on/upon someone",
            "quote": "to make someone understand or be familiar with the importance or value of something",
            "checked": "2026-11-08",
            "supports": "impress sth on/upon sb 的強調重要性義"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-G051",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "explanationZh"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-G051",
        "kind": "grammar",
        "sourcePage": 114,
        "pattern": "melt away",
        "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-G051",
        "kind": "grammar",
        "sourcePage": 114,
        "pattern": "melt away",
        "explanationZh": "melt away 在此表示融化殆盡。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "bc91630ef92fb93ed82b408c5d1638439b43da152f920d35f15d13f4e38760c0",
      "expectedAfterRowSha256": "0a81314725cbeb07fa9e08e08ffc8e621cdf5db1a3d77c228cc7cdb9196078d6",
      "fields": {
        "explanationZh": "melt away 在此表示融化殆盡。"
      },
      "sources": {
        "explanationZh": [
          {
            "type": "textbook_photo",
            "manifest": "scripts/sources/LV3Unit11.json",
            "file": "20260815_101130.jpg",
            "sha256": "3dcc30eaaf9bb0f3170f3f342253ecfc56f238222c6055cc63055f035c8403a8",
            "page": 114,
            "printedLevel": "Level 3",
            "printedUnit": "Unit 11",
            "printedText": "melt away 融化殆盡",
            "pixelsViewed": true,
            "viewMethod": "Original photo pixels viewed in proportional 1600px preview, rotated 90 degrees clockwise; no OCR substituted."
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-G052",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "explanationZh"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-G052",
        "kind": "grammar",
        "sourcePage": 114,
        "pattern": "a melting pot",
        "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-G052",
        "kind": "grammar",
        "sourcePage": 114,
        "pattern": "a melting pot",
        "explanationZh": "a melting pot 字面為熔爐，原書也用來比喻不同背景的移民匯聚的社會。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "0257993a3af24efe41bf3086f8bee753baf4b1371c055bec8a455ca957176aec",
      "expectedAfterRowSha256": "d36bfa0089722b690f4171a906b3cb90c5d1382ca827ed7c8e88682647bc455a",
      "fields": {
        "explanationZh": "a melting pot 字面為熔爐，原書也用來比喻不同背景的移民匯聚的社會。"
      },
      "sources": {
        "explanationZh": [
          {
            "type": "textbook_photo",
            "manifest": "scripts/sources/LV3Unit11.json",
            "file": "20260815_101130.jpg",
            "sha256": "3dcc30eaaf9bb0f3170f3f342253ecfc56f238222c6055cc63055f035c8403a8",
            "page": 114,
            "printedLevel": "Level 3",
            "printedUnit": "Unit 11",
            "printedText": "a melting pot 鎔爐",
            "pixelsViewed": true,
            "viewMethod": "Original photo pixels viewed in proportional 1600px preview, rotated 90 degrees clockwise; no OCR substituted."
          },
          {
            "type": "textbook_photo",
            "file": "20260815_101154.jpg",
            "sha256": "f209d8b46ccbb46893daf48a01b46ccd2aab1fdf49ad990972aaae5ca3638336",
            "page": 115,
            "printedText": "With a diversity of immigrants from across the world, the United States is properly called a big melting pot.",
            "pixelsViewed": true
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-G053",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "explanationZh"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-G053",
        "kind": "grammar",
        "sourcePage": 115,
        "pattern": "It is desirable that + S + (should) + V",
        "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-G053",
        "kind": "grammar",
        "sourcePage": 115,
        "pattern": "It is desirable that + S + (should) + V",
        "explanationZh": "It is desirable that + S + (should) + V 表示最好……；原書此句型的 should 可省略，V 用原形。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "202e142609f9005136eb577a401682a9fa72f6dcce803272c59f3cf3163dfbbb",
      "expectedAfterRowSha256": "9ff1495a2a7b2c0a1c08f3acd7d5264ab289bb6f7e8eea92c4a81f74fb3937d7",
      "fields": {
        "explanationZh": "It is desirable that + S + (should) + V 表示最好……；原書此句型的 should 可省略，V 用原形。"
      },
      "sources": {
        "explanationZh": [
          {
            "type": "textbook_photo",
            "manifest": "scripts/sources/LV3Unit11.json",
            "file": "20260815_101154.jpg",
            "sha256": "f209d8b46ccbb46893daf48a01b46ccd2aab1fdf49ad990972aaae5ca3638336",
            "page": 115,
            "printedLevel": "Level 3",
            "printedUnit": "Unit 11",
            "printedText": "It is desirable that + S + (should) + V 最好……；It is desirable that the report (should) be finished today.",
            "pixelsViewed": true,
            "viewMethod": "Original photo pixels viewed in proportional 1600px preview, rotated 90 degrees clockwise; no OCR substituted."
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-G054",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "explanationZh"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-G054",
        "kind": "grammar",
        "sourcePage": 115,
        "pattern": "leave nothing to be desired",
        "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-G054",
        "kind": "grammar",
        "sourcePage": 115,
        "pattern": "leave nothing to be desired",
        "explanationZh": "leave nothing to be desired 表示無懈可擊、完美無缺。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "2ab1576960f4481e7b91ec7fff9c69a03c59c8c04118fad661f19f782b7aa1a5",
      "expectedAfterRowSha256": "bc2e192943a4425da16ea8c1f7d193008059d5bf3819ea0e465fadf9f244b086",
      "fields": {
        "explanationZh": "leave nothing to be desired 表示無懈可擊、完美無缺。"
      },
      "sources": {
        "explanationZh": [
          {
            "type": "textbook_photo",
            "manifest": "scripts/sources/LV3Unit11.json",
            "file": "20260815_101154.jpg",
            "sha256": "f209d8b46ccbb46893daf48a01b46ccd2aab1fdf49ad990972aaae5ca3638336",
            "page": 115,
            "printedLevel": "Level 3",
            "printedUnit": "Unit 11",
            "printedText": "leave nothing to be desired 無懈可擊",
            "pixelsViewed": true,
            "viewMethod": "Original photo pixels viewed in proportional 1600px preview, rotated 90 degrees clockwise; no OCR substituted."
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-G055",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "explanationZh"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-G055",
        "kind": "grammar",
        "sourcePage": 115,
        "pattern": "leave much to be desired",
        "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-G055",
        "kind": "grammar",
        "sourcePage": 115,
        "pattern": "leave much to be desired",
        "explanationZh": "leave much to be desired 表示尚待改進、仍有很大的改善空間。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "ab87e4a53b2b15093138c51451cd6f7719f5f3ea80a729f6432d09e0f6c42735",
      "expectedAfterRowSha256": "5c38878569a1ee9e1c08cb5592f44aa8daffcad7fea039d8b92d68ce544db14c",
      "fields": {
        "explanationZh": "leave much to be desired 表示尚待改進、仍有很大的改善空間。"
      },
      "sources": {
        "explanationZh": [
          {
            "type": "textbook_photo",
            "manifest": "scripts/sources/LV3Unit11.json",
            "file": "20260815_101154.jpg",
            "sha256": "f209d8b46ccbb46893daf48a01b46ccd2aab1fdf49ad990972aaae5ca3638336",
            "page": 115,
            "printedLevel": "Level 3",
            "printedUnit": "Unit 11",
            "printedText": "leave much to be desired 尚待改進",
            "pixelsViewed": true,
            "viewMethod": "Original photo pixels viewed in proportional 1600px preview, rotated 90 degrees clockwise; no OCR substituted."
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-G056",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "explanationZh"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-G056",
        "kind": "grammar",
        "sourcePage": 115,
        "pattern": "a desire for...",
        "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-G056",
        "kind": "grammar",
        "sourcePage": 115,
        "pattern": "a desire for...",
        "explanationZh": "a desire for... 表示對……的慾望。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "06f176a172e09c09da0f20d1a293685398021f46b501388bf35cd5f4a4040296",
      "expectedAfterRowSha256": "1bb4b7f985d036d1904e18b703fed14b878f6807b7fce2bebf7f0f8efb5cf6be",
      "fields": {
        "explanationZh": "a desire for... 表示對……的慾望。"
      },
      "sources": {
        "explanationZh": [
          {
            "type": "textbook_photo",
            "manifest": "scripts/sources/LV3Unit11.json",
            "file": "20260815_101154.jpg",
            "sha256": "f209d8b46ccbb46893daf48a01b46ccd2aab1fdf49ad990972aaae5ca3638336",
            "page": 115,
            "printedLevel": "Level 3",
            "printedUnit": "Unit 11",
            "printedText": "a desire for... 對……的慾望",
            "pixelsViewed": true,
            "viewMethod": "Original photo pixels viewed in proportional 1600px preview, rotated 90 degrees clockwise; no OCR substituted."
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-G057",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "explanationZh"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-G057",
        "kind": "grammar",
        "sourcePage": 115,
        "pattern": "have a desire to + V",
        "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-G057",
        "kind": "grammar",
        "sourcePage": 115,
        "pattern": "have a desire to + V",
        "explanationZh": "have a desire to + V 表示想要做某事，to 後接原形動詞。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "9da3e907b82f2761cf46eca6e1a8dcadccba9846f653b743dcd62fd8fc3d3487",
      "expectedAfterRowSha256": "d080d00c3908c93f34e429f684e5d38501e417d3521bde9fb30de8328411af02",
      "fields": {
        "explanationZh": "have a desire to + V 表示想要做某事，to 後接原形動詞。"
      },
      "sources": {
        "explanationZh": [
          {
            "type": "textbook_photo",
            "manifest": "scripts/sources/LV3Unit11.json",
            "file": "20260815_101154.jpg",
            "sha256": "f209d8b46ccbb46893daf48a01b46ccd2aab1fdf49ad990972aaae5ca3638336",
            "page": 115,
            "printedLevel": "Level 3",
            "printedUnit": "Unit 11",
            "printedText": "have a desire to + V 想要……",
            "pixelsViewed": true,
            "viewMethod": "Original photo pixels viewed in proportional 1600px preview, rotated 90 degrees clockwise; no OCR substituted."
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-G058",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "explanationZh"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-G058",
        "kind": "grammar",
        "sourcePage": 115,
        "pattern": "need sth badly = be badly in need of sth",
        "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-G058",
        "kind": "grammar",
        "sourcePage": 115,
        "pattern": "need sth badly = be badly in need of sth",
        "explanationZh": "need sth badly 與 be badly in need of sth 都表示迫切、非常需要某事物。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "3ada996eb947ea21f23b9d7a5676592bdbf774a1c394dbccba776949b9c89102",
      "expectedAfterRowSha256": "99b54b6e9e805b4de6ad49c2d9a45e183778438027a62586e4e33e245853399d",
      "fields": {
        "explanationZh": "need sth badly 與 be badly in need of sth 都表示迫切、非常需要某事物。"
      },
      "sources": {
        "explanationZh": [
          {
            "type": "textbook_photo",
            "manifest": "scripts/sources/LV3Unit11.json",
            "file": "20260815_101154.jpg",
            "sha256": "f209d8b46ccbb46893daf48a01b46ccd2aab1fdf49ad990972aaae5ca3638336",
            "page": 115,
            "printedLevel": "Level 3",
            "printedUnit": "Unit 11",
            "printedText": "need sth badly 迫切／非常需要某事物 = be badly in need of sth",
            "pixelsViewed": true,
            "viewMethod": "Original photo pixels viewed in proportional 1600px preview, rotated 90 degrees clockwise; no OCR substituted."
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-G059",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "explanationZh"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-G059",
        "kind": "grammar",
        "sourcePage": 116,
        "pattern": "colony（複數為 colonies）",
        "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-G059",
        "kind": "grammar",
        "sourcePage": 116,
        "pattern": "colony（複數為 colonies）",
        "explanationZh": "colony 的複數為 colonies。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "34bd4d8e93af4a1e161dc3dc40464c43bc52fb620b8c33a57e1f5d40a6c7aac3",
      "expectedAfterRowSha256": "c3093b9ac147001320b3ddc63568dc5cf9d3144fc1aed262493c3d2ec7032756",
      "fields": {
        "explanationZh": "colony 的複數為 colonies。"
      },
      "sources": {
        "explanationZh": [
          {
            "type": "textbook_photo",
            "manifest": "scripts/sources/LV3Unit11.json",
            "file": "20260815_101205.jpg",
            "sha256": "bac53daf334a9614ba784360e2f7f64837bd177ea4c5283bdb6d8f7df403dd03",
            "page": 116,
            "printedLevel": "Level 3",
            "printedUnit": "Unit 11",
            "printedText": "colony；colonies",
            "pixelsViewed": true,
            "viewMethod": "Original photo pixels viewed in proportional 1600px preview, rotated 90 degrees clockwise; no OCR substituted."
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-G060",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "explanationZh"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-G060",
        "kind": "grammar",
        "sourcePage": 116,
        "pattern": "a colony of ants / bees",
        "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-G060",
        "kind": "grammar",
        "sourcePage": 116,
        "pattern": "a colony of ants / bees",
        "explanationZh": "a colony of ants / bees 指一群螞蟻／蜜蜂。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "9a5e9ccac19b91af747bedf437f726a25ba582aaf128f5e1ccdf50ac8ebff0bd",
      "expectedAfterRowSha256": "a9f83d6c7a3f904a230093da78e62b1e78d8421c51bbcc6f054ae8a67acb23bd",
      "fields": {
        "explanationZh": "a colony of ants / bees 指一群螞蟻／蜜蜂。"
      },
      "sources": {
        "explanationZh": [
          {
            "type": "textbook_photo",
            "manifest": "scripts/sources/LV3Unit11.json",
            "file": "20260815_101205.jpg",
            "sha256": "bac53daf334a9614ba784360e2f7f64837bd177ea4c5283bdb6d8f7df403dd03",
            "page": 116,
            "printedLevel": "Level 3",
            "printedUnit": "Unit 11",
            "printedText": "a colony of ants / bees 一群螞蟻／蜜蜂",
            "pixelsViewed": true,
            "viewMethod": "Original photo pixels viewed in proportional 1600px preview, rotated 90 degrees clockwise; no OCR substituted."
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-G061",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "explanationZh"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-G061",
        "kind": "grammar",
        "sourcePage": 116,
        "pattern": "go stale",
        "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-G061",
        "kind": "grammar",
        "sourcePage": 116,
        "pattern": "go stale",
        "explanationZh": "go stale 在本頁比喻變得索然無味、失去興趣。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "5737d97288df33c1251252f789bb0ac05c498e8ede98ad2ea76770ef42ad6bdb",
      "expectedAfterRowSha256": "03af6f2395ce55f16cbef22571e94ddaa28672eb89ec952d056a8520f32d279c",
      "fields": {
        "explanationZh": "go stale 在本頁比喻變得索然無味、失去興趣。"
      },
      "sources": {
        "explanationZh": [
          {
            "type": "textbook_photo",
            "manifest": "scripts/sources/LV3Unit11.json",
            "file": "20260815_101205.jpg",
            "sha256": "bac53daf334a9614ba784360e2f7f64837bd177ea4c5283bdb6d8f7df403dd03",
            "page": 116,
            "printedLevel": "Level 3",
            "printedUnit": "Unit 11",
            "printedText": "go stale 變得索然無味／沒有興趣",
            "pixelsViewed": true,
            "viewMethod": "Original photo pixels viewed in proportional 1600px preview, rotated 90 degrees clockwise; no OCR substituted."
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-G062",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "explanationZh"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-G062",
        "kind": "grammar",
        "sourcePage": 116,
        "pattern": "stale bread",
        "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-G062",
        "kind": "grammar",
        "sourcePage": 116,
        "pattern": "stale bread",
        "explanationZh": "stale bread 指不新鮮的麵包。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "560d6b1ddfcc7128544dd68e645f57976db22d6288d19b31cb25d30ec88dda54",
      "expectedAfterRowSha256": "9f2f05240a6aeab94485b5426a27ca276870f89f91791ace9fe5b025ec923601",
      "fields": {
        "explanationZh": "stale bread 指不新鮮的麵包。"
      },
      "sources": {
        "explanationZh": [
          {
            "type": "textbook_photo",
            "manifest": "scripts/sources/LV3Unit11.json",
            "file": "20260815_101205.jpg",
            "sha256": "bac53daf334a9614ba784360e2f7f64837bd177ea4c5283bdb6d8f7df403dd03",
            "page": 116,
            "printedLevel": "Level 3",
            "printedUnit": "Unit 11",
            "printedText": "stale bread 不新鮮的麵包",
            "pixelsViewed": true,
            "viewMethod": "Original photo pixels viewed in proportional 1600px preview, rotated 90 degrees clockwise; no OCR substituted."
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-G063",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "explanationZh"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-G063",
        "kind": "grammar",
        "sourcePage": 116,
        "pattern": "a stale joke",
        "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-G063",
        "kind": "grammar",
        "sourcePage": 116,
        "pattern": "a stale joke",
        "explanationZh": "a stale joke 指老掉牙、沒有新意的笑話。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "00f846b2a59578e0ed1fe41c41a0c93e72b5e08bd59af047bca1fda3f4efecb5",
      "expectedAfterRowSha256": "c634b2cf1f21bee960a341efffc3109af5471ba92342e816e427e5315a85b026",
      "fields": {
        "explanationZh": "a stale joke 指老掉牙、沒有新意的笑話。"
      },
      "sources": {
        "explanationZh": [
          {
            "type": "textbook_photo",
            "manifest": "scripts/sources/LV3Unit11.json",
            "file": "20260815_101205.jpg",
            "sha256": "bac53daf334a9614ba784360e2f7f64837bd177ea4c5283bdb6d8f7df403dd03",
            "page": 116,
            "printedLevel": "Level 3",
            "printedUnit": "Unit 11",
            "printedText": "a stale joke 老掉牙的笑話",
            "pixelsViewed": true,
            "viewMethod": "Original photo pixels viewed in proportional 1600px preview, rotated 90 degrees clockwise; no OCR substituted."
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-G064",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "explanationZh"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-G064",
        "kind": "grammar",
        "sourcePage": 117,
        "pattern": "alphabet 指某語言的整組字母，letter 指整組字母中的每個字母",
        "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-G064",
        "kind": "grammar",
        "sourcePage": 117,
        "pattern": "alphabet 指某語言的整組字母，letter 指整組字母中的每個字母",
        "explanationZh": "alphabet 指某語言的整組字母，letter 指其中一個字母；英文有 26 個 letters，而不是 26 個 alphabets。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "c60b1eca5472a2f42eb26adb441afa7aafc68783a2b5ba8814973a205bbca1e2",
      "expectedAfterRowSha256": "18b5d674ba6a8180d8adc8088cb161a87359aa4abc12fafe2ab015542adfe6fb",
      "fields": {
        "explanationZh": "alphabet 指某語言的整組字母，letter 指其中一個字母；英文有 26 個 letters，而不是 26 個 alphabets。"
      },
      "sources": {
        "explanationZh": [
          {
            "type": "textbook_photo",
            "manifest": "scripts/sources/LV3Unit11.json",
            "file": "20260815_101211.jpg",
            "sha256": "c993a3403ccbfcc7cf9c0de2a1bcfc74de8410f407c1ac204a03537f9616f77b",
            "page": 117,
            "printedLevel": "Level 3",
            "printedUnit": "Unit 11",
            "printedText": "alphabet 指某語言的整組字母，而 letter 則指整組字母中的每個字母。；There are 26 letters in the English alphabet.",
            "pixelsViewed": true,
            "viewMethod": "Original photo pixels viewed in proportional 1600px preview, rotated 90 degrees clockwise; no OCR substituted."
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-G065",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "explanationZh"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-G065",
        "kind": "grammar",
        "sourcePage": 117,
        "pattern": "crabbed handwriting",
        "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-G065",
        "kind": "grammar",
        "sourcePage": 117,
        "pattern": "crabbed handwriting",
        "explanationZh": "crabbed handwriting 指潦草難讀的字跡。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "94a7688ffa59910298c7cf28261ac3ff3f6455288935060f814e1bebe0ca183a",
      "expectedAfterRowSha256": "1f190e17739db3c3c4080faf36fbf27879454e0c66aceadc3ccde2411b4c21bb",
      "fields": {
        "explanationZh": "crabbed handwriting 指潦草難讀的字跡。"
      },
      "sources": {
        "explanationZh": [
          {
            "type": "textbook_photo",
            "manifest": "scripts/sources/LV3Unit11.json",
            "file": "20260815_101211.jpg",
            "sha256": "c993a3403ccbfcc7cf9c0de2a1bcfc74de8410f407c1ac204a03537f9616f77b",
            "page": 117,
            "printedLevel": "Level 3",
            "printedUnit": "Unit 11",
            "printedText": "crabbed a.（字跡）潦草難讀的；crabbed handwriting 字跡潦草",
            "pixelsViewed": true,
            "viewMethod": "Original photo pixels viewed in proportional 1600px preview, rotated 90 degrees clockwise; no OCR substituted."
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-G066",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "explanationZh"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-G066",
        "kind": "grammar",
        "sourcePage": 117,
        "pattern": "global warming",
        "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-G066",
        "kind": "grammar",
        "sourcePage": 117,
        "pattern": "global warming",
        "explanationZh": "global warming 指全球暖化。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "ee2f65e0e5974d2d99c189cebe72f95fe591bb3d1b5aff42763d0c4ad28663f5",
      "expectedAfterRowSha256": "79ced67008c6f9b07109405640745942b0bc510dcc84739623958f52fac782ac",
      "fields": {
        "explanationZh": "global warming 指全球暖化。"
      },
      "sources": {
        "explanationZh": [
          {
            "type": "textbook_photo",
            "manifest": "scripts/sources/LV3Unit11.json",
            "file": "20260815_101211.jpg",
            "sha256": "c993a3403ccbfcc7cf9c0de2a1bcfc74de8410f407c1ac204a03537f9616f77b",
            "page": 117,
            "printedLevel": "Level 3",
            "printedUnit": "Unit 11",
            "printedText": "global warming 全球暖化",
            "pixelsViewed": true,
            "viewMethod": "Original photo pixels viewed in proportional 1600px preview, rotated 90 degrees clockwise; no OCR substituted."
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-G067",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "explanationZh"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-G067",
        "kind": "grammar",
        "sourcePage": 117,
        "pattern": "play dumb",
        "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-G067",
        "kind": "grammar",
        "sourcePage": 117,
        "pattern": "play dumb",
        "explanationZh": "play dumb 表示裝傻。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "a99a96ca2c5b2a4c9f27e4f3b049eea6f3407ff0507dfbdd64872d2d1f195675",
      "expectedAfterRowSha256": "c3f3f78019c03d05e320053218853f1f25fd6cee15b3479f7a34628967f35c6f",
      "fields": {
        "explanationZh": "play dumb 表示裝傻。"
      },
      "sources": {
        "explanationZh": [
          {
            "type": "textbook_photo",
            "manifest": "scripts/sources/LV3Unit11.json",
            "file": "20260815_101211.jpg",
            "sha256": "c993a3403ccbfcc7cf9c0de2a1bcfc74de8410f407c1ac204a03537f9616f77b",
            "page": 117,
            "printedLevel": "Level 3",
            "printedUnit": "Unit 11",
            "printedText": "play dumb 裝傻",
            "pixelsViewed": true,
            "viewMethod": "Original photo pixels viewed in proportional 1600px preview, rotated 90 degrees clockwise; no OCR substituted."
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-G068",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "explanationZh"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-G068",
        "kind": "grammar",
        "sourcePage": 118,
        "pattern": "deaf and dumb",
        "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-G068",
        "kind": "grammar",
        "sourcePage": 118,
        "pattern": "deaf and dumb",
        "explanationZh": "原書保留 deaf and dumb 這個歷史用語，指失聰且不能說話；其中 dumb 指不能說話的用法現屬舊式且可能冒犯，不宜當作稱呼他人的中性用語。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "381b07d171ba4ea33f46d67a59b2b528d16948e16c535756188fbecf84e4523c",
      "expectedAfterRowSha256": "5c19c94dc07a31082ddf309c71cbe7ac25c85f3f94324077e92e2fe2c5a91afc",
      "fields": {
        "explanationZh": "原書保留 deaf and dumb 這個歷史用語，指失聰且不能說話；其中 dumb 指不能說話的用法現屬舊式且可能冒犯，不宜當作稱呼他人的中性用語。"
      },
      "sources": {
        "explanationZh": [
          {
            "type": "textbook_photo",
            "manifest": "scripts/sources/LV3Unit11.json",
            "file": "20260815_101223.jpg",
            "sha256": "daced8e490b64cdb43c6ff4b71a144ba3b80a0ee6e2d37531cbf5e6d08eecd29",
            "page": 118,
            "printedLevel": "Level 3",
            "printedUnit": "Unit 11",
            "printedText": "deaf and dumb 又聾又啞",
            "pixelsViewed": true,
            "viewMethod": "Original photo pixels viewed in proportional 1600px preview, rotated 90 degrees clockwise; no OCR substituted."
          },
          {
            "url": "https://dictionary.cambridge.org/dictionary/english/dumb",
            "title": "Cambridge Dictionary: dumb, SILENT",
            "quote": "old-fashioned offensive; unable to speak",
            "checked": "2026-11-08",
            "supports": "不能說話義的語用標記"
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-G069",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "explanationZh"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-G069",
        "kind": "grammar",
        "sourcePage": 118,
        "pattern": "pump...up / pump up...",
        "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-G069",
        "kind": "grammar",
        "sourcePage": 118,
        "pattern": "pump...up / pump up...",
        "explanationZh": "pump...up / pump up... 在此表示把……充氣。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "5466581f4debf9e4e82b00e77a0f7929263f19b603d9aa0c3020d8f66f69a629",
      "expectedAfterRowSha256": "7a2d43b59655c743b4260d2a2fd05b4c6340334b5484cc330a28e3565a0993b2",
      "fields": {
        "explanationZh": "pump...up / pump up... 在此表示把……充氣。"
      },
      "sources": {
        "explanationZh": [
          {
            "type": "textbook_photo",
            "manifest": "scripts/sources/LV3Unit11.json",
            "file": "20260815_101223.jpg",
            "sha256": "daced8e490b64cdb43c6ff4b71a144ba3b80a0ee6e2d37531cbf5e6d08eecd29",
            "page": 118,
            "printedLevel": "Level 3",
            "printedUnit": "Unit 11",
            "printedText": "pump... up / pump up... 將……充氣",
            "pixelsViewed": true,
            "viewMethod": "Original photo pixels viewed in proportional 1600px preview, rotated 90 degrees clockwise; no OCR substituted."
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-G070",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "explanationZh"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-G070",
        "kind": "grammar",
        "sourcePage": 118,
        "pattern": "pump sth into...",
        "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-G070",
        "kind": "grammar",
        "sourcePage": 118,
        "pattern": "pump sth into...",
        "explanationZh": "pump sth into... 表示把某物注入……；原書也以此描述把資金投入醫療服務。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "8c4a083614902993b189701727b5e3a7b7bc115a781d1d1efa2b6b43a0dd6cd9",
      "expectedAfterRowSha256": "a7d56f00c88b36ccdc710345211ba70c508183790e02c1be473f5d40edbd367c",
      "fields": {
        "explanationZh": "pump sth into... 表示把某物注入……；原書也以此描述把資金投入醫療服務。"
      },
      "sources": {
        "explanationZh": [
          {
            "type": "textbook_photo",
            "manifest": "scripts/sources/LV3Unit11.json",
            "file": "20260815_101223.jpg",
            "sha256": "daced8e490b64cdb43c6ff4b71a144ba3b80a0ee6e2d37531cbf5e6d08eecd29",
            "page": 118,
            "printedLevel": "Level 3",
            "printedUnit": "Unit 11",
            "printedText": "pump sth into... 將某物灌入……；The government has pumped millions of dollars into the health service.",
            "pixelsViewed": true,
            "viewMethod": "Original photo pixels viewed in proportional 1600px preview, rotated 90 degrees clockwise; no OCR substituted."
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-G071",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "explanationZh"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-G071",
        "kind": "grammar",
        "sourcePage": 118,
        "pattern": "subtract A from B",
        "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-G071",
        "kind": "grammar",
        "sourcePage": 118,
        "pattern": "subtract A from B",
        "explanationZh": "subtract A from B 表示 B 減 A，不是 A 減 B。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "67f12e5c8b75c304ea6c5441a4027454b34496d8cac3f00ab5e662501a20b08e",
      "expectedAfterRowSha256": "04f0b5449c958465352fc227e57bb00ba91c6440ebdd75353fa4d2fde4fd0e28",
      "fields": {
        "explanationZh": "subtract A from B 表示 B 減 A，不是 A 減 B。"
      },
      "sources": {
        "explanationZh": [
          {
            "type": "textbook_photo",
            "manifest": "scripts/sources/LV3Unit11.json",
            "file": "20260815_101223.jpg",
            "sha256": "daced8e490b64cdb43c6ff4b71a144ba3b80a0ee6e2d37531cbf5e6d08eecd29",
            "page": 118,
            "printedLevel": "Level 3",
            "printedUnit": "Unit 11",
            "printedText": "subtract A from B B 減 A",
            "pixelsViewed": true,
            "viewMethod": "Original photo pixels viewed in proportional 1600px preview, rotated 90 degrees clockwise; no OCR substituted."
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-G072",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "explanationZh"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-G072",
        "kind": "grammar",
        "sourcePage": 118,
        "pattern": "the minus sign",
        "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-G072",
        "kind": "grammar",
        "sourcePage": 118,
        "pattern": "the minus sign",
        "explanationZh": "the minus sign 指減號、負號。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "11dddf3c80eba5923d35b3d27e37a50e5ac7ddde9d4c8d0d5b7ad532b91f9d8d",
      "expectedAfterRowSha256": "38ade3682136a05af4df7c7c9cf789264c0590fa70c81ddeb527edf430287541",
      "fields": {
        "explanationZh": "the minus sign 指減號、負號。"
      },
      "sources": {
        "explanationZh": [
          {
            "type": "textbook_photo",
            "manifest": "scripts/sources/LV3Unit11.json",
            "file": "20260815_101223.jpg",
            "sha256": "daced8e490b64cdb43c6ff4b71a144ba3b80a0ee6e2d37531cbf5e6d08eecd29",
            "page": 118,
            "printedLevel": "Level 3",
            "printedUnit": "Unit 11",
            "printedText": "the minus sign 減號，負號",
            "pixelsViewed": true,
            "viewMethod": "Original photo pixels viewed in proportional 1600px preview, rotated 90 degrees clockwise; no OCR substituted."
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-G073",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "explanationZh"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-G073",
        "kind": "grammar",
        "sourcePage": 118,
        "pattern": "multiply, multiplied, multiplied",
        "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-G073",
        "kind": "grammar",
        "sourcePage": 118,
        "pattern": "multiply, multiplied, multiplied",
        "explanationZh": "原書所列 multiply 的動詞三態為 multiply（原形）、multiplied（過去式）、multiplied（過去分詞）。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "107027388ea1f279b1b2557e806863cf9190a9b054b808469379e89a441c61f6",
      "expectedAfterRowSha256": "3ba603e30ca614a59bc17ede4621dedcdb78356da82b2a5ccab7151392060620",
      "fields": {
        "explanationZh": "原書所列 multiply 的動詞三態為 multiply（原形）、multiplied（過去式）、multiplied（過去分詞）。"
      },
      "sources": {
        "explanationZh": [
          {
            "type": "textbook_photo",
            "manifest": "scripts/sources/LV3Unit11.json",
            "file": "20260815_101223.jpg",
            "sha256": "daced8e490b64cdb43c6ff4b71a144ba3b80a0ee6e2d37531cbf5e6d08eecd29",
            "page": 118,
            "printedLevel": "Level 3",
            "printedUnit": "Unit 11",
            "printedText": "multiply, multiplied, multiplied",
            "pixelsViewed": true,
            "viewMethod": "Original photo pixels viewed in proportional 1600px preview, rotated 90 degrees clockwise; no OCR substituted."
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-G074",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "explanationZh"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-G074",
        "kind": "grammar",
        "sourcePage": 118,
        "pattern": "multiply A by B",
        "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-G074",
        "kind": "grammar",
        "sourcePage": 118,
        "pattern": "multiply A by B",
        "explanationZh": "multiply A by B 表示 A 乘 B。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "b57f51dc9a16b06ae603fc44c9d1e36ebbdb20e3e01ce81ec956e2c566c1e564",
      "expectedAfterRowSha256": "88a5febfe5f87e31acd530797eb4cef177aaeeb059c9c8eb0406a2f52288b718",
      "fields": {
        "explanationZh": "multiply A by B 表示 A 乘 B。"
      },
      "sources": {
        "explanationZh": [
          {
            "type": "textbook_photo",
            "manifest": "scripts/sources/LV3Unit11.json",
            "file": "20260815_101223.jpg",
            "sha256": "daced8e490b64cdb43c6ff4b71a144ba3b80a0ee6e2d37531cbf5e6d08eecd29",
            "page": 118,
            "printedLevel": "Level 3",
            "printedUnit": "Unit 11",
            "printedText": "multiply A by B A 乘 B",
            "pixelsViewed": true,
            "viewMethod": "Original photo pixels viewed in proportional 1600px preview, rotated 90 degrees clockwise; no OCR substituted."
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "curriculum",
      "id": "LI-LV3U11-G075",
      "path": "src/features/direct/curriculumLV3Unit11.json",
      "key": "learningItemId",
      "changedFields": [
        "explanationZh"
      ],
      "beforeRow": {
        "learningItemId": "LI-LV3U11-G075",
        "kind": "grammar",
        "sourcePage": 118,
        "pattern": "multiply A and B",
        "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "expectedAfterRow": {
        "learningItemId": "LI-LV3U11-G075",
        "kind": "grammar",
        "sourcePage": 118,
        "pattern": "multiply A and B",
        "explanationZh": "multiply A and B 在此表示將 A 與 B 相乘，原書與 multiply A by B 並列。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
      },
      "beforeRowSha256": "ff4fa1fc859f2c16efbf791537b5208b84541f5fd8e4f8b8963a594f91781c43",
      "expectedAfterRowSha256": "2986ceeefae91fae202084376959aa191b5104b48d14eba8e257a59c024a98b7",
      "fields": {
        "explanationZh": "multiply A and B 在此表示將 A 與 B 相乘，原書與 multiply A by B 並列。"
      },
      "sources": {
        "explanationZh": [
          {
            "type": "textbook_photo",
            "manifest": "scripts/sources/LV3Unit11.json",
            "file": "20260815_101223.jpg",
            "sha256": "daced8e490b64cdb43c6ff4b71a144ba3b80a0ee6e2d37531cbf5e6d08eecd29",
            "page": 118,
            "printedLevel": "Level 3",
            "printedUnit": "Unit 11",
            "printedText": "multiply A by B A 乘 B = multiply A and B",
            "pixelsViewed": true,
            "viewMethod": "Original photo pixels viewed in proportional 1600px preview, rotated 90 degrees clockwise; no OCR substituted."
          }
        ]
      },
      "starterIncluded": false
    },
    {
      "dataset": "words",
      "id": "W002011",
      "path": "public/data/v1/words.json",
      "key": "wordId",
      "changedFields": [
        "verbForms"
      ],
      "beforeRow": {
        "wordId": "W002011",
        "word": "admire",
        "wordVariants": [
          "admire"
        ],
        "level": "LV3",
        "pos": "v.",
        "posAll": [
          "v."
        ],
        "meaningZh": "讚美；欽佩；愛慕；稱讚",
        "meaningEn": "to regard someone or something with respect, approval, or pleasure.",
        "usagePattern": "admire + N; admire sb for N/V-ing",
        "syllables": null,
        "stressPattern": null,
        "phoneticUs": null,
        "familyKey": "admire",
        "isCore": true,
        "sourceNote": "高中英文參考詞彙表（111學年度起適用，大考中心）",
        "status": "reviewed",
        "usagePatternZh": "欣賞……；因某事而欽佩某人"
      },
      "expectedAfterRow": {
        "wordId": "W002011",
        "word": "admire",
        "wordVariants": [
          "admire"
        ],
        "level": "LV3",
        "pos": "v.",
        "posAll": [
          "v."
        ],
        "meaningZh": "讚美；欽佩；愛慕；稱讚",
        "meaningEn": "to regard someone or something with respect, approval, or pleasure.",
        "usagePattern": "admire + N; admire sb for N/V-ing",
        "syllables": null,
        "stressPattern": null,
        "phoneticUs": null,
        "familyKey": "admire",
        "isCore": true,
        "sourceNote": "高中英文參考詞彙表（111學年度起適用，大考中心）",
        "status": "reviewed",
        "usagePatternZh": "欣賞……；因某事而欽佩某人",
        "verbForms": {
          "base": "admire",
          "past": "admired",
          "pastParticiple": "admired",
          "sourceRef": "https://www.collinsdictionary.com/dictionary/english/admire",
          "status": "approved"
        }
      },
      "beforeRowSha256": "1bab91c12abebfaf4dd63ca97a455108431fbfe06d3808ca8c170f2faf317ff1",
      "expectedAfterRowSha256": "dd8c92b3d9e6dc0a3505f9414e617dcf05a61bb1cf260f97472e745dc96ecd16",
      "fields": {
        "verbForms": {
          "base": "admire",
          "past": "admired",
          "pastParticiple": "admired",
          "sourceRef": "https://www.collinsdictionary.com/dictionary/english/admire",
          "status": "approved"
        }
      },
      "sources": {
        "verbForms": [
          {
            "word": "admire",
            "url": "https://www.collinsdictionary.com/dictionary/english/admire",
            "excerpt": "past tense, past participle admired",
            "location": "L222"
          }
        ]
      },
      "starterIncluded": true
    },
    {
      "dataset": "words",
      "id": "W002236",
      "path": "public/data/v1/words.json",
      "key": "wordId",
      "changedFields": [
        "verbForms"
      ],
      "beforeRow": {
        "wordId": "W002236",
        "word": "desire",
        "wordVariants": [
          "desire"
        ],
        "level": "LV3",
        "pos": "n./v.",
        "posAll": [
          "n.",
          "v."
        ],
        "meaningZh": "慾望；要求；想要；請求",
        "meaningEn": "a strong feeling of wanting to have or do something; to want something very much",
        "usagePattern": "a desire to V; a desire for N; desire to V",
        "syllables": null,
        "stressPattern": null,
        "phoneticUs": null,
        "familyKey": "desire",
        "isCore": true,
        "sourceNote": "高中英文參考詞彙表（111學年度起適用，大考中心）",
        "status": "reviewed",
        "usagePatternZh": "渴望做某事；對……的渴望；渴望做某事"
      },
      "expectedAfterRow": {
        "wordId": "W002236",
        "word": "desire",
        "wordVariants": [
          "desire"
        ],
        "level": "LV3",
        "pos": "n./v.",
        "posAll": [
          "n.",
          "v."
        ],
        "meaningZh": "慾望；要求；想要；請求",
        "meaningEn": "a strong feeling of wanting to have or do something; to want something very much",
        "usagePattern": "a desire to V; a desire for N; desire to V",
        "syllables": null,
        "stressPattern": null,
        "phoneticUs": null,
        "familyKey": "desire",
        "isCore": true,
        "sourceNote": "高中英文參考詞彙表（111學年度起適用，大考中心）",
        "status": "reviewed",
        "usagePatternZh": "渴望做某事；對……的渴望；渴望做某事",
        "verbForms": {
          "base": "desire",
          "past": "desired",
          "pastParticiple": "desired",
          "sourceRef": "https://www.collinsdictionary.com/dictionary/english/desire",
          "status": "approved"
        }
      },
      "beforeRowSha256": "1bd36f3dbd056e7c20deeb716c480c22ed921e41631cd817801aa411e8851c7b",
      "expectedAfterRowSha256": "741b7e3136726762b2f7678d6a5d75b26e82f0a260807f7ba5c546a1de51d0f5",
      "fields": {
        "verbForms": {
          "base": "desire",
          "past": "desired",
          "pastParticiple": "desired",
          "sourceRef": "https://www.collinsdictionary.com/dictionary/english/desire",
          "status": "approved"
        }
      },
      "sources": {
        "verbForms": [
          {
            "word": "desire",
            "url": "https://www.collinsdictionary.com/dictionary/english/desire",
            "excerpt": "past tense, past participle desired",
            "location": "L222"
          }
        ]
      },
      "starterIncluded": true
    },
    {
      "dataset": "words",
      "id": "W002534",
      "path": "public/data/v1/words.json",
      "key": "wordId",
      "changedFields": [
        "verbForms",
        "usagePatternZh"
      ],
      "beforeRow": {
        "wordId": "W002534",
        "word": "melt",
        "wordVariants": [
          "melt"
        ],
        "level": "LV3",
        "pos": "v.",
        "posAll": [
          "v."
        ],
        "meaningZh": "熔化；熔化物；溶解；(使)熔化",
        "meaningEn": "to change from a solid into a liquid because of heat; to gradually soften or disappear, especially feelings",
        "usagePattern": "melt in/into N; ice/snow melts; melt away",
        "syllables": null,
        "stressPattern": null,
        "phoneticUs": null,
        "familyKey": "melt",
        "isCore": true,
        "sourceNote": "高中英文參考詞彙表（111學年度起適用，大考中心）",
        "status": "reviewed",
        "usagePatternZh": "在……中熔化；冰雪融化；消散"
      },
      "expectedAfterRow": {
        "wordId": "W002534",
        "word": "melt",
        "wordVariants": [
          "melt"
        ],
        "level": "LV3",
        "pos": "v.",
        "posAll": [
          "v."
        ],
        "meaningZh": "熔化；熔化物；溶解；(使)熔化",
        "meaningEn": "to change from a solid into a liquid because of heat; to gradually soften or disappear, especially feelings",
        "usagePattern": "melt in/into N; ice/snow melts; melt away",
        "syllables": null,
        "stressPattern": null,
        "phoneticUs": null,
        "familyKey": "melt",
        "isCore": true,
        "sourceNote": "高中英文參考詞彙表（111學年度起適用，大考中心）",
        "status": "reviewed",
        "usagePatternZh": "在……中熔化；冰雪融化；消散。melted 是一般用法的過去分詞；molten 現多作形容詞，常指岩石、金屬或玻璃高溫熔融。Collins 美式條目將 molten 的動詞過去分詞用法標為古語，兩者不宜在所有義項任意互換。",
        "verbForms": {
          "base": "melt",
          "past": "melted",
          "pastParticiple": "melted / molten",
          "sourceRef": "https://www.collinsdictionary.com/dictionary/english/melt",
          "status": "approved"
        }
      },
      "beforeRowSha256": "bfc1fd3011d88481666708eeb531970251c6c78ca274c5cc21f3648aa90e7c83",
      "expectedAfterRowSha256": "bc59dbbbced6d0b48e3eb0593494b3db7231fcaab008dc3fa88cba1ced30663a",
      "fields": {
        "verbForms": {
          "base": "melt",
          "past": "melted",
          "pastParticiple": "melted / molten",
          "sourceRef": "https://www.collinsdictionary.com/dictionary/english/melt",
          "status": "approved"
        },
        "usagePatternZh": "在……中熔化；冰雪融化；消散。melted 是一般用法的過去分詞；molten 現多作形容詞，常指岩石、金屬或玻璃高溫熔融。Collins 美式條目將 molten 的動詞過去分詞用法標為古語，兩者不宜在所有義項任意互換。"
      },
      "sources": {
        "verbForms": [
          {
            "word": "melt",
            "url": "https://www.collinsdictionary.com/dictionary/english/melt",
            "excerpt": "past tense, past participle melted",
            "location": "L222",
            "additionalEvidence": {
              "excerpt": "verb Word forms: melts, melting, melted, melted or molten",
              "location": "L316"
            }
          },
          {
            "type": "dictionary",
            "url": "https://www.collinsdictionary.com/dictionary/english/molten",
            "excerpt": "adjective [usually ADJECTIVE noun]; Molten rock, metal, or glass; archaic pp. of melt",
            "locator": "COBUILD L222–224; Webster American L288–290",
            "verification": "direct_dictionary_page_read_2026-11-08",
            "claim": "現代常見形容詞義為高溫熔融；美式動詞分詞條目標古語，不能在所有melt義任意互換。"
          },
          {
            "type": "dictionary",
            "url": "https://www.merriam-webster.com/dictionary/molten",
            "excerpt": "adjective; fused or liquefied by heat",
            "locator": "L32–40",
            "verification": "direct_dictionary_page_read_2026-11-08"
          }
        ],
        "usagePatternZh": [
          {
            "word": "melt",
            "url": "https://www.collinsdictionary.com/dictionary/english/melt",
            "excerpt": "past tense, past participle melted",
            "location": "L222",
            "additionalEvidence": {
              "excerpt": "verb Word forms: melts, melting, melted, melted or molten",
              "location": "L316"
            }
          },
          {
            "type": "dictionary",
            "url": "https://www.collinsdictionary.com/dictionary/english/molten",
            "excerpt": "adjective [usually ADJECTIVE noun]; Molten rock, metal, or glass; archaic pp. of melt",
            "locator": "COBUILD L222–224; Webster American L288–290",
            "verification": "direct_dictionary_page_read_2026-11-08",
            "claim": "現代常見形容詞義為高溫熔融；美式動詞分詞條目標古語，不能在所有melt義任意互換。"
          },
          {
            "type": "dictionary",
            "url": "https://www.merriam-webster.com/dictionary/molten",
            "excerpt": "adjective; fused or liquefied by heat",
            "locator": "L32–40",
            "verification": "direct_dictionary_page_read_2026-11-08"
          }
        ]
      },
      "starterIncluded": true
    },
    {
      "dataset": "words",
      "id": "W002688",
      "path": "public/data/v1/words.json",
      "key": "wordId",
      "changedFields": [
        "verbForms"
      ],
      "beforeRow": {
        "wordId": "W002688",
        "word": "pump",
        "wordVariants": [
          "pump"
        ],
        "level": "LV3",
        "pos": "n./v.",
        "posAll": [
          "n.",
          "v."
        ],
        "meaningZh": "抽水機；打氣筒；泵；抽吸",
        "meaningEn": "(n.) a machine that forces liquid or gas into or out of something (v.) to move liquid or gas using such a machine",
        "usagePattern": "a water/air pump; pump water/air; pump up a tire",
        "syllables": null,
        "stressPattern": null,
        "phoneticUs": null,
        "familyKey": "pump",
        "isCore": true,
        "sourceNote": "高中英文參考詞彙表（111學年度起適用，大考中心）",
        "status": "reviewed",
        "usagePatternZh": "水／氣泵；抽水／打氣；為輪胎打氣"
      },
      "expectedAfterRow": {
        "wordId": "W002688",
        "word": "pump",
        "wordVariants": [
          "pump"
        ],
        "level": "LV3",
        "pos": "n./v.",
        "posAll": [
          "n.",
          "v."
        ],
        "meaningZh": "抽水機；打氣筒；泵；抽吸",
        "meaningEn": "(n.) a machine that forces liquid or gas into or out of something (v.) to move liquid or gas using such a machine",
        "usagePattern": "a water/air pump; pump water/air; pump up a tire",
        "syllables": null,
        "stressPattern": null,
        "phoneticUs": null,
        "familyKey": "pump",
        "isCore": true,
        "sourceNote": "高中英文參考詞彙表（111學年度起適用，大考中心）",
        "status": "reviewed",
        "usagePatternZh": "水／氣泵；抽水／打氣；為輪胎打氣",
        "verbForms": {
          "base": "pump",
          "past": "pumped",
          "pastParticiple": "pumped",
          "sourceRef": "https://www.collinsdictionary.com/dictionary/english/pump",
          "status": "approved"
        }
      },
      "beforeRowSha256": "2cce9110ac6523c78041acddfe2082f5694ed976651c9b16d564fb250da4db12",
      "expectedAfterRowSha256": "821b8116db519fcfbf1b6149cdae127f9ed318a152bea2411bef7171ac6a4763",
      "fields": {
        "verbForms": {
          "base": "pump",
          "past": "pumped",
          "pastParticiple": "pumped",
          "sourceRef": "https://www.collinsdictionary.com/dictionary/english/pump",
          "status": "approved"
        }
      },
      "sources": {
        "verbForms": [
          {
            "word": "pump",
            "url": "https://www.collinsdictionary.com/dictionary/english/pump",
            "excerpt": "past tense, past participle pumped",
            "location": "L222"
          }
        ]
      },
      "starterIncluded": true
    },
    {
      "dataset": "words",
      "id": "W002729",
      "path": "public/data/v1/words.json",
      "key": "wordId",
      "changedFields": [
        "verbForms"
      ],
      "beforeRow": {
        "wordId": "W002729",
        "word": "resist",
        "wordVariants": [
          "resist"
        ],
        "level": "LV3",
        "pos": "v.",
        "posAll": [
          "v."
        ],
        "meaningZh": "抵抗；耐得住；抵制；反抗",
        "meaningEn": "to fight against something or someone that is attacking you, or to stop yourself from doing something you want to do",
        "usagePattern": "resist N; resist -ing; can't resist N/V-ing",
        "syllables": null,
        "stressPattern": null,
        "phoneticUs": null,
        "familyKey": "resist",
        "isCore": true,
        "sourceNote": "高中英文參考詞彙表（111學年度起適用，大考中心）",
        "status": "reviewed",
        "usagePatternZh": "抵抗……；抗拒做……；無法抗拒……"
      },
      "expectedAfterRow": {
        "wordId": "W002729",
        "word": "resist",
        "wordVariants": [
          "resist"
        ],
        "level": "LV3",
        "pos": "v.",
        "posAll": [
          "v."
        ],
        "meaningZh": "抵抗；耐得住；抵制；反抗",
        "meaningEn": "to fight against something or someone that is attacking you, or to stop yourself from doing something you want to do",
        "usagePattern": "resist N; resist -ing; can't resist N/V-ing",
        "syllables": null,
        "stressPattern": null,
        "phoneticUs": null,
        "familyKey": "resist",
        "isCore": true,
        "sourceNote": "高中英文參考詞彙表（111學年度起適用，大考中心）",
        "status": "reviewed",
        "usagePatternZh": "抵抗……；抗拒做……；無法抗拒……",
        "verbForms": {
          "base": "resist",
          "past": "resisted",
          "pastParticiple": "resisted",
          "sourceRef": "https://www.collinsdictionary.com/dictionary/english/resist",
          "status": "approved"
        }
      },
      "beforeRowSha256": "e6d9dfc51c861d8c51a569a629bc5e8c9ea790ea2d0f6389e2f2f081b5f054c4",
      "expectedAfterRowSha256": "e4caf441c2ac2620ad0b3a48ee44b5c8ba72070fecbf901f249507ca13b4ae84",
      "fields": {
        "verbForms": {
          "base": "resist",
          "past": "resisted",
          "pastParticiple": "resisted",
          "sourceRef": "https://www.collinsdictionary.com/dictionary/english/resist",
          "status": "approved"
        }
      },
      "sources": {
        "verbForms": [
          {
            "word": "resist",
            "url": "https://www.collinsdictionary.com/dictionary/english/resist",
            "excerpt": "past tense, past participle resisted",
            "location": "L222"
          }
        ]
      },
      "starterIncluded": true
    },
    {
      "dataset": "words",
      "id": "W002830",
      "path": "public/data/v1/words.json",
      "key": "wordId",
      "changedFields": [
        "verbForms"
      ],
      "beforeRow": {
        "wordId": "W002830",
        "word": "splash",
        "wordVariants": [
          "splash"
        ],
        "level": "LV3",
        "pos": "n./v.",
        "posAll": [
          "n.",
          "v."
        ],
        "meaningZh": "飛濺；污點；一點兒；濺潑聲",
        "meaningEn": "to cause liquid to scatter and fall in drops on something; the sound made when a liquid or object hits water",
        "usagePattern": "splash water on N; make a splash; a splash of N",
        "syllables": null,
        "stressPattern": null,
        "phoneticUs": null,
        "familyKey": "splash",
        "isCore": true,
        "sourceNote": "高中英文參考詞彙表（111學年度起適用，大考中心）",
        "status": "reviewed",
        "usagePatternZh": "將水濺在某物上；引起轟動；一點點某物"
      },
      "expectedAfterRow": {
        "wordId": "W002830",
        "word": "splash",
        "wordVariants": [
          "splash"
        ],
        "level": "LV3",
        "pos": "n./v.",
        "posAll": [
          "n.",
          "v."
        ],
        "meaningZh": "飛濺；污點；一點兒；濺潑聲",
        "meaningEn": "to cause liquid to scatter and fall in drops on something; the sound made when a liquid or object hits water",
        "usagePattern": "splash water on N; make a splash; a splash of N",
        "syllables": null,
        "stressPattern": null,
        "phoneticUs": null,
        "familyKey": "splash",
        "isCore": true,
        "sourceNote": "高中英文參考詞彙表（111學年度起適用，大考中心）",
        "status": "reviewed",
        "usagePatternZh": "將水濺在某物上；引起轟動；一點點某物",
        "verbForms": {
          "base": "splash",
          "past": "splashed",
          "pastParticiple": "splashed",
          "sourceRef": "https://www.collinsdictionary.com/dictionary/english/splash",
          "status": "approved"
        }
      },
      "beforeRowSha256": "0e0331132823bf25cb25a6f59a1aee16434e78c821da7593fd409680fa06f5b5",
      "expectedAfterRowSha256": "17193e8d15a61f1268758cd5645e75b0dde94e86cfba643cee312b16704517c2",
      "fields": {
        "verbForms": {
          "base": "splash",
          "past": "splashed",
          "pastParticiple": "splashed",
          "sourceRef": "https://www.collinsdictionary.com/dictionary/english/splash",
          "status": "approved"
        }
      },
      "sources": {
        "verbForms": [
          {
            "word": "splash",
            "url": "https://www.collinsdictionary.com/dictionary/english/splash",
            "excerpt": "past tense, past participle splashed",
            "location": "L222"
          }
        ]
      },
      "starterIncluded": true
    },
    {
      "dataset": "words",
      "id": "W002920",
      "path": "public/data/v1/words.json",
      "key": "wordId",
      "changedFields": [
        "verbForms"
      ],
      "beforeRow": {
        "wordId": "W002920",
        "word": "toss",
        "wordVariants": [
          "toss"
        ],
        "level": "LV3",
        "pos": "v./n.",
        "posAll": [
          "v.",
          "n."
        ],
        "meaningZh": "投擲；拋；搖擺；震盪",
        "meaningEn": "(v.) to throw something lightly or carelessly; to move up and down or side to side repeatedly; (n.) an act of throwing a coin to decide something by chance",
        "usagePattern": "toss N (to sb); toss and turn; toss a coin",
        "syllables": null,
        "stressPattern": null,
        "phoneticUs": null,
        "familyKey": "toss",
        "isCore": true,
        "sourceNote": "高中英文參考詞彙表（111學年度起適用，大考中心）",
        "status": "reviewed",
        "usagePatternZh": "投擲某物（給某人）；輾轉難眠；擲硬幣"
      },
      "expectedAfterRow": {
        "wordId": "W002920",
        "word": "toss",
        "wordVariants": [
          "toss"
        ],
        "level": "LV3",
        "pos": "v./n.",
        "posAll": [
          "v.",
          "n."
        ],
        "meaningZh": "投擲；拋；搖擺；震盪",
        "meaningEn": "(v.) to throw something lightly or carelessly; to move up and down or side to side repeatedly; (n.) an act of throwing a coin to decide something by chance",
        "usagePattern": "toss N (to sb); toss and turn; toss a coin",
        "syllables": null,
        "stressPattern": null,
        "phoneticUs": null,
        "familyKey": "toss",
        "isCore": true,
        "sourceNote": "高中英文參考詞彙表（111學年度起適用，大考中心）",
        "status": "reviewed",
        "usagePatternZh": "投擲某物（給某人）；輾轉難眠；擲硬幣",
        "verbForms": {
          "base": "toss",
          "past": "tossed",
          "pastParticiple": "tossed",
          "sourceRef": "https://www.collinsdictionary.com/dictionary/english/toss",
          "status": "approved"
        }
      },
      "beforeRowSha256": "cb21b6c4f861241e957a0c58a27b318d81a96ca54f05b9cfe99a050368692c0a",
      "expectedAfterRowSha256": "72bf5e61326266afc1ce0d2f21995be05b51a959a0086b6ffb33f9dd92bc7537",
      "fields": {
        "verbForms": {
          "base": "toss",
          "past": "tossed",
          "pastParticiple": "tossed",
          "sourceRef": "https://www.collinsdictionary.com/dictionary/english/toss",
          "status": "approved"
        }
      },
      "sources": {
        "verbForms": [
          {
            "word": "toss",
            "url": "https://www.collinsdictionary.com/dictionary/english/toss",
            "excerpt": "past tense, past participle tossed",
            "location": "L222"
          }
        ]
      },
      "starterIncluded": true
    },
    {
      "dataset": "words",
      "id": "W003204",
      "path": "public/data/v1/words.json",
      "key": "wordId",
      "changedFields": [
        "verbForms"
      ],
      "beforeRow": {
        "wordId": "W003204",
        "word": "consume",
        "wordVariants": [
          "consume"
        ],
        "level": "LV4",
        "pos": "v.",
        "posAll": [
          "v."
        ],
        "meaningZh": "消耗；消費；消滅；耗盡",
        "meaningEn": "to use fuel, energy, time, or a product; to eat or drink something",
        "usagePattern": "consume energy/resources; consume large amounts of N; be consumed by N (guilt/fire)",
        "syllables": null,
        "stressPattern": null,
        "phoneticUs": null,
        "familyKey": "consume",
        "isCore": true,
        "sourceNote": "高中英文參考詞彙表（111學年度起適用，大考中心）",
        "status": "reviewed",
        "usagePatternZh": "消耗能源／資源；消耗大量某物；被某情緒／火勢吞噬"
      },
      "expectedAfterRow": {
        "wordId": "W003204",
        "word": "consume",
        "wordVariants": [
          "consume"
        ],
        "level": "LV4",
        "pos": "v.",
        "posAll": [
          "v."
        ],
        "meaningZh": "消耗；消費；消滅；耗盡",
        "meaningEn": "to use fuel, energy, time, or a product; to eat or drink something",
        "usagePattern": "consume energy/resources; consume large amounts of N; be consumed by N (guilt/fire)",
        "syllables": null,
        "stressPattern": null,
        "phoneticUs": null,
        "familyKey": "consume",
        "isCore": true,
        "sourceNote": "高中英文參考詞彙表（111學年度起適用，大考中心）",
        "status": "reviewed",
        "usagePatternZh": "消耗能源／資源；消耗大量某物；被某情緒／火勢吞噬",
        "verbForms": {
          "base": "consume",
          "past": "consumed",
          "pastParticiple": "consumed",
          "sourceRef": "https://www.collinsdictionary.com/dictionary/english/consume",
          "status": "approved"
        }
      },
      "beforeRowSha256": "36361b53c646cc2aebf7eefc35e15b9cce150534b533c5e35387975635bfeb14",
      "expectedAfterRowSha256": "878163f52d4f59583cacf781a97b7e03afb7fdfcf9dff27fdf5fb9453f2746d6",
      "fields": {
        "verbForms": {
          "base": "consume",
          "past": "consumed",
          "pastParticiple": "consumed",
          "sourceRef": "https://www.collinsdictionary.com/dictionary/english/consume",
          "status": "approved"
        }
      },
      "sources": {
        "verbForms": [
          {
            "word": "consume",
            "url": "https://www.collinsdictionary.com/dictionary/english/consume",
            "excerpt": "past tense, past participle consumed",
            "location": "L222"
          }
        ]
      },
      "starterIncluded": true
    },
    {
      "dataset": "words",
      "id": "W003538",
      "path": "public/data/v1/words.json",
      "key": "wordId",
      "changedFields": [
        "verbForms"
      ],
      "beforeRow": {
        "wordId": "W003538",
        "word": "injure",
        "wordVariants": [
          "injure"
        ],
        "level": "LV4",
        "pos": "v.",
        "posAll": [
          "v."
        ],
        "meaningZh": "傷害；損害；使受冤屈；損傷",
        "meaningEn": "to cause physical harm or damage to a person or animal",
        "usagePattern": "injure one's leg/arm; be seriously/badly injured; injure sb in N",
        "syllables": null,
        "stressPattern": null,
        "phoneticUs": null,
        "familyKey": "injure",
        "isCore": true,
        "sourceNote": "高中英文參考詞彙表（111學年度起適用，大考中心）",
        "status": "reviewed",
        "usagePatternZh": "傷害某人的腿／手臂；受重傷；在……中傷害某人"
      },
      "expectedAfterRow": {
        "wordId": "W003538",
        "word": "injure",
        "wordVariants": [
          "injure"
        ],
        "level": "LV4",
        "pos": "v.",
        "posAll": [
          "v."
        ],
        "meaningZh": "傷害；損害；使受冤屈；損傷",
        "meaningEn": "to cause physical harm or damage to a person or animal",
        "usagePattern": "injure one's leg/arm; be seriously/badly injured; injure sb in N",
        "syllables": null,
        "stressPattern": null,
        "phoneticUs": null,
        "familyKey": "injure",
        "isCore": true,
        "sourceNote": "高中英文參考詞彙表（111學年度起適用，大考中心）",
        "status": "reviewed",
        "usagePatternZh": "傷害某人的腿／手臂；受重傷；在……中傷害某人",
        "verbForms": {
          "base": "injure",
          "past": "injured",
          "pastParticiple": "injured",
          "sourceRef": "https://www.collinsdictionary.com/dictionary/english/injure",
          "status": "approved"
        }
      },
      "beforeRowSha256": "aee44cc6a4dad46b9ad7d582f8f260e1292e294d6ca63d774718e79ef960cd9a",
      "expectedAfterRowSha256": "93819d37aa1928b8694d779152fc7b98d01ee918d41c3611b934917bd446de00",
      "fields": {
        "verbForms": {
          "base": "injure",
          "past": "injured",
          "pastParticiple": "injured",
          "sourceRef": "https://www.collinsdictionary.com/dictionary/english/injure",
          "status": "approved"
        }
      },
      "sources": {
        "verbForms": [
          {
            "word": "injure",
            "url": "https://www.collinsdictionary.com/dictionary/english/injure",
            "excerpt": "past tense, past participle injured",
            "location": "L222"
          }
        ]
      },
      "starterIncluded": true
    }
  ],
  "forms": [
    {
      "id": "W002011",
      "forms": {
        "base": "admire",
        "past": "admired",
        "pastParticiple": "admired",
        "sourceRef": "https://www.collinsdictionary.com/dictionary/english/admire",
        "status": "approved"
      },
      "status": "reviewed",
      "sources": [
        {
          "word": "admire",
          "url": "https://www.collinsdictionary.com/dictionary/english/admire",
          "excerpt": "past tense, past participle admired",
          "location": "L222"
        }
      ]
    },
    {
      "id": "W002236",
      "forms": {
        "base": "desire",
        "past": "desired",
        "pastParticiple": "desired",
        "sourceRef": "https://www.collinsdictionary.com/dictionary/english/desire",
        "status": "approved"
      },
      "status": "reviewed",
      "sources": [
        {
          "word": "desire",
          "url": "https://www.collinsdictionary.com/dictionary/english/desire",
          "excerpt": "past tense, past participle desired",
          "location": "L222"
        }
      ]
    },
    {
      "id": "W002255",
      "forms": {
        "base": "dock",
        "past": "docked",
        "pastParticiple": "docked",
        "sourceRef": "https://www.collinsdictionary.com/dictionary/english/dock",
        "status": "approved"
      },
      "status": "reviewed",
      "sources": [
        {
          "word": "dock",
          "url": "https://www.collinsdictionary.com/dictionary/english/dock",
          "excerpt": "past tense, past participle docked",
          "location": "L222"
        }
      ]
    },
    {
      "id": "W002310",
      "forms": {
        "base": "faint",
        "past": "fainted",
        "pastParticiple": "fainted",
        "sourceRef": "https://www.collinsdictionary.com/dictionary/english/faint",
        "status": "approved"
      },
      "status": "draft",
      "sources": [
        {
          "word": "faint",
          "url": "https://www.collinsdictionary.com/dictionary/english/faint",
          "excerpt": "past tense, past participle fainted",
          "location": "L222"
        }
      ]
    },
    {
      "id": "W002399",
      "forms": {
        "base": "heel",
        "past": "heeled",
        "pastParticiple": "heeled",
        "sourceRef": "https://www.collinsdictionary.com/dictionary/english/heel",
        "status": "approved"
      },
      "status": "reviewed",
      "sources": [
        {
          "word": "heel",
          "url": "https://www.collinsdictionary.com/dictionary/english/heel",
          "excerpt": "past tense, past participle heeled",
          "location": "L222"
        }
      ]
    },
    {
      "id": "W002431",
      "forms": {
        "base": "impress",
        "past": "impressed",
        "pastParticiple": "impressed",
        "sourceRef": "https://www.collinsdictionary.com/dictionary/english/impress",
        "status": "approved"
      },
      "status": "reviewed",
      "sources": [
        {
          "word": "impress",
          "url": "https://www.collinsdictionary.com/dictionary/english/impress",
          "excerpt": "past tense, past participle impressed",
          "location": "L222"
        }
      ]
    },
    {
      "id": "W002534",
      "forms": {
        "base": "melt",
        "past": "melted",
        "pastParticiple": "melted / molten",
        "sourceRef": "https://www.collinsdictionary.com/dictionary/english/melt",
        "status": "approved"
      },
      "status": "reviewed",
      "sources": [
        {
          "word": "melt",
          "url": "https://www.collinsdictionary.com/dictionary/english/melt",
          "excerpt": "past tense, past participle melted",
          "location": "L222",
          "additionalEvidence": {
            "excerpt": "verb Word forms: melts, melting, melted, melted or molten",
            "location": "L316"
          }
        },
        {
          "type": "dictionary",
          "url": "https://www.collinsdictionary.com/dictionary/english/molten",
          "excerpt": "adjective [usually ADJECTIVE noun]; Molten rock, metal, or glass; archaic pp. of melt",
          "locator": "COBUILD L222–224; Webster American L288–290",
          "verification": "direct_dictionary_page_read_2026-11-08",
          "claim": "現代常見形容詞義為高溫熔融；美式動詞分詞條目標古語，不能在所有melt義任意互換。"
        },
        {
          "type": "dictionary",
          "url": "https://www.merriam-webster.com/dictionary/molten",
          "excerpt": "adjective; fused or liquefied by heat",
          "locator": "L32–40",
          "verification": "direct_dictionary_page_read_2026-11-08"
        }
      ]
    },
    {
      "id": "W002562",
      "forms": {
        "base": "multiply",
        "past": "multiplied",
        "pastParticiple": "multiplied",
        "sourceRef": "https://www.collinsdictionary.com/dictionary/english/multiply",
        "status": "approved"
      },
      "status": "draft",
      "sources": [
        {
          "word": "multiply",
          "url": "https://www.collinsdictionary.com/dictionary/english/multiply",
          "excerpt": "past tense, past participle multiplied",
          "location": "L222"
        }
      ]
    },
    {
      "id": "W002688",
      "forms": {
        "base": "pump",
        "past": "pumped",
        "pastParticiple": "pumped",
        "sourceRef": "https://www.collinsdictionary.com/dictionary/english/pump",
        "status": "approved"
      },
      "status": "reviewed",
      "sources": [
        {
          "word": "pump",
          "url": "https://www.collinsdictionary.com/dictionary/english/pump",
          "excerpt": "past tense, past participle pumped",
          "location": "L222"
        }
      ]
    },
    {
      "id": "W002728",
      "forms": {
        "base": "reserve",
        "past": "reserved",
        "pastParticiple": "reserved",
        "sourceRef": "https://www.collinsdictionary.com/dictionary/english/reserve",
        "status": "approved"
      },
      "status": "reviewed",
      "sources": [
        {
          "word": "reserve",
          "url": "https://www.collinsdictionary.com/dictionary/english/reserve",
          "excerpt": "past tense, past participle reserved",
          "location": "L222"
        }
      ]
    },
    {
      "id": "W002729",
      "forms": {
        "base": "resist",
        "past": "resisted",
        "pastParticiple": "resisted",
        "sourceRef": "https://www.collinsdictionary.com/dictionary/english/resist",
        "status": "approved"
      },
      "status": "reviewed",
      "sources": [
        {
          "word": "resist",
          "url": "https://www.collinsdictionary.com/dictionary/english/resist",
          "excerpt": "past tense, past participle resisted",
          "location": "L222"
        }
      ]
    },
    {
      "id": "W002830",
      "forms": {
        "base": "splash",
        "past": "splashed",
        "pastParticiple": "splashed",
        "sourceRef": "https://www.collinsdictionary.com/dictionary/english/splash",
        "status": "approved"
      },
      "status": "reviewed",
      "sources": [
        {
          "word": "splash",
          "url": "https://www.collinsdictionary.com/dictionary/english/splash",
          "excerpt": "past tense, past participle splashed",
          "location": "L222"
        }
      ]
    },
    {
      "id": "W002836",
      "forms": {
        "base": "stable",
        "past": "stabled",
        "pastParticiple": "stabled",
        "sourceRef": "https://www.collinsdictionary.com/dictionary/english/stable",
        "status": "approved"
      },
      "status": "draft",
      "sources": [
        {
          "word": "stable",
          "url": "https://www.collinsdictionary.com/dictionary/english/stable",
          "excerpt": "past tense, past participle stabled",
          "location": "L222"
        }
      ]
    },
    {
      "id": "W002843",
      "forms": {
        "base": "steady",
        "past": "steadied",
        "pastParticiple": "steadied",
        "sourceRef": "https://www.collinsdictionary.com/dictionary/english/steady",
        "status": "approved"
      },
      "status": "draft",
      "sources": [
        {
          "word": "steady",
          "url": "https://www.collinsdictionary.com/dictionary/english/steady",
          "excerpt": "past tense, past participle steadied",
          "location": "L222"
        }
      ]
    },
    {
      "id": "W002865",
      "forms": {
        "base": "subtract",
        "past": "subtracted",
        "pastParticiple": "subtracted",
        "sourceRef": "https://www.collinsdictionary.com/dictionary/english/subtract",
        "status": "approved"
      },
      "status": "draft",
      "sources": [
        {
          "word": "subtract",
          "url": "https://www.collinsdictionary.com/dictionary/english/subtract",
          "excerpt": "past tense, past participle subtracted",
          "location": "L222"
        }
      ]
    },
    {
      "id": "W002920",
      "forms": {
        "base": "toss",
        "past": "tossed",
        "pastParticiple": "tossed",
        "sourceRef": "https://www.collinsdictionary.com/dictionary/english/toss",
        "status": "approved"
      },
      "status": "reviewed",
      "sources": [
        {
          "word": "toss",
          "url": "https://www.collinsdictionary.com/dictionary/english/toss",
          "excerpt": "past tense, past participle tossed",
          "location": "L222"
        }
      ]
    },
    {
      "id": "W002926",
      "forms": {
        "base": "trace",
        "past": "traced",
        "pastParticiple": "traced",
        "sourceRef": "https://www.collinsdictionary.com/dictionary/english/trace",
        "status": "approved"
      },
      "status": "reviewed",
      "sources": [
        {
          "word": "trace",
          "url": "https://www.collinsdictionary.com/dictionary/english/trace",
          "excerpt": "past tense, past participle traced",
          "location": "L222"
        }
      ]
    },
    {
      "id": "W002928",
      "forms": {
        "base": "trail",
        "past": "trailed",
        "pastParticiple": "trailed",
        "sourceRef": "https://www.collinsdictionary.com/dictionary/english/trail",
        "status": "approved"
      },
      "status": "reviewed",
      "sources": [
        {
          "word": "trail",
          "url": "https://www.collinsdictionary.com/dictionary/english/trail",
          "excerpt": "past tense, past participle trailed",
          "location": "L222"
        }
      ]
    },
    {
      "id": "W002941",
      "forms": {
        "base": "tug",
        "past": "tugged",
        "pastParticiple": "tugged",
        "sourceRef": "https://www.collinsdictionary.com/dictionary/english/tug",
        "status": "approved"
      },
      "status": "draft",
      "sources": [
        {
          "word": "tug",
          "url": "https://www.collinsdictionary.com/dictionary/english/tug",
          "excerpt": "past tense, past participle tugged",
          "location": "L222"
        }
      ]
    },
    {
      "id": "W003204",
      "forms": {
        "base": "consume",
        "past": "consumed",
        "pastParticiple": "consumed",
        "sourceRef": "https://www.collinsdictionary.com/dictionary/english/consume",
        "status": "approved"
      },
      "status": "reviewed",
      "sources": [
        {
          "word": "consume",
          "url": "https://www.collinsdictionary.com/dictionary/english/consume",
          "excerpt": "past tense, past participle consumed",
          "location": "L222"
        }
      ]
    },
    {
      "id": "W003209",
      "forms": {
        "base": "contest",
        "past": "contested",
        "pastParticiple": "contested",
        "sourceRef": "https://www.collinsdictionary.com/dictionary/english/contest",
        "status": "approved"
      },
      "status": "draft",
      "sources": [
        {
          "word": "contest",
          "url": "https://www.collinsdictionary.com/dictionary/english/contest",
          "excerpt": "past tense, past participle contested",
          "location": "L222"
        }
      ]
    },
    {
      "id": "W003538",
      "forms": {
        "base": "injure",
        "past": "injured",
        "pastParticiple": "injured",
        "sourceRef": "https://www.collinsdictionary.com/dictionary/english/injure",
        "status": "approved"
      },
      "status": "reviewed",
      "sources": [
        {
          "word": "injure",
          "url": "https://www.collinsdictionary.com/dictionary/english/injure",
          "excerpt": "past tense, past participle injured",
          "location": "L222"
        }
      ]
    },
    {
      "id": "W003588",
      "forms": {
        "base": "lean",
        "past": "leaned / leant",
        "pastParticiple": "leaned / leant",
        "sourceRef": "https://www.collinsdictionary.com/dictionary/english/lean",
        "status": "approved"
      },
      "status": "draft",
      "sources": [
        {
          "word": "lean",
          "url": "https://www.collinsdictionary.com/dictionary/english/lean",
          "excerpt": "past tense, past participle leaned or leant",
          "location": "L222"
        }
      ]
    },
    {
      "id": "W004264",
      "forms": {
        "base": "debut",
        "past": "debuted",
        "pastParticiple": "debuted",
        "sourceRef": "https://www.dictionary.com/browse/debuted",
        "status": "approved"
      },
      "status": "reviewed",
      "sources": [
        {
          "word": "debut",
          "url": "https://www.dictionary.com/browse/debuted",
          "excerpt": "debuted; past participle; of debut; past tense form; of debut",
          "location": "L11-33"
        }
      ]
    },
    {
      "id": "W005591",
      "forms": {
        "base": "mute",
        "past": "muted",
        "pastParticiple": "muted",
        "sourceRef": "https://www.collinsdictionary.com/dictionary/english/mute",
        "status": "approved"
      },
      "status": "draft",
      "sources": [
        {
          "word": "mute",
          "url": "https://www.collinsdictionary.com/dictionary/english/mute",
          "excerpt": "past tense, past participle muted",
          "location": "L222"
        }
      ]
    },
    {
      "id": "W005635",
      "forms": {
        "base": "outlaw",
        "past": "outlawed",
        "pastParticiple": "outlawed",
        "sourceRef": "https://www.collinsdictionary.com/dictionary/english/outlaw",
        "status": "approved"
      },
      "status": "draft",
      "sources": [
        {
          "word": "outlaw",
          "url": "https://www.collinsdictionary.com/dictionary/english/outlaw",
          "excerpt": "past tense, past participle outlawed",
          "location": "L222"
        }
      ]
    },
    {
      "id": "W005864",
      "forms": {
        "base": "stabilize",
        "past": "stabilized",
        "pastParticiple": "stabilized",
        "sourceRef": "https://www.collinsdictionary.com/dictionary/english/stabilize",
        "status": "approved"
      },
      "status": "draft",
      "sources": [
        {
          "word": "stabilize",
          "url": "https://www.collinsdictionary.com/dictionary/english/stabilize",
          "excerpt": "past tense, past participle stabilized",
          "location": "L222"
        }
      ]
    },
    {
      "id": "W005998",
      "forms": {
        "base": "wharf",
        "past": "wharfed",
        "pastParticiple": "wharfed",
        "sourceRef": "https://www.collinsdictionary.com/conjugation/english/wharf",
        "status": "approved"
      },
      "status": "draft",
      "sources": [
        {
          "word": "wharf",
          "url": "https://www.collinsdictionary.com/conjugation/english/wharf",
          "excerpt": "Infinitive to wharf; Past Participle wharfed; Past I wharfed",
          "location": "Infinitive, Past Participle and Past headings"
        }
      ]
    }
  ],
  "siegeBefore": [
    [
      "FOREVER",
      "永遠"
    ],
    [
      "TEMPORARY",
      "暫時的"
    ],
    [
      "TEMPORARILY",
      "暫時地"
    ],
    [
      "MAID",
      "侍女"
    ],
    [
      "RESIST",
      "抗拒"
    ],
    [
      "GUIDANCE",
      "指導（不可數）"
    ],
    [
      "ACCURATE",
      "精準的"
    ],
    [
      "SAKE",
      "理由；緣故"
    ],
    [
      "TOSS",
      "扔；擲；擲幣賭勝負"
    ],
    [
      "RESERVE",
      "預訂；儲備；保護區"
    ],
    [
      "HARBOR",
      "港口；窩藏；庇護；心懷"
    ],
    [
      "DOCK",
      "碼頭；減少"
    ],
    [
      "TRAIL",
      "跟蹤；拖；小徑"
    ],
    [
      "FAINT",
      "頭暈的；微弱的；暈倒；昏厥（恆用單數）"
    ],
    [
      "TRACE",
      "追蹤；蹤跡"
    ],
    [
      "STEADY",
      "穩定的；使穩定；穩定地；（關係確定的）情侶"
    ],
    [
      "STEADILY",
      "不斷地；漸漸地"
    ],
    [
      "STABLE",
      "穩定的"
    ],
    [
      "INJURY",
      "（身體）傷害（可數）；（名譽）損壞（不可數）"
    ],
    [
      "DEALER",
      "業者"
    ],
    [
      "TRADER",
      "交易商；業者"
    ],
    [
      "ADMIRE",
      "欣賞；欽佩"
    ],
    [
      "HEEL",
      "腳後跟；高跟鞋；修理（鞋跟）；裝鞋跟；緊跟"
    ],
    [
      "SATISFACTORY",
      "令人滿意的"
    ],
    [
      "SATISFACTORILY",
      "令人滿意地"
    ],
    [
      "SPLASH",
      "潑水；濺起水花；濺起的水花聲"
    ],
    [
      "IMPRESS",
      "使印象深刻；使銘記"
    ],
    [
      "MELT",
      "融化；熔化；心軟"
    ],
    [
      "DESIRABLE",
      "適合的；妥當的；值得嚮往的；合意的"
    ],
    [
      "DESIRE",
      "渴望；想要；慾望"
    ],
    [
      "BADLY",
      "拙劣地；差勁地；嚴重地；非常"
    ],
    [
      "COLONY",
      "殖民地；一群同類且有組織的動物"
    ],
    [
      "EFFICIENT",
      "有效率的"
    ],
    [
      "INEFFICIENT",
      "無效率的"
    ],
    [
      "STALE",
      "不新鮮的；無新意的；倦怠的"
    ],
    [
      "AMBASSADOR",
      "大使（與介詞 to 並用）"
    ],
    [
      "ALPHABET",
      "字母（總稱）"
    ],
    [
      "CRAB",
      "螃蟹"
    ],
    [
      "GLOBAL",
      "全球的；全世界的"
    ],
    [
      "FOGGY",
      "多霧的"
    ],
    [
      "DUMB",
      "啞的；愚笨的"
    ],
    [
      "PUMP",
      "抽取；灌注；幫浦"
    ],
    [
      "SUBTRACT",
      "減"
    ],
    [
      "MINUS",
      "（算術）減；零以下的；負數的"
    ],
    [
      "MULTIPLY",
      "乘"
    ],
    [
      "PERMANENT",
      "永久的；不變的；固定的；持久的"
    ],
    [
      "SERVANT",
      "僕人；有用物；公務員；僱員"
    ],
    [
      "LUXURIOUS",
      "豪華的；奢侈的；放縱的"
    ],
    [
      "RESISTANT",
      "抵抗者；反抗者；抵抗的；反抗的"
    ],
    [
      "RESISTANCE",
      "抵抗力；反抗；耐力；阻力"
    ],
    [
      "GUIDE",
      "引導者；導遊；指南；路標"
    ],
    [
      "INSTRUCTION",
      "指令；教導；命令"
    ],
    [
      "ACCURACY",
      "精確；正確；準確度"
    ],
    [
      "PRECISE",
      "精確的；嚴謹的；明確的；精密的"
    ],
    [
      "CONTEST",
      "競賽；爭論；競爭；爭取"
    ],
    [
      "THROW",
      "投；擲；拋；發射"
    ],
    [
      "VENUE",
      "犯罪地點；審判地；發生地點"
    ],
    [
      "RESERVATION",
      "保留；預定；保留品；保留地"
    ],
    [
      "RESERVOIR",
      "貯水池；貯藏處；貯備；水庫"
    ],
    [
      "PRESERVE",
      "保護；保持；保存；維持"
    ],
    [
      "PROHIBIT",
      "禁止；阻止"
    ],
    [
      "PORT",
      "港口；埠；艙門；避風港"
    ],
    [
      "OUTLAW",
      "被剝奪法律保護的人；罪犯；使...失去法律保護；將...逐出社會"
    ],
    [
      "QUARREL",
      "吵架；反目；怨言；方頭鑿"
    ],
    [
      "WHARF",
      "碼頭；卸在碼頭上；靠碼頭；入塢"
    ],
    [
      "TRACK",
      "軌跡；足跡；徑跡；小道"
    ],
    [
      "PATH",
      "路徑；小路；道路；途徑"
    ],
    [
      "TUG",
      "用力拉；拖曳；苦幹；掙扎"
    ],
    [
      "ANCESTOR",
      "祖先；祖宗"
    ],
    [
      "LEAN",
      "瘦肉；傾斜；傾斜度；瘦的"
    ],
    [
      "CRITICAL",
      "批評的；決定性的；危險的；臨界的"
    ],
    [
      "STABILIZE",
      "使安定；使穩固；穩定；安定"
    ],
    [
      "INJURE",
      "傷害；損害；使受冤屈；損傷"
    ],
    [
      "SCANDAL",
      "醜聞；中傷；恥辱；反感"
    ],
    [
      "REPUTATION",
      "名譽；名聲；聲望；公認證據"
    ],
    [
      "DEAL",
      "交易；協定；數量；買賣"
    ],
    [
      "MERCHANT",
      "商人；店主；商業的；商人的"
    ],
    [
      "ANTIQUE",
      "古董；古物；古老的；古風的"
    ],
    [
      "TRADE",
      "貿易；商業；交易；生意"
    ],
    [
      "ADMIRABLE",
      "可欽佩的；極好的；令人驚奇的"
    ],
    [
      "ADMIRATION",
      "讚賞；欽佩；引人讚賞的對象"
    ],
    [
      "PROFICIENCY",
      "精通；熟練；精練"
    ],
    [
      "APPRECIATE",
      "賞識；鑑別；爲...而感激；領會"
    ],
    [
      "CLIFF",
      "懸崖；絕壁"
    ],
    [
      "SATISFY",
      "使滿意；滿足；符合；使確信"
    ],
    [
      "SATISFACTION",
      "滿足；滿意；快事；賠償"
    ],
    [
      "SENSATION",
      "感覺；轟動"
    ],
    [
      "BATHE",
      "沐浴；用水洗；洗澡"
    ],
    [
      "DEBUT",
      "初次登臺；開張"
    ],
    [
      "IMPRESSIVE",
      "給人深刻印象的；威嚴的"
    ],
    [
      "IMPRESSION",
      "印象；意念；蓋印；印記"
    ],
    [
      "BOULEVARD",
      "林蔭大道"
    ],
    [
      "BUCKET",
      "桶；存儲桶"
    ],
    [
      "DIVERSITY",
      "差異；多樣性"
    ],
    [
      "COLONIAL",
      "殖民的；殖民地的；殖民地居民"
    ],
    [
      "EFFECTIVE",
      "有效的；有力的；實際的；有生力量"
    ],
    [
      "CONSUME",
      "消耗；消費；消滅；耗盡"
    ],
    [
      "FLAT",
      "平坦的；單調的；無力的；淺的"
    ],
    [
      "BORING",
      "煩人的；無聊的；無趣的；成孔期"
    ],
    [
      "FRESH",
      "新鮮的；新奇的；另外的；淡的"
    ],
    [
      "DIPLOMAT",
      "外交官；有外交手腕的人；外交家；有權謀的人"
    ],
    [
      "EMBASSY",
      "大使館；大使館全體人員"
    ],
    [
      "GLOBE",
      "球；球狀物；地球儀；天體"
    ],
    [
      "FOG",
      "霧；迷惑；(割後的)最生草；苔蘚"
    ],
    [
      "SUNNY",
      "陽光充足的；樂觀的；快樂的；像太陽的"
    ],
    [
      "CLOUDY",
      "多雲的；有愁容的；雲的；渾濁的"
    ],
    [
      "RAINY",
      "下雨的；多雨的"
    ],
    [
      "SNOWY",
      "多雪的；雪的；被雪所覆蓋着的；下雪的"
    ],
    [
      "WINDY",
      "多風的；風強的；腹脹的；吹牛的"
    ],
    [
      "STUPID",
      "愚蠢的；麻木的"
    ],
    [
      "MUTE",
      "啞子；啞音字母；弱音器；啞的"
    ],
    [
      "BLIND",
      "矇蔽物；窗簾；盲目的；瞎的"
    ],
    [
      "DEAF",
      "聾的"
    ],
    [
      "ADD",
      "增加；添加；附帶說明；計算...總和"
    ],
    [
      "PLUS",
      "加上；加；外加；正的"
    ],
    [
      "DIVIDE",
      "分開；分配；分裂；分"
    ]
  ],
  "siegeAfter": [
    [
      "FOREVER",
      "永遠"
    ],
    [
      "TEMPORARY",
      "暫時的"
    ],
    [
      "TEMPORARILY",
      "暫時地"
    ],
    [
      "MAID",
      "侍女"
    ],
    [
      "RESIST",
      "抗拒"
    ],
    [
      "GUIDANCE",
      "指導（不可數）"
    ],
    [
      "ACCURATE",
      "精準的"
    ],
    [
      "SAKE",
      "理由；緣故"
    ],
    [
      "TOSS",
      "扔；擲；擲幣賭勝負"
    ],
    [
      "RESERVE",
      "預訂；儲備；保護區"
    ],
    [
      "HARBOR",
      "港口；窩藏；庇護；心懷"
    ],
    [
      "DOCK",
      "碼頭；減少"
    ],
    [
      "TRAIL",
      "跟蹤；拖；小徑"
    ],
    [
      "FAINT",
      "頭暈的；微弱的；暈倒；昏厥（恆用單數）"
    ],
    [
      "TRACE",
      "追蹤；蹤跡"
    ],
    [
      "STEADY",
      "穩定的；使穩定；穩定地；（關係確定的）情侶"
    ],
    [
      "STEADILY",
      "不斷地；漸漸地"
    ],
    [
      "STABLE",
      "穩定的"
    ],
    [
      "INJURY",
      "（身體）傷害（可數）；（名譽）損壞（不可數）"
    ],
    [
      "DEALER",
      "業者"
    ],
    [
      "TRADER",
      "交易商；業者"
    ],
    [
      "ADMIRE",
      "欣賞；欽佩"
    ],
    [
      "HEEL",
      "腳後跟；高跟鞋；修理（鞋跟）；裝鞋跟；緊跟"
    ],
    [
      "SATISFACTORY",
      "令人滿意的"
    ],
    [
      "SATISFACTORILY",
      "令人滿意地"
    ],
    [
      "SPLASH",
      "潑水；濺起水花；濺起的水花聲"
    ],
    [
      "IMPRESS",
      "使印象深刻；使銘記"
    ],
    [
      "MELT",
      "融化；熔化；心軟"
    ],
    [
      "DESIRABLE",
      "適合的；妥當的；值得嚮往的；合意的"
    ],
    [
      "DESIRE",
      "渴望；想要；慾望"
    ],
    [
      "BADLY",
      "拙劣地；差勁地；嚴重地；非常"
    ],
    [
      "COLONY",
      "殖民地；一群同類且有組織的動物"
    ],
    [
      "EFFICIENT",
      "有效率的"
    ],
    [
      "INEFFICIENT",
      "無效率的"
    ],
    [
      "STALE",
      "不新鮮的；無新意的；倦怠的"
    ],
    [
      "AMBASSADOR",
      "大使（與介詞 to 並用）"
    ],
    [
      "ALPHABET",
      "字母（總稱）"
    ],
    [
      "CRAB",
      "螃蟹"
    ],
    [
      "GLOBAL",
      "全球的；全世界的"
    ],
    [
      "FOGGY",
      "多霧的"
    ],
    [
      "DUMB",
      "啞的；愚笨的"
    ],
    [
      "PUMP",
      "抽取；灌注；幫浦"
    ],
    [
      "SUBTRACT",
      "減"
    ],
    [
      "MINUS",
      "（算術）減；零以下的；負數的"
    ],
    [
      "MULTIPLY",
      "乘"
    ],
    [
      "PERMANENT",
      "永久的"
    ],
    [
      "MOMENTARILY",
      "臨時地"
    ],
    [
      "PERMANENTLY",
      "永久地"
    ],
    [
      "SERVANT",
      "僕人"
    ],
    [
      "RELIEVED",
      "舒緩的"
    ],
    [
      "BUTLER",
      "男管家"
    ],
    [
      "LUXURIOUS",
      "豪華的；奢侈的"
    ],
    [
      "RESISTANT",
      "抵抗的"
    ],
    [
      "RESISTANCE",
      "抵抗"
    ],
    [
      "GUIDE",
      "引導"
    ],
    [
      "INSTRUCTION",
      "教導"
    ],
    [
      "ACCURACY",
      "準確性"
    ],
    [
      "PRECISE",
      "精確的"
    ],
    [
      "INACCURATE",
      "不精確的"
    ],
    [
      "CONTEST",
      "比賽；競賽"
    ],
    [
      "THROW",
      "投；擲"
    ],
    [
      "CRUMPLE",
      "弄皺"
    ],
    [
      "VENUE",
      "地點"
    ],
    [
      "RESERVATION",
      "預訂"
    ],
    [
      "RESERVOIR",
      "水庫"
    ],
    [
      "PRESERVE",
      "保護；保存；果醬；蜜餞（常用複數）"
    ],
    [
      "PROHIBIT",
      "禁止"
    ],
    [
      "GRUDGE",
      "怨恨"
    ],
    [
      "PORT",
      "港口"
    ],
    [
      "OUTLAW",
      "亡命之徒"
    ],
    [
      "QUARREL",
      "爭吵"
    ],
    [
      "WHARF",
      "碼頭"
    ],
    [
      "TRACK",
      "跟蹤"
    ],
    [
      "PATH",
      "小徑"
    ],
    [
      "TUG",
      "拖；拉"
    ],
    [
      "FOGGIEST",
      "最模糊的"
    ],
    [
      "ANCESTOR",
      "祖先"
    ],
    [
      "LEAN",
      "倚；靠"
    ],
    [
      "PROGRESSIVELY",
      "不斷地"
    ],
    [
      "GRADUALLY",
      "漸漸地"
    ],
    [
      "CRITICAL",
      "危急的"
    ],
    [
      "STABILIZE",
      "使穩定"
    ],
    [
      "INJURE",
      "使受傷"
    ],
    [
      "SCANDAL",
      "醜聞"
    ],
    [
      "REPUTATION",
      "名譽；名聲"
    ],
    [
      "DEAL",
      "交易"
    ],
    [
      "MERCHANT",
      "商人"
    ],
    [
      "ANTIQUE",
      "古董；古玩"
    ],
    [
      "TRADE",
      "交易"
    ],
    [
      "ADMIRABLE",
      "值得讚賞的"
    ],
    [
      "ADMIRATION",
      "欽佩；羨慕"
    ],
    [
      "PROFICIENCY",
      "精通"
    ],
    [
      "APPRECIATE",
      "欣賞"
    ],
    [
      "CLIFF",
      "懸崖"
    ],
    [
      "GRACEFULLY",
      "優雅地"
    ],
    [
      "SATISFY",
      "使滿足；符合（要求、條件）"
    ],
    [
      "SATISFYING",
      "令人愉悅的；令人飽足的"
    ],
    [
      "SATISFIED",
      "感到滿意的"
    ],
    [
      "SATISFACTION",
      "滿足；滿意"
    ],
    [
      "SENSATION",
      "轟動"
    ],
    [
      "BATHE",
      "為……洗澡"
    ],
    [
      "DEBUT",
      "初次露面"
    ],
    [
      "IMPRESSIVE",
      "令人印象深刻的"
    ],
    [
      "IMPRESSION",
      "印象；想法；感覺；痕跡"
    ],
    [
      "BOULEVARD",
      "林蔭大道"
    ],
    [
      "BUCKET",
      "桶子；小桶"
    ],
    [
      "DIVERSITY",
      "多樣性"
    ],
    [
      "COLONIAL",
      "殖民地的；殖民的"
    ],
    [
      "COLONIZE",
      "將……開拓為殖民地"
    ],
    [
      "EFFECTIVE",
      "有效的"
    ],
    [
      "CONSUME",
      "消耗"
    ],
    [
      "DECAYED",
      "腐壞的"
    ],
    [
      "FLAT",
      "單調的"
    ],
    [
      "BORING",
      "令人無聊的"
    ],
    [
      "FRESH",
      "新鮮的"
    ],
    [
      "CONSUL",
      "領事"
    ],
    [
      "DIPLOMAT",
      "外交官"
    ],
    [
      "EMBASSY",
      "大使館"
    ],
    [
      "ALPHABETICAL",
      "按字母順序的"
    ],
    [
      "CRABBED",
      "（字跡）潦草難讀的"
    ],
    [
      "GLOBE",
      "地球儀；地球"
    ],
    [
      "FOG",
      "霧"
    ],
    [
      "SUNNY",
      "晴朗的"
    ],
    [
      "CLOUDY",
      "多雲的；陰的"
    ],
    [
      "RAINY",
      "下雨的"
    ],
    [
      "SNOWY",
      "下雪的"
    ],
    [
      "WINDY",
      "多風的"
    ],
    [
      "STUPID",
      "愚蠢的"
    ],
    [
      "MUTE",
      "啞的"
    ],
    [
      "BLIND",
      "盲的"
    ],
    [
      "DEAF",
      "失聰的"
    ],
    [
      "PUMPER",
      "抽水機"
    ],
    [
      "ADD",
      "增加"
    ],
    [
      "PLUS",
      "（算數）加"
    ],
    [
      "TIMES",
      "數字相乘"
    ],
    [
      "DIVIDE",
      "除以"
    ]
  ],
  "currentCardRows": [
    {
      "learningItemId": "LI-LV3U11-V001",
      "kind": "vocabulary",
      "displayWord": "forever",
      "lexemeRef": "W002341",
      "officialWordId": "W002341",
      "officialSenseId": null,
      "sensePos": "adv.",
      "targetMeaningZh": "永遠",
      "chapterMeaningsZh": "永遠",
      "sourcePage": 107,
      "printedNumber": 1,
      "sourceRole": "main",
      "printedLabel": "",
      "meaningSource": "textbook_transcription",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V002",
      "kind": "vocabulary",
      "displayWord": "temporary",
      "lexemeRef": "W002901",
      "officialWordId": "W002901",
      "officialSenseId": null,
      "sensePos": "adj.",
      "targetMeaningZh": "暫時的",
      "chapterMeaningsZh": "暫時的",
      "sourcePage": 107,
      "printedNumber": null,
      "sourceRole": "unnumbered_headword",
      "printedLabel": "",
      "meaningSource": "textbook_transcription",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V003",
      "kind": "vocabulary",
      "displayWord": "temporarily",
      "lexemeRef": "temporarily",
      "officialWordId": null,
      "officialSenseId": null,
      "sensePos": "adv.",
      "targetMeaningZh": "暫時地",
      "chapterMeaningsZh": "暫時地",
      "sourcePage": 107,
      "printedNumber": null,
      "sourceRole": "unnumbered_headword",
      "printedLabel": "",
      "meaningSource": "textbook_transcription",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V004",
      "kind": "vocabulary",
      "displayWord": "maid",
      "lexemeRef": "W002518",
      "officialWordId": "W002518",
      "officialSenseId": null,
      "sensePos": "n.",
      "targetMeaningZh": "侍女",
      "chapterMeaningsZh": "侍女",
      "sourcePage": 107,
      "printedNumber": 2,
      "sourceRole": "main",
      "printedLabel": "",
      "meaningSource": "textbook_transcription",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V005",
      "kind": "vocabulary",
      "displayWord": "resist",
      "lexemeRef": "W002729",
      "officialWordId": "W002729",
      "officialSenseId": null,
      "sensePos": "vt./vi.",
      "targetMeaningZh": "抗拒",
      "chapterMeaningsZh": "抗拒",
      "sourcePage": 108,
      "printedNumber": 3,
      "sourceRole": "main",
      "printedLabel": "",
      "meaningSource": "textbook_transcription",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V006",
      "kind": "vocabulary",
      "displayWord": "guidance",
      "lexemeRef": "W002377",
      "officialWordId": "W002377",
      "officialSenseId": null,
      "sensePos": "n.",
      "targetMeaningZh": "指導（不可數）",
      "chapterMeaningsZh": "指導（不可數）",
      "sourcePage": 108,
      "printedNumber": 4,
      "sourceRole": "main",
      "printedLabel": "",
      "meaningSource": "textbook_transcription",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V007",
      "kind": "vocabulary",
      "displayWord": "accurate",
      "lexemeRef": "W002007",
      "officialWordId": "W002007",
      "officialSenseId": null,
      "sensePos": "adj.",
      "targetMeaningZh": "精準的",
      "chapterMeaningsZh": "精準的",
      "sourcePage": 108,
      "printedNumber": 5,
      "sourceRole": "main",
      "printedLabel": "",
      "meaningSource": "textbook_transcription",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V008",
      "kind": "vocabulary",
      "displayWord": "sake",
      "lexemeRef": "W002756",
      "officialWordId": "W002756",
      "officialSenseId": null,
      "sensePos": "n.",
      "targetMeaningZh": "理由；緣故",
      "chapterMeaningsZh": "理由；緣故",
      "sourcePage": 108,
      "printedNumber": 6,
      "sourceRole": "main",
      "printedLabel": "",
      "meaningSource": "textbook_transcription",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V009",
      "kind": "vocabulary",
      "displayWord": "toss",
      "lexemeRef": "W002920",
      "officialWordId": "W002920",
      "officialSenseId": null,
      "sensePos": "vt./n.",
      "targetMeaningZh": "扔；擲；擲幣賭勝負",
      "chapterMeaningsZh": "扔；擲；擲幣賭勝負",
      "sourcePage": 109,
      "printedNumber": 7,
      "sourceRole": "main",
      "printedLabel": "",
      "meaningSource": "textbook_transcription",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V010",
      "kind": "vocabulary",
      "displayWord": "reserve",
      "lexemeRef": "W002728",
      "officialWordId": "W002728",
      "officialSenseId": null,
      "sensePos": "vt./n.",
      "targetMeaningZh": "預訂；儲備；保護區",
      "chapterMeaningsZh": "預訂；儲備；保護區",
      "sourcePage": 109,
      "printedNumber": 8,
      "sourceRole": "main",
      "printedLabel": "",
      "meaningSource": "textbook_transcription",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V011",
      "kind": "vocabulary",
      "displayWord": "harbor",
      "lexemeRef": "W002386",
      "officialWordId": "W002386",
      "officialSenseId": null,
      "sensePos": "n./vt.",
      "targetMeaningZh": "港口；窩藏；庇護；心懷",
      "chapterMeaningsZh": "港口；窩藏；庇護；心懷",
      "sourcePage": 109,
      "printedNumber": 9,
      "sourceRole": "main",
      "printedLabel": "",
      "meaningSource": "textbook_transcription",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V012",
      "kind": "vocabulary",
      "displayWord": "dock",
      "lexemeRef": "W002255",
      "officialWordId": "W002255",
      "officialSenseId": null,
      "sensePos": "n./vt.",
      "targetMeaningZh": "碼頭；減少",
      "chapterMeaningsZh": "碼頭；減少",
      "sourcePage": 110,
      "printedNumber": null,
      "sourceRole": "unnumbered_headword",
      "printedLabel": "",
      "meaningSource": "textbook_transcription",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V013",
      "kind": "vocabulary",
      "displayWord": "trail",
      "lexemeRef": "W002928",
      "officialWordId": "W002928",
      "officialSenseId": null,
      "sensePos": "vt./n.",
      "targetMeaningZh": "跟蹤；拖；小徑",
      "chapterMeaningsZh": "跟蹤；拖；小徑",
      "sourcePage": 110,
      "printedNumber": 10,
      "sourceRole": "main",
      "printedLabel": "",
      "meaningSource": "textbook_transcription",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V014",
      "kind": "vocabulary",
      "displayWord": "faint",
      "lexemeRef": "W002310",
      "officialWordId": "W002310",
      "officialSenseId": null,
      "sensePos": "adj./vi./n.",
      "targetMeaningZh": "頭暈的；微弱的；暈倒；昏厥（恆用單數）",
      "chapterMeaningsZh": "頭暈的；微弱的；暈倒；昏厥（恆用單數）",
      "sourcePage": 110,
      "printedNumber": 11,
      "sourceRole": "main",
      "printedLabel": "",
      "meaningSource": "textbook_transcription",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V015",
      "kind": "vocabulary",
      "displayWord": "trace",
      "lexemeRef": "W002926",
      "officialWordId": "W002926",
      "officialSenseId": null,
      "sensePos": "vt./n.",
      "targetMeaningZh": "追蹤；蹤跡",
      "chapterMeaningsZh": "追蹤；蹤跡",
      "sourcePage": 111,
      "printedNumber": 12,
      "sourceRole": "main",
      "printedLabel": "",
      "meaningSource": "textbook_transcription",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V016",
      "kind": "vocabulary",
      "displayWord": "steady",
      "lexemeRef": "W002843",
      "officialWordId": "W002843",
      "officialSenseId": null,
      "sensePos": "adj./vt./adv./n.",
      "targetMeaningZh": "穩定的；使穩定；穩定地；（關係確定的）情侶",
      "chapterMeaningsZh": "穩定的；使穩定；穩定地；（關係確定的）情侶",
      "sourcePage": 111,
      "printedNumber": 13,
      "sourceRole": "main",
      "printedLabel": "",
      "meaningSource": "textbook_transcription",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V017",
      "kind": "vocabulary",
      "displayWord": "steadily",
      "lexemeRef": "steadily",
      "officialWordId": null,
      "officialSenseId": null,
      "sensePos": "adv.",
      "targetMeaningZh": "不斷地；漸漸地",
      "chapterMeaningsZh": "不斷地；漸漸地",
      "sourcePage": 111,
      "printedNumber": null,
      "sourceRole": "unnumbered_headword",
      "printedLabel": "",
      "meaningSource": "textbook_transcription",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V018",
      "kind": "vocabulary",
      "displayWord": "stable",
      "lexemeRef": "W002836",
      "officialWordId": "W002836",
      "officialSenseId": null,
      "sensePos": "adj.",
      "targetMeaningZh": "穩定的",
      "chapterMeaningsZh": "穩定的",
      "sourcePage": 112,
      "printedNumber": null,
      "sourceRole": "unnumbered_headword",
      "printedLabel": "",
      "meaningSource": "textbook_transcription",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V019",
      "kind": "vocabulary",
      "displayWord": "injury",
      "lexemeRef": "W002438",
      "officialWordId": "W002438",
      "officialSenseId": null,
      "sensePos": "n.",
      "targetMeaningZh": "（身體）傷害（可數）；（名譽）損壞（不可數）",
      "chapterMeaningsZh": "（身體）傷害（可數）；（名譽）損壞（不可數）",
      "sourcePage": 112,
      "printedNumber": 14,
      "sourceRole": "main",
      "printedLabel": "",
      "meaningSource": "textbook_transcription",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V020",
      "kind": "vocabulary",
      "displayWord": "dealer",
      "lexemeRef": "W002223",
      "officialWordId": "W002223",
      "officialSenseId": null,
      "sensePos": "n.",
      "targetMeaningZh": "業者",
      "chapterMeaningsZh": "業者",
      "sourcePage": 112,
      "printedNumber": 15,
      "sourceRole": "main",
      "printedLabel": "",
      "meaningSource": "textbook_transcription",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V021",
      "kind": "vocabulary",
      "displayWord": "trader",
      "lexemeRef": "W002927",
      "officialWordId": "W002927",
      "officialSenseId": null,
      "sensePos": "n.",
      "targetMeaningZh": "交易商；業者",
      "chapterMeaningsZh": "交易商；業者",
      "sourcePage": 112,
      "printedNumber": null,
      "sourceRole": "unnumbered_headword",
      "printedLabel": "",
      "meaningSource": "textbook_transcription",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V022",
      "kind": "vocabulary",
      "displayWord": "admire",
      "lexemeRef": "W002011",
      "officialWordId": "W002011",
      "officialSenseId": null,
      "sensePos": "vt.",
      "targetMeaningZh": "欣賞；欽佩",
      "chapterMeaningsZh": "欣賞；欽佩",
      "sourcePage": 112,
      "printedNumber": 16,
      "sourceRole": "main",
      "printedLabel": "",
      "meaningSource": "textbook_transcription",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V023",
      "kind": "vocabulary",
      "displayWord": "heel",
      "lexemeRef": "W002399",
      "officialWordId": "W002399",
      "officialSenseId": null,
      "sensePos": "n./vt./vi.",
      "targetMeaningZh": "腳後跟；高跟鞋；修理（鞋跟）；裝鞋跟；緊跟",
      "chapterMeaningsZh": "腳後跟；高跟鞋；修理（鞋跟）；裝鞋跟；緊跟",
      "sourcePage": 113,
      "printedNumber": 17,
      "sourceRole": "main",
      "printedLabel": "",
      "meaningSource": "textbook_transcription",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V024",
      "kind": "vocabulary",
      "displayWord": "satisfactory",
      "lexemeRef": "W002758",
      "officialWordId": "W002758",
      "officialSenseId": null,
      "sensePos": "adj.",
      "targetMeaningZh": "令人滿意的",
      "chapterMeaningsZh": "令人滿意的",
      "sourcePage": 113,
      "printedNumber": 18,
      "sourceRole": "main",
      "printedLabel": "",
      "meaningSource": "textbook_transcription",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V025",
      "kind": "vocabulary",
      "displayWord": "satisfactorily",
      "lexemeRef": "satisfactorily",
      "officialWordId": null,
      "officialSenseId": null,
      "sensePos": "adv.",
      "targetMeaningZh": "令人滿意地",
      "chapterMeaningsZh": "令人滿意地",
      "sourcePage": 113,
      "printedNumber": null,
      "sourceRole": "unnumbered_headword",
      "printedLabel": "",
      "meaningSource": "textbook_transcription",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V026",
      "kind": "vocabulary",
      "displayWord": "splash",
      "lexemeRef": "W002830",
      "officialWordId": "W002830",
      "officialSenseId": null,
      "sensePos": "vt./vi./n.",
      "targetMeaningZh": "潑水；濺起水花；濺起的水花聲",
      "chapterMeaningsZh": "潑水；濺起水花；濺起的水花聲",
      "sourcePage": 114,
      "printedNumber": 19,
      "sourceRole": "main",
      "printedLabel": "",
      "meaningSource": "textbook_transcription",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V027",
      "kind": "vocabulary",
      "displayWord": "impress",
      "lexemeRef": "W002431",
      "officialWordId": "W002431",
      "officialSenseId": null,
      "sensePos": "vt.",
      "targetMeaningZh": "使印象深刻；使銘記",
      "chapterMeaningsZh": "使印象深刻；使銘記",
      "sourcePage": 114,
      "printedNumber": 20,
      "sourceRole": "main",
      "printedLabel": "",
      "meaningSource": "textbook_transcription",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V028",
      "kind": "vocabulary",
      "displayWord": "melt",
      "lexemeRef": "W002534",
      "officialWordId": "W002534",
      "officialSenseId": null,
      "sensePos": "vt./vi.",
      "targetMeaningZh": "融化；熔化；心軟",
      "chapterMeaningsZh": "融化；熔化；心軟",
      "sourcePage": 114,
      "printedNumber": 21,
      "sourceRole": "main",
      "printedLabel": "",
      "meaningSource": "textbook_transcription",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V029",
      "kind": "vocabulary",
      "displayWord": "desirable",
      "lexemeRef": "W002235",
      "officialWordId": "W002235",
      "officialSenseId": null,
      "sensePos": "adj.",
      "targetMeaningZh": "適合的；妥當的；值得嚮往的；合意的",
      "chapterMeaningsZh": "適合的；妥當的；值得嚮往的；合意的",
      "sourcePage": 115,
      "printedNumber": 22,
      "sourceRole": "main",
      "printedLabel": "",
      "meaningSource": "textbook_transcription",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V030",
      "kind": "vocabulary",
      "displayWord": "desire",
      "lexemeRef": "W002236",
      "officialWordId": "W002236",
      "officialSenseId": null,
      "sensePos": "vt./n.",
      "targetMeaningZh": "渴望；想要；慾望",
      "chapterMeaningsZh": "渴望；想要；慾望",
      "sourcePage": 115,
      "printedNumber": null,
      "sourceRole": "unnumbered_headword",
      "printedLabel": "",
      "meaningSource": "textbook_transcription",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V031",
      "kind": "vocabulary",
      "displayWord": "badly",
      "lexemeRef": "W002062",
      "officialWordId": "W002062",
      "officialSenseId": null,
      "sensePos": "adv.",
      "targetMeaningZh": "拙劣地；差勁地；嚴重地；非常",
      "chapterMeaningsZh": "拙劣地；差勁地；嚴重地；非常",
      "sourcePage": 115,
      "printedNumber": 23,
      "sourceRole": "main",
      "printedLabel": "",
      "meaningSource": "textbook_transcription",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V032",
      "kind": "vocabulary",
      "displayWord": "colony",
      "lexemeRef": "W002171",
      "officialWordId": "W002171",
      "officialSenseId": null,
      "sensePos": "n.",
      "targetMeaningZh": "殖民地；一群同類且有組織的動物",
      "chapterMeaningsZh": "殖民地；一群同類且有組織的動物",
      "sourcePage": 116,
      "printedNumber": 24,
      "sourceRole": "main",
      "printedLabel": "",
      "meaningSource": "textbook_transcription",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V033",
      "kind": "vocabulary",
      "displayWord": "efficient",
      "lexemeRef": "W002280",
      "officialWordId": "W002280",
      "officialSenseId": null,
      "sensePos": "adj.",
      "targetMeaningZh": "有效率的",
      "chapterMeaningsZh": "有效率的",
      "sourcePage": 116,
      "printedNumber": 25,
      "sourceRole": "main",
      "printedLabel": "",
      "meaningSource": "textbook_transcription",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V034",
      "kind": "vocabulary",
      "displayWord": "inefficient",
      "lexemeRef": "inefficient",
      "officialWordId": null,
      "officialSenseId": null,
      "sensePos": "adj.",
      "targetMeaningZh": "無效率的",
      "chapterMeaningsZh": "無效率的",
      "sourcePage": 116,
      "printedNumber": null,
      "sourceRole": "unnumbered_headword",
      "printedLabel": "",
      "meaningSource": "textbook_transcription",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V035",
      "kind": "vocabulary",
      "displayWord": "stale",
      "lexemeRef": "W002839",
      "officialWordId": "W002839",
      "officialSenseId": null,
      "sensePos": "adj.",
      "targetMeaningZh": "不新鮮的；無新意的；倦怠的",
      "chapterMeaningsZh": "不新鮮的；無新意的；倦怠的",
      "sourcePage": 116,
      "printedNumber": 26,
      "sourceRole": "main",
      "printedLabel": "",
      "meaningSource": "textbook_transcription",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V036",
      "kind": "vocabulary",
      "displayWord": "ambassador",
      "lexemeRef": "W002026",
      "officialWordId": "W002026",
      "officialSenseId": null,
      "sensePos": "n.",
      "targetMeaningZh": "大使（與介詞 to 並用）",
      "chapterMeaningsZh": "大使（與介詞 to 並用）",
      "sourcePage": 117,
      "printedNumber": 27,
      "sourceRole": "main",
      "printedLabel": "",
      "meaningSource": "textbook_transcription",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V037",
      "kind": "vocabulary",
      "displayWord": "alphabet",
      "lexemeRef": "W002024",
      "officialWordId": "W002024",
      "officialSenseId": null,
      "sensePos": "n.",
      "targetMeaningZh": "字母（總稱）",
      "chapterMeaningsZh": "字母（總稱）",
      "sourcePage": 117,
      "printedNumber": 28,
      "sourceRole": "main",
      "printedLabel": "",
      "meaningSource": "textbook_transcription",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V038",
      "kind": "vocabulary",
      "displayWord": "crab",
      "lexemeRef": "W002199",
      "officialWordId": "W002199",
      "officialSenseId": null,
      "sensePos": "n.",
      "targetMeaningZh": "螃蟹",
      "chapterMeaningsZh": "螃蟹",
      "sourcePage": 117,
      "printedNumber": 29,
      "sourceRole": "main",
      "printedLabel": "",
      "meaningSource": "textbook_transcription",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V039",
      "kind": "vocabulary",
      "displayWord": "global",
      "lexemeRef": "W002362",
      "officialWordId": "W002362",
      "officialSenseId": null,
      "sensePos": "adj.",
      "targetMeaningZh": "全球的；全世界的",
      "chapterMeaningsZh": "全球的；全世界的",
      "sourcePage": 117,
      "printedNumber": 30,
      "sourceRole": "main",
      "printedLabel": "",
      "meaningSource": "textbook_transcription",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V040",
      "kind": "vocabulary",
      "displayWord": "foggy",
      "lexemeRef": "W002337",
      "officialWordId": "W002337",
      "officialSenseId": null,
      "sensePos": "adj.",
      "targetMeaningZh": "多霧的",
      "chapterMeaningsZh": "多霧的",
      "sourcePage": 117,
      "printedNumber": 31,
      "sourceRole": "main",
      "printedLabel": "",
      "meaningSource": "textbook_transcription",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V041",
      "kind": "vocabulary",
      "displayWord": "dumb",
      "lexemeRef": "W002270",
      "officialWordId": "W002270",
      "officialSenseId": null,
      "sensePos": "adj.",
      "targetMeaningZh": "啞的；愚笨的",
      "chapterMeaningsZh": "啞的；愚笨的",
      "sourcePage": 117,
      "printedNumber": 32,
      "sourceRole": "main",
      "printedLabel": "",
      "meaningSource": "textbook_transcription",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V042",
      "kind": "vocabulary",
      "displayWord": "pump",
      "lexemeRef": "W002688",
      "officialWordId": "W002688",
      "officialSenseId": null,
      "sensePos": "vt./vi./n.",
      "targetMeaningZh": "抽取；灌注；幫浦",
      "chapterMeaningsZh": "抽取；灌注；幫浦",
      "sourcePage": 118,
      "printedNumber": 33,
      "sourceRole": "main",
      "printedLabel": "",
      "meaningSource": "textbook_transcription",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V043",
      "kind": "vocabulary",
      "displayWord": "subtract",
      "lexemeRef": "W002865",
      "officialWordId": "W002865",
      "officialSenseId": null,
      "sensePos": "vt.",
      "targetMeaningZh": "減",
      "chapterMeaningsZh": "減",
      "sourcePage": 118,
      "printedNumber": 34,
      "sourceRole": "main",
      "printedLabel": "",
      "meaningSource": "textbook_transcription",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V044",
      "kind": "vocabulary",
      "displayWord": "minus",
      "lexemeRef": "W002542",
      "officialWordId": "W002542",
      "officialSenseId": null,
      "sensePos": "prep./adj.",
      "targetMeaningZh": "（算術）減；零以下的；負數的",
      "chapterMeaningsZh": "（算術）減；零以下的；負數的",
      "sourcePage": 118,
      "printedNumber": null,
      "sourceRole": "unnumbered_headword",
      "printedLabel": "",
      "meaningSource": "textbook_transcription",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V045",
      "kind": "vocabulary",
      "displayWord": "multiply",
      "lexemeRef": "W002562",
      "officialWordId": "W002562",
      "officialSenseId": null,
      "sensePos": "vt.",
      "targetMeaningZh": "乘",
      "chapterMeaningsZh": "乘",
      "sourcePage": 118,
      "printedNumber": null,
      "sourceRole": "unnumbered_headword",
      "printedLabel": "",
      "meaningSource": "textbook_transcription",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V046",
      "kind": "vocabulary",
      "displayWord": "permanent",
      "lexemeRef": "W003731",
      "officialWordId": "W003731",
      "officialSenseId": null,
      "sensePos": "adj.",
      "targetMeaningZh": "永久的",
      "chapterMeaningsZh": "永久的",
      "sourcePage": 107,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "反",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V047",
      "kind": "vocabulary",
      "displayWord": "momentarily",
      "lexemeRef": "momentarily",
      "officialWordId": null,
      "officialSenseId": null,
      "sensePos": "adv.",
      "targetMeaningZh": "臨時地",
      "chapterMeaningsZh": "臨時地",
      "sourcePage": 107,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "似",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V048",
      "kind": "vocabulary",
      "displayWord": "permanently",
      "lexemeRef": "permanently",
      "officialWordId": null,
      "officialSenseId": null,
      "sensePos": "adv.",
      "targetMeaningZh": "永久地",
      "chapterMeaningsZh": "永久地",
      "sourcePage": 107,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "反",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V049",
      "kind": "vocabulary",
      "displayWord": "servant",
      "lexemeRef": "W001778",
      "officialWordId": "W001778",
      "officialSenseId": null,
      "sensePos": "n.",
      "targetMeaningZh": "僕人",
      "chapterMeaningsZh": "僕人",
      "sourcePage": 107,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "似",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V050",
      "kind": "vocabulary",
      "displayWord": "relieved",
      "lexemeRef": "relieved",
      "officialWordId": null,
      "officialSenseId": null,
      "sensePos": "adj.",
      "targetMeaningZh": "舒緩的",
      "chapterMeaningsZh": "舒緩的",
      "sourcePage": 107,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "*",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V051",
      "kind": "vocabulary",
      "displayWord": "butler",
      "lexemeRef": "butler",
      "officialWordId": null,
      "officialSenseId": null,
      "sensePos": "n.",
      "targetMeaningZh": "男管家",
      "chapterMeaningsZh": "男管家",
      "sourcePage": 107,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "*",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V052",
      "kind": "vocabulary",
      "displayWord": "luxurious",
      "lexemeRef": "W003613",
      "officialWordId": "W003613",
      "officialSenseId": null,
      "sensePos": "adj.",
      "targetMeaningZh": "豪華的；奢侈的",
      "chapterMeaningsZh": "豪華的；奢侈的",
      "sourcePage": 107,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "*",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V053",
      "kind": "vocabulary",
      "displayWord": "resistant",
      "lexemeRef": "W005769",
      "officialWordId": "W005769",
      "officialSenseId": null,
      "sensePos": "adj.",
      "targetMeaningZh": "抵抗的",
      "chapterMeaningsZh": "抵抗的",
      "sourcePage": 108,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "衍",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V054",
      "kind": "vocabulary",
      "displayWord": "resistance",
      "lexemeRef": "W003849",
      "officialWordId": "W003849",
      "officialSenseId": null,
      "sensePos": "n.",
      "targetMeaningZh": "抵抗",
      "chapterMeaningsZh": "抵抗",
      "sourcePage": 108,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "衍",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V055",
      "kind": "vocabulary",
      "displayWord": "guide",
      "lexemeRef": "W001419",
      "officialWordId": "W001419",
      "officialSenseId": null,
      "sensePos": "vt.",
      "targetMeaningZh": "引導",
      "chapterMeaningsZh": "引導",
      "sourcePage": 108,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "衍",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V056",
      "kind": "vocabulary",
      "displayWord": "instruction",
      "lexemeRef": "W001469",
      "officialWordId": "W001469",
      "officialSenseId": null,
      "sensePos": "n.",
      "targetMeaningZh": "教導",
      "chapterMeaningsZh": "教導",
      "sourcePage": 108,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "似",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V057",
      "kind": "vocabulary",
      "displayWord": "accuracy",
      "lexemeRef": "W003019",
      "officialWordId": "W003019",
      "officialSenseId": null,
      "sensePos": "n.",
      "targetMeaningZh": "準確性",
      "chapterMeaningsZh": "準確性",
      "sourcePage": 108,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "衍",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V058",
      "kind": "vocabulary",
      "displayWord": "precise",
      "lexemeRef": "W003760",
      "officialWordId": "W003760",
      "officialSenseId": null,
      "sensePos": "adj.",
      "targetMeaningZh": "精確的",
      "chapterMeaningsZh": "精確的",
      "sourcePage": 108,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "似",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V059",
      "kind": "vocabulary",
      "displayWord": "inaccurate",
      "lexemeRef": "inaccurate",
      "officialWordId": null,
      "officialSenseId": null,
      "sensePos": "adj.",
      "targetMeaningZh": "不精確的",
      "chapterMeaningsZh": "不精確的",
      "sourcePage": 108,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "反",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V060",
      "kind": "vocabulary",
      "displayWord": "contest",
      "lexemeRef": "W003209",
      "officialWordId": "W003209",
      "officialSenseId": null,
      "sensePos": "n.",
      "targetMeaningZh": "比賽；競賽",
      "chapterMeaningsZh": "比賽；競賽",
      "sourcePage": 108,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "*",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V061",
      "kind": "vocabulary",
      "displayWord": "throw",
      "lexemeRef": "W000889",
      "officialWordId": "W000889",
      "officialSenseId": null,
      "sensePos": "vt.",
      "targetMeaningZh": "投；擲",
      "chapterMeaningsZh": "投；擲",
      "sourcePage": 109,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "似",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V062",
      "kind": "vocabulary",
      "displayWord": "crumple",
      "lexemeRef": "crumple",
      "officialWordId": null,
      "officialSenseId": null,
      "sensePos": "vt.",
      "targetMeaningZh": "弄皺",
      "chapterMeaningsZh": "弄皺",
      "sourcePage": 109,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "*",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V063",
      "kind": "vocabulary",
      "displayWord": "venue",
      "lexemeRef": "W004968",
      "officialWordId": "W004968",
      "officialSenseId": null,
      "sensePos": "n.",
      "targetMeaningZh": "地點",
      "chapterMeaningsZh": "地點",
      "sourcePage": 109,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "*",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V064",
      "kind": "vocabulary",
      "displayWord": "reservation",
      "lexemeRef": "W003846",
      "officialWordId": "W003846",
      "officialSenseId": null,
      "sensePos": "n.",
      "targetMeaningZh": "預訂",
      "chapterMeaningsZh": "預訂",
      "sourcePage": 109,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "衍",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V065",
      "kind": "vocabulary",
      "displayWord": "reservoir",
      "lexemeRef": "W004732",
      "officialWordId": "W004732",
      "officialSenseId": null,
      "sensePos": "n.",
      "targetMeaningZh": "水庫",
      "chapterMeaningsZh": "水庫",
      "sourcePage": 109,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "衍",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V066",
      "kind": "vocabulary",
      "displayWord": "preserve",
      "lexemeRef": "W003767",
      "officialWordId": "W003767",
      "officialSenseId": null,
      "sensePos": "vt./n.",
      "targetMeaningZh": "保護；保存；果醬；蜜餞（常用複數）",
      "chapterMeaningsZh": "保護；保存；果醬；蜜餞（常用複數）",
      "sourcePage": 109,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "似",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V067",
      "kind": "vocabulary",
      "displayWord": "prohibit",
      "lexemeRef": "W004676",
      "officialWordId": "W004676",
      "officialSenseId": null,
      "sensePos": "vt.",
      "targetMeaningZh": "禁止",
      "chapterMeaningsZh": "禁止",
      "sourcePage": 109,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "*",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V068",
      "kind": "vocabulary",
      "displayWord": "grudge",
      "lexemeRef": "grudge",
      "officialWordId": null,
      "officialSenseId": null,
      "sensePos": "n.",
      "targetMeaningZh": "怨恨",
      "chapterMeaningsZh": "怨恨",
      "sourcePage": 110,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "*",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V069",
      "kind": "vocabulary",
      "displayWord": "port",
      "lexemeRef": "W001650",
      "officialWordId": "W001650",
      "officialSenseId": null,
      "sensePos": "n.",
      "targetMeaningZh": "港口",
      "chapterMeaningsZh": "港口",
      "sourcePage": 110,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "似",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V070",
      "kind": "vocabulary",
      "displayWord": "outlaw",
      "lexemeRef": "W005635",
      "officialWordId": "W005635",
      "officialSenseId": null,
      "sensePos": "n.",
      "targetMeaningZh": "亡命之徒",
      "chapterMeaningsZh": "亡命之徒",
      "sourcePage": 110,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "*",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V071",
      "kind": "vocabulary",
      "displayWord": "quarrel",
      "lexemeRef": "W003800",
      "officialWordId": "W003800",
      "officialSenseId": null,
      "sensePos": "vi.",
      "targetMeaningZh": "爭吵",
      "chapterMeaningsZh": "爭吵",
      "sourcePage": 110,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "*",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V072",
      "kind": "vocabulary",
      "displayWord": "wharf",
      "lexemeRef": "W005998",
      "officialWordId": "W005998",
      "officialSenseId": null,
      "sensePos": "n.",
      "targetMeaningZh": "碼頭",
      "chapterMeaningsZh": "碼頭",
      "sourcePage": 110,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "似",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V073",
      "kind": "vocabulary",
      "displayWord": "track",
      "lexemeRef": "W001921",
      "officialWordId": "W001921",
      "officialSenseId": null,
      "sensePos": "vt.",
      "targetMeaningZh": "跟蹤",
      "chapterMeaningsZh": "跟蹤",
      "sourcePage": 110,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "似",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V074",
      "kind": "vocabulary",
      "displayWord": "path",
      "lexemeRef": "W001620",
      "officialWordId": "W001620",
      "officialSenseId": null,
      "sensePos": "n.",
      "targetMeaningZh": "小徑",
      "chapterMeaningsZh": "小徑",
      "sourcePage": 110,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "似",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V075",
      "kind": "vocabulary",
      "displayWord": "tug",
      "lexemeRef": "W002941",
      "officialWordId": "W002941",
      "officialSenseId": null,
      "sensePos": "vt.",
      "targetMeaningZh": "拖；拉",
      "chapterMeaningsZh": "拖；拉",
      "sourcePage": 110,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "*",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V076",
      "kind": "vocabulary",
      "displayWord": "foggiest",
      "lexemeRef": "foggiest",
      "officialWordId": null,
      "officialSenseId": null,
      "sensePos": "adj.",
      "targetMeaningZh": "最模糊的",
      "chapterMeaningsZh": "最模糊的",
      "sourcePage": 110,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "*",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V077",
      "kind": "vocabulary",
      "displayWord": "track",
      "lexemeRef": "W001921",
      "officialWordId": "W001921",
      "officialSenseId": null,
      "sensePos": "vt./n.",
      "targetMeaningZh": "追蹤；小徑；軌道",
      "chapterMeaningsZh": "追蹤；小徑；軌道",
      "sourcePage": 111,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "比",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V078",
      "kind": "vocabulary",
      "displayWord": "ancestor",
      "lexemeRef": "W003046",
      "officialWordId": "W003046",
      "officialSenseId": null,
      "sensePos": "n.",
      "targetMeaningZh": "祖先",
      "chapterMeaningsZh": "祖先",
      "sourcePage": 111,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "*",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V079",
      "kind": "vocabulary",
      "displayWord": "lean",
      "lexemeRef": "W003588",
      "officialWordId": "W003588",
      "officialSenseId": null,
      "sensePos": "vi.",
      "targetMeaningZh": "倚；靠",
      "chapterMeaningsZh": "倚；靠",
      "sourcePage": 111,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "*",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V080",
      "kind": "vocabulary",
      "displayWord": "progressively",
      "lexemeRef": "progressively",
      "officialWordId": null,
      "officialSenseId": null,
      "sensePos": "adv.",
      "targetMeaningZh": "不斷地",
      "chapterMeaningsZh": "不斷地",
      "sourcePage": 111,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "似",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V081",
      "kind": "vocabulary",
      "displayWord": "gradually",
      "lexemeRef": "gradually",
      "officialWordId": null,
      "officialSenseId": null,
      "sensePos": "adv.",
      "targetMeaningZh": "漸漸地",
      "chapterMeaningsZh": "漸漸地",
      "sourcePage": 111,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "似",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V082",
      "kind": "vocabulary",
      "displayWord": "critical",
      "lexemeRef": "W003243",
      "officialWordId": "W003243",
      "officialSenseId": null,
      "sensePos": "adj.",
      "targetMeaningZh": "危急的",
      "chapterMeaningsZh": "危急的",
      "sourcePage": 112,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "*",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V083",
      "kind": "vocabulary",
      "displayWord": "stabilize",
      "lexemeRef": "W005864",
      "officialWordId": "W005864",
      "officialSenseId": null,
      "sensePos": "vt.",
      "targetMeaningZh": "使穩定",
      "chapterMeaningsZh": "使穩定",
      "sourcePage": 112,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "衍",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V084",
      "kind": "vocabulary",
      "displayWord": "injure",
      "lexemeRef": "W003538",
      "officialWordId": "W003538",
      "officialSenseId": null,
      "sensePos": "vt.",
      "targetMeaningZh": "使受傷",
      "chapterMeaningsZh": "使受傷",
      "sourcePage": 112,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "衍",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V085",
      "kind": "vocabulary",
      "displayWord": "scandal",
      "lexemeRef": "W004762",
      "officialWordId": "W004762",
      "officialSenseId": null,
      "sensePos": "n.",
      "targetMeaningZh": "醜聞",
      "chapterMeaningsZh": "醜聞",
      "sourcePage": 112,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "*",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V086",
      "kind": "vocabulary",
      "displayWord": "reputation",
      "lexemeRef": "W003841",
      "officialWordId": "W003841",
      "officialSenseId": null,
      "sensePos": "n.",
      "targetMeaningZh": "名譽；名聲",
      "chapterMeaningsZh": "名譽；名聲",
      "sourcePage": 112,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "*",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V087",
      "kind": "vocabulary",
      "displayWord": "deal",
      "lexemeRef": "W000216",
      "officialWordId": "W000216",
      "officialSenseId": null,
      "sensePos": "vi./n.",
      "targetMeaningZh": "交易",
      "chapterMeaningsZh": "交易",
      "sourcePage": 112,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "衍",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V088",
      "kind": "vocabulary",
      "displayWord": "merchant",
      "lexemeRef": "W003633",
      "officialWordId": "W003633",
      "officialSenseId": null,
      "sensePos": "n.",
      "targetMeaningZh": "商人",
      "chapterMeaningsZh": "商人",
      "sourcePage": 112,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "似",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V089",
      "kind": "vocabulary",
      "displayWord": "antique",
      "lexemeRef": "W004055",
      "officialWordId": "W004055",
      "officialSenseId": null,
      "sensePos": "n.",
      "targetMeaningZh": "古董；古玩",
      "chapterMeaningsZh": "古董；古玩",
      "sourcePage": 112,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "*",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V090",
      "kind": "vocabulary",
      "displayWord": "trade",
      "lexemeRef": "W001922",
      "officialWordId": "W001922",
      "officialSenseId": null,
      "sensePos": "n.",
      "targetMeaningZh": "交易",
      "chapterMeaningsZh": "交易",
      "sourcePage": 112,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "衍",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V091",
      "kind": "vocabulary",
      "displayWord": "admirable",
      "lexemeRef": "W003028",
      "officialWordId": "W003028",
      "officialSenseId": null,
      "sensePos": "adj.",
      "targetMeaningZh": "值得讚賞的",
      "chapterMeaningsZh": "值得讚賞的",
      "sourcePage": 112,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "衍",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V092",
      "kind": "vocabulary",
      "displayWord": "admiration",
      "lexemeRef": "W003029",
      "officialWordId": "W003029",
      "officialSenseId": null,
      "sensePos": "n.",
      "targetMeaningZh": "欽佩；羨慕",
      "chapterMeaningsZh": "欽佩；羨慕",
      "sourcePage": 112,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "衍",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V093",
      "kind": "vocabulary",
      "displayWord": "proficiency",
      "lexemeRef": "W005710",
      "officialWordId": "W005710",
      "officialSenseId": null,
      "sensePos": "n.",
      "targetMeaningZh": "精通",
      "chapterMeaningsZh": "精通",
      "sourcePage": 112,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "*",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V094",
      "kind": "vocabulary",
      "displayWord": "appreciate",
      "lexemeRef": "W001044",
      "officialWordId": "W001044",
      "officialSenseId": null,
      "sensePos": "vt.",
      "targetMeaningZh": "欣賞",
      "chapterMeaningsZh": "欣賞",
      "sourcePage": 113,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "似",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V095",
      "kind": "vocabulary",
      "displayWord": "cliff",
      "lexemeRef": "W003156",
      "officialWordId": "W003156",
      "officialSenseId": null,
      "sensePos": "n.",
      "targetMeaningZh": "懸崖",
      "chapterMeaningsZh": "懸崖",
      "sourcePage": 113,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "*",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V096",
      "kind": "vocabulary",
      "displayWord": "gracefully",
      "lexemeRef": "gracefully",
      "officialWordId": null,
      "officialSenseId": null,
      "sensePos": "adv.",
      "targetMeaningZh": "優雅地",
      "chapterMeaningsZh": "優雅地",
      "sourcePage": 113,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "*",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V097",
      "kind": "vocabulary",
      "displayWord": "satisfy",
      "lexemeRef": "W001753",
      "officialWordId": "W001753",
      "officialSenseId": null,
      "sensePos": "vt.",
      "targetMeaningZh": "使滿足；符合（要求、條件）",
      "chapterMeaningsZh": "使滿足；符合（要求、條件）",
      "sourcePage": 113,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "衍",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V098",
      "kind": "vocabulary",
      "displayWord": "satisfying",
      "lexemeRef": "satisfying",
      "officialWordId": null,
      "officialSenseId": null,
      "sensePos": "adj.",
      "targetMeaningZh": "令人愉悅的；令人飽足的",
      "chapterMeaningsZh": "令人愉悅的；令人飽足的",
      "sourcePage": 113,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "衍",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V099",
      "kind": "vocabulary",
      "displayWord": "satisfied",
      "lexemeRef": "satisfied",
      "officialWordId": null,
      "officialSenseId": null,
      "sensePos": "adj.",
      "targetMeaningZh": "感到滿意的",
      "chapterMeaningsZh": "感到滿意的",
      "sourcePage": 113,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "衍",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V100",
      "kind": "vocabulary",
      "displayWord": "satisfaction",
      "lexemeRef": "W003877",
      "officialWordId": "W003877",
      "officialSenseId": null,
      "sensePos": "n.",
      "targetMeaningZh": "滿足；滿意",
      "chapterMeaningsZh": "滿足；滿意",
      "sourcePage": 113,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "衍",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V101",
      "kind": "vocabulary",
      "displayWord": "sensation",
      "lexemeRef": "W004775",
      "officialWordId": "W004775",
      "officialSenseId": null,
      "sensePos": "n.",
      "targetMeaningZh": "轟動",
      "chapterMeaningsZh": "轟動",
      "sourcePage": 114,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "*",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V102",
      "kind": "vocabulary",
      "displayWord": "bathe",
      "lexemeRef": "W001078",
      "officialWordId": "W001078",
      "officialSenseId": null,
      "sensePos": "vt.",
      "targetMeaningZh": "為……洗澡",
      "chapterMeaningsZh": "為……洗澡",
      "sourcePage": 114,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "*",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V103",
      "kind": "vocabulary",
      "displayWord": "debut",
      "lexemeRef": "W004264",
      "officialWordId": "W004264",
      "officialSenseId": null,
      "sensePos": "n.",
      "targetMeaningZh": "初次露面",
      "chapterMeaningsZh": "初次露面",
      "sourcePage": 114,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "*",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V104",
      "kind": "vocabulary",
      "displayWord": "impressive",
      "lexemeRef": "W001452",
      "officialWordId": "W001452",
      "officialSenseId": null,
      "sensePos": "adj.",
      "targetMeaningZh": "令人印象深刻的",
      "chapterMeaningsZh": "令人印象深刻的",
      "sourcePage": 114,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "衍",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V105",
      "kind": "vocabulary",
      "displayWord": "impression",
      "lexemeRef": "W003526",
      "officialWordId": "W003526",
      "officialSenseId": null,
      "sensePos": "n.",
      "targetMeaningZh": "印象；想法；感覺；痕跡",
      "chapterMeaningsZh": "印象；想法；感覺；痕跡",
      "sourcePage": 114,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "衍",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V106",
      "kind": "vocabulary",
      "displayWord": "boulevard",
      "lexemeRef": "W005103",
      "officialWordId": "W005103",
      "officialSenseId": null,
      "sensePos": "n.",
      "targetMeaningZh": "林蔭大道",
      "chapterMeaningsZh": "林蔭大道",
      "sourcePage": 114,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "*",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V107",
      "kind": "vocabulary",
      "displayWord": "bucket",
      "lexemeRef": "W002107",
      "officialWordId": "W002107",
      "officialSenseId": null,
      "sensePos": "n.",
      "targetMeaningZh": "桶子；小桶",
      "chapterMeaningsZh": "桶子；小桶",
      "sourcePage": 114,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "*",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V108",
      "kind": "vocabulary",
      "displayWord": "diversity",
      "lexemeRef": "W003316",
      "officialWordId": "W003316",
      "officialSenseId": null,
      "sensePos": "n.",
      "targetMeaningZh": "多樣性",
      "chapterMeaningsZh": "多樣性",
      "sourcePage": 115,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "*",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V109",
      "kind": "vocabulary",
      "displayWord": "colonial",
      "lexemeRef": "W004164",
      "officialWordId": "W004164",
      "officialSenseId": null,
      "sensePos": "adj.",
      "targetMeaningZh": "殖民地的；殖民的",
      "chapterMeaningsZh": "殖民地的；殖民的",
      "sourcePage": 116,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "衍",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V110",
      "kind": "vocabulary",
      "displayWord": "colonize",
      "lexemeRef": "colonize",
      "officialWordId": null,
      "officialSenseId": null,
      "sensePos": "vt.",
      "targetMeaningZh": "將……開拓為殖民地",
      "chapterMeaningsZh": "將……開拓為殖民地",
      "sourcePage": 116,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "衍",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V111",
      "kind": "vocabulary",
      "displayWord": "effective",
      "lexemeRef": "W001297",
      "officialWordId": "W001297",
      "officialSenseId": null,
      "sensePos": "adj.",
      "targetMeaningZh": "有效的",
      "chapterMeaningsZh": "有效的",
      "sourcePage": 116,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "比",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V112",
      "kind": "vocabulary",
      "displayWord": "consume",
      "lexemeRef": "W003204",
      "officialWordId": "W003204",
      "officialSenseId": null,
      "sensePos": "vt.",
      "targetMeaningZh": "消耗",
      "chapterMeaningsZh": "消耗",
      "sourcePage": 116,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "*",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V113",
      "kind": "vocabulary",
      "displayWord": "decayed",
      "lexemeRef": "decayed",
      "officialWordId": null,
      "officialSenseId": null,
      "sensePos": "adj.",
      "targetMeaningZh": "腐壞的",
      "chapterMeaningsZh": "腐壞的",
      "sourcePage": 116,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "似",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V114",
      "kind": "vocabulary",
      "displayWord": "flat",
      "lexemeRef": "W001363",
      "officialWordId": "W001363",
      "officialSenseId": null,
      "sensePos": "adj.",
      "targetMeaningZh": "單調的",
      "chapterMeaningsZh": "單調的",
      "sourcePage": 116,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "似",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V115",
      "kind": "vocabulary",
      "displayWord": "boring",
      "lexemeRef": "W000104",
      "officialWordId": "W000104",
      "officialSenseId": null,
      "sensePos": "adj.",
      "targetMeaningZh": "令人無聊的",
      "chapterMeaningsZh": "令人無聊的",
      "sourcePage": 116,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "似",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V116",
      "kind": "vocabulary",
      "displayWord": "fresh",
      "lexemeRef": "W000329",
      "officialWordId": "W000329",
      "officialSenseId": null,
      "sensePos": "adj.",
      "targetMeaningZh": "新鮮的",
      "chapterMeaningsZh": "新鮮的",
      "sourcePage": 116,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "反",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V117",
      "kind": "vocabulary",
      "displayWord": "consul",
      "lexemeRef": "consul",
      "officialWordId": null,
      "officialSenseId": null,
      "sensePos": "n.",
      "targetMeaningZh": "領事",
      "chapterMeaningsZh": "領事",
      "sourcePage": 117,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "似",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V118",
      "kind": "vocabulary",
      "displayWord": "diplomat",
      "lexemeRef": "W003296",
      "officialWordId": "W003296",
      "officialSenseId": null,
      "sensePos": "n.",
      "targetMeaningZh": "外交官",
      "chapterMeaningsZh": "外交官",
      "sourcePage": 117,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "似",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V119",
      "kind": "vocabulary",
      "displayWord": "embassy",
      "lexemeRef": "W003347",
      "officialWordId": "W003347",
      "officialSenseId": null,
      "sensePos": "n.",
      "targetMeaningZh": "大使館",
      "chapterMeaningsZh": "大使館",
      "sourcePage": 117,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "衍",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V120",
      "kind": "vocabulary",
      "displayWord": "alphabetical",
      "lexemeRef": "alphabetical",
      "officialWordId": null,
      "officialSenseId": null,
      "sensePos": "adj.",
      "targetMeaningZh": "按字母順序的",
      "chapterMeaningsZh": "按字母順序的",
      "sourcePage": 117,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "衍",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V121",
      "kind": "vocabulary",
      "displayWord": "crabbed",
      "lexemeRef": "crabbed",
      "officialWordId": null,
      "officialSenseId": null,
      "sensePos": "adj.",
      "targetMeaningZh": "（字跡）潦草難讀的",
      "chapterMeaningsZh": "（字跡）潦草難讀的",
      "sourcePage": 117,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "衍",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V122",
      "kind": "vocabulary",
      "displayWord": "globe",
      "lexemeRef": "W003455",
      "officialWordId": "W003455",
      "officialSenseId": null,
      "sensePos": "n.",
      "targetMeaningZh": "地球儀；地球",
      "chapterMeaningsZh": "地球儀；地球",
      "sourcePage": 117,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "衍",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V123",
      "kind": "vocabulary",
      "displayWord": "fog",
      "lexemeRef": "W001368",
      "officialWordId": "W001368",
      "officialSenseId": null,
      "sensePos": "n.",
      "targetMeaningZh": "霧",
      "chapterMeaningsZh": "霧",
      "sourcePage": 117,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "衍",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V124",
      "kind": "vocabulary",
      "displayWord": "sunny",
      "lexemeRef": "W000843",
      "officialWordId": "W000843",
      "officialSenseId": null,
      "sensePos": "adj.",
      "targetMeaningZh": "晴朗的",
      "chapterMeaningsZh": "晴朗的",
      "sourcePage": 117,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "延伸",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V125",
      "kind": "vocabulary",
      "displayWord": "cloudy",
      "lexemeRef": "W001169",
      "officialWordId": "W001169",
      "officialSenseId": null,
      "sensePos": "adj.",
      "targetMeaningZh": "多雲的；陰的",
      "chapterMeaningsZh": "多雲的；陰的",
      "sourcePage": 117,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "延伸",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V126",
      "kind": "vocabulary",
      "displayWord": "rainy",
      "lexemeRef": "W000697",
      "officialWordId": "W000697",
      "officialSenseId": null,
      "sensePos": "adj.",
      "targetMeaningZh": "下雨的",
      "chapterMeaningsZh": "下雨的",
      "sourcePage": 117,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "延伸",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V127",
      "kind": "vocabulary",
      "displayWord": "snowy",
      "lexemeRef": "W001813",
      "officialWordId": "W001813",
      "officialSenseId": null,
      "sensePos": "adj.",
      "targetMeaningZh": "下雪的",
      "chapterMeaningsZh": "下雪的",
      "sourcePage": 117,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "延伸",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V128",
      "kind": "vocabulary",
      "displayWord": "windy",
      "lexemeRef": "W001986",
      "officialWordId": "W001986",
      "officialSenseId": null,
      "sensePos": "adj.",
      "targetMeaningZh": "多風的",
      "chapterMeaningsZh": "多風的",
      "sourcePage": 117,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "延伸",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V129",
      "kind": "vocabulary",
      "displayWord": "stupid",
      "lexemeRef": "W000838",
      "officialWordId": "W000838",
      "officialSenseId": null,
      "sensePos": "adj.",
      "targetMeaningZh": "愚蠢的",
      "chapterMeaningsZh": "愚蠢的",
      "sourcePage": 117,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "似",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V130",
      "kind": "vocabulary",
      "displayWord": "mute",
      "lexemeRef": "W005591",
      "officialWordId": "W005591",
      "officialSenseId": null,
      "sensePos": "adj.",
      "targetMeaningZh": "啞的",
      "chapterMeaningsZh": "啞的",
      "sourcePage": 117,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "似",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V131",
      "kind": "vocabulary",
      "displayWord": "blind",
      "lexemeRef": "W000096",
      "officialWordId": "W000096",
      "officialSenseId": null,
      "sensePos": "adj.",
      "targetMeaningZh": "盲的",
      "chapterMeaningsZh": "盲的",
      "sourcePage": 118,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "延伸",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V132",
      "kind": "vocabulary",
      "displayWord": "deaf",
      "lexemeRef": "W001228",
      "officialWordId": "W001228",
      "officialSenseId": null,
      "sensePos": "adj.",
      "targetMeaningZh": "失聰的",
      "chapterMeaningsZh": "失聰的",
      "sourcePage": 118,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "延伸",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V133",
      "kind": "vocabulary",
      "displayWord": "pumper",
      "lexemeRef": "pumper",
      "officialWordId": null,
      "officialSenseId": null,
      "sensePos": "n.",
      "targetMeaningZh": "抽水機",
      "chapterMeaningsZh": "抽水機",
      "sourcePage": 118,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "衍",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V134",
      "kind": "vocabulary",
      "displayWord": "add",
      "lexemeRef": "W000011",
      "officialWordId": "W000011",
      "officialSenseId": null,
      "sensePos": "vt.",
      "targetMeaningZh": "增加",
      "chapterMeaningsZh": "增加",
      "sourcePage": 118,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "反",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V135",
      "kind": "vocabulary",
      "displayWord": "plus",
      "lexemeRef": "W001640",
      "officialWordId": "W001640",
      "officialSenseId": null,
      "sensePos": "prep.",
      "targetMeaningZh": "（算數）加",
      "chapterMeaningsZh": "（算數）加",
      "sourcePage": 118,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "反",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V136",
      "kind": "vocabulary",
      "displayWord": "times",
      "lexemeRef": "times",
      "officialWordId": null,
      "officialSenseId": null,
      "sensePos": "prep./vt.",
      "targetMeaningZh": "數字相乘",
      "chapterMeaningsZh": "數字相乘",
      "sourcePage": 118,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "似",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-V137",
      "kind": "vocabulary",
      "displayWord": "divide",
      "lexemeRef": "W001269",
      "officialWordId": "W001269",
      "officialSenseId": null,
      "sensePos": "vt.",
      "targetMeaningZh": "除以",
      "chapterMeaningsZh": "除以",
      "sourcePage": 118,
      "printedNumber": null,
      "sourceRole": "printed_related_word",
      "printedLabel": "反",
      "meaningSource": "textbook_source_review",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-G001",
      "kind": "grammar",
      "sourcePage": 107,
      "pattern": "forever and a day（誇大用法）",
      "explanationZh": "forever and a day 是誇大說法，表示永遠、長長久久；原書註記只寫加 a day，同頁例句顯示完整片語含 and。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-G002",
      "kind": "grammar",
      "sourcePage": 107,
      "pattern": "forever = for good = permanently（常置句尾，修飾之前的動詞）",
      "explanationZh": "此處 forever、for good 與 permanently 都表示永遠、永久地；原書說它們在這個用法中多置於句尾修飾動詞。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-G003",
      "kind": "grammar",
      "sourcePage": 107,
      "pattern": "on a temporary basis",
      "explanationZh": "on a temporary basis 表示暫時地。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-G004",
      "kind": "grammar",
      "sourcePage": 107,
      "pattern": "on a temporary basis = temporarily",
      "explanationZh": "on a temporary basis 與 temporarily 在此都表示暫時地。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-G005",
      "kind": "grammar",
      "sourcePage": 108,
      "pattern": "cannot resist + V-ing",
      "explanationZh": "cannot resist + V-ing 表示忍不住做某事，resist 後接動名詞。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-G006",
      "kind": "grammar",
      "sourcePage": 108,
      "pattern": "cannot help + V-ing",
      "explanationZh": "cannot help + V-ing 表示忍不住做某事，help 後接動名詞。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-G007",
      "kind": "grammar",
      "sourcePage": 108,
      "pattern": "cannot help but + V",
      "explanationZh": "cannot help but + V 表示忍不住做某事，but 後接原形動詞。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-G008",
      "kind": "grammar",
      "sourcePage": 108,
      "pattern": "be resistant to sth",
      "explanationZh": "be resistant to sth 表示抗拒某物。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-G009",
      "kind": "grammar",
      "sourcePage": 108,
      "pattern": "under sb's guidance",
      "explanationZh": "under sb's guidance 表示在某人的指導下。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-G010",
      "kind": "grammar",
      "sourcePage": 108,
      "pattern": "for the sake of...",
      "explanationZh": "for the sake of... 表示為了……的緣故。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-G011",
      "kind": "grammar",
      "sourcePage": 108,
      "pattern": "for sb's sake",
      "explanationZh": "for sb's sake 表示為了某人的緣故。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-G012",
      "kind": "grammar",
      "sourcePage": 109,
      "pattern": "toss and turn",
      "explanationZh": "toss and turn 表示輾轉難眠。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-G013",
      "kind": "grammar",
      "sourcePage": 109,
      "pattern": "a toss of a coin",
      "explanationZh": "a toss of a coin 指擲硬幣作決定。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-G014",
      "kind": "grammar",
      "sourcePage": 109,
      "pattern": "keep sth in reserve",
      "explanationZh": "keep sth in reserve 表示儲備某物，以備需要時使用。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-G015",
      "kind": "grammar",
      "sourcePage": 109,
      "pattern": "a harbor city = a port city",
      "explanationZh": "a harbor city 與 a port city 都指港都、港口城市。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-G016",
      "kind": "grammar",
      "sourcePage": 110,
      "pattern": "harbor a grudge against sb",
      "explanationZh": "harbor a grudge against sb 表示對某人懷恨。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-G017",
      "kind": "grammar",
      "sourcePage": 110,
      "pattern": "bear a grudge against sb",
      "explanationZh": "bear a grudge against sb 與 harbor a grudge against sb 都表示對某人懷恨。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-G018",
      "kind": "grammar",
      "sourcePage": 110,
      "pattern": "in dock",
      "explanationZh": "in dock 在此表示船停靠碼頭。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-G019",
      "kind": "grammar",
      "sourcePage": 110,
      "pattern": "dock sb's pay / wages / salary",
      "explanationZh": "dock sb's pay / wages / salary 表示扣減某人的薪資。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-G020",
      "kind": "grammar",
      "sourcePage": 110,
      "pattern": "wharf（複數為 wharves）",
      "explanationZh": "原書列出的 wharf 複數形式為 wharves。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-G021",
      "kind": "grammar",
      "sourcePage": 110,
      "pattern": "trail sb to + 地方",
      "explanationZh": "trail sb to + 地方 表示跟蹤某人到某地。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-G022",
      "kind": "grammar",
      "sourcePage": 110,
      "pattern": "track sb to + 地方",
      "explanationZh": "track sb to + 地方 在此表示跟蹤某人到某地。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-G023",
      "kind": "grammar",
      "sourcePage": 110,
      "pattern": "follow sb to + 地方",
      "explanationZh": "follow sb to + 地方 在此表示跟隨某人到某地。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-G024",
      "kind": "grammar",
      "sourcePage": 110,
      "pattern": "feel faint",
      "explanationZh": "feel faint 表示感到暈眩、快要昏倒。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-G025",
      "kind": "grammar",
      "sourcePage": 110,
      "pattern": "feel dizzy",
      "explanationZh": "feel dizzy 表示感到暈眩。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-G026",
      "kind": "grammar",
      "sourcePage": 110,
      "pattern": "not have the faintest idea",
      "explanationZh": "not have the faintest idea 表示毫不知情、一點也不知道。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-G027",
      "kind": "grammar",
      "sourcePage": 110,
      "pattern": "not have the foggiest idea",
      "explanationZh": "not have the foggiest idea 表示毫不知情、一點也不知道。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-G028",
      "kind": "grammar",
      "sourcePage": 110,
      "pattern": "not have the slightest idea",
      "explanationZh": "not have the slightest idea 表示毫不知情、一點也不知道。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-G029",
      "kind": "grammar",
      "sourcePage": 110,
      "pattern": "have no idea",
      "explanationZh": "have no idea 表示不知道、毫不知情。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-G030",
      "kind": "grammar",
      "sourcePage": 111,
      "pattern": "pass out",
      "explanationZh": "pass out 在本頁是昏倒的意思。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-G031",
      "kind": "grammar",
      "sourcePage": 111,
      "pattern": "disappear without a trace",
      "explanationZh": "disappear without a trace 表示消失得無影無蹤。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-G032",
      "kind": "grammar",
      "sourcePage": 111,
      "pattern": "steady, steadied, steadied",
      "explanationZh": "原書所列 steady 的動詞三態為 steady（原形）、steadied（過去式）、steadied（過去分詞）。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-G033",
      "kind": "grammar",
      "sourcePage": 111,
      "pattern": "go steady（常與介詞 with 並用）",
      "explanationZh": "原書以 go steady 表示穩定交往；與 with 並用時，後面接交往對象。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-G034",
      "kind": "grammar",
      "sourcePage": 112,
      "pattern": "be in stable / critical condition",
      "explanationZh": "be in stable condition 表示病人情況穩定；be in critical condition 表示病人情況危急。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-G035",
      "kind": "grammar",
      "sourcePage": 112,
      "pattern": "injury（複數為 injuries）",
      "explanationZh": "injury 表示身體傷害時可數，複數為 injuries；原書另列名譽損壞義為不可數。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-G036",
      "kind": "grammar",
      "sourcePage": 112,
      "pattern": "recover from...",
      "explanationZh": "recover from... 表示從……恢復、康復。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-G037",
      "kind": "grammar",
      "sourcePage": 112,
      "pattern": "a car dealer",
      "explanationZh": "a car dealer 指汽車商。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-G038",
      "kind": "grammar",
      "sourcePage": 112,
      "pattern": "an antique dealer",
      "explanationZh": "an antique dealer 指古董商。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-G039",
      "kind": "grammar",
      "sourcePage": 112,
      "pattern": "deal in used cars = buy and sell used cars",
      "explanationZh": "deal in used cars 表示買賣中古汽車，相當於 buy and sell used cars。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-G040",
      "kind": "grammar",
      "sourcePage": 112,
      "pattern": "admire sb for sth",
      "explanationZh": "admire sb for sth 表示因某事物而欣賞、欽佩某人。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-G041",
      "kind": "grammar",
      "sourcePage": 113,
      "pattern": "think highly of...",
      "explanationZh": "think highly of... 表示看得起、對……評價很高。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-G042",
      "kind": "grammar",
      "sourcePage": 113,
      "pattern": "hard on one's heels",
      "explanationZh": "hard on one's heels 表示緊跟某人、緊追不捨。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-G043",
      "kind": "grammar",
      "sourcePage": 113,
      "pattern": "high heels",
      "explanationZh": "high heels 指高跟鞋。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-G044",
      "kind": "grammar",
      "sourcePage": 113,
      "pattern": "a pair of high heels",
      "explanationZh": "a pair of high heels 指一雙高跟鞋。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-G045",
      "kind": "grammar",
      "sourcePage": 113,
      "pattern": "be satisfied with...",
      "explanationZh": "be satisfied with... 表示對……感到滿意。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-G046",
      "kind": "grammar",
      "sourcePage": 114,
      "pattern": "splash water on sb",
      "explanationZh": "splash water on sb 表示把水潑到某人身上。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-G047",
      "kind": "grammar",
      "sourcePage": 114,
      "pattern": "splash about / around",
      "explanationZh": "splash about / around 表示到處潑水、戲水。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-G048",
      "kind": "grammar",
      "sourcePage": 114,
      "pattern": "make a splash = cause a sensation",
      "explanationZh": "make a splash 在此比喻引起轟動，相當於 cause a sensation。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-G049",
      "kind": "grammar",
      "sourcePage": 114,
      "pattern": "be impressed with sth",
      "explanationZh": "be impressed with sth 表示對某事物留下深刻印象。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-G050",
      "kind": "grammar",
      "sourcePage": 114,
      "pattern": "impress sb with sth；impress sth on / upon sb（用法辨析）",
      "explanationZh": "原書把兩種搭配並列為同義，學習時須區分：impress sb with sth 指以某事物使某人讚賞、留下深刻印象；impress sth on / upon sb 指向某人強調某事的重要性，使其銘記。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-G051",
      "kind": "grammar",
      "sourcePage": 114,
      "pattern": "melt away",
      "explanationZh": "melt away 在此表示融化殆盡。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-G052",
      "kind": "grammar",
      "sourcePage": 114,
      "pattern": "a melting pot",
      "explanationZh": "a melting pot 字面為熔爐，原書也用來比喻不同背景的移民匯聚的社會。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-G053",
      "kind": "grammar",
      "sourcePage": 115,
      "pattern": "It is desirable that + S + (should) + V",
      "explanationZh": "It is desirable that + S + (should) + V 表示最好……；原書此句型的 should 可省略，V 用原形。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-G054",
      "kind": "grammar",
      "sourcePage": 115,
      "pattern": "leave nothing to be desired",
      "explanationZh": "leave nothing to be desired 表示無懈可擊、完美無缺。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-G055",
      "kind": "grammar",
      "sourcePage": 115,
      "pattern": "leave much to be desired",
      "explanationZh": "leave much to be desired 表示尚待改進、仍有很大的改善空間。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-G056",
      "kind": "grammar",
      "sourcePage": 115,
      "pattern": "a desire for...",
      "explanationZh": "a desire for... 表示對……的慾望。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-G057",
      "kind": "grammar",
      "sourcePage": 115,
      "pattern": "have a desire to + V",
      "explanationZh": "have a desire to + V 表示想要做某事，to 後接原形動詞。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-G058",
      "kind": "grammar",
      "sourcePage": 115,
      "pattern": "need sth badly = be badly in need of sth",
      "explanationZh": "need sth badly 與 be badly in need of sth 都表示迫切、非常需要某事物。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-G059",
      "kind": "grammar",
      "sourcePage": 116,
      "pattern": "colony（複數為 colonies）",
      "explanationZh": "colony 的複數為 colonies。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-G060",
      "kind": "grammar",
      "sourcePage": 116,
      "pattern": "a colony of ants / bees",
      "explanationZh": "a colony of ants / bees 指一群螞蟻／蜜蜂。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-G061",
      "kind": "grammar",
      "sourcePage": 116,
      "pattern": "go stale",
      "explanationZh": "go stale 在本頁比喻變得索然無味、失去興趣。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-G062",
      "kind": "grammar",
      "sourcePage": 116,
      "pattern": "stale bread",
      "explanationZh": "stale bread 指不新鮮的麵包。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-G063",
      "kind": "grammar",
      "sourcePage": 116,
      "pattern": "a stale joke",
      "explanationZh": "a stale joke 指老掉牙、沒有新意的笑話。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-G064",
      "kind": "grammar",
      "sourcePage": 117,
      "pattern": "alphabet 指某語言的整組字母，letter 指整組字母中的每個字母",
      "explanationZh": "alphabet 指某語言的整組字母，letter 指其中一個字母；英文有 26 個 letters，而不是 26 個 alphabets。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-G065",
      "kind": "grammar",
      "sourcePage": 117,
      "pattern": "crabbed handwriting",
      "explanationZh": "crabbed handwriting 指潦草難讀的字跡。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-G066",
      "kind": "grammar",
      "sourcePage": 117,
      "pattern": "global warming",
      "explanationZh": "global warming 指全球暖化。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-G067",
      "kind": "grammar",
      "sourcePage": 117,
      "pattern": "play dumb",
      "explanationZh": "play dumb 表示裝傻。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-G068",
      "kind": "grammar",
      "sourcePage": 118,
      "pattern": "deaf and dumb",
      "explanationZh": "原書保留 deaf and dumb 這個歷史用語，指失聰且不能說話；其中 dumb 指不能說話的用法現屬舊式且可能冒犯，不宜當作稱呼他人的中性用語。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-G069",
      "kind": "grammar",
      "sourcePage": 118,
      "pattern": "pump...up / pump up...",
      "explanationZh": "pump...up / pump up... 在此表示把……充氣。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-G070",
      "kind": "grammar",
      "sourcePage": 118,
      "pattern": "pump sth into...",
      "explanationZh": "pump sth into... 表示把某物注入……；原書也以此描述把資金投入醫療服務。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-G071",
      "kind": "grammar",
      "sourcePage": 118,
      "pattern": "subtract A from B",
      "explanationZh": "subtract A from B 表示 B 減 A，不是 A 減 B。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-G072",
      "kind": "grammar",
      "sourcePage": 118,
      "pattern": "the minus sign",
      "explanationZh": "the minus sign 指減號、負號。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-G073",
      "kind": "grammar",
      "sourcePage": 118,
      "pattern": "multiply, multiplied, multiplied",
      "explanationZh": "原書所列 multiply 的動詞三態為 multiply（原形）、multiplied（過去式）、multiplied（過去分詞）。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-G074",
      "kind": "grammar",
      "sourcePage": 118,
      "pattern": "multiply A by B",
      "explanationZh": "multiply A by B 表示 A 乘 B。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    {
      "learningItemId": "LI-LV3U11-G075",
      "kind": "grammar",
      "sourcePage": 118,
      "pattern": "multiply A and B",
      "explanationZh": "multiply A and B 在此表示將 A 與 B 相乘，原書與 multiply A by B 並列。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    }
  ],
  "starterBeforeHash": "63b19354c3527a94246c99203e92434337986584ad7584de185599f8aaedfe42",
  "starterBeforeRawHash": "edfb53d95272be56004e5acc7ba738934e341b0cd26a7327fe8258f365e2474b",
  "starterIntersection": [
    {
      "dataset": "words",
      "id": "W002836",
      "fields": [
        "pos",
        "posAll",
        "meaningZh",
        "meaningEn",
        "verbForms"
      ]
    },
    {
      "dataset": "words",
      "id": "W004264",
      "fields": [
        "pos",
        "posAll",
        "meaningZh",
        "meaningEn",
        "verbForms"
      ]
    },
    {
      "dataset": "words",
      "id": "W002270",
      "fields": [
        "meaningZh"
      ]
    },
    {
      "dataset": "words",
      "id": "W002310",
      "fields": [
        "meaningZh",
        "meaningEn",
        "usagePattern",
        "usagePatternZh",
        "verbForms"
      ]
    },
    {
      "dataset": "words",
      "id": "W005591",
      "fields": [
        "meaningZh",
        "meaningEn",
        "usagePattern",
        "usagePatternZh",
        "verbForms"
      ]
    },
    {
      "dataset": "words",
      "id": "W005998",
      "fields": [
        "meaningEn",
        "usagePattern",
        "usagePatternZh",
        "verbForms"
      ]
    },
    {
      "dataset": "words",
      "id": "W005635",
      "fields": [
        "meaningEn",
        "meaningZh",
        "usagePattern",
        "usagePatternZh",
        "verbForms"
      ]
    },
    {
      "dataset": "words",
      "id": "W002941",
      "fields": [
        "usagePattern",
        "usagePatternZh",
        "verbForms"
      ]
    },
    {
      "dataset": "words",
      "id": "W005864",
      "fields": [
        "usagePattern",
        "usagePatternZh",
        "verbForms"
      ]
    },
    {
      "dataset": "words",
      "id": "W003209",
      "fields": [
        "meaningEn",
        "usagePattern",
        "usagePatternZh",
        "verbForms"
      ]
    },
    {
      "dataset": "words",
      "id": "W003588",
      "fields": [
        "usagePattern",
        "usagePatternZh",
        "verbForms"
      ]
    },
    {
      "dataset": "words",
      "id": "W001269",
      "fields": [
        "meaningZh"
      ]
    },
    {
      "dataset": "words",
      "id": "W002171",
      "fields": [
        "meaningZh"
      ]
    },
    {
      "dataset": "words",
      "id": "W002255",
      "fields": [
        "meaningZh",
        "verbForms"
      ]
    },
    {
      "dataset": "words",
      "id": "W002399",
      "fields": [
        "meaningZh",
        "meaningEn",
        "verbForms"
      ]
    },
    {
      "dataset": "words",
      "id": "W002728",
      "fields": [
        "meaningZh",
        "verbForms"
      ]
    },
    {
      "dataset": "words",
      "id": "W002843",
      "fields": [
        "meaningZh",
        "usagePattern",
        "usagePatternZh",
        "meaningEn",
        "verbForms"
      ]
    },
    {
      "dataset": "words",
      "id": "W002926",
      "fields": [
        "meaningZh",
        "verbForms"
      ]
    },
    {
      "dataset": "words",
      "id": "W002928",
      "fields": [
        "meaningZh",
        "verbForms"
      ]
    },
    {
      "dataset": "words",
      "id": "W002562",
      "fields": [
        "usagePattern",
        "usagePatternZh",
        "verbForms"
      ]
    },
    {
      "dataset": "words",
      "id": "W002865",
      "fields": [
        "usagePattern",
        "usagePatternZh",
        "verbForms"
      ]
    },
    {
      "dataset": "words",
      "id": "W002542",
      "fields": [
        "meaningEn",
        "usagePattern",
        "usagePatternZh"
      ]
    },
    {
      "dataset": "words",
      "id": "W002431",
      "fields": [
        "meaningZh",
        "verbForms"
      ]
    },
    {
      "dataset": "words",
      "id": "W003767",
      "fields": [
        "meaningZh"
      ]
    },
    {
      "dataset": "notes",
      "id": "NXe270511b",
      "fields": [
        "content"
      ]
    },
    {
      "dataset": "examples",
      "id": "EXa746dcc7",
      "fields": [
        "sentenceZh"
      ]
    },
    {
      "dataset": "examples",
      "id": "EX35afe929",
      "fields": [
        "sensePos"
      ]
    },
    {
      "dataset": "examples",
      "id": "EXcbade46d",
      "fields": [
        "sensePos"
      ]
    },
    {
      "dataset": "examples",
      "id": "EX4117b172",
      "fields": [
        "sensePos"
      ]
    },
    {
      "dataset": "examples",
      "id": "EX451c0f57",
      "fields": [
        "sensePos"
      ]
    },
    {
      "dataset": "examples",
      "id": "EXa0ea8c50",
      "fields": [
        "sensePos"
      ]
    },
    {
      "dataset": "examples",
      "id": "EXaafdfe01",
      "fields": [
        "sensePos"
      ]
    },
    {
      "dataset": "examples",
      "id": "EXb0d84df9",
      "fields": [
        "sensePos"
      ]
    },
    {
      "dataset": "words",
      "id": "W000104",
      "fields": [
        "meaningZh"
      ]
    },
    {
      "dataset": "words",
      "id": "W002839",
      "fields": [
        "meaningZh"
      ]
    },
    {
      "dataset": "words",
      "id": "W002024",
      "fields": [
        "meaningZh"
      ]
    },
    {
      "dataset": "words",
      "id": "W002026",
      "fields": [
        "usagePattern",
        "usagePatternZh"
      ]
    },
    {
      "dataset": "words",
      "id": "W002011",
      "fields": [
        "verbForms"
      ]
    },
    {
      "dataset": "words",
      "id": "W002236",
      "fields": [
        "verbForms"
      ]
    },
    {
      "dataset": "words",
      "id": "W002534",
      "fields": [
        "verbForms",
        "usagePatternZh"
      ]
    },
    {
      "dataset": "words",
      "id": "W002688",
      "fields": [
        "verbForms"
      ]
    },
    {
      "dataset": "words",
      "id": "W002729",
      "fields": [
        "verbForms"
      ]
    },
    {
      "dataset": "words",
      "id": "W002830",
      "fields": [
        "verbForms"
      ]
    },
    {
      "dataset": "words",
      "id": "W002920",
      "fields": [
        "verbForms"
      ]
    },
    {
      "dataset": "words",
      "id": "W003204",
      "fields": [
        "verbForms"
      ]
    },
    {
      "dataset": "words",
      "id": "W003538",
      "fields": [
        "verbForms"
      ]
    }
  ]
};
import { readFileSync } from 'node:fs';
import curriculum11 from './curriculumLV3Unit11.json';
import words11 from '../../../public/data/v1/words.json';
import examples11 from '../../../public/data/v1/examples.json';
import notes11 from '../../../public/data/v1/notes.json';
import senses11 from '../../../public/data/v1/senses.json';
import media11 from '../../../public/data/v1/media.json';
import { auditHash, lv3AfterUnitFile, lv3AfterUnitPublishedText, loadLV3Chain, isAuditUnitStep } from './lv3Audit.testSupport';
import { trustedVerbForms } from '../browser/meaningRecords';

type U11Row = Record<string, unknown>;
type U11Fixture = {
  documents: {dataset:string;path:string;beforeHash:string;afterHash:string;rows:number}[];
  rows: {dataset:string;id:string;path:string;key:string;changedFields:string[];beforeRow:U11Row;expectedAfterRow:U11Row;beforeRowSha256:string;expectedAfterRowSha256:string;fields:U11Row;sources:Record<string,U11Row[]>;starterIncluded:boolean}[];
  forms: {id:string;forms:{base:string;past:string;pastParticiple:string;sourceRef:string;status:string};status:string;sources:U11Row[]}[];
  siegeBefore:string[][];siegeAfter:string[][];currentCardRows:U11Row[];
  [key:string]:unknown;
};
function originalU11Items() {
  return lv3AfterUnitFile('LV3-U10', 'src/features/direct/curriculumLV3Unit11.json',
    {...curriculum11, learningItems: findUnit(11, 'LV3')!.items}).learningItems;
}
function withOriginalU11Items(body: () => void) {
  const unit = findUnit(11, 'LV3')!;
  const items = unit.items;
  const snapshot = structuredClone({...curriculum11, learningItems: items});
  try { unit.items = originalU11Items(); body(); }
  finally {
    unit.items = items;
    expect(findUnit(11, 'LV3')).toBe(unit);
    expect(unit.items).toBe(items);
    expect({...curriculum11, learningItems: unit.items}).toEqual(snapshot);
  }
}
function u11Step() {
  const steps = loadLV3Chain().filter(isAuditUnitStep).filter(s => s.entry.unit === 'LV3-U11');
  expect(steps).toHaveLength(1);
  expect(steps[0].entry.status).toBe('committed');
  return steps[0];
}
function u11Pack() {
  const path = 'public/data/v1/sa-pack.json';
  const raw = readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
  expect(JSON.parse(raw)).toEqual(pack);
  return JSON.parse(lv3AfterUnitPublishedText('LV3-U11', path, raw)) as typeof pack;
}
const u11CurrentDocuments: Record<string, unknown> = {
  curriculum: {...curriculum11, learningItems: unit.items}, words: words11,
  examples: examples11, notes: notes11, senses: senses11, media: media11,
};
it('binds all 497 source fields, all 213 full rows, all evidence arrays, four changed and two readonly documents', () => {
  const {manifest} = u11Step();
  const changed = u11Fixture.documents.filter(d => d.beforeHash !== d.afterHash);
  expect(changed).toHaveLength(4);
  expect(Object.keys(manifest.files!).sort()).toEqual(changed.map(d => d.path).sort());
  expect(manifest.patches).toHaveLength(213);
  expect(manifest.patches.reduce((n,p) => n + Object.keys(p.after).length, 0)).toBe(497);
  expect(manifest.patches.map(p => p.dataset + ':' + p.id).sort()).toEqual(u11Fixture.rows.map(r => r.dataset + ':' + r.id).sort());
  const documents: Record<string, unknown> = {};
  for (const d of u11Fixture.documents) {
    const current = u11CurrentDocuments[d.dataset];
    const snapshot = structuredClone(current);
    const atU11 = lv3AfterUnitFile('LV3-U11', d.path, current);
    documents[d.dataset] = atU11;
    expect(auditHash(atU11), d.path).toBe(d.afterHash);
    expect(auditHash(lv3AfterUnitFile('LV3-U10', d.path, current))).toBe(d.beforeHash);
    expect(current).toEqual(snapshot);
    if (d.dataset === 'curriculum') expect(auditHash(current)).toBe(d.afterHash);
    if (d.dataset === 'senses' || d.dataset === 'media') expect(d.afterHash).toBe(d.beforeHash);
  }
  for (const row of u11Fixture.rows) {
    const p = manifest.patches.find(p => p.dataset === row.dataset && p.id === row.id)!;
    expect(p.before).toEqual(row.beforeRow);
    expect(p.after).toEqual(row.fields);
    expect({...p.before, ...p.after}).toEqual(row.expectedAfterRow);
    expect(Object.keys(p.fieldEvidence!).sort()).toEqual(Object.keys(row.fields).sort());
    for (const [field, sources] of Object.entries(row.sources)) {
      expect(p.fieldEvidence![field].flatMap(r => (r as {sources: unknown[]}).sources)).toEqual(sources);
    }
    const doc = documents[row.dataset] as U11Row[] | {learningItems: U11Row[]};
    const collection = Array.isArray(doc) ? doc : doc.learningItems;
    expect(collection.filter(r => r[row.key] === row.id)).toEqual([row.expectedAfterRow]);
  }
});
it('preserves the historical 116 clues and independently derived current 136 clues and all 212 current cards', () => {
  withOriginalU11Items(() => {
    expect(siegeUnitWords('LV3',11,[])).toEqual(u11Fixture.siegeBefore);
    expect(siegeUnitWords('LV3',11,[])).toHaveLength(116);
  });
  expect(unit.items).toEqual(u11Fixture.currentCardRows);
  expect(siegeUnitWords('LV3',11,[])).toEqual(u11Fixture.siegeAfter);
  expect(siegeUnitWords('LV3',11,[])).toHaveLength(136);
  expect(vocabulary.filter(i => i.officialWordId === null)).toHaveLength(24);
  expect(unit.items.every(i => i.practiceMode === 'read_only')).toBe(true);
});
it('binds all 28 direct verb forms, original status and actual starter intersection', () => {
  const words = lv3AfterUnitFile('LV3-U11','public/data/v1/words.json',words11);
  const starter = u11Pack();
  expect(u11Fixture.forms).toHaveLength(28);
  for (const f of u11Fixture.forms) {
    const word = words.find(w => w.wordId === f.id)!;
    expect(trustedVerbForms(word)).toEqual(f.forms);
    expect(word.status).toBe(f.status);
    expect(f.sources.some(s => s.url === f.forms.sourceRef && typeof s.excerpt === 'string' && /past/i.test(s.excerpt) && /participle/i.test(s.excerpt))).toBe(true);
    expect(starter.words.find(w => w.wordId === f.id)).toEqual(word);
  }
  const rows = u11Fixture.rows.filter(r => r.dataset !== 'curriculum');
  expect(rows.filter(r => r.starterIncluded)).toHaveLength(46);
  expect(rows.reduce((n,r) => n + (r.starterIncluded ? Object.keys(r.fields).length : 0),0)).toBe(97);
  for (const row of rows) {
    const collection = (starter as unknown as Record<string,U11Row[]>)[row.dataset];
    const found = collection.filter(r => r[row.key] === row.id);
    expect(found).toEqual(row.starterIncluded ? [row.expectedAfterRow] : []);
    for (const key of ['status',row.key]) expect(Object.hasOwn(row.fields,key)).toBe(false);
  }
  const melt = words.find(w => w.wordId === 'W002534')!;
  expect(melt.usagePatternZh).toBe(u11Fixture.rows.find(r => r.id === 'W002534')!.expectedAfterRow.usagePatternZh);
  const delta = u11Fixture.rows.find(r => r.id === 'EXa746dcc7')!;
  expect(Object.keys(delta.fields)).toEqual(['sentenceZh']);
  for (const key of ['sentenceEn','blankSentence','answer']) expect((delta.expectedAfterRow as U11Row)[key]).toEqual((delta.beforeRow as U11Row)[key]);
});
for (const dataset of ['curriculum','words','examples','notes','senses','media']) {
  for (const kind of ['reviewed-field','untouched-field','identity','order','missing','extra']) {
    it(`rejects whole U11 ${dataset} ${kind} drift without mutating the caller`, () => {
      const d = u11Fixture.documents.find(d => d.dataset === dataset)!;
      const unknown = structuredClone(u11CurrentDocuments[dataset]) as U11Row[] | {learningItems: U11Row[]};
      const rows = Array.isArray(unknown) ? unknown : unknown.learningItems;
      const known = u11Fixture.rows.filter(r => r.dataset === dataset);
      if (kind === 'reviewed-field') {
        const match = known[0];
        if (match) rows.find(r => r[match.key] === match.id)![Object.keys(match.fields)[0]] = 'unrecorded';
        else rows[0].unrecorded = true;
      }
      else if (kind === 'untouched-field') {
        const untouched = rows.find(r => !known.some(k => r[k.key] === k.id))!;
        expect(untouched).toBeDefined();
        untouched.unrecorded = true;
      }
      else if (kind === 'identity') Object.assign(rows[0],{wordId:'unknown',learningItemId:'unknown'});
      else if (kind === 'order') rows.reverse();
      else if (kind === 'missing') rows.pop();
      else rows.push({...rows[0]});
      const snapshot = structuredClone(unknown);
      expect(() => lv3AfterUnitFile('LV3-U11',d.path,unknown)).toThrow(/drift/);
      expect(unknown).toEqual(snapshot);
    });
  }
}
for (const kind of ['metadata','untouched-collection','changed-row','order','missing-row','unknown-top-level']) {
  it(`rejects complete current starter ${kind} drift`, () => {
    const unknown = structuredClone(pack);
    if(kind === 'metadata') Object.assign(unknown.meta,{unrecorded:true});
    else if(kind === 'untouched-collection') Object.assign(unknown.media[0],{unrecorded:true});
    else if(kind === 'changed-row') Object.assign(unknown.words.find(w => w.wordId === u11Fixture.forms[0].id)!,{unrecorded:true});
    else if(kind === 'order') unknown.words.reverse();
    else if(kind === 'missing-row') unknown.words.pop();
    else Object.assign(unknown,{unrecorded:true});
    const snapshot=structuredClone(unknown);
    expect(() => lv3AfterUnitFile('LV3-U11','public/data/v1/sa-pack.json',unknown)).toThrow(/drift/);
    expect(unknown).toEqual(snapshot);
  });
}
it('rejects unknown current starter raw bytes before strict U11 projection', () => {
  const path='public/data/v1/sa-pack.json';
  const raw=readFileSync(path,'utf8').replace(/\r\n/g,'\n');
  expect(() => lv3AfterUnitPublishedText('LV3-U11',path,raw+' ')).toThrow(/drift/);
});

it('rejects unknown U11 curriculum top-level and template metadata', () => {
  for (const target of ['top-level','template']) {
    const unknown = structuredClone({...curriculum11, learningItems: unit.items});
    Object.assign(target === 'template' ? unknown.template : unknown,{unrecorded:true});
    const snapshot = structuredClone(unknown);
    expect(() => lv3AfterUnitFile('LV3-U11','src/features/direct/curriculumLV3Unit11.json',unknown)).toThrow(/drift/);
    expect(unknown).toEqual(snapshot);
  }
});

// V2 strict-comparison equivalence controls. Existing full-row drift tests above are unchanged.
import nodeAssert from 'node:assert/strict';
import {isDeepStrictEqual as strictEqualU11} from 'node:util';
const strictComparisonCases: {name:string;left:unknown;right:unknown;equal:boolean}[] = [
  {name:'object key order',left:{a:1,b:{c:2,d:3}},right:{b:{d:3,c:2},a:1},equal:true},
  {name:'identical ordered arrays',left:[1,null,false,{a:2}],right:[1,null,false,{a:2}],equal:true},
  {name:'different array order',left:[1,2],right:[2,1],equal:false},
  {name:'undefined property is not absence',left:{a:undefined},right:{},equal:false},
  {name:'array undefined is not null',left:[undefined],right:[null],equal:false},
  {name:'null is not false',left:null,right:false,equal:false},
  {name:'boolean is not numeric',left:false,right:0,equal:false},
  {name:'number is not string',left:1,right:'1',equal:false},
  {name:'signed zero',left:-0,right:0,equal:false},
  {name:'NaN',left:NaN,right:NaN,equal:true},
  {name:'unknown nonempty field',left:{a:1,extra:true},right:{a:1},equal:false},
  {name:'different prototypes',left:Object.assign(Object.create(null),{a:1}),right:{a:1},equal:false},
];
for(const c of strictComparisonCases) {
  it(`keeps full strict comparison semantics for ${c.name}`, () => {
    let originalAccepted=true;
    try { nodeAssert.deepEqual(c.left,c.right); } catch { originalAccepted=false; }
    const beforeLeft=Reflect.ownKeys(Object(c.left)),beforeRight=Reflect.ownKeys(Object(c.right));
    expect(originalAccepted).toBe(c.equal);
    expect(strictEqualU11(c.left,c.right)).toBe(originalAccepted);
    expect(Reflect.ownKeys(Object(c.left))).toEqual(beforeLeft);
    expect(Reflect.ownKeys(Object(c.right))).toEqual(beforeRight);
  });
}
for(const dataset of ['senses','media'] as const) {
  it(`accepts the complete U11 ${dataset} with every object key reordered without mutating inputs`, () => {
    const d=u11Fixture.documents.find(d=>d.dataset===dataset)!;
    const original=structuredClone(u11CurrentDocuments[dataset]) as U11Row[];
    const reordered=original.map(row=>Object.fromEntries(Object.entries(row).reverse()));
    const snapshot=structuredClone(reordered);
    expect(reordered).toHaveLength(original.length);
    expect(lv3AfterUnitFile('LV3-U11',d.path,reordered)).toEqual(original);
    expect(reordered).toEqual(snapshot);
    expect(Object.keys(reordered[0])).toEqual(Object.keys(snapshot[0]));
  });
  it(`rejects an extra undefined field in complete U11 ${dataset} even though JSON serialization omits it`, () => {
    const d=u11Fixture.documents.find(d=>d.dataset===dataset)!;
    const unknown=structuredClone(u11CurrentDocuments[dataset]) as U11Row[];
    unknown[0].unrecordedUndefined=undefined;
    const snapshot=structuredClone(unknown);
    expect(JSON.stringify(unknown)).toBe(JSON.stringify(u11CurrentDocuments[dataset]));
    expect(()=>lv3AfterUnitFile('LV3-U11',d.path,unknown)).toThrow(/drift/);
    expect(unknown).toEqual(snapshot);
    expect(Object.hasOwn(unknown[0],'unrecordedUndefined')).toBe(true);
  });
}
