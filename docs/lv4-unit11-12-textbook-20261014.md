# LV4 U11–U12 文字教材候選

分支 `draft/lv4-u11-u12-textbook`，checkout `C:/Users/USER/Documents/Codex/2026-10-14/task/vocab-app-lv4-local`。第五批固定基底 `772bd4de57ec539af8d0f666d5b6d18e1ae4684b`，先納入首批修補c301a0b為 `9cbbd9f80921459d3c63ab997e19624cc8397cd6`，再新增本批。產品／來源／測試的修補Git物件與原c301a0b完全一致；清單衝突保留U3–U10紀錄與p22 pending。各固定候選不改寫；父任務集中QA、PR、整合與部署。

| 項目 | U11 | U12 |
|---|---:|---:|
| 逐頁目視正文 | p113–122 | p123–135 |
| 編號主詞 | 30 | 38 |
| 無編號獨立主詞 | 16 | 9 |
| 主詞合計 | 46 | 47 |
| 補充詞（含印刷註詞） | 57 | 96 |
| 詞彙字卡 | 103 | 143 |
| 印刷用法／註記 | 38 | 47 |
| 完整群組項目 | 141 | 190 |
| 唯一既有正式ID | 74 | 112 |
| 無正式ID文字項目 | 27 | 30 |

跨單元186個既有正式ID；啟動包2,547→2,645字，新增98個已有ID，舊2,547列逐欄不變。57個無映射文字項目保留核對中文與詞性，不猜別字、義項或新ID。既有守城仍依原字形及教材詞義篩選，不等於無ID項目在所有模式均不可玩；一般正式ID練習與Direct教材題目仍排除它們。

## 原件與修正

來源 `scripts/sources/LV4Unit11.json`、`LV4Unit12.json`含照片／初稿完整路徑及SHA-256、冊別／Unit／頁碼、主補身分、精確映射及用法中文。原圖根 `C:/Users/USER/Downloads/Mobile Devices/LV1/LV4/`；原文字在 `C:/Users/USER/OneDrive/桌面/單字APP/書頁快抽/` 的p111–115、116–120、121–125、126–130、131–135初稿。採用內容逐頁對照片重核；p123標Unit12，p136目視Notes，p137標Unit13，正文無缺頁。

U11心理學家／心理學同時有獨立主詞與跨詞補充用途，各自保留learningItemId，正式卡去重。獨立藍字audio、audio-visual、rhyme及voluntary等保留主詞身分。補回p115 casualty、p117 proficiency、p119 dance to印刷註記及p114 Stephen King印刷人物註記；p121 frail照片印「虛弱的」，未沿用初稿「脆弱的」。

U12原書實際47主詞，不強補或縮成46。protest動詞p124及名詞p125分卡；peculiar的四個補充形容詞續至p127。grind p129的「書呆子」、ground的土地／禁足／停飛義及不同三態、p130 calligraphy、p133 statistics及p134 and連接名詞的主詞動詞一致註記均保留。初稿由例句推導的cope／deal with／handle、the terror of、withdraw from及dispute about／over句型未採用。例句全文、手寫記號、待審圖句、正式senseId和教材題目均未匯入。

## 驗收證據

證據根 `C:/Users/USER/Documents/Codex/2026-10-14/task/lv4-evidence/`。

- fresh npm ci、lint、typecheck、production build及完整85檔／498項Vitest全過（Windows本機timeout30秒，CI設定維持15秒）；對應 `npm-ci-u11-u12.log`、`lint-u11-u12.log`、`typecheck-u11-u12.log`、`vitest-u11-u12.log`、`build-u11-u12.log`。
- LV3 Python8＋6＝14項與LV4 Python7項全過：`python-lv3-u11-u12.log`、`python-lv3-nostalgic-u11-u12.log`、`python-lv4-u11-u12.log`。
- `content-audit-u11-u12.json`驗採用照片／初稿／Notes／下Unit照片雜湊、186個映射、舊啟動包列與U1–U10／U17–20／正式字庫／meta／SRS／schema／獎勵產品檔案Git內容一致；`repair-dependency-u11-u12.json`核首批修補物件一致。
- 新驗收以空fake IndexedDB一次sa-pack fetch解析U11 74／U12 112正式卡，核頁範圍／編號序列、心理學跨來源卡、protest兩詞性與ID去重。全套同時回歸13張非空進度表、SRS、35金幣及U17自訂群組／反向排序保留。
- 新隔離Chrome390px核U11入口103／38、favorable p113至macaroni p122、用法中文及141項群組／74正式卡；U12入口143／47、anxiety p123至aristocratic p135、protest動詞p124及名詞p125、190項群組／112正式卡、一般練習upright 1／10。無橫向溢出、console errors0：`browser-u11-u12-entry-verified.log`、`browser-u12-verified.log`、`browser-u12-quiz.log`、`browser-u11-u12-console.log`。

p22維持來源pending，依父指示不阻塞其他單元。母表、原件、其他工作樹、真實用戶瀏覽器進度唯讀；既有U17–20不重做。集中整合須依全部合併教材重產啟動包；實體手機、Safari／Firefox及正式站部署未驗。
