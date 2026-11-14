import {readFileSync,writeFileSync} from 'node:fs';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const cli=p=>JSON.parse(readFileSync(p,'utf8').split('### Result')[1].split('### Ran Playwright code')[0].trim());
const cards=read('src/features/vocabulary/lv1ReviewedImages.json').filter(c=>c.unit===1);
const source=read('output/unit-audit-20261105/LV1-U01-source.json');
const after=[...cli('output/playwright/unit-audit/u01-general-01-20-after-ui.txt'),...cli('output/playwright/unit-audit/u01-general-21-38-after-ui.txt')];
if(after.length!==38||after.some(c=>c.mismatches.length||c.imageInfo.some(i=>!i.complete||!i.width)))throw Error('UI verification incomplete');
const observations=[
 '課桌前學生舉手；黑板、書包清楚，教師未入鏡為合理簡化。',
 '前景角色指向遠處較小女孩，支持 over there 與 younger sister。',
 '節慶旗幟、服務台、地圖和詢問者，呈現值守服務台的 man 動詞。',
 '成年女性角色站門邊；姨媽身分不能由像素獨立證實，但無矛盾。',
 '兩角色背包持杖沿山徑健行。',
 '商店貨架、購物車與拿一包洋芋片的動作。',
 '兩顆草莓已放蛋糕上，手中第三顆正在放下。',
 '機艙疲累角色與概略跨洲航程，支持漫長又累人的飛行。',
 '矮角色投籃、後方高角色作對照。',
 '角色攜行李與文件走入城市高樓群，支持搬家求職。',
 '角色背書包離校走向有食物的夜市。',
 '角色打領帶照鏡子，外套文件支持面試前準備。',
 '圖書館書架前持太空圖案書；借書動作合理省略。',
 '背書包角色在圖書館櫃台附近抱著恰好兩本書。',
 '夜間書店營業、敞開店門與九點鐘。BOOKSTORE 為原有核准招牌，非本次新增；不僅因新生圖提示詞而重畫舊圖。',
 '風雨中拉下店鋪鐵捲門，支持颱風前提早打烊。',
 '同一角色分景呈現打籃球與游泳，支持 also 的兩種能力。',
 '籃球場旁手臂置於吊帶，受傷部位與籃球清楚。',
 '籃球場旁腿打石膏、拐杖及籃球清楚。',
 '手扶受傷膝蓋、旁有倒地腳踏車。',
 '裹毯持紙巾且有鼻涕，支持感冒流鼻水。',
 '閉眼戴耳機安靜聽音樂。',
 '角色摀耳，牆上火警鈴有聲響線。',
 '成人帶孩子以硬幣買舊書，支持為孩子購買二手教科書。',
 '夜市攤販把手工麵包賣給顧客；叔叔身分與週期合理省略。',
 '大量速食包裝與腹部不適角色，支持不良健康影響的核心。',
 '角色俯身躲牆後，持文件領帶角色走來；為 duck 動詞。',
 '兩角色餐桌上分食一盤烤雞。',
 '背書包孩子們在公園套圈遊戲。',
 '角色穿太緊上衣拉衣角，not big enough 核心一致。圖為無領T恤、原譯襯衫較具體，精度另列，未改原句。',
 '可見飛機與行李的機場內，角色相見微笑。',
 '中心女性角色說笑，旁邊三角色大笑。',
 '哭泣角色旁有碎杯，另一角色持完整杯安慰。',
 '眨眼開玩笑角色、擔心同伴與完整午餐盒；沒有真的吃掉午餐。',
 '幼小角色哭泣，旁有停止的發條音樂盒與玩偶。',
 '自然外形粉紅豬在泥裡快樂打滾，沒有豆魔化。',
 '角色伸展，瑜珈墊水壺及健康象徵支持身心健康。',
 '穿學生領巾的角色在節慶旗幟和音符下跳舞。',
];
const blobs=['97746aee0682b8fd047add42de171e5ce208178e','67a1e835d2fb1fe3dcdda896ae8a0e7cf08e90d9','c3eae3c77d4a76fda845bcebb67dc16fe4c0a8ab','14024521c2f99e198f6022e994c24ed1340ea546','613896459eb394cd11ddea2e15b0a8aa15daef4c','aa5ddf0e22ce9e9836df664df73b29ec6ee59e65','e2c4142f30b222ae5cb2a12c6ea1c3d7036c8779','a1e7a711fe2da7a393219681ba839d30dfc8ed25','fe609fddd2d3d161d13f794eef9ffe3883bb06f5','46eac1b73d3e5b0847bc3bfc88106d29c0f01dcb','a1d1c7db5b18b3318aed65e198bf123eaf179188','914042bd6191f6ef367da44d8c69032b5dd7e643','d4fbbe0d39df7dd27bcf0bc14da4cfe41378a3a9','91eec7d856e90fd90071d2aea7eed7b57c316f06','2a23418ef39cdc8d8dc636b51f739e0fefc68473','015868c5f4fbba20b863b3045c873e4815bfd601','082ff0e9dd79650ccb9539775a4c471793faebfd','01185887e3962a7f690fe5e296951f5a78d992a4','cbc623da49f87a57640ad24f21c12977933aa3bc','291af2336b73a487d81345eff65322a5d7c2ee72','f9c7d386a4bc602c79a1f4b0ad8a52de9a418bed','9cabaf84ef420c1e211a2fd723c5917dd68c2315','9251e5921edff4deda73de34d19c7c9dc26afa44','932782cfe7f0597f51d21d7ecf4dbe25ca3a0a8b','4d9e089d6ffff99faa1f556d7bbdde0e37b10046','800b26844c7db47a9d80d387effae101b43b9f68','add108edc96d45d1295ff6457f88a7415ff8b3cd','8e852e29ddb4520e6382d1bdacba1047aba77cb1','a10bd53cefa916b4bcf3af16515faf5fa84911c0','46cc751cdb80628bc9f435bebfd63446d09ac1ce','56303884cce1c0b2f17247a707a236691c145558','b608090ea96aba7e47f9837767996c49de99da1a','6a0018dee09fd34bd051195051184553bec46258','382b5c270a4e94bae8b315a5c298d1ec7b55eea3','d6feb2295dce026ac4e7aaea6a237e009fbdddeb','1d06657bc4909ea314b5d776d146b480d03f6dc0','ff43761c720db10cd2042df7a0f486b1deeafb3d','df626b510b525407c6bf6412beeb06b10f0252cf'];
const manifest=read('docs/unit-audit-20261105/LV1-U01-patches.json');
const ledger={unit:'LV1-U01',checkpointAt:new Date().toISOString(),branch:'content/unit-audit-20261105',baseCommit:manifest.baseCommit,
  task:'逐單元全面檢查與修正',scope:'38單元圖句、38正式詞條；206個一般卡例句。圖句審查不等於整詞及其他例句圖片核准。',
  counts:{unitCardsOpened:38,unitCardsVisuallyInspected:38,generalCardsReopened:38,generalExamplesComparedInUI:206,
    imageMismatchFixed:0,brokenImages:0,imagesAdded:0,missingRequiredUnitImages:0,examplePosFixed:15,exampleDraftReviewed:3,senseNeedsCheckReviewed:19},
  cards:cards.map((c,i)=>({id:c.id,word:c.displayWord,wordId:c.officialWordId,imagePath:c.illustration.path,
    imageSha256:source[i].imageSha256,unitUiScreenshot:`output/playwright/unit-audit/${c.id}.png`,
    generalUiScreenshot:after[i].screenshot,unitImageCaptionSemanticCheck:'agent_visually_checked_core_consistent',
    observation:observations[i],parentIndependentPixelReview:{source:'parent delegation 2026-11-05; GitHub connector decode; not UI verification',gitBlob:blobs[i],result:'core_consistent'},
    generalExampleCount:after[i].exampleCount,generalExampleTextSavedAndReopened:after[i].mismatches.length===0,
    generalImageLoaded:after[i].imageInfo.every(im=>im.complete&&im.width>0),
    generalImageMatchesUnit:after[i].imageInfo.some(im=>im.src.split('?')[0].endsWith(c.illustration.path)),
    wordWideApproval:'not_promoted_by_this_image_review',
    preexistingDraftWord:source[i].word.status==='draft',
    incompleteVerbForms:source[i].word.posAll.some(p=>/^(v|vt|vi)\./.test(p))&&!source[i].word.verbForms})),
  retainedIssues:[
    {ids:['LV1-U01-07','LV1-U01-14','LV1-U01-20','LV1-U01-28','LV1-U01-36'],status:'word_draft_retained',reason:'只確認本次具體圖句與現有例句；原摘要含其他用法或未拆分義項，未將整列詞條直接批准。'},
    {id:'LV1-U01-30',status:'translation_precision_pending',reason:'原句 shirt 圖為無領T恤；中文襯衫較窄。核心 not big enough 一致，保留原核准文字，不標成已修正。'},
    {status:'incomplete_structured_verb_forms',reason:'字卡明示動詞三態尚未收錄；尚未取得並逐詞核對結構化三態來源，不猜填。逐卡欄位列出受影響詞。'},
    {status:'legacy_dictionary_summary_pending',reason:'部分原始摘要混合多詞性或擴展義，既有綜合標籤保留為原標籤，不宣稱已完成全部字典義項拆分。'}
  ],
  validation:{uiEvidence:'actual localhost app Playwright session unit-audit; screenshots and DOM outputs',
    changedSentences:false,changedImages:false,masterTouched:false,tests:'initial full run interrupted after IndexedDB 5s timeouts; diagnostic pending',lint:'initial warnings in generated capture snippets; cleanup and rerun pending',build:'running'},
  next:{unit:'LV1-U02',card:'LV1-U02-01',state:'source_text_checked; UI capture started; not yet visually passed'},
  publication:{commit:'none (local recoverable changes)',push:false,merge:false,deploy:false}};
