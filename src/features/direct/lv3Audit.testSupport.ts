import assert from 'node:assert/strict';
import {isDeepStrictEqual,types as utilTypes} from 'node:util';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {beforeU03Starter,beforeU03StarterText} from './lv3U03Starter.testSupport';
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
 if(number===18){
  const identity=items.map(row=>[row.learningItemId,row.kind,row.sourcePage]);
  assert.equal(identity.length,146);assert.equal(auditHash(identity),'bb5e2f8487c2f4010de31ec935d8903ebdb962b0a81259e402e2fb918836575f','U18 original curriculum identity mismatch');return;
 }
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


// Exact U13 source candidate patches; no runtime mutable output dependency.
const U13_PATTERN_PATCHES:AuditPatch[]=JSON.parse(String.raw`[
  {
    "dataset": "curriculum",
    "path": "src/features/direct/curriculumLV3Unit13.json",
    "key": "learningItemId",
    "id": "LI-LV3U13-G024",
    "before": {
      "learningItemId": "LI-LV3U13-G024",
      "kind": "grammar",
      "sourcePage": 134,
      "pattern": "mankind 與 man 均表人類，為不可數集合名詞，前不置 a 或 the，與單數動詞並用",
      "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    "after": {
      "explanationZh": "本頁談泛指整體「人類」的 mankind 與 man：此用法不加 a 或 the，搭配單數動詞。限制只適用本章人類義，不能套用到 man 指一名男子的可數用法。",
      "pattern": "mankind 與 man 在本章泛指整體人類時，不加 a 或 the，與單數動詞並用"
    },
    "reason": "以實際目視教材的本列用法補足流程占位文字；必要時明示教材概括與直接字典的範圍差異，不採用原書完整例句、不改 pattern 或核准狀態。 直接詞典與原照片交叉核對後，窄化教材絕對化用法，與同列explanationZh一起修正；保留完整原pattern及來源差異，不新增例句、ID或核准。",
    "evidence": [
      "https://www.collinsdictionary.com/dictionary/english/man",
      "https://www.collinsdictionary.com/dictionary/english/mankind"
    ],
    "fieldEvidence": {
      "explanationZh": [
        {
          "proposal": "U13-SOURCE-LI-LV3U13-G024",
          "originFindingIds": [
            "U13-SOURCE-LI-LV3U13-G024"
          ],
          "reason": "以實際目視教材的本列用法補足流程占位文字；必要時明示教材概括與直接字典的範圍差異，不採用原書完整例句、不改 pattern 或核准狀態。",
          "sources": [
            {
              "type": "textbook_photo",
              "file": "20260815_101443.jpg",
              "page": 134,
              "sha256": "3da899a3c39d9959bcd6027329d67db3d955fe17d21f9e08d090ec60cc93907d",
              "verification": "pixels_displayed_and_visually_read",
              "excerpt": "mankind 及 man 均表「人類」，視作集合名詞，不可數，且之前不置任何冠詞（a 或 the），與單數動詞並用。",
              "excerptNormalization": "Printed words transcribed from displayed pixels. Line breaks, spacing and comma glyphs normalized; pronunciation/footnote markers omitted. This field is not the candidate editorial text.",
              "printedExcerpt": "mankind 及 man 均表「人類」，視作集合名詞，不可數，且之前不置任何冠詞（a 或 the），與單數動詞並用。",
              "editorialSummary": "本頁談泛指整體「人類」的 mankind 與 man：此用法不加 a 或 the，搭配單數動詞。限制只適用本章人類義，不能套用到 man 指一名男子的可數用法。",
              "editorialSummaryStatus": "Source review synthesis, not verbatim quotation or new user approval."
            },
            {
              "type": "dictionary",
              "url": "https://www.collinsdictionary.com/dictionary/english/man",
              "verification": "direct_page_read",
              "claim": "Distinguishes human-race use from countable adult-male use.",
              "evidenceArtifact": "coordinator/grammar-dictionary-raw-v2.json"
            },
            {
              "type": "dictionary",
              "url": "https://www.collinsdictionary.com/dictionary/english/mankind",
              "verification": "direct_page_read",
              "claim": "Uncountable collective human-race use.",
              "evidenceArtifact": "coordinator/grammar-dictionary-raw-v1.json"
            }
          ],
          "beforePresent": true
        }
      ],
      "pattern": [
        {
          "proposal": "U13-SOURCE-LI-LV3U13-G024",
          "originFindingIds": [
            "U13-SOURCE-LI-LV3U13-G024"
          ],
          "reason": "直接詞典與原照片交叉核對後，窄化教材絕對化用法，與同列explanationZh一起修正；保留完整原pattern及來源差異，不新增例句、ID或核准。",
          "sources": [
            {
              "type": "textbook_photo",
              "file": "20260815_101443.jpg",
              "page": 134,
              "sha256": "3da899a3c39d9959bcd6027329d67db3d955fe17d21f9e08d090ec60cc93907d",
              "verification": "pixels_displayed_and_visually_read",
              "excerpt": "mankind 及 man 均表「人類」，視作集合名詞，不可數，且之前不置任何冠詞（a 或 the），與單數動詞並用。",
              "excerptNormalization": "Printed words transcribed from displayed pixels. Line breaks, spacing and comma glyphs normalized; pronunciation/footnote markers omitted. This field is not the candidate editorial text.",
              "printedExcerpt": "mankind 及 man 均表「人類」，視作集合名詞，不可數，且之前不置任何冠詞（a 或 the），與單數動詞並用。",
              "editorialSummary": "mankind 與 man 在本章泛指整體人類時，不加 a 或 the，與單數動詞並用",
              "editorialSummaryStatus": "Source review synthesis, not verbatim quotation or new user approval."
            },
            {
              "type": "dictionary",
              "url": "https://www.collinsdictionary.com/dictionary/english/man",
              "verification": "direct_page_read",
              "claim": "Distinguishes human-race use from countable adult-male use.",
              "evidenceArtifact": "coordinator/grammar-dictionary-raw-v2.json"
            },
            {
              "type": "dictionary",
              "url": "https://www.collinsdictionary.com/dictionary/english/mankind",
              "verification": "direct_page_read",
              "claim": "Uncountable collective human-race use.",
              "evidenceArtifact": "coordinator/grammar-dictionary-raw-v1.json"
            }
          ],
          "beforePresent": true
        }
      ]
    }
  },
  {
    "dataset": "curriculum",
    "path": "src/features/direct/curriculumLV3Unit13.json",
    "key": "learningItemId",
    "id": "LI-LV3U13-G025",
    "before": {
      "learningItemId": "LI-LV3U13-G025",
      "kind": "grammar",
      "sourcePage": 134,
      "pattern": "human being 為可數名詞，單數 a human being，複數 human beings（前不置 the）",
      "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    "after": {
      "explanationZh": "human being 是可數名詞，單數可說 a human being，複數為 human beings。教材「前不置 the」只宜理解為泛指人類；特指已知的一群人時仍可用 the，不是複數名詞一律禁用 the。",
      "pattern": "human being 為可數名詞，單數 a human being，複數 human beings；泛指複數不加 the，特指時可加 the"
    },
    "reason": "以實際目視教材的本列用法補足流程占位文字；必要時明示教材概括與直接字典的範圍差異，不採用原書完整例句、不改 pattern 或核准狀態。 直接詞典與原照片交叉核對後，窄化教材絕對化用法，與同列explanationZh一起修正；保留完整原pattern及來源差異，不新增例句、ID或核准。",
    "evidence": [
      "https://www.collinsdictionary.com/dictionary/english/human-being",
      "https://www.collinsdictionary.com/dictionary/english/the"
    ],
    "fieldEvidence": {
      "explanationZh": [
        {
          "proposal": "U13-SOURCE-LI-LV3U13-G025",
          "originFindingIds": [
            "U13-SOURCE-LI-LV3U13-G025"
          ],
          "reason": "以實際目視教材的本列用法補足流程占位文字；必要時明示教材概括與直接字典的範圍差異，不採用原書完整例句、不改 pattern 或核准狀態。",
          "sources": [
            {
              "type": "textbook_photo",
              "file": "20260815_101443.jpg",
              "page": 134,
              "sha256": "3da899a3c39d9959bcd6027329d67db3d955fe17d21f9e08d090ec60cc93907d",
              "verification": "pixels_displayed_and_visually_read",
              "excerpt": "human being 亦表「人類」，卻是可數名詞，單數為 a human being，複數則為 human beings（之前不置 the）。",
              "excerptNormalization": "Printed words transcribed from displayed pixels. Line breaks, spacing and comma glyphs normalized; pronunciation/footnote markers omitted. This field is not the candidate editorial text.",
              "printedExcerpt": "human being 亦表「人類」，卻是可數名詞，單數為 a human being，複數則為 human beings（之前不置 the）。",
              "editorialSummary": "human being 是可數名詞，單數可說 a human being，複數為 human beings。教材「前不置 the」只宜理解為泛指人類；特指已知的一群人時仍可用 the，不是複數名詞一律禁用 the。",
              "editorialSummaryStatus": "Source review synthesis, not verbatim quotation or new user approval."
            },
            {
              "type": "dictionary",
              "url": "https://www.collinsdictionary.com/dictionary/english/human-being",
              "verification": "direct_page_read",
              "claim": "Countable noun with plural human beings.",
              "evidenceArtifact": "coordinator/grammar-dictionary-raw-v1.json"
            },
            {
              "type": "dictionary",
              "url": "https://www.collinsdictionary.com/dictionary/english/the",
              "verification": "direct_page_read",
              "claim": "Definite determiner can identify an already mentioned or specified group.",
              "evidenceArtifact": "coordinator/grammar-dictionary-raw-v3.json"
            }
          ],
          "beforePresent": true
        }
      ],
      "pattern": [
        {
          "proposal": "U13-SOURCE-LI-LV3U13-G025",
          "originFindingIds": [
            "U13-SOURCE-LI-LV3U13-G025"
          ],
          "reason": "直接詞典與原照片交叉核對後，窄化教材絕對化用法，與同列explanationZh一起修正；保留完整原pattern及來源差異，不新增例句、ID或核准。",
          "sources": [
            {
              "type": "textbook_photo",
              "file": "20260815_101443.jpg",
              "page": 134,
              "sha256": "3da899a3c39d9959bcd6027329d67db3d955fe17d21f9e08d090ec60cc93907d",
              "verification": "pixels_displayed_and_visually_read",
              "excerpt": "human being 亦表「人類」，卻是可數名詞，單數為 a human being，複數則為 human beings（之前不置 the）。",
              "excerptNormalization": "Printed words transcribed from displayed pixels. Line breaks, spacing and comma glyphs normalized; pronunciation/footnote markers omitted. This field is not the candidate editorial text.",
              "printedExcerpt": "human being 亦表「人類」，卻是可數名詞，單數為 a human being，複數則為 human beings（之前不置 the）。",
              "editorialSummary": "human being 為可數名詞，單數 a human being，複數 human beings；泛指複數不加 the，特指時可加 the",
              "editorialSummaryStatus": "Source review synthesis, not verbatim quotation or new user approval."
            },
            {
              "type": "dictionary",
              "url": "https://www.collinsdictionary.com/dictionary/english/human-being",
              "verification": "direct_page_read",
              "claim": "Countable noun with plural human beings.",
              "evidenceArtifact": "coordinator/grammar-dictionary-raw-v1.json"
            },
            {
              "type": "dictionary",
              "url": "https://www.collinsdictionary.com/dictionary/english/the",
              "verification": "direct_page_read",
              "claim": "Definite determiner can identify an already mentioned or specified group.",
              "evidenceArtifact": "coordinator/grammar-dictionary-raw-v3.json"
            }
          ],
          "beforePresent": true
        }
      ]
    }
  },
  {
    "dataset": "curriculum",
    "path": "src/features/direct/curriculumLV3Unit13.json",
    "key": "learningItemId",
    "id": "LI-LV3U13-G026",
    "before": {
      "learningItemId": "LI-LV3U13-G026",
      "kind": "grammar",
      "sourcePage": 134,
      "pattern": "humankind 與 mankind 意思及用法完全相同",
      "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    "after": {
      "explanationZh": "本章 humankind 與 mankind 都指整體人類、作不可數名詞。教材稱意思及用法「完全相同」是本章概括；實際用詞仍有語用差異，mankind 的泛指用法有人避免使用。",
      "pattern": "humankind 與 mankind 在本章都指整體人類，作不可數名詞"
    },
    "reason": "以實際目視教材的本列用法補足流程占位文字；必要時明示教材概括與直接字典的範圍差異，不採用原書完整例句、不改 pattern 或核准狀態。 直接詞典與原照片交叉核對後，窄化教材絕對化用法，與同列explanationZh一起修正；保留完整原pattern及來源差異，不新增例句、ID或核准。",
    "evidence": [
      "https://www.collinsdictionary.com/dictionary/english/mankind",
      "https://www.collinsdictionary.com/dictionary/english/humankind"
    ],
    "fieldEvidence": {
      "explanationZh": [
        {
          "proposal": "U13-SOURCE-LI-LV3U13-G026",
          "originFindingIds": [
            "U13-SOURCE-LI-LV3U13-G026"
          ],
          "reason": "以實際目視教材的本列用法補足流程占位文字；必要時明示教材概括與直接字典的範圍差異，不採用原書完整例句、不改 pattern 或核准狀態。",
          "sources": [
            {
              "type": "textbook_photo",
              "file": "20260815_101443.jpg",
              "page": 134,
              "sha256": "3da899a3c39d9959bcd6027329d67db3d955fe17d21f9e08d090ec60cc93907d",
              "verification": "pixels_displayed_and_visually_read",
              "excerpt": "humankind 與 mankind 意思及用法完全相同。",
              "excerptNormalization": "Printed words transcribed from displayed pixels. Line breaks, spacing and comma glyphs normalized; pronunciation/footnote markers omitted. This field is not the candidate editorial text.",
              "printedExcerpt": "humankind 與 mankind 意思及用法完全相同。",
              "editorialSummary": "本章 humankind 與 mankind 都指整體人類、作不可數名詞。教材稱意思及用法「完全相同」是本章概括；實際用詞仍有語用差異，mankind 的泛指用法有人避免使用。",
              "editorialSummaryStatus": "Source review synthesis, not verbatim quotation or new user approval."
            },
            {
              "type": "dictionary",
              "url": "https://www.collinsdictionary.com/dictionary/english/mankind",
              "verification": "direct_page_read",
              "claim": "Collective meaning and usage objection noted.",
              "evidenceArtifact": "coordinator/grammar-dictionary-raw-v1.json"
            },
            {
              "type": "dictionary",
              "url": "https://www.collinsdictionary.com/dictionary/english/humankind",
              "verification": "direct_page_read",
              "claim": "Collective uncountable human-race meaning.",
              "evidenceArtifact": "coordinator/grammar-dictionary-raw-v1.json"
            }
          ],
          "beforePresent": true
        }
      ],
      "pattern": [
        {
          "proposal": "U13-SOURCE-LI-LV3U13-G026",
          "originFindingIds": [
            "U13-SOURCE-LI-LV3U13-G026"
          ],
          "reason": "直接詞典與原照片交叉核對後，窄化教材絕對化用法，與同列explanationZh一起修正；保留完整原pattern及來源差異，不新增例句、ID或核准。",
          "sources": [
            {
              "type": "textbook_photo",
              "file": "20260815_101443.jpg",
              "page": 134,
              "sha256": "3da899a3c39d9959bcd6027329d67db3d955fe17d21f9e08d090ec60cc93907d",
              "verification": "pixels_displayed_and_visually_read",
              "excerpt": "humankind 與 mankind 意思及用法完全相同。",
              "excerptNormalization": "Printed words transcribed from displayed pixels. Line breaks, spacing and comma glyphs normalized; pronunciation/footnote markers omitted. This field is not the candidate editorial text.",
              "printedExcerpt": "humankind 與 mankind 意思及用法完全相同。",
              "editorialSummary": "humankind 與 mankind 在本章都指整體人類，作不可數名詞",
              "editorialSummaryStatus": "Source review synthesis, not verbatim quotation or new user approval."
            },
            {
              "type": "dictionary",
              "url": "https://www.collinsdictionary.com/dictionary/english/mankind",
              "verification": "direct_page_read",
              "claim": "Collective meaning and usage objection noted.",
              "evidenceArtifact": "coordinator/grammar-dictionary-raw-v1.json"
            },
            {
              "type": "dictionary",
              "url": "https://www.collinsdictionary.com/dictionary/english/humankind",
              "verification": "direct_page_read",
              "claim": "Collective uncountable human-race meaning.",
              "evidenceArtifact": "coordinator/grammar-dictionary-raw-v1.json"
            }
          ],
          "beforePresent": true
        }
      ]
    }
  },
  {
    "dataset": "curriculum",
    "path": "src/features/direct/curriculumLV3Unit13.json",
    "key": "learningItemId",
    "id": "LI-LV3U13-G031",
    "before": {
      "learningItemId": "LI-LV3U13-G031",
      "kind": "grammar",
      "sourcePage": 135,
      "pattern": "yell 多指生氣時所發出的大吼聲",
      "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    "after": {
      "explanationZh": "教材以生氣時的大吼說明 yell，但這不是唯一情境；yell 也可表示興奮或疼痛時大喊。",
      "pattern": "yell 指大聲喊叫；本頁以生氣時的大吼為例"
    },
    "reason": "以實際目視教材的本列用法補足流程占位文字；必要時明示教材概括與直接字典的範圍差異，不採用原書完整例句、不改 pattern 或核准狀態。 直接詞典與原照片交叉核對後，窄化教材絕對化用法，與同列explanationZh一起修正；保留完整原pattern及來源差異，不新增例句、ID或核准。",
    "evidence": [
      "https://www.collinsdictionary.com/dictionary/english/yell"
    ],
    "fieldEvidence": {
      "explanationZh": [
        {
          "proposal": "U13-SOURCE-LI-LV3U13-G031",
          "originFindingIds": [
            "U13-SOURCE-LI-LV3U13-G031"
          ],
          "reason": "以實際目視教材的本列用法補足流程占位文字；必要時明示教材概括與直接字典的範圍差異，不採用原書完整例句、不改 pattern 或核准狀態。",
          "sources": [
            {
              "type": "textbook_photo",
              "file": "20260815_101448.jpg",
              "page": 135,
              "sha256": "43b3a3c07ad43bbce12204f50fcc98364d5378468066e256c2be9a3f115dd426",
              "verification": "pixels_displayed_and_visually_read",
              "excerpt": "yell 則多指生氣時所發出的大吼聲。",
              "excerptNormalization": "Printed words transcribed from displayed pixels. Line breaks, spacing and comma glyphs normalized; pronunciation/footnote markers omitted. This field is not the candidate editorial text.",
              "printedExcerpt": "yell 則多指生氣時所發出的大吼聲。",
              "editorialSummary": "教材以生氣時的大吼說明 yell，但這不是唯一情境；yell 也可表示興奮或疼痛時大喊。",
              "editorialSummaryStatus": "Source review synthesis, not verbatim quotation or new user approval."
            },
            {
              "type": "dictionary",
              "url": "https://www.collinsdictionary.com/dictionary/english/yell",
              "verification": "direct_page_read",
              "claim": "Anger, excitement and pain are possible contexts.",
              "evidenceArtifact": "coordinator/grammar-dictionary-raw-v2.json"
            }
          ],
          "beforePresent": true
        }
      ],
      "pattern": [
        {
          "proposal": "U13-SOURCE-LI-LV3U13-G031",
          "originFindingIds": [
            "U13-SOURCE-LI-LV3U13-G031"
          ],
          "reason": "直接詞典與原照片交叉核對後，窄化教材絕對化用法，與同列explanationZh一起修正；保留完整原pattern及來源差異，不新增例句、ID或核准。",
          "sources": [
            {
              "type": "textbook_photo",
              "file": "20260815_101448.jpg",
              "page": 135,
              "sha256": "43b3a3c07ad43bbce12204f50fcc98364d5378468066e256c2be9a3f115dd426",
              "verification": "pixels_displayed_and_visually_read",
              "excerpt": "yell 則多指生氣時所發出的大吼聲。",
              "excerptNormalization": "Printed words transcribed from displayed pixels. Line breaks, spacing and comma glyphs normalized; pronunciation/footnote markers omitted. This field is not the candidate editorial text.",
              "printedExcerpt": "yell 則多指生氣時所發出的大吼聲。",
              "editorialSummary": "yell 指大聲喊叫；本頁以生氣時的大吼為例",
              "editorialSummaryStatus": "Source review synthesis, not verbatim quotation or new user approval."
            },
            {
              "type": "dictionary",
              "url": "https://www.collinsdictionary.com/dictionary/english/yell",
              "verification": "direct_page_read",
              "claim": "Anger, excitement and pain are possible contexts.",
              "evidenceArtifact": "coordinator/grammar-dictionary-raw-v2.json"
            }
          ],
          "beforePresent": true
        }
      ]
    }
  },
  {
    "dataset": "curriculum",
    "path": "src/features/direct/curriculumLV3Unit13.json",
    "key": "learningItemId",
    "id": "LI-LV3U13-G051",
    "before": {
      "learningItemId": "LI-LV3U13-G051",
      "kind": "grammar",
      "sourcePage": 138,
      "pattern": "hint 作及物動詞須接 that 子句作受詞；作不及物動詞與 at 並用",
      "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    "after": {
      "explanationZh": "本頁介紹 hint that + 子句與 hint at + 名詞兩種搭配，均表示暗示。教材「須接 that 子句」不表示連接詞 that 必須寫出；實際用例中 that 可省略。",
      "pattern": "hint (that) + 子句；hint at + 名詞，表示暗示"
    },
    "reason": "以實際目視教材的本列用法補足流程占位文字；必要時明示教材概括與直接字典的範圍差異，不採用原書完整例句、不改 pattern 或核准狀態。 直接詞典與原照片交叉核對後，窄化教材絕對化用法，與同列explanationZh一起修正；保留完整原pattern及來源差異，不新增例句、ID或核准。",
    "evidence": [
      "https://www.collinsdictionary.com/dictionary/english/hint"
    ],
    "fieldEvidence": {
      "explanationZh": [
        {
          "proposal": "U13-SOURCE-LI-LV3U13-G051",
          "originFindingIds": [
            "U13-SOURCE-LI-LV3U13-G051"
          ],
          "reason": "以實際目視教材的本列用法補足流程占位文字；必要時明示教材概括與直接字典的範圍差異，不採用原書完整例句、不改 pattern 或核准狀態。",
          "sources": [
            {
              "type": "textbook_photo",
              "file": "20260815_101507.jpg",
              "page": 138,
              "sha256": "ecce3fe63ab2d241e2fde332dc88ac7dc6039b6ee333c05dc17de11fa331ea78",
              "verification": "pixels_displayed_and_visually_read",
              "excerpt": "hint 作及物動詞時，須接 that 子句作受詞；若作不及物動詞時，與介詞 at 並用。",
              "excerptNormalization": "Printed words transcribed from displayed pixels. Line breaks, spacing and comma glyphs normalized; pronunciation/footnote markers omitted. This field is not the candidate editorial text.",
              "printedExcerpt": "hint 作及物動詞時，須接 that 子句作受詞；若作不及物動詞時，與介詞 at 並用。",
              "editorialSummary": "本頁介紹 hint that + 子句與 hint at + 名詞兩種搭配，均表示暗示。教材「須接 that 子句」不表示連接詞 that 必須寫出；實際用例中 that 可省略。",
              "editorialSummaryStatus": "Source review synthesis, not verbatim quotation or new user approval."
            },
            {
              "type": "dictionary",
              "url": "https://www.collinsdictionary.com/dictionary/english/hint",
              "verification": "direct_page_read",
              "claim": "Direct verb examples include both overt that and omitted that, and hint at.",
              "evidenceArtifact": "coordinator/grammar-dictionary-raw-v1.json"
            }
          ],
          "beforePresent": true
        }
      ],
      "pattern": [
        {
          "proposal": "U13-SOURCE-LI-LV3U13-G051",
          "originFindingIds": [
            "U13-SOURCE-LI-LV3U13-G051"
          ],
          "reason": "直接詞典與原照片交叉核對後，窄化教材絕對化用法，與同列explanationZh一起修正；保留完整原pattern及來源差異，不新增例句、ID或核准。",
          "sources": [
            {
              "type": "textbook_photo",
              "file": "20260815_101507.jpg",
              "page": 138,
              "sha256": "ecce3fe63ab2d241e2fde332dc88ac7dc6039b6ee333c05dc17de11fa331ea78",
              "verification": "pixels_displayed_and_visually_read",
              "excerpt": "hint 作及物動詞時，須接 that 子句作受詞；若作不及物動詞時，與介詞 at 並用。",
              "excerptNormalization": "Printed words transcribed from displayed pixels. Line breaks, spacing and comma glyphs normalized; pronunciation/footnote markers omitted. This field is not the candidate editorial text.",
              "printedExcerpt": "hint 作及物動詞時，須接 that 子句作受詞；若作不及物動詞時，與介詞 at 並用。",
              "editorialSummary": "hint (that) + 子句；hint at + 名詞，表示暗示",
              "editorialSummaryStatus": "Source review synthesis, not verbatim quotation or new user approval."
            },
            {
              "type": "dictionary",
              "url": "https://www.collinsdictionary.com/dictionary/english/hint",
              "verification": "direct_page_read",
              "claim": "Direct verb examples include both overt that and omitted that, and hint at.",
              "evidenceArtifact": "coordinator/grammar-dictionary-raw-v1.json"
            }
          ],
          "beforePresent": true
        }
      ]
    }
  }
]`);
const U13_PATTERN_IDS=new Set(U13_PATTERN_PATCHES.map(p=>p.id));
export function verifiedU13PatternPatch(m:AuditManifest,p:AuditPatch){
 return m.unit==='LV3-U13'&&p.dataset==='curriculum'&&U13_PATTERN_PATCHES.some(expected=>isDeepStrictEqual(p,expected));
}


