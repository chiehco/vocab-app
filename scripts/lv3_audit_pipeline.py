"""File-aware LV3 chain validation and exact inverse projection.

V1 remains delegated to the original U01 contract. V2 is deliberately unusable
for product writes until independent capture and derived-output guards exist.
"""
from __future__ import annotations
import copy
from contextlib import contextmanager
import hashlib
import json
import os
import re
from pathlib import Path
import subprocess
import tempfile
import shutil

import apply_lv3_unit_audit as v1
import lv3_starter_media_migration as media_migration

DOCS = 'docs/lv3-audit-20261107'
CHAIN = DOCS + '/chain.json'
U01_ANCHOR_HASH = '6008609dda537f69ef0880d6482c713b1e6e75ec0fa8c3a4af71cdee9b08e4f0'
U01_MANIFEST_HASH = '317ab4353c8a462071ab98efb9604f7f26d67f427ffe6c7d24b5a71a768b5309'
DERIVED = set(v1.DERIVED)
require = v1.require
sha = v1.node_hash
read_json = v1.read_json
safe_path = v1.safe_path


def serialize(value):
    """Exact serializer shared with TypeScript, not a relaxed Python encoding."""
    proc = subprocess.run(['node', '-e',
        "let f=require('fs');process.stdout.write(JSON.stringify(JSON.parse(f.readFileSync(0,'utf8')),null,2)+'\\n')"],
        input=json.dumps(value, ensure_ascii=False, allow_nan=False),
        encoding='utf-8', capture_output=True, check=True)
    return proc.stdout.encode('utf-8')


def byte_hash(content):
    return hashlib.sha256(content.replace(b'\r\n', b'\n')).hexdigest()


def v1_adapter(manifest):
    v1.validate_manifest(manifest)
    return {
        'collections': {n: {'path': spec[0], 'key': spec[1], 'rowsField': spec[2]}
                        for n, spec in v1.SPECS.items()},
        'files': {d['path']: {'beforeHash': d['beforeHash'], 'afterHash': d['afterHash']}
                  for d in manifest['datasets'].values()},
        'patches': manifest['patches'],
    }


def contract(manifest):
    return v1_adapter(manifest) if manifest.get('schemaVersion') == 1 else manifest


def new_unit_number(unit):
    require(isinstance(unit, str) and re.fullmatch(r'LV3-U[0-9]{2}', unit), 'Invalid unit identity')
    number = int(unit[-2:])
    require(number in {1, 2} or 4 <= number <= 24, 'Unregistered unit identity')
    return number if number >= 4 else None


def validate_curriculum_identity(unit, path, document):
    number = new_unit_number(unit)
    if number is None:
        return  # Existing U01/U02 immutable contracts retain historical naming.
    require(path == f'src/features/direct/curriculumLV3Unit{number}.json', 'Unit curriculum path mismatch')
    template = document.get('template', {})
    require(template.get('templateId') == 'TEXTBOOK-' + unit
            and template.get('level') == 'LV3' and template.get('unit') == number,
            'Unit curriculum template mismatch')
    items = document.get('learningItems')
    require(isinstance(items, list) and items, 'Missing unit curriculum items')
    # U12 predates the numeric V/G namespace. Preserve its complete ordered
    # identity/kind/page matrix, never authorize a new ID or broaden other units.
    if number == 12:
        identity = [[row.get('learningItemId'), row.get('kind'), row.get('sourcePage')] for row in items]
        require(sha(identity) == '9db01d5dc830b3fa779690e87dd99f8520994691283f941aea60f28ab43271da',
                'U12 original curriculum identity mismatch')
        return
    for row in items:
        suffix = {'vocabulary': 'V', 'grammar': 'G'}.get(row.get('kind'))
        require(suffix is not None and re.fullmatch(
            r'LI-LV3U' + str(number).zfill(2) + '-' + suffix + r'[0-9]{3}',
            row.get('learningItemId', '')), 'Unit curriculum item namespace mismatch')


def verified_wage_forms(p, f):
    """Match the reviewed U05-VOC-288 record, not live website contents.

    The sealed manifest binds these evidence bytes; URL/metadata alone cannot
    establish that a dictionary was read. Never generalize wordVariants.
    """
    return (p['dataset'] == 'words' and p['id'] == 'W002976'
            and p['before'].get('wordId') == 'W002976'
            and p['before'].get('word') == 'wage(s)'
            and p['before'].get('wordVariants') == ['wage', 'wages']
            and f.get('base') == 'wage' and f.get('past') == 'waged'
            and f.get('pastParticiple') == 'waged'
            and f.get('sourceRef') == 'https://www.collinsdictionary.com/dictionary/english/wage'
            and any(isinstance(source, dict)
                    and source.get('url') == f['sourceRef']
                    and source.get('type') == 'independent_dictionary_verification'
                    and source.get('verification') == 'direct_dictionary_entry_read'
                    and source.get('findingId') == 'U05-VOC-288'
                    and source.get('quote') == 'past tense, past participle waged; recompense, return, or yield; to wage war against a nation'
                    for record in p['fieldEvidence'].get('verbForms', [])
                    for source in record['sources']))


def verified_u06_pattern_erratum(manifest, patch):
    """Only the reviewed U06-G015 transcription correction, not general pattern editing.

    The complete row and directly viewed photo record are bound by the sealed
    scope. The source marker alone is not proof that an image was inspected.
    """
    before = {
        "learningItemId": "LI-LV3U06-G015",
        "kind": "grammar",
        "sourcePage": 56,
        "pattern": "be not cut out sth（原書星號註記）",
        "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
    }
    if not (manifest['unit'] == 'LV3-U06'
            and patch['dataset'] == 'curriculum'
            and patch['path'] == 'src/features/direct/curriculumLV3Unit6.json'
            and patch['key'] == 'learningItemId' and patch['id'] == 'LI-LV3U06-G015'
            and patch['before'] == before and patch['after'] == {"pattern": "be not cut out for sth（原書星號註記）"}):
        return False
    records = patch.get('fieldEvidence', {}).get('pattern')
    return isinstance(records, list) and any(
        isinstance(record, dict) and isinstance(record.get('sources'), list)
        and any(isinstance(source, dict)
                and source.get('type') == 'textbook_photo'
                and source.get('file') == '20260815_092400.jpg'
                and source.get('page') == 56
                and source.get('sha256') == '5708b6a8ae64904b56e5912d6771122ec2aa1e273d1a358ea1b59c352b8ff900'
                and source.get('directlyViewedDuringCuration') is True
                for source in record['sources'])
        for record in records)


def verified_u07_pattern_erratum(manifest, patch):
    """Only the reviewed U07-G036 book erratum, paired with its explanation.

    Bind the exact row and both reviewed sources on the pattern field. These
    recorded checks do not claim that metadata itself proves a source was read.
    """
    before = {
        "learningItemId": "LI-LV3U07-G036",
        "kind": "grammar",
        "sourcePage": 69,
        "pattern": "crop, copped, cropped（原書三態；第二態印刷拼寫待裁決）",
        "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
        "review": "source_checked_text_only",
        "practiceMode": "read_only"
    }
    after = {
        "explanationZh": "crop 的正確三態為 crop, cropped, cropped。教材 p69 原書第二態印作 copped，屬拼字誤植，不是 crop 的正確過去式。",
        "pattern": "crop, cropped, cropped（三態；原書第二態 copped 為誤植）"
    }
    if not (manifest['unit'] == 'LV3-U07'
            and patch['dataset'] == 'curriculum'
            and patch['path'] == 'src/features/direct/curriculumLV3Unit7.json'
            and patch['key'] == 'learningItemId' and patch['id'] == 'LI-LV3U07-G036'
            and patch['before'] == before and patch['after'] == after):
        return False
    records = patch.get('fieldEvidence', {}).get('pattern')
    if not isinstance(records, list):
        return False
    for record in records:
        if not isinstance(record, dict) or not isinstance(record.get('sources'), list):
            continue
        sources = [s for s in record['sources'] if isinstance(s, dict)]
        photo = any(s.get('type') == 'textbook_photo'
                    and s.get('manifest') == 'scripts/sources/LV3Unit7.json'
                    and s.get('file') == '20260815_092552.jpg' and s.get('page') == 69
                    and s.get('sha256') == 'a50bf1194b4b624fec6fd98cf6d5cfe345cfeec5186421443d54d7acfa735ed4'
                    and s.get('pixelsViewed') is True
                    and s.get('printedText') == 'crop, copped, cropped'
                    for s in sources)
        dictionary = any(s.get('type') == 'dictionary'
                         and s.get('url') == 'https://www.collinsdictionary.com/dictionary/english/crop'
                         and s.get('retrieval') == 'direct open succeeded'
                         and s.get('evidenceText') == 'Word forms: plural, 3rd person singular present tense crops , present participle cropping , past tense, past participle cropped'
                         and s.get('supports') == 'crop past tense and past participle are both cropped'
                         for s in sources)
        if photo and dictionary:
            return True
    return False


