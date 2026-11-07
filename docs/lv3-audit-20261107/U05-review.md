# LV3 U05 來源、修正範圍與待驗事項

記錄日期：2026-11-07。這份文件是公開安全的審查摘要，不是套用或發布證明。

## 目前狀態

- 146欄／56列文字已完成ready seal、dry-run 0 writes及單次本機實際apply，共6個檔案。交易20261107T171403761440Z已committed；6份after hash、備份與138項未變輸入已核對，chain已committed。再次執行回報already_applied、0 writes。見[U05 application](U05-application.json)。
- TEMP fixture驗證與主產品apply分開：隔離fixture的Python 9/9、TypeScript 1/1通過，見[fixture validation](U05-fixture-validation.md)。這與實際apply後驗收分開；後續全卡瀏覽器及限定技術驗收已完成，見下列獨立報告。
- 已存在的封存證據：[U05 patches](U05-patches.json)、[U05 scope](U05-scope.json)、[U05 before capture](U05-before-capture.json)。Ready manifest hash：f7ad8f7a18f1b52eeb0be70ae233648de464032ed4819ad7f42cc9f6dc84de77。
- 第一次準備程序曾在 verified forms 契約安全拒絕，當次沒有建立候選輸出或寫入產品。W002976正式詞頭為wage(s)，可信動詞原形為wage，三態為wage–waged–waged。精確契約支援現已整合至主工作分支48749c8：31個雙端cases通過，獨立檢查中的原fallback反例被拒絕。不改詞頭、不填假base、不放寬其他guard；首次失敗證據保留。
- confirm圖片已本機整合於4b4f1ee，且限定範圍的執行期驗收完成。見[圖片整合報告](../unit-audit-20261105/LV3-confirm-image-integration-20261107.md)與[confirm runtime QA](U05-confirm-runtime-qa.md)。一般卡、實際看圖題及正常答對+5、關閉重開、四個教材引用邊界、390px畫面均通過。daily自然選到retain而非confirm，不強制改排；confirm的daily、SRS、arena及offline未驗，不能稱所有consumer全面通過。
- 文字actual-after已完成，見[U05 runtime QA](U05-runtime-qa.md)（報告提交7e5f0ec）：158教材／90一般卡／318分頁及146個runtime值核對完成。初次DOM值出現為125/126，保留失敗證據；wage UI精確修正38da992後，同一profile窄驗缺少的1/1通過。20項meaningSource為metadata，未冒稱可見UI。
- 限定技術驗收已完成，見[U05 validation](U05-validation.md)：32個TS檔／271個unique tests有最終通過證據，分批及窄驗執行，不是單一combined run；Python65 methods含wage31 subcases。最終63項受影響測試與force whole-project tsc exit 0；lint／build exit 0，但最後type-only annotation與lint/build版本差異按報告保留。測試補強提交80ddf47；最終typing修正及技術報告已提交於90bb66c644335e2e2b295254cc469a42e37a45fe。144 inputs、138 guards、6份after與備份均通過，未重套產品。
- 獨立starter-media migration已實際套用2檔並完成本機runtime與限定技術驗收，提交0844941720cf8679b081f38247a3c95a2b8b5296。六筆starter中文caption已恢復；六筆原英文缺漏及lengthen視覺弱仍保留，不能稱整單元所有來源問題已解決。

## 審查母數與保護範圍

- 112筆詞彙教材列、46筆grammar，共158列；對應90張正式詞卡、143筆既有例句、67筆筆記及10筆senses。
- 20筆無正式詞卡映射的補充詞原為待核佔位，現提出有教材證據的詞性及中文義補齊。仍是教材補充，不捏造正式ID或映射。
- 46筆grammar及67筆notes逐列審閱；其中21筆notes可直接定位於U05教材頁，不能把其他筆記也稱為本課原照片文字。
- 保護原例句中英文、blank、answer、所有穩定ID、status、review、practiceMode；未改母表、SRS或真實學習紀錄。例句既有內容不是可任意改寫的圖片圖說。
- 教材仍為 text_only／read_only，questions及relatedNotes為空。沒有原題、選項、答案可驗唯一性，不創造替代題、不把一般圖注入教材。

