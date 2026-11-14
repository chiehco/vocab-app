import {readFileSync,writeFileSync,appendFileSync} from 'node:fs';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const cli=p=>JSON.parse(readFileSync(p,'utf8').split('### Result')[1].split('### Ran Playwright code')[0].trim());
const source=read('output/unit-audit-20261105/LV1-U02-source.json');
const after=[...cli('output/playwright/unit-audit/u02-general-01-20-after-ui.txt'),...cli('output/playwright/unit-audit/u02-general-21-38-after-ui.txt')];
if(after.length!==38||after.some(c=>c.mismatches.length||c.imageInfo.some(i=>!i.complete||!i.width)))throw Error('Incomplete UI evidence');
const observations=[
 '學生把作業交給教師，hand動詞清楚。','切片洋蔥、菜刀與包紮手指，傷手指核心一致。','角色步行至公園門口，遠處公車為對照。','健行後脫鞋按紅痛腳趾。','年長角色桌旁喝茶，綠茶淡琥珀色可接受。','農場角色擠牛奶入桶。','白兔藏花園灌木下。',
 '噴水象鼻下蘋果旁及嘴下另有帶皮紋灰色彎管，誤導為多鼻，需移除。原尺寸已確認；本機imagegen輸入失敗，未修。',
 '門旁持一隻滴水鞋子。','角色整理床單，make his bed。','窗外角色渴望窗內餐食。','熱湯冒蒸汽，角色怕燙。','冬衣圍巾角色戶外發抖、白氣與雪。','飛機機翼下雲層，飛在雲上。','孩子可拿低架玩具，旁有高書架。','公車急停乘客失衡，角色抓扶桿。','飯後角色吃爆米花笑看電視。','學生以相機錄製植物科學實驗；film是動詞。','把白色牛奶倒進茶杯。','提起披薩片，起司拉長絲。','在熱吐司上塗奶油。','晨光下完整早餐盤，最重要屬原句主張。','持鐘解釋並指扁輪胎腳踏車，遲到原因相符。','長者床邊講圖畫書故事。','書桌角色皺眉解題，數學符號依無字風格合理省略。','主管向團隊握手致意，有完成文件。','鐘前角色思考兩份紙張，做決定與期限合理簡化。','多角色海浪與島嶼前游泳。','攜行李站大船甲板，旅行情境。','兩角色划小船橫渡河流。','角色躺草地看夜空星星。',
 '原句太陽從東方升起；現圖高掛太陽下躺椅曬太陽，核心rises缺失。新版已由父側生成，正式Library材料化因Windows缺os.setxattr失敗；未接入。',
 '亮滿月下散步。','抱恐龍玩偶，周圍模型與海報，狂熱喜歡恐龍。','切段四季豆加入湯，beans含菜豆。','孩子把玩偶安置小床並蓋被。','寫紙信，旁信封、行李與富士山圖。','健行起點角色束緊皮帶，旁背包。'
];
const blobs=['b842f23516fb0f3741fe92f37f380b74136c7527','c05196af0b9f65f8331548009cfee6167b1c631b','0a928e8ca40247b95c570df58d93558c2318f577','28e6638075993f47e326eb5ed884591fd784b966','aed5ab5d6d0fa0200cb635b180f73eac81a6307e','ed705749f52be9adc21e64acef0aec6bf5d9f61c','4635ac06271a14b97e7d6bfba8bfa169dabfdc15','d5e92de3ea40e8ce6d54e8809c7775c06f880a87','29b5624a657024fe3d9b4a6348b1634f95eb9317','f7fa7c217644fc627b216d4a1b89a47855bc6607','35f158d09180af9da97e0ffa06f717d49e22ad16','e60cbd03b37ac383ecb47817b2214ed9b46d345a','1a85c5f1f94d10c809fc37879eea0df4908d1b6b','02d8ec25ef975a574776e562c5cb4d2f55ae27b0','b8a9d471ca6a02808bf3908ad52b64ccb92bf939','516ad58cf6edd2a5edd32b82253a98373866a8a8','0d599edd7002836ec98a65a91ea54000780a0203','66ec89245917a68d1d8bb9c528ba9805a30d1094','58f47b58953e0c71fd691fd96c2cbe7ca7a59019','caa13db2f6de0f14567dc27ea0b38af23c8ecb6f','f5f3ff2ffe8405abdc128d96ebd9baa152e4efb2','1b91e767b250f39670417c1ceda5b70d6b595e0c','1a9209df8256db0e40c61967cdc332ef46815fa7','d37edda1eadcdd856a384e7decb6c18f233b7aee','7e292d10c90f86dcaaeaedd9714f0c4de0f37e70','13b0cfd741af50bb5eb868368f2a6b0f9df44d7a','f86c62dfc2af7d8824dd1249c16730ee3a5cf956','cf9e97f8547492598b422a4da81d5163411446db','938c3369128f5ed81e5cc66de08e520a500fd77a','58c6c63ebc0bd7e0d49e5fcf5e75ea1d90e4d9ec','8849c98e3aca4e91c0886a2d57e46b6101cf2018','e523f01b59cfef4f81af8055ebbd1dc14cfb8e5e','26198795d8d390be8bc56c29d7f0dfbd83d2fb04','bd1757579ac8e76ceacda6d39c8ccc7fedaa7537','f44b37b0a304ae8a3f7d2b9776f32810071ce115','efbd17c75f52bc140666defe603734075e401206','14d8aa7813cfd6dbaedcb80c716bc12ce4c86cf0','641605fa8078bd73a8a197b295f535ac2cc5dce5'];
const ledger={unit:'LV1-U02',checkpointAt:new Date().toISOString(),branch:'content/unit-audit-20261105',baseCommit:'29cfc684d7a11b07f09988c478d30358830f1951',
 counts:{unitCardsOpened:38,unitCardsVisuallyInspected:38,coreImageCaptionConsistent:36,imageRepairsPending:2,generalCardVisitsAfterChange:38,distinctGeneralWords:37,
  generalExampleComparisons:207,distinctGeneralExamples:197,examplePosFixed:11,exampleDraftReviewed:6,senseNeedsCheckReviewed:12,definitionSupplement:1,
  imagesAdded:0,brokenImages:0,missingRequiredUnitImages:0},
 cards:source.map((c,i)=>({id:c.id,word:c.displayWord,wordId:c.officialWordId,unitImage:c.illustration.path,imageSha256:c.imageSha256,
  unitUiScreenshot:`output/playwright/unit-audit/${c.id}.png`,generalUiScreenshot:after[i].screenshot,
  unitImageSemanticState:[8,32].includes(i+1)?'needs_image_repair':'agent_visually_checked_core_consistent',observation:observations[i],
  parentIndependentPixelReview:{source:'independent original-asset pixel review; separate from actual localhost UI',gitBlob:blobs[i]},
  generalExamplesChecked:after[i].exampleCount,generalExamplesMatchSavedData:after[i].mismatches.length===0,
  generalImagesLoaded:after[i].imageInfo.every(im=>im.complete&&im.width>0),generalImagePaths:after[i].imageInfo.map(im=>im.src),
  generalImageMatchesThisUnit:c.illustration.path&&after[i].imageInfo.some(im=>im.src.split('?')[0].endsWith(c.illustration.path)),
  wholeWordReviewState:'not_promoted_by_image_review',preexistingDraftWord:c.word.status==='draft',
  incompleteVerbForms:c.word.posAll.some(p=>/^(v|vt|vi)\./.test(p))&&!c.word.verbForms})),
 retainedIssues:[
  {id:'LV1-U02-08',type:'anatomy',status:'tool_input_blocked',details:'兩個額外象鼻狀灰件已原圖確認；修圖工具拒絕Windows path解析，沒有生成或寫入。'},
  {id:'LV1-U02-32',type:'image_caption_mismatch',status:'library_materialization_blocked',details:'sunrise新圖在Library但本機官方helper缺os.setxattr，目的地無檔；沒有接入。詳見image-repair-drafts.json。'},
  {id:'LV1-U02-18',type:'shared_identity',status:'partial_dictionary_sense_coverage',details:'movie/film共用W000560；一般卡預設movie觀看圖，單元film卡仍使用拍攝圖。只修filming/filmed的精確例句詞性，不把movie當動詞，不宣稱正式詞全部義項已拆分。'},
  {id:'LV1-U02-21',type:'source_dictionary_definition',status:'draft_retained',details:'補回既有butter his toast用法的英英解釋；原英英解釋另有fighter who strikes with head同形詞內容，來源未定，保留原文與draft，未判整列通過。'},
  {type:'draft_words',status:'retained',wordIds:source.filter(c=>c.word.status==='draft').map(c=>c.officialWordId),details:'未僅因單張圖句通過提升整詞原始摘要。'},
  {type:'structured_verb_forms',status:'not_filled',details:'逐卡incompleteVerbForms列出，無可信結構化來源前不猜填。'}
 ],
 savedContentVerification:cli('output/playwright/unit-audit/saved-content-verification.txt'),
 validation:{lint:'passed after generated snippets renamed .txt',build:'passed before final word definition supplements; final build pending',fullTests:'30s upper-limit run in progress; initial 5s timeout log retained; single diagnostic14/14 passed'},
 next:{unit:'LV1-U03',card:'LV1-U03-02',state:'22圖句/104例句source核對；UI前11張已開始擷取，尚未宣稱目視完成'},
 publication:{commit:'none',push:false,merge:false,deploy:false}};
