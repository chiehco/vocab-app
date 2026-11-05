import {readFileSync,writeFileSync,copyFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const write=(p,v)=>writeFileSync(p,JSON.stringify(v,null,2)+'\n');
const cli=p=>JSON.parse(readFileSync(p,'utf8').split('### Result')[1].split('### Ran Playwright code')[0].trim());
const root='docs/unit-audit-20261105/';
const source=read('output/unit-audit-20261105/LV1-U05-full-source.json');
const before=read('output/unit-audit-20261105/U05-ui-before.json');
const after=cli('output/playwright/unit-audit/u05-general-final-ui.txt');
const unit=cli('output/playwright/unit-audit/u05-published-before-ui.txt');
const saved=cli('output/playwright/unit-audit/saved-content-verification-u05-full.txt');
const progress=cli('output/playwright/unit-audit/u05-content-stable-check.txt');
const proof=read(root+'LV1-U05-original-image-review.json');
const registry=read('src/features/vocabulary/auditedWordIllustrations.json').filter(c=>c.reviewId.startsWith('LV1-U05-'));
if(source.length!==32||before.length!==30||after.length!==30||unit.length!==13||registry.length!==4)throw Error('Scope mismatch');
if(saved.rowsChecked!==251||saved.failures.length||!saved.expectedContentHash||!progress.progressUnchanged)throw Error('Persistence/progress check failed');
for(const c of after)if(c.mismatches.length||!c.definitionMatches||!c.imageInfo.length||c.imageInfo.some(i=>!i.complete||!i.width))throw Error('Incomplete reopen '+c.id);
for(const c of unit)if(!c.images.length||c.images.some(i=>!i.complete||!i.width))throw Error('Unit image failed '+c.id);
for(const c of proof.cards){
 if(!c.generalCardRepair)continue;
 const pair=registry.find(r=>r.reviewId===c.id),actual=after.find(r=>r.id===c.id);
 if(!actual.hero.includes(pair.illustration.captionEn)||!actual.hero.includes(pair.illustration.captionZh)||!actual.imageInfo.some(i=>i.src.includes(pair.illustration.path)))throw Error('Wrong pair '+c.id);
 if(createHash('sha256').update(readFileSync('public/'+pair.illustration.path)).digest('hex')!==c.publishedImageSha256)throw Error('Asset changed '+c.id);
 c.generalCardIntegration='local_integrated_and_reopened';c.finalUiScreenshot=actual.heroScreenshot;c.agentViewedFinalRepairedScreenshot=true;
}
write(root+'LV1-U05-original-image-review.json',proof);
const formal=[...new Map(source.flatMap(c=>c.examples).map(e=>[e.exampleId,e])).values()];
if(formal.length!==171||formal.some(e=>e.blankSentence.replace(/_+/g,e.answer)!==e.sentenceEn))throw Error('Cloze scope/failure');
const ledger={unit:'LV1-U05',checkpointAt:new Date().toISOString(),branch:'content/unit-audit-20261105',
 priorPublicCheckpoint:'47958136d6df58dfbe9435ce5e666a1c98caa15d',baseCommit:'29cfc684d7a11b07f09988c478d30358830f1951',
 counts:{retainedSourcePairs:32,publishedUnitCardsOpened:13,originalPairsPixelsActuallyViewed:32,existingGeneralImagesPixelsActuallyViewed:27,
  officialGeneralCardsReopened:30,formalExamplesChecked:171,clozeFailures:0,singlePosErrorsCorrected:4,compositeExamplePosClarified:74,
  meaningHintsClarified:78,draftExamplesReviewedAfterCheck:10,needsCheckSensesReviewedAfterCheck:23,wordDefinitionsRepaired:11,
  changedRows:122,missingGeneralImagesFilled:3,generalImageCaptionMismatchesRepaired:1,remainingMissingGeneralImages:0,
  noOfficialDictionaryCard:2,unpublishedSourcePairsRemainUnpublished:19},
 cards:proof.cards.map(c=>({...c,publishedUnitUi:unit.find(u=>u.id===c.id)??null,generalAfter:after.find(a=>a.id===c.id)??null,
  wholeWordState:'not_automatically_promoted_by_image_or_single_sense_review'})),
 savedContentVerification:saved,progressVerification:progress,
 retainedIssues:[
  {ids:['LV1-U05-09','LV1-U05-21'],type:'no_official_dictionary_identity',state:'not_invented',details:'useless remains an unpublished production draft. coworker is a published supplemental image/caption item and was opened in its unit; neither has an existing formal dictionary row.'},
  {id:'LV1-U05-05',type:'visual_simplification',details:'Direction-giving is clear; the shelter has no explicit bus or stop sign. No contradictory route is shown; no sentence change or unnecessary redraw.'},
  {id:'LV1-U05-06',type:'exam_evidence',state:'draft_sense_retained',details:'The even-out sentence meaning and verb are checked. The inherited sense claim of GSAT112 cloze Q23 is not independently verified, so that sense remains draft.'},
  {words:['give','still'],type:'source_summary_and_official_pos_scope',details:'Valid uncommon source glosses are retained. give elasticity/adaptability and still distillation-room/cinema-still source provenance and official headword POS coverage need separate source verification; no whole-word pass is claimed.'},
  {words:['own','another'],type:'phrase_classification_boundary',details:'of/on ones own and reciprocal one another retain their composite source POS pending the project convention for phrase-internal target labels.'},
  {words:['about','useful','like','own','between','another','all'],type:'original_word_drafts',state:'retained',details:'Image and sentence checks do not automatically certify every source-summary field, family or pronunciation field.'},
  {type:'structured_verb_forms',state:'not_filled',details:'Missing structured principal parts remain explicit; no guessed inflections inserted.'},
  {id:'LV1-U05-26',type:'separate_caption_and_example',details:'The newly installed original image/caption says puppy sitting. The distinct formal example says puppy standing; it is retained in the meaning tab and is not marked as paired to that image.'},
  {id:'LV1-U05-27',type:'other_example_retention',details:'The eating-food image now has the exact authored school-breakfast caption. The rust/eaten-away example remains unchanged in the meaning tab; it is not marked as illustrated.'}
 ],
 validation:{relatedVitest:'5 files, 21 tests passed',pythonWriteBoundary:'5 negative tests passed in the prior checkpoint; validator unchanged',lint:'passed',build:'passed; existing large-chunk warning',fullSuite:'not_completed',
  initialContentLoad:'Execution context destroyed by navigation; no success inferred. Actual 251 saved rows and contentHash were checked before an idempotent stable-content/progress check, which succeeded. Original error retained.'},
 next:{unit:'LV1-U06',id:'LV1-U06-01',word:'morning',sourcePairs:51,publishedSubset:23},
 publication:{state:'verified_local_checkpoint_ready_for_authorized_non_main_push',merge:false,deploy:false}};
// Preserve the real next headword rather than guessing from the unit number.
const next=read('output/unit-audit-20261105/LV1-U06-full-source.json')[0];ledger.next.word=next.word;
write(root+'LV1-U05-ledger.json',ledger);
copyFileSync('output/unit-audit-20261105/receipts/LV1-U05-patches.json',root+'receipts/LV1-U05-patches.json');
const master=read(root+'MASTER-INVENTORY.json'),u5=master.units.find(u=>u.key==='7000.ivy.LV1.5');
for(const c of u5.items)c.auditState='actual_unit_opened_and_original_pixels_checked_see_LV1-U05-ledger';
for(const c of u5.retainedLV1Drafts)c.auditState=c.officialWordId==='NOID'?'source_pair_checked_no_official_dictionary_identity':'source_pair_and_general_card_checked_not_whole_word_pass';
u5.unitComprehensiveState='checkpoint_with_explicit_unresolved_items';master.next=ledger.next;
master.runtimeItemKinds=Object.fromEntries(['published_image_pair','vocabulary','grammar'].map(k=>[k,master.units.flatMap(u=>u.items).filter(i=>i.kind===k).length]));
write(root+'MASTER-INVENTORY.json',master);
const u4=read(root+'LV1-U04-ledger.json');u4.publication={...u4.publication,commit:ledger.priorPublicCheckpoint,push:true,remoteBranch:'content/unit-audit-20261105',remoteShaVerified:ledger.priorPublicCheckpoint};write(root+'LV1-U04-ledger.json',u4);
let report=readFileSync(root+'PROGRESS.md','utf8').replace(/\n## LV1 Unit 05 checkpoint[\s\S]*$/,'');
report+=`\n## LV1 Unit 05 checkpoint\n\n完整原稿32組、已發布13組；32張原始圖片與27張既有一般卡圖片已逐張實際目視，13張單元卡實際開啟，30個有正式ID的一般詞卡修改後重新開啟，171筆例句／翻譯／填空核對零差異。3張一般卡缺圖（worker、sorry、tell）已補，eat的吃飯圖配腐蝕例句已修為原稿的上學途中早餐圖句，原腐蝕例句保留。4張最終重開截圖均已目視。19份未發布教材原稿仍未發布；useless與coworker沒有正式字庫ID，分開記錄，未造號。\n\n122筆列修改：4個明確單一詞性錯誤（live concert、keep still、feel well、a cold drink），另74個複合標記精準化及78筆用法提示、10筆draft例句與23筆needs_check義項核對後更新、11筆文字定義修復。所有原例句保持原意與原字串，詞頭多詞性不縮減；greats及real find名詞義均有詞典支持，保留。even既有考題來源聲稱未核實，該義項draft保留。\n\n30張一般卡重開後圖片皆可顯示；累計251改列與內容hash從實際IndexedDB讀回全相符。第一次載入檢查因頁面導覽中斷，未推定成功；先核對實際保存內容，再作穩定的冪等檢查，14進度表完全不變。相關5檔21測試、lint、build通過；未宣稱全套suite通過。\n\n前次對外checkpoint：47958136d6df58dfbe9435ce5e666a1c98caa15d，已核實遠端獨立分支同SHA，含U01–U04與sun修復。U05實際before/after與重開證據見本單元ledger、patches、receipt及validation。下一張：${ledger.next.id} ${ledger.next.word}，完整原稿51組、已發布子集23組。\n\n全App的19,726為教材項目盤點：13,101個vocabulary項目、5,899個grammar項目、726組已發布LV1圖句。它不是已核實字卡總數，亦不代表均已檢查；未檢項目仍not_checked。\n`;
writeFileSync(root+'PROGRESS.md',report);
const logs={};for(const suffix of ['regression','lint','build']){
 const rawPath=`output/unit-audit-20261105/u05-${suffix}.log`,raw=readFileSync(rawPath);
 logs[suffix]={rawSha256:createHash('sha256').update(raw).digest('hex')};
 writeFileSync(root+`validation/u05-${suffix}.txt`,raw.toString('utf8').replace(/\r\n/g,'\n').split('\n').map(l=>l.trimEnd()).join('\n').trimEnd()+'\n');
}
writeFileSync(root+'validation/u05-initial-content-load.txt',readFileSync('output/playwright/unit-audit/u05-content-load.txt','utf8'));
write(root+'validation/u05-saved-content.json',{saved,progress,logs,fullSuite:'not_completed'});
console.log(JSON.stringify({counts:ledger.counts,next:ledger.next}));
