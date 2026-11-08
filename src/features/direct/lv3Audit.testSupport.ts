import assert from 'node:assert/strict';
import {isDeepStrictEqual} from 'node:util';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {lv3Unit1BeforeAudit} from './lv3Unit1Audit.testSupport';
import {BUILDER,PACK,MIGRATION_ID,validateStarterMediaMigration,inverseStarterMediaMigrationNormalized,type StarterMediaMigration,type MigrationLoader} from './starterMediaMigration.testSupport';

type Row = Record<string, unknown>;
type Collection = {path:string; rowsField:string|null; key:string};
type FileGuard = {beforeHash:string;afterHash:string;beforeByteHash?:string;afterByteHash?:string;beforeFixture?:string};
export type AuditPatch = {dataset:string;path:string;key:string;id:string;before:Row;after:Row;reason:string;evidence?:unknown[];fieldEvidence?:Record<string,unknown[]>};
export type AuditManifest = {beforeMeta?:Row;beforePackMeta?:Row;afterMeta?:Row|null;unchangedInputs?:Record<string,string>;derivedBefore?:Record<string,string>;derivedAfter?:Record<string,string>|null;readiness?:string;schemaVersion:number;unit:string;baseline:string;parentManifestHash?:string;scope?:string;scopeHash?:string;collections?:Record<string,Collection>;files?:Record<string,FileGuard>;datasets?:Record<string,FileGuard&Collection>;patches:AuditPatch[]};
export type AuditScope = {schemaVersion:number;unit:string;baseline:string;collections:Record<string,Collection>;rows:{dataset:string;id:string;beforeHash:string;after:Row}[]};
type Entry = {unit?:string;kind?:'migration';migrationId?:string;path:string;manifestHash:string;status:'committed'|'prepared'};
type Manifest=AuditManifest|StarterMediaMigration;
const isMigration=(m:Manifest):m is StarterMediaMigration=>m.schemaVersion===3;
export const isAuditUnitStep=(step:{entry:Entry;manifest:Manifest;scope?:AuditScope}):step is {entry:Entry&{unit:string};manifest:AuditManifest;scope:AuditScope|undefined}=>!isMigration(step.manifest)&&typeof step.entry.unit==='string';
const migrationLoad=(path:string)=>{assert.ok(path&&!path.includes('..')&&!path.includes('\\')&&!path.includes(':')&&!path.startsWith('/'));return readFileSync(new URL('../../../'+path,import.meta.url));};
const BASELINE='99883751926bd6cb4feff70daff56c07afc130cb';
const U01_ANCHOR_HASH='6008609dda537f69ef0880d6482c713b1e6e75ec0fa8c3a4af71cdee9b08e4f0';
const U01_MANIFEST_HASH='317ab4353c8a462071ab98efb9604f7f26d67f427ffe6c7d24b5a71a768b5309';
const docs=new URL('../../../docs/lv3-audit-20261107/',import.meta.url);
export const auditHash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const read=(path:string)=>{
 assert.ok(path&&!path.includes('..')&&!path.includes('\\')&&!path.includes(':')&&!path.startsWith('/'),'unsafe chain path');
 return JSON.parse(readFileSync(new URL(path,docs),'utf8'));
};

export function auditContract(m:AuditManifest):{collections:Record<string,Collection>;files:Record<string,FileGuard>} {
 if(m.schemaVersion===2){assert.ok(m.collections&&m.files);return {collections:m.collections,files:m.files};}
 assert.equal(m.schemaVersion,1);
 assert.equal(m.unit,'LV3-U01');
 assert.ok(m.datasets);
 return {collections:Object.fromEntries(Object.entries(m.datasets).map(([k,d])=>[k,{path:d.path,key:d.key,rowsField:d.rowsField??null}])),
  files:Object.fromEntries(Object.values(m.datasets).map(d=>[d.path,{beforeHash:d.beforeHash,afterHash:d.afterHash}]))};
}

function newUnitNumber(unit:string):number|null {
 assert.match(unit,/^LV3-U[0-9]{2}$/,'invalid unit identity');
 const number=Number(unit.slice(-2));assert.ok([1,2].includes(number)||(number>=4&&number<=24),'unregistered unit identity');
 return number>=4?number:null;
}
export function validateCurriculumIdentity(unit:string,path:string,value:unknown):void {
 const number=newUnitNumber(unit);if(number===null)return;
 assert.equal(path,`src/features/direct/curriculumLV3Unit${number}.json`,'unit curriculum path mismatch');
 const document=value as Row,template=document.template as Row;
 assert.ok(template);assert.equal(template.templateId,'TEXTBOOK-'+unit,'unit curriculum template mismatch');
 assert.equal(template.level,'LV3');assert.equal(template.unit,number);
 const items=document.learningItems as Row[];assert.ok(Array.isArray(items)&&items.length);
 // U12 uses original page/slug IDs. Bind the entire ordered identity matrix.
 if(number===12){
  const identity=items.map(row=>[row.learningItemId,row.kind,row.sourcePage]);
  assert.equal(auditHash(identity),'9db01d5dc830b3fa779690e87dd99f8520994691283f941aea60f28ab43271da','U12 original curriculum identity mismatch');
  return;
 }
 for(const row of items){
  const suffix=row.kind==='vocabulary'?'V':row.kind==='grammar'?'G':null;
  assert.ok(suffix&&new RegExp(`^LI-LV3U${String(number).padStart(2,'0')}-${suffix}[0-9]{3}$`).test(String(row.learningItemId)),'unit curriculum item namespace mismatch');
 }
}

