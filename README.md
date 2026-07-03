# 高中英文單字通

給台灣高中生的 7000 單字學習 PWA：單字卡複習（SM-2 記憶曲線）、每日打卡、選擇題測驗、例句填空。單機使用，資料全存本機（IndexedDB），離線可用。

## 開發

```bash
npm install
npm run dev        # 開發伺服器 http://localhost:5173
npm run test       # 單元測試（SM-2 / 連續天數）
npm run build      # 產生 dist/（含 PWA service worker）
npm run preview    # 預覽正式建置 http://localhost:4173
```

## 更新單字資料

資料來源是 OneDrive 桌面「單字APP」資料夾裡的 Excel。編輯 Excel（新增例句、關聯詞、字根，或補滿 7000 字）後：

```bash
npm run import-data          # 重新產生 public/data/v1/*.json
git diff public/data/v1/     # 檢視變更
git add -A && git commit -m "更新單字資料"
npm run build                # 重新建置
```

App 啟動時會比對資料雜湊值自動重灌內容資料庫；**學習進度存在另一個資料庫（以單字為主鍵），不會被資料更新影響**。

Excel 填寫注意：
- `input_words` 的 `word` 欄不可重複（匯入會直接報錯）
- 各 `input_*` 表第 1 列是標題、第 2 列是填表說明，資料從第 3 列開始
- 例句填空題只會出現在「有填 `blank_sentence` + `answer`」的例句

### 補充說明表（選配）：文法、片語、延伸用法

想加文法說明或片語時，在 Excel 新增一張工作表，名稱必須是 **`input_notes_補充說明`**，欄位如下（第 1 列標題、第 2 列填表說明、第 3 列起資料）：

| note_id | word | note_type | title | content | status |
|---|---|---|---|---|---|
| 可空，程式自動產生 | 對應單字 | grammar / usage / phrase / mnemonic / culture | 標題可空 | 說明內容（可換行） | draft |

範例：`remain`｜`grammar`｜`連綴動詞用法`｜`remain + adj.（保持某狀態），不用進行式`。
內容會顯示在單字詳情頁與複習卡背面。沒有這張表也不影響匯入。

其他內容類型的放法：
- **衍生字**：`input_relations` 表，relation_type 用 `derivative`
- **常見搭配**：`input_words` 的 `usage_pattern` 欄
- **獨立片語**（想像單字一樣複習的）：`input_words` 加一列，pos 填 `phr.`，會自然進入複習與測驗

## 架構重點

- `scripts/import_data.py` — xlsx → JSON 匯入管線
- `src/db/contentDb.ts` — 內容資料庫（可重灌）；`src/db/progressDb.ts` — 進度資料庫（永不清除）
- `src/srs/sm2.ts` — SM-2 排程純函式；`src/srs/queue.ts` — 今日隊列（到期複習優先 + 每日新字上限）
- `src/checkin/` — 打卡與連續天數（完成任一次練習即自動打卡）
- `src/quiz/distractors.ts` — 選擇題干擾項（同級同詞性、排除同字族）

## 部署

正式網址：**https://chiehco.github.io/vocab-app/**

推送到 `main` 分支即自動部署（GitHub Actions 會跑測試 → 建置 → 發佈到 Pages）。所以資料更新流程的最後一步就是 `git push`，不用手動建置上傳。

手機瀏覽器開啟網址後可「加入主畫面」安裝，首次載入後完全離線可用。