def verified_u08_discomfort_forms(manifest, p, f):
    """Bind only the reviewed U08-VOC-252 Oxford record, not live website contents.

    Evidence records preserve the independent review; metadata alone is not proof
    of a source read. No other Oxford entry or inferred verb form is admitted.
    """
    expected_source = json.loads(r'''{
    "publisher": "Oxford University Press",
    "dictionary": "Oxford Advanced Learner’s Dictionary",
    "url": "https://www.oxfordlearnersdictionaries.com/definition/english/discomfort_2",
    "retrievedDate": "2026-11-08",
    "method": "direct_open",
    "contentType": "text/html",
    "locator": "Verb Forms, L110–115",
    "exactExcerpts": [
        {
            "text": "past simple discomforted",
            "locator": "L113"
        },
        {
            "text": "past participle discomforted",
            "locator": "L114"
        }
    ],
    "interpretation": "Past simple and past participle are separately and explicitly labelled.",
    "findingId": "U08-VOC-252"
}''')
    return (manifest.get('unit') == 'LV3-U08'
            and p.get('dataset') == 'words' and p.get('path') == 'public/data/v1/words.json'
            and p.get('key') == 'wordId' and p.get('id') == 'W005269'
            and p['before'].get('wordId') == 'W005269' and p['before'].get('word') == 'discomfort'
            and f == {'base': 'discomfort', 'past': 'discomforted', 'pastParticiple': 'discomforted', 'sourceRef': 'https://www.oxfordlearnersdictionaries.com/definition/english/discomfort_2', 'status': 'approved'}
            and any(source == expected_source
                    for record in p.get('fieldEvidence', {}).get('verbForms', [])
                    for source in record.get('sources', [])))