// Only this full U13 patch admits groom as the existing variant base.
const U13_GROOM_PATCH:AuditPatch=JSON.parse(String.raw`{
  "dataset": "words",
  "path": "public/data/v1/words.json",
  "key": "wordId",
  "id": "W003112",
  "before": {
    "wordId": "W003112",
    "word": "bridegroom/groom",
    "wordVariants": [
      "bridegroom",
      "groom"
    ],
    "level": "LV4",
    "pos": "n.",
    "posAll": [
      "n."
    ],
    "meaningZh": "新郎；馬伕；男僕；餵馬",
    "meaningEn": "a man who has recently been married; a man participant in his own marriage ceremony; a man participant in his own marriage ceremony; a man who has recently been married",
    "usagePattern": "a/the bridegroom; bridegroom of N",
    "syllables": null,
    "stressPattern": null,
    "phoneticUs": null,
    "familyKey": "bridegroom",
    "isCore": true,
    "sourceNote": "高中英文參考詞彙表（111學年度起適用，大考中心）",
    "status": "draft",
    "usagePatternZh": "該新郎；……的新郎"
  },
  "after": {
    "pos": "n./v.",
    "posAll": [
      "n.",
      "v."
    ],
    "meaningEn": "(n., bridegroom or groom) a man who is getting married or has just married; (n., groom) a person who tends horses, or an archaic male servant; (v., groom) to clean and brush an animal or make an appearance neat.",
    "usagePattern": "the bride and groom; groom a horse",
    "usagePatternZh": "新娘與新郎；替馬梳洗",
    "verbForms": {
      "base": "groom",
      "past": "groomed",
      "pastParticiple": "groomed",
      "sourceRef": "https://www.collinsdictionary.com/dictionary/english/groom",
      "status": "approved"
    }
  },
  "reason": "bridegroom 僅新郎；groom 另有馬伕／男僕名詞與梳洗動詞，合併詞條需標示各自範圍。 bridegroom 僅新郎；groom 另有馬伕／男僕名詞與梳洗動詞，合併詞條需標示各自範圍。 原重複的新郎定義合併一次，補 groom 原已收馬伕／男僕及梳洗動詞；中文餵馬作動詞之精確性另留待查。 正文 bride and groom 與 groom an animal；不把所有 groom 義項等同 bridegroom。 正文 bride and groom 與 groom an animal；不把所有 groom 義項等同 bridegroom。 補缺的可信三態；僅 groom 動詞適用，若是合併 bridegroom/groom 詞條。",
  "evidence": [
    "https://www.collinsdictionary.com/dictionary/english/groom",
    "https://www.collinsdictionary.com/dictionary/english/bridegroom",
    "https://www.collinsdictionary.com/conjugation/english/groom"
  ],
  "fieldEvidence": {
    "pos": [
      {
        "proposal": "U13-GENERAL-W003112",
        "originFindingIds": [
          "U13-GENERAL-W003112"
        ],
        "reason": "bridegroom 僅新郎；groom 另有馬伕／男僕名詞與梳洗動詞，合併詞條需標示各自範圍。",
        "sources": [
          {
            "type": "dictionary",
            "url": "https://www.collinsdictionary.com/dictionary/english/groom",
            "verification": "direct_dictionary_body_read",
            "readDate": "2026-11-08",
            "claim": "bridegroom 僅新郎；groom 另有馬伕／男僕名詞與梳洗動詞，合併詞條需標示各自範圍。",
            "evidenceArtifacts": [
              {
                "artifact": "output/lv3-audit-20261107/u13-source/general/detail3-raw.json",
                "sha256": "4a950e3489e1550168fc9b853d8169aa7bc2ed3009493a1f1681387f3a8c1461"
              },
              {
                "artifact": "output/lv3-audit-20261107/u13-source/general/web8-raw.json",
                "sha256": "7229ad8222cea50fc69e6c5ada48a874e7b632818a586a3ac559d76a36c07a7b"
              }
            ]
          }
        ],
        "beforePresent": true
      }
    ],
    "posAll": [
      {
        "proposal": "U13-GENERAL-W003112",
        "originFindingIds": [
          "U13-GENERAL-W003112"
        ],
        "reason": "bridegroom 僅新郎；groom 另有馬伕／男僕名詞與梳洗動詞，合併詞條需標示各自範圍。",
        "sources": [
          {
            "type": "dictionary",
            "url": "https://www.collinsdictionary.com/dictionary/english/groom",
            "verification": "direct_dictionary_body_read",
            "readDate": "2026-11-08",
            "claim": "bridegroom 僅新郎；groom 另有馬伕／男僕名詞與梳洗動詞，合併詞條需標示各自範圍。",
            "evidenceArtifacts": [
              {
                "artifact": "output/lv3-audit-20261107/u13-source/general/detail3-raw.json",
                "sha256": "4a950e3489e1550168fc9b853d8169aa7bc2ed3009493a1f1681387f3a8c1461"
              },
              {
                "artifact": "output/lv3-audit-20261107/u13-source/general/web8-raw.json",
                "sha256": "7229ad8222cea50fc69e6c5ada48a874e7b632818a586a3ac559d76a36c07a7b"
              }
            ]
          }
        ],
        "beforePresent": true
      }
    ],
    "meaningEn": [
      {
        "proposal": "U13-GENERAL-W003112",
        "originFindingIds": [
          "U13-GENERAL-W003112"
        ],
        "reason": "原重複的新郎定義合併一次，補 groom 原已收馬伕／男僕及梳洗動詞；中文餵馬作動詞之精確性另留待查。",
        "sources": [
          {
            "type": "dictionary",
            "url": "https://www.collinsdictionary.com/dictionary/english/groom",
            "verification": "direct_dictionary_body_read",
            "readDate": "2026-11-08",
            "claim": "原重複的新郎定義合併一次，補 groom 原已收馬伕／男僕及梳洗動詞；中文餵馬作動詞之精確性另留待查。",
            "evidenceArtifacts": [
              {
                "artifact": "output/lv3-audit-20261107/u13-source/general/detail3-raw.json",
                "sha256": "4a950e3489e1550168fc9b853d8169aa7bc2ed3009493a1f1681387f3a8c1461"
              },
              {
                "artifact": "output/lv3-audit-20261107/u13-source/general/web8-raw.json",
                "sha256": "7229ad8222cea50fc69e6c5ada48a874e7b632818a586a3ac559d76a36c07a7b"
              }
            ]
          },
          {
            "type": "dictionary",
            "url": "https://www.collinsdictionary.com/dictionary/english/bridegroom",
            "verification": "direct_dictionary_body_read",
            "readDate": "2026-11-08",
            "claim": "原重複的新郎定義合併一次，補 groom 原已收馬伕／男僕及梳洗動詞；中文餵馬作動詞之精確性另留待查。",
            "evidenceArtifacts": [
              {
                "artifact": "output/lv3-audit-20261107/u13-source/general/web8-raw.json",
                "sha256": "7229ad8222cea50fc69e6c5ada48a874e7b632818a586a3ac559d76a36c07a7b"
              }
            ]
          }
        ],
        "beforePresent": true
      }
    ],
    "usagePattern": [
      {
        "proposal": "U13-GENERAL-W003112",
        "originFindingIds": [
          "U13-GENERAL-W003112"
        ],
        "reason": "正文 bride and groom 與 groom an animal；不把所有 groom 義項等同 bridegroom。",
        "sources": [
          {
            "type": "dictionary",
            "url": "https://www.collinsdictionary.com/dictionary/english/groom",
            "verification": "direct_dictionary_body_read",
            "readDate": "2026-11-08",
            "claim": "正文 bride and groom 與 groom an animal；不把所有 groom 義項等同 bridegroom。",
            "evidenceArtifacts": [
              {
                "artifact": "output/lv3-audit-20261107/u13-source/general/detail3-raw.json",
                "sha256": "4a950e3489e1550168fc9b853d8169aa7bc2ed3009493a1f1681387f3a8c1461"
              },
              {
                "artifact": "output/lv3-audit-20261107/u13-source/general/web8-raw.json",
                "sha256": "7229ad8222cea50fc69e6c5ada48a874e7b632818a586a3ac559d76a36c07a7b"
              }
            ]
          }
        ],
        "beforePresent": true
      }
    ],
    "usagePatternZh": [
      {
        "proposal": "U13-GENERAL-W003112",
        "originFindingIds": [
          "U13-GENERAL-W003112"
        ],
        "reason": "正文 bride and groom 與 groom an animal；不把所有 groom 義項等同 bridegroom。",
        "sources": [
          {
            "type": "dictionary",
            "url": "https://www.collinsdictionary.com/dictionary/english/groom",
            "verification": "direct_dictionary_body_read",
            "readDate": "2026-11-08",
            "claim": "正文 bride and groom 與 groom an animal；不把所有 groom 義項等同 bridegroom。",
            "evidenceArtifacts": [
              {
                "artifact": "output/lv3-audit-20261107/u13-source/general/detail3-raw.json",
                "sha256": "4a950e3489e1550168fc9b853d8169aa7bc2ed3009493a1f1681387f3a8c1461"
              },
              {
                "artifact": "output/lv3-audit-20261107/u13-source/general/web8-raw.json",
                "sha256": "7229ad8222cea50fc69e6c5ada48a874e7b632818a586a3ac559d76a36c07a7b"
              }
            ]
          }
        ],
        "beforePresent": true
      }
    ],
    "verbForms": [
      {
        "proposal": "U13-GENERAL-W003112",
        "originFindingIds": [
          "U13-GENERAL-W003112"
        ],
        "reason": "補缺的可信三態；僅 groom 動詞適用，若是合併 bridegroom/groom 詞條。",
        "sources": [
          {
            "type": "dictionary",
            "url": "https://www.collinsdictionary.com/dictionary/english/groom",
            "verification": "direct_dictionary_body_read",
            "readDate": "2026-11-08",
            "claim": "可信詞典明列的動詞詞形；不從規則猜生成。approved 僅為既有資料契約的詞形技術狀態，不是新美術／例句／使用者裁示。",
            "evidenceArtifacts": [
              {
                "artifact": "output/lv3-audit-20261107/u13-source/general/detail3-raw.json",
                "sha256": "4a950e3489e1550168fc9b853d8169aa7bc2ed3009493a1f1681387f3a8c1461"
              },
              {
                "artifact": "output/lv3-audit-20261107/u13-source/general/web8-raw.json",
                "sha256": "7229ad8222cea50fc69e6c5ada48a874e7b632818a586a3ac559d76a36c07a7b"
              }
            ]
          },
          {
            "type": "dictionary_conjugation",
            "url": "https://www.collinsdictionary.com/conjugation/english/groom",
            "verification": "direct_conjugation_body_read",
            "claim": "表內 Past 與 Past Participle 直接查讀。",
            "evidenceArtifacts": [
              {
                "artifact": "output/lv3-audit-20261107/u13-source/general/conjugations-raw.json",
                "sha256": "83df022a96ce93181db009a09f1fd93551d5f9d4d1833d46bf4d2b293262b947"
              },
              {
                "artifact": "output/lv3-audit-20261107/u13-source/general/conjugations2-raw.json",
                "sha256": "a65adee5aad3a34491a4e517c60ab7bf2997a07464087483e04c545cb0446e19"
              }
            ]
          }
        ],
        "beforePresent": false
      }
    ]
  }
}`);
export function verifiedU13GroomPatch(m:AuditManifest,p:AuditPatch){
 return m.unit==='LV3-U13'&&p.dataset==='words'&&isDeepStrictEqual(p,U13_GROOM_PATCH);
}

