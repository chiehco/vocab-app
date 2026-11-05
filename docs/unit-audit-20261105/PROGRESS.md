# 逐單元全面檢查與修正

## 目前狀態

更新：2026-11-05T23:07:35.000Z。U25的52組原稿／已發布圖句、52正式詞、80例句及69筆筆記已讀；52原圖實看，52單元卡、52一般卡80例句、30搭配頁及24詞48三態面板均已after重開。儲存讀回2321列零差異，正常App更新14張進度表不變。本機最終檢查：passed；新提交仍須自己的完整CI。

已保存54列主補丁92欄、24個真缺鍵三態，共78列116欄；含覆蓋及精度改善，不是116處全錯。wake只替換06:30時鐘圖，單元／一般卡雙入口已驗，原圖、原核准hash及兩正式例句保留；其餘725圖句配對不變。4份資料精確逆向還原等於c38b0b1，24缺鍵以delete還原，不用null。

U24提交c38b0b1ee4aa5f8cf6f91c2122471343b7f25266自己的完整CI42122011505／job127576528663成功：216檔1756測試，Python14／7／36／10及lint/typecheck/build全過，build2026-11-05 22:43:17 UTC完成，見validation/U24-ci-c38b0b1.json。較早各head成功及歷史失敗保留，不能替代U25新head驗收。

U25仍保留hang／wake三態分義呈現、festival舊形容詞語義範圍、modern複合義項、collect卡片種類、twice無面額硬幣價格及uniform語境等限制。76個空提示不算缺漏，現有4提示均逐句核讀不改。兩次導航中斷的失敗日誌與限縮重驗保留，未提高逾時或放寬斷言。

先前U25 before未完成及wake未接入限制已於本次更新日期解決。下一個既有資料單元是LV2 Unit27，從pride／LI-LV2U27-V001開始，text_only／read_only；尚未開始，不因無圖當欠圖。未merge、deploy、開PR或改發布模式。

## 實際範圍與順序

依本機App實際textbookUnits建立MASTER-INVENTORY.json：146個單元、19,726個教材項目，其中127個curriculumUnits，另外19個LV1已發布圖片子集。母清單同時列出source-art/LV1的1,736組保留原稿與1,010組未發布原稿。盤點不算目視通過；原稿與已發布、文字單元分開。U16–U21是text_only，其無圖不能直接判成失效圖，也不因設計如此就標語文已檢。

U01原稿38／已發布38；U02原稿38／已發布38；U03原稿46／已發布22／未發布24。此前22張的U03結論只對已發布子集成立。

|檢查來源|U01|U02|U03|
|---|---:|---:|---:|
|已發布單元卡實際開啟並目視|38|38|22|
|額外未發布原稿目視|0|0|24|
|一般卡修改後重開|38|38次／37詞|46詞|
|去重正式例句核對|206|197|185|
|詞性修正|15|11|8|
|draft例句實際核對後reviewed|3|6|2|
|needs_check義項實際核對後reviewed|19|12|10|
|補入一般卡缺圖|0|0|15|
|修正一般卡圖句對應|0|0|3|

## U03本地修復與驗收

24份未發布原稿全數看過原PNG與caption；46個一般詞卡重新開啟，185個原例句、中英翻譯、填空及英英解釋均逐筆核對。15張一般卡確實無圖，已在獨立auditedWordIllustrations登錄精確原稿圖句，另修window的無雪圖配下雪例句、egg的3顆蛋圖配5顆蛋句、bus的等車圖說並列下車句問題。所有原正式例句仍逐字保留在字義頁；原圖片與原稿未刪改。18張版本化WebP原尺寸1254×1254、quality85，18組實際重開路徑與中英圖說全符合，24一般卡81句重開零差異。

沒有將24原稿加入未發布教材單元或lv1ReviewedImages群組，也沒有部署。圖像合格不等於整個多義字通過。13個原draft摘要、cat來源分欄已補充、grandfather資訊義中文精度仍待核、next to詞性分類邊界、未拆義與尚未收錄的動詞三態等均在逐卡ledger保留。

U03另修love動詞、pen撰寫動詞，修banana截斷英英解釋、cute破損中文與缺常用英英義、pen／only漏義；本單元合計24筆明確列修正。累計91筆實際改列已在App IndexedDB唯讀重讀，欄位與完整資料雜湊符合。完整字典安裝前後14張隔離瀏覽器進度表完全相同。