# Only these three reviewed U09 rows. Sources are inline public review records,
# not live verification claims. Never load output files or infer source evidence.
_U09_REVIEW_PATCHES = json.loads(r'''[
  {
    "dataset": "curriculum",
    "path": "src/features/direct/curriculumLV3Unit9.json",
    "key": "learningItemId",
    "id": "LI-LV3U09-G023",
    "before": {
      "learningItemId": "LI-LV3U09-G023",
      "kind": "grammar",
      "sourcePage": 86,
      "pattern": "-ior結尾的形容詞表比較，不與than並用，與to並用",
      "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    "after": {
      "explanationZh": "superior、inferior、senior、junior 表比較時接 to，不接 than。原書說「若干」以 -ior 結尾的形容詞，並未說所有此字尾的形容詞都表示比較。",
      "pattern": "若干以 -ior 結尾的形容詞有比較級意味，與 to 並用，不與 than 並用"
    },
    "reason": "以逐頁目視的本列用法與中文解釋補足目前相同的流程占位文字；這是來源支援的教學內容補足，不把未收錄例句或題目宣稱成已提供。 原書說「若干」以 -ior 結尾的形容詞，轉錄遺漏限定語而擴張規則。本次補回「若干」並保留原提醒句形式，比v1改寫為四詞片語更小且更忠實來源；explanationZh既有四詞說明維持不變。這是轉錄範圍錯誤，並非原書本身錯誤。",
    "evidence": [],
    "fieldEvidence": {
      "explanationZh": [
        {
          "proposal": "U09-GRM-G023-EXPLANATION",
          "originFindingIds": [
            "U09-GRM-G023-EXPLANATION"
          ],
          "reason": "以逐頁目視的本列用法與中文解釋補足目前相同的流程占位文字；這是來源支援的教學內容補足，不把未收錄例句或題目宣稱成已提供。",
          "sources": [
            {
              "type": "textbook_photo",
              "manifest": "scripts/sources/LV3Unit9.json",
              "file": "20260815_093134.jpg",
              "page": 86,
              "sha256": "ef68d8b51419564bf3336fca8c020b82a85bf116318e9a28863e3222a48b5847",
              "printedLevel": "Level 3",
              "printedUnit": "Unit 09",
              "pageType": "content",
              "pixelsViewed": true,
              "viewMethod": "EXIF orientation applied and resized proportionally to 1600px; directly viewed complete page pixels, no OCR substitution",
              "verifiedAt": "2026-11-08T04:30:20.781690+00:00",
              "verification": "direct_visual_page_header_footer_and_relevant_blocks_checked",
              "locator": "superior 10 用法",
              "printedText": "英文中若干以 -ior 結尾的形容詞有比較級的意味，但不可與 than 並用，只可與介詞 to 並用（如上述片語）。"
            }
          ],
          "beforePresent": true
        }
      ],
      "pattern": [
        {
          "proposal": "U09-GRM-G023-PATTERN",
          "originFindingIds": [
            "U09-GRM-G023-PATTERN"
          ],
          "reason": "原書說「若干」以 -ior 結尾的形容詞，轉錄遺漏限定語而擴張規則。本次補回「若干」並保留原提醒句形式，比v1改寫為四詞片語更小且更忠實來源；explanationZh既有四詞說明維持不變。這是轉錄範圍錯誤，並非原書本身錯誤。",
          "sources": [
            {
              "type": "textbook_photo",
              "manifest": "scripts/sources/LV3Unit9.json",
              "file": "20260815_093134.jpg",
              "page": 86,
              "sha256": "ef68d8b51419564bf3336fca8c020b82a85bf116318e9a28863e3222a48b5847",
              "printedLevel": "Level 3",
              "printedUnit": "Unit 09",
              "pageType": "content",
              "pixelsViewed": true,
              "viewMethod": "EXIF orientation applied and resized proportionally to 1600px; directly viewed complete page pixels, no OCR substitution",
              "verifiedAt": "2026-11-08T04:30:20.781690+00:00",
              "verification": "direct_visual_page_header_footer_and_relevant_blocks_checked",
              "locator": "superior 10 用法",
              "printedText": "英文中若干以 -ior 結尾的形容詞有比較級的意味，但不可與 than 並用，只可與介詞 to 並用（如上述片語）。"
            }
          ],
          "beforePresent": true
        }
      ]
    }
  },
  {
    "dataset": "curriculum",
    "path": "src/features/direct/curriculumLV3Unit9.json",
    "key": "learningItemId",
    "id": "LI-LV3U09-G055",
    "before": {
      "learningItemId": "LI-LV3U09-G055",
      "kind": "grammar",
      "sourcePage": 92,
      "pattern": "top the charts（chart用在唱片語中恆用複數）",
      "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    "after": {
      "explanationZh": "top the charts 表示登上排行榜冠軍；本片語用複數 charts。原書的限制是「在上列片語中」，不是所有唱片或排行榜語境。",
      "pattern": "top the charts（此片語中的 charts 用複數）"
    },
    "reason": "以逐頁目視的本列用法與中文解釋補足目前相同的流程占位文字；這是來源支援的教學內容補足，不把未收錄例句或題目宣稱成已提供。 原頁明寫「在上列片語中恆用複數」；現值「用在唱片語中」是誤轉錄並擴大限制。修復為只指 top the charts 片語，不誤指所有音樂排行榜語境。",
    "evidence": [],
    "fieldEvidence": {
      "explanationZh": [
        {
          "proposal": "U09-GRM-G055-EXPLANATION",
          "originFindingIds": [
            "U09-GRM-G055-EXPLANATION"
          ],
          "reason": "以逐頁目視的本列用法與中文解釋補足目前相同的流程占位文字；這是來源支援的教學內容補足，不把未收錄例句或題目宣稱成已提供。",
          "sources": [
            {
              "type": "textbook_photo",
              "manifest": "scripts/sources/LV3Unit9.json",
              "file": "20260815_093256.jpg",
              "page": 92,
              "sha256": "b92c972fa24cce6c0a51ede16172f015eb710275fc7c14b588aef2c383154176",
              "printedLevel": "Level 3",
              "printedUnit": "Unit 09",
              "pageType": "content",
              "pixelsViewed": true,
              "viewMethod": "EXIF orientation applied and resized proportionally to 1600px; directly viewed complete page pixels, no OCR substitution",
              "verifiedAt": "2026-11-08T04:30:20.781690+00:00",
              "verification": "direct_visual_page_header_footer_and_relevant_blocks_checked",
              "locator": "release 25 星號 top the charts 註記",
              "printedText": "top the charts 登上排行榜冠軍；chart 圖表（此處指「排行榜」，在上列片語中恆用複數）"
            }
          ],
          "beforePresent": true
        }
      ],
      "pattern": [
        {
          "proposal": "U09-GRM-G055-PATTERN",
          "originFindingIds": [
            "U09-GRM-G055-PATTERN"
          ],
          "reason": "原頁明寫「在上列片語中恆用複數」；現值「用在唱片語中」是誤轉錄並擴大限制。修復為只指 top the charts 片語，不誤指所有音樂排行榜語境。",
          "sources": [
            {
              "type": "textbook_photo",
              "manifest": "scripts/sources/LV3Unit9.json",
              "file": "20260815_093256.jpg",
              "page": 92,
              "sha256": "b92c972fa24cce6c0a51ede16172f015eb710275fc7c14b588aef2c383154176",
              "printedLevel": "Level 3",
              "printedUnit": "Unit 09",
              "pageType": "content",
              "pixelsViewed": true,
              "viewMethod": "EXIF orientation applied and resized proportionally to 1600px; directly viewed complete page pixels, no OCR substitution",
              "verifiedAt": "2026-11-08T04:30:20.781690+00:00",
              "verification": "direct_visual_page_header_footer_and_relevant_blocks_checked",
              "locator": "release 25 星號 top the charts 註記",
              "printedText": "top the charts 登上排行榜冠軍；chart 圖表（此處指「排行榜」，在上列片語中恆用複數）"
            }
          ],
          "beforePresent": true
        }
      ]
    }
  },
  {
    "dataset": "examples",
    "path": "public/data/v1/examples.json",
    "key": "exampleId",
    "id": "EXc9bfeeee",
    "before": {
      "exampleId": "EXc9bfeeee",
      "word": "republic",
      "sensePos": "n.",
      "meaningHint": null,
      "exampleType": "daily",
      "sentenceEn": "France has been a republic since the late eighteenth century.",
      "sentenceZh": "法國自十八世紀晚期以來一直是共和國。",
      "blankSentence": "France has been a _____ since the late eighteenth century.",
      "answer": "republic",
      "difficulty": "LV3",
      "status": "reviewed"
    },
    "after": {
      "sentenceEn": "France first became a republic in the late eighteenth century.",
      "sentenceZh": "法國在十八世紀晚期首次成為共和國。",
      "blankSentence": "France first became a _____ in the late eighteenth century."
    },
    "reason": "原句 has been ... since 暗示自十八世紀晚期起連續維持共和政體，與中間曾有第二帝國的官方史料衝突。法國國民議會直接明示1792年首次宣告共和，故將連續狀態改為首次成立事件，保留原句十八世紀晚期的歷史資訊、France、republic及原答案。這是史實修正，並非配合圖片改句。 原句 has been ... since 暗示自十八世紀晚期起連續維持共和政體，與中間曾有第二帝國的官方史料衝突。法國國民議會直接明示1792年首次宣告共和，故將連續狀態改為首次成立事件，保留原句十八世紀晚期的歷史資訊、France、republic及原答案。這是史實修正，並非配合圖片改句。 原句 has been ... since 暗示自十八世紀晚期起連續維持共和政體，與中間曾有第二帝國的官方史料衝突。法國國民議會直接明示1792年首次宣告共和，故將連續狀態改為首次成立事件，保留原句十八世紀晚期的歷史資訊、France、republic及原答案。這是史實修正，並非配合圖片改句。",
    "evidence": [
      "https://www.assemblee-nationale.fr/dyn/docs/RAPPANR5L17B1479.raw",
      "https://www.elysee.fr/la-presidence/la-constitution-du-5-fructidor-an-iii-22-aout-1795",
      "https://www.elysee.fr/en/french-presidency/electing-presidents-of-the-french-republic"
    ],
    "fieldEvidence": {
      "sentenceEn": [
        {
          "proposal": "U09-GRM-EX-EXc9bfeeee-SENTENCEEN",
          "originFindingIds": [
            "U09-GRM-EX-EXc9bfeeee-SENTENCEEN"
          ],
          "reason": "原句 has been ... since 暗示自十八世紀晚期起連續維持共和政體，與中間曾有第二帝國的官方史料衝突。法國國民議會直接明示1792年首次宣告共和，故將連續狀態改為首次成立事件，保留原句十八世紀晚期的歷史資訊、France、republic及原答案。這是史實修正，並非配合圖片改句。",
          "sources": [
            {
              "type": "existing_formal_record",
              "path": "public/data/v1/examples.json",
              "sha256": "01871d83187e7afa5d4ab76fb812a7c5b8dd468da77c4a06ee0f079a56a64c2c",
              "key": "exampleId",
              "id": "EXc9bfeeee",
              "verification": "exact_primary_key_and_complete_row_read",
              "retrievedAt": "2026-11-08T04:30:20.781690+00:00"
            },
            {
              "sourceId": "U09-FACT-FRANCE-FIRST-1792",
              "type": "official_history",
              "publisher": "Assemblée nationale",
              "title": "Rapport no 1479 concernant l’organisation des élections en France, Tome I",
              "url": "https://www.assemblee-nationale.fr/dyn/docs/RAPPANR5L17B1479.raw",
              "locator": "Tome I, historical discussion of suffrage, paragraph beginning Le 21 septembre 1792; rendered text line 929",
              "publishedDate": "2025-05-28",
              "retrievedAt": "2026-11-08",
              "verification": "direct_open_and_find_of_full_official_document_succeeded; exact_sentence_read",
              "evidenceText": "Le 21 septembre 1792, au lendemain de la victoire de Valmy, la Convention nationale proclamera pour la première fois en France la République."
            },
            {
              "sourceId": "U09-FACT-FRANCE-FOUNDATION-1792",
              "type": "official_constitution_archive",
              "publisher": "Élysée",
              "title": "La Constitution du 5 fructidor an III (22 août 1795)",
              "url": "https://www.elysee.fr/la-presidence/la-constitution-du-5-fructidor-an-iii-22-aout-1795",
              "locator": "Article 372; rendered text line 461",
              "documentDate": "1795-08-22",
              "retrievedAt": "2026-11-08",
              "verification": "direct_open_and_find_of_official_archived_constitution_succeeded; Article_372_read",
              "evidenceText": "L'ère française commence au 22 septembre 1792, jour de la fondation de la République."
            },
            {
              "sourceId": "U09-FACT-FRANCE-REPUBLIC",
              "type": "official_history",
              "title": "Élysée: Electing presidents of the French Republic",
              "url": "https://www.elysee.fr/en/french-presidency/electing-presidents-of-the-french-republic",
              "locator": "Under the 3rd Republic, lines 14–16",
              "retrievedAt": "2026-11-08",
              "verification": "direct_open_and_body_inspection_succeeded",
              "publisher": "Élysée",
              "evidenceText": "After the twenty years of the Second Empire, the situation had changed hugely: the republicans, who had proclaimed the Republic in September 1870"
            }
          ],
          "beforePresent": true
        }
      ],
      "sentenceZh": [
        {
          "proposal": "U09-GRM-EX-EXc9bfeeee-SENTENCEZH",
          "originFindingIds": [
            "U09-GRM-EX-EXc9bfeeee-SENTENCEZH"
          ],
          "reason": "原句 has been ... since 暗示自十八世紀晚期起連續維持共和政體，與中間曾有第二帝國的官方史料衝突。法國國民議會直接明示1792年首次宣告共和，故將連續狀態改為首次成立事件，保留原句十八世紀晚期的歷史資訊、France、republic及原答案。這是史實修正，並非配合圖片改句。",
          "sources": [
            {
              "type": "existing_formal_record",
              "path": "public/data/v1/examples.json",
              "sha256": "01871d83187e7afa5d4ab76fb812a7c5b8dd468da77c4a06ee0f079a56a64c2c",
              "key": "exampleId",
              "id": "EXc9bfeeee",
              "verification": "exact_primary_key_and_complete_row_read",
              "retrievedAt": "2026-11-08T04:30:20.781690+00:00"
            },
            {
              "sourceId": "U09-FACT-FRANCE-FIRST-1792",
              "type": "official_history",
              "publisher": "Assemblée nationale",
              "title": "Rapport no 1479 concernant l’organisation des élections en France, Tome I",
              "url": "https://www.assemblee-nationale.fr/dyn/docs/RAPPANR5L17B1479.raw",
              "locator": "Tome I, historical discussion of suffrage, paragraph beginning Le 21 septembre 1792; rendered text line 929",
              "publishedDate": "2025-05-28",
              "retrievedAt": "2026-11-08",
              "verification": "direct_open_and_find_of_full_official_document_succeeded; exact_sentence_read",
              "evidenceText": "Le 21 septembre 1792, au lendemain de la victoire de Valmy, la Convention nationale proclamera pour la première fois en France la République."
            },
            {
              "sourceId": "U09-FACT-FRANCE-FOUNDATION-1792",
              "type": "official_constitution_archive",
              "publisher": "Élysée",
              "title": "La Constitution du 5 fructidor an III (22 août 1795)",
              "url": "https://www.elysee.fr/la-presidence/la-constitution-du-5-fructidor-an-iii-22-aout-1795",
              "locator": "Article 372; rendered text line 461",
              "documentDate": "1795-08-22",
              "retrievedAt": "2026-11-08",
              "verification": "direct_open_and_find_of_official_archived_constitution_succeeded; Article_372_read",
              "evidenceText": "L'ère française commence au 22 septembre 1792, jour de la fondation de la République."
            },
            {
              "sourceId": "U09-FACT-FRANCE-REPUBLIC",
              "type": "official_history",
              "title": "Élysée: Electing presidents of the French Republic",
              "url": "https://www.elysee.fr/en/french-presidency/electing-presidents-of-the-french-republic",
              "locator": "Under the 3rd Republic, lines 14–16",
              "retrievedAt": "2026-11-08",
              "verification": "direct_open_and_body_inspection_succeeded",
              "publisher": "Élysée",
              "evidenceText": "After the twenty years of the Second Empire, the situation had changed hugely: the republicans, who had proclaimed the Republic in September 1870"
            }
          ],
          "beforePresent": true
        }
      ],
      "blankSentence": [
        {
          "proposal": "U09-GRM-EX-EXc9bfeeee-BLANKSENTENCE",
          "originFindingIds": [
            "U09-GRM-EX-EXc9bfeeee-BLANKSENTENCE"
          ],
          "reason": "原句 has been ... since 暗示自十八世紀晚期起連續維持共和政體，與中間曾有第二帝國的官方史料衝突。法國國民議會直接明示1792年首次宣告共和，故將連續狀態改為首次成立事件，保留原句十八世紀晚期的歷史資訊、France、republic及原答案。這是史實修正，並非配合圖片改句。",
          "sources": [
            {
              "type": "existing_formal_record",
              "path": "public/data/v1/examples.json",
              "sha256": "01871d83187e7afa5d4ab76fb812a7c5b8dd468da77c4a06ee0f079a56a64c2c",
              "key": "exampleId",
              "id": "EXc9bfeeee",
              "verification": "exact_primary_key_and_complete_row_read",
              "retrievedAt": "2026-11-08T04:30:20.781690+00:00"
            },
            {
              "sourceId": "U09-FACT-FRANCE-FIRST-1792",
              "type": "official_history",
              "publisher": "Assemblée nationale",
              "title": "Rapport no 1479 concernant l’organisation des élections en France, Tome I",
              "url": "https://www.assemblee-nationale.fr/dyn/docs/RAPPANR5L17B1479.raw",
              "locator": "Tome I, historical discussion of suffrage, paragraph beginning Le 21 septembre 1792; rendered text line 929",
              "publishedDate": "2025-05-28",
              "retrievedAt": "2026-11-08",
              "verification": "direct_open_and_find_of_full_official_document_succeeded; exact_sentence_read",
              "evidenceText": "Le 21 septembre 1792, au lendemain de la victoire de Valmy, la Convention nationale proclamera pour la première fois en France la République."
            },
            {
              "sourceId": "U09-FACT-FRANCE-FOUNDATION-1792",
              "type": "official_constitution_archive",
              "publisher": "Élysée",
              "title": "La Constitution du 5 fructidor an III (22 août 1795)",
              "url": "https://www.elysee.fr/la-presidence/la-constitution-du-5-fructidor-an-iii-22-aout-1795",
              "locator": "Article 372; rendered text line 461",
              "documentDate": "1795-08-22",
              "retrievedAt": "2026-11-08",
              "verification": "direct_open_and_find_of_official_archived_constitution_succeeded; Article_372_read",
              "evidenceText": "L'ère française commence au 22 septembre 1792, jour de la fondation de la République."
            },
            {
              "sourceId": "U09-FACT-FRANCE-REPUBLIC",
              "type": "official_history",
              "title": "Élysée: Electing presidents of the French Republic",
              "url": "https://www.elysee.fr/en/french-presidency/electing-presidents-of-the-french-republic",
              "locator": "Under the 3rd Republic, lines 14–16",
              "retrievedAt": "2026-11-08",
              "verification": "direct_open_and_body_inspection_succeeded",
              "publisher": "Élysée",
              "evidenceText": "After the twenty years of the Second Empire, the situation had changed hugely: the republicans, who had proclaimed the Republic in September 1870"
            }
          ],
          "beforePresent": true
        }
      ]
    }
  }
]''')