## 文字裁示

採納候選分布：curriculum 88欄／25列，examples 4欄／4列，notes 4欄／4列，words 50欄／23列；合計146欄／56列。

67筆教材列初稿共有234個欄位提案，逐欄審後採88個、另146個可選縮寫／來源重標不採。保留有效多義與同義表述，不用本課單義覆寫一般字典摘要。20筆placeholder補齊以外，只補 liquid／pay 缺詞性、lose／sorry 缺義及 cunning 明顯重複字。來源標示 textbook_source_review 只用於實際有照片支持的補齊，並不宣稱全欄逐字抄錄。

正式words的50欄經獨立詞典證據複核：45欄採原提案、5欄修訂。這是本輪具體欄位的查證，不代表每張未改詞卡所有歷史義項皆重新查完。

- engage保留承諾義及 engage to V；訂婚義註明通常用被動 be engaged，不把它當一般主動用法。
- appointment保留指定，將下令釐清為古名詞命令／法令；保留任命與預約，不因罕用就刪義。
- wage war on譯為對……發動／進行戰爭，不限於宣戰；報償／報應等既有義保留。
- closet的小室、空談形容詞及幽閉動詞，portion的命運／嫁妝均有詞典證據，保留。
- 4筆例句僅修sensePos：appointment、engagement為名詞，honor、request為動詞；原句、中文、空格與答案不變。
- 4筆notes分別釐清apart from排除／包含義、將decade標題改為中性年數換算、補trick的戲弄缺字、去除wardrobe孤立分類字。後兩項不冒稱來自U05原照片。
- W006057-2的sense note屬歷史待辦與主表摘錄，本輪明確 deferred_optional_cleanup，保留原值。不是待修詞義硬錯，不擴builder，也不宣稱sense拆分已完成。

11筆新三態為apologize、appeal、confirm、detect、engage、honor、portion、request、shorten、spill、wage；來源逐詞核得，不以規則推估。spill保留spilled／spilt；其他拼字異體依來源記錄。舊16筆三態保留，本輪未重新查證。wage保留在146欄；精確契約支援已接入，ready seal及本機實際apply已完成。

## 教材來源與照片指紋

p43–51為Unit05內容，p52為空白筆記頁，p53已是Unit06邊界。11張照片均核對頁面；p52／p53不充作U05詞彙內容證據。只公開頁碼與SHA256，不公開原照片或本機位置。

| 頁碼 | 用途 | 原照片 SHA256 |
|---|---|---|
| 43 | U05內容 | eb6870cf10493695615342d7c4b07543f6b15f7fe7e1d8d3a13100dbfe785b07 |
| 44 | U05內容 | a26baf86cf87d670693ec79b4edf19732c8bc1b00c9bd7d2e253e9c668563f31 |
| 45 | U05內容 | 8ccd2779e520865d63f8eeac5eaf9d92d6262a3768ab3a14698aa4ca647afdc2 |
| 46 | U05內容 | ef3b35aa49176c5d63316c1d99c170e8b7d3c4feeb90f20f551cd6cab1a7f890 |
| 47 | U05內容 | 38b39eec5c967fc00534c024c7db96e7f4624d3219a559071c7885174cc3877a |
| 48 | U05內容 | bb2c692128b06489fdd3c2dcf664784ca48b32f75fed271ef0f6d4bce75759b9 |
| 49 | U05內容 | 0b1e05ca1b1ff903f1b8bf021cf18e4cfd42f23504a70b4b30ebaed4ef8f4422 |
| 50 | U05內容 | 558923ca1d134a6ddd82a63f2ff5bd921f69971637111865c9bd414a6593129c |
| 51 | U05內容 | 7a29b53adc25204c15e263ba59f0882a73a4de45287abe486e2694b5fc51f2b5 |
| 52 | 空白筆記頁 | 6c234a79855574359122b26069fe6ef1609dea22a52b8faeaed5d8c9a03bf432 |
| 53 | U06邊界 | 2bee5185dc3858d1b4d468be44bb0d7fa0f26d3e42d0ec2fc332e625291f6ed5 |

