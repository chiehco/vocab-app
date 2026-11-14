# LV3 U09 完整來源審閱與修改前封存

## 目前階段

來源審閱與BEFORE完成，產品仍未修改。基準00a7d7d76667d6a3d91c6e7517c9d839e4bbcb4d；父任務另有文件提交47f6be8f759bb8393c7c09981562ef85b77f4547，144產品輸入不變。未compile、product seal、apply、test/build、commit/push/deploy。本報告不是修正後或發布完成聲明。

精確合併394欄／183列：教材274欄／127列，一般詞87欄／34列，例句29欄／18列，notes4欄／4列。5欄受現行契約阻擋，另有389欄／182列的field-allowlist相容集合。後者只是診斷分流，不代表已compile或建議在錯誤標題未修時直接部分套用。

## 逐列來源與保留

- 108教材詞、63文法、81一般詞語義及用法、115例句、30notes、13senses逐列覆蓋，所有完整beforeRow、欄存在性、原值、路徑、實際主鍵與修改候選均核對目前source及已封存BEFORE。零重複／衝突／無效修改；完整原列、原status／review／rare及ID保留。
- 詞彙與文法審查者各自目視p83–94及p95 Unit10邊界13張來源照片並核對hash。協調者另獨立目視p86/p92正向頁面預覽，確認兩處轉錄限定詞。原source JSON、原照片與主Excel未改。
- 24個教材占位義補齊，27個null-ID仍null／read_only。教材限定本章，正式一般詞保留有依據的其他義；11列僅同義措辭差異不改中文。6個名詞片語／縮寫的n.是明示的語法正規化，不冒稱原頁另印n.。
- 63個explanation由原頁補足教學內容，明確不是63個事實錯誤，也不代表採用新例句或題目。8筆清楚的例句詞性錯誤、9筆stop例句的context-specific詞性／meaningHint、4個notes範圍或被動義與10詞的18個用法欄有來源候選。
- 16筆新增verbForms都有Collins主詞條明示past tense／past participle，或conjugation的Past Participle及Past直接章節；publisher、URL、locator、精確摘錄、日期與verification齊備。8筆既有三態保留，不冒稱本輪重驗其所有來源。sculpture仍缺直接雙標籤證據，不推論、不填入。
- 原115句blank＋answer全部能精確還原原英文。正式試題／教材原句來源未逐一外查，exam／reviewed標記不升級。inferior名詞真實存在，舊needs_check與刪除建議保留，不擅刪義或升級狀態。音標／音節／重音／發音未補。

## 五個精確契約阻擋

1. G023 pattern：原「-ior結尾的形容詞表比較，不與than並用，與to並用」漏掉原書「若干」。最終候選「若干以 -ior 結尾的形容詞有比較級意味，與 to 並用，不與 than 並用」。保留提醒形式；superior／inferior／senior／junior列於explanation，不為guard方便改成另一種片語。p86，20260815_093134.jpg。
2. G055 pattern：原「top the charts（chart用在唱片語中恆用複數）」誤讀「在上列片語中」。候選「top the charts（此片語中的 charts 用複數）」。p92，20260815_093256.jpg。
3. EXc9bfeeee sentenceEn／sentenceZh／blankSentence三欄：原France has been a republic since the late eighteenth century.暗示不中斷共和，法國官方歷史明示第二帝國。最終改候選France first became a republic in the late eighteenth century.／法國在十八世紀晚期首次成為共和國。／France first became a _____ in the late eighteenth century.，答案republic及原狀態不變。國民議會直接來源明示1792年首次共和，Élysée1795憲法亦記錄成立日期。原「France is a republic.」候選因刪掉時間資訊未採；v1完整保留，v2差異可追溯。

這是兩個轉錄修正與一個protected例句史實修正，不能混成圖句修改授權。尚未放寬guard；完整beforeRow及來源見blocked-contract-review-packet.json。v2相對grammar v1只改France三欄與G023 pattern，其餘112候選核心完全不變，來源表示方式另有等價整理。

## 圖片的新授權與執行範圍

21張active圖已全部目視；81一般卡／278tabs沒有額外圖，HTTP／decode／尺寸／source bytes與caption均吻合BEFORE。persuasive右側傘收合，原雙語caption卻說撐開，兩位審查者各自目視確認。

使用者後續已授權既有範圍內缺圖／不符句意圖片直接依風格規格修補，不需逐圖再批准，但不得為圖改原句意思。原圖審「待批准」是當時歷史狀態，不再當現行授權阻擋。persuasive修圖由root的隔離任務處理，本來源任務沒有生成、套用或驗過新圖；其後需同驗W003733與LV4 U01 LI-LV4U01-V042。原BEFORE與原圖caption證據不改。

60個無active一般詞不等於60張欠圖。依現行text_only／nullable resolver／registry與素材證據，明確應有圖而缺失0、原本允許無圖60、無法確認0，沒有自動生成清單。句源另外分30 reviewed、2 draft、1跨教材workExampleId、27無原句；27 null-ID不造正式ID。逐列判斷、原句、風格尺寸及consumer見images/image-execution-plan.json。quote／release原缺英文caption保留；medium的一般圖呈現不同真實義，不當錯圖刪除。

## 修改前封存與獨立預期

BEFORE固定805檔，171教材／81一般卡／278tab、610截圖、13條390×844路徑36視圖，Back／reopen與五階段完整ContentDB／ProgressDB／settings／storage保存全過。保留2 groups、2 reviews、wallet10、cap15，僅正常導航bookmark更新；無新群組、答題、獎勵、SRS或DB注入清除。不是實體手機。詳見U09-before-qa.md及U09-before-capture.json，不改這兩個原文件。

本合併再逐檔驗805封存檔及兩份外部文件，全部hash不變。144 input_paths raw／LF／bytes與baseline完全相符，原scripts/sources/LV3Unit9.json另行保護。

獨立預期直接使用已核before documents與候選計算，含完整expected-after rows、每欄值／source／proposal hashes、四個完整source documents及Node JSON.stringify SHA256。未從未來compiler或actual-after回填。generated pack/meta與未來timestamp不在這份確定性文檔預期內，須後續單獨驗證。

主檔：accepted-proposals-draft.json及independent-expected-after.json；389欄診斷版本為field-allowlist-eligible-proposals.json及independent-expected-after-field-eligible.json。根目錄source-manifest-revision-v2.json是grammar來源的逐位元複本，canonical的69個evidenceTextRef逐pointer／sourceId／URL全部可解析。所有公開候選不含私人絕對路徑或內部工具引用。完整核對見review-validation.json、canonical-source-reference-verification.json及final-consolidation-index.json。
