# LV4 U13–U14 文字教材候選

本批基底 `9a93400ee36be9e725080c0a96936eb4dca53d74`，分支 `draft/lv4-u13-u14-textbook`，指定作業 checkout `C:/Users/USER/Documents/Codex/2026-10-14/task/vocab-app-lv4-local`。繼承首批來源修補 `9cbbd9f80921459d3c63ab997e19624cc8397cd6`（原修補 `c301a0b0fd010f9b68828c66836075e17a5e516e`）；p22保留pending。未合併或部署。

| 單元 | 正文 | 主詞（編號／無編號） | 補充詞 | 詞彙／用法 | 完整群組／正式卡 | 未映射 |
|---|---|---:|---:|---:|---:|---:|
| U13 | p137–148 | 46（32／14） | 92 | 138／39 | 177／97 | 39 |
| U14 | p149–159 | 46（38／8） | 81 | 127／52 | 179／90 | 35 |

跨單元 187 個既有正式ID。啟動包 2645→2764 詞，新增 119 個既有ID；舊啟動包所有資料列逐欄保留。詞條只以 `words.json` 精確且唯一匹配掛載，未映射詞保留原書中文／詞性與可讀pending；不建立正式詞或義項ID。

來源為 `scripts/sources/LV4Unit13.json`、`LV4Unit14.json`，教材包為 `src/features/direct/curriculumLV4Unit13.json`、`curriculumLV4Unit14.json`。來源保存原圖／文字稿路徑與SHA256、印刷頁碼、詞性、編號與角色；每頁與界證均由指定來源流程目視。圖、配句、教材例句全文、手寫及教材題目沒有採用，Direct教材題目維持空。一般練習只用已映射正式卡；既有守城規則可能使用有核對中文的未映射單字，並不代表取得正式ID或圖句批准。

來源核對與修正：

- Every adopted page visually checked this session, including printed Level4, Unit13 p137-148, Unit14 p149-159, p160 Notes and p161 Unit15 boundary.
- U13 old unfinished author draft was individually checked before reuse. Restored printed chewing gum vocabulary, give off note, and printed proverb explanations. No example-derived easy-access collocation adopted.
- U14 retains 38 numbered and 8 distinct unnumbered blue frames. courageous p159 is numbered38, not a confidence supplement as the raw draft suggests. fantastic synonyms and fantasy frame continue on p158.
- Restored U14 reformer, decent, consultant, presidency, souvenir, futuristic, candlelit, villain, blush and aisle printed annotations. No example-derived disadvantage phrase adopted.
- All source occurrences retain page/role; exact unique existing words.json mapping only. No examples, art, captions, handwriting, new word IDs or officialSenseId adopted.
- Every adopted page visually checked this session, including printed Level4, Unit13 p137-148, Unit14 p149-159, p160 Notes and p161 Unit15 boundary.
- U13 old unfinished author draft was individually checked before reuse. Restored printed chewing gum vocabulary, give off note, and printed proverb explanations. No example-derived easy-access collocation adopted.
- U14 retains 38 numbered and 8 distinct unnumbered blue frames. courageous p159 is numbered38, not a confidence supplement as the raw draft suggests. fantastic synonyms and fantasy frame continue on p158.
- Restored U14 reformer, decent, consultant, presidency, souvenir, futuristic, candlelit, villain, blush and aisle printed annotations. No example-derived disadvantage phrase adopted.
- All source occurrences retain page/role; exact unique existing words.json mapping only. No examples, art, captions, handwriting, new word IDs or officialSenseId adopted.

必要驗收證據在 `C:/Users/USER/Documents/Codex/2026-10-14/task/lv4-evidence` 與 `C:/Users/USER/Documents/Codex/2026-10-14/task-4/browser-qa`。執行 fresh npm ci、lint、typecheck、完整Vitest、Python8＋6＋7、production build與diff check。可重用source audit全量驗原圖／初稿／頁界hash、正式映射、舊資料列與此前所有LV3／LV4教材、U17–U20、字庫／meta／SRS／進度schema／獎勵程式Git物件未變；新空庫一次fetch解析本批完整正式群組，未審圖句與教材練習維持關閉。

獨立390px fresh瀏覽器驗入口／首尾／用法／群組／一般字卡／客觀答題與保存／守城啟動暫停／离線重開，記錄實際bundle與啟動包hash。另一隔離session透過App正常UI匯入合法合成備份，正常PWA更新前後13張非空表逐筆比較。逐批實際結果、exact SHA與CI以 `batch7-handoff.json` 為準；初始埠誤讀舊preview的失敗證據不計通過。

作業權限阻礙已依標準 `require_escalated` 審查通過同一唯讀命令並恢復；所有repo寫入及必要命令走正常工具審查，仍用指定checkout，未更改ACL／憑證。母表、原件、真實用戶瀏覽器與其他工作樹保留。實體手機、Safari／Firefox與正式站發布未驗。