writeFileSync('docs/unit-audit-20261105/LV1-U01-ledger.json',JSON.stringify(ledger,null,2)+'\n');
let md=`# 逐單元全面檢查與修正\n\n基準 main：\`${manifest.baseCommit}\`；分支：\`content/unit-audit-20261105\`。\n\n## LV1 Unit 01 checkpoint\n\n實際開啟並逐張目視38張單元圖句；38個一般字卡及字義分頁修改後重開，206個英中例句與保存資料逐筆比對一致，圖片均正常。圖片核心情境未見需重畫矛盾，新增圖0、必要圖缺口0。沒有改英文原句、中文原句、填空或答案，也沒有改母表。\n\n修正15筆例句詞性與精確提示；3筆draft例句、19筆needs_check義項核對後轉reviewed。詳細before/after與詞典依據見 LV1-U01-patches.json；舊列完整保存在output/unit-audit-20261105/receipts/LV1-U01-patches.json。這是代理核對，不是將整張多義字卡或其他圖片代替使用者全面批准。\n\n|卡號|單字|實際圖像與原句的核對|\n|---|---|---|\n`;
md+=ledger.cards.map(c=>`|${c.id}|${c.word}|${c.observation}|`).join('\n');
md+='\n\n仍保留：5個原draft詞條的整列摘要；未具來源的結構化動詞三態；enough 的襯衫／T恤翻譯精度。38張圖句通過核心配對，不代表上述缺口通過。BOOKSTORE是既有核准招牌，本次未改。\n\n父側另完成38張Git blob像素審查，與本機UI檢查分列於逐卡ledger，不互相冒充。\n\n驗證：U01全量UI重開與206例句比對完成。lint暫存片段警告已整理待重跑；build進行中；完整測試初跑有大型IndexedDB 5秒逾時，診斷中，尚未通過。\n\n下一單元：LV1 U02，38圖句／37詞條，逐卡UI檢查已開始。原feed/file/flower分支未碰；未commit、push、合併或部署。\n';
writeFileSync('docs/unit-audit-20261105/PROGRESS.md',md);
console.log(JSON.stringify(ledger.counts));