// Match the reviewed U05-VOC-288 record, not live website contents.
// The sealed manifest binds these evidence bytes; metadata is not proof of a web read.
// Never generalize wordVariants lemmatization.
function verifiedWageForms(p:AuditPatch,f:Row){
 return p.dataset==='words'&&p.id==='W002976'&&p.before.wordId==='W002976'
  &&p.before.word==='wage(s)'&&JSON.stringify(p.before.wordVariants)===JSON.stringify(['wage','wages'])
  &&f.base==='wage'&&f.past==='waged'&&f.pastParticiple==='waged'
  &&f.sourceRef==='https://www.collinsdictionary.com/dictionary/english/wage'
  &&(p.fieldEvidence?.verbForms??[]).some(record=>(record as {sources:unknown[]}).sources.some(source=>{
   if(typeof source!=='object'||source===null)return false;
   const s=source as Row;
   return s.url===f.sourceRef&&s.type==='independent_dictionary_verification'
    &&s.verification==='direct_dictionary_entry_read'&&s.findingId==='U05-VOC-288'
    &&s.quote==='past tense, past participle waged; recompense, return, or yield; to wage war against a nation';
  }));
}

// Only the reviewed U06-G015 transcription correction; all other patterns remain protected.
// A sealed scope binds the exact row/evidence, not a claim that metadata proves an image read.
function verifiedU06PatternErratum(m:AuditManifest,p:AuditPatch){
 const before:Row={
  "learningItemId": "LI-LV3U06-G015",
  "kind": "grammar",
  "sourcePage": 56,
  "pattern": "be not cut out sth（原書星號註記）",
  "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
  "review": "source_checked_text_only",
  "practiceMode": "read_only"
};
 if(m.unit!=='LV3-U06'||p.dataset!=='curriculum'
  ||p.path!=='src/features/direct/curriculumLV3Unit6.json'||p.key!=='learningItemId'||p.id!=='LI-LV3U06-G015'
  ||Object.keys(p.before).length!==Object.keys(before).length
  ||!Object.entries(before).every(([key,value])=>p.before[key]===value)
  ||Object.keys(p.after).length!==1||p.after.pattern!=="be not cut out for sth（原書星號註記）")return false;
 const records=p.fieldEvidence?.pattern;
 return Array.isArray(records)&&records.some(record=>{
  if(typeof record!=='object'||record===null)return false;
  const sources=(record as {sources?:unknown}).sources;
  return Array.isArray(sources)&&sources.some(source=>{
   if(typeof source!=='object'||source===null)return false;
   const s=source as Row;
   return s.type==='textbook_photo'&&s.file==='20260815_092400.jpg'&&s.page===56
    &&s.sha256==='5708b6a8ae64904b56e5912d6771122ec2aa1e273d1a358ea1b59c352b8ff900'
    &&s.directlyViewedDuringCuration===true;
  });
 });
}

// Only U07-G036's reviewed book erratum, paired with its exact explanation.
// Bind the recorded photo and direct dictionary check to the same pattern finding.
export function verifiedU07PatternErratum(m:AuditManifest,p:AuditPatch){
 const before:Row={
  "learningItemId": "LI-LV3U07-G036",
  "kind": "grammar",
  "sourcePage": 69,
  "pattern": "crop, copped, cropped（原書三態；第二態印刷拼寫待裁決）",
  "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
  "review": "source_checked_text_only",
  "practiceMode": "read_only"
};
 const after:Row={
  "explanationZh": "crop 的正確三態為 crop, cropped, cropped。教材 p69 原書第二態印作 copped，屬拼字誤植，不是 crop 的正確過去式。",
  "pattern": "crop, cropped, cropped（三態；原書第二態 copped 為誤植）"
};
 if(m.unit!=='LV3-U07'||p.dataset!=='curriculum'
  ||p.path!=='src/features/direct/curriculumLV3Unit7.json'||p.key!=='learningItemId'||p.id!=='LI-LV3U07-G036'
  ||Object.keys(p.before).length!==Object.keys(before).length
  ||!Object.entries(before).every(([key,value])=>p.before[key]===value)
  ||Object.keys(p.after).length!==Object.keys(after).length
  ||!Object.entries(after).every(([key,value])=>p.after[key]===value))return false;
 const records=p.fieldEvidence?.pattern;
 return Array.isArray(records)&&records.some(record=>{
  if(typeof record!=='object'||record===null)return false;
  const sources=(record as {sources?:unknown}).sources;
  if(!Array.isArray(sources))return false;
  const objects=sources.filter((s):s is Row=>typeof s==='object'&&s!==null&&!Array.isArray(s));
  const photo=objects.some(s=>s.type==='textbook_photo'&&s.manifest==='scripts/sources/LV3Unit7.json'
   &&s.file==='20260815_092552.jpg'&&s.page===69
   &&s.sha256==='a50bf1194b4b624fec6fd98cf6d5cfe345cfeec5186421443d54d7acfa735ed4'
   &&s.pixelsViewed===true&&s.printedText==='crop, copped, cropped');
  const dictionary=objects.some(s=>s.type==='dictionary'
   &&s.url==='https://www.collinsdictionary.com/dictionary/english/crop'
   &&s.retrieval==='direct open succeeded'
   &&s.evidenceText==='Word forms: plural, 3rd person singular present tense crops , present participle cropping , past tense, past participle cropped'
   &&s.supports==='crop past tense and past participle are both cropped');
  return photo&&dictionary;
 });
}