const U14_PATTERN_PATCHES:AuditPatch[]=JSON.parse(String.raw`[
  {
    "dataset": "curriculum",
    "path": "src/features/direct/curriculumLV3Unit14.json",
    "key": "learningItemId",
    "id": "LI-LV3U14-G020",
    "before": {
      "learningItemId": "LI-LV3U14-G020",
      "kind": "grammar",
      "sourcePage": 145,
      "pattern": "doubtless 雖有表形容詞的字尾 -less，但為副詞",
      "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    "after": {
      "explanationZh": "本章 doubtless 作副詞，不能只因字尾 -less 就判作形容詞；字典另收形容詞用法，因此不是所有情況都只能作副詞。",
      "pattern": "doubtless 在本章作副詞，不由 -less 字尾單獨判斷詞性"
    },
    "reason": "Replace placeholder with supported explanation, explicitly distinguishing textbook scope from dictionary qualifications. Preserve original examples, IDs and approval states. Narrow the printed generalization to this chapter, retaining original printed pattern in beforeRow and source evidence.",
    "evidence": [
      "https://www.collinsdictionary.com/dictionary/english/doubtless"
    ],
    "fieldEvidence": {
      "explanationZh": [
        {
          "proposal": "U14-SOURCE-LI-LV3U14-G020",
          "originFindingIds": [
            "U14-SOURCE-LI-LV3U14-G020"
          ],
          "reason": "Replace placeholder with supported explanation, explicitly distinguishing textbook scope from dictionary qualifications. Preserve original examples, IDs and approval states.",
          "sources": [
            {
              "type": "textbook_photo",
              "file": "20260815_104805.jpg",
              "page": 145,
              "sha256": "3120afcbda322102d9daf7143458d8bfb3c9ca6939d821afc3c8db8c2fbecee0",
              "verification": "pixels_displayed_and_visually_read",
              "printedExcerpt": "doubtless",
              "editorialSummary": "本章 doubtless 作副詞，不能只因字尾 -less 就判作形容詞；字典另收形容詞用法，因此不是所有情況都只能作副詞。",
              "excerptNormalization": "Exact short English word or contiguous phrase actually visible on the cited original page; no punctuation, IPA or prose reconstruction. Whitespace/line breaks only may be collapsed. normalizedSourceSummary is a separate editorial reconstruction and is not a quotation.",
              "normalizedSourceSummary": "doubtless 雖有表形容詞的字尾 -less，但為副詞"
            },
            {
              "type": "dictionary",
              "url": "https://www.collinsdictionary.com/dictionary/english/doubtless",
              "verification": "direct_page_read",
              "claim": "Dictionary also records adjective usage.",
              "evidenceArtifact": "coordinator/grammar-dictionary-raw-v1.json"
            }
          ],
          "beforePresent": true
        }
      ],
      "pattern": [
        {
          "proposal": "U14-SOURCE-LI-LV3U14-G020",
          "originFindingIds": [
            "U14-SOURCE-LI-LV3U14-G020"
          ],
          "reason": "Narrow the printed generalization to this chapter, retaining original printed pattern in beforeRow and source evidence.",
          "sources": [
            {
              "type": "textbook_photo",
              "file": "20260815_104805.jpg",
              "page": 145,
              "sha256": "3120afcbda322102d9daf7143458d8bfb3c9ca6939d821afc3c8db8c2fbecee0",
              "verification": "pixels_displayed_and_visually_read",
              "printedExcerpt": "doubtless",
              "editorialSummary": "本章 doubtless 作副詞，不能只因字尾 -less 就判作形容詞；字典另收形容詞用法，因此不是所有情況都只能作副詞。",
              "excerptNormalization": "Exact short English word or contiguous phrase actually visible on the cited original page; no punctuation, IPA or prose reconstruction. Whitespace/line breaks only may be collapsed. normalizedSourceSummary is a separate editorial reconstruction and is not a quotation.",
              "normalizedSourceSummary": "doubtless 雖有表形容詞的字尾 -less，但為副詞"
            },
            {
              "type": "dictionary",
              "url": "https://www.collinsdictionary.com/dictionary/english/doubtless",
              "verification": "direct_page_read",
              "claim": "Dictionary also records adjective usage.",
              "evidenceArtifact": "coordinator/grammar-dictionary-raw-v1.json"
            }
          ],
          "beforePresent": true
        }
      ]
    }
  },
  {
    "dataset": "curriculum",
    "path": "src/features/direct/curriculumLV3Unit14.json",
    "key": "learningItemId",
    "id": "LI-LV3U14-G021",
    "before": {
      "learningItemId": "LI-LV3U14-G021",
      "kind": "grammar",
      "sourcePage": 145,
      "pattern": "doubtless = doubtlessly = undoubtedly = without (a) doubt = certainly",
      "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    "after": {
      "explanationZh": "教材將這些表達並列為「無疑、必定」的近義說法；doubtless 也可表示「很可能、想必」，不是在所有語境都與 undoubtedly 或 certainly 完全相同。",
      "pattern": "doubtless、doubtlessly、undoubtedly、without (a) doubt、certainly 的本章近義比較"
    },
    "reason": "Replace placeholder with supported explanation, explicitly distinguishing textbook scope from dictionary qualifications. Preserve original examples, IDs and approval states. Narrow the printed generalization to this chapter, retaining original printed pattern in beforeRow and source evidence.",
    "evidence": [
      "https://www.collinsdictionary.com/dictionary/english/doubtless"
    ],
    "fieldEvidence": {
      "explanationZh": [
        {
          "proposal": "U14-SOURCE-LI-LV3U14-G021",
          "originFindingIds": [
            "U14-SOURCE-LI-LV3U14-G021"
          ],
          "reason": "Replace placeholder with supported explanation, explicitly distinguishing textbook scope from dictionary qualifications. Preserve original examples, IDs and approval states.",
          "sources": [
            {
              "type": "textbook_photo",
              "file": "20260815_104805.jpg",
              "page": 145,
              "sha256": "3120afcbda322102d9daf7143458d8bfb3c9ca6939d821afc3c8db8c2fbecee0",
              "verification": "pixels_displayed_and_visually_read",
              "printedExcerpt": "doubtlessly",
              "editorialSummary": "教材將這些表達並列為「無疑、必定」的近義說法；doubtless 也可表示「很可能、想必」，不是在所有語境都與 undoubtedly 或 certainly 完全相同。",
              "excerptNormalization": "Exact short English word or contiguous phrase actually visible on the cited original page; no punctuation, IPA or prose reconstruction. Whitespace/line breaks only may be collapsed. normalizedSourceSummary is a separate editorial reconstruction and is not a quotation.",
              "normalizedSourceSummary": "doubtless = doubtlessly = undoubtedly = without (a) doubt = certainly"
            },
            {
              "type": "dictionary",
              "url": "https://www.collinsdictionary.com/dictionary/english/doubtless",
              "verification": "direct_page_read",
              "claim": "Doubtless may express probability rather than absolute certainty.",
              "evidenceArtifact": "coordinator/grammar-dictionary-raw-v1.json"
            }
          ],
          "beforePresent": true
        }
      ],
      "pattern": [
        {
          "proposal": "U14-SOURCE-LI-LV3U14-G021",
          "originFindingIds": [
            "U14-SOURCE-LI-LV3U14-G021"
          ],
          "reason": "Narrow the printed generalization to this chapter, retaining original printed pattern in beforeRow and source evidence.",
          "sources": [
            {
              "type": "textbook_photo",
              "file": "20260815_104805.jpg",
              "page": 145,
              "sha256": "3120afcbda322102d9daf7143458d8bfb3c9ca6939d821afc3c8db8c2fbecee0",
              "verification": "pixels_displayed_and_visually_read",
              "printedExcerpt": "doubtlessly",
              "editorialSummary": "教材將這些表達並列為「無疑、必定」的近義說法；doubtless 也可表示「很可能、想必」，不是在所有語境都與 undoubtedly 或 certainly 完全相同。",
              "excerptNormalization": "Exact short English word or contiguous phrase actually visible on the cited original page; no punctuation, IPA or prose reconstruction. Whitespace/line breaks only may be collapsed. normalizedSourceSummary is a separate editorial reconstruction and is not a quotation.",
              "normalizedSourceSummary": "doubtless = doubtlessly = undoubtedly = without (a) doubt = certainly"
            },
            {
              "type": "dictionary",
              "url": "https://www.collinsdictionary.com/dictionary/english/doubtless",
              "verification": "direct_page_read",
              "claim": "Doubtless may express probability rather than absolute certainty.",
              "evidenceArtifact": "coordinator/grammar-dictionary-raw-v1.json"
            }
          ],
          "beforePresent": true
        }
      ]
    }
  }
]`);
const U14_PATTERN_IDS=new Set(U14_PATTERN_PATCHES.map(p=>p.id));

export function verifiedU14PatternPatch(m:AuditManifest,p:AuditPatch){
 return m.unit==='LV3-U14'&&p.dataset==='curriculum'&&U14_PATTERN_PATCHES.some(expected=>isDeepStrictEqual(p,expected));
}

