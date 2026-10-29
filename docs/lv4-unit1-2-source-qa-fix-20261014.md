# LV4 U1／U2 來源QA修補候選

> 2026-10-29訂正：使用者已查閱實體LV4書並確認p22為空白筆記頁，原空頁確認缺口已解決，不再要求補拍。本文下方pending／23單元描述保留為2026-10-14歷史狀態；本批入口修正與驗收見 [本次訂正](lv4-u2-notes-confirmation-20261029.md)。

基底固定 `03bd97ab14e7a2df30b843bdd4ad8996a10ec5b4`；獨立分支 `fix/lv4-u1-u2-source-qa`；checkout `C:/Users/USER/Documents/Codex/2026-10-14/task/vocab-app-lv4-local`。U3–U10各批固定分支／commit保存，本修補不混入後批教材。父任務負責獨立重驗、PR、合併與部署。

## 來源修正

對原照片再次目視確認三項P2，照片／原稿／母表不寫入：

- p5編號12 research是名詞「研究（不可數）」，其下獨立藍字research是動詞「研究」。保留兩張不同learningItemId的來源卡，都精確對應既有W003843；一般正式字卡仍只有一個research ID。
- p5星號註記the 1500s／16世紀保留成read_only用法，不造正式wordId、senseId或題目。
- p19補拍照片atmosphere印刷中文為「大氣；空氣；氛圍」，來源、教材卡與守城提示同步修正。

U1修正後46主詞（23編號＋23無編號）、56補充詞、102詞彙卡、33用法、完整135項群組、83唯一正式ID；U2仍46主詞、81補充詞、127詞彙卡、37用法、完整164項群組、102唯一正式ID。來源revision改為 `20261014-text-2`。

`build_text_unit.py`接受來源可選learningItemId並拒絕不符單元前綴或重複ID；本次將U1既有133項的原ID明列到來源，只新增 `LI-LV4U01-V102`（動詞research）及 `LI-LV4U01-G033`（世紀註記）。新卡放回正確閱讀順序而不移動任何舊卡的ID。未提供明列ID的既有來源產生方式維持不變。

## p22證據pending

p22完整原照片仍缺失。快抽稿與缺頁清單說「使用者確認無內容」，但沒有原話、日期或對話出處；不將助手記述當成原始用戶確認。來源 `boundaryEvidence.notesConfirmationStatus`明列 `pending_original_user_message_or_full_photo`，未猜補內容，也未宣布U2全頁完整驗收。

本次Personal Context回覆「Personal context is unavailable for this conversation.」。唯讀搜尋三個相關本機Claude原始對話目錄及Codex history.jsonl，未找到匹配的用戶p22確認；真實LV4照片根、Mobile Devices及桌面書頁批次／書頁整理未找到完整LV4 p22補照。p23照片左側局部Notes不足以判定整頁。需父取得可追溯用戶原話或完整補照後解除pending。搜尋證據 `p22-user-evidence-search.json`及 `content-audit-u1-u2-fix.json`，沒有權限拒絕或不確定寫入。

## 修補驗收

證據根 `C:/Users/USER/Documents/Codex/2026-10-14/task/lv4-evidence/`。

- fresh npm ci、lint、typecheck、production build exit0；定向 `lv4Unit12Text.test.ts` 9項全過；完整80檔／463項Vitest全過。Windows本機timeout30秒，CI設定維持15秒。對應 `npm-ci-u1-u2-fix.log`、`lint-u1-u2-fix.log`、`typecheck-u1-u2-fix.log`、`target-u1-u2-fix.log`、`vitest-u1-u2-fix.log`、`build-u1-u2-fix.log`。
- LV3 Python8＋6＝14項、LV4 Python7項全過：`python-lv3-u1-u2-fix.log`、`python-lv3-nostalgic-u1-u2-fix.log`、`python-lv4-u1-u2-fix.log`。
- `content-audit-u1-u2-fix.json`逐項比較原首批全部learningItemId及內容，除research名詞與atmosphere指定中文外所有舊項目逐欄一致；僅新增上述兩項。原啟動包2099詞、正式字庫／meta／lockfile／SRS／13表schema／守城／獎勵產品檔案／其他教材Git內容一致；LV3 U4–U10重建與既有提交相同（正規化checkout CRLF）。採用照片及初稿SHA-256均吻合。
- 定向測試實際核research雙卡、一般正式ID去重、世紀註記無正式ID／題目及守城ATMOSPHERE提示「大氣；空氣；氛圍」。全套同時回歸13張非空進度表、SRS、35金幣與U17自訂群組／反向排序保留。
- 新隔離Chrome在390px正常UI核U1入口102／33，research名詞卡26及動詞卡27各在p5，世紀註記33／33顯示16世紀，完整135項群組／83正式卡；U2入口127／37，atmosphere卡39在p19顯示氛圍。無橫向溢出：`browser-u1-u2-fix-entry.log`、`browser-u1-fix-research-options.log`、`browser-u1-u2-fix-verified.log`。
- U2守城正常入口125詞，實際iframe出題池含ATMOSPHERE／大氣；空氣；氛圍；正常鍵盤啟動及暫停成功：`browser-u2-fix-siege.log`。這是實際前端輸出的提示核驗，未修改遊戲、注入題目或操作真實用戶資料。

未映射41項的一般正式ID練習及Direct教材題目排除；沿用既有守城字形篩選時40項仍可使用本輪核對的教材中文，不等於各模式完全不可玩，也不推定正式ID、SRS或客觀發幣。沒有改用戶真實瀏覽器進度。實體手機、Safari／Firefox、正式站部署未驗。