// Bind only the reviewed U08-VOC-252 Oxford record, not live website contents.
// Recorded evidence is not itself proof of a source read; no general Oxford allowance.
export function verifiedU08DiscomfortForms(m:AuditManifest,p:AuditPatch,f:Row){
 const source={
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
};
 return m.unit==='LV3-U08'&&p.dataset==='words'&&p.path==='public/data/v1/words.json'
  &&p.key==='wordId'&&p.id==='W005269'&&p.before.wordId==='W005269'&&p.before.word==='discomfort'
  &&isDeepStrictEqual(f,{"base": "discomfort", "past": "discomforted", "pastParticiple": "discomforted", "sourceRef": "https://www.oxfordlearnersdictionaries.com/definition/english/discomfort_2", "status": "approved"})
  &&(p.fieldEvidence?.verbForms??[]).some(record=>{
   const sources=(record as {sources?:unknown[]}).sources;
   return Array.isArray(sources)&&sources.some(s=>isDeepStrictEqual(s,source));
  });
}

// Only these three reviewed U09 rows. Inline public records preserve source review;
// metadata alone is not proof that the source was read. No runtime output references.
const U09_REVIEW_PATCHES:AuditPatch[]=JSON.parse(String.raw`[
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
]`);
function verifiedU09ReviewPatch(m:AuditManifest,p:AuditPatch,dataset:string){
 return m.unit==='LV3-U09'&&p.dataset===dataset
  &&U09_REVIEW_PATCHES.some(expected=>expected.dataset===dataset&&isDeepStrictEqual(p,expected));
}
export function verifiedU09PatternErratum(m:AuditManifest,p:AuditPatch){
 return verifiedU09ReviewPatch(m,p,'curriculum');
}
export function verifiedU09RepublicFact(m:AuditManifest,p:AuditPatch){
 return verifiedU09ReviewPatch(m,p,'examples');
}

// Exact U11 review contracts, generated from the sealed source artifact.
const U11_REVIEW_PATCHES:AuditPatch[]=JSON.parse(String.raw`[
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
]`);
export function verifiedU11ReviewPatch(m:AuditManifest,p:AuditPatch,dataset:string){
 return m.unit==='LV3-U11'&&p.dataset===dataset
  &&U11_REVIEW_PATCHES.some(expected=>expected.dataset===dataset&&isDeepStrictEqual(p,expected));
}

// Exact complete U11 debut patch; no general Dictionary.com allowance.
const U11_DEBUT_PATCH:AuditPatch=JSON.parse(String.raw`{
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
}`);
export function verifiedU11DebutForms(m:AuditManifest,p:AuditPatch){
 return m.unit==='LV3-U11'&&p.dataset==='words'&&p.id==='W004264'&&isDeepStrictEqual(p,U11_DEBUT_PATCH);
}



// Exact source-reviewed U12 pattern patch; no runtime mutable output dependency.
const U12_PATTERN_PATCH:AuditPatch=JSON.parse(String.raw`{
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
}`);
export function verifiedU12PatternPatch(m:AuditManifest,p:AuditPatch){
 return m.unit==='LV3-U12'&&p.dataset==='curriculum'&&isDeepStrictEqual(p,U12_PATTERN_PATCH);
}