// Only eight independently reviewed U16 patches; no runtime output reads.
const U16_REVIEW_PATCHES:AuditPatch[]=JSON.parse(String.raw`[
  {
    "dataset": "curriculum",
    "path": "src/features/direct/curriculumLV3Unit16.json",
    "key": "learningItemId",
    "id": "LI-LV3U16-G051",
    "before": {
      "learningItemId": "LI-LV3U16-G051",
      "kind": "grammar",
      "sourcePage": 172,
      "pattern": "now that \u8996\u70ba\u9023\u63a5\u8a5e\uff0c\u7b49\u65bc since\uff0c\u8868\u300c\u65e2\u7136\u300d\uff0c\u6240\u5f15\u5c0e\u7684\u526f\u8a5e\u5b50\u53e5\u61c9\u63a1\u73fe\u5728\u5f0f\u6216\u73fe\u5728\u5b8c\u6210\u5f0f",
      "explanationZh": "\u6559\u6750\u7528\u6cd5\u6a19\u8a18\uff1b\u4f8b\u53e5\u8207\u6559\u6750\u984c\u76ee\u5c1a\u672a\u63d0\u4f9b\u3002",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    "after": {
      "explanationZh": "now that \u4f5c\u9023\u63a5\u8a5e\uff0c\u8868\u793a\u65e2\u7136\u3001\u7531\u65bc\u73fe\u5728\u9019\u7a2e\u60c5\u6cc1\u3002\u6642\u614b\u4f9d\u8a9e\u5883\u9078\u64c7\uff0c\u4e5f\u53ef\u7528\u904e\u53bb\u5f0f\u63cf\u8ff0\u904e\u53bb\u60c5\u5883\uff1b\u4e0d\u53ef\u56e0\u542b now \u5c31\u9650\u5b9a\u53ea\u80fd\u7528\u73fe\u5728\u5f0f\u6216\u73fe\u5728\u5b8c\u6210\u5f0f\u3002",
      "pattern": "now that...\uff08\u65e2\u7136\u2026\u2026\uff09"
    },
    "reason": "Replace inherited generic summary or placeholder with this printed chapter occurrence and explicit source-backed explanation; preserve IDs, original sentences, status and read_only boundaries. Replace inherited generic summary or placeholder with this printed chapter occurrence and explicit source-backed explanation; preserve IDs, original sentences, status and read_only boundaries.",
    "evidence": [
      "https://www.collinsdictionary.com/dictionary/english/now"
    ],
    "fieldEvidence": {
      "explanationZh": [
        {
          "proposal": "U16-SOURCE-LI-LV3U16-G051",
          "originFindingIds": [
            "U16-SOURCE-LI-LV3U16-G051"
          ],
          "reason": "Replace inherited generic summary or placeholder with this printed chapter occurrence and explicit source-backed explanation; preserve IDs, original sentences, status and read_only boundaries.",
          "sources": [
            {
              "type": "textbook_photo",
              "file": "20260815_105539.jpg",
              "page": 172,
              "sha256": "2917310620179f8f4584fed3d65b2c475a9c96c2b66204355a1e4b8fcd1bc739",
              "verification": "pixels_displayed_and_visually_read",
              "printedExcerpt": "now that",
              "normalizedSourceSummary": "now that \u4f5c\u9023\u63a5\u8a5e\uff0c\u8868\u793a\u65e2\u7136\u3001\u7531\u65bc\u73fe\u5728\u9019\u7a2e\u60c5\u6cc1\u3002\u6642\u614b\u4f9d\u8a9e\u5883\u9078\u64c7\uff0c\u4e5f\u53ef\u7528\u904e\u53bb\u5f0f\u63cf\u8ff0\u904e\u53bb\u60c5\u5883\uff1b\u4e0d\u53ef\u56e0\u542b now \u5c31\u9650\u5b9a\u53ea\u80fd\u7528\u73fe\u5728\u5f0f\u6216\u73fe\u5728\u5b8c\u6210\u5f0f\u3002",
              "excerptNormalization": "Only the quoted short English token or phrase is a printed excerpt; apostrophes and spacing may be normalized. Chinese explanation and contextual qualifications are separate editorial summaries; no complete textbook example sentence adopted."
            },
            {
              "type": "dictionary",
              "url": "https://www.collinsdictionary.com/dictionary/english/now",
              "verification": "direct_page_body_read",
              "claim": "Dictionary conjunction entry includes past-tense now that; textbook absolute tense restriction is incorrect.",
              "evidenceArtifact": "general/nowSinceBody-raw.json",
              "evidenceRawSha256": "8438991852d989e3ccb97bec93fd167c6e5c79d343db51959f15ffd21dcff5fc"
            }
          ],
          "beforePresent": true
        }
      ],
      "pattern": [
        {
          "proposal": "U16-SOURCE-LI-LV3U16-G051",
          "originFindingIds": [
            "U16-SOURCE-LI-LV3U16-G051"
          ],
          "reason": "Replace inherited generic summary or placeholder with this printed chapter occurrence and explicit source-backed explanation; preserve IDs, original sentences, status and read_only boundaries.",
          "sources": [
            {
              "type": "textbook_photo",
              "file": "20260815_105539.jpg",
              "page": 172,
              "sha256": "2917310620179f8f4584fed3d65b2c475a9c96c2b66204355a1e4b8fcd1bc739",
              "verification": "pixels_displayed_and_visually_read",
              "printedExcerpt": "now that",
              "normalizedSourceSummary": "now that \u4f5c\u9023\u63a5\u8a5e\uff0c\u8868\u793a\u65e2\u7136\u3001\u7531\u65bc\u73fe\u5728\u9019\u7a2e\u60c5\u6cc1\u3002\u6642\u614b\u4f9d\u8a9e\u5883\u9078\u64c7\uff0c\u4e5f\u53ef\u7528\u904e\u53bb\u5f0f\u63cf\u8ff0\u904e\u53bb\u60c5\u5883\uff1b\u4e0d\u53ef\u56e0\u542b now \u5c31\u9650\u5b9a\u53ea\u80fd\u7528\u73fe\u5728\u5f0f\u6216\u73fe\u5728\u5b8c\u6210\u5f0f\u3002",
              "excerptNormalization": "Only the quoted short English token or phrase is a printed excerpt; apostrophes and spacing may be normalized. Chinese explanation and contextual qualifications are separate editorial summaries; no complete textbook example sentence adopted."
            },
            {
              "type": "dictionary",
              "url": "https://www.collinsdictionary.com/dictionary/english/now",
              "verification": "direct_page_body_read",
              "claim": "Dictionary conjunction entry includes past-tense now that; textbook absolute tense restriction is incorrect.",
              "evidenceArtifact": "general/nowSinceBody-raw.json",
              "evidenceRawSha256": "8438991852d989e3ccb97bec93fd167c6e5c79d343db51959f15ffd21dcff5fc"
            }
          ],
          "beforePresent": true
        }
      ]
    }
  },
  {
    "dataset": "senses",
    "path": "public/data/v1/senses.json",
    "key": "senseId",
    "id": "W002139-1",
    "before": {
      "senseId": "W002139-1",
      "wordId": "W002139",
      "word": "charm",
      "senseOrder": 1,
      "sensePos": "n.",
      "meaningZh": "\u9b45\u529b\uff1b\u8b77\u8eab\u7b26",
      "isExamSense": false,
      "examEvidence": null,
      "answerForms": [],
      "note": "\u5f85\u62c6\u5206\uff1b\u4e3b\u8868\u5b57\u7fa9\uff1a\u5438\u5f15\u529b\uff1b\u9b54\u529b\uff1b\u7b26\u5492\uff1b\u8ff7\u4f4f",
      "status": "needs_check"
    },
    "after": {
      "status": "reviewed",
      "note": "2026-11-09\uff1a\u5df2\u4f9d Collins \u672c\u6587\u6838\u5c0d\u672c\u5217\u8a5e\u6027\u8207\u8a5e\u7fa9\uff1b\u540d\u8a5e\u9b45\u529b\uff0f\u8b77\u8eab\u7b26\u53ca\u52d5\u8a5e\u8ff7\u4f4f\u5747\u6709\u76f4\u63a5\u4f9d\u64da\u3002\u4fdd\u7559\u539f\u7fa9\u9805\u5206\u7d44\uff0c\u672a\u5c07\u672c\u5217\u6838\u5c0d\u7576\u4f5c\u6574\u8a5e\u3001\u5716\u7247\u6216\u8003\u984c\u4f86\u6e90\u901a\u904e\u3002"
    },
    "reason": "\u5be6\u969b\u6838\u5c0d\u6b64\u7fa9\u9805\u7684\u8a5e\u6027\u8207\u4e2d\u6587\u5b9a\u7fa9\u5f8c\u6a19\u8a18\u4ee3\u7406\u5df2\u5be9\u95b1\uff1b\u4e0d\u8868\u793a\u4f7f\u7528\u8005\u9a57\u6536\u3002 \u5be6\u969b\u6838\u5c0d\u6b64\u7fa9\u9805\u7684\u8a5e\u6027\u8207\u4e2d\u6587\u5b9a\u7fa9\u5f8c\u6a19\u8a18\u4ee3\u7406\u5df2\u5be9\u95b1\uff1b\u4e0d\u8868\u793a\u4f7f\u7528\u8005\u9a57\u6536\u3002",
    "evidence": [
      "https://www.collinsdictionary.com/dictionary/english/charm"
    ],
    "fieldEvidence": {
      "status": [
        {
          "proposal": "U16-STATUS-REVIEW-SENSES-W002139-1-STATUS",
          "originFindingIds": [
            "U16-STATUS-REVIEW-SENSES-W002139-1-STATUS"
          ],
          "reason": "\u5be6\u969b\u6838\u5c0d\u6b64\u7fa9\u9805\u7684\u8a5e\u6027\u8207\u4e2d\u6587\u5b9a\u7fa9\u5f8c\u6a19\u8a18\u4ee3\u7406\u5df2\u5be9\u95b1\uff1b\u4e0d\u8868\u793a\u4f7f\u7528\u8005\u9a57\u6536\u3002",
          "sources": [
            {
              "url": "https://www.collinsdictionary.com/dictionary/english/charm",
              "claim": "\u672c\u6587\u540c\u6642\u652f\u6301\u9b45\u529b\u3001\u8b77\u8eab\u7b26\u548c\u8ff7\u4f4f\u7684\u540d\u8a5e/\u52d5\u8a5e\u7fa9\u3002",
              "verification": "direct_dictionary_body_read",
              "readDate": "2026-11-09",
              "artifacts": [
                {
                  "artifact": "output/lv3-audit-20261107/u16-source/general/extraBodies-raw.json",
                  "sha256": "3014d38c5e3b7d6d0d5fed7e39419bf422b883859f58ac026055221bb4143b4e"
                }
              ]
            }
          ],
          "beforePresent": true
        }
      ],
      "note": [
        {
          "proposal": "U16-STATUS-REVIEW-SENSES-W002139-1-NOTE",
          "originFindingIds": [
            "U16-STATUS-REVIEW-SENSES-W002139-1-NOTE"
          ],
          "reason": "\u5be6\u969b\u6838\u5c0d\u6b64\u7fa9\u9805\u7684\u8a5e\u6027\u8207\u4e2d\u6587\u5b9a\u7fa9\u5f8c\u6a19\u8a18\u4ee3\u7406\u5df2\u5be9\u95b1\uff1b\u4e0d\u8868\u793a\u4f7f\u7528\u8005\u9a57\u6536\u3002",
          "sources": [
            {
              "url": "https://www.collinsdictionary.com/dictionary/english/charm",
              "claim": "\u672c\u6587\u540c\u6642\u652f\u6301\u9b45\u529b\u3001\u8b77\u8eab\u7b26\u548c\u8ff7\u4f4f\u7684\u540d\u8a5e/\u52d5\u8a5e\u7fa9\u3002",
              "verification": "direct_dictionary_body_read",
              "readDate": "2026-11-09",
              "artifacts": [
                {
                  "artifact": "output/lv3-audit-20261107/u16-source/general/extraBodies-raw.json",
                  "sha256": "3014d38c5e3b7d6d0d5fed7e39419bf422b883859f58ac026055221bb4143b4e"
                }
              ]
            }
          ],
          "beforePresent": true
        }
      ]
    }
  },
  {
    "dataset": "senses",
    "path": "public/data/v1/senses.json",
    "key": "senseId",
    "id": "W002139-2",
    "before": {
      "senseId": "W002139-2",
      "wordId": "W002139",
      "word": "charm",
      "senseOrder": 2,
      "sensePos": "v.",
      "meaningZh": "\u8ff7\u4f4f",
      "isExamSense": false,
      "examEvidence": null,
      "answerForms": [],
      "note": "\u5f85\u62c6\u5206\uff1b\u4e3b\u8868\u5b57\u7fa9\uff1a\u5438\u5f15\u529b\uff1b\u9b54\u529b\uff1b\u7b26\u5492\uff1b\u8ff7\u4f4f",
      "status": "needs_check"
    },
    "after": {
      "status": "reviewed",
      "note": "2026-11-09\uff1a\u5df2\u4f9d Collins \u672c\u6587\u6838\u5c0d\u672c\u5217\u8a5e\u6027\u8207\u8a5e\u7fa9\uff1b\u540d\u8a5e\u9b45\u529b\uff0f\u8b77\u8eab\u7b26\u53ca\u52d5\u8a5e\u8ff7\u4f4f\u5747\u6709\u76f4\u63a5\u4f9d\u64da\u3002\u4fdd\u7559\u539f\u7fa9\u9805\u5206\u7d44\uff0c\u672a\u5c07\u672c\u5217\u6838\u5c0d\u7576\u4f5c\u6574\u8a5e\u3001\u5716\u7247\u6216\u8003\u984c\u4f86\u6e90\u901a\u904e\u3002"
    },
    "reason": "\u5be6\u969b\u6838\u5c0d\u6b64\u7fa9\u9805\u7684\u8a5e\u6027\u8207\u4e2d\u6587\u5b9a\u7fa9\u5f8c\u6a19\u8a18\u4ee3\u7406\u5df2\u5be9\u95b1\uff1b\u4e0d\u8868\u793a\u4f7f\u7528\u8005\u9a57\u6536\u3002 \u5be6\u969b\u6838\u5c0d\u6b64\u7fa9\u9805\u7684\u8a5e\u6027\u8207\u4e2d\u6587\u5b9a\u7fa9\u5f8c\u6a19\u8a18\u4ee3\u7406\u5df2\u5be9\u95b1\uff1b\u4e0d\u8868\u793a\u4f7f\u7528\u8005\u9a57\u6536\u3002",
    "evidence": [
      "https://www.collinsdictionary.com/dictionary/english/charm"
    ],
    "fieldEvidence": {
      "status": [
        {
          "proposal": "U16-STATUS-REVIEW-SENSES-W002139-2-STATUS",
          "originFindingIds": [
            "U16-STATUS-REVIEW-SENSES-W002139-2-STATUS"
          ],
          "reason": "\u5be6\u969b\u6838\u5c0d\u6b64\u7fa9\u9805\u7684\u8a5e\u6027\u8207\u4e2d\u6587\u5b9a\u7fa9\u5f8c\u6a19\u8a18\u4ee3\u7406\u5df2\u5be9\u95b1\uff1b\u4e0d\u8868\u793a\u4f7f\u7528\u8005\u9a57\u6536\u3002",
          "sources": [
            {
              "url": "https://www.collinsdictionary.com/dictionary/english/charm",
              "claim": "\u672c\u6587\u540c\u6642\u652f\u6301\u9b45\u529b\u3001\u8b77\u8eab\u7b26\u548c\u8ff7\u4f4f\u7684\u540d\u8a5e/\u52d5\u8a5e\u7fa9\u3002",
              "verification": "direct_dictionary_body_read",
              "readDate": "2026-11-09",
              "artifacts": [
                {
                  "artifact": "output/lv3-audit-20261107/u16-source/general/extraBodies-raw.json",
                  "sha256": "3014d38c5e3b7d6d0d5fed7e39419bf422b883859f58ac026055221bb4143b4e"
                }
              ]
            }
          ],
          "beforePresent": true
        }
      ],
      "note": [
        {
          "proposal": "U16-STATUS-REVIEW-SENSES-W002139-2-NOTE",
          "originFindingIds": [
            "U16-STATUS-REVIEW-SENSES-W002139-2-NOTE"
          ],
          "reason": "\u5be6\u969b\u6838\u5c0d\u6b64\u7fa9\u9805\u7684\u8a5e\u6027\u8207\u4e2d\u6587\u5b9a\u7fa9\u5f8c\u6a19\u8a18\u4ee3\u7406\u5df2\u5be9\u95b1\uff1b\u4e0d\u8868\u793a\u4f7f\u7528\u8005\u9a57\u6536\u3002",
          "sources": [
            {
              "url": "https://www.collinsdictionary.com/dictionary/english/charm",
              "claim": "\u672c\u6587\u540c\u6642\u652f\u6301\u9b45\u529b\u3001\u8b77\u8eab\u7b26\u548c\u8ff7\u4f4f\u7684\u540d\u8a5e/\u52d5\u8a5e\u7fa9\u3002",
              "verification": "direct_dictionary_body_read",
              "readDate": "2026-11-09",
              "artifacts": [
                {
                  "artifact": "output/lv3-audit-20261107/u16-source/general/extraBodies-raw.json",
                  "sha256": "3014d38c5e3b7d6d0d5fed7e39419bf422b883859f58ac026055221bb4143b4e"
                }
              ]
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
    "id": "EX3e5b107b",
    "before": {
      "exampleId": "EX3e5b107b",
      "word": "loose",
      "sensePos": "adj.",
      "meaningHint": "\u9b06\u7684",
      "exampleType": "exam",
      "sentenceEn": "This shirt is too loose for me.",
      "sentenceZh": "\u9019\u4ef6\u896f\u886b\u5c0d\u6211\u4f86\u8aaa\u592a\u9b06\u4e86\u3002",
      "blankSentence": "This shirt is too _____ for me.",
      "answer": "loose",
      "difficulty": "LV3",
      "status": "draft"
    },
    "after": {
      "status": "reviewed"
    },
    "reason": "\u5f62\u5bb9\u8a5e\u8868\u793a\u8863\u670d\u4e0d\u8cbc\u8eab\uff1btoo loose for me\u53ca\u4e2d\u8b6f\u4e00\u81f4\u3002 loose \u5728 is too \u5f8c\u4f5c\u8868\u8a9e\uff0c\u586b\u56de\u539f\u53e5\u4e00\u81f4\u3002 \u6b64\u8655\u50c5\u4ee3\u7406\u8a9e\u8a00\u6838\u5c0d\uff0c\u4e0d\u8868\u793a\u5b98\u65b9\u539f\u984c\u8a8d\u8b49\u3001\u5716\u7247\u5be9\u6838\u6216\u4f7f\u7528\u8005\u9a57\u6536\u3002",
    "evidence": [
      "https://www.collinsdictionary.com/dictionary/english/loose"
    ],
    "fieldEvidence": {
      "status": [
        {
          "proposal": "U16-STATUS-REVIEW-EXAMPLES-EX3e5b107b-STATUS",
          "originFindingIds": [
            "U16-STATUS-REVIEW-EXAMPLES-EX3e5b107b-STATUS"
          ],
          "reason": "\u5f62\u5bb9\u8a5e\u8868\u793a\u8863\u670d\u4e0d\u8cbc\u8eab\uff1btoo loose for me\u53ca\u4e2d\u8b6f\u4e00\u81f4\u3002 loose \u5728 is too \u5f8c\u4f5c\u8868\u8a9e\uff0c\u586b\u56de\u539f\u53e5\u4e00\u81f4\u3002 \u6b64\u8655\u50c5\u4ee3\u7406\u8a9e\u8a00\u6838\u5c0d\uff0c\u4e0d\u8868\u793a\u5b98\u65b9\u539f\u984c\u8a8d\u8b49\u3001\u5716\u7247\u5be9\u6838\u6216\u4f7f\u7528\u8005\u9a57\u6536\u3002",
          "sources": [
            {
              "url": "https://www.collinsdictionary.com/dictionary/english/loose",
              "claim": "\u5f62\u5bb9\u8a5e\u8868\u793a\u8863\u670d\u4e0d\u8cbc\u8eab\uff1btoo loose for me\u53ca\u4e2d\u8b6f\u4e00\u81f4\u3002",
              "verification": "direct_dictionary_body_read",
              "readDate": "2026-11-09",
              "artifacts": [
                {
                  "artifact": "output/lv3-audit-20261107/u16-source/general/draftAndCommunicable-raw.json",
                  "sha256": "7aacab83a4c5ddfd248e6abac27f624d088fef0ea7bb200ab20f5f38c1bca3f6"
                }
              ]
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
    "id": "EX5eeb2ac7",
    "before": {
      "exampleId": "EX5eeb2ac7",
      "word": "tight",
      "sensePos": "adj.",
      "meaningHint": "\uff08\u6642\u9593\uff09\u6392\u5f97\u5f88\u6eff\u7684\uff08\u8003\u9ede\uff1aa tight schedule\uff09",
      "exampleType": "exam",
      "sentenceEn": "Her schedule is so tight that she eats lunch at her desk.",
      "sentenceZh": "\u5979\u7684\u884c\u7a0b\u6392\u5f97\u592a\u6eff\uff0c\u5348\u9910\u90fd\u5728\u8fa6\u516c\u684c\u524d\u5403\u3002",
      "blankSentence": "Her schedule is so _____ that she eats lunch at her desk.",
      "answer": "tight",
      "difficulty": "LV3",
      "status": "draft"
    },
    "after": {
      "status": "reviewed"
    },
    "reason": "tight schedule \u6307\u6642\u9593\u5b89\u6392\u7dca\u6e4a\uff0c\u5348\u9910\u4ecd\u5728\u684c\u524d\u5403\u7684\u7d50\u679c\u8207\u539f\u4e2d\u8b6f\u4e00\u81f4\u3002 tight \u4f5c\u5f62\u5bb9\u8a5e\u8868\u8a9e\uff0cso...that\u7d50\u679c\u5b50\u53e5\u8207\u4e2d\u8b6f\u4e00\u81f4\u3002 \u6b64\u8655\u50c5\u4ee3\u7406\u8a9e\u8a00\u6838\u5c0d\uff0c\u4e0d\u8868\u793a\u5b98\u65b9\u539f\u984c\u8a8d\u8b49\u3001\u5716\u7247\u5be9\u6838\u6216\u4f7f\u7528\u8005\u9a57\u6536\u3002",
    "evidence": [
      "https://www.collinsdictionary.com/dictionary/english/tight"
    ],
    "fieldEvidence": {
      "status": [
        {
          "proposal": "U16-STATUS-REVIEW-EXAMPLES-EX5eeb2ac7-STATUS",
          "originFindingIds": [
            "U16-STATUS-REVIEW-EXAMPLES-EX5eeb2ac7-STATUS"
          ],
          "reason": "tight schedule \u6307\u6642\u9593\u5b89\u6392\u7dca\u6e4a\uff0c\u5348\u9910\u4ecd\u5728\u684c\u524d\u5403\u7684\u7d50\u679c\u8207\u539f\u4e2d\u8b6f\u4e00\u81f4\u3002 tight \u4f5c\u5f62\u5bb9\u8a5e\u8868\u8a9e\uff0cso...that\u7d50\u679c\u5b50\u53e5\u8207\u4e2d\u8b6f\u4e00\u81f4\u3002 \u6b64\u8655\u50c5\u4ee3\u7406\u8a9e\u8a00\u6838\u5c0d\uff0c\u4e0d\u8868\u793a\u5b98\u65b9\u539f\u984c\u8a8d\u8b49\u3001\u5716\u7247\u5be9\u6838\u6216\u4f7f\u7528\u8005\u9a57\u6536\u3002",
          "sources": [
            {
              "url": "https://www.collinsdictionary.com/dictionary/english/tight",
              "claim": "tight schedule \u6307\u6642\u9593\u5b89\u6392\u7dca\u6e4a\uff0c\u5348\u9910\u4ecd\u5728\u684c\u524d\u5403\u7684\u7d50\u679c\u8207\u539f\u4e2d\u8b6f\u4e00\u81f4\u3002",
              "verification": "direct_dictionary_body_read",
              "readDate": "2026-11-09",
              "artifacts": [
                {
                  "artifact": "output/lv3-audit-20261107/u16-source/general/patternsBody-raw.json",
                  "sha256": "795f9a9c56f7e6b9358cae5e10ddc0ec43bb0ab9f6f01d86d677824441ec7536"
                }
              ]
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
    "id": "EXb888b179",
    "before": {
      "exampleId": "EXb888b179",
      "word": "amaze",
      "sensePos": "v.",
      "meaningHint": "\u4f7f\u9a5a\u8a1d\uff08\u8003\u9ede\uff1aamaze sb by/with \u4ee4\u67d0\u4eba\u9a5a\u8a1d\uff09",
      "exampleType": "exam",
      "sentenceEn": "The little boy amazed the judges by naming every country on the map.",
      "sentenceZh": "\u90a3\u500b\u5c0f\u7537\u5b69\u8aaa\u51fa\u5730\u5716\u4e0a\u6bcf\u500b\u570b\u5bb6\u7684\u540d\u5b57\uff0c\u8b93\u8a55\u5be9\u5927\u70ba\u9a5a\u8a1d\u3002",
      "blankSentence": "The little boy _____ the judges by naming every country on the map.",
      "answer": "amazed",
      "difficulty": "LV3",
      "status": "draft"
    },
    "after": {
      "status": "reviewed"
    },
    "reason": "\u5c0f\u7537\u5b69\u8aaa\u51fa\u6240\u6709\u570b\u540d\u4f7f\u8a55\u5be9\u9a5a\u8a1d\uff1b\u4eba\u3001\u52d5\u4f5c\u3001by doing\u539f\u56e0\u8207\u4e2d\u8b6f\u4e00\u81f4\u3002 amazed \u70ba\u904e\u53bb\u5f0f\u52d5\u8a5e\uff0cjudges\u70ba\u53d7\u8a5e\uff0cby naming\u70ba\u65b9\u5f0f\u3002 \u6b64\u8655\u50c5\u4ee3\u7406\u8a9e\u8a00\u6838\u5c0d\uff0c\u4e0d\u8868\u793a\u5b98\u65b9\u539f\u984c\u8a8d\u8b49\u3001\u5716\u7247\u5be9\u6838\u6216\u4f7f\u7528\u8005\u9a57\u6536\u3002",
    "evidence": [
      "https://www.collinsdictionary.com/dictionary/english/amaze"
    ],
    "fieldEvidence": {
      "status": [
        {
          "proposal": "U16-STATUS-REVIEW-EXAMPLES-EXb888b179-STATUS",
          "originFindingIds": [
            "U16-STATUS-REVIEW-EXAMPLES-EXb888b179-STATUS"
          ],
          "reason": "\u5c0f\u7537\u5b69\u8aaa\u51fa\u6240\u6709\u570b\u540d\u4f7f\u8a55\u5be9\u9a5a\u8a1d\uff1b\u4eba\u3001\u52d5\u4f5c\u3001by doing\u539f\u56e0\u8207\u4e2d\u8b6f\u4e00\u81f4\u3002 amazed \u70ba\u904e\u53bb\u5f0f\u52d5\u8a5e\uff0cjudges\u70ba\u53d7\u8a5e\uff0cby naming\u70ba\u65b9\u5f0f\u3002 \u6b64\u8655\u50c5\u4ee3\u7406\u8a9e\u8a00\u6838\u5c0d\uff0c\u4e0d\u8868\u793a\u5b98\u65b9\u539f\u984c\u8a8d\u8b49\u3001\u5716\u7247\u5be9\u6838\u6216\u4f7f\u7528\u8005\u9a57\u6536\u3002",
          "sources": [
            {
              "url": "https://www.collinsdictionary.com/dictionary/english/amaze",
              "claim": "\u5c0f\u7537\u5b69\u8aaa\u51fa\u6240\u6709\u570b\u540d\u4f7f\u8a55\u5be9\u9a5a\u8a1d\uff1b\u4eba\u3001\u52d5\u4f5c\u3001by doing\u539f\u56e0\u8207\u4e2d\u8b6f\u4e00\u81f4\u3002",
              "verification": "direct_dictionary_body_read",
              "readDate": "2026-11-09",
              "artifacts": [
                {
                  "artifact": "output/lv3-audit-20261107/u16-source/general/formsA-raw.json",
                  "sha256": "116a9913d12b3e83cb35ff1af64d17d4917bdf59aa047dbadfcf6da9e8dcf99a"
                }
              ]
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
    "id": "EXbfadd806",
    "before": {
      "exampleId": "EXbfadd806",
      "word": "sculpture",
      "sensePos": "n.",
      "meaningHint": "\u96d5\u5851\u4f5c\u54c1\uff08\u8003\u9ede\uff1a\u85dd\u8853\u54c1\uff09",
      "exampleType": "exam",
      "sentenceEn": "The garden is full of stone sculptures made by local artists.",
      "sentenceZh": "\u9019\u5ea7\u82b1\u5712\u88e1\u6eff\u662f\u7576\u5730\u85dd\u8853\u5bb6\u505a\u7684\u77f3\u96d5\u3002",
      "blankSentence": "The garden is full of stone _____ made by local artists.",
      "answer": "sculptures",
      "difficulty": "LV4",
      "status": "draft"
    },
    "after": {
      "status": "reviewed"
    },
    "reason": "\u7576\u5730\u85dd\u8853\u5bb6\u88fd\u4f5c\u82b1\u5712\u77f3\u96d5\uff1b\u540d\u8a5e\u4f5c\u54c1\u7fa9\u3001\u4e2d\u8b6f\u4e00\u81f4\u3002 sculptures\u70ba\u8907\u6578\u53ef\u6578\u540d\u8a5e\uff0cstone\u4fee\u98fe\u6750\u6599\u3001made by\u70ba\u5206\u8a5e\u7247\u8a9e\u3002 \u6b64\u8655\u50c5\u4ee3\u7406\u8a9e\u8a00\u6838\u5c0d\uff0c\u4e0d\u8868\u793a\u5b98\u65b9\u539f\u984c\u8a8d\u8b49\u3001\u5716\u7247\u5be9\u6838\u6216\u4f7f\u7528\u8005\u9a57\u6536\u3002",
    "evidence": [
      "https://www.collinsdictionary.com/dictionary/english/sculpture"
    ],
    "fieldEvidence": {
      "status": [
        {
          "proposal": "U16-STATUS-REVIEW-EXAMPLES-EXbfadd806-STATUS",
          "originFindingIds": [
            "U16-STATUS-REVIEW-EXAMPLES-EXbfadd806-STATUS"
          ],
          "reason": "\u7576\u5730\u85dd\u8853\u5bb6\u88fd\u4f5c\u82b1\u5712\u77f3\u96d5\uff1b\u540d\u8a5e\u4f5c\u54c1\u7fa9\u3001\u4e2d\u8b6f\u4e00\u81f4\u3002 sculptures\u70ba\u8907\u6578\u53ef\u6578\u540d\u8a5e\uff0cstone\u4fee\u98fe\u6750\u6599\u3001made by\u70ba\u5206\u8a5e\u7247\u8a9e\u3002 \u6b64\u8655\u50c5\u4ee3\u7406\u8a9e\u8a00\u6838\u5c0d\uff0c\u4e0d\u8868\u793a\u5b98\u65b9\u539f\u984c\u8a8d\u8b49\u3001\u5716\u7247\u5be9\u6838\u6216\u4f7f\u7528\u8005\u9a57\u6536\u3002",
          "sources": [
            {
              "url": "https://www.collinsdictionary.com/dictionary/english/sculpture",
              "claim": "\u7576\u5730\u85dd\u8853\u5bb6\u88fd\u4f5c\u82b1\u5712\u77f3\u96d5\uff1b\u540d\u8a5e\u4f5c\u54c1\u7fa9\u3001\u4e2d\u8b6f\u4e00\u81f4\u3002",
              "verification": "direct_dictionary_body_read",
              "readDate": "2026-11-09",
              "artifacts": [
                {
                  "artifact": "output/lv3-audit-20261107/u16-source/general/formsBfind2-raw.json",
                  "sha256": "c9069e85b8a96f1a7d27e5ab4ce41aae3756ac603afb950d608f3e69d8c5639f"
                }
              ]
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
    "id": "EXdec71249",
    "before": {
      "exampleId": "EXdec71249",
      "word": "beam",
      "sensePos": "n.",
      "meaningHint": "\u5149\u675f\uff08\u8003\u9ede\uff1aa beam of light\uff09",
      "exampleType": "exam",
      "sentenceEn": "A beam of sunlight came through the crack in the curtains.",
      "sentenceZh": "\u4e00\u9053\u967d\u5149\u5f9e\u7a97\u7c3e\u7684\u7e2b\u9699\u7167\u9032\u4f86\u3002",
      "blankSentence": "A _____ of sunlight came through the crack in the curtains.",
      "answer": "beam",
      "difficulty": "LV3",
      "status": "draft"
    },
    "after": {
      "status": "reviewed"
    },
    "reason": "\u967d\u5149\u7a7f\u904e\u7a97\u7c3e\u7e2b\u9699\uff1b\u5149\u675f\u7fa9\u3001\u4e2d\u8b6f\u4e00\u81f4\u3002 beam \u5728 A\u8207of sunlight\u4e4b\u9593\u70ba\u55ae\u6578\u53ef\u6578\u540d\u8a5e\u3002 \u6b64\u8655\u50c5\u4ee3\u7406\u8a9e\u8a00\u6838\u5c0d\uff0c\u4e0d\u8868\u793a\u5b98\u65b9\u539f\u984c\u8a8d\u8b49\u3001\u5716\u7247\u5be9\u6838\u6216\u4f7f\u7528\u8005\u9a57\u6536\u3002",
    "evidence": [
      "https://www.collinsdictionary.com/dictionary/english/beam"
    ],
    "fieldEvidence": {
      "status": [
        {
          "proposal": "U16-STATUS-REVIEW-EXAMPLES-EXdec71249-STATUS",
          "originFindingIds": [
            "U16-STATUS-REVIEW-EXAMPLES-EXdec71249-STATUS"
          ],
          "reason": "\u967d\u5149\u7a7f\u904e\u7a97\u7c3e\u7e2b\u9699\uff1b\u5149\u675f\u7fa9\u3001\u4e2d\u8b6f\u4e00\u81f4\u3002 beam \u5728 A\u8207of sunlight\u4e4b\u9593\u70ba\u55ae\u6578\u53ef\u6578\u540d\u8a5e\u3002 \u6b64\u8655\u50c5\u4ee3\u7406\u8a9e\u8a00\u6838\u5c0d\uff0c\u4e0d\u8868\u793a\u5b98\u65b9\u539f\u984c\u8a8d\u8b49\u3001\u5716\u7247\u5be9\u6838\u6216\u4f7f\u7528\u8005\u9a57\u6536\u3002",
          "sources": [
            {
              "url": "https://www.collinsdictionary.com/dictionary/english/beam",
              "claim": "\u967d\u5149\u7a7f\u904e\u7a97\u7c3e\u7e2b\u9699\uff1b\u5149\u675f\u7fa9\u3001\u4e2d\u8b6f\u4e00\u81f4\u3002",
              "verification": "direct_dictionary_body_read",
              "readDate": "2026-11-09",
              "artifacts": [
                {
                  "artifact": "output/lv3-audit-20261107/u16-source/general/formsAfind-raw.json",
                  "sha256": "de420c8098c34e093cff5ab8af52e67408c8de72d3f4fb888e4e65b08b589f80"
                }
              ]
            }
          ],
          "beforePresent": true
        }
      ]
    }
  }
]`);
const U16_RESERVED=new Set(U16_REVIEW_PATCHES.map(p=>p.dataset+':'+p.id));
export function verifiedU16ReviewPatch(m:AuditManifest,p:AuditPatch){
 return m.unit==='LV3-U16'&&U16_REVIEW_PATCHES.some(expected=>isDeepStrictEqual(p,expected));
}

