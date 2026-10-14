# LV4 U15–U16 文字教材候選

本批基底 `b07c8b7552d50f27bb9d8f2b7c2f17c4ffe28af0`，分支 `draft/lv4-u15-u16-textbook`，指定作業 checkout `C:/Users/USER/Documents/Codex/2026-10-14/task/vocab-app-lv4-local`。繼承首批來源修補 `9cbbd9f80921459d3c63ab997e19624cc8397cd6`（原修補 `c301a0b0fd010f9b68828c66836075e17a5e516e`）；p22保留pending。未合併或部署。

| 單元 | 正文 | 主詞（編號／無編號） | 補充詞 | 詞彙／用法 | 完整群組／正式卡 | 未映射 |
|---|---|---:|---:|---:|---:|---:|
| U15 | p161–171 | 46（35／11） | 68 | 114／42 | 156／81 | 33 |
| U16 | p173–183 | 46（36／10） | 79 | 125／47 | 172／95 | 27 |

跨單元 176 個既有正式ID。啟動包 2764→2870 詞，新增 106 個既有ID；舊啟動包所有資料列逐欄保留。詞條只以 `words.json` 精確且唯一匹配掛載，未映射詞保留原書中文／詞性與可讀pending；不建立正式詞或義項ID。

來源為 `scripts/sources/LV4Unit15.json`、`LV4Unit16.json`，教材包為 `src/features/direct/curriculumLV4Unit15.json`、`curriculumLV4Unit16.json`。來源保存原圖／文字稿路徑與SHA256、印刷頁碼、詞性、編號與角色；每頁與界證均由指定來源流程目視。圖、配句、教材例句全文、手寫及教材題目沒有採用，Direct教材題目維持空。一般練習只用已映射正式卡；既有守城規則可能使用有核對中文的未映射單字，並不代表取得正式ID或圖句批准。

來源核對與修正：

- Photos p161-171 checked in full; printed Level4/Unit15 start p161, final numbered35 p171; p172 is printed Notes, p173 begins Level4/Unit16.
- 35 numbered and 11 separate unnumbered headwords retained: countless, restless, hopeless, revision, tomb, repetitive, repeated, adopt, divorced, dynasty, oxygen.
- Hopeless related desperate/unpromising occur on p163; adopted on p167 and adoptive/accept on p168. Source pages follow photographs, not the raw five-page groups.
- Printed star notes restored: plead p163, kimono p164, pay-tribute-to usage and rash p165, blockbuster/barren p167, aspire p170, boyhood p171.
- U15 incorrect legacy p161-165待審清單 talks about sir/madam and lamp/light and missing p166; it belongs to a different capture and is excluded.
- Curiosity killed the cat and as-soon-as/upon/on paraphrases only occur within example text; excluded. No example-derived phrases, handwriting, image/caption material, formal IDs, or sense IDs invented.
- Photos p173-183 checked in full; printed Level4/Unit16 start p173, final numbered36 p183; p184 is printed Notes. Separate p185 photo confirms printed Level4/Unit17/page185 boundary.
- 36 numbered and 10 separate unnumbered headwords retained: classification, clash, violation, invasion, elastic, brag, enlargement, blessing, imaginative, imaginable.
- Raw p171-175續補 shifts strive/artificial/genius/violate to p174 and violation/conductor/guarantee/peer to p175. Correct photographic pages are p175 and p176. Actual p174 crush/clash/promising/collapse were missing from raw draft and are restored.
- Raw p176-180 shifts fatal/acquaintance/penalty/invade to p176, intimate/flexible/boast to p177, brag/earnest/magnetic/halt to p178; correct pages are p177,p178,p179. The claim p179 has no new heads is rejected.
- Printed star notes restored: caste p173, infatuated/cymbal p174, perspiration p175, valid p176, abolish p177, dough p178, brochure/resort p182, accomplished p183.
- Printed standalone invasion keeps its noun attack/assault occurrences separately from invade verb attack/assault. Classified-ad, rubber-band comparison, boast usage note, and noun inflections are retained from print.
- The old p181-185初稿 declares Unit21 and mentions bathroom/lemon; unrelated capture excluded. Source body follows 180-185續補 plus photographs. No examples or quotations, handwriting, image/caption material, invented formal or sense IDs adopted.

必要驗收證據在 `C:/Users/USER/Documents/Codex/2026-10-14/task/lv4-evidence` 與 `C:/Users/USER/Documents/Codex/2026-10-14/task-4/browser-qa`。執行 fresh npm ci、lint、typecheck、完整Vitest、Python8＋6＋7、production build與diff check。可重用source audit全量驗原圖／初稿／頁界hash、正式映射、舊資料列與此前所有LV3／LV4教材、U17–U20、字庫／meta／SRS／進度schema／獎勵程式Git物件未變；新空庫一次fetch解析本批完整正式群組，未審圖句與教材練習維持關閉。

獨立390px fresh瀏覽器驗入口／首尾／用法／群組／一般字卡／客觀答題與保存／守城啟動暫停／离線重開，記錄實際bundle與啟動包hash。另一隔離session透過App正常UI匯入合法合成備份，正常PWA更新前後13張非空表逐筆比較。逐批實際結果、exact SHA與CI以 `batch8-handoff.json` 為準；初始埠誤讀舊preview的失敗證據不計通過。

作業權限阻礙已依標準 `require_escalated` 審查通過同一唯讀命令並恢復；所有repo寫入及必要命令走正常工具審查，仍用指定checkout，未更改ACL／憑證。母表、原件、真實用戶瀏覽器與其他工作樹保留。實體手機、Safari／Firefox與正式站發布未驗。