## 未解圖片限制

歷史紀錄（2026-11-05）：U02 elephant原尺寸確認有兩個多鼻狀灰部件，當時本機圖片編輯未成功；2026-11-05已接入修復圖並重開驗證完成。sun當時的取檔限制已於2026-11-05解除，日出新圖已接入並在兩個入口重開驗證；詳見LV1-U02-sunrise-review.json。舊sunbathing圖保留，另一例句未自動標配圖完成。

## 可回復紀錄與保護

每筆before／after、依據及完整原列見各patches.json與receipts/。unitAudit.testSupport.ts先核對精確新欄位，再逐筆反向還原允許修改；舊歷史payloadHash完全保留，未改欄位仍必須符合原基準。meta的現行wordsHash與contentHash另外由完整檔案重算驗證。圖片測試逐一核對18張資產hash、正式ID、精確圖說及錯誤ID拒配，並斷言未發布單元清單仍726／U03 22。

驗收原始檔與截圖保存在output/及output/playwright/unit-audit/；單張完整UI證據路徑在ledger。相關4檔17測試曾通過；最後18圖的精確補測、lint與最終build狀態見validation/。最初全套5秒逾時、30秒全套中斷原始證據保留，未宣稱完整suite通過。

## 上一 checkpoint 位置

U03的原始下一卡為U04-01；最新位置見下列U04 checkpoint。

## LV1 Unit 04 checkpoint

完整原稿36張，已發布子集5張，36張原稿與19張既有一般卡圖片均已實際目視。修正後重新開啟36張一般卡及5張單元卡，198原例句／英中翻譯、英英解釋及填空均零差異。17張實際缺圖已補，else水果選擇圖配會議遲到句、red紅色畫筆角色配派對紅洋裝句兩組已修成原稿的完整圖句；19組新資產路徑與中英圖說重開全符合。原圖與原例句保留，31未發布教材原稿維持未發布。

38筆實際列修正：6筆明確詞性錯置、7筆draft與5筆needs_check例句、9筆needs_check與1筆draft義項、for整詞needs_check，以及9筆字義欄位修復。for含兩個for的例句填空是第一個for lunch，保留prep.；clock襪側繡花真義保留，沒有因罕見刪除。television原稿NOID使用既有W000863映射，移除非本詞電視義的轉移向量混入，完整舊列可還原；未虛構編號。累計129改列已在完整字典唯讀重讀符合，14進度表仍完全相同。

測試原4檔16過1失敗已定位為目視證據描述字串格式；統一真實紀錄格式並保留原actually viewed original斷言後針對性重跑，結果見validation/u04-art-final-test.txt，原失敗證據保留。其他3檔15項已通過；lint與build通過。未宣稱完整suite通過。

可回復的前一提交：a0102dde197b6baabc26a23666736464d05f0f25（U01–U03，71檔）。U04完整before/after、逐卡目視與重開證據在LV1-U04-patches.json、receipts/、LV1-U04-original-image-review.json與LV1-U04-ledger.json。歷史狀態：當時sun與elephant未完成；sun已於2026-11-05接入並重開通過，elephant也已於2026-11-05接入並重開驗證完成。

下一張：LV1-U05-01 give；完整原稿32張、已發布子集13張。其他未檢卡仍not_checked。

## U02 sunrise follow-up

U02-32 sunrise replacement verified by exact SHA-256, 1254×1254 dimensions and actual compressed pixels; both the unit card and general card were reopened and visually checked. The original sunrise sentence and all six dictionary examples are unchanged. The old sunbathing image is retained; the other sun-himself example is not automatically marked as paired. U02 now has 37 consistent image/caption pairs and one remaining elephant anatomy repair blocked by the image-edit input limitation. See LV1-U02-sunrise-review.json for exact before/after paths, hashes, approval history and UI evidence.

## LV1 Unit 05 checkpoint

完整原稿32組、已發布13組；32張原始圖片與27張既有一般卡圖片已逐張實際目視，13張單元卡實際開啟，30個有正式ID的一般詞卡修改後重新開啟，171筆例句／翻譯／填空核對零差異。3張一般卡缺圖（worker、sorry、tell）已補，eat的吃飯圖配腐蝕例句已修為原稿的上學途中早餐圖句，原腐蝕例句保留。4張最終重開截圖均已目視。19份未發布教材原稿仍未發布；useless與coworker沒有正式字庫ID，分開記錄，未造號。