def _verified_u09_review_patch(manifest, patch, dataset):
    # Canonical JSON keeps booleans distinct from numbers (True != 1 in this contract).
    exact = lambda value: json.dumps(value, ensure_ascii=False, sort_keys=True,
                                    separators=(',', ':'), allow_nan=False)
    return (manifest.get('unit') == 'LV3-U09' and patch.get('dataset') == dataset
            and any(exact(patch) == exact(expected) for expected in _U09_REVIEW_PATCHES
                    if expected['dataset'] == dataset))


def verified_u09_pattern_erratum(manifest, patch):
    return _verified_u09_review_patch(manifest, patch, 'curriculum')


def verified_u09_republic_fact(manifest, patch):
    return _verified_u09_review_patch(manifest, patch, 'examples')



# Only three source-reviewed U11 patches; never read mutable output at runtime.
_U11_REVIEW_PATCHES = json.loads(r'''[
  {
    "dataset": "curriculum",
    "path": "src/features/direct/curriculumLV3Unit11.json",
    "key": "learningItemId",
    "id": "LI-LV3U11-G001",
    "before": {
      "learningItemId": "LI-LV3U11-G001",
      "kind": "grammar",
      "sourcePage": 107,
      "pattern": "forever 之後亦可加 a day（原書誇大用法註記）",
      "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    "after": {
      "explanationZh": "forever and a day 是誇大說法，表示永遠、長長久久；原書註記只寫加 a day，同頁例句顯示完整片語含 and。",
      "pattern": "forever and a day（誇大用法）"
    },
    "reason": "依原書同頁完整例句補回 and，保留誇大用法與原書註記差異。 依原書同頁完整例句補回 and，保留誇大用法與原書註記差異。",
    "evidence": [],
    "fieldEvidence": {
      "explanationZh": [
        {
          "proposal": "U11-GRM-G001",
          "originFindingIds": [
            "U11-GRM-G001"
          ],
          "reason": "依原書同頁完整例句補回 and，保留誇大用法與原書註記差異。",
          "sources": [
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
          "beforePresent": true
        }
      ],
      "pattern": [
        {
          "proposal": "U11-GRM-G001",
          "originFindingIds": [
            "U11-GRM-G001"
          ],
          "reason": "依原書同頁完整例句補回 and，保留誇大用法與原書註記差異。",
          "sources": [
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
          "beforePresent": true
        }
      ]
    }
  },
  {
    "dataset": "curriculum",
    "path": "src/features/direct/curriculumLV3Unit11.json",
    "key": "learningItemId",
    "id": "LI-LV3U11-G050",
    "before": {
      "learningItemId": "LI-LV3U11-G050",
      "kind": "grammar",
      "sourcePage": 114,
      "pattern": "impress sb with sth = impress sth on / upon sb",
      "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    "after": {
      "explanationZh": "原書把兩種搭配並列為同義，學習時須區分：impress sb with sth 指以某事物使某人讚賞、留下深刻印象；impress sth on / upon sb 指向某人強調某事的重要性，使其銘記。",
      "pattern": "impress sb with sth；impress sth on / upon sb（用法辨析）"
    },
    "reason": "保留原教材兩搭配，依詞典分開語義，避免等號暗示任意互換。 保留原教材兩搭配，依詞典分開語義，避免等號暗示任意互換。",
    "evidence": [
      "https://dictionary.cambridge.org/dictionary/english/impress",
      "https://dictionary.cambridge.org/dictionary/english/impress-on-upon"
    ],
    "fieldEvidence": {
      "explanationZh": [
        {
          "proposal": "U11-GRM-G050",
          "originFindingIds": [
            "U11-GRM-G050"
          ],
          "reason": "保留原教材兩搭配，依詞典分開語義，避免等號暗示任意互換。",
          "sources": [
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
          "beforePresent": true
        }
      ],
      "pattern": [
        {
          "proposal": "U11-GRM-G050",
          "originFindingIds": [
            "U11-GRM-G050"
          ],
          "reason": "保留原教材兩搭配，依詞典分開語義，避免等號暗示任意互換。",
          "sources": [
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
          "beforePresent": true
        }
      ]
    }
  },
  {
    "dataset": "examples",
    "path": "public/data/v1/examples.json",
    "key": "exampleId",
    "id": "EXa746dcc7",
    "before": {
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
    "after": {
      "sentenceZh": "據報導，有些船隻在百慕達三角地帶消失得無影無蹤。"
    },
    "reason": "修正 Triangle 地理名稱誤譯為三角洲，不改英文或原句報導語氣。",
    "evidence": [
      "https://oceanservice.noaa.gov/facts/bermudatri.html"
    ],
    "fieldEvidence": {
      "sentenceZh": [
        {
          "proposal": "U11-EX-BERMUDA",
          "originFindingIds": [
            "U11-EX-BERMUDA"
          ],
          "reason": "修正 Triangle 地理名稱誤譯為三角洲，不改英文或原句報導語氣。",
          "sources": [
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
          ],
          "beforePresent": true
        }
      ]
    }
  }
]''')

def _u11_json_equal(left, right):
    """JSON equality matching JS strict values, including bool versus number."""
    if isinstance(left, bool) or isinstance(right, bool):
        return type(left) is type(right) and left == right
    if isinstance(left, dict) and isinstance(right, dict):
        return left.keys() == right.keys() and all(_u11_json_equal(left[key], right[key]) for key in left)
    if isinstance(left, list) and isinstance(right, list):
        return len(left) == len(right) and all(_u11_json_equal(a, b) for a, b in zip(left, right))
    return left == right


def verified_u11_review_patch(manifest, patch, dataset):
    return (manifest.get('unit') == 'LV3-U11' and patch.get('dataset') == dataset
            and any(_u11_json_equal(patch, expected) for expected in _U11_REVIEW_PATCHES if expected['dataset'] == dataset))


# Exact source-reviewed U11 debut patch only; never read mutable output at runtime.
_U11_DEBUT_PATCH = json.loads(r'''{
  "dataset": "words",
  "path": "public/data/v1/words.json",
  "key": "wordId",
  "id": "W004264",
  "before": {
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
  "after": {
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
  "reason": "補齊本次教材及既有例句已用到的詞性／義項，保留其他既有義；不替換原例句或擅自核准整詞。 補齊本次教材及既有例句已用到的詞性／義項，保留其他既有義；不替換原例句或擅自核准整詞。 補齊本次教材及既有例句已用到的詞性／義項，保留其他既有義；不替換原例句或擅自核准整詞。 補齊本次教材及既有例句已用到的詞性／義項，保留其他既有義；不替換原例句或擅自核准整詞。 Supplement all retained and added senses with directly opened dictionary-body evidence; keep sealed afterValue unchanged. 直接詞典已列原形、過去式與過去分詞；補齊現有動詞義的三態，不以規則推算。",
  "evidence": [
    "https://www.collinsdictionary.com/dictionary/english/debut",
    "https://www.dictionary.com/browse/debuted"
  ],
  "fieldEvidence": {
    "pos": [
      {
        "proposal": "U11-WORD-DEBUT",
        "originFindingIds": [
          "U11-WORD-DEBUT"
        ],
        "reason": "補齊本次教材及既有例句已用到的詞性／義項，保留其他既有義；不替換原例句或擅自核准整詞。",
        "sources": [
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
        "beforePresent": true
      }
    ],
    "posAll": [
      {
        "proposal": "U11-WORD-DEBUT",
        "originFindingIds": [
          "U11-WORD-DEBUT"
        ],
        "reason": "補齊本次教材及既有例句已用到的詞性／義項，保留其他既有義；不替換原例句或擅自核准整詞。",
        "sources": [
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
        "beforePresent": true
      }
    ],
    "meaningZh": [
      {
        "proposal": "U11-WORD-DEBUT",
        "originFindingIds": [
          "U11-WORD-DEBUT"
        ],
        "reason": "補齊本次教材及既有例句已用到的詞性／義項，保留其他既有義；不替換原例句或擅自核准整詞。",
        "sources": [
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
        "beforePresent": true
      }
    ],
    "meaningEn": [
      {
        "proposal": "U11-WORD-DEBUT",
        "originFindingIds": [
          "U11-WORD-DEBUT"
        ],
        "reason": "補齊本次教材及既有例句已用到的詞性／義項，保留其他既有義；不替換原例句或擅自核准整詞。 Supplement all retained and added senses with directly opened dictionary-body evidence; keep sealed afterValue unchanged.",
        "sources": [
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
        "beforePresent": true
      }
    ],
    "verbForms": [
      {
        "proposal": "U11-FORMS-W004264",
        "originFindingIds": [
          "U11-FORMS-W004264"
        ],
        "reason": "直接詞典已列原形、過去式與過去分詞；補齊現有動詞義的三態，不以規則推算。",
        "sources": [
          {
            "word": "debut",
            "url": "https://www.dictionary.com/browse/debuted",
            "excerpt": "debuted; past participle; of debut; past tense form; of debut",
            "location": "L11-33"
          }
        ],
        "beforePresent": false
      }
    ]
  }
}''')

