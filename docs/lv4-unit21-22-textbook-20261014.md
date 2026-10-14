# LV4 U21–U22 文字教材候選

本批基底 `a18be19be3daca8772c43269b3f5d75870ea0876`，分支 `draft/lv4-u21-u22-textbook`，指定作業 checkout `C:/Users/USER/Documents/Codex/2026-10-14/task/vocab-app-lv4-local`。繼承首批來源修補 `9cbbd9f80921459d3c63ab997e19624cc8397cd6`（原修補 `c301a0b0fd010f9b68828c66836075e17a5e516e`）；p22保留pending。未合併或部署。

| 單元 | 正文 | 主詞（編號／無編號） | 補充詞 | 詞彙／用法 | 完整群組／正式卡 | 未映射 |
|---|---|---:|---:|---:|---:|---:|
| U21 | p225–234 | 46（40／6） | 60 | 106／47 | 153／76 | 30 |
| U22 | p235–245 | 46（42／4） | 73 | 119／52 | 171／87 | 32 |

跨單元 162 個既有正式ID。啟動包 2870→2983 詞，新增 113 個既有ID；舊啟動包所有資料列逐欄保留。詞條只以 `words.json` 精確且唯一匹配掛載，未映射詞保留原書中文／詞性與可讀pending；不建立正式詞或義項ID。

來源為 `scripts/sources/LV4Unit21.json`、`LV4Unit22.json`，教材包為 `src/features/direct/curriculumLV4Unit21.json`、`curriculumLV4Unit22.json`。來源保存原圖／文字稿路徑與SHA256、印刷頁碼、詞性、編號與角色；每頁與界證均由指定來源流程目視。圖、配句、教材例句全文、手寫及教材題目沒有採用，Direct教材題目維持空。一般練習只用已映射正式卡；既有守城規則可能使用有核對中文的未映射單字，並不代表取得正式ID或圖句批准。

來源核對與修正：

- Candidate photo labels 225–233 actually print 226–234; candidate 234 is a second photo of printed p234. True p225 is 20260814_054231.jpg. Corrected manifest uses observed printed pages, never offsets alone.
- U21 starts at printed p225, ends at printed p234, with 40 numbered and 6 unnumbered large blue headings. The raw p224 text incorrectly calls the preceding U20 material Unit21; it is not included.
- wizard, admiration, virus, bankruptcy, penniless and wink are independent unnumbered large blue headings, not related rows.
- Added omitted printed stars: spell, cloak, toupee, wig, scrub, plunge, literary, wording, slim, waters, banquet; and call sb names / cheat on sb usage notes.
- vacant is physically printed on p232, after the p231 vacancy entry, and retains p232 sourcePage.
- Preserved printed A blend well with B without silently correcting its verb; preserved printed go broke explanation 破產的.
- Preserved separate printed thief=賊, robber=搶匪, inferior=質量次等的 and vulgar=粗俗的；下流的; raw draft collapses these meanings.
- Preserved printed p232 模棱兩可的 for ambiguous; raw draft uses 模稜兩可的. The original photo was re-inspected for the glyph.
- businessman and wholesaler are explicitly named in the merchant comparison; sugar cane / sugarcane are separate printed spellings. Blank sourcePos denotes no POS printed next to those words.
- U21 has no intervening Notes page: p234 ends with gown39/flea40 and p235 begins Unit22 cue1.
- U22 starts at p235 and has 42 numbered plus 4 unnumbered large blue headings. p246 is the printed Notes page; Unit23 begins at p247, makeup1.
- diligence, disgusted, disgusting and grammatical are independent unnumbered large blue headings.
- Added omitted printed stars and supplementary vocabulary: master, decent, die, fabric, mashed, trout, faint, sausage, roach and cockroach; crook remains the printed star under hook.
- Added printed star usages spark off..., pass out = faint, call it a day, pose a threat to sb/sth and roach/cockroach abbreviation; no phrase inferred from example sentences.
- Corrected hint to printed 暗示 (not draft 提示／線索), assiduous to 勤奮的, hardworking to 努力的, cheap to 小氣的, regular to 規律的；常態的.
- store is printed on p243 as the continuation of input, not p242 as in the raw draft.
- Banquet appears twice with different printed meanings: U21 p234 盛宴 and U22 p238 饗宴; keep source-specific meanings.
- Preserved a high-rise building and a fish tank with the printed article and empty sourcePos; no dictionary POS added.
- Omitted raw-draft paw/pawed/pawed inflection because the p245 photo does not print a paw three-form line. The p245 creep/crept/crept line is printed and retained.
- Preserved book spelling 直昇機 and printed Notes boundary. No example sentences, handwriting, images or unapproved practice text adopted.

必要驗收證據在 `C:/Users/USER/Documents/Codex/2026-10-14/task/lv4-evidence` 與 `C:/Users/USER/Documents/Codex/2026-10-14/task-4/browser-qa`。執行 fresh npm ci、lint、typecheck、完整Vitest、Python8＋6＋7、production build與diff check。可重用source audit全量驗原圖／初稿／頁界hash、正式映射、舊資料列與此前所有LV3／LV4教材、U17–U20、字庫／meta／SRS／進度schema／獎勵程式Git物件未變；新空庫一次fetch解析本批完整正式群組，未審圖句與教材練習維持關閉。

獨立390px fresh瀏覽器驗入口／首尾／用法／群組／一般字卡／客觀答題與保存／守城啟動暫停／离線重開，記錄實際bundle與啟動包hash。另一隔離session透過App正常UI匯入合法合成備份，正常PWA更新前後13張非空表逐筆比較。逐批實際結果、exact SHA與CI以 `batch9-handoff.json` 為準；初始埠誤讀舊preview的失敗證據不計通過。

作業權限阻礙已依標準 `require_escalated` 審查通過同一唯讀命令並恢復；所有repo寫入及必要命令走正常工具審查，仍用指定checkout，未更改ACL／憑證。母表、原件、真實用戶瀏覽器與其他工作樹保留。實體手機、Safari／Firefox與正式站發布未驗。