122筆列修改：4個明確單一詞性錯誤（live concert、keep still、feel well、a cold drink），另74個複合標記精準化及78筆用法提示、10筆draft例句與23筆needs_check義項核對後更新、11筆文字定義修復。所有原例句保持原意與原字串，詞頭多詞性不縮減；greats及real find名詞義均有詞典支持，保留。當時even考題來源尚未核；2026-11-05已核對官方Q23及答案，僅該義項完成來源補充，練習句保留另寫身分。

30張一般卡重開後圖片皆可顯示；累計251改列與內容hash從實際IndexedDB讀回全相符。第一次載入檢查因頁面導覽中斷，未推定成功；先核對實際保存內容，再作穩定的冪等檢查，14進度表完全不變。相關5檔21測試、lint、build通過；未宣稱全套suite通過。

前次對外checkpoint：47958136d6df58dfbe9435ce5e666a1c98caa15d，已核實遠端獨立分支同SHA，含U01–U04與sun修復。U05實際before/after與重開證據見本單元ledger、patches、receipt及validation。下一張：LV1-U06-01 most，完整原稿51組、已發布子集23組。

全App的19,726為教材項目盤點：13,101個vocabulary項目、5,899個grammar項目、726組已發布LV1圖句。它不是已核實字卡總數，亦不代表均已檢查；未檢項目仍not_checked。

## LV1 Unit 06 checkpoint

完整原稿51組、已發布23組、47正式詞條與237例句。原圖51張與原一般卡37張均逐張實際目視；47一般卡修改後全數重開、內容與圖片皆符合，12張最終修圖卡截圖另已目視。10張一般卡缺圖已補，follow的跟隨人物圖配遵循指示句、line的排隊圖配店家沿街排列句已改用原稿精確圖句；所有正式例句保留，其他例句不自動標為已配圖。

194筆列修改包含7筆單一詞性錯誤、121筆複合詞性精準化、10筆draft例句與36筆needs_check義項完成核對後更新，以及20筆字義／用法列修復。least的截斷英英解釋、while錯誤的to V模板、movement混入move動詞解釋均已修。名詞feel、hold、keep及動詞case有詞典支持，保留，不因罕見刪除。4項NOID與28份未發布教材原稿界線保留。

累計445改列與內容hash實際讀回符合，14進度表不變。相關22測試與Python5負向測試、build通過；另完整CI揭露的兩個既有固定hash測試已按精確patch反向還原修復，舊fixtures未改，兩個原失敗測試加starter保護負向測試共8項通過。最後typecheck/lint見validation，該checkpoint後續已推送為2337abd4，完整CI41977386293於2026-11-05 06:12:37 UTC全過（209檔／1,653測試）。

本輪同時完成U02 elephant替換圖的hash、尺寸、像素及雙入口重開，38組U02圖句均核心一致；這不代表所有詞條義項自動通過。前checkpoint為af165704178eb5b3b5bd453af3c3f42da07a6445。下一張：LV1-U07-01 stand。

## LV1 Unit 07 checkpoint

93組完整原稿與51張原一般卡圖均實際目視；37張已發布單元卡及78張正式詞卡修改後重開。276正式例句英文、中文與填空答案均核對；27個一般卡缺圖及manage／mind兩個配對修正已完成，29張最終圖卡截圖逐張目視。56未發布原稿維持未發布，15個NOID補充／變化形不捏造正式ID。

156個文字列修改包含16個明確詞性錯誤、91個複合詞性精準化、16個draft例句與9個needs_check義項實核後更新，以及24個字義／搭配列修復；同一批詞性列另有90個中文提示精準化，不重複計為新改列。原英文、中文例句與答案未改。既有hobby隼／搖木馬、orderly勤務兵／護理員等少見真實義保留；各詞頭原狀態與未核考題來源不因圖片通過而一概批准。

最初image-binding回歸發現mind被U10舊優先序蓋過，已修一般卡精確配圖優先序並重開核實；單元原路徑不改，其U10開門句配窗戶圖問題另列待修。後續圖片優先序3測試通過，含其他預設與精確單元路徑保護。lint與typecheck的程序退出碼均為0，非僅按起始文字判斷；最終資料回歸、build與Python負向結果見validation。下一張LV1-U08-01 perhaps。

## LV1 Unit 08 checkpoint

