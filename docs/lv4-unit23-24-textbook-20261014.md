# LV4 U23–U24 文字教材候選

本批基底 `5dcf0fb636ba5fc13fa773e54343c4e0440cf96c`，分支 `draft/lv4-u23-u24-textbook`，指定作業 checkout `C:/Users/USER/Documents/Codex/2026-10-14/task/vocab-app-lv4-local`。繼承首批來源修補 `9cbbd9f80921459d3c63ab997e19624cc8397cd6`（原修補 `c301a0b0fd010f9b68828c66836075e17a5e516e`）；p22保留pending。未合併或部署。

| 單元 | 正文 | 主詞（編號／無編號） | 補充詞 | 詞彙／用法 | 完整群組／正式卡 | 未映射 |
|---|---|---:|---:|---:|---:|---:|
| U23 | p247–256 | 47（42／5） | 70 | 117／44 | 161／93 | 24 |
| U24 | p257–266 | 46（40／6） | 58 | 104／38 | 142／84 | 20 |

跨單元 176 個既有正式ID。啟動包 2983→3094 詞，新增 111 個既有ID；舊啟動包所有資料列逐欄保留。詞條只以 `words.json` 精確且唯一匹配掛載，未映射詞保留原書中文／詞性與可讀pending；不建立正式詞或義項ID。

來源為 `scripts/sources/LV4Unit23.json`、`LV4Unit24.json`，教材包為 `src/features/direct/curriculumLV4Unit23.json`、`curriculumLV4Unit24.json`。來源保存原圖／文字稿路徑與SHA256、印刷頁碼、詞性、編號與角色；每頁與界證均由指定來源流程目視。圖、配句、教材例句全文、手寫及教材題目沒有採用，Direct教材題目維持空。一般練習只用已映射正式卡；既有守城規則可能使用有核對中文的未映射單字，並不代表取得正式ID或圖句批准。

來源核對與修正：

- All printed body pages247-256 checked, including supplied p249 retake; Unit23 header and Level4 sidebar visible at247, final numbered42 at256, Unit24 begins257. No Notes page between U23 and U24.
- 42 numbered plus5 independent unnumbered heads retained: telescope247, avenge248, surgery249, cookbook251, cyclone252. Initial drafts incorrectly folded these into related lists; cyclone occurs on252 rather than251.
- p249 broken original20260814_054807.jpg is not adopted. Clear attachment2-Photo-2.jpg visibly prints249 and Level4/Unit23; source is substituted with its own hash, no missing-page guessing.
- p248 avenge comparison restored: avenge directly accepts the thing being avenged, while revenge/avenge oneself on sb is shared. p249 signature/autograph comparison excludes the two full sample questions and the draft unsupported word 普通.
- Printed star vocabulary restored: pimple247; forge248; demonstrator/rally/malpractice/Siamese twins249; comfort/cruiser250; hypocrite/portray251; pregnant/bruise252; reap/attribute/sprain253; villain/humble/claw254; paddle/evaporate256.
- Printed star usage restored: judging from250; portray A as B251; lay sb off plus printed lay forms252; attribute A to B253; a pop quiz254. Verb forms sew/sow/kneel/twig preserved from print.
- The sow proverb As you sow, so shall you reap appears as a triangle-marked example, not a phrase entry, and is excluded despite the raw draft treating it as a usage candidate. Only its printed reap gloss is retained.
- p251 hurricane comparison gives geographical naming hurricane/cyclone/typhoon; typhoon retained as explicitly explained comparison supplement with no fabricated POS; p252 cyclone is an independent head, tornado its extension.
- Raw p242-246,p247-251,p252-256,p257-261,p262-266 are a different first-book capture (their headings/words/photos differ). They are excluded in full. No handwriting, full examples, unapproved art/captions, invented formal/sense IDs adopted.
- All printed body pages257-266 checked; Unit24 header and Level4 sidebar visible257, final numbered40 nutritious266. Right-hand adjacent page in266 photograph is alphabetical vocabulary index, not Unit25; no Notes is present after the body.
- 40 numbered plus6 independent unnumbered heads retained: ignorance258, nylon259, obedience262, offense262, offensive262, pregnancy264. Draft-related labels do not override the independent large blue head layout.
- Printed spelling 溼氣/溼度 retained for humidity/moisture; printed landmark POS is n. even though the definition also says 重要/重大(僅置名詞前); no editorial POS invented.
- Printed star vocabulary restored: schooling258, resume/waterproof259, giggle260, stew/abound/edible263, remorse265. Beef up/strengthen star usage262 and grind verb forms265 retained.
- Printed phrase supplements a sweet dream261, a day care center261 and a pain in the neck266 kept verbatim without dictionary-inferred POS. Mischievous/naughty boy is one printed phrase; no separate unsupported naughty definition created.
- Raw p257-261 andp262-266 first-book Unit30 captures are excluded; the Level4 p256-260/p261-265/p266 drafts match the photographs. No handwriting, full examples, unapproved art/captions, invented formal/sense IDs adopted.

必要驗收證據在 `C:/Users/USER/Documents/Codex/2026-10-14/task/lv4-evidence` 與 `C:/Users/USER/Documents/Codex/2026-10-14/task-4/browser-qa`。執行 fresh npm ci、lint、typecheck、完整Vitest、Python8＋6＋7、production build與diff check。可重用source audit全量驗原圖／初稿／頁界hash、正式映射、舊資料列與此前所有LV3／LV4教材、U17–U20、字庫／meta／SRS／進度schema／獎勵程式Git物件未變；新空庫一次fetch解析本批完整正式群組，未審圖句與教材練習維持關閉。

獨立390px fresh瀏覽器驗入口／首尾／用法／群組／一般字卡／客觀答題與保存／守城啟動暫停／离線重開，記錄實際bundle與啟動包hash。另一隔離session透過App正常UI匯入合法合成備份，正常PWA更新前後13張非空表逐筆比較。逐批實際結果、exact SHA與CI以 `batch10-handoff.json` 為準；初始埠誤讀舊preview的失敗證據不計通過。

作業權限阻礙已依標準 `require_escalated` 審查通過同一唯讀命令並恢復；所有repo寫入及必要命令走正常工具審查，仍用指定checkout，未更改ACL／憑證。母表、原件、真實用戶瀏覽器與其他工作樹保留。實體手機、Safari／Firefox與正式站發布未驗。