export function validateAuditScope(m:AuditManifest,scope:AuditScope):void {
 const keys=(value:object)=>Object.keys(value).sort();
 const sameKeys=(value:object,expected:string[])=>assert.deepEqual(keys(value),[...expected].sort(),'unknown or missing contract fields');
 const requireDigest=(value:unknown)=>assert.ok(typeof value==='string'&&/^[a-f0-9]{64}$/.test(value),'invalid digest');
 sameKeys(m,['schemaVersion','unit','baseline','parentManifestHash','readiness','scope','scopeHash','collections','files','patches','unchangedInputs','derivedBefore','beforeMeta','beforePackMeta','derivedAfter','afterMeta']);
 assert.equal(m.schemaVersion,2);assert.equal(m.baseline,BASELINE);
 assert.equal(auditHash(scope),m.scopeHash,'scope hash mismatch');
 assert.equal(scope.schemaVersion,1);assert.equal(scope.unit,m.unit);assert.equal(scope.baseline,BASELINE);
 assert.deepEqual(m.collections,scope.collections,'collection scope mismatch');
 const contracts=auditContract(m);
 assert.deepEqual(keys(contracts.files),[...new Set(Object.values(contracts.collections).map(c=>c.path))].sort(),'physical file set mismatch');
 const globalCollections:Record<string,{path:string;key:string}>={words:{path:'public/data/v1/words.json',key:'wordId'},examples:{path:'public/data/v1/examples.json',key:'exampleId'},notes:{path:'public/data/v1/notes.json',key:'noteId'}};
 const safeRelative=(path:string)=>assert.ok(path&&!path.includes('\\')&&!path.includes(':')&&!path.startsWith('/')&&!path.split('/').includes('..'),'unsafe path');
 for(const [name,col]of Object.entries(contracts.collections)){
  sameKeys(col,['path','key','rowsField']);safeRelative(col.path);
  if(globalCollections[name]){
   assert.equal(col.path,globalCollections[name].path);assert.equal(col.key,globalCollections[name].key);assert.equal(col.rowsField,null,'global rows must be root array');
  }else{
   assert.ok(name==='curriculum'||name==='grammarQuestions','unsupported collection');
   assert.ok(col.path.startsWith('src/features/direct/curriculum')&&col.path.endsWith('.json'),'invalid curriculum path');
   const number=newUnitNumber(m.unit);
   if(number!==null){assert.equal(col.path,`src/features/direct/curriculumLV3Unit${number}.json`,'unit curriculum path mismatch');assert.equal(name,'curriculum','new-unit question schema unsupported');}
   assert.equal(col.key,name==='curriculum'?'learningItemId':'questionId');
   assert.equal(col.rowsField,name==='curriculum'?'learningItems':'grammarQuestions');
  }
 }
 for(const [path,g]of Object.entries(contracts.files)){
  safeRelative(path);sameKeys(g,['beforeHash','afterHash','beforeByteHash','afterByteHash',...(Object.hasOwn(g,'beforeFixture')?['beforeFixture']:[])]);
  for(const h of [g.beforeHash,g.afterHash,g.beforeByteHash,g.afterByteHash])requireDigest(h);
 }
 const allowed=new Map(scope.rows.map(r=>[r.dataset+':'+r.id,r]));
 assert.equal(allowed.size,scope.rows.length,'duplicate scope row');assert.ok(m.patches.length&&m.patches.length===allowed.size,'scope row set mismatch');
 const seen=new Set<string>();
 const protectedKeys=new Set(['status','wordId','exampleId','noteId','learningItemId','questionId','word','wordVariants','sentenceEn','originalExample','originalExamples','kind','review','practiceMode','stem','answer']);
 const allowedFields:Record<string,string[]>={
  words:['meaningZh','meaningEn','usagePattern','usagePatternZh','verbForms','pos','posAll'],
  examples:['sensePos','meaningHint'],notes:['title','content'],curriculum:['explanationZh'],grammarQuestions:['targetMeaningZh','options']
 };
 for(const p of m.patches){
  sameKeys(p,['dataset','path','key','id','before','after','reason','evidence','fieldEvidence']);
  const id=p.dataset+':'+p.id,r=allowed.get(id),col=contracts.collections[p.dataset];
  assert.ok(r&&!seen.has(id),'duplicate or unscoped row');seen.add(id);
  assert.ok(col);assert.equal(p.path,col.path);assert.equal(p.key,col.key);
  assert.ok(p.before&&typeof p.before==='object'&&!Array.isArray(p.before));assert.equal(p.before[p.key],p.id);
  assert.equal(auditHash(p.before),r.beforeHash);assert.deepEqual(p.after,r.after,'exact scope values required');
  if(m.unit==='LV3-U11')assert.ok(p.fieldEvidence!==null&&typeof p.fieldEvidence==='object'&&!Array.isArray(p.fieldEvidence),'invalid U11 field evidence object');
  if(m.unit==='LV3-U11'&&p.dataset==='words'&&p.id==='W004264')assert.ok(verifiedU11DebutForms(m,p),'incomplete U11 debut contract');
  let fields=allowedFields[p.dataset];
  const republicFact=verifiedU09RepublicFact(m,p);
  if(republicFact)fields=['sentenceEn','sentenceZh','blankSentence'];
  if(verifiedU11ReviewPatch(m,p,'examples'))fields=['sentenceZh'];
  if(p.dataset==='curriculum'){
   if(m.unit==='LV3-U12'){
    assert.ok(p.fieldEvidence!==null&&typeof p.fieldEvidence==='object'&&!Array.isArray(p.fieldEvidence),'invalid U12 field evidence object');
    if(Object.hasOwn(p.fieldEvidence,'pattern')||Object.hasOwn(p.after,'pattern'))assert.ok(verifiedU12PatternPatch(m,p),'incomplete U12 pattern contract');
   }
   if(m.unit==='LV3-U11'&&Object.hasOwn(p.fieldEvidence??{},'pattern'))assert.ok(verifiedU11ReviewPatch(m,p,'curriculum'),'incomplete U11 pattern contract');
   if(m.unit==='LV3-U09'&&Object.hasOwn(p.fieldEvidence??{},'pattern'))assert.ok(verifiedU09PatternErratum(m,p),'incomplete U09 pattern contract');
   assert.ok(p.before.kind==='grammar'||p.before.kind==='vocabulary','unknown curriculum kind');
   fields=p.before.kind==='grammar'?['explanationZh']:['sensePos','targetMeaningZh','chapterMeaningsZh','meaningSource'];
   if(p.before.kind==='grammar'&&verifiedU06PatternErratum(m,p))fields=['pattern'];
   if(p.before.kind==='grammar'&&verifiedU07PatternErratum(m,p))fields=['pattern','explanationZh'];
   if(p.before.kind==='grammar'&&verifiedU09PatternErratum(m,p))fields=['pattern','explanationZh'];
   if(p.before.kind==='grammar'&&verifiedU11ReviewPatch(m,p,'curriculum'))fields=['pattern','explanationZh'];
   if(p.before.kind==='grammar'&&verifiedU12PatternPatch(m,p))fields=['pattern','explanationZh'];
   if(Object.hasOwn(p.after,'meaningSource'))assert.ok(['textbook_source_review','textbook_and_dictionary_review'].includes(p.after.meaningSource as string),'invalid reviewed meaning source');
   for(const [field,value]of Object.entries(p.after).filter(([field])=>fields.includes(field))){
    assert.ok(typeof value==='string'&&value.trim(),'invalid curriculum scalar');
    assert.ok(p.fieldEvidence?.[field]?.length,'missing curriculum field source');
   }
  }
  assert.ok(Object.keys(p.after).length&&Object.keys(p.after).every(k=>fields?.includes(k)&&(!protectedKeys.has(k)||(republicFact&&k==='sentenceEn'))),'disallowed after field');
  assert.ok(Object.entries(p.after).some(([k,v])=>!Object.hasOwn(p.before,k)||auditHash(p.before[k])!==auditHash(v)),'no-op patch');
  assert.ok(typeof p.reason==='string'&&p.reason.trim()&&p.fieldEvidence&&Object.keys(p.fieldEvidence).length,'missing evidence');
  for(const records of Object.values(p.fieldEvidence)){
   assert.ok(Array.isArray(records)&&records.length,'missing field source');
   for(const record of records){
    const r=record as {sources?:unknown[];reason?:string;proposal?:string};
    assert.ok(Array.isArray(r.sources)&&r.sources.length&&r.reason&&r.proposal,'missing field source');
   }
  }
  if(Object.hasOwn(p.after,'options')){
   const old=p.before.options as Row[],next=p.after.options as Row[];
   assert.ok(Array.isArray(old)&&Array.isArray(next));assert.equal(old.length,4);assert.equal(next.length,4);
   assert.deepEqual(next.map(o=>o.id),old.map(o=>o.id),'option identities/order');
   assert.equal(new Set(next.map(o=>o.text)).size,4);
   for(let i=0;i<4;i++){
    assert.deepEqual(keys(next[i]),keys(old[i]));
    for(const k of Object.keys(old[i]).filter(k=>!['text','rationaleZh'].includes(k)))assert.deepEqual(next[i][k],old[i][k]);
    for(const k of ['text','rationaleZh'])assert.ok(typeof next[i][k]==='string'&&(next[i][k] as string).trim(),'invalid option content');
    if(old[i].id===p.before.answer)assert.equal(next[i].text,old[i].text,'correct answer text');
   }
  }
  if(Object.hasOwn(p.after,'verbForms')){
   const f=p.after.verbForms as Row;sameKeys(f,['base','past','pastParticiple','sourceRef','status']);
   assert.ok(p.id==='W002976'||p.before.word==='wage(s)'
    ?verifiedWageForms(p,f):f.base===p.before.word,'invalid verified forms base');assert.equal(f.status,'approved');
   assert.ok(verifiedU08DiscomfortForms(m,p,f)||verifiedU11DebutForms(m,p)||['https://www.collinsdictionary.com/dictionary/english/'+f.base,'https://www.collinsdictionary.com/conjugation/english/'+f.base].includes(f.sourceRef as string),'invalid verified forms source');
   assert.ok((p.fieldEvidence.verbForms??[]).some(record=>(record as {sources:unknown[]}).sources.some(source=>typeof source==='object'&&source!==null&&(source as Row).url===f.sourceRef)),'forms source lacks evidence');
  }
 }
}


