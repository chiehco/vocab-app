# Persuasive 圖片接入與驗證

## 範圍與來源

本次在 `fix/lv3-u09-persuasive-20261108` 隔離 worktree，從 `47f6be8f759bb8393c7c09981562ef85b77f4547` 接入使用者已授權的圖句不符修正。未改父工作樹、未 push、未部署，瀏覽器主 QA 由父任務接續。

核實 origin 為 `https://github.com/chiehco/vocab-app.git`，fetch `assets/persuasive-20261108` 得到精確 `6b4cce7419566eac04d769a3c5d4b2302fecec1f`。該提交僅新增候選 WebP、prompt、生成 manifest 三檔，本接入完整保留其原始內容及生成時的 candidate-only 狀態紀錄，另存本文件與 integration proof，不改寫歷史。

- 新圖：`public/wordbeast/candidates-20261108/W003733-persuasive-v2-da5d07815314.webp`，SHA256 `da5d078153142abfcbdbfadfc330c86bf8e5823067af53050dbd438e8d71d6d4`，58,956 bytes，1024×1024。
- 原圖：`public/wordbeast/a/W003733.webp`，SHA256 `b0eebf77d0bb4c3249d35bb9bb3dadc40529329e589c8678d66fc66b4c2e7381`，21,596 bytes，1024×1024，原檔保留。
- 原英文不變：Doudou's practical demonstration is persuasive, and a friend opens an umbrella too.
- 原中文不變：豆豆用實際示範說服朋友也撐起雨傘。

新舊實體 WebP 均已直接查看像素。舊圖右側朋友握收合藍傘；新圖右側朋友握連續直立傘桿、傘面已在頭頂撐開，原收合傘消失。左側示範、兩個圓綠角色、幼苗、雨滴、米白紙水彩構圖及尺寸保留。生成式修圖有細微筆觸與紋理差異，不能聲稱其他像素完全相同。這是授權範圍內代理目視驗證，不是捏造使用者逐圖核准。

## 唯一產品變更與歷史保護

`auditedWordIllustrations.json` 末尾增加 `LV3-GENERAL-W003733-20261108` 一列，將精確 `W003733`／`persuasive` 導向不可變含雜湊的新圖 path，沿用完整原中英圖說。原有341列內容及LF bytes保留，現在342列。不改 renderer、fallback、caption 表、任何教材來源、字庫、media、meta、starter pack、ledger 或 chain。

`W003733-persuasive-v2.integration.json` 固定全部144個文字稽核輸入的 U08 checkpoint 指紋，以及原圖、候選、原圖說、來源 JSON、舊證據與 resolver 程式的獨立指紋。新 guard 先驗完整 proof hash，再驗 registry 完整 LF bytes，僅反轉這次唯一追加 token，接回既有 U07、puppet、confirm、replace、bank 歷史鏈。只容許 CRLF 正規化，不放寬空白、鍵重複、行序、未知欄位、其他列或caption差異。

U07 的既有 guard／proof 未改；其兩個測試檔先經新層精確反轉再驗歷史。所有144個輸入均未修改，domain沒有增加、排除或改寫。未更改 `scripts/lv3_audit_pipeline.py` 或 `src/features/direct/lv3Audit.testSupport.ts`。之後已授權的文字修正須經現有已封存 chain 投影回 U08，不可更新此圖片 proof 的基準來掩蓋差異。

## 實際 consumer 邊界

完整正式 words registry 以實際 `getWordBeastAsset(wordId, word, imageWordId)` 掃描，只有 `W003733 persuasive` 命中新 path；原 persuasive path 已無 active 正式詞 consumer。`approvedWordIllustration` 仍要求同時吻合wordId與別名，caption resolver 仍要求同詞與精確path。

已讀實際 call sites 的影響面：