97組完整原稿與50張既有一般卡圖片均實際目視；22張已發布單元卡、85張正式詞卡修改後重開。285正式例句英中與填空均核對。35個一般卡缺圖完成接入，35張最終實際截圖皆目視；intersection原圖左轉箭頭與右側麵包店衝突，已換成左側麵包店、保留英中原句及舊圖，單元與一般卡皆重開目視。75組未發布原稿仍未發布，12個NOID不捏造正式ID。

140個修改列包含13個明確詞性錯誤、62個複合詞性精準化、12個draft例句實核後reviewed、25個needs_check義項實核後reviewed、4個已reviewed義項過時註記按真實核對結果更新、24個字義／用法修復。true副詞與校準動詞、people動詞、near左側技術義皆保留。三筆far/near詞性慣例、far句意連接與sow中文貶稱來源仍待確認；缺少的結構化欄位未謊報完成。

U07九義項十筆官方考題來源另有11列精確補充，九卡重開及49例句無差異。active限身體活動量，demanding明示衍生形容詞，appear首次由first修飾；mean現有unlike句為改寫而非原題totally different from逐字引文。每筆before/after及完整來源在對應manifest和receipts中。下一張LV1-U09-01 build。

## LV1 Unit 09 checkpoint

完整96組原稿與14張原有非發布一般卡圖已實際目視。51張單元卡、81張一般卡及301個正式例句修改後重開，17張搭配頁另行核對。18張一般卡缺圖補入；outbreak僅移除唯一站立角色，保留原英中句與舊圖。enter、entry方向仍待確認；building望遠鏡、shatter球、playground複數動作等細節有明確視覺限制。draw原句英中來源矛盾保留needs_check。15個NOID未造正式ID，45組未發布原稿未自動公開。逐卡結果、before/after與恢復資料見LV1-U09-ledger、patches及receipts。demanding衍生形容詞已在實際hero可見，不只留於隱藏note。

## 精確提示、翻譯與三態補充

120個提示候選中117筆已套用，3筆really已由較新的U09精確化而保留。原候選中33筆缺本句義或不相符、87筆只屬過廣摘要縮限，不能把120筆都稱錯誤；129個空提示不當作缺漏。5筆中文只移除未被英文確定的資訊或補足far比較級程度，不改英文。31個動詞三態採字典明列兩欄，不靠拼字規則推測；missing-key sentinel反向還原會真正刪除新增欄位，不以null代替。原全庫雜湊及未涉內容保護均保留。逐筆before/after、來源、UI與持久性證據見VERIFIED-FOLLOWUPS-ledger及三份精確manifest。

U08-92未發布原稿沒有對應單元卡；實際路由顯示person第一張，故僅記一般realize卡驗證通過，不宣稱單元入口已驗收。歷史U09兩份後加測試log的機器路徑已從目前檔案清除；已共享祖先提交保留不強制改寫，精確位置見VERIFIED-FOLLOWUPS-ledger。

## LV1 Unit 10 checkpoint

完整89組原稿、20張既有非發布一般卡圖已實際目視。修改後77張一般卡／264例句、35張單元卡、18張搭配頁重開；28張一般卡修復畫面已逐張目視。mind單元開門與一般卡關窗各自保留精確圖句，原英中句不變。rare／rarely詞族形容詞與副詞在實際hero可見。lie不同義三態、either婚紗句來源語法及部分片語詞性仍待確認；12個NOID未捏造ID，54組未發布原稿未自動公開。逐卡證據、精確before/after、舊圖雜湊與還原收據見LV1-U10-ledger、patches、mind-door-review及receipts。

## LV1 Unit 11 checkpoint

完整79組原稿與8張既有非發布一般卡圖已目視。71張一般卡／192例句、41張單元卡、22張搭配頁重新開啟；24缺圖補入、rest錯義修正，機會／頂尖品牌／鞋碼3張用既有原稿精確化。note與joint的衍生形noted／jointly在實際hero可見，未擴詞頭詞性。agreeable官方題目擷取仍逾時，保留sense draft；plain、notebook、dollar、southern、eastern部分原摘要仍待來源精度確認。earth搭配段數問題經實際畫面查明後保存精確補充；22搭配重開均成功。第一次保護測試並行逾時5891ms，單獨6項成功；身份索引改寫後與建置並行仍逾時。最終單一worker確認6檔24項全過，保留原全部斷言、5秒上限與基準，不宣稱索引消除並行逾時。8個NOID未造ID，38未發布原稿未自動公開。