def verified_u11_debut_forms(manifest, patch):
    return (manifest.get('unit') == 'LV3-U11' and patch.get('dataset') == 'words'
            and patch.get('id') == 'W004264' and _u11_json_equal(patch, _U11_DEBUT_PATCH))

# Exact source-reviewed U12 pattern patch. Mutable output is never read at runtime.
_U12_PATTERN_PATCH = json.loads(r'''{
  "dataset": "curriculum",
  "path": "src/features/direct/curriculumLV3Unit12.json",
  "key": "learningItemId",
  "id": "LI-LV3U12-P126-G5f07b0a1c417",
  "before": {
    "learningItemId": "LI-LV3U12-P126-G5f07b0a1c417",
    "kind": "grammar",
    "sourcePage": 126,
    "pattern": "shake sb's fist",
    "explanationZh": "揮舞拳頭（表示十分生氣）",
    "review": "source_checked_text_only",
    "practiceMode": "read_only"
  },
  "after": {
    "pattern": "shake one's fist (at sb)",
    "explanationZh": "（向某人）揮舞自己的拳頭，表示生氣或威嚇；one's 隨主詞變化。原書片語寫 sb's fist，同頁例句實際指主詞自己的拳頭。"
  },
  "reason": "保留原書措辭差異，依同頁his與詞典your指主詞自己的拳頭，以one's消除sb's可能指別人的歧義。 保留原書措辭差異，依同頁his與詞典your指主詞自己的拳頭，以one's消除sb's可能指別人的歧義。",
  "evidence": [
    "https://www.collinsdictionary.com/us/dictionary/english/shake"
  ],
  "fieldEvidence": {
    "pattern": [
      {
        "proposal": "U12-GRM-044",
        "originFindingIds": [
          "U12-GRM-044"
        ],
        "reason": "保留原書措辭差異，依同頁his與詞典your指主詞自己的拳頭，以one's消除sb's可能指別人的歧義。",
        "sources": [
          {
            "type": "textbook_photo",
            "manifest": "scripts/sources/LV3Unit12.json",
            "file": "20260815_101336.jpg",
            "sha256": "c838f9048ba4a0d5875bae334ff2c9b160200cfa1e69e89029b41157e4bde471",
            "page": 126,
            "pixelsViewed": true,
            "viewedPath": "output\\lv3-audit-20261107\\u12-source-review\\grammar\\page-126-upright.png",
            "viewMethod": "Original photo proportionally resized and rotated clockwise for inspection; no OCR used.",
            "printedText": "shake sb's fist；揮舞拳頭（表示十分生氣）",
            "additionalSourceObservation": "同頁driver例句為shook his fist at，所有格his指該driver。"
          },
          {
            "url": "https://www.collinsdictionary.com/us/dictionary/english/shake",
            "locator": "COBUILD sense5, lines268–272",
            "evidenceText": "If you shake your fist",
            "summaryZh": "主詞因生氣而向對方揮動自己的拳頭，所有格與動作主詞相應，at後接對象。",
            "type": "dictionary",
            "publisher": "Collins",
            "retrievedAt": "2026-11-08",
            "verification": "direct_open_and_body_inspection_succeeded",
            "translation": "Reviewer paraphrase, not a copied textbook example"
          }
        ],
        "beforePresent": true
      }
    ],
    "explanationZh": [
      {
        "proposal": "U12-GRM-044",
        "originFindingIds": [
          "U12-GRM-044"
        ],
        "reason": "保留原書措辭差異，依同頁his與詞典your指主詞自己的拳頭，以one's消除sb's可能指別人的歧義。",
        "sources": [
          {
            "type": "textbook_photo",
            "manifest": "scripts/sources/LV3Unit12.json",
            "file": "20260815_101336.jpg",
            "sha256": "c838f9048ba4a0d5875bae334ff2c9b160200cfa1e69e89029b41157e4bde471",
            "page": 126,
            "pixelsViewed": true,
            "viewedPath": "output\\lv3-audit-20261107\\u12-source-review\\grammar\\page-126-upright.png",
            "viewMethod": "Original photo proportionally resized and rotated clockwise for inspection; no OCR used.",
            "printedText": "shake sb's fist；揮舞拳頭（表示十分生氣）",
            "additionalSourceObservation": "同頁driver例句為shook his fist at，所有格his指該driver。"
          },
          {
            "url": "https://www.collinsdictionary.com/us/dictionary/english/shake",
            "locator": "COBUILD sense5, lines268–272",
            "evidenceText": "If you shake your fist",
            "summaryZh": "主詞因生氣而向對方揮動自己的拳頭，所有格與動作主詞相應，at後接對象。",
            "type": "dictionary",
            "publisher": "Collins",
            "retrievedAt": "2026-11-08",
            "verification": "direct_open_and_body_inspection_succeeded",
            "translation": "Reviewer paraphrase, not a copied textbook example"
          }
        ],
        "beforePresent": true
      }
    ]
  }
}''')

def verified_u12_pattern_patch(manifest, patch):
    return (manifest.get('unit') == 'LV3-U12' and patch.get('dataset') == 'curriculum'
            and _u11_json_equal(patch, _U12_PATTERN_PATCH))