writeFileSync('docs/unit-audit-20261105/LV1-U02-ledger.json',JSON.stringify(ledger,null,2)+'\n');
appendFileSync('docs/unit-audit-20261105/PROGRESS.md',`\n## LV1 Unit 02 checkpoint\n\n38組單元圖句已逐張實際開啟並目視；36組核心相符，elephant多鼻狀部件與sun日出原句配日光浴兩組待換圖，不標通過。一般卡重開38次，共37詞條，207次例句比對／197個去重例句，全數與保存的英中原句相同。\n\n已修11筆詞性；6筆draft例句及12筆needs_check義項完成核對後轉reviewed；補回butter的塗抹動詞英英解釋。另在U01 pig補回原英英解釋漏掉的動物義，原金屬錠／動詞內容保留，整詞draft不變。67筆實際修正列已在App IndexedDB唯讀重讀，欄位與新內容雜湊全符合。\n\n圖片限制：elephant的內建修圖輸入無法解析Windows路徑；sun新圖Library ID [private artifact identity omitted]，本機正式helper因缺os.setxattr失敗，目的地無檔，均未接入。精確原圖、映射、雜湊、修正草稿與新圖身分見image-repair-drafts.json。舊sunbathing圖保留，不能把sun himself例句自動標配圖通過。\n\n檢查繼續U03（正式順序第一張LV1-U03-02 cat），已建立22圖句／104例句快照。lint已通過；build曾通過、最終資料補充後仍需重建；完整tests以30秒上限執行中，初跑5秒逾時原始證據保留，獨立14項診斷通過。\n`);
const u1=read('docs/unit-audit-20261105/LV1-U01-ledger.json');
u1.counts.definitionSupplement=1;u1.definitionSupplement={id:'W000646',word:'pig',state:'applied_and_reopened',evidence:'output/playwright/unit-audit/u01-pig-definition-after-ui.txt'};
writeFileSync('docs/unit-audit-20261105/LV1-U01-ledger.json',JSON.stringify(u1,null,2)+'\n');
console.log(JSON.stringify(ledger.counts));