export function loadLV3Chain(){
 const chain=read('chain.json') as {schemaVersion:number;baseline:string;anchor:string;anchorHash:string;entries:Entry[]};
 assert.ok([1,2].includes(chain.schemaVersion));assert.equal(chain.baseline,BASELINE);
 assert.equal(chain.entries[0]?.unit,'LV3-U01');
 assert.equal(new Set(chain.entries.map(e=>e.kind==='migration'?e.migrationId:e.unit)).size,chain.entries.length);
 const anchor=read(chain.anchor) as {inputs:Record<string,string>};assert.equal(auditHash(anchor),chain.anchorHash);assert.equal(chain.anchorHash,U01_ANCHOR_HASH);
 assert.equal(chain.entries[0].manifestHash,U01_MANIFEST_HASH);assert.equal(chain.entries[0].status,'committed');
 const ledger=read('LV3-ledger.json') as {units:{unit:number;source:string}[]};
 const catalog=new Map(ledger.units.map(u=>['LV3-U'+String(u.unit).padStart(2,'0'),u.source]));assert.equal(catalog.size,23);assert.ok(!catalog.has('LV3-U03'));
 let previousInputs:Record<string,string>|null={...anchor.inputs};
 const derived=['public/data/v1/meta.json','public/data/v1/sa-pack.json'];
 let previous:string|undefined,prepared=false;
 return chain.entries.map((e,index)=>{
  assert.ok(e.status==='committed'||e.status==='prepared');
  assert.ok(!prepared||e.status==='prepared','committed chain gap');prepared ||= e.status==='prepared';
  const candidate=read(e.path) as Manifest;
  if(e.kind==='migration'){
   assert.equal(chain.schemaVersion,2);assert.deepEqual(Object.keys(e).sort(),['kind','migrationId','path','manifestHash','status'].sort());
   assert.equal(e.migrationId,MIGRATION_ID);assert.equal(chain.entries[index-1]?.unit,'LV3-U05','migration position');assert.equal(chain.entries[index-1]?.status,'committed','migration predecessor must be committed');
   assert.ok(isMigration(candidate));assert.equal(auditHash(candidate),e.manifestHash);assert.equal(candidate.parentManifestHash,previous);assert.ok(previousInputs);
   validateStarterMediaMigration(candidate,migrationLoad,previousInputs);previousInputs={...candidate.afterInputs};previous=e.manifestHash;
   return {entry:e,manifest:candidate,scope:undefined};
  }
  assert.equal(e.kind,undefined,'unknown chain kind');assert.deepEqual(Object.keys(e).sort(),['unit','path','manifestHash','status'].sort(),'unknown chain entry fields');assert.ok(e.unit);assert.ok(!isMigration(candidate),'untyped migration');
  const manifest=candidate;
  assert.equal(auditHash(manifest),e.manifestHash);assert.equal(manifest.unit,e.unit);assert.equal(manifest.baseline,BASELINE);
  let scope:AuditScope|undefined;
  if(manifest.schemaVersion===2){
   assert.equal(manifest.parentManifestHash,previous,'broken parent chain');
   assert.ok(manifest.scope);scope=read(manifest.scope) as AuditScope;validateAuditScope(manifest,scope);
   assert.ok(previousInputs,'predecessor checkpoint not finalized');
   const files=manifest.files!,collections=manifest.collections!;
   for(const name of ['curriculum','grammarQuestions'])if(collections[name])assert.equal(collections[name].path,catalog.get(e.unit),'unit curriculum path');
   assert.deepEqual(Object.keys(manifest.unchangedInputs??{}).sort(),Object.keys(previousInputs).filter(p=>!files[p]&&!derived.includes(p)).sort());
   for(const [p,h]of Object.entries(manifest.unchangedInputs??{}))assert.equal(previousInputs[p],h,'chain unchanged guard');
   for(const [p,g]of Object.entries(files))assert.equal(previousInputs[p],g.beforeByteHash,'broken before-byte chain');
   assert.deepEqual(manifest.derivedBefore,Object.fromEntries(derived.map(p=>[p,previousInputs![p]])));
   previousInputs={...previousInputs,...Object.fromEntries(Object.entries(files).map(([p,g])=>{assert.ok(g.afterByteHash);return [p,g.afterByteHash];}))};
   if(manifest.derivedAfter==null){assert.equal(e.status,'prepared');previousInputs=null;}
   else{assert.deepEqual(Object.keys(manifest.derivedAfter).sort(),[...derived].sort());Object.assign(previousInputs,manifest.derivedAfter);}
   if(e.status==='committed')assert.equal(manifest.readiness,'ready');
  }else{assert.equal(previous,undefined);assert.equal(manifest.unit,'LV3-U01');}
  assert.ok(catalog.has(e.unit),'unregistered LV3 unit');
  previous=e.manifestHash;
  return {entry:e,manifest,scope};
 });
}