// Exact U18 boast source contract. Frozen evidence only; no output is loaded at runtime.
const U18_SOURCE_COLLECTION:Collection={"path": "scripts/sources/LV3Unit18.json", "key": "learningItemId", "rowsField": "related"};
const U18_SOURCE_GUARD:FileGuard={"beforeHash": "ba31d795dbee8537c70199932abd633dcecf495a150018991b8cea066dc84df0", "afterHash": "bf6014177cbeafe1be520548be680f52cff7a799951ea24ab34a021b0a2dfc39", "beforeByteHash": "fcb3d91ca41efdada6906a4df0438c8b60af97fc848b1ec5ba3e674e79a552c6", "afterByteHash": "e859817eb1d6d0b55c0d3154b714d48f115f2733cb4988de2592e4518d3632d2"};
const U18_SOURCE_PATCH:AuditPatch={
  "dataset": "source",
  "path": "scripts/sources/LV3Unit18.json",
  "key": "learningItemId",
  "id": "LI-LV3U18-P189-boast",
  "before": {
    "word": "boast",
    "sourcePage": 189,
    "printedNumber": null,
    "role": "example_gloss",
    "sourcePos": "vi./vt.",
    "chapterMeaningsZh": "以擁有……而自豪；（某城市／地區）以擁有……而自豪",
    "officialWordId": "W003107",
    "officialWord": "boast",
    "mappingEvidence": "exact_headword",
    "learningItemId": "LI-LV3U18-P189-boast"
  },
  "after": {
    "sourcePos": "vt.",
    "chapterMeaningsZh": "（某城市／地區）以擁有……而自豪"
  },
  "reason": "右下例句註明 boast vt.（某城市/地區）以擁有而自豪，無vi.；兩份教材文件同步為vt.並去掉重複義。僅此教材義，絕非刪一般boast的不及物用法。 右下例句註明 boast vt.（某城市/地區）以擁有而自豪，無vi.；兩份教材文件同步為vt.並去掉重複義。僅此教材義，絕非刪一般boast的不及物用法。",
  "evidence": [],
  "fieldEvidence": {
    "sourcePos": [
      {
        "proposal": "U18F080,U18I-source-LI-LV3U18-P189-boast-sourcePos",
        "originFindingIds": [
          "U18F080",
          "U18I-source-LI-LV3U18-P189-boast-sourcePos"
        ],
        "reason": "右下例句註明 boast vt.（某城市/地區）以擁有而自豪，無vi.；兩份教材文件同步為vt.並去掉重複義。僅此教材義，絕非刪一般boast的不及物用法。",
        "sources": [
          {
            "type": "independent_field_review",
            "report": "output/lv3-audit-20261107/u18-independent-review-v1/per-field-independent-review.json",
            "reportSha256": "5789ac660c4ebcc8aa481a1dc8ca10028573bd62c393135883830f26a9e3bce7",
            "reviewId": "U18I-source-LI-LV3U18-P189-boast-sourcePos",
            "decision": "accepted_exact",
            "retainedCaveat": null
          },
          {
            "type": "textbook_photo_review",
            "file": "20260815_105844.jpg",
            "page": 189,
            "sha256": "5ffbb0505a77eed2307052f3b30db3e088d357c1968003fb62aa495cadd689fe",
            "reviewReport": "output/lv3-audit-20261107/u18-independent-review-v1/photo-review-index.json",
            "reviewReportSha256": "eb039c971f1a48daa514acc070ad9d573a52c5ccc8b83b2369c830bd1071de3b"
          }
        ],
        "beforePresent": true
      }
    ],
    "chapterMeaningsZh": [
      {
        "proposal": "U18F081,U18I-source-LI-LV3U18-P189-boast-chapterMeaningsZh",
        "originFindingIds": [
          "U18F081",
          "U18I-source-LI-LV3U18-P189-boast-chapterMeaningsZh"
        ],
        "reason": "右下例句註明 boast vt.（某城市/地區）以擁有而自豪，無vi.；兩份教材文件同步為vt.並去掉重複義。僅此教材義，絕非刪一般boast的不及物用法。",
        "sources": [
          {
            "type": "independent_field_review",
            "report": "output/lv3-audit-20261107/u18-independent-review-v1/per-field-independent-review.json",
            "reportSha256": "5789ac660c4ebcc8aa481a1dc8ca10028573bd62c393135883830f26a9e3bce7",
            "reviewId": "U18I-source-LI-LV3U18-P189-boast-chapterMeaningsZh",
            "decision": "accepted_exact",
            "retainedCaveat": null
          },
          {
            "type": "textbook_photo_review",
            "file": "20260815_105844.jpg",
            "page": 189,
            "sha256": "5ffbb0505a77eed2307052f3b30db3e088d357c1968003fb62aa495cadd689fe",
            "reviewReport": "output/lv3-audit-20261107/u18-independent-review-v1/photo-review-index.json",
            "reviewReportSha256": "eb039c971f1a48daa514acc070ad9d573a52c5ccc8b83b2369c830bd1071de3b"
          }
        ],
        "beforePresent": true
      }
    ]
  }
};
function verifiedU18SourcePatch(m:AuditManifest,p:AuditPatch){return m.unit==='LV3-U18'&&isDeepStrictEqual(p,U18_SOURCE_PATCH);}