def validate_manifest(manifest, scope=None):
    if manifest.get('schemaVersion') == 1:
        v1.validate_manifest(manifest)
        return
    require(set(manifest) == {'schemaVersion', 'unit', 'baseline', 'parentManifestHash',
        'readiness', 'scope', 'scopeHash', 'collections', 'files', 'patches',
        'unchangedInputs', 'derivedBefore', 'beforeMeta', 'beforePackMeta', 'derivedAfter', 'afterMeta'},
        'Unknown v2 manifest fields')
    require(manifest['schemaVersion'] == 2 and manifest['baseline'] == v1.BASELINE,
            'Wrong schema/baseline')
    require(scope is not None and sha(scope) == manifest['scopeHash'], 'Scope hash mismatch')
    require(scope.get('schemaVersion') == 1 and scope.get('unit') == manifest['unit']
            and scope.get('baseline') == v1.BASELINE, 'Wrong scope identity')
    require(manifest['collections'] == scope['collections'], 'Collection scope mismatch')
    collections = manifest['collections']
    require(set(manifest['files']) == {x['path'] for x in collections.values()},
            'Physical file set mismatch')
    allowed_roots = {'words': ('public/data/v1/words.json', 'wordId'),
                     'examples': ('public/data/v1/examples.json', 'exampleId'),
                     'notes': ('public/data/v1/notes.json', 'noteId')}
    for name, col in collections.items():
        require(set(col) == {'path', 'key', 'rowsField'}, 'Unknown collection keys')
        if name in allowed_roots:
            require((col['path'], col['key']) == allowed_roots[name]
                    and col['rowsField'] is None, 'Global collection contract mismatch')
        else:
            require(name in {'curriculum', 'grammarQuestions'}, 'Unsupported collection')
            require(col['path'].startswith('src/features/direct/curriculum')
                    and col['path'].endswith('.json'), 'Invalid curriculum path')
            number = new_unit_number(manifest['unit'])
            if number is not None:
                require(col['path'] == f'src/features/direct/curriculumLV3Unit{number}.json', 'Unit curriculum path mismatch')
                require(name == 'curriculum', 'New-unit question schema unsupported')
            require((col['key'], col['rowsField']) ==
                    (('learningItemId', 'learningItems') if name == 'curriculum'
                     else ('questionId', 'grammarQuestions')), 'Wrong curriculum collection')
    for path, guard in manifest['files'].items():
        safe_path(Path.cwd(), path)
        require(set(guard) in ({'beforeHash', 'afterHash', 'beforeByteHash', 'afterByteHash'},
                              {'beforeHash', 'afterHash', 'beforeByteHash', 'afterByteHash', 'beforeFixture'}),
                'Unknown file guard fields')
        for key in ('beforeHash', 'afterHash', 'beforeByteHash', 'afterByteHash'):
            require(isinstance(guard[key], str) and len(guard[key]) == 64
                    and all(c in '0123456789abcdef' for c in guard[key]), 'Invalid file digest')
    rows = scope['rows']
    require(len({(r['dataset'], r['id']) for r in rows}) == len(rows), 'Duplicate scope row')
    allowed = {(r['dataset'], r['id']): r for r in rows}
    require(manifest['patches'] and len(manifest['patches']) == len(allowed), 'Scope row set mismatch')
    seen = set()
    hard_protected = {'status', 'wordId', 'exampleId', 'noteId', 'learningItemId', 'questionId',
                      'word', 'wordVariants', 'sentenceEn', 'originalExample', 'originalExamples',
                      'kind', 'review', 'practiceMode', 'stem', 'answer'}
    field_allow = {
        'words': {'meaningZh', 'meaningEn', 'usagePattern', 'usagePatternZh', 'verbForms', 'pos', 'posAll'},
        'examples': {'sensePos', 'meaningHint'},
        'notes': {'title', 'content'},
        'curriculum': {'explanationZh'},
        'grammarQuestions': {'targetMeaningZh', 'options'},
    }
    for p in manifest['patches']:
        require(set(p) == {'dataset', 'path', 'key', 'id', 'before', 'after', 'reason', 'evidence', 'fieldEvidence'},
                'Unknown patch keys')
        ident = (p['dataset'], p['id'])
        require(ident in allowed and ident not in seen, 'Duplicate or unscoped row')
        seen.add(ident)
        col = collections[p['dataset']]
        require((p['path'], p['key']) == (col['path'], col['key']), 'Patch path/key mismatch')
        require(isinstance(p['before'], dict) and p['before'].get(p['key']) == p['id'],
                'Invalid complete before row')
        require(sha(p['before']) == allowed[ident]['beforeHash']
                and p['after'] == allowed[ident]['after'], 'Exact row scope mismatch')
        if manifest['unit'] == 'LV3-U11':
            require(isinstance(p.get('fieldEvidence'), dict), 'Invalid U11 field evidence object')
        if manifest['unit'] == 'LV3-U11' and p['dataset'] == 'words' and p['id'] == 'W004264':
            require(verified_u11_debut_forms(manifest, p), 'Incomplete U11 debut contract')
        allowed_fields = field_allow[p['dataset']]
        republic_fact = verified_u09_republic_fact(manifest, p)
        if republic_fact:
            allowed_fields = {'sentenceEn', 'sentenceZh', 'blankSentence'}
        if verified_u11_review_patch(manifest, p, 'examples'):
            allowed_fields = {'sentenceZh'}
        if p['dataset'] == 'curriculum':
            if manifest['unit'] == 'LV3-U12':
                require(isinstance(p.get('fieldEvidence'), dict), 'Invalid U12 field evidence object')
                if 'pattern' in p['fieldEvidence'] or 'pattern' in p['after']:
                    require(verified_u12_pattern_patch(manifest, p), 'Incomplete U12 pattern contract')
            if manifest['unit'] == 'LV3-U11' and 'pattern' in p.get('fieldEvidence', {}):
                require(verified_u11_review_patch(manifest, p, 'curriculum'), 'Incomplete U11 pattern contract')
            if manifest['unit'] == 'LV3-U09' and 'pattern' in p.get('fieldEvidence', {}):
                require(verified_u09_pattern_erratum(manifest, p), 'Incomplete U09 pattern contract')
            kind = p['before'].get('kind')
            require(kind in {'grammar', 'vocabulary'}, 'Unknown curriculum kind')
            allowed_fields = ({'explanationZh'} if kind == 'grammar' else
                              {'sensePos', 'targetMeaningZh', 'chapterMeaningsZh', 'meaningSource'})
            if kind == 'grammar' and verified_u06_pattern_erratum(manifest, p):
                allowed_fields = {'pattern'}
            if kind == 'grammar' and verified_u07_pattern_erratum(manifest, p):
                allowed_fields = {'pattern', 'explanationZh'}
            if kind == 'grammar' and verified_u09_pattern_erratum(manifest, p):
                allowed_fields = {'pattern', 'explanationZh'}
            if kind == 'grammar' and verified_u11_review_patch(manifest, p, 'curriculum'):
                allowed_fields = {'pattern', 'explanationZh'}
            if kind == 'grammar' and verified_u12_pattern_patch(manifest, p):
                allowed_fields = {'pattern', 'explanationZh'}
            if 'meaningSource' in p['after']:
                require(p['after']['meaningSource'] in {'textbook_source_review', 'textbook_and_dictionary_review'},
                        'Invalid reviewed meaning source')
            for field in set(p['after']) & allowed_fields:
                require(isinstance(p['after'][field], str) and p['after'][field].strip(), 'Invalid curriculum scalar')
                require(p['fieldEvidence'].get(field), 'Missing curriculum field source')
        require(p['after'] and set(p['after']) <= allowed_fields
                and not (set(p['after']) & (hard_protected - {'sentenceEn'}
                         if republic_fact else hard_protected)), 'Disallowed after field')
        require(any(k not in p['before'] or p['before'][k] != x for k, x in p['after'].items()),
                'No-op patch')
        require(isinstance(p['reason'], str) and p['reason'].strip()
                and isinstance(p['fieldEvidence'], dict) and p['fieldEvidence'], 'Missing evidence')
        for field, records in p['fieldEvidence'].items():
            require(records and all(r.get('sources') and r.get('reason') and r.get('proposal')
                                    for r in records), 'Missing field source')
        if 'options' in p['after']:
            old, new = p['before'].get('options'), p['after']['options']
            require(isinstance(old, list) and isinstance(new, list) and len(old) == len(new) == 4,
                    'Invalid options')
            for a, b in zip(old, new):
                require(set(a) == set(b) and a['id'] == b['id'], 'Changed option shape/order')
                require(all(a[k] == b[k] for k in a if k not in {'text', 'rationaleZh'}),
                        'Changed protected option field')
                require(all(isinstance(b[k], str) and b[k].strip() for k in ('text', 'rationaleZh')),
                        'Invalid option content')
                if a['id'] == p['before']['answer']:
                    require(a['text'] == b['text'], 'Changed correct answer text')
            require(len({o['text'] for o in new}) == 4, 'Duplicate option text')
        if 'verbForms' in p['after']:
            f = p['after']['verbForms']
            require(set(f) == {'base', 'past', 'pastParticiple', 'sourceRef', 'status'}
                    and (verified_wage_forms(p, f)
                         if p['id'] == 'W002976' or p['before'].get('word') == 'wage(s)'
                         else f['base'] == p['before']['word'])
                    and f['status'] == 'approved'
                    and (verified_u08_discomfort_forms(manifest, p, f)
                         or verified_u11_debut_forms(manifest, p)
                         or f['sourceRef'] in {'https://www.collinsdictionary.com/dictionary/english/' + f['base'],
                                          'https://www.collinsdictionary.com/conjugation/english/' + f['base']})
                    and any(isinstance(source, dict) and source.get('url') == f['sourceRef']
                            for record in p['fieldEvidence'].get('verbForms', [])
                            for source in record['sources']),
                    'Invalid verified forms')


def prepare_step(manifest, documents, scope=None, inverse=False):
    validate_manifest(manifest, scope)
    c = contract(manifest)
    require(set(documents) == set(c['files']), 'Incomplete physical document set')
    for name, col in c['collections'].items():
        if name in {'curriculum', 'grammarQuestions'}:
            validate_curriculum_identity(manifest['unit'], col['path'], documents[col['path']])
    start, end = ('afterHash', 'beforeHash') if inverse else ('beforeHash', 'afterHash')
    for path, value in documents.items():
        require(sha(value) == c['files'][path][start], f'Unknown whole-file drift: {path}')
    out = copy.deepcopy(documents)
    for p in reversed(c['patches']) if inverse else c['patches']:
        col = c['collections'][p['dataset']]
        rr = v1.rows(out[col['path']], col['rowsField'])
        matches = [i for i, r in enumerate(rr) if r.get(p['key']) == p['id']]
        require(len(matches) == 1, f'Nonunique row: {p["id"]}')
        expected = {**p['before'], **p['after']} if inverse else p['before']
        require(rr[matches[0]] == expected, f'Complete row drift: {p["id"]}')
        rr[matches[0]] = copy.deepcopy(p['before'] if inverse else {**p['before'], **p['after']})
    for name, col in c['collections'].items():
        before_ids = [r[col['key']] for r in v1.rows(documents[col['path']], col['rowsField'])]
        after_ids = [r[col['key']] for r in v1.rows(out[col['path']], col['rowsField'])]
        require(before_ids == after_ids and len(set(after_ids)) == len(after_ids), 'ID/order/count changed')
    for path, value in out.items():
        require(sha(value) == c['files'][path][end], f'Wrong result hash: {path}')
    return out


def inverse_step(manifest, documents, scope=None):
    return prepare_step(manifest, documents, scope, inverse=True)