let validatedChain:ReturnType<typeof loadLV3Chain>|undefined;
const stableChain=()=>validatedChain??=loadLV3Chain();

function rows(value:unknown,col:Collection):Row[]{
 const result=col.rowsField?(value as Row)[col.rowsField]:value;
 assert.ok(Array.isArray(result),'collection must contain rows');return result as Row[];
}

/** Strict physical-file projection; checks complete documents, never subsets. */
export function projectAuditStep(m:AuditManifest,documents:Record<string,unknown>,inverse=true,scope?:AuditScope){
 if(m.schemaVersion===2){assert.ok(scope);validateAuditScope(m,scope);}
 const c=auditContract(m),out=structuredClone(documents);
 assert.deepEqual(Object.keys(documents).sort(),Object.keys(c.files).sort(),'incomplete document set');
 for(const [name,col]of Object.entries(c.collections))if(['curriculum','grammarQuestions'].includes(name))validateCurriculumIdentity(m.unit,col.path,documents[col.path]);
 for(const [path,g]of Object.entries(c.files))assert.equal(auditHash(documents[path]),g[inverse?'afterHash':'beforeHash'],'unknown whole-file drift');
 for(const p of inverse?[...m.patches].reverse():m.patches){
  const col=c.collections[p.dataset],rr=rows(out[col.path],col),indices=rr.flatMap((r,i)=>r[p.key]===p.id?[i]:[]);
  assert.equal(indices.length,1,'nonunique row');
  assert.deepEqual(rr[indices[0]],inverse?{...p.before,...p.after}:p.before,'complete row drift');
  rr[indices[0]]=structuredClone(inverse?p.before:{...p.before,...p.after});
 }
 for(const col of Object.values(c.collections)){
  const old=rows(documents[col.path],col).map(r=>r[col.key]),next=rows(out[col.path],col).map(r=>r[col.key]);
  assert.deepEqual(next,old,'ID/order/count');assert.equal(new Set(next).size,next.length,'duplicate IDs');
 }
 for(const [path,g]of Object.entries(c.files))assert.equal(auditHash(out[path]),g[inverse?'beforeHash':'afterHash'],'wrong result hash');
 return out;
}