## 圖句審查與兩類圖說缺口（原始發現及後續恢復）

33張現有圖片皆有像素及詞義／原圖說對照，包含共享表面與教材引用範圍。這不等於新增人工美術批准，也不將未看過的其他單元素材算入通過數。

- confirm原圖與完成拼圖語義不一致，另行換圖；原caption及一般例句保留，未改文字去遷就舊圖。
- lengthen仍是 pending_visual_clue_insufficient：靜態圖不足以清楚證明變長，且缺原英文caption。不將其說成已修或已通過圖句配對。
- 原始英文caption缺漏6筆：decade、significant、detect、source、capacity、lengthen。這是來源缺英文，不拿一般例句補成原圖說。
- 另有starter實際畫面缺中文圖說6筆，恰為上述六詞。完整media已有approved中文caption，但starter省略對應media列；這與原英文缺漏是兩個不同問題。
- 根因是builder在教材ID擴充前固定selected_names，media仍用舊集合，其他集合則使用actual_names；不是英中配對品質過濾。全starter範圍盤點有382筆既存media來源未納入（316 approved且中文非空、52 draft、14 needs_redraw）。這只是集合差異盤點，不是382張圖片均完成語義／美術審查。
- 本次全範圍盤點另列7個U05相關approved詞，包含dress；不能把它與實際33圖畫面中確認的6筆缺caption混作相同母數。

## 修改前實際畫面證據

基準提交40d69303445dd3e462c28fa67c46d945740f54cf。修改前走查158筆教材列、90張一般卡及318個分頁，保存566張截圖；33張圖均載入，27筆caption與來源吻合，6筆缺caption如上。教材沒有插圖，158列均read_only，questions仍空。144項管線輸入在捕捉前後未變，原before證據保留。

證據名稱：before-verification.json、before-coverage.json、before-caption-diagnostic.json、independent-before-input-hashes.json及其provenance；位於output/playwright/lv3-u05。這是修改前本機瀏覽器捕捉，不是修改後、正式站或真實手機驗收，也不是真使用者SRS遷移證明。

## 可追溯研究產物

以下僅列證據名稱與指紋，不提供私有輸出下載連結。原研究含保留／待核裁示，不能將所有初稿都當成採納修正。

| 證據 | SHA256 |
|---|---|
| u05-vocabulary-review.json | a7be5584b66fb080707cc0246dafbd9a05b0c10cab859da539bb6d482196bc04 |
| u05-grammar-review.json | 8af110474922ac7d6b172afec9047aa8d941126ed4b954d5538112c00ad0b56e |
| u05-image-review.json | a445d1cb792d736608b962c6843700e9d0879f0b03f83c867e5758022f9aecb5 |
| u05-dictionary-verification.json | 02ada4a20c32d9fef424e9b54bcc11e2b1e5ae8a3bbc082b808de4bfd0ffea0e |
| U05-accepted-proposals-draft.json | f074acbd50242149d0115b367cf65b607bceb6377492855369cb29b6425bb80f |
| starter-caption-gap-analysis.json | 83d0712f7b9c5beb560135603b0b4cc2a742c58b2f95b6e10b52d4a986e434f1 |

最終文字候選的pipeline node_hash為8f373d913d8b5cde3e49ceba8dac614a24f7423883efefc24cb7d1bf031a9134。原始50欄及5項修訂、完整beforeRow、來源與移除／取代片段均保留於候選紀錄；無duplicate、noop或重疊欄位。

