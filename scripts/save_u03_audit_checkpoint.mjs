import {readFileSync,writeFileSync,mkdirSync,copyFileSync} from 'node:fs';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const cli=p=>JSON.parse(readFileSync(p,'utf8').split('### Result')[1].split('### Ran Playwright code')[0].trim());
const root='docs/unit-audit-20261105/';
const source=read('output/unit-audit-20261105/LV1-U03-source.json');
const unitGeneral=cli('output/playwright/unit-audit/u03-general-01-22-after-ui.txt');
const otherGeneral=cli('output/playwright/unit-audit/u03-general-art-final-ui.txt');
const art=read(root+'LV1-U03-original-image-review.json');
const registry=read('src/features/vocabulary/auditedWordIllustrations.json');
const observations=[
 '貓蜷縮窗邊，睡意表情清楚。','巨大紙箱與舊書，角色正在裝書。','狹小房間，角色可同時碰兩牆。','抱一籃新鮮水果。','晴天背書包騎腳踏車，學校在後方。','單一孩子爬公園大樹，children可代表性簡化。','角色開車沿海岸去海邊。','角色坐在桌旁木椅，主導會議也是合理背景。','大雨中回家角色濕透。','已闔課本，手伸向澆水壺及枯垂植物，接下來澆水。','角色開門迎接門外訪客。','花園門邊角色推動木門；靜態開關方向不可單憑像素判定，無反向矛盾。','用海綿在水槽洗杯。','以工具修理舊搖椅。','年幼孩子被安排在看節目的大人之外，支持too young。','棕色母雞在有一顆蛋的巢旁。','角色夜間書桌寫作業，now。','暮色漸暗，角色在回家路上。','成年男性圍圍裙煮晚餐，家人等用餐；每週日頻率不強求像素證實。','母親備健康午餐盒，孩子背書包在旁。','有加拿大旗、書本、行李與校園，支持留學；姊妹關係與今年不強求像素證實。','河邊成人引導孩子持釣竿釣魚，叔叔親屬關係不強求像素證實。'
];
for(const c of [...unitGeneral,...otherGeneral])if(c.mismatches.length||c.definitionMatches===false||!c.imageInfo.length||c.imageInfo.some(i=>!i.complete||!i.width))throw Error('Incomplete reopened evidence '+c.id);
for(const pair of registry){const c=otherGeneral.find(c=>c.id===pair.reviewId);if(!c.imageInfo.some(i=>i.src.includes(pair.illustration.path))||!c.hero.includes(pair.illustration.captionEn)||!c.hero.includes(pair.illustration.captionZh))throw Error(pair.reviewId+' final pair mismatch');}
for(const card of art.cards)if(registry.some(r=>r.reviewId===card.id)){
 card.generalCardIntegration='local_integrated_and_reopened';
 card.reopenedEvidence='output/playwright/unit-audit/u03-general-art-final-ui.txt';
}
writeFileSync(root+'LV1-U03-original-image-review.json',JSON.stringify(art,null,2)+'\n');
const cards=[...source.map((c,i)=>({id:c.id,word:c.displayWord,officialWordId:c.officialWordId,publishedUnitPair:true,
 unitUiScreenshot:`output/playwright/unit-audit/${c.id}.png`,unitImageSha256:c.imageSha256,pixelObservation:observations[i],
 originalPixelSource:'actual local App unit screenshot viewed',generalAfter:unitGeneral[i],
 parentIndependentPixelReview:'parent confirmed these22 core pairs; textual details delivered in delegated messages',
 auditState:'core_pair_checked; not_whole_dictionary_approved'})),...art.cards.map(c=>({...c,publishedUnitPair:false,
 generalBeforeScreenshot:`output/playwright/unit-audit/${c.id}-general-hero-before-art.png`,generalAfter:otherGeneral.find(g=>g.id===c.id),
 generalCardIntegration:registry.some(r=>r.reviewId===c.id)?'local_integrated_and_reopened':'existing_general_picture_checked',
 auditState:'raw_pair_pixel_checked_and_general_card_reopened; unpublished_unit_unchanged'}))].sort((a,b)=>a.id.localeCompare(b.id));
