# LV3 U08 全面審閱與接入

## 最新狀態：已套用，等待後續QA

258欄／87列已依獨立預期套用；Oxford discomfort的精確來源guard已在dee4c5f驗證提交，不再是阻擋。官方compiler、獨立seal、9-method TEMP、Python／TS parity、7祖先投影、主樹receipt及5raw備份／139不變輸入、零寫入冪等與直接U07反投影全部通過。U08 chain為committed，ledger為applied_awaiting_after_qa。19新三態與8舊三態核對，starter精確改30列，圖片與圖說零修改。

詳見U08-fixture-validation.md、U08-application.json及獨立預期。未commit／push／deploy；套用後技術與瀏覽器QA尚待完成。原before-capture及807封存未改。

## 以下保留來源審閱時的歷史階段紀錄

下文的「未編譯／待guard／不可套用」描述來源審閱當時的歷史狀態；後續已完成apply，請以U08-application.json及U08-fixture-validation.md為目前狀態依據。原始來源歷程、候選、證據限制及來源裁示仍保留。


## 目前階段

基準提交：b7f55393aec303f7bc0b57948f518b8d989ee02d；分支 content/lv3-unit-audit-20261107。本輪只整理審閱證據，未編譯、封存、套用、改產品、提交或推送。修改前畫面已完成封存並逐列綁定；等待Oxford guard驗證與下一步明確指派。

原始合併草稿 258 欄、87 列保持凍結。修訂草稿同為 258 欄：教材 195 欄／57 列、一般字卡 62 欄／29 列、例句 1 欄／1 列。239 個非三態欄位與原提案完全相同。19 個三態都有明確兩態來源；其中18筆符合目前 Collins 來源契約，discomfort 的 Oxford 直接證據充分，但現有程式只接受 Collins，尚待獨立契約審查，不能封存或套用。

## 逐列與語義核對

- 與目前檔案完整比對：98 個教材詞、49 個文法項、81 個一般字卡、99 則例句、33 則 notes、6 則 senses。提案的完整 beforeRow、欄位存在性與值、路徑、主鍵、ID 全部吻合；沒有重複欄位、衝突或無效修改。
- 14 個補充詞占位義已提出原頁依據；全部16個 null-ID 仍為 null／read_only，沒有新造一般字卡。suspect 兩個獨立教材項不合併。
- 原稿頁碼73–82及83頁Unit09邊界的目視紀錄來自詞彙及文法審查者。本整合檢查引用的照片檔名、頁碼、SHA-256與來源清單一致，不宣稱重新目視全部照片。
- 教材義限定當章；一般字卡罕見義不因少見刪除。morale 的道德義有 Merriam-Webster 直接來源，保留。cattle 只移除 a cattle、保留 the cattle。advertise／advertisement／ad 的拆分義、beneath副詞、fence動詞、buffalo動物義、scale(s)磅秤義與搭配修正均逐項覆核。來源未明的地址等舊義仍註記保留。
- 49個既有文法句型保持原樣。G007–G009只加說明，區分 native／indigenous 的原生義與 unique 的獨有義，並指出原書等號過度概括。無句型guard擴張。
- EXc280e310僅 sensePos v.→n.；原99句英文、中文、填空、答案、ID與狀態不變。99句填空加答案皆可重建原句（大小寫不敏感比較）。考題標籤不等於已核官方原題；decorate的draft不升級。

## 三態的來源與契約

原19筆均以MW網址及規則動詞推論說明，不能把推論稱為來源直接標示過去分詞。補證逐筆提供直接讀取的精確摘錄與頁面章節：17筆Collins主詞條 Word forms、jug 的 Collins conjugation、discomfort 的 Oxford Verb Forms。整合者逐項核對摘錄與三態值，直接開頁行為歸屬原詞彙審查者，沒有虛稱另一次現場查讀。

修訂只改19筆的 afterValue.sourceRef、理由與來源證據；base／past／pastParticiple／status及before身份完全不變。原來源仍保留並註明證據限制，新來源含逐字摘錄。每項差異保存在 proposal-revision-decisions.json。

fuel保留 fueled / fuelled。Collins明列 fuelled 的過去式與過去分詞，並註明美式用 fueled。現有 trustedVerbForms 接受非空字串並核對base；RecordedMeanings原樣呈現；既有learn、get、show等已有斜線變體。現行 lv3_audit_pipeline.py沒有單一拼法限制，但只允許Collins來源。舊 apply_lv3_unit_audit.py另有小寫字母限制，不能混同現行流程。本輪沒有改guard或靠型別字串草率放行。

discomfort（W005269）使用真實Oxford網址：https://www.oxfordlearnersdictionaries.com/definition/english/discomfort_2 。來源明列 past simple discomforted、past participle discomforted。Collins conjugation回403，不偽掛Collins。此筆是已核實語言內容的程式相容性阻擋，不是來源不明。父任務另評估最小且具負向測試的契約支援；本輪保持候選、不得套用。

## 圖片與保留事項

22張啟用圖片已由圖片審查者審閱，本整合採用零項圖片／圖說修改。suspicious 的 cookies→a cookie 未採用：父審查者直接查看 W003936.webp，單張可見一塊餅乾不排除其他被遮住的餅乾。protect疑慮已排除。protect／purify／substantial缺英文圖說、chew缺雙語圖說，以及三格sprite sheet用途仍待來源釐清；不編造圖說或美術。

既有8筆三態保留，不聲稱重新查過其來源。音標／音節空值不填、未做發音驗收。discomfort／underneath無連結補充、罕見歷史義及exam原題來源限制完整保留於validation的retainedIssues。notes及senses不改。

## 交付與可重現性

- output/lv3-audit-20261107/u08-source-review/accepted-proposals-draft.json：原258欄凍結草稿。
- accepted-proposals-revised.json：258欄修訂來源草稿；只有discomfort仍受現行guard阻擋。
- independent-expected-after.json及independent-expected-after-revised.json：分別直接從候選與目前before列計算的獨立預期列／欄位，以及Node JSON.stringify SHA-256；未使用未來compiler或actual-after。
- review-validation.json與review-validation-revised.json：原始與修訂驗證、計數、限制、輸入雜湊；後者為最新狀態。
- proposal-revision-decisions.json：每筆唯一差異、理由及discomfort處置選項。
- sources/：原始來源逐位元複本及雜湊，僅限未追蹤的審閱溯源，不提交或公開附件。

所有相關產品輸入雜湊仍吻合。公開候選與本報告不含私人絕對路徑。未執行compiler、seal、apply、測試、build或瀏覽器驗收；本來源報告不能替代後續完整實際驗證。

## 修改前封存綁定與最終來源版本

已逐檔重算807個封存產物的大小及SHA-256，與before-seal-index完全一致；144個產品輸入的raw與LF雜湊及獨立map一致。147個教材項與封存source inventory及目前檔案完全相同；81詞、99句、33 notes、6 senses逐列同時符合封存source與installed資料。這是資料與封存來源綁定，不冒充所有欄位可見或實體資料庫位元驗證。

最終候選為 accepted-proposals-revised-v2.json，原始及前一修訂均保留。v2只將discomfort最後一項來源改成原Oxford補證的公開安全精確形狀：移除retrievalTool／toolResponseRef，加入穩定findingId U08-VOC-252，其餘來源欄位原樣；所有產品after值不變。對應獨立預期為 independent-expected-after-revised-v2.json。完整輸入／輸出索引見 final-consolidation-index.json 與 before-capture-binding.json。

候選SHA-256：c13b918569899f8528528169f9aff2e6aeb3705e91458eaf641b4229f7800539。仍未執行compiler、seal或apply。