export function admitU18SupplementalSource(previousInputs:Record<string,string>,anchorInputs:Record<string,string>,predecessor:Pick<Entry,'unit'|'status'>|undefined,previousHash:string|undefined,m:AuditManifest):Record<string,string>{
 assert.equal(m.unit,'LV3-U18','invalid U18 source owner');
 assert.equal(predecessor?.unit,'LV3-U17');assert.equal(predecessor?.status,'committed');
 assert.equal(previousHash,'7a8f12a1ba51548338cfc95e18ac8832b88187ff8eab0d87e24ca85763570508','invalid U18 source predecessor');
 assert.equal(m.parentManifestHash,previousHash,'invalid U18 source parent hash');
 assert.equal(Object.keys(anchorInputs).length,144);
 assert.deepEqual(Object.keys(previousInputs).sort(),Object.keys(anchorInputs).sort());
 assert.ok(!Object.hasOwn(previousInputs,U18_SOURCE_COLLECTION.path));
 assert.deepEqual(m.collections?.source,U18_SOURCE_COLLECTION);
 assert.deepEqual(m.files?.[U18_SOURCE_COLLECTION.path],U18_SOURCE_GUARD);
 const patches=m.patches.filter(p=>p.dataset==='source');assert.equal(patches.length,1);
 assert.ok(verifiedU18SourcePatch(m,patches[0]),'invalid U18 source patch contract');
 return {...previousInputs,[U18_SOURCE_COLLECTION.path]:U18_SOURCE_GUARD.beforeByteHash!};
}

// Exact U19 rumor correction. Frozen evidence; never runtime output reads.
const U19_SOURCE_COLLECTION:Collection={"path":"scripts/sources/LV3Unit19.json","key":"word","rowsField":"headwords"};
const U19_SOURCE_GUARD:FileGuard={"beforeHash":"ae16f51ead78443ba3366750484866a459d7765acd54c47d9fdb8fcd8f5c0d87","afterHash":"56195fbb111ca0985fb5e62279134620176f0e40f6af1451c10bf36c35266bbe","beforeByteHash":"b436f3e9a351d94d200e7c4fb6d39d7f7e1253a4c0eda9f659a0aa1d5ad5c9d9","afterByteHash":"91582d537cf39eb5038c41ef61ca782b2cc26a9223d78c70d6ea3a12765ea399"};
const U19_SOURCE_PATCH:AuditPatch={
  "dataset": "source",
  "path": "scripts/sources/LV3Unit19.json",
  "key": "word",
  "id": "rumor",
  "before": {
    "word": "rumor",
    "sourcePage": 197,
    "printedNumber": 2,
    "role": "main",
    "sourcePos": "n./vi.",
    "chapterMeaningsZh": "謠言；傳言；散播謠言",
    "officialWordId": "W002752",
    "officialWord": "rumor",
    "mappingEvidence": "exact_headword"
  },
  "after": {
    "sourcePos": "n./vt."
  },
  "reason": "p197 原書清楚印 n. 謠言，傳言 & vt. 散播謠言；目前 n./vi. 為明確轉錄錯誤。僅修正 source.headwords 唯一 word=rumor 的 sourcePos，保留原中文、拼字、頁碼、映射與其他來源列。",
  "evidence": [],
  "fieldEvidence": {
    "sourcePos": [
      {
        "proposal": "U19V002",
        "originFindingIds": [
          "U19V002"
        ],
        "reason": "p197 原書清楚印 n. 謠言，傳言 & vt. 散播謠言；目前 n./vi. 為明確轉錄錯誤。僅修正 source.headwords 唯一 word=rumor 的 sourcePos，保留原中文、拼字、頁碼、映射與其他來源列。",
        "sources": [
          {
            "type": "textbook_photo_review",
            "file": "20260815_105955.jpg",
            "page": 197,
            "sha256": "f1756a5067053b4ff78b2728f54653e04ca0bd63886db518339fb036b1381a96",
            "reviewReport": "output/lv3-audit-20261107/u19-independent-source-review-v1/REVIEW.md",
            "reviewReportSha256": "592db201ebb2cfda96945bb0d50083a10e7dabd10f9403a3d5f266e024729acd",
            "pixelReviewMethod": "saved_full_page_preview_original_photo_hash_verified"
          },
          {
            "type": "independent_source_field_review",
            "report": "output/lv3-audit-20261107/u19-independent-source-review-v1/REVIEW.md",
            "reportSha256": "592db201ebb2cfda96945bb0d50083a10e7dabd10f9403a3d5f266e024729acd",
            "reviewId": "U19V002",
            "recordedDisposition": "rekey_required_then_supported",
            "binding": "existing_unique_word_in_headwords"
          },
          {
            "type": "frozen_source_proposal",
            "report": "output/lv3-audit-20261107/u19-source-review-v1/recommended-review-bundle.json",
            "reportSha256": "4a2cc2ca753da11b01ba3828af1a02240726575b1c4ae91cdcfd8bf15222438a",
            "locatedReport": "output/lv3-audit-20261107/u19-source-review-v1/source-field-proposals-located.json",
            "locatedReportSha256": "0bb440691c679bca2ceaf51e98cd9116d667fb1896b562b438c5250859e3b55e",
            "reviewId": "U19V002",
            "beforeRowSha256": "2583cb7989d4cd47ca2403f776a649c96dc12687a6abe5f9c55cf83dddee7d30"
          }
        ],
        "beforePresent": true
      }
    ]
  }
};
const U19_PARENT_MANIFEST_HASH='cb6dd8d826d9ed47c7627eff8c15527773f6101440afeca4a6654b931e922dc6';
function verifiedU19SourcePatch(m:AuditManifest,p:AuditPatch){return m.unit==='LV3-U19'&&isDeepStrictEqual(p,U19_SOURCE_PATCH);}
function validateU19SourceContract(m:AuditManifest){
 assert.equal(m.unit,'LV3-U19','invalid U19 source owner');
 assert.deepEqual(m.collections?.source,U19_SOURCE_COLLECTION,'invalid U19 source collection');
 assert.deepEqual(m.files?.[U19_SOURCE_COLLECTION.path],U19_SOURCE_GUARD,'U19 source whole-file contract mismatch');
 const patches=m.patches.filter(p=>p.dataset==='source');assert.equal(patches.length,1,'invalid U19 source patch count');
 assert.ok(verifiedU19SourcePatch(m,patches[0]),'invalid U19 source patch contract');
}
export function admitU19SupplementalSource(previousInputs:Record<string,string>,anchorInputs:Record<string,string>,predecessor:Pick<Entry,'unit'|'status'>|undefined,previousHash:string|undefined,m:AuditManifest):Record<string,string>{
 validateU19SourceContract(m);
 assert.equal(predecessor?.unit,'LV3-U18');assert.equal(predecessor?.status,'committed');
 assert.equal(previousHash,U19_PARENT_MANIFEST_HASH,'invalid U19 source predecessor');
 assert.equal(m.parentManifestHash,previousHash,'invalid U19 source parent hash');
 assert.equal(Object.keys(anchorInputs).length,144);
 assert.ok(!Object.hasOwn(anchorInputs,U18_SOURCE_COLLECTION.path)&&!Object.hasOwn(anchorInputs,U19_SOURCE_COLLECTION.path));
 assert.deepEqual(Object.keys(previousInputs).sort(),[...Object.keys(anchorInputs),U18_SOURCE_COLLECTION.path].sort());
 assert.equal(Object.keys(previousInputs).length,145);
 assert.equal(previousInputs[U18_SOURCE_COLLECTION.path],U18_SOURCE_GUARD.afterByteHash,'invalid prior U18 source guard');
 assert.ok(!Object.hasOwn(previousInputs,U19_SOURCE_COLLECTION.path));
 return {...previousInputs,[U19_SOURCE_COLLECTION.path]:U19_SOURCE_GUARD.beforeByteHash!};
}