const exampleIds=[...new Set([...read('output/unit-audit-20261105/LV1-U03-source.json'),...read('output/unit-audit-20261105/LV1-U03-unpublished-source.json')].flatMap(c=>c.examples.map(e=>e.exampleId)))];
const allExamples=read('public/data/v1/examples.json');
const clozeFailures=allExamples.filter(e=>exampleIds.includes(e.exampleId)&&e.blankSentence.replace(/_+/g,e.answer)!==e.sentenceEn).map(e=>e.exampleId);
if(clozeFailures.length)throw Error('Cloze mismatch '+clozeFailures.join(','));
const verification=cli('output/playwright/unit-audit/saved-content-verification-u03-full.txt');
if(verification.failures.length||!verification.expectedContentHash)throw Error('saved content mismatch');
const ledger={unit:'LV1-U03',scope:'46 retained source pairs,22 published unit cards,46 actual formal general words; image pass never promotes the whole dictionary word',
 baseCommit:'29cfc684d7a11b07f09988c478d30358830f1951',branch:'content/unit-audit-20261105',checkpointAt:new Date().toISOString(),
 counts:{retainedSourceCards:46,publishedUnitCardsOpenedAndViewed:22,unpublishedSourceImagesActuallyViewed:24,generalWordsReopenedAfterChanges:46,
  formalExamplesChecked:exampleIds.length,publishedSubsetExamples:104,unpublishedWordExamples:81,clozeFailures:0,
  examplePosFixed:8,draftExamplesReviewed:2,senseNeedsCheckReviewed:10,englishDefinitionRepairs:4,corruptedChineseDefinitionFixed:1,
  missingGeneralImagesFilled:15,imageExamplePairingsRepaired:3,newLocalWebpAssets:18,remainingMissingGeneralImages:0,unpublishedUnitPairsStillUnpublished:24},
 cards,savedContentVerification:verification,
 retainedIssues:[
  {type:'word_summary_draft',details:'cat,bicycle,hen,uncle,pen,pencil,eraser,banana,only,bee,honey,cute,brother仍保留draft；不因圖句通過提升整詞。'},
  {id:'LV1-U03-02',type:'source_dictionary_conflict',details:'cat通用中文含惡婦、嘔吐、電腦輔助教育，與單一n.摘要的來源／大小寫及詞性範圍仍待來源核定；本次未猜改。'},
  {id:'LV1-U03-12',type:'alias_sense_precision',details:'bicycle/bike共用詞條的機動兩輪車義可能屬bike別名；未將它斷定為bicycle的義項，保留draft。'},
  {id:'LV1-U03-24',type:'phrase_pos_boundary',exampleId:'EX0347432e',details:'next to整體介系詞與next個別詞的adj./adv.分類邊界需依既有詞彙契約再核，未擅自改原句或把此爭點標通過。'},
  {id:'LV1-U03-44',type:'source_dictionary_conflict',details:'grandfather中文摘要含原始資料組，來源未確認；保留原摘要，不影響已核對grandfather clock原句。'},
  {type:'structured_verb_forms',details:'原尚未收錄的結構化動詞三態與其他未拆義項仍待完整來源；逐卡不宣稱整詞完整。'},
  {type:'pos_summary_scope',words:['dog','tree','cup','honey','window','egg','busy','family'],details:'原通用中文摘要混入超出目前詞頭詞性欄位的用法；須依正式詞表POS範圍與原匯入來源核定是否拆義或調整摘要，未擅自擴充正式詞性，也不將整詞判通過。'},
  {type:'unit_publication_boundary',details:'未發布24原稿只留審核紀錄與必要一般卡本地圖句修復；未加入lv1ReviewedImages、群組或新教材單元。'}
 ],
 next:{unit:'LV1-U04',sourceCards:36,publishedImageSubset:5,id:'LV1-U04-01',word:'aunt'},
 publication:{commit:'pending authorized local checkpoint',push:false,merge:false,deploy:false}};
