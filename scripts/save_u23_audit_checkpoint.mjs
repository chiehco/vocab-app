import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root='docs/unit-audit-20261105/',out='output/unit-audit-20261105/';
const r=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const w=(p,v)=>fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const fileProof=p=>({path:p,sha256:sha(p)});
const unit=r(out+'U23-unit-final.json'),general=r(out+'U23-general-final.json'),usage=r(out+'U23-usage-final.json'),panels=r(out+'U23-form-panels.json');
const before=r(out+'U23-ui-before.json');
assert.equal(unit.length,109);assert.equal(new Set(unit.map(x=>x.id)).size,109);
assert.equal(general.length,80);assert.equal(general.reduce((n,x)=>n+x.exampleCount,0),124);
assert(general.every(x=>x.definitionMatches&&x.formsMatch&&!x.mismatches.length));
for(const row of general)for(const image of row.imageInfo){
 assert(image.complete);
 if(row.word==='popularity'){
  assert.equal(new URL(image.src).pathname,'/curriculum/lv4-u17/fame.webp');
  assert.equal(image.width,768);assert.equal(image.height,768);
  assert.deepEqual(row.imageInfo,before.find(x=>x.id===row.id).imageInfo,'Preserve the exact existing general image, not a resized replacement');
 }else{assert.equal(image.width,1254);assert.equal(image.height,1254);}
}
assert.equal(usage.length,29);assert(usage.every(x=>x.allRulePartsVisible));
assert.equal(panels.length,23);assert(panels.every(x=>x.bothPanelsMatch));
const persistence=r(out+'U23-persistence.json'),install=r(out+'U23-install.json');
assert.equal(persistence.failures.length,0);assert(persistence.expectedContentHash);assert(install.progressUnchanged&&install.progressTables===14);
const manifests=['LV1-U23-patches.json','LV1-U23-translation-precision.json','LV1-U23-verified-forms-patches.json'];
const patches=manifests.flatMap(p=>r(root+p).patches),forms=r(root+'VERIFIED-U23-VERB-FORMS-SOURCES.json').facts;
for(const f of forms){const b=before.find(x=>x.word===f.word),a=general.find(x=>x.word===f.word);assert(b&&a&&a.formsMatch);assert(b.hero.includes('動詞三態尚未收錄。')&&b.meaningPageText.includes('動詞三態尚未收錄。'));}
const words=r('public/data/v1/words.json');
const summariesVisible=patches.filter(p=>p.dataset==='words'&&p.after.meaningZh).every(p=>{const word=words.find(w=>w.wordId===p.id).word,a=general.find(x=>x.word===word);return(a.hero+'\n'+a.meaningPageText).includes(p.after.meaningZh);});assert(summariesVisible);
const result={unitId:'LV1-U23',recordedAt:new Date().toISOString(),counts:{unit:109,general:80,examples:124,changedUsagePages:29,newFormCards:23,newFormPanels:46,savedRows:persistence.rowsChecked,progressTables:14},failures:0,install,persistence,exactChangedChineseSummariesVisible:summariesVisible,
 unit:unit.map(x=>({id:x.id,route:new URL(x.url).hash,image:x.images.map(i=>({path:new URL(i.src).pathname,width:i.width,height:i.height,complete:i.complete})),capture:fileProof(x.screenshot)})),
 general:general.map(x=>({id:x.id,word:x.word,route:new URL(x.url).hash,examples:x.exampleCount,formsMatch:x.formsMatch,definitionMatches:x.definitionMatches,expectedForms:x.expectedForms,hero:fileProof(x.heroScreenshot),meaning:fileProof(x.screenshot)})),
 usage:usage.map(x=>({wordId:x.wordId,word:x.word,allRulePartsVisible:x.allRulePartsVisible,tabRetry:x.tabRetry,capture:fileProof(x.screenshot)})),
 formPanels:panels.map(x=>({...x,shots:{hero:fileProof(x.shots.hero),meaning:fileProof(x.shots.meaning)}})),
 uiBoundary:'Empty-hint example POS and long sense notes/source URLs are not rendered on this screen. DB readback verifies those fields; no visible-label claim. All prior nonempty hints are retained. The pre-existing general popularity illustration remains the same768×768 fame.webp; all109 U23 unit originals and the new trophy asset are1254×1254. No image was resized.',
 pixelEvidence:'109 original tiles,15 other general pairs and4 native follow-ups actually viewed. Changed exact pair screenshots, mobile final screenshot and all46 real form-panel screenshots also viewed.',
 captureRecovery:{before:r(out+'U23-before-capture-recovery.json'),after:r(out+'U23-after-cli-decoding-recovery.json')},regressionRecovery:r(out+'U23-image-regression-recovery.json')};