/** Row-level compatibility for historical fixtures; untouched drift stays visible. */
function reverseRows<T>(m:AuditManifest,dataset:string,value:T,allowMissing:boolean):T {
 const c=auditContract(m),col=c.collections[dataset],out=structuredClone(value);
 if(!col)return out;
 assert.equal(col.rowsField,null,'use physical-file projection for curriculum documents');
 const rr=rows(out,col);
 for(const p of [...m.patches].reverse().filter(p=>p.dataset===dataset)){
  const indexes=rr.flatMap((r,i)=>r[p.key]===p.id?[i]:[]);
  assert.ok(indexes.length<=1,'audit cannot conceal duplicate identities');
  if(!indexes.length&&allowMissing)continue;
  assert.equal(indexes.length,1,'complete audit dataset must contain recorded identity');
  assert.deepEqual(rr[indexes[0]],{...p.before,...p.after},'exact audited row required');
  rr[indexes[0]]=structuredClone(p.before);
 }
 return out;
}

function checkpoint(afterUnit:string){
 const chain=stableChain(),committed=chain.filter(x=>x.entry.status==='committed');
 const positions=committed.flatMap((x,i)=>(x.entry.unit??x.entry.migrationId)===afterUnit?[i]:[]);
 assert.equal(positions.length,1,'unknown or uncommitted checkpoint');
 const index=positions[0],anchor=read('U01-checkpoint.json') as {inputs:Record<string,string>};
 const bytes={...anchor.inputs},semantic:Record<string,string>={};
 for(const step of committed.slice(0,index+1)){
  if(isMigration(step.manifest)){Object.assign(bytes,step.manifest.afterInputs);const proof=validateStarterMediaMigration(step.manifest,migrationLoad);semantic[BUILDER]=auditHash(proof.texts.afterBuilder.replace(/\r\n/g,'\n'));continue;}
  for(const [path,g]of Object.entries(auditContract(step.manifest).files)){
   semantic[path]=g.afterHash;if(g.afterByteHash)bytes[path]=g.afterByteHash;
  }
  Object.assign(bytes,step.manifest.derivedAfter??{});
  if(step.manifest.derivedAfter?.[PACK])delete semantic[PACK];
 }
 const later=committed.slice(index+1);
 for(const step of later){if(isMigration(step.manifest)){const proof=validateStarterMediaMigration(step.manifest,migrationLoad);if(!semantic[BUILDER])semantic[BUILDER]=auditHash(proof.texts.beforeBuilder.replace(/\r\n/g,'\n'));continue;}for(const [path,g]of Object.entries(auditContract(step.manifest).files))if(!semantic[path])semantic[path]=g.beforeHash;}
 return {later,bytes,semantic};
}

export function lv3AfterUnitRows<T>(afterUnit:string,dataset:string,value:T,options:{allowMissing?:boolean}={}):T {
 const name=dataset.replace(/\.json$/,''),{later}=checkpoint(afterUnit);
 let copy=structuredClone(value);
 for(const x of [...later].reverse())if(!isMigration(x.manifest))copy=reverseRows(x.manifest,name,copy,options.allowMissing??false);
 return copy;
}
export function lv3AfterUnit1Rows<T>(dataset:string,value:T,options:{allowMissing?:boolean}={}):T {
 return lv3AfterUnitRows('LV3-U01',dataset,value,options);
}
export function lv3BeforeAudit<T>(dataset:string,value:T,options:{allowMissing?:boolean}={}):T {
 return lv3Unit1BeforeAudit(dataset,lv3AfterUnit1Rows(dataset,value,options),options);
}

export function reverseFileAuditSteps<T>(steps:{manifest:Manifest;scope?:AuditScope}[],path:string,value:T,loadMigration:MigrationLoader=migrationLoad):T {
 let out=structuredClone(value);
 for(const {manifest,scope} of [...steps].reverse()){
  if(isMigration(manifest)){
   if(path===PACK){const proof=validateStarterMediaMigration(manifest,loadMigration);assert.deepEqual(out,proof.after,'migration whole pack drift');const pack=out as Row;for(const d of [...manifest.delta].reverse()){assert.deepEqual((pack.media as Row[])[d.afterIndex],d.row);(pack.media as Row[]).splice(d.afterIndex,1);}pack.meta=structuredClone(manifest.beforePackMeta);assert.deepEqual(pack,proof.before,'migration semantic inverse');}
   else if(path===BUILDER){assert.equal(typeof out,'string');out=inverseStarterMediaMigrationNormalized(manifest,path,out as string,loadMigration) as T;}
   continue;
  }
  if(manifest.schemaVersion===2){assert.ok(scope);validateAuditScope(manifest,scope);}
  if(manifest.schemaVersion===2&&(path===PACK||path==='public/data/v1/meta.json')){
   assert.ok(scope);const text=JSON.stringify(out,null,path===PACK?undefined:2)+'\n';out=JSON.parse(inversePublishedAuditStep(manifest,scope,path,text)) as T;continue;
  }
  const c=auditContract(manifest),guard=c.files[path];if(!guard)continue;
  for(const [name,col]of Object.entries(auditContract(manifest).collections))if(col.path===path&&['curriculum','grammarQuestions'].includes(name))validateCurriculumIdentity(manifest.unit,path,out);
  assert.equal(auditHash(out),guard.afterHash,'unknown whole-file drift');
  for(const p of [...manifest.patches].reverse().filter(p=>p.path===path)){
   const rr=rows(out,c.collections[p.dataset]),indices=rr.flatMap((r,i)=>r[p.key]===p.id?[i]:[]);
   assert.equal(indices.length,1,'nonunique row');assert.deepEqual(rr[indices[0]],{...p.before,...p.after});
   rr[indices[0]]=structuredClone(p.before);
  }
  assert.equal(auditHash(out),guard.beforeHash,'wrong inverse hash');
 }
 return out;
}
export function lv3AfterUnitFile<T>(afterUnit:string,path:string,value:T):T {
 const state=checkpoint(afterUnit),out=reverseFileAuditSteps(state.later,path,value);
 if(state.semantic[path])assert.equal(auditHash(out),state.semantic[path],'target checkpoint semantic drift');
 else if(state.bytes[path]){
  if(path===PACK||path==='public/data/v1/meta.json'){
   const raw=JSON.stringify(out,null,path===PACK?undefined:2)+'\n';assert.equal(createHash('sha256').update(raw).digest('hex'),state.bytes[path],'target checkpoint derived drift');return out;
  }
  // Authenticate exact original formatting before comparing parsed untouched data.
  const raw=readFileSync(new URL('../../../'+path,import.meta.url),'utf8').replace(/\r\n/g,'\n');
  const digest=createHash('sha256').update(raw).digest('hex');
  assert.equal(digest,state.bytes[path],'target checkpoint byte drift');
  const target=path===BUILDER?raw:JSON.parse(raw);
  // Same strict comparison, with a short negative diagnostic before constructing a full array diff.
  if(path!==BUILDER)assert.ok(isDeepStrictEqual(out,target),'target checkpoint semantic drift');
  assert.deepEqual(out,target,'target checkpoint semantic drift');
 }
 return out;
}
export function lv3AfterUnit1File<T>(path:string,value:T):T {
 return lv3AfterUnitFile('LV3-U01',path,value);
}