// Exact U20 violet transcription typo only; immutable contract, no runtime output reads.
const U20_SOURCE_COLLECTION:Collection= {"path": "scripts/sources/LV3Unit20.json", "key": "word", "rowsField": "headwords"};
const U20_SOURCE_GUARD:FileGuard= {"beforeHash": "6ee2803d21f1a05a0f6e91cca2075cb32cc12838dd4696bb1b645d31549e0dee", "afterHash": "372c1551bf06c8a84260f219e6de0c286e61ffe0f23df4941cd06bb4871b3176", "beforeByteHash": "c9763873e9fcfb073d0786730187f3cfbb64bc5e5523ae74acca28be6e3121c8", "afterByteHash": "46287b15281657a93cc8526a65b72b4bec449e229fe6f0f60dd51aa6f3bd1886"};
const U20_SOURCE_PATCH:AuditPatch= {
  "dataset": "source",
  "path": "scripts/sources/LV3Unit20.json",
  "key": "word",
  "id": "violet",
  "before": {
    "word": "violet",
    "sourcePage": 217,
    "printedNumber": 31,
    "role": "main",
    "sourcePos": "n./adj.",
    "chapterMeaningsZh": "紫羅蘭；紫羅藍色的",
    "officialWordId": "W002967",
    "officialWord": "violet",
    "mappingEvidence": "exact_headword"
  },
  "after": {
    "chapterMeaningsZh": "紫羅蘭；紫羅蘭色的"
  },
  "reason": "p217 實際印為紫羅蘭色的。先擴充 U20 source guard 才能套用，不繞過。",
  "evidence": [
    "https://dictionary.cambridge.org/dictionary/english/violet"
  ],
  "fieldEvidence": {
    "chapterMeaningsZh": [
      {
        "proposal": "U20-P217-violet",
        "originFindingIds": [
          "U20-P217-violet"
        ],
        "reason": "p217 實際印為紫羅蘭色的。先擴充 U20 source guard 才能套用，不繞過。",
        "sources": [
          {
            "type": "source_photo",
            "filename": "20260815_111022.jpg",
            "page": 217,
            "sha256": "7b0a023dee484f7f6b3ba2482805c09d0ed7bd8e2d9e72c371828c75abba14a6"
          },
          {
            "type": "dictionary",
            "url": "https://dictionary.cambridge.org/dictionary/english/violet",
            "verification": "search-index excerpt; direct Cambridge fetch returned 403"
          }
        ],
        "beforePresent": true
      }
    ]
  }
};
const U20_PARENT_MANIFEST_HASH='7c11faa99fdd572f42d8fac153ec3b743b87509d1d56315b9e7d67c950a2d60c';
const U20_PATTERN_PATCHES:AuditPatch[]=[
  {
    "dataset": "curriculum",
    "path": "src/features/direct/curriculumLV3Unit20.json",
    "key": "learningItemId",
    "id": "LI-LV3U20-G023",
    "before": {
      "learningItemId": "LI-LV3U20-G023",
      "kind": "grammar",
      "sourcePage": 210,
      "pattern": "get rid of sb / sth（get 是連綴動詞，相當於 be；rid 是過去分詞，表「被擺脫」）",
      "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    "after": {
      "pattern": "get rid of sb / sth（get 是連綴動詞，相當於 be；rid 是過去分詞，表「擺脫了……的」）"
    },
    "reason": "A：原書註解把 get rid of 的主詞語意方向顛倒；只將「被擺脫」改為「擺脫了……的」。原始來源印刷記錄保留，不採用新增例句。",
    "evidence": [
      "https://dictionary.cambridge.org/dictionary/english/rid"
    ],
    "fieldEvidence": {
      "pattern": [
        {
          "proposal": "LV3U20-P210-LI-LV3U20-G023-pattern",
          "originFindingIds": [
            "LV3U20-P210-LI-LV3U20-G023-pattern"
          ],
          "reason": "A：原書註解把 get rid of 的主詞語意方向顛倒；只將「被擺脫」改為「擺脫了……的」。原始來源印刷記錄保留，不採用新增例句。",
          "sources": [
            {
              "type": "source_photo",
              "filename": "20260815_110613.jpg",
              "page": 210,
              "sha256": "38ac18d3e9ff4603f265ae09da3f65e6aedaa7ddff7d4464727266f15aed3994",
              "verification": "visually_read_page_preview"
            },
            {
              "type": "dictionary",
              "url": "https://dictionary.cambridge.org/dictionary/english/rid",
              "verification": "web_search_result"
            }
          ],
          "beforePresent": true
        }
      ]
    }
  },
  {
    "dataset": "curriculum",
    "path": "src/features/direct/curriculumLV3Unit20.json",
    "key": "learningItemId",
    "id": "LI-LV3U20-G051",
    "before": {
      "learningItemId": "LI-LV3U20-G051",
      "kind": "grammar",
      "sourcePage": 214,
      "pattern": "sometime 與明確的時間並用",
      "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    "after": {
      "pattern": "sometime 不限於與明確的時間並用"
    },
    "reason": "A：修正原書把 sometime 必須搭配明確時間當作限制的錯誤。只改本條 pattern，原書印刷記錄仍保留。",
    "evidence": [
      "https://dictionary.cambridge.org/dictionary/english/sometime"
    ],
    "fieldEvidence": {
      "pattern": [
        {
          "proposal": "U20-P214-LI-LV3U20-G051",
          "originFindingIds": [
            "U20-P214-LI-LV3U20-G051"
          ],
          "reason": "A：修正原書把 sometime 必須搭配明確時間當作限制的錯誤。只改本條 pattern，原書印刷記錄仍保留。",
          "sources": [
            {
              "type": "source_photo",
              "filename": "20260815_110954.jpg",
              "page": 214,
              "sha256": "ebeee70a1befb925073a2b8258369998a6a174ac36009d7adede43bc35b4296b"
            },
            {
              "type": "dictionary",
              "url": "https://dictionary.cambridge.org/dictionary/english/sometime",
              "verification": "search-index excerpt; direct Cambridge fetch returned 403"
            }
          ],
          "beforePresent": true
        }
      ]
    }
  },
  {
    "dataset": "curriculum",
    "path": "src/features/direct/curriculumLV3Unit20.json",
    "key": "learningItemId",
    "id": "LI-LV3U20-G055",
    "before": {
      "learningItemId": "LI-LV3U20-G055",
      "kind": "grammar",
      "sourcePage": 215,
      "pattern": "forest（可數）；woods（恆用複數，不可數）",
      "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    "after": {
      "pattern": "forest（可數）；woods（複數名詞，指樹林）"
    },
    "reason": "A：woods 的樹林義為複數名詞，不應標成不可數的木材 wood；只更正該詞性標記，原書印刷記錄保留。",
    "evidence": [
      "https://dictionary.cambridge.org/dictionary/english/wood"
    ],
    "fieldEvidence": {
      "pattern": [
        {
          "proposal": "U20-P215-LI-LV3U20-G055",
          "originFindingIds": [
            "U20-P215-LI-LV3U20-G055"
          ],
          "reason": "A：woods 的樹林義為複數名詞，不應標成不可數的木材 wood；只更正該詞性標記，原書印刷記錄保留。",
          "sources": [
            {
              "type": "source_photo",
              "filename": "20260815_111004.jpg",
              "page": 215,
              "sha256": "a2247f122d9256ad99b25c2c69cfd78823c725095f936c4a6223d3d1755b718c"
            },
            {
              "type": "dictionary",
              "url": "https://dictionary.cambridge.org/dictionary/english/wood",
              "verification": "search-index excerpt; direct Cambridge fetch returned 403"
            }
          ],
          "beforePresent": true
        }
      ]
    }
  }
];
const U20_PATTERN_IDS=new Set(U20_PATTERN_PATCHES.map(p=>p.id));
export function verifiedU20PatternPatch(m:AuditManifest,p:AuditPatch){return m.unit==='LV3-U20'&&p.dataset==='curriculum'&&U20_PATTERN_PATCHES.some(expected=>isDeepStrictEqual(p,expected));}
function verifiedU20SourcePatch(m:AuditManifest,p:AuditPatch){return m.unit==='LV3-U20'&&isDeepStrictEqual(p,U20_SOURCE_PATCH);}
function validateU20SourceContract(m:AuditManifest){
 assert.equal(m.unit,'LV3-U20','invalid U20 source owner');
 assert.deepEqual(m.collections?.source,U20_SOURCE_COLLECTION,'invalid U20 source collection');
 assert.deepEqual(m.files?.[U20_SOURCE_COLLECTION.path],U20_SOURCE_GUARD,'U20 source whole-file contract mismatch');
 const patches=m.patches.filter(p=>p.dataset==='source');assert.equal(patches.length,1,'invalid U20 source patch count');
 assert.ok(verifiedU20SourcePatch(m,patches[0]),'invalid U20 source patch contract');
}
export function admitU20SupplementalSource(previousInputs:Record<string,string>,anchorInputs:Record<string,string>,predecessor:Pick<Entry,'unit'|'status'>|undefined,previousHash:string|undefined,m:AuditManifest):Record<string,string>{
 validateU20SourceContract(m);
 assert.equal(predecessor?.unit,'LV3-U19');assert.equal(predecessor?.status,'committed');
 assert.equal(previousHash,U20_PARENT_MANIFEST_HASH,'invalid U20 source predecessor');
 assert.equal(m.parentManifestHash,previousHash,'invalid U20 source parent hash');
 assert.equal(Object.keys(anchorInputs).length,144);
 for(const path of [U18_SOURCE_COLLECTION.path,U19_SOURCE_COLLECTION.path,U20_SOURCE_COLLECTION.path])assert.ok(!Object.hasOwn(anchorInputs,path));
 assert.deepEqual(Object.keys(previousInputs).sort(),[...Object.keys(anchorInputs),U18_SOURCE_COLLECTION.path,U19_SOURCE_COLLECTION.path].sort());
 assert.equal(Object.keys(previousInputs).length,146);
 assert.equal(previousInputs[U18_SOURCE_COLLECTION.path],U18_SOURCE_GUARD.afterByteHash,'invalid prior U18 source guard');
 assert.equal(previousInputs[U19_SOURCE_COLLECTION.path],U19_SOURCE_GUARD.afterByteHash,'invalid prior U19 source guard');
 assert.ok(!Object.hasOwn(previousInputs,U20_SOURCE_COLLECTION.path));
 return {...previousInputs,[U20_SOURCE_COLLECTION.path]:U20_SOURCE_GUARD.beforeByteHash!};
}
const supplementalSourceContracts=[
 {unit:'LV3-U18',collection:U18_SOURCE_COLLECTION,guard:U18_SOURCE_GUARD},
 {unit:'LV3-U19',collection:U19_SOURCE_COLLECTION,guard:U19_SOURCE_GUARD},
 {unit:'LV3-U20',collection:U20_SOURCE_COLLECTION,guard:U20_SOURCE_GUARD},
];

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
 if(m.unit==='LV3-U16')globalCollections.senses={path:'public/data/v1/senses.json',key:'senseId'};
 const safeRelative=(path:string)=>assert.ok(path&&!path.includes('\\')&&!path.includes(':')&&!path.startsWith('/')&&!path.split('/').includes('..'),'unsafe path');
 if(m.unit==='LV3-U20')validateU20SourceContract(m);
 if(m.unit==='LV3-U19')validateU19SourceContract(m);
 if(m.unit==='LV3-U18'){assert.deepEqual(contracts.collections.source,U18_SOURCE_COLLECTION,'missing exact U18 source collection');assert.deepEqual(contracts.files[U18_SOURCE_COLLECTION.path],U18_SOURCE_GUARD,'U18 source whole-file contract mismatch');}
 for(const [name,col]of Object.entries(contracts.collections)){
  sameKeys(col,['path','key','rowsField']);safeRelative(col.path);
  if(globalCollections[name]){
   assert.equal(col.path,globalCollections[name].path);assert.equal(col.key,globalCollections[name].key);assert.equal(col.rowsField,null,'global rows must be root array');
  }else if(name==='source'){
   assert.ok(m.unit==='LV3-U18'||m.unit==='LV3-U19'||m.unit==='LV3-U20','unsupported source collection');
   assert.deepEqual(col,m.unit==='LV3-U18'?U18_SOURCE_COLLECTION:m.unit==='LV3-U19'?U19_SOURCE_COLLECTION:U20_SOURCE_COLLECTION);
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
  source:[],senses:[],examples:['sensePos','meaningHint'],notes:['title','content'],curriculum:['explanationZh'],grammarQuestions:['targetMeaningZh','options']
 };
 for(const p of m.patches){
  sameKeys(p,['dataset','path','key','id','before','after','reason','evidence','fieldEvidence']);
  const id=p.dataset+':'+p.id,r=allowed.get(id),col=contracts.collections[p.dataset];
  assert.ok(r&&!seen.has(id),'duplicate or unscoped row');seen.add(id);
  assert.ok(col);assert.equal(p.path,col.path);assert.equal(p.key,col.key);
  assert.ok(p.before&&typeof p.before==='object'&&!Array.isArray(p.before));assert.equal(p.before[p.key],p.id);
  assert.equal(auditHash(p.before),r.beforeHash);assert.deepEqual(p.after,r.after,'exact scope values required');
  if(m.unit==='LV3-U11')assert.ok(p.fieldEvidence!==null&&typeof p.fieldEvidence==='object'&&!Array.isArray(p.fieldEvidence),'invalid U11 field evidence object');
  if(m.unit==='LV3-U13'&&p.dataset==='words'&&p.id==='W003112')assert.ok(verifiedU13GroomPatch(m,p),'incomplete U13 groom contract');
  if(m.unit==='LV3-U11'&&p.dataset==='words'&&p.id==='W004264')assert.ok(verifiedU11DebutForms(m,p),'incomplete U11 debut contract');
  if(m.unit==='LV3-U16')assert.ok(p.fieldEvidence!==null&&typeof p.fieldEvidence==='object'&&!Array.isArray(p.fieldEvidence),'invalid U16 field evidence object');
  const u16Exact=verifiedU16ReviewPatch(m,p);
  if(m.unit==='LV3-U16'&&(U16_RESERVED.has(p.dataset+':'+p.id)||p.dataset==='senses'||Object.hasOwn(p.after,'status')||Object.hasOwn(p.fieldEvidence!,'status')||Object.hasOwn(p.after,'pattern')||Object.hasOwn(p.fieldEvidence!,'pattern')))assert.ok(u16Exact,'incomplete U16 exact review contract');
  let fields=allowedFields[p.dataset];
  if(p.dataset==='source'){
   if(m.unit==='LV3-U20'){assert.ok(verifiedU20SourcePatch(m,p),'incomplete exact U20 source contract');fields=['chapterMeaningsZh'];}
   else if(m.unit==='LV3-U19'){assert.ok(verifiedU19SourcePatch(m,p),'incomplete exact U19 source contract');fields=['sourcePos'];}
   else{assert.ok(verifiedU18SourcePatch(m,p),'incomplete exact U18 source contract');fields=['sourcePos','chapterMeaningsZh'];}
  }
  if(u16Exact&&['examples','senses'].includes(p.dataset))fields=Object.keys(p.after);
  const republicFact=verifiedU09RepublicFact(m,p);
  if(republicFact)fields=['sentenceEn','sentenceZh','blankSentence'];
  if(verifiedU11ReviewPatch(m,p,'examples'))fields=['sentenceZh'];
  if(p.dataset==='curriculum'){
   if(m.unit==='LV3-U20'){
    assert.ok(p.fieldEvidence!==null&&typeof p.fieldEvidence==='object'&&!Array.isArray(p.fieldEvidence),'invalid U20 field evidence object');
    if(U20_PATTERN_IDS.has(p.id)||U20_PATTERN_IDS.has(String(p.before.learningItemId))||Object.hasOwn(p.fieldEvidence,'pattern')||Object.hasOwn(p.after,'pattern'))assert.ok(verifiedU20PatternPatch(m,p),'incomplete U20 pattern contract');
   }
   if(m.unit==='LV3-U14'){
    assert.ok(p.fieldEvidence!==null&&typeof p.fieldEvidence==='object'&&!Array.isArray(p.fieldEvidence),'invalid U14 field evidence object');
    if(U14_PATTERN_IDS.has(p.id)||U14_PATTERN_IDS.has(String(p.before.learningItemId))||Object.hasOwn(p.fieldEvidence,'pattern')||Object.hasOwn(p.after,'pattern'))assert.ok(verifiedU14PatternPatch(m,p),'incomplete U14 pattern contract');
   }
   if(m.unit==='LV3-U13'){
    assert.ok(p.fieldEvidence!==null&&typeof p.fieldEvidence==='object'&&!Array.isArray(p.fieldEvidence),'invalid U13 field evidence object');
    if(U13_PATTERN_IDS.has(p.id)||U13_PATTERN_IDS.has(String(p.before.learningItemId))||Object.hasOwn(p.fieldEvidence,'pattern')||Object.hasOwn(p.after,'pattern'))assert.ok(verifiedU13PatternPatch(m,p),'incomplete U13 pattern contract');
   }
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
   if(p.before.kind==='grammar'&&verifiedU13PatternPatch(m,p))fields=['pattern','explanationZh'];
   if(p.before.kind==='grammar'&&verifiedU14PatternPatch(m,p))fields=['pattern','explanationZh'];
   if(p.before.kind==='grammar'&&verifiedU20PatternPatch(m,p))fields=Object.keys(p.after);
   if(p.before.kind==='grammar'&&u16Exact)fields=['pattern','explanationZh'];
   if(Object.hasOwn(p.after,'meaningSource'))assert.ok(['textbook_source_review','textbook_and_dictionary_review'].includes(p.after.meaningSource as string),'invalid reviewed meaning source');
   for(const [field,value]of Object.entries(p.after).filter(([field])=>fields.includes(field))){
    assert.ok(typeof value==='string'&&value.trim(),'invalid curriculum scalar');
    assert.ok(p.fieldEvidence?.[field]?.length,'missing curriculum field source');
   }
  }
  assert.ok(Object.keys(p.after).length&&Object.keys(p.after).every(k=>fields?.includes(k)&&(!protectedKeys.has(k)||(republicFact&&k==='sentenceEn')||(u16Exact&&k==='status'))),'disallowed after field');
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
    ?verifiedWageForms(p,f):(verifiedU13GroomPatch(m,p)||f.base===p.before.word),'invalid verified forms base');assert.equal(f.status,'approved');
   assert.ok(verifiedU08DiscomfortForms(m,p,f)||verifiedU11DebutForms(m,p)||['https://www.collinsdictionary.com/dictionary/english/'+f.base,'https://www.collinsdictionary.com/conjugation/english/'+f.base].includes(f.sourceRef as string),'invalid verified forms source');
   assert.ok((p.fieldEvidence.verbForms??[]).some(record=>(record as {sources:unknown[]}).sources.some(source=>typeof source==='object'&&source!==null&&(source as Row).url===f.sourceRef)),'forms source lacks evidence');
  }
 }
}