- `/word/W003733` 一般字卡：`WordDetailScreen`、`StudyIllustration` 使用新圖與原中英caption。
- `/browse`、`/modes/words`：`WordBrowserScreen`、`WordsWorkspace` 的同詞縮圖沿共用resolver更新。
- `/units/:level/:unitNumber`：官方詞表30字一般卡 `UnitStudyScreen` 沿共用resolver更新，與text-only課本卡分開。
- `/review` 複習卡及 `/` 首頁到期詞縮圖：僅在既有資料選到此詞時受影響。
- `/quiz`：圖片題用共用asset及 `resolveWordImageClue`。純runtime已驗新圖的提示是完整原中文，不拿無關練習句配新圖；未建立群組或作答來強行到達此題。
- `/wordbeast` 每日捕捉、`/arena/spell-barrage`、`/arena/meaning-karuta`：實際呼叫同一resolver，僅既有選詞流程選到此詞時受影響，未進行遊戲或寫獎勵。
- `useUpcomingIllustrations` 與其圖片預載依resolver取得新path；圖片快取程式不變。`hasWordBeastAsset` 在修正前後都為真，沒有因本次圖修擴大選題資格。
- `useIllustrationMedia` 的既有規則在approved pair命中時回傳同captionZh，移除暫時顯示用的舊targetHint／senseId；原 `AXcb4f6684` media及starter記錄完整保留。這項hook行為已讀源碼，沒有新改hook或寫入DB。

所有 direct JSON schema 遞迴掃描及真實 `curriculumUnits` runtime 都僅有兩個教材連結：`LI-LV3U09-V089` 與 `LI-LV4U01-V042`。兩者仍為 `text_only`／`read_only`、`source_checked_text_only`，沒有authored illustration或originalExample。一般卡修圖不新增教材圖，也不把本次圖句當成教材練習。LV1圖片庫／原有靜態審閱庫沒有新增此詞。

## 驗證紀錄

- 新接入與 U07 歷史：2檔183項通過，包含144個完整輸入檔指紋、原圖及候選尺寸／格式／hash、反轉防漂移、唯一consumer、雙語SSR markup、圖題resolver、全schema及runtime教材邊界。
- 舊圖片／caption／預載／圖題回歸：14檔130項通過。第一次2workers並行時，既有puppet proof測項5.378秒超既有5秒門檻，該失敗log保留；不改程式或timeout，使用repo預設單worker重跑同14檔全過。
- `npm run typecheck` 通過。
- `npm run lint` 退出0。6項warning全部在未修改的既有prepare/save腳本；本次未順手清理。
- `npm run build` 通過。新圖已複製到dist，58,956 bytes及完整SHA256吻合；編譯後JS含精確新path。只有既有類型的chunk size／plugin timing提示。未啟動正式站或瀏覽器。
- `git diff --check` 通過；build後再次直接核對全部144個當前輸入指紋，零差異。
- 完整log在隔離worktree的 `output/persuasive-integration/`；沒有把輸出或原有暫存檔加入產品提交。

以上是scoped驗收，沒有聲稱跑完整repo套件。未執行瀏覽器逐卡／跨單元reopen、實體手機、正式站、安裝PWA或離線reopen；由父任務在整合後正常循路驗證。沒有建立永久QA群組、答題、reward/SRS寫入、DB注入或清除。SSR markup不冒充實際瀏覽器decode或畫面驗收。

## 版本與快取

Registry在App bundle內，不在字典資料更新包。要取得新映射需正常載入新App版本；只刷新字典資料不足以替換舊bundle。正式build既有流程以 `github.sha` 設定 `VITE_ASSET_REVISION`，一般卡URL仍帶 `?v=`。新path本身含內容hash，與舊圖path不同，可避免 `ignoreSearch: true` 讓舊圖覆蓋新圖。

`wordbeast` 圖片沿既有 `wordbeast-images-v1` 的 StaleWhileRevalidate runtime cache，並非整批預先快取。新圖尚未在線載入／預載前，不保證首次離線可用。整合後應以正常App更新、在線看圖、關閉重開及需要時離線重開驗收，不能清網站資料掩蓋問題。原圖仍保留供歷史與既有快取使用，無需移除或重寫。