writeFileSync(root+'LV1-U03-ledger.json',JSON.stringify(ledger,null,2)+'\n');
mkdirSync(root+'receipts',{recursive:true});
for(const f of ['LV1-U01-patches','LV1-U02-patches','LV1-U01-definition-supplement','LV1-U03-patches','LV1-U03-remaining-patches'])copyFileSync('output/unit-audit-20261105/receipts/'+f+'.json',root+'receipts/'+f+'.json');
const master=read(root+'MASTER-INVENTORY.json');
for(const u of master.units){
 if(u.appCatalog.level!=='LV1'||u.appCatalog.unit>3)continue;
 const n=u.appCatalog.unit,done=n===3?cards:read(root+`LV1-U0${n}-ledger.json`).cards;
 for(const item of u.items){const proof=done.find(c=>c.id===item.id);if(proof)item.auditState=n===2&&['LV1-U02-08','LV1-U02-32'].includes(item.id)?'inspected_image_repair_pending':'inspected_core_pair_see_unit_ledger';}
 for(const item of u.retainedLV1Drafts)if(done.some(c=>c.id===item.id))item.auditState=n===2&&['LV1-U02-08','LV1-U02-32'].includes(item.id)?'inspected_image_repair_pending':'original_pixels_reviewed_see_ledger_not_whole_word_pass';
 u.unitComprehensiveState='checkpoint_with_explicit_unresolved_items_see_unit_ledger';
}
master.next=ledger.next;writeFileSync(root+'MASTER-INVENTORY.json',JSON.stringify(master,null,2)+'\n');
const report=`# 逐單元全面檢查與修正\n\n基準 main：\`29cfc684d7a11b07f09988c478d30358830f1951\`；分支：\`content/unit-audit-20261105\`。\n\n## 實際範圍與順序\n\n依本機App實際textbookUnits建立MASTER-INVENTORY.json：146個單元、19,726個教材項目，其中127個curriculumUnits，另外19個LV1已發布圖片子集。母清單同時列出source-art/LV1的1,736組保留原稿與1,010組未發布原稿。盤點不算目視通過；原稿與已發布、文字單元分開。U16–U21是text_only，其無圖不能直接判成失效圖，也不因設計如此就標語文已檢。\n\nU01原稿38／已發布38；U02原稿38／已發布38；U03原稿46／已發布22／未發布24。此前22張的U03結論只對已發布子集成立。\n\n|檢查來源|U01|U02|U03|\n|---|---:|---:|---:|\n|已發布單元卡實際開啟並目視|38|38|22|\n|額外未發布原稿目視|0|0|24|\n|一般卡修改後重開|38|38次／37詞|46詞|\n|去重正式例句核對|206|197|185|\n|詞性修正|15|11|8|\n|draft例句實際核對後reviewed|3|6|2|\n|needs_check義項實際核對後reviewed|19|12|10|\n|補入一般卡缺圖|0|0|15|\n|修正一般卡圖句對應|0|0|3|\n\n## U03本地修復與驗收\n\n24份未發布原稿全數看過原PNG與caption；46個一般詞卡重新開啟，185個原例句、中英翻譯、填空及英英解釋均逐筆核對。15張一般卡確實無圖，已在獨立auditedWordIllustrations登錄精確原稿圖句，另修window的無雪圖配下雪例句、egg的3顆蛋圖配5顆蛋句、bus的等車圖說並列下車句問題。所有原正式例句仍逐字保留在字義頁；原圖片與原稿未刪改。18張版本化WebP原尺寸1254×1254、quality85，18組實際重開路徑與中英圖說全符合，24一般卡81句重開零差異。\n\n沒有將24原稿加入未發布教材單元或lv1ReviewedImages群組，也沒有部署。圖像合格不等於整個多義字通過。13個原draft摘要、cat／grandfather來源疑點、next to詞性分類邊界、未拆義與尚未收錄的動詞三態等均在逐卡ledger保留。\n\nU03另修love動詞、pen撰寫動詞，修banana截斷英英解釋、cute破損中文與缺常用英英義、pen／only漏義；本單元合計24筆明確列修正。累計91筆實際改列已在App IndexedDB唯讀重讀，欄位與完整資料雜湊符合。完整字典安裝前後14張隔離瀏覽器進度表完全相同。\n\n## 未解圖片限制\n\nU02 elephant原尺寸確認兩個多鼻狀灰部件；內建修圖Windows路徑解析失敗：AbsolutePathBuf deserialized without a base path。U02 sun原圖為日光浴，原單元句為日出；父側新圖Library已保存，但正式材料化helper缺os.setxattr，目的地無檔，尚未接入。兩張均未標通過。精確原圖、hash、新圖Library ID、修正草稿見image-repair-drafts.json。舊sunbathing圖保留供sun himself語境，不把另一例句自動標成配圖完成。\n\n## 可回復紀錄與保護\n\n每筆before／after、依據及完整原列見各patches.json與receipts/。unitAudit.testSupport.ts先核對精確新欄位，再逐筆反向還原允許修改；舊歷史payloadHash完全保留，未改欄位仍必須符合原基準。meta的現行wordsHash與contentHash另外由完整檔案重算驗證。圖片測試逐一核對18張資產hash、正式ID、精確圖說及錯誤ID拒配，並斷言未發布單元清單仍726／U03 22。\n\n驗收原始檔與截圖保存在output/及output/playwright/unit-audit/；單張完整UI證據路徑在ledger。相關4檔17測試曾通過；最後18圖的精確補測、lint與最終build狀態見validation/。最初全套5秒逾時、30秒全套中斷原始證據保留，未宣稱完整suite通過。\n\n## 下一張\n\nLV1-U04-01 aunt，原稿共36組，已發布圖片子集5組。尚未檢查者維持not_checked；全任務未完成。U01、U02細節與未決項見各ledger。feed/file/flower另一工作線未碰；本機checkpoint提交另記，不push、合併或部署。\n`;
writeFileSync(root+'PROGRESS.md',report);
console.log(JSON.stringify(ledger.counts));