type ChainStep={entry:Entry;manifest:Manifest;scope:AuditScope|undefined};
type AuditOperation={chain?:ChainStep[];loadMigration:MigrationLoader;validateScope:(m:AuditManifest,s:AuditScope)=>void;proof:(m:StarterMediaMigration,previous?:Record<string,string>)=>ReturnType<typeof validateStarterMediaMigration>};
// Private synchronous operation only. Nothing is retained or returned to callers.
function auditOperation():AuditOperation {
 const texts=new Map<string,string|Buffer>();
 const scopes=new WeakMap<AuditManifest,AuditScope>();
 const proofs=new WeakMap<StarterMediaMigration,ReturnType<typeof validateStarterMediaMigration>>();
 const loadMigration:MigrationLoader=path=>{if(!texts.has(path))texts.set(path,migrationLoad(path));return texts.get(path)!;};
 return {loadMigration,
  validateScope(m,scope){if(scopes.get(m)!==scope){validateAuditScope(m,scope);scopes.set(m,scope);}},
  proof(m,previous){
   if(previous)assert.deepEqual(m.beforeInputs,previous,'migration checkpoint adjacency');
   let proof=proofs.get(m);
   if(!proof){proof=validateStarterMediaMigration(m,loadMigration,previous);proofs.set(m,proof);}
   return proof;
  },
 };
}
export function loadLV3Chain(){return loadChain(auditOperation());}
function loadChain(operation:AuditOperation):ChainStep[]{
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
   operation.proof(candidate,previousInputs);previousInputs={...candidate.afterInputs};previous=e.manifestHash;
   return {entry:e,manifest:candidate,scope:undefined};
  }
  assert.equal(e.kind,undefined,'unknown chain kind');assert.deepEqual(Object.keys(e).sort(),['unit','path','manifestHash','status'].sort(),'unknown chain entry fields');assert.ok(e.unit);assert.ok(!isMigration(candidate),'untyped migration');
  const manifest=candidate;
  assert.equal(auditHash(manifest),e.manifestHash);assert.equal(manifest.unit,e.unit);assert.equal(manifest.baseline,BASELINE);
  let scope:AuditScope|undefined;
  if(manifest.schemaVersion===2){
   assert.equal(manifest.parentManifestHash,previous,'broken parent chain');
   assert.ok(manifest.scope);scope=read(manifest.scope) as AuditScope;operation.validateScope(manifest,scope);
   assert.ok(previousInputs,'predecessor checkpoint not finalized');
   const files=manifest.files!,collections=manifest.collections!;
   for(const name of ['curriculum','grammarQuestions'])if(collections[name])assert.equal(collections[name].path,catalog.get(e.unit),'unit curriculum path');
   if(manifest.unit==='LV3-U18'){
    // Exact supplementary source admission; all original anchor keys stay unchanged.
    previousInputs=admitU18SupplementalSource(previousInputs,anchor.inputs,chain.entries[index-1],previous,manifest);
   }
   if(manifest.unit==='LV3-U19')previousInputs=admitU19SupplementalSource(previousInputs,anchor.inputs,chain.entries[index-1],previous,manifest);
    if(manifest.unit==='LV3-U20')previousInputs=admitU20SupplementalSource(previousInputs,anchor.inputs,chain.entries[index-1],previous,manifest);
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

// Every public projection gets a new operation and reauthenticates the chain.

function rows(value:unknown,col:Collection):Row[]{
 const result=col.rowsField?(value as Row)[col.rowsField]:value;
 assert.ok(Array.isArray(result),'collection must contain rows');return result as Row[];
}

// Per-operation row indexes preserve every duplicate and strict row check.
function rowLookup(){
 const cache=new WeakMap<Row[],Map<string,Map<unknown,number[]>>>();
 return {
  find(rr:Row[],key:string,id:unknown):number[]{
   if(typeof id==='number'&&Number.isNaN(id))return [];
   let keys=cache.get(rr);if(!keys){keys=new Map();cache.set(rr,keys);}
   let index=keys.get(key);if(!index){index=new Map();rr.forEach((row,i)=>{const value=row[key],matches=index!.get(value);if(matches)matches.push(i);else index!.set(value,[i]);});keys.set(key,index);}
   return index.get(id)??[];
  },
  replace(rr:Row[],at:number,next:Row):void{
   for(const [key,index]of cache.get(rr)??[]){
    const oldId=rr[at][key],nextId=next[key];if(oldId===nextId)continue;
    const old=index.get(oldId);if(old){const filtered=old.filter(i=>i!==at);if(filtered.length)index.set(oldId,filtered);else index.delete(oldId);}
    const matches=index.get(nextId);if(matches){matches.push(at);matches.sort((a,b)=>a-b);}else index.set(nextId,[at]);
   }
   rr[at]=next;
  },
 };
}
/** Strict physical-file projection; checks complete documents, never subsets. */
export function projectAuditStep(m:AuditManifest,documents:Record<string,unknown>,inverse=true,scope?:AuditScope){
 if(m.schemaVersion===2){assert.ok(scope);validateAuditScope(m,scope);}
 const c=auditContract(m),out=structuredClone(documents),lookup=rowLookup();
 assert.deepEqual(Object.keys(documents).sort(),Object.keys(c.files).sort(),'incomplete document set');
 for(const [name,col]of Object.entries(c.collections))if(['curriculum','grammarQuestions'].includes(name))validateCurriculumIdentity(m.unit,col.path,documents[col.path]);
 for(const [path,g]of Object.entries(c.files))assert.equal(auditHash(documents[path]),g[inverse?'afterHash':'beforeHash'],'unknown whole-file drift');
 for(const p of inverse?[...m.patches].reverse():m.patches){
  const col=c.collections[p.dataset],rr=rows(out[col.path],col),indices=lookup.find(rr,p.key,p.id);
  assert.equal(indices.length,1,'nonunique row');
  assert.deepEqual(rr[indices[0]],inverse?{...p.before,...p.after}:p.before,'complete row drift');
  lookup.replace(rr,indices[0],structuredClone(inverse?p.before:{...p.before,...p.after}));
 }
 for(const col of Object.values(c.collections)){
  const old=rows(documents[col.path],col).map(r=>r[col.key]),next=rows(out[col.path],col).map(r=>r[col.key]);
  assert.deepEqual(next,old,'ID/order/count');assert.equal(new Set(next).size,next.length,'duplicate IDs');
 }
 for(const [path,g]of Object.entries(c.files))assert.equal(auditHash(out[path]),g[inverse?'beforeHash':'afterHash'],'wrong result hash');
 return out;
}

/** Row-level compatibility for historical fixtures; untouched drift stays visible. */
function reverseRows<T>(m:AuditManifest,dataset:string,value:T,allowMissing:boolean,canonical=false):T {
 // Private only: outer caller cloned this buffer or created it with JSON.parse.
 // Preserve row checks and cloned restoration rows; never accept borrowed input.
 const c=auditContract(m),col=c.collections[dataset],out=value;
 if(!col)return out;
 assert.equal(col.rowsField,null,'use physical-file projection for curriculum documents');
 const rr=rows(out,col),lookup=rowLookup();
 for(const p of [...m.patches].reverse().filter(p=>p.dataset===dataset)){
  const indexes=lookup.find(rr,p.key,p.id);
  assert.ok(indexes.length<=1,'audit cannot conceal duplicate identities');
  if(!indexes.length&&allowMissing)continue;
  assert.equal(indexes.length,1,'complete audit dataset must contain recorded identity');
  assert.deepEqual(rr[indexes[0]],{...p.before,...p.after},'exact audited row required');
  lookup.replace(rr,indexes[0],canonical?JSON.parse(JSON.stringify(structuredClone(p.before))):structuredClone(p.before));
 }
 return out;
}

function checkpoint(afterUnit:string,operation:AuditOperation){
 const chain=operation.chain??=loadChain(operation),committed=chain.filter(x=>x.entry.status==='committed');
 const positions=committed.flatMap((x,i)=>(x.entry.unit??x.entry.migrationId)===afterUnit?[i]:[]);
 assert.equal(positions.length,1,'unknown or uncommitted checkpoint');
 const index=positions[0],anchor=read('U01-checkpoint.json') as {inputs:Record<string,string>};
 const bytes={...anchor.inputs},semantic:Record<string,string>={};
 for(const step of committed.slice(0,index+1)){
  if(isMigration(step.manifest)){Object.assign(bytes,step.manifest.afterInputs);const proof=operation.proof(step.manifest);semantic[BUILDER]=auditHash(proof.texts.afterBuilder.replace(/\r\n/g,'\n'));continue;}
  for(const [path,g]of Object.entries(auditContract(step.manifest).files)){
   semantic[path]=g.afterHash;if(g.afterByteHash)bytes[path]=g.afterByteHash;
  }
  Object.assign(bytes,step.manifest.derivedAfter??{});
  if(step.manifest.derivedAfter?.[PACK])delete semantic[PACK];
 }
 const later=committed.slice(index+1);
 for(const step of later){if(isMigration(step.manifest)){const proof=operation.proof(step.manifest);if(!semantic[BUILDER])semantic[BUILDER]=auditHash(proof.texts.beforeBuilder.replace(/\r\n/g,'\n'));continue;}for(const [path,g]of Object.entries(auditContract(step.manifest).files))if(!semantic[path])semantic[path]=g.beforeHash;}
 // Prepared owners are not selectable; their before sources remain guarded.
 // Authenticate BOTH sources afresh on every public operation.
 for(const registered of supplementalSourceContracts){
  const sourceOwners=chain.filter(isAuditUnitStep).filter(step=>step.manifest.unit===registered.unit);
  const label=registered.unit.replace('LV3-','');
  assert.ok(sourceOwners.length<=1,`duplicate ${label} supplementary source owner`);
  if(!sourceOwners.length)continue;
  const owner=sourceOwners[0],path=registered.collection.path,guard=owner.manifest.files![path];
  assert.deepEqual(guard,registered.guard,`${label} source whole-file contract mismatch`);
  const currentSide=owner.entry.status==='committed'?'after':'before';
  const raw=readFileSync(new URL('../../../'+path,import.meta.url),'utf8').replace(/\r\n/g,'\n');
  assert.equal(createHash('sha256').update(raw).digest('hex'),guard[currentSide==='after'?'afterByteHash':'beforeByteHash'],`${label} source current checkpoint drift`);
  const targetIncludesOwner=committed.slice(0,index+1).some(step=>step.entry.unit===registered.unit);
  bytes[path]=(targetIncludesOwner?guard.afterByteHash:guard.beforeByteHash)!;
  semantic[path]=targetIncludesOwner?guard.afterHash:guard.beforeHash;
 }
 return {later,bytes,semantic,operation};
}

export function lv3AfterUnitRows<T>(afterUnit:string,dataset:string,value:T,options:{allowMissing?:boolean}={}):T {
 return rowsAtCheckpoint(checkpoint(afterUnit,auditOperation()),dataset,value,options);
}
function rowsAtCheckpoint<T>({later}:ReturnType<typeof checkpoint>,dataset:string,value:T,options:{allowMissing?:boolean}={}):T {
 const name=dataset.replace(/\.json$/,'');
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
// Reject executable caller structures before authenticating any snapshot. Do not
// clone inputs first: cloning could erase array properties that strict guards see.
function assertPassiveBatch(value:unknown,active=new Set<object>()):void {
 if(value===null||typeof value==='string'||typeof value==='boolean')return;
 if(typeof value==='number'){assert.ok(Number.isFinite(value),'batch non-JSON number');return;}
 assert.ok(typeof value==='object'&&value!==null,'batch non-JSON value');
 assert.ok(!utilTypes.isProxy(value),'batch proxy is not allowed');
 const object=value as object,array=Array.isArray(object);
 assert.equal(Object.getPrototypeOf(object),array?Array.prototype:Object.prototype,'batch non-JSON prototype');
 assert.ok(!active.has(object),'batch cycle is not allowed');active.add(object);
 for(const key of Reflect.ownKeys(object)){
  assert.equal(typeof key,'string','batch symbol key is not allowed');
  const descriptor=Object.getOwnPropertyDescriptor(object,key)!;
  assert.ok('value' in descriptor,'batch accessor is not allowed');
  if(array&&key==='length')continue;
  assert.equal(descriptor.enumerable,true,'batch hidden field is not allowed');
  assertPassiveBatch(descriptor.value,active);
 }
 active.delete(object);
}
/** One call, fresh authenticated checkpoint, complete row checks for every dataset. */
export function lv3BeforeAuditDatasets(datasets:Record<string,unknown>,options:{allowMissing?:boolean}={}):Record<string,unknown> {
 assertPassiveBatch(datasets);assertPassiveBatch(options);
 const entries=Object.entries(datasets),checkedOptions={allowMissing:options.allowMissing??false};
 const state=checkpoint('LV3-U01',auditOperation());
 return Object.fromEntries(entries.map(([name,value])=>[name,
  lv3Unit1BeforeAudit(name,rowsAtCheckpoint(state,name,value,checkedOptions),checkedOptions)]));
}

export function reverseFileAuditSteps<T>(steps:{manifest:Manifest;scope?:AuditScope}[],path:string,value:T,loadMigration:MigrationLoader=migrationLoad):T {
 return reverseFiles(steps,path,value,loadMigration,validateAuditScope,(m)=>validateStarterMediaMigration(m,loadMigration));
}
function reverseFiles<T>(steps:{manifest:Manifest;scope?:AuditScope}[],path:string,value:T,loadMigration:MigrationLoader,validateScope:AuditOperation['validateScope'],proofFor:AuditOperation['proof']):T {
 let out=structuredClone(value);let lookup=rowLookup();const publishedProof:PublishedProof={};let semanticProof:string|undefined;
 for(const {manifest,scope} of [...steps].reverse()){
  if(isMigration(manifest)){
   lookup=rowLookup();for(const key of Object.keys(publishedProof))delete publishedProof[key as keyof PublishedProof];semanticProof=undefined;
   if(path===PACK){const proof=proofFor(manifest);assert.deepEqual(out,proof.after,'migration whole pack drift');const pack=out as Row;for(const d of [...manifest.delta].reverse()){assert.deepEqual((pack.media as Row[])[d.afterIndex],d.row);(pack.media as Row[]).splice(d.afterIndex,1);}pack.meta=structuredClone(manifest.beforePackMeta);assert.deepEqual(pack,proof.before,'migration semantic inverse');}
   else if(path===BUILDER){assert.equal(typeof out,'string');out=inverseStarterMediaMigrationNormalized(manifest,path,out as string,loadMigration) as T;}
   continue;
  }
  if(manifest.schemaVersion===2){assert.ok(scope);validateScope(manifest,scope);}
  if(manifest.schemaVersion===2&&(path===PACK||path==='public/data/v1/meta.json')){
   assert.ok(scope);const text=publishedProof.text??(JSON.stringify(out,null,path===PACK?undefined:2)+'\n');inversePublishedStep(manifest,scope,path,text,validateScope,publishedProof);out=publishedProof.value as T;semanticProof=undefined;continue;
  }
  const c=auditContract(manifest),guard=c.files[path];if(!guard)continue;
  for(const [name,col]of Object.entries(auditContract(manifest).collections))if(col.path===path&&['curriculum','grammarQuestions'].includes(name))validateCurriculumIdentity(manifest.unit,path,out);
  assert.equal(semanticProof??auditHash(out),guard.afterHash,'unknown whole-file drift');
  for(const p of [...manifest.patches].reverse().filter(p=>p.path===path)){
   const rr=rows(out,c.collections[p.dataset]),indices=lookup.find(rr,p.key,p.id);
   assert.equal(indices.length,1,'nonunique row');assert.deepEqual(rr[indices[0]],{...p.before,...p.after});
   lookup.replace(rr,indices[0],structuredClone(p.before));
  }
  semanticProof=auditHash(out);assert.equal(semanticProof,guard.beforeHash,'wrong inverse hash');for(const key of Object.keys(publishedProof))delete publishedProof[key as keyof PublishedProof];
 }
 return out;
}
export function lv3AfterUnitFile<T>(afterUnit:string,path:string,value:T):T {
 return fileAtCheckpoint(checkpoint(afterUnit,auditOperation()),path,value);
}
function fileAtCheckpoint<T>(state:ReturnType<typeof checkpoint>,path:string,value:T):T {
 assert.ok(Object.hasOwn(state.bytes,path)||Object.hasOwn(state.semantic,path),'unknown checkpoint path');
 assert.ok(path&&!path.startsWith('/')&&!path.includes('\\')&&!path.includes(':')&&!path.split('/').includes('..'),'unsafe checkpoint path');
 let input=value,authenticatedTarget:T|undefined;
 // Strictly compare the original caller BEFORE any clone for every registered
 // JSON input, including unchanged media. Authentication below still checks
 // the raw chain, inverse row guards and target byte/semantic hashes.
 if(path!==BUILDER){
  assert.ok(path.endsWith('.json'),'unsupported checkpoint document');
  const raw=readFileSync(new URL('../../../'+path,import.meta.url),'utf8').replace(/\r\n/g,'\n');
  const current=JSON.parse(raw) as T;
  assert.ok(isDeepStrictEqual(value,current),'unknown whole-file strict semantic drift');
  input=path===PACK?beforeU03Starter(current):current;
  if(state.later.some(step=>!isMigration(step.manifest)&&Object.hasOwn(auditContract(step.manifest).files,path))
    &&path!==PACK&&path!=='public/data/v1/meta.json'){
   const projected=publishedTextAtCheckpoint(state,path,raw);
   authenticatedTarget=JSON.parse(projected) as T;
  }
 }
 const out=reverseFiles(state.later,path,input,state.operation.loadMigration,state.operation.validateScope,state.operation.proof);
 if(authenticatedTarget!==undefined)assert.ok(isDeepStrictEqual(out,authenticatedTarget),'authenticated whole-file inverse drift');
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
/** No context is exposed; each batch starts with fresh authentication. */
export function lv3AfterUnitFiles(afterUnit:string,documents:Record<string,unknown>):Record<string,unknown> {
 assertPassiveBatch(documents);const entries=Object.entries(documents);
 const state=checkpoint(afterUnit,auditOperation());
 return Object.fromEntries(entries.map(([path,value])=>[path,fileAtCheckpoint(state,path,value)]));
}
export function lv3AfterUnit1File<T>(path:string,value:T):T {
 return lv3AfterUnitFile('LV3-U01',path,value);
}


/** Strict one-step raw projection, also used for cross-language fixture parity. */
export function inversePublishedAuditStep(m:AuditManifest,scope:AuditScope,path:string,text:string):string {
 return inversePublishedStep(m,scope,path,text,validateAuditScope);
}
type PublishedProof={text?:string;rawHash?:string;semanticHash?:string;value?:unknown;canonical?:boolean};
function inversePublishedStep(m:AuditManifest,scope:AuditScope,path:string,text:string,validateScope:AuditOperation['validateScope'],proof?:PublishedProof):string {
 validateScope(m,scope);
 assert.equal(text,text.replace(/\r\n/g,'\n'),'caller must normalize CRLF first');
 const digest=(s:string)=>proof?.text===s&&proof.rawHash?proof.rawHash:createHash('sha256').update(s).digest('hex');
 let out=text;const lookup=rowLookup();let nextSemanticHash:string|undefined;let parsed:unknown=proof?.text===text?proof.value:undefined;let canonical=proof?.text===text&&proof.canonical===true;
  const c=auditContract(m),guard=c.files[path];
  if(guard){
   assert.equal(digest(out),guard.afterByteHash,'unknown raw after drift');
   let value=parsed===undefined?JSON.parse(out):parsed;assert.equal(proof?.text===out&&proof.semanticHash?proof.semanticHash:auditHash(value),guard.afterHash);
   for(const [name,col]of Object.entries(c.collections))if(col.path===path&&['curriculum','grammarQuestions'].includes(name))validateCurriculumIdentity(m.unit,path,value);
   for(const p of [...m.patches].reverse().filter(p=>p.path===path)){
    const rr=rows(value,c.collections[p.dataset]),indexes=lookup.find(rr,p.key,p.id);
    assert.equal(indexes.length,1);assert.deepEqual(rr[indexes[0]],{...p.before,...p.after});lookup.replace(rr,indexes[0],proof&&canonical?JSON.parse(JSON.stringify(structuredClone(p.before))):structuredClone(p.before));
   }
   if(proof&&!canonical)value=JSON.parse(JSON.stringify(value));
   nextSemanticHash=auditHash(value);assert.equal(nextSemanticHash,guard.beforeHash);out=JSON.stringify(value,null,2)+'\n';parsed=value;canonical=true;
   if(digest(out)!==guard.beforeByteHash){
    const fixture=guard.beforeFixture;assert.ok(fixture,'missing guarded byte fixture');
    assert.ok(fixture.startsWith('docs/lv3-audit-20261107/'),'invalid byte fixture path');
    const relative=fixture.slice('docs/lv3-audit-20261107/'.length);
    assert.ok(!relative.includes('..')&&!relative.includes(':')&&!relative.includes('\\'),'unsafe fixture path');
    out=readFileSync(new URL(relative,docs),'utf8').replace(/\r\n/g,'\n');parsed=JSON.parse(out);canonical=false;assert.equal(auditHash(parsed),guard.beforeHash);
   }
   assert.equal(digest(out),guard.beforeByteHash,'wrong raw before hash');
  }else if(path==='public/data/v1/meta.json'||path==='public/data/v1/sa-pack.json'){
   assert.ok(m.derivedAfter&&m.derivedBefore);assert.equal(digest(out),m.derivedAfter[path],'unknown derived after drift');
   if(path.endsWith('/meta.json')){assert.ok(m.beforeMeta);out=JSON.stringify(m.beforeMeta,null,2)+'\n';parsed=JSON.parse(out);canonical=true;}
   else{
    let pack=(parsed===undefined?JSON.parse(out):parsed) as Row;
    for(const name of ['words','examples','notes'])if(c.collections[name])pack[name]=reverseRows(m,name,pack[name],true,Boolean(proof&&canonical));
    if(m.unit==='LV3-U16'&&c.collections.senses)pack.senses=reverseRows(m,'senses',pack.senses,true,Boolean(proof&&canonical));
    assert.ok(m.beforePackMeta);pack.meta=proof&&canonical?JSON.parse(JSON.stringify(structuredClone(m.beforePackMeta))):structuredClone(m.beforePackMeta);if(proof&&!canonical)pack=JSON.parse(JSON.stringify(pack)) as Row;out=JSON.stringify(pack)+'\n';parsed=pack;canonical=true;
   }
   assert.equal(digest(out),m.derivedBefore[path],'wrong derived before hash');
  }

 if(proof){const rawHash=digest(out);proof.text=out;proof.rawHash=rawHash;proof.semanticHash=nextSemanticHash;proof.value=parsed;proof.canonical=canonical;}
 return out;
}

/** Raw projection checks the selected target even when the successor list is empty. */
export function lv3AfterUnitPublishedText(afterUnit:string,path:string,text:string):string {
 assert.equal(text,text.replace(/\r\n/g,'\n'),'caller must normalize CRLF first');
 return publishedTextAtCheckpoint(checkpoint(afterUnit,auditOperation()),path,text);
}
export function lv3AfterUnitPublishedTexts(afterUnit:string,texts:Record<string,string>):Record<string,string> {
 assertPassiveBatch(texts);const entries=Object.entries(texts);
 const state=checkpoint(afterUnit,auditOperation());
 return Object.fromEntries(entries.map(([path,text])=>[path,publishedTextAtCheckpoint(state,path,text)]));
}
// Private, synchronous operation-local reuse only. Public entrypoints always
// create a fresh checkpoint; no state or proof survives a public operation.
function publishedTextAtCheckpoint(state:ReturnType<typeof checkpoint>,path:string,text:string):string {
 assert.equal(text,text.replace(/\r\n/g,'\n'),'caller must normalize CRLF first');
 const source=supplementalSourceContracts.find(registered=>registered.collection.path===path);
 if(source)assert.ok(Object.hasOwn(state.bytes,path),`unknown ${source.unit.replace('LV3-','')} supplementary checkpoint path`);
 let out=path===PACK?beforeU03StarterText(text):text;const proof:PublishedProof={};
 for(const {manifest,scope} of [...state.later].reverse()){
  if(isMigration(manifest)){out=inverseStarterMediaMigrationNormalized(manifest,path,out,state.operation.loadMigration);continue;}
  assert.ok(scope);out=inversePublishedStep(manifest,scope,path,out,state.operation.validateScope,proof);
 }
 if(state.bytes[path])assert.equal(createHash('sha256').update(out).digest('hex'),state.bytes[path],'target checkpoint raw drift');
 return out;
}
export function lv3AfterUnit1PublishedText(path:string,text:string):string {
 return lv3AfterUnitPublishedText('LV3-U01',path,text);
}

/** Strict synchronous multi-step projection. Every call owns a fresh proof; each supplied scope is validated. This low-level API validates caller-supplied steps, not the current chain or source files. */
export function inversePublishedAuditSteps(steps:{manifest:AuditManifest;scope:AuditScope}[],path:string,text:string){const proof:PublishedProof={};let out=text;for(const {manifest,scope}of [...steps].reverse())out=inversePublishedStep(manifest,scope,path,out,validateAuditScope,proof);return out;}