def load_chain(root):
    root = Path(root)
    chain = read_json(safe_path(root, CHAIN))
    require(set(chain) == {'schemaVersion', 'baseline', 'anchor', 'anchorHash', 'entries'}
            and chain['schemaVersion'] in {1, 2} and chain['baseline'] == v1.BASELINE, 'Invalid chain')
    entries = chain['entries']
    require(entries and entries[0]['unit'] == 'LV3-U01', 'Missing U01 chain anchor')
    require(len({media_migration.identity(e) for e in entries}) == len(entries), 'Duplicate chain unit')
    anchor = read_json(safe_path(root, DOCS + '/' + chain['anchor']))
    require(sha(anchor) == chain['anchorHash'] == U01_ANCHOR_HASH
            and anchor['baseline'] == v1.BASELINE, 'Anchor mismatch')
    require(entries[0]['manifestHash'] == U01_MANIFEST_HASH and entries[0]['status'] == 'committed',
            'U01 anchor manifest changed')
    ledger = read_json(safe_path(root, DOCS + '/LV3-ledger.json'))
    catalog = {'LV3-U' + str(u['unit']).zfill(2): u['source'] for u in ledger['units']}
    require(len(catalog) == 23 and 'LV3-U03' not in catalog, 'Registered catalog changed')
    previous_inputs = dict(anchor['inputs'])
    previous = None
    prepared_seen = False
    loaded = []
    for entry in entries:
        migration_entry = entry.get('kind') == 'migration'
        require(set(entry) == ({'kind', 'migrationId', 'path', 'manifestHash', 'status'} if migration_entry
                               else {'unit', 'path', 'manifestHash', 'status'}), 'Unknown chain entry')
        require(not migration_entry or chain['schemaVersion'] == 2, 'Migration needs typed chain envelope')
        require(entry['status'] in {'committed', 'prepared'}, 'Unknown chain status')
        require(not prepared_seen or entry['status'] == 'prepared', 'Committed chain gap')
        prepared_seen |= entry['status'] == 'prepared'
        manifest = read_json(safe_path(root, DOCS + '/' + entry['path']))
        require(sha(manifest) == entry['manifestHash'] and
                (manifest.get('migrationId') if migration_entry else manifest.get('unit')) == media_migration.identity(entry),
                'Manifest chain hash/identity mismatch')
        scope = None
        if migration_entry:
            require(media_migration.is_migration(manifest), 'Wrong migration schema')
            require(loaded and loaded[-1][0].get('unit') == 'LV3-U05'
                    and loaded[-1][0]['status'] == 'committed', 'Migration must immediately follow committed U05')
            require(manifest['parentManifestHash'] == previous, 'Broken migration parent chain')
            require(previous_inputs is not None, 'Predecessor checkpoint not finalized')
            media_migration.validate(manifest, set(anchor['inputs']), previous_inputs)
            media_migration.verified_fixtures(root, manifest)
            previous_inputs = dict(manifest['afterInputs'])
            loaded.append((entry, manifest, None))
            previous = entry['manifestHash']
            continue
        if manifest['schemaVersion'] == 2:
            require(manifest['parentManifestHash'] == previous, 'Broken parent chain')
            scope = read_json(safe_path(root, DOCS + '/' + manifest['scope']))
        else:
            require(previous is None and entry['unit'] == 'LV3-U01', 'V1 only allowed at anchor')
        validate_manifest(manifest, scope)
        require(entry['unit'] in catalog, 'Unregistered LV3 unit')
        if manifest['schemaVersion'] == 2:
            for name in ('curriculum', 'grammarQuestions'):
                if name in manifest['collections']:
                    require(manifest['collections'][name]['path'] == catalog[entry['unit']],
                            'Unit curriculum path mismatch')
            require(previous_inputs is not None, 'Predecessor checkpoint not finalized')
            changed = set(manifest['files'])
            require(set(manifest['unchangedInputs']) == set(previous_inputs) - changed - DERIVED,
                    'Chain input set mismatch')
            for path, digest in manifest['unchangedInputs'].items():
                require(previous_inputs[path] == digest, 'Chain unchanged guard mismatch')
            for path, guard in manifest['files'].items():
                require(previous_inputs.get(path) == guard['beforeByteHash'], 'Broken before-byte chain')
            require(manifest['derivedBefore'] == {p: previous_inputs[p] for p in DERIVED},
                    'Broken derived-before chain')
            previous_inputs = {**previous_inputs,
                               **{p: g['afterByteHash'] for p, g in manifest['files'].items()}}
            if manifest['derivedAfter'] is None:
                require(entry['status'] == 'prepared', 'Committed step missing derived checkpoint')
                previous_inputs = None
            else:
                require(set(manifest['derivedAfter']) == DERIVED, 'Missing derived-after guards')
                previous_inputs.update(manifest['derivedAfter'])
            if entry['status'] == 'committed':
                require(manifest['readiness'] == 'ready', 'Committed step not ready')
        loaded.append((entry, manifest, scope))
        previous = entry['manifestHash']
    return chain, anchor, loaded


def known_state(root, manifest):
    """Classify a single exact step; unchanged files are checked separately."""
    if media_migration.is_migration(manifest):
        return media_migration.known_state(root, manifest)
    c = contract(manifest)
    possible = {'before', 'after'}
    for path, guard in c['files'].items():
        value = read_json(safe_path(root, path))
        digest = sha(value)
        possible &= {side for side in ('before', 'after') if digest == guard[side + 'Hash']}
        if manifest['schemaVersion'] == 2:
            b = v1.file_hash(safe_path(root, path))
            possible &= {side for side in ('before', 'after') if b == guard[side + 'ByteHash']}
    require(len(possible) == 1, 'Unknown or mixed before/after state')
    return possible.pop()


def verify_inputs(root, manifest, side):
    if media_migration.is_migration(manifest):
        return media_migration.verify_inputs(root, manifest, side)
    expected = v1.input_paths(root)
    changed = set(contract(manifest)['files'])
    require(set(manifest['unchangedInputs']) == expected - changed - DERIVED,
            'Input set changed or missing guards')
    for path, digest in manifest['unchangedInputs'].items():
        require(v1.file_hash(safe_path(root, path)) == digest, f'Input drift: {path}')
    if manifest['schemaVersion'] == 2:
        guards = manifest['derivedBefore' if side == 'before' else 'derivedAfter']
        require(isinstance(guards, dict) and set(guards) == DERIVED, 'Missing derived guards')
        for path, digest in guards.items():
            require(v1.file_hash(safe_path(root, path)) == digest, f'Derived input drift: {path}')


def verify_checkpoint(root, manifest, anchor):
    """Validate the selected checkpoint even when no successor must be reversed."""
    root = Path(root)
    if manifest.get('unit') == 'LV3-U01':
        require(set(anchor['inputs']) == v1.input_paths(root), 'Anchor input set changed')
        for path, digest in anchor['inputs'].items():
            require(v1.file_hash(safe_path(root, path)) == digest, f'Anchor input drift: {path}')
    else:
        require(known_state(root, manifest) == 'after', 'Current tree is not checkpoint after state')
        verify_inputs(root, manifest, 'after')


def project_checkpoint(root, destination, target='LV3-U01'):
    """Copy into a new empty temporary fixture and reverse committed successors.

    No source writes. Prepared steps cannot be projected as applied steps.
    """
    root, destination = Path(root), Path(destination)
    assert_recovery_clear(root)
    require(destination.resolve() != root.resolve() and not destination.exists(),
            'Projection destination must be new and distinct')
    _, anchor, loaded = load_chain(root)
    committed = [x for x in loaded if x[0]['status'] == 'committed']
    targets = [i for i, x in enumerate(committed) if media_migration.identity(x[0]) == target]
    require(len(targets) == 1, 'Unknown checkpoint target')
    tail = committed[targets[0] + 1:]
    verify_checkpoint(root, committed[-1][1], anchor)
    destination.mkdir(parents=True)
    for path in v1.input_paths(root):
        target_path = safe_path(destination, path)
        target_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(safe_path(root, path), target_path)
    for _, manifest, scope in reversed(tail):
        if media_migration.is_migration(manifest):
            media_migration.inverse(root, destination, manifest)
            continue
        require(known_state(destination, manifest) == 'after', 'Inverse chain state mismatch')
        verify_inputs(destination, manifest, 'after')
        documents = {p: read_json(safe_path(destination, p)) for p in manifest['files']}
        restored = inverse_step(manifest, documents, scope)
        for path, value in restored.items():
            guard = manifest['files'][path]
            content = serialize(value)
            if byte_hash(content) != guard['beforeByteHash']:
                require(guard.get('beforeFixture'), 'Cannot reproduce guarded before bytes')
                content = safe_path(root, guard['beforeFixture']).read_bytes()
                require(sha(json.loads(content.decode('utf-8'))) == guard['beforeHash'],
                        'Before fixture semantic mismatch')
            require(byte_hash(content) == guard['beforeByteHash'], 'Before fixture byte mismatch')
            safe_path(destination, path).write_bytes(content)
        safe_path(destination, v1.DERIVED[0]).write_bytes(serialize(manifest['beforeMeta']))
        # Builder is copied and checked by unchangedInputs before execution.
        builder_path = safe_path(destination, v1.BUILDER)
        require(v1.file_hash(builder_path) == manifest['unchangedInputs'][v1.BUILDER], 'Unchecked projection builder')
        module = {'__name__': 'lv3_checkpoint_builder', '__file__': str(builder_path)}
        exec(compile(builder_path.read_text(encoding='utf-8'), str(builder_path), 'exec'), module)
        module['build_sa_pack'](destination / 'public/data/v1', destination / 'src/features/direct')
        require(read_json(destination / v1.DERIVED[1])['meta'] == manifest['beforePackMeta'], 'Before pack metadata mismatch')
        verify_inputs(destination, manifest, 'before')
    verify_checkpoint(destination, committed[targets[0]][1], anchor)
    assert_recovery_clear(root)
    return destination


def assert_recovery_clear(root):
    """Recovery state takes precedence over dry-run and idempotent success."""
    tx = safe_path(Path(root).resolve(), 'output/lv3-audit-20261107/transactions')
    require(not (tx / 'apply.lock').exists(), 'Audit transaction lock exists; recovery required')
    if tx.exists():
        for receipt in tx.glob('*/transaction.json'):
            require(read_json(receipt).get('state') != 'pending', 'Pending transaction requires recovery')


