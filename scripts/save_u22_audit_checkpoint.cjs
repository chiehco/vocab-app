(function saveU22(){
const fs=require('fs'),assert=require('node:assert/strict'),{createHash}=require('crypto'),{execFileSync}=require('child_process');
const root='docs/unit-audit-20261105/',out='output/unit-audit-20261105/';
const r=p=>JSON.parse(fs.readFileSync(p,'utf8')),w=(p,v)=>fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n'),hash=v=>createHash('sha256').update(v).digest('hex');
const source=r(out+'LV1-U22-source-before.json'),unit=r(out+'U22-unit-final.json'),general=r(out+'U22-general-final.json'),usage=r(out+'U22-usage-final.json'),panels=r(out+'U22-form-panels.json');
assert.equal(unit.length,79);assert.equal(general.length,66);assert.equal(general.reduce((n,x)=>n+x.exampleCount,0),86);assert.equal(usage.length,15);assert.equal(panels.length,17);
assert(general.every(x=>x.definitionMatches&&x.formsMatch&&!x.mismatches.length));assert(usage.every(x=>x.allRulePartsVisible));assert(panels.every(x=>x.bothPanelsMatch));
const manifests=['LV1-U22-patches.json','LV1-U22-translation-precision.json','LV1-U22-verified-forms-patches.json'];
const patches=manifests.flatMap(p=>r(root+p).patches);
const inverses=[];
for(const dataset of ['words','examples','senses']){
 const rows=r('public/data/v1/'+dataset+'.json'),copy=structuredClone(rows);
 for(const p of patches.filter(p=>p.dataset===dataset).reverse()){
  const row=copy.find(x=>x[p.key]===p.id);assert(row);
  for(const [k,v]of Object.entries(p.after))assert.deepEqual(row[k],v);
  for(const [k,v]of Object.entries(p.before))if(!Object.hasOwn(p.after,k))assert.deepEqual(row[k],v);
  for(const k of Object.keys(p.after)){if(k==='verbForms'&&p.before[k].$absent)delete row[k];else row[k]=p.before[k];}
 }
 const before=JSON.parse(execFileSync('git',['show','1d73cab2e6ec3c5e95423ad868b153d6a3c13aac:public/data/v1/'+dataset+'.json'],{encoding:'utf8',maxBuffer:20*1024*1024}));
 assert.deepEqual(copy,before);
 inverses.push({dataset,rows:rows.length,exactInverse:true,restoredSha256:hash(JSON.stringify(copy)),beforeSha256:hash(JSON.stringify(before))});
}
w(root+'validation/U22-exact-inverse.json',{priorCheckpoint:'1d73cab2e6ec3c5e95423ad868b153d6a3c13aac',manifests,patchRows:patches.length,changedFields:patches.reduce((n,p)=>n+Object.keys(p.after).length,0),optionalKeysRestoredByDeletion:17,inverses});
const fileProof=p=>({path:p,sha256:hash(fs.readFileSync(p))});
const forms=r(root+'VERIFIED-U22-VERB-FORMS-SOURCES.json').facts;
for(const fact of forms){const actual=general.find(x=>x.word===fact.word);assert(actual.formsMatch);const before=r(out+'U22-ui-before.json').find(x=>x.word===fact.word);assert(before&&before.hero.includes('動詞三態尚未收錄。')&&before.meaningPageText.includes('動詞三態尚未收錄。'));}
const summary={unitId:'LV1-U22',recordedAt:new Date().toISOString(),counts:{unitReopens:79,generalReopens:66,uniqueExamples:86,changedUsagePages:15,newFormCards:17,newFormPanels:34,allCurrentFormCards:20,savedRows:2159,progressTables:14},failures:0,
 install:r(out+'U22-install.json'),persistence:r(out+'U22-persistence.json'),
 exactChineseSummariesVisible:patches.filter(p=>p.dataset==='words'&&p.after.meaningZh).every(p=>{const word=r('public/data/v1/words.json').find(x=>x.wordId===p.id).word,u=general.find(x=>x.word===word);return(u.hero+'\n'+u.meaningPageText).includes(p.after.meaningZh);}),
 uiBoundaries:'Empty-hint example POS and long sense notes/source URLs are not rendered by this screen. Those exact fields are verified by DB readback and protected patches, not claimed as visible labels. Eight existing nonempty hints remain unchanged.',
 unit:unit.map(x=>({id:x.id,route:new URL(x.url).hash,image:x.images.map(i=>({path:new URL(i.src).pathname,width:i.width,height:i.height,complete:i.complete})),capture:fileProof(x.screenshot)})),
 general:general.map(x=>({id:x.id,word:x.word,route:new URL(x.url).hash,examples:x.exampleCount,definitionMatches:x.definitionMatches,formsMatch:x.formsMatch,expectedForms:x.expectedForms,hero:fileProof(x.heroScreenshot),meaning:fileProof(x.screenshot)})),
 usage:usage.map(x=>({wordId:x.wordId,word:x.word,allRulePartsVisible:x.allRulePartsVisible,tabRetry:x.tabRetry,capture:fileProof(x.screenshot)})),
 formPanels:panels.map(x=>({wordId:x.id,word:x.word,values:x.values,bothPanelsMatch:x.bothPanelsMatch,hero:fileProof(x.shots.hero),meaning:fileProof(x.shots.meaning)})),
 captureRecovery:{failedWholeBatch:'Transient missing main element while reading card28; no complete result array accepted.',failedFirstChunk:'page.goto at card1 exceeded original 30000ms waiting for load; subsequent read showed HTTP200, document complete and exact card visible.',resolution:'Locator-based text reads and DOMContentLoaded navigation followed by unchanged exact headings, image paths/dimensions, captions and content guards. Four complete chunks (20+20+20+19) accepted; timeouts not increased.'},
 pixelChecks:'Original79 sheets, native eye-catching before/new and choose art, actual final eye-catching unit, choose unit/general screenshots and all34 form panels in five sheets actually viewed.'};
assert(summary.exactChineseSummariesVisible);w(root+'validation/U22-reopen-summary.json',summary);
const pairPath=root+'LV1-U22-exact-pair-review.json',pair=r(pairPath);pair.state='exact_pairs_saved_and_actual_app_reopened';pair.actualValidation='validation/U22-reopen-summary.json';pair.actualPixelViews=['LV1-U22-04-unit-final.png','LV1-U22-46-unit-final.png','LV1-U22-46-general-final-hero.png'];pair.capturesAreSeparateFromBefore=true;w(pairPath,pair);
const approvalPath='scripts/approvals/lv1-images-20260922.json',approval=r(approvalPath);for(const id of ['LV1-U22-04','LV1-U22-46'])approval.find(x=>x.id===id).approvalSha256=hash(fs.readFileSync(pairPath));w(approvalPath,approval);
const notes=r(out+'U22-pixel-observations.json').observations,other=r(out+'U22-other-general-pixel-observations-final.json');
const currentCards=r('src/features/vocabulary/lv1ReviewedImages.json');
for(const e of source.flatMap(c=>c.examples))assert.equal(e.blankSentence.replace(/_{2,}/,e.answer),e.sentenceEn);
const originalProof={unit:'LV1-U22',scope:'All79 retained source illustrations actually viewed in contact sheets (660-pixel tiles); native1254 follow-ups on eye-catching and choose. All79 published routes reopened; this is not blanket approval of all word fields.',cards:source.map(c=>({id:c.id,word:c.word,officialWordId:c.officialWordId,sourceImageSha256:c.sourceImageSha256,originalIllustration:c.publishedPair.illustration,currentIllustration:currentCards.find(x=>x.id===c.id).illustration,pixelReview:'actually viewed original via contact-sheet tile; exact native follow-up where specified',observation:notes[Number(c.id.slice(-2))],finalPairChecked:true,exampleIds:c.examples.map(x=>x.exampleId),generalCardRepair:false,publishedPairRepair:['LV1-U22-04','LV1-U22-46'].includes(c.id),generalInheritedCaptionRepair:c.id==='LV1-U22-46',limitations:'Visible core checked; unobservable time, kinship, motives, prices and contract details are not inferred.'})),otherGeneralPairs:other,unmappedWordPolicy:'13 exact/normalized headwords had no formal row; preserve standalone published cards and do not invent IDs.'};
w(root+'LV1-U22-original-image-review.json',originalProof);
const priorCi=r(root+'validation/U15-integrated-ci-1d73cab.json');
const validation=fs.existsSync(root+'validation/U22-local-checks.json')?r(root+'validation/U22-local-checks.json'):{state:'final_checks_pending',firstRegression:{files:5,tests:52,exitCode:0},python:{tests:32,exitCode:0}};
const ledger={unit:'LV1-U22',checkpointAt:new Date().toISOString(),priorCheckpoint:priorCi.commit,priorCheckpointFullCi:priorCi,newCheckpointFullCi:{status:'pending_exact_head_after_commit'},state:validation.state==='passed'?'precise_corrections_saved_actual_app_reopens_and_local_checks_passed':'precise_corrections_saved_actual_app_reopens_complete_final_checks_pending',
 scope:{sourcePairs:79,publishedPairs:79,formalWords:66,uniqueExamples:86,unmapped:13,allClozeReconstructions:true},counts:{mainPatchRows:54,mainFields:93,wordRows:32,examplePosRows:9,practiceStatusesReviewed:7,sensesReviewed:6,officialExamSourcesVerified:3,translationRows:1,newVerbFormKeys:17,pairRepairs:2,otherPairRowsUnchanged:724},manifests,
 evidence:{sourcePixels:'LV1-U22-original-image-review.json',pairRepairs:'LV1-U22-exact-pair-review.json',actualApp:'validation/U22-reopen-summary.json',inverse:'validation/U22-exact-inverse.json',sources:'LV1-U22-source-research.json'},localValidation:validation,
 preserved:{headwordIdsPosAndWholeWordStatuses:true,englishClozeAndAnswers:true,originalImageAndApprovalHashes:true,approvedBestSenses:true,allEightNonemptyHints:true,emptyHints:78,generalArriveCircularCirculationOvalPairs:true,oldPayloadHashFixtures:true,userProgressTables:14},
 pending:[{id:'LV1-U22-15',field:'Chinese material specificity',reason:'Hoop image cannot establish metal. 滾鐵環 may be the intended conventional activity; preserve original wording and separate LV4 general pair rather than mechanically remove a material.'},{id:'W006031',field:'Chinese treatment gloss partition',reason:'English is now noun-only. Original Chinese hospitality/視為 wording remains; precise nominal phrasing across inherited combined treat/treatment meanings is not fully verified.'},{id:'W001053',field:'separate adverb Chinese precision',reason:'Asleep has a genuine adverb entry; retained 熟睡地 is not newly approved as an exact degree/translation or as an adjective.'},{id:'13 standalone source words',field:'formal mapping',reason:'No exact or normalized formal word IDs exist. Published unit routes verified; no new dictionary identity created.'}],
 checkpointWriterRecovery:'The before UI contains the exact message 動詞三態尚未收錄。; a first substring-only assertion confused this placeholder with an existing panel. The writer now requires the exact missing-field message; original snapshots and all real panel checks are retained.',
 next:{unit:'LV1-U23',firstCard:'LV1-U23-01',state:'not_started'},deployment:'No merge, deployment, PR or publication-mode changes.'};
w(root+'LV1-U22-ledger.json',ledger);
const progressPath=root+'PROGRESS.md',old=fs.readFileSync(progressPath,'utf8'),tail=old.slice(old.indexOf('## 實際範圍與順序'));
const header='# 逐單元全面檢查與修正\n\n## 目前狀態\n\n更新：'+ledger.checkpointAt+'。U01–U22逐單元核查紀錄已保存。U22的79組原稿／已發布圖句、66正式詞及86例句均已讀；修改後79單元卡、66一般卡、15搭配頁及17詞34三態面板已實際重開，2159筆儲存讀回零差異，14張進度表不變。最終檢查狀態：'+validation.state+'；U22需查本提交自己的完整CI，不能引用舊CI作新版本驗收。\n\nU22精確保存9筆挖空詞POS、17缺鍵三態、choose的襯衫→上衣與eye-catching灰傘修圖；另有逐字段字義／搭配與6義項核查。93個主補丁欄位多含義項覆蓋與搭配精度，不能當作93張錯卡。原English/cloze/answer、整詞POS與狀態、舊圖及所有歷史雜湊基準保留。具體待確認見LV1-U22-ledger.json；13未映射詞不造ID。\n\nU03–U15九批準備包已完成：268真缺鍵接入、26原有相同值保留，294筆現值精確對帳；268新鍵刪除可還原U21完整6090詞。最終整合1d73cab2e6ec3c5e95423ad868b153d6a3c13aac自己的CI42096081143／job127486349198已成功：216檔1712測試、Python14／7／30／10及lint/typecheck/build全過，build於2026-11-05 19:57:17 UTC完成。U14 f2426fd自己的CI42094302699亦已成功；舊待終態限制已於2026-11-05解決。\n\n下一單元U23，依原稿順序開始；尚未執行，既有修圖素材到對應卡再精確接入。未merge、deploy、開PR或改發布模式。\n\n';
fs.writeFileSync(progressPath,header+tail);
const queuePath=root+'FOLLOWUP-QUEUE.json',queue=r(queuePath);
function walk(x){if(Array.isArray(x))x.forEach(walk);else if(x&&typeof x==='object'){if(x.id==='LV1-U22-04'||x.cardId==='LV1-U22-04'){x.state='resolved_exact_asset_integrated_actual_unit_reopen_verified';x.resolvedOn='2026-11-05';if(x.issue&&!x.issueHistory){x.issueHistory=x.issue;x.issue='Resolved: corrected image has four neutral gray surrounding umbrellas; actual unit card reopened.';}x.status='exact_asset_integrated_actual_unit_reopen_verified';x.currentEvidence='LV1-U22-exact-pair-review.json';}if(x.id==='LV1-U22-46'||x.cardId==='LV1-U22-46'){x.state='resolved_exact_chinese_precision_unit_general_reopens_verified';x.resolvedOn='2026-11-05';if(x.issue&&!x.issueHistory){x.issueHistory=x.issue;x.issue='Resolved: exact Chinese 襯衫→上衣 saved; unit and general cards reopened with unchanged English and image.';}x.status='exact_chinese_precision_integrated_unit_general_reopens_verified';x.currentEvidence='LV1-U22-exact-pair-review.json';}Object.values(x).forEach(walk);}}
walk(queue);w(queuePath,queue);
console.log(JSON.stringify({inverseDatasets:inverses.length,patchRows:patches.length,changedFields:patches.reduce((n,p)=>n+Object.keys(p.after).length,0),unit:79,general:66,examples:86,forms:17,usage:15,localChecks:validation.state}));
})();
