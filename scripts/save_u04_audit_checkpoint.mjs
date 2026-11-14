import {readFileSync,writeFileSync,mkdirSync,copyFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const cli=p=>JSON.parse(readFileSync(p,'utf8').split('### Result')[1].split('### Ran Playwright code')[0].trim());
const root='docs/unit-audit-20261105/';
const source=read('output/unit-audit-20261105/LV1-U04-full-source.json');
const general=cli('output/playwright/unit-audit/u04-general-final-ui.txt');
const unit=cli('output/playwright/unit-audit/u04-published-final-ui.txt');
const art=read(root+'LV1-U04-original-image-review.json');
const registry=read('src/features/vocabulary/auditedWordIllustrations.json').filter(c=>c.reviewId.startsWith('LV1-U04-'));
if(general.length!==36||unit.length!==5||registry.length!==19)throw Error('Scope mismatch');
for(const c of general)if(c.mismatches.length||!c.definitionMatches||!c.imageInfo.length||c.imageInfo.some(i=>!i.complete||!i.width))throw Error('Incomplete final general card '+c.id);
for(const c of unit)if(c.images.some(i=>!i.complete||!i.width))throw Error('Incomplete final unit card '+c.id);
for(const c of art.cards){
 c.pixelReview='agent actually viewed original PNG contact sheets (660px, every labeled image) and five published cards in actual UI';
 if(!c.generalCardRepair)continue;
 const pair=registry.find(r=>r.reviewId===c.id),actual=general.find(r=>r.id===c.id);
 if(!actual.hero.includes(pair.illustration.captionEn)||!actual.hero.includes(pair.illustration.captionZh)||!actual.imageInfo.some(i=>i.src.includes(pair.illustration.path)))throw Error('Pair not reopened '+c.id);
 if(createHash('sha256').update(readFileSync('public/'+pair.illustration.path)).digest('hex')!==c.publishedImageSha256)throw Error('Image bytes changed '+c.id);
 c.generalCardIntegration='local_integrated_and_reopened';c.reopenedEvidence='output/playwright/unit-audit/u04-general-final-ui.txt';
}
writeFileSync(root+'LV1-U04-original-image-review.json',JSON.stringify(art,null,2)+'\n');
const ids=[...new Set(source.flatMap(c=>c.examples.map(e=>e.exampleId)))];
const badClozes=source.flatMap(c=>c.examples).filter(e=>e.blankSentence.replace(/_+/g,e.answer)!==e.sentenceEn).map(e=>e.exampleId);
if(badClozes.length)throw Error('Cloze failure '+badClozes.join(','));
const saved=cli('output/playwright/unit-audit/saved-content-verification-u04-full.txt');
if(saved.failures.length||!saved.expectedContentHash)throw Error('Saved values differ');
const ledger={unit:'LV1-U04',checkpointAt:new Date().toISOString(),branch:'content/unit-audit-20261105',
 priorCheckpoint:'a0102dde197b6baabc26a23666736464d05f0f25',baseCommit:'29cfc684d7a11b07f09988c478d30358830f1951',
 counts:{retainedSourceCards:36,publishedUnitCardsOpenedAndViewed:5,rawPairsPixelChecked:36,existingGeneralImagesPixelChecked:19,
  distinctGeneralWordsReopenedAfterChange:36,formalExamplesChecked:ids.length,clozeFailures:0,examplePosFixed:6,
  exampleDraftReviewed:7,exampleNeedsCheckReviewed:5,senseNeedsCheckReviewed:9,senseDraftReviewed:1,wordNeedsCheckReviewed:1,
  wordDefinitionRepairs:9,missingGeneralImagesFilled:17,generalPairingsRepaired:2,newLocalWebpAssets:19,remainingMissingGeneralImages:0,
  unpublishedUnitPairsStillUnpublished:31},
 cards:art.cards.map(c=>({...c,publishedUnitAfter:unit.find(u=>u.id===c.id)??null,generalAfter:general.find(g=>g.id===c.id),
  wholeDictionaryWordState:'not_automatically_promoted_by_image_pass',originalWordStatus:source.find(s=>s.id===c.id).wordData.status})),
 savedContentVerification:saved,isolatedProgressVerification:cli('output/playwright/unit-audit/u04-content-load.txt'),
 retainedIssues:[
  {type:'source_mapping',id:'LV1-U04-03',details:'原稿word_id為NOID；採App既有已發布映射W000863對到television/tv，保留原稿NOID作來源紀錄，不虛構新ID。'},
  {type:'abbreviation_gloss_contamination',id:'LV1-U04-03',state:'learner_gloss_fixed_source_cause_unresolved',details:'依本詞英英解釋、全部五例與Merriam的電視義，移除非television的轉移向量混入；未宣稱已查明原匯入混入過程。'},
  {type:'rare_valid_meaning',id:'LV1-U04-06',state:'retained_with_primary_source',evidence:'https://www.collinsdictionary.com/dictionary/english/clock',details:'Collins British English2與American English2均收錄襪側織繡飾紋義，保留，沒有因罕見刪掉。'},
  {type:'proper_name',id:'LV1-U04-10',details:'nice形容詞義置前，原城市內容標為大寫專名Nice並保留，整詞draft不提升；原來源混入原因未定。'},
  {type:'classification_boundary',words:['hundred','thousand'],details:'數詞、名詞／形容詞的教材分類慣例尚需對照完整詞表，沒有只因字尾或名詞前位置就擅改。'},
  {type:'unexpanded_dictionary_coverage',words:['take','time','will','can','green'],details:'補回現有例句／義項所用英英解釋；原詞頭官方POS範圍、未拆義與原draft摘要不因這次圖片通過自動提升。'},
  {type:'structured_verb_forms',details:'尚未收錄的結構化三態仍保留明確待處理，不猜填。'},
  {type:'draft_unit_boundary',details:'31份未發布教材原稿維持未發布；19組只修本地一般卡圖句，未增加群組或教材單元入口。'}
 ],
 next:{unit:'LV1-U05',sourceCards:32,publishedImageSubset:13,id:'LV1-U05-01',word:'give'},
 publication:{commit:'next authorized local checkpoint; resolve exact SHA using git log for this ledger',push:false,merge:false,deploy:false}};
writeFileSync(root+'LV1-U04-ledger.json',JSON.stringify(ledger,null,2)+'\n');
copyFileSync('output/unit-audit-20261105/receipts/LV1-U04-patches.json',root+'receipts/LV1-U04-patches.json');
const u3=read(root+'LV1-U03-ledger.json');u3.publication.commit=ledger.priorCheckpoint;writeFileSync(root+'LV1-U03-ledger.json',JSON.stringify(u3,null,2)+'\n');
const master=read(root+'MASTER-INVENTORY.json'),u4=master.units.find(u=>u.key==='7000.ivy.LV1.4');
for(const c of u4.items)c.auditState='actual_unit_and_general_card_checked_see_LV1-U04-ledger';
for(const c of u4.retainedLV1Drafts)c.auditState='original_pixels_reviewed_and_general_card_reopened_not_whole_word_pass';
u4.unitComprehensiveState='checkpoint_with_explicit_unresolved_items_see_unit_ledger';master.next=ledger.next;
writeFileSync(root+'MASTER-INVENTORY.json',JSON.stringify(master,null,2)+'\n');
let progress=readFileSync(root+'PROGRESS.md','utf8');
progress=progress.replace(/\n## LV1 Unit 04 checkpoint[\s\S]*$/,'');
progress=progress.replace(/## 下一張\n\n[\s\S]*$/,'## 上一 checkpoint 位置\n\nU03的原始下一卡為U04-01；最新位置見下列U04 checkpoint。\n');
progress+=`\n## LV1 Unit 04 checkpoint\n\n完整原稿36張，已發布子集5張，36張原稿與19張既有一般卡圖片均已實際目視。修正後重新開啟36張一般卡及5張單元卡，198原例句／英中翻譯、英英解釋及填空均零差異。17張實際缺圖已補，else水果選擇圖配會議遲到句、red紅色畫筆角色配派對紅洋裝句兩組已修成原稿的完整圖句；19組新資產路徑與中英圖說重開全符合。原圖與原例句保留，31未發布教材原稿維持未發布。\n\n38筆實際列修正：6筆明確詞性錯置、7筆draft與5筆needs_check例句、9筆needs_check與1筆draft義項、for整詞needs_check，以及9筆字義欄位修復。for含兩個for的例句填空是第一個for lunch，保留prep.；clock襪側繡花真義保留，沒有因罕見刪除。television原稿NOID使用既有W000863映射，移除非本詞電視義的轉移向量混入，完整舊列可還原；未虛構編號。累計129改列已在完整字典唯讀重讀符合，14進度表仍完全相同。\n\n測試原4檔16過1失敗已定位為目視證據描述字串格式；統一真實紀錄格式並保留原actually viewed original斷言後針對性重跑，結果見validation/u04-art-final-test.txt，原失敗證據保留。其他3檔15項已通過；lint與build通過。未宣稱完整suite通過。\n\n可回復的前一提交：a0102dde197b6baabc26a23666736464d05f0f25（U01–U03，71檔）。U04完整before/after、逐卡目視與重開證據在LV1-U04-patches.json、receipts/、LV1-U04-original-image-review.json與LV1-U04-ledger.json。sun與elephant舊限制保持未完成。\n\n下一張：LV1-U05-01 give；完整原稿32張、已發布子集13張。其他未檢卡仍not_checked。\n`;
writeFileSync(root+'PROGRESS.md',progress);
mkdirSync(root+'validation',{recursive:true});
const logs={};
for(const suffix of ['regression','art-final-test','build','lint']){
 const path=`output/unit-audit-20261105/u04-${suffix}.log`,raw=readFileSync(path);
 logs[suffix]={rawPath:path,rawSha256:createHash('sha256').update(raw).digest('hex')};
 writeFileSync(root+`validation/u04-${suffix}.txt`,raw.toString('utf8').replace(/\r\n/g,'\n').split('\n').map(l=>l.trimEnd()).join('\n').trimEnd()+'\n');
}
writeFileSync(root+'validation/u04-saved-content.json',JSON.stringify({savedContent:saved,progress:ledger.isolatedProgressVerification,
 logEvidence:logs,firstRegression:'3 files /15 tests passed; new registry proof prose mismatch caused 1 failure and is retained',
 failureResolution:'canonical actual pixel-review record restored to existing actually viewed original format; image hashes and unchanged-content baseline assertions retained',
 finalRegistry:'see u04-art-final-test.txt; only report passed after command completion',fullSuite:'not_completed'},null,2)+'\n');
console.log(JSON.stringify(ledger.counts));