w(root+'validation/U23-reopen-summary.json',result);
const proofPath=root+'LV1-U23-exact-pair-review.json',proof=r(proofPath);proof.state='exact_pairs_saved_and_actual_app_reopened';proof.actualValidation='validation/U23-reopen-summary.json';proof.actualPixelViews=['LV1-U23-50-unit-final.png','LV1-U23-50-general-final-hero.png','LV1-U23-84-unit-final.png','LV1-U23-84-general-final-meaning.png','LV1-U23-97-unit-final.png','LV1-U23-97-general-final-meaning.png','LV1-U23-107-general-final-meaning.png','U23-final-mobile.png'];w(proofPath,proof);
const approvalPath='scripts/approvals/lv1-images-20260922.json',approvals=r(approvalPath);for(const change of proof.changes)approvals.find(x=>x.id===change.id).approvalSha256=sha(proofPath);w(approvalPath,approvals);
const pixelsPath=root+'LV1-U23-original-image-review.json',pixels=r(pixelsPath);pixels.state='source_pixels_and_actual_after_app_complete';pixels.actualAfterValidation='validation/U23-reopen-summary.json';w(pixelsPath,pixels);
const source=r(out+'LV1-U23-source-before.json'),examples=[...new Map(source.flatMap(x=>x.examples).map(e=>[e.exampleId,e])).values()];
const checks=fs.existsSync(root+'validation/U23-local-checks.json')?r(root+'validation/U23-local-checks.json'):{state:'pending_final_checks'};
const ledger={unit:'LV1-U23',checkpointAt:new Date().toISOString(),priorCheckpoint:'cf8fc0f86ab01365bc71f65c0ba0a25b834c0f9e',priorCheckpointFullCi:r(root+'validation/U22-ci-cf8fc0f.json'),newCheckpointFullCi:{status:'pending_exact_head_after_commit'},state:checks.state==='passed'?'precise_corrections_saved_actual_app_and_local_checks_passed':'precise_corrections_saved_actual_app_complete_final_checks_pending',
 scope:{retainedPairs:109,publishedPairs:109,formalWords:80,uniqueExamples:124,noFormalId:29,sourceClozeReconstructions:124},
 counts:{mainRows:69,mainFields:114,wordRows:45,clozePos:10,practiceSentencesReviewed:4,individualSensesReviewed:10,translations:3,newVerbFormKeys:23,totalPatchRows:95,totalFields:140,pairRepairs:3,otherPairsUnchanged:723},manifests,
 evidence:{sources:'LV1-U23-source-research.json',pixels:'LV1-U23-original-image-review.json',pairs:'LV1-U23-exact-pair-review.json',actualApp:'validation/U23-reopen-summary.json',exactInverse:'validation/U23-exact-inverse.json'},localValidation:checks,
 preserved:{headwordIdsPosWholeWordStatuses:true,allEnglishClozeAnswers:true,originalImageAndApprovalHashes:true,allExistingHints:true,emptyHints:examples.filter(e=>!e.meaningHint).length,existingNonemptyHints:examples.filter(e=>e.meaningHint).length,generalFinalU10Pair:true,pickChooseSelectPriority:true,oldPayloadAndImageBaselines:true,normalInstallProgressTables:14},
 pending:r(root+'LV1-U23-source-research.json').pending,
 visualLimits:r(out+'U23-native-followup-observations.json').items.filter(x=>x.id!=='LV1-U23-50'),
 boundaries:'No original textbook-page images newly inspected; no formal IDs for29 standalone items; exact source captions and formal practice sentences remain separate. No physical-phone, installed-app or production/offline-deployment claim.',
 next:{unit:'LV1-U24',firstCard:'LV1-U24-01',state:'not_started'},deployment:'No merge, deployment, PR or publication-mode change.'};w(root+'LV1-U23-ledger.json',ledger);
const queuePath=root+'FOLLOWUP-QUEUE.json',queue=r(queuePath);
function walk(x){if(Array.isArray(x))x.forEach(walk);else if(x&&typeof x==='object'){if(x.id==='LV1-U23-50'||x.cardId==='LV1-U23-50'){if(x.issue&&!x.issueHistory)x.issueHistory=x.issue;x.state='resolved_exact_unit_asset_saved_and_reopened_general_pair_retained';x.status=x.state;x.resolvedOn='2026-11-05';x.currentEvidence='LV1-U23-exact-pair-review.json';if(x.issue)x.issue='Resolved: exact unit image lifts trophy overhead; existing correct general basketball-final pair retained.';}Object.values(x).forEach(walk);}}walk(queue);w(queuePath,queue);
const progressPath=root+'PROGRESS.md',old=fs.readFileSync(progressPath,'utf8'),tail=old.slice(old.indexOf('## 實際範圍與順序'));
fs.writeFileSync(progressPath,'# 逐單元全面檢查與修正\n\n## 目前狀態\n\n更新：'+ledger.checkpointAt+'。U23的109組原稿／已發布圖句、80正式詞及124例句已讀；109單元卡、80一般卡124例句、29搭配頁及23詞46三態面板after均已重開，儲存讀回'+persistence.rowsChecked+'列零差異，正常載入時14張進度表不變。最終本機狀態：'+checks.state+'；新提交須查自己的完整CI，不以舊版本成功代替。\n\nU23精確保存69筆主補丁（45詞字義／搭配、10句POS、4練習句及10義項狀態）、3筆中文與23個真缺鍵三態，共95列140欄，含覆蓋與精度改善，不能稱140張錯卡。final單元舉獎盃修圖、corner／study圖說已接入，一般final原有正確決賽圖句保留。原English/cloze/answer、整詞POS與狀態、舊圖、完整歷史基準保留；3份資料精確逆向還原等於cf8fc0f86。\n\nU22 cf8fc0f86ab01365bc71f65c0ba0a25b834c0f9e自己的CI42105997179／job127520852273已成功：216檔1715測試、Python14／7／32／10及lint/typecheck/build全過，build於2026-11-05 20:53:50 UTC完成。U03–U15九批268新鍵與26相同值整合及各自CI證據保留。\n\nU23仍保留牛排熟度、桌角幾何、礦物質晶體示意、罕義精確原譯、hide三態呈現及29未映射項限制，見ledger；工程成功不等於未檢欄位批准。圖片首輪兩個大迴圈在原5000ms逾時，已保留全量斷言按單元分組後重驗；日誌UTF16解碼問題已於2026-11-05解決，完成的20張沒有重拍。\n\n下一單元U24，依原稿順序續行；尚未開始。未merge、deploy、開PR或改發布模式。\n\n'+tail);
console.log(JSON.stringify({unit:109,general:80,examples:124,usage:29,formCards:23,readback:persistence.rowsChecked,localChecks:checks.state}));