## LV1 Unit 12 checkpoint

完整84原稿／74正式詞／128例句逐項核查，48已發布單元卡與74一般卡修改後實際開啟；25缺圖補入、wide/practice兩配對精確化。原稿push電梯句配木門圖仍待新圖，未發布；一般卡用既有另一推重門例句，不改原句迎合圖片。stumble完整1254圖與實際單元畫面均看過，杯外液滴與差點灑出保留字面精度疑義。18明確POS、9既有提示精確化、7待審例句及14義項（含108學測purchase Q34 B、stumble Q9 A）分別記錄，真題與另寫練習分開。84文字列含36字義／搭配列，另2筆answer/save三段中文修復；原誤改與實際空中文畫面保留，22搭配重開均成功。10個NOID未造ID，36未發布原稿未自動公開。早期來源補核待隔離分支成果逐筆調和，不能以研究文件視為完成。

## LV1 Unit 13 checkpoint

完整78原稿／60詞／99例句與15已發布單元卡分開核查；18個NOID不造ID，63未發布原稿不自動公開。30缺圖與4具體配對已在實際卡重開且逐張看圖，feed獨立成果仍待整合，depth水深／谷深圖錯配保留原句待修。62文字列及兩份精確manifest／receipt可回復，light和quick真實副詞、partial音樂名詞、Handy/Hill專名、king/queen動詞均分欄保留；belongings複數所有物與singular belonging歸屬感分開。25搭配完整英中可見，wave摘要補充實際重開。99英中例句／填空／答案不變，DB1541列零失敗，14進度表不變。U12電梯圖只保存未發布原稿準備配對，既有general木門配對再次驗證。

## U03–U04 verified forms integration

精確整合86b353f的16個原本缺鍵三態，只新增verbForms；保留本分支U12/U13及全部較早修正。沒有取舊words/pack/meta覆蓋。16卡字卡與字義頁三態、圖片、圖說、搭配及119例句已實際重新開啟；16張實際畫面逐張目視。資料庫1553列讀回零差異，14進度表不變；6090正式詞、5779 starter詞，starter既有12列更新、4列仍未列入，不造列。原31來源與house未變，can仍缺欄，got/gotten及penned/pent限制留來源記錄。12項Python負向邊界與6檔29項精確回歸、lint/typecheck/build通過，原始所有hash基準保留；本次同head遠端CI待結果。下一張仍為U14-01 look，原稿前44圖先看過，不當App開卡驗收。

## U14 checkpoint

完整範圍、逐卡原圖與實際回開、精確before/after、來源與未決事項見LV1-U14-ledger.json及兩份patch/receipt。原726單元圖片與圖說雜湊、早期starter整包基準與未改內容斷言保留；56未發布原稿不因一般卡補圖自動發布，20補充項未捏造正式ID。

## U13 depth image followup

已接入1254×1254山谷剖面圖，SHA256 924029ff52b7e8848d30e86f21f8616f32303e0b6ae7aedd33df1a951af2527e。一般卡與U13-65單元卡顯示新圖及不變圖說，實際畫面均已目視；舊水深圖與完整原核准紀錄保留可恢復。EX4b50cf68是深入講解、EX63e39700是湖深測量，均未改，也未捏造山谷例句ID。words/senses/examples/pack/meta位元hash不變，14進度表不變；6檔30測試、lint/typecheck/build通過，同head遠端CI待本次推送。U15-01 usually已實際開啟修改前字卡，2例句讀回一致，下一張U15-02 often；原稿前8圖已看，不算全單元App驗收。

## U15 checkpoint

逐卡原圖、真實回開、精確before/after與來源界線見LV1-U15-ledger.json、LV1-U15-patches.json、LV1-U15-usage-followup.json和兩份receipt；fairly精確圖修復另見LV1-U15-fairly-zipper-review.json。歷史checkpoint中的當時限制保留為歷史，以置頂目前狀態及各resolutionEvidence為準。

## U16 checkpoint

完整範圍、精確before/after、逐卡回開、25三態、原始逾時與效能修復見LV1-U16-ledger.json、三份U16 manifest、validation/U16-*.json與各receipt。教材原轉錄與原始固定hash均保留；本批五筆早期小修另有各自明確範圍，未把來源查證當整詞批准。