@contextmanager
def transaction_lock(root):
    """O_EXCL also rejects stale locks; never auto-delete another process's lock."""
    tx = safe_path(Path(root).resolve(), 'output/lv3-audit-20261107/transactions')
    tx.mkdir(parents=True, exist_ok=True)
    lock = tx / 'apply.lock'
    try:
        fd = os.open(lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
    except FileExistsError:
        raise ValueError('Audit transaction lock exists; recovery required') from None
    try:
        with os.fdopen(fd, 'w') as handle:
            handle.write(json.dumps({'pid': os.getpid()}))
            handle.flush()
            os.fsync(handle.fileno())
        for receipt in tx.glob('*/transaction.json'):
            require(read_json(receipt).get('state') != 'pending', 'Pending transaction requires recovery')
        yield
    finally:
        lock.unlink()


def run_v2(root, manifest_path, apply=False):
    root, manifest_path = Path(root).resolve(), Path(manifest_path).resolve()
    require(manifest_path.is_relative_to(root / 'docs'), 'Manifest must reside under repository docs')
    _, _, chain = load_chain(root)
    found = [x for x in chain if (root / DOCS / x[0]['path']).resolve() == manifest_path]
    require(len(found) == 1, 'Manifest is not registered exactly once')
    entry, manifest, scope = found[0]
    require(manifest['readiness'] == 'ready' and manifest['afterMeta'] is not None
            and manifest['derivedAfter'] is not None, 'Independent before capture/derived verification pending')
    state = known_state(root, manifest)
    verify_inputs(root, manifest, state)
    current = {p: read_json(safe_path(root, p)) for p in manifest['files']}
    staged = prepare_step(manifest, current, scope) if state == 'before' else current
    if state == 'after':
        # Check every exact after row even on reapplication.
        inverse_step(manifest, current, scope)
    paths = v1.input_paths(root)
    initial = {p: safe_path(root, p).read_bytes() for p in paths}
    with tempfile.TemporaryDirectory(prefix='lv3-audit-v2-') as temporary:
        stage = Path(temporary)
        for p, content in initial.items():
            target = safe_path(stage, p)
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(content)
        for p, value in staged.items():
            content = serialize(value)
            require(byte_hash(content) == manifest['files'][p]['afterByteHash'], 'Stage byte hash mismatch')
            safe_path(stage, p).write_bytes(content)
        meta = manifest['afterMeta']
        require(meta['wordsHash'] == v1.file_hash(stage / 'public/data/v1/words.json'),
                'Metadata wordsHash mismatch')
        digest = hashlib.sha256()
        for name in v1.CONTENT_FILES:
            digest.update((stage / 'public/data/v1' / name).read_bytes().replace(b'\r\n', b'\n'))
        require(meta['contentHash'] == digest.hexdigest(), 'Metadata contentHash mismatch')
        safe_path(stage, v1.DERIVED[0]).write_bytes(serialize(meta))
        builder_path = safe_path(stage, v1.BUILDER)
        require(v1.file_hash(builder_path) == manifest['unchangedInputs'][v1.BUILDER], 'Unchecked staged builder')
        module = {'__name__': 'lv3_staged_builder', '__file__': str(builder_path)}
        exec(compile(builder_path.read_text(encoding='utf-8'), str(builder_path), 'exec'), module)
        module['build_sa_pack'](stage / 'public/data/v1', stage / 'src/features/direct')
        verify_inputs(stage, manifest, 'after')
        old_pack, new_pack = read_json(root / v1.DERIVED[1]), read_json(stage / v1.DERIVED[1])
        require(old_pack['meta']['counts'] == new_pack['meta']['counts'], 'Pack counts changed')
        require([r['wordId'] for r in old_pack['words']] == [r['wordId'] for r in new_pack['words']],
                'Pack word IDs changed')
        writes = sorted(set(manifest['files']) | DERIVED)
        result = {'state': 'already_applied' if state == 'after' else 'dry_run',
                  'patchCount': len(manifest['patches']), 'files': writes, 'productWrites': 0}
        if not apply or state == 'after':
            return result
        # Caller owns exclusive lock. All inputs revalidated under that lock.
        require(v1.input_paths(root) == paths, 'Concurrent input-set change')
        for p, content in initial.items():
            require(safe_path(root, p).read_bytes() == content, f'Concurrent input change: {p}')
        token = v1.datetime.now(v1.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
        tx = safe_path(root, 'output/lv3-audit-20261107/transactions/' + token)
        tx.mkdir(exist_ok=False)
        receipt = {'state': 'pending', 'baseline': v1.BASELINE,
                   'manifest': manifest_path.relative_to(root).as_posix(), 'manifestHash': sha(manifest),
                   'files': writes, 'beforeHashes': {}, 'afterHashes': {}}
        for p in writes:
            backup = tx / 'before' / p
            backup.parent.mkdir(parents=True, exist_ok=True)
            backup.write_bytes(initial[p])
            receipt['beforeHashes'][p] = hashlib.sha256(initial[p]).hexdigest()
            receipt['afterHashes'][p] = hashlib.sha256(safe_path(stage, p).read_bytes()).hexdigest()
        v1.dump(tx / 'transaction.json', receipt)
        completed = []
        try:
            for p in writes:
                target = safe_path(root, p)
                require(target.read_bytes() == initial[p], f'Concurrent target change: {p}')
                temp = target.with_name(target.name + '.lv3-audit-' + token + '.tmp')
                with temp.open('xb') as handle:
                    handle.write(safe_path(stage, p).read_bytes())
                    handle.flush()
                    os.fsync(handle.fileno())
                os.replace(temp, target)
                completed.append(p)
            for p in writes:
                require(safe_path(root, p).read_bytes() == safe_path(stage, p).read_bytes(), 'Post-write mismatch')
            require(v1.input_paths(root) == paths, 'Concurrent input-set change after writes')
            for p in paths - set(writes):
                require(safe_path(root, p).read_bytes() == initial[p], f'Concurrent untouched input change: {p}')
            receipt['state'] = 'committed'
            v1.dump(tx / 'transaction.json', receipt)
        except BaseException:
            for p in reversed(completed):
                target = safe_path(root, p)
                require(target.read_bytes() == safe_path(stage, p).read_bytes(),
                        'Concurrent edit during rollback; leave pending for recovery')
                restore = target.with_name(target.name + '.lv3-restore-' + token + '.tmp')
                restore.write_bytes(initial[p])
                os.replace(restore, target)
            receipt['state'] = 'rolled_back'
            v1.dump(tx / 'transaction.json', receipt)
            raise
        return {**result, 'state': 'applied', 'productWrites': len(writes),
                'receipt': (tx / 'transaction.json').relative_to(root).as_posix()}

def seal_step(root, manifest_path, before_capture):
    """Prepare a ready manifest in memory after an independently recorded capture.

    Does not write repository documents or products. The reviewer must save the
    returned candidate, update its chain hash, and explicitly run the applier.
    """
    root, manifest_path = Path(root).resolve(), Path(manifest_path).resolve()
    assert_recovery_clear(root)
    _, _, chain = load_chain(root)
    matches = [x for x in chain if (root / DOCS / x[0]['path']).resolve() == manifest_path]
    require(len(matches) == 1, 'Unregistered seal target')
    _, manifest, scope = matches[0]
    require(manifest['schemaVersion'] == 2, 'Only v2 steps can be sealed')
    paths = v1.input_paths(root)
    require(isinstance(before_capture, dict) and set(before_capture) == paths,
            'Independent before capture must cover the exact complete input set')
    for path, digest in before_capture.items():
        require(v1.file_hash(safe_path(root, path)) == digest, f'Independent capture drift: {path}')
    require(known_state(root, manifest) == 'before', 'Seal requires exact before state')
    verify_inputs(root, manifest, 'before')
    require(read_json(root / v1.DERIVED[0]) == manifest['beforeMeta'], 'Before metadata drift')
    require(read_json(root / v1.DERIVED[1])['meta'] == manifest['beforePackMeta'], 'Before pack metadata drift')
    documents = {p: read_json(safe_path(root, p)) for p in manifest['files']}
    staged = prepare_step(manifest, documents, scope)
    candidate = copy.deepcopy(manifest)
    with tempfile.TemporaryDirectory(prefix='lv3-seal-') as temporary:
        stage = Path(temporary)
        for path in paths:
            target = safe_path(stage, path)
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(safe_path(root, path), target)
        for path, value in staged.items():
            content = serialize(value)
            require(byte_hash(content) == manifest['files'][path]['afterByteHash'], 'Seal result byte mismatch')
            safe_path(stage, path).write_bytes(content)
        meta = copy.deepcopy(manifest['beforeMeta'])
        meta['generatedAt'] = v1.datetime.now(v1.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
        meta['wordsHash'] = v1.file_hash(stage / 'public/data/v1/words.json')
        digest = hashlib.sha256()
        for name in v1.CONTENT_FILES:
            digest.update((stage / 'public/data/v1' / name).read_bytes().replace(b'\r\n', b'\n'))
        meta['contentHash'] = digest.hexdigest()
        safe_path(stage, v1.DERIVED[0]).write_bytes(serialize(meta))
        builder_path = safe_path(stage, v1.BUILDER)
        require(v1.file_hash(builder_path) == manifest['unchangedInputs'][v1.BUILDER],
                'Unchecked pack builder')
        module = {'__name__': 'lv3_seal_builder', '__file__': str(builder_path)}
        exec(compile(builder_path.read_text(encoding='utf-8'), str(builder_path), 'exec'), module)
        module['build_sa_pack'](stage / 'public/data/v1', stage / 'src/features/direct')
        old, new = read_json(root / v1.DERIVED[1]), read_json(stage / v1.DERIVED[1])
        require(old['meta']['counts'] == new['meta']['counts'], 'Seal pack count changed')
        require([r['wordId'] for r in old['words']] == [r['wordId'] for r in new['words']],
                'Seal pack word IDs changed')
        candidate['afterMeta'] = meta
        candidate['derivedAfter'] = {p: v1.file_hash(stage / p) for p in DERIVED}
        candidate['readiness'] = 'ready'
        verify_inputs(stage, candidate, 'after')
    require(v1.input_paths(root) == paths, 'Concurrent input-set change during seal')
    for path, digest in before_capture.items():
        require(v1.file_hash(safe_path(root, path)) == digest, f'Concurrent capture input change: {path}')
    assert_recovery_clear(root)
    return candidate
