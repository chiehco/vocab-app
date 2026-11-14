import {readFileSync,writeFileSync,copyFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const read=p=>JSON.parse(readFileSync(p,'utf8')),write=(p,v)=>writeFileSync(p,JSON.stringify(v,null,2)+'\n');
const cli=p=>JSON.parse(readFileSync(p,'utf8').split('### Result')[1].split('### Ran Playwright code')[0].trim());
const root='docs/unit-audit-20261105/',source=read('output/unit-audit-20261105/LV1-U06-full-source.json');
const after=cli('output/playwright/unit-audit/u06-general-final-ui.txt'),unit=cli('output/playwright/unit-audit/u06-published-before-ui.txt');
const saved=cli('output/playwright/unit-audit/saved-content-verification-u06-full.txt'),progress=cli('output/playwright/unit-audit/u06-content-load.txt');
const art=read(root+'LV1-U06-original-image-review.json'),patches=read(root+'LV1-U06-patches.json').patches;
const registry=read('src/features/vocabulary/auditedWordIllustrations.json').filter(c=>c.reviewId.startsWith('LV1-U06-'));
if(source.length!==51||after.length!==47||unit.length!==23||registry.length!==12||saved.rowsChecked!==445||saved.failures.length||!saved.expectedContentHash||!progress.progressUnchanged)throw Error('Scope/persistence failure');
for(const c of after)if(c.mismatches.length||!c.definitionMatches||!c.imageInfo.length||c.imageInfo.some(i=>!i.complete||!i.width))throw Error('Incomplete reopen '+c.id);
for(const c of unit)if(!c.images.length||c.images.some(i=>!i.complete||!i.width))throw Error('Unit image failed '+c.id);
for(const c of art.cards){if(!c.generalCardRepair)continue;
 const pair=registry.find(r=>r.reviewId===c.id),actual=after.find(r=>r.id===c.id);
 if(!actual.hero.includes(pair.illustration.captionEn)||!actual.hero.includes(pair.illustration.captionZh)||!actual.imageInfo.some(i=>i.src.includes(pair.illustration.path)))throw Error('Wrong pair '+c.id);
 if(createHash('sha256').update(readFileSync('public/'+pair.illustration.path)).digest('hex')!==c.publishedImageSha256)throw Error('Changed bytes '+c.id);
 c.generalCardIntegration='local_integrated_and_reopened';c.finalUiScreenshot=actual.heroScreenshot;c.pixelReviewOfFinalUi='actually viewed real reopened screenshot in labeled four-card contact sheet';
}
write(root+'LV1-U06-original-image-review.json',art);
const formal=[...new Map(source.flatMap(c=>c.examples).map(e=>[e.exampleId,e])).values()];
if(formal.length!==237||formal.some(e=>e.blankSentence.replace(/_+/g,e.answer)!==e.sentenceEn))throw Error('Cloze failure');
const nextSource=read('output/unit-audit-20261105/LV1-U07-full-source.json'),next={unit:'LV1-U07',id:nextSource[0].id,word:nextSource[0].word,sourcePairs:93,publishedSubset:37};
const ledger={unit:'LV1-U06',checkpointAt:new Date().toISOString(),branch:'content/unit-audit-20261105',priorPublicCheckpoint:'af165704178eb5b3b5bd453af3c3f42da07a6445',baseCommit:'29cfc684d7a11b07f09988c478d30358830f1951',
 counts:{retainedSourcePairs:51,publishedUnitCardsActuallyOpened:23,originalPixelsActuallyViewed:51,existingGeneralImagesPixelsActuallyViewed:37,
  generalWordsReopened:47,formalExamplesChecked:237,clozeFailures:0,changedRows:194,singleExamplePosErrorsFixed:7,compositePosClarified:121,
  draftExamplesReviewedAfterCheck:10,needsCheckSensesReviewedAfterCheck:36,wordDefinitionOrUsageRowsRepaired:20,
  missingGeneralImagesFilled:10,generalImageCaptionPairingsRepaired:2,newWebpAssets:12,remainingMissingGeneralImages:0,
  noOfficialDictionaryIdentity:4,unpublishedSourcePairsRemainUnpublished:28},
 cards:art.cards.map(c=>({...c,generalAfter:after.find(a=>a.id===c.id)??null,publishedUnitUi:unit.find(a=>a.id===c.id)??null,wholeWordState:'not_automatically_promoted_by_image_or_single_sense_review'})),
 savedContentVerification:saved,progressVerification:progress,
 retainedIssues:[
  {ids:['LV1-U06-31','LV1-U06-34','LV1-U06-47','LV1-U06-49'],type:'no_formal_identity',details:'pointless, queue, tried and moving remain existing source/supplemental forms without a source-to-dictionary ID. Original pairs were checked; no new official IDs created.'},
  {ids:['LV1-U06-10','LV1-U06-20'],type:'visual_simplification',details:'School building appears behind walking students; direction at a path fork depends on viewpoint. Core contexts agree; original sentences are not rewritten.'},
  {id:'LV1-U06-40',type:'visual_simplification',details:'Fishing boats/coastal village support the seafood-region context. Image alone cannot prove fame or flavor; no contradictory content found.'},
  {words:['part'],type:'unverified_exam_source',state:'draft_sense_retained',details:'Current example grammar and meaning were checked. The inherited GSAT106 Q38 source assertion was not independently checked, so the draft sense is not promoted.'},
  {words:['move','movement'],type:'source_scope',state:'word_status_retained',details:'movement is a noun, and its erroneous move-verb English definition and example POS are corrected. Original needs_check/draft whole-word statuses and unsplit/source-summary questions remain explicit.'},
  {words:['most','least','housewife','while','viewpoint','inside','outside','waterfall'],type:'original_word_drafts',state:'retained',details:'Image/caption checks and supported field repairs do not certify every pronunciation, family or imported source field.'},
  {type:'phrase_internal_pos',details:'Target case in in case and course in of course follow the existing noun-target convention, separate from labeling an entire conjunction/adverb phrase.'},
  {type:'principal_parts',state:'not_guessed',details:'Existing approved house forms retained. Other missing structured inflections remain pending a reliable source.'}
 ],
 verification:{relatedTests:'5 files /22 passed before the additional CI helper extension',ciProtection:'3 files /8 passed after exact historical starter/full-file reversal and negative tests',
  pythonBoundary:'5 passed',build:'passed; existing large-chunk warning',finalTypecheck:'see validation/u06-final-typecheck.txt',finalLint:'see validation/u06-final-lint.txt',fullCi:'pending_next_pushed_checkpoint'},
 imageFollowups:{sun:'U02 repaired and reopened, see LV1-U02-sunrise-review.json',elephant:'U02 repaired and reopened, see LV1-U02-elephant-review.json'},next,
 publication:{state:'verified_local_checkpoint_ready_for_authorized_non_main_push',merge:false,deploy:false}};
if(patches.length!==194)throw Error('Unexpected patch list');write(root+'LV1-U06-ledger.json',ledger);
copyFileSync('output/unit-audit-20261105/receipts/LV1-U06-patches.json',root+'receipts/LV1-U06-patches.json');
const master=read(root+'MASTER-INVENTORY.json'),u6=master.units.find(u=>u.key==='7000.ivy.LV1.6');
for(const c of u6.items)c.auditState='actual_unit_opened_and_original_pixels_checked_see_LV1-U06-ledger';
for(const c of u6.retainedLV1Drafts)c.auditState=c.officialWordId==='NOID'?'source_pair_checked_no_official_dictionary_identity':'source_pair_and_general_card_checked_not_whole_word_pass';
u6.unitComprehensiveState='checkpoint_with_explicit_unresolved_items';master.next=next;write(root+'MASTER-INVENTORY.json',master);
let report=readFileSync(root+'PROGRESS.md','utf8').replace(/\n## LV1 Unit 06 checkpoint[\s\S]*$/,'');
report=report.replace(/\n## 目前狀態[\s\S]*?(?=\n## )/,
 `\n## 目前狀態\n\n更新：${new Date().toISOString()}。U01–U06已完成各自檢查checkpoint並保留明確未決欄位；U06本輪51組原稿全部實看，47張正式詞卡與237筆例句重新開啟，10缺圖與2組配對已修。194列修改及累計445改列已從實際資料庫驗證。現在下一張為${next.id} ${next.word}；U07完整原稿93組、已發布子集37組，尚未因獨立子集複核而標全單元通過。\n\nU02 sun與elephant兩項圖片修復均已於2026-11-05完成，原圖保留、原句不變，單元卡與一般卡均重新開啟並目視。前段舊限制已解決，詳見各自review檔。最近已推送並核實遠端SHA為af165704178eb5b3b5bd453af3c3f42da07a6445；本次U06等待checkpoint推送及完整CI。未合併或部署。\n`);
report=report.replace('elephant替換圖仍未完成。','elephant也已於2026-11-05接入並重開驗證完成。').replace('本機圖片編輯未成功，替換圖尚未完成。','當時本機圖片編輯未成功；2026-11-05已接入修復圖並重開驗證完成。');
report+=`\n## LV1 Unit 06 checkpoint\n\n完整原稿51組、已發布23組、47正式詞條與237例句。原圖51張與原一般卡37張均逐張實際目視；47一般卡修改後全數重開、內容與圖片皆符合，12張最終修圖卡截圖另已目視。10張一般卡缺圖已補，follow的跟隨人物圖配遵循指示句、line的排隊圖配店家沿街排列句已改用原稿精確圖句；所有正式例句保留，其他例句不自動標為已配圖。\n\n194筆列修改包含7筆單一詞性錯誤、121筆複合詞性精準化、10筆draft例句與36筆needs_check義項完成核對後更新，以及20筆字義／用法列修復。least的截斷英英解釋、while錯誤的to V模板、movement混入move動詞解釋均已修。名詞feel、hold、keep及動詞case有詞典支持，保留，不因罕見刪除。4項NOID與28份未發布教材原稿界線保留。\n\n累計445改列與內容hash實際讀回符合，14進度表不變。相關22測試與Python5負向測試、build通過；另完整CI揭露的兩個既有固定hash測試已按精確patch反向還原修復，舊fixtures未改，兩個原失敗測試加starter保護負向測試共8項通過。最後typecheck/lint見validation，完整CI須待此checkpoint推送後確認。\n\n本輪同時完成U02 elephant替換圖的hash、尺寸、像素及雙入口重開，38組U02圖句均核心一致；這不代表所有詞條義項自動通過。前checkpoint為af165704178eb5b3b5bd453af3c3f42da07a6445。下一張：${next.id} ${next.word}。\n`;
writeFileSync(root+'PROGRESS.md',report);
const logs={};for(const name of ['u06-regression','u06-build','u06-final-typecheck','u06-final-lint','u06-write-boundary-python','ci-protection-before','ci-protection-final','ci-protection-verified']){
 const rawPath=`output/unit-audit-20261105/${name}.log`,raw=readFileSync(rawPath);logs[name]={rawSha256:createHash('sha256').update(raw).digest('hex')};
 writeFileSync(root+`validation/${name}.txt`,raw.toString('utf8').replace(/\r\n/g,'\n').split('\n').map(l=>l.trimEnd()).join('\n').trimEnd()+'\n');
}
write(root+'validation/u06-saved-content.json',{saved,progress,logs,originalCi:{checkpoint:ledger.priorPublicCheckpoint,testFiles:{passed:207,failed:2},tests:{passed:1649,failed:2},source:'https://github.com/chiehco/vocab-app/actions/runs/41975278449/job/127072552113'},
 resolution:'Both fixed baseline files retained. Exact authorized columns reversed; starter metadata checked against current saved rows then only three old metadata fields restored. Initial added negative-test serializer used locale sorting; corrected to the original key-sort convention. Unlisted columns/rows remain protected.',fullCi:'pending_next_checkpoint'});
console.log(JSON.stringify({counts:ledger.counts,next}));