/** Strict one-step raw projection, also used for cross-language fixture parity. */
export function inversePublishedAuditStep(m:AuditManifest,scope:AuditScope,path:string,text:string):string {
 validateAuditScope(m,scope);
 assert.equal(text,text.replace(/\r\n/g,'\n'),'caller must normalize CRLF first');
 const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
 let out=text;
  const c=auditContract(m),guard=c.files[path];
  if(guard){
   assert.equal(digest(out),guard.afterByteHash,'unknown raw after drift');
   const value=JSON.parse(out);assert.equal(auditHash(value),guard.afterHash);
   for(const [name,col]of Object.entries(c.collections))if(col.path===path&&['curriculum','grammarQuestions'].includes(name))validateCurriculumIdentity(m.unit,path,value);
   for(const p of [...m.patches].reverse().filter(p=>p.path===path)){
    const rr=rows(value,c.collections[p.dataset]),indexes=rr.flatMap((r,i)=>r[p.key]===p.id?[i]:[]);
    assert.equal(indexes.length,1);assert.deepEqual(rr[indexes[0]],{...p.before,...p.after});rr[indexes[0]]=structuredClone(p.before);
   }
   assert.equal(auditHash(value),guard.beforeHash);out=JSON.stringify(value,null,2)+'\n';
   if(digest(out)!==guard.beforeByteHash){
    const fixture=guard.beforeFixture;assert.ok(fixture,'missing guarded byte fixture');
    assert.ok(fixture.startsWith('docs/lv3-audit-20261107/'),'invalid byte fixture path');
    const relative=fixture.slice('docs/lv3-audit-20261107/'.length);
    assert.ok(!relative.includes('..')&&!relative.includes(':')&&!relative.includes('\\'),'unsafe fixture path');
    out=readFileSync(new URL(relative,docs),'utf8').replace(/\r\n/g,'\n');assert.equal(auditHash(JSON.parse(out)),guard.beforeHash);
   }
   assert.equal(digest(out),guard.beforeByteHash,'wrong raw before hash');
  }else if(path==='public/data/v1/meta.json'||path==='public/data/v1/sa-pack.json'){
   assert.ok(m.derivedAfter&&m.derivedBefore);assert.equal(digest(out),m.derivedAfter[path],'unknown derived after drift');
   if(path.endsWith('/meta.json')){assert.ok(m.beforeMeta);out=JSON.stringify(m.beforeMeta,null,2)+'\n';}
   else{
    const pack=JSON.parse(out) as Row;
    for(const name of ['words','examples','notes'])if(c.collections[name])pack[name]=reverseRows(m,name,pack[name],true);
    assert.ok(m.beforePackMeta);pack.meta=structuredClone(m.beforePackMeta);out=JSON.stringify(pack)+'\n';
   }
   assert.equal(digest(out),m.derivedBefore[path],'wrong derived before hash');
  }

 return out;
}

/** Raw projection checks the selected target even when the successor list is empty. */
export function lv3AfterUnitPublishedText(afterUnit:string,path:string,text:string):string {
 assert.equal(text,text.replace(/\r\n/g,'\n'),'caller must normalize CRLF first');
 const state=checkpoint(afterUnit);
 let out=text;
 for(const {manifest,scope} of [...state.later].reverse()){
  if(isMigration(manifest)){out=inverseStarterMediaMigrationNormalized(manifest,path,out,migrationLoad);continue;}
  assert.ok(scope);out=inversePublishedAuditStep(manifest,scope,path,out);
 }
 if(state.bytes[path])assert.equal(createHash('sha256').update(out).digest('hex'),state.bytes[path],'target checkpoint raw drift');
 return out;
}
export function lv3AfterUnit1PublishedText(path:string,text:string):string {
 return lv3AfterUnitPublishedText('LV3-U01',path,text);
}