主要詞典證據：[engage](https://www.collinsdictionary.com/dictionary/english/engage)、[appointment](https://www.collinsdictionary.com/dictionary/english/appointment)、[wage](https://www.collinsdictionary.com/dictionary/english/wage)、[closet](https://www.collinsdictionary.com/dictionary/english/closet)、[portion](https://www.collinsdictionary.com/dictionary/english/portion)、[spill](https://www.collinsdictionary.com/dictionary/english/spill)。讀取方式逐來源記錄；Cambridge部分頁403／Oxford部分頁404或403，只使用已記錄的出版社搜尋摘要，沒有冒稱完整頁已讀。earn wages的補充搭配亦明確保留搜尋證據限制。

## 獨立starter-media遷移最終結果

此後續步驟與U05文字交易分開。U05文字提交8f830a1e98ecc5cd2922842b45a2762e794b06b2仍為146欄／56列；原pack SHA256 28874ebee1562eae9cc1fc71534d87e470094cad268e2af3f43a209724bf8add保留為歷史checkpoint，不以現行pack覆寫。

- 遷移manifest：88ba19b48f296fc26b7abdac6468bc1dc26f474523ac78b309aabfed0456578b；交易20261107T184016929302Z已committed。實際只寫builder與starter pack兩檔，重跑0寫入，142項其他輸入不變。見[遷移套用紀錄](STARTER-MEDIA-application.json)及[驗證歷程](STARTER-MEDIA-validation.md)。
- 現行pack SHA256：c198a371ad72a5f8d8b7d013bd9cc8b2b97c29ecc3fd56abbe2e785f7a19a3e8。媒體746→1128；382筆新增保留316 approved／52 draft／14 needs_redraw，不代表316張都新經目視審核。原746列及全部非media內容不變。
- [遷移runtime](STARTER-MEDIA-runtime-qa.md)於71e5490927699b1cf7a35db255ba1a09f0b8bccb保存：六筆中文圖說恢復，沒有虛構英文；33張圖的URL、位元組與雜湊不變。失敗更新全庫、metadata與進度保持不變；移除503攔截後，重載觸發背景自動恢復，發生於預定手動重試之前，不能說首次手動重試成功。原confirm +5、群組、QA設定及進度於重開保留；完整full-profile不變。
- [最終限定技術驗收](STARTER-MEDIA-TS-validation.md)於30ed97b92cec8a465e8cddce0ce96e9847291586保存：原7檔命令一次35/35通過，另完整direct helper 52/52通過；forced tsc、lint、build皆exit 0，lint有310 warning lines、0 errors。未提高既有timeouts，所有初次／中間失敗保留，未跑全專案完整suite。

以上更新原before／文字after階段的六筆starter中文缺口狀態；原始缺口與失敗證據保留，不改寫成當時已通過。六筆原EN缺漏與lengthen視覺弱仍待確認。無發布、實體手機或offline-PWA通過宣稱。

## 尚未完成與不宣稱的範圍

- U05文字已ready seal、dry-run 0 writes、TEMP fixture及單次本機apply；actual-after全卡runtime及限定技術驗收完成。完整全專案測試套件未執行；獨立starter-caption migration已套用並完成限定驗收，但仍保留原英文與視覺來源問題。
- wage(s)精確契約支援、confirm限定runtime及獨立starter媒體migration驗收已完成；六筆原英文caption缺漏與lengthen視覺弱未因中文圖說恢復而解決。
- lengthen視覺線索不足與六筆原英文caption缺漏仍保留。
- confirm的daily自然選到retain，未覆蓋confirm；SRS、arena、offline未驗。390px為桌面瀏覽器responsive檢查，不是手機測試；重開持久化使用專用QA狀態，不是真使用者SRS遷移。未聲稱完成Safari／Firefox、正式站或發布驗收。
- 本次收尾僅更新審查文件與U05 ledger狀態，不更動accepted草稿、產品資料或chain。上述apply狀態來自獨立交易證據；報告更新本身不代表發布完成。
