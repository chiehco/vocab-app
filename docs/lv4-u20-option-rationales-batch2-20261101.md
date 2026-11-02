# LV4 U20 第二批十題逐選項解析：完整審閱稿

歷史審閱紀錄：本檔九題待審判斷已由[2026-11-02 九題修正稿](lv4-u20-option-rationales-batch3-20261102.md)接續；其中 interaction、nowadays、socket、overnight 可保留原句，以最合適語境解釋，不一律視為壞題。以下保留當時版本。

基底 main：`248c7ba6e03d52d24cc11127e72bb3d702558f0d`（PR51已發布）。本批只準備 draft PR，尚未批准合併或部署；沒有孩子最新作答紀錄，不宣稱是孩子的錯題。

從46題原創目標詞四選一中，既有6題已具逐項解析；本批新增10題40項，合計16題。其餘30題中，下列9題先列語境／排除依據待審，其餘21題未在本批涵蓋。128題整份教材題庫原樣保留，不修改題目ID、英文、中譯、選項、答案、評分、學習進度或字庫。

## 英文先核對：本批沒有硬補的題目

現有題目有中文目標提示，學生可能據此選出既定答案；但不能把另一個能成立的英文讀法教成英文錯誤。以下是原句的內容審閱阻擋，不是新增發布 hold 或修改答題引擎。要保留翻譯提示選字，還是另行批准補英文線索，留待內容決定；本批不改原答案，也不編造錯誤排除理由。

| 題目／目前答案 | 原英文 | 判斷與原因 |
|---|---|---|
| interact／B · interact | The children interact with each other around the table. | 合理替代讀法：learned 也可作 learn 的過去式；The children learned with each other around the table 可指孩子們一起學習。不能只把 learned 當形容詞排除。 |
| interaction／C · interaction | Their interaction makes the blocks light up. | 排除依據待核：Their disorder 在文法上也能作主詞。英文沒說積木由哪種機制點亮，不能把 disorder 教成文法錯誤，或憑中譯斷言一定只能是互動。 |
| interactive／D · interactive | The children use interactive blocks at the table. | 合理替代讀法：passive 也能修飾 blocks，指不主動回應的材料；at the table 沒有提供積木會回應孩子的線索。 |
| learned／B · learned | The learned scholar explains an old map. | 合理替代讀法：passive scholar 或 harsh scholar 都能是英文名詞片語。解說舊地圖本身不能排除被動或嚴厲的學者。 |
| passive／C · passive | He remains passive while the others solve the problem. | 合理替代讀法：He remains harsh while the others solve the problem 也能描述他仍態度嚴厲；只有中譯加入站在一旁的訊息，不能倒推英文已排除 harsh。 |
| partnership／B · partnership | They work in partnership at the bakery. | 合理替代讀法：They work in privacy at the bakery 也能表示他們不受打擾／私下工作。英文沒有明說合作或分工，不能只靠中譯排除 privacy。 |
| nowadays／B · Nowadays | Nowadays, many people pay with their phones. | 時間線索待核：Nowadays 與 overnight 都能作時間副詞；原句沒有足夠時間背景排除夜間付款的讀法。不能把 overnight 教成只有形容詞，或只靠選項首字大小寫判正誤。 |
| socket／A · socket | He puts the plug into the socket. | 排除依據待核：alcohol 可指液體酒精；puts the plug into the alcohol 在清理物品等另種情境可成立，原句的 the 仍保留。英文沒有通電／連接插座的線索，不硬寫成酒精絕不可能作 into 的受詞。 |
| overnight／D · overnight | Snow covers the quiet town overnight. | 合理替代讀法：Snow covers the quiet town messenger 可指雪覆蓋那位安靜的鎮信使。town 可以修飾 messenger，英文受詞不一定在 town 就結束；不能把名詞選項都說成這裡必須是時間副詞。 |

## 核對來源與表達邊界

原題、目標義與已核教材：`src/features/direct/curriculumLV4Unit20.json`；現有詞條：`public/data/v1/sa-pack.json`。所有新解析均有詞性／繁中詞義及英文原句的文法或語境理由；談一般字面語境，不把其他人在另一情境下可能做的事斷言為不可能。messenger 不把定居者說成不能送件；resignation 明列無奈接受，不只列辭職；overnight 保留副詞、形容詞與動詞的不同用法。

字典詞義與搭配另核對原出版方頁面（未複製詞典例句；少數直接開啟403，使用公開索引可讀的原出版方內容）：

- [disorder](https://www.dictionary.com/browse/disorder)
- [freshman](https://dictionary.cambridge.org/us/dictionary/english/freshman)
- [harsh](https://dictionary.cambridge.org/dictionary/english/harsh)
- [privacy](https://dictionary.cambridge.org/dictionary/english/privacy)
- [sway](https://dictionary.cambridge.org/us/dictionary/english/sway)
- [dense](https://dictionary.cambridge.org/dictionary/english/dense)
- [overnight](https://dictionary.cambridge.org/dictionary/english/overnight)
- [alcohol](https://dictionary.cambridge.org/dictionary/english/alcohol)
- [messenger](https://dictionary.cambridge.org/dictionary/english/messenger)
- [equality](https://dictionary.cambridge.org/dictionary/english/equality)
- [bargain](https://dictionary.cambridge.org/dictionary/english/bargain)
- [resignation](https://dictionary.cambridge.org/dictionary/english/resignation)
- [miserable](https://dictionary.cambridge.org/dictionary/english/miserable)
- [a/an](https://dictionary.cambridge.org/grammar/british-grammar/the)

## interact 唯讀溯源：已有檔案，不需重交

另有[來源修正 draft PR52](https://github.com/chiehco/vocab-app/pull/52)，本批不合併、不改寫該分支，也不重做修正工具。HPCHIEH 本機的既有 import-data canonical 母表實際可讀，6,169,641 bytes、64表，SHA256 `98fa208835caf7184acc95f26dcff56ace23ba281ff8d4b9b8c37e18e407be14`，與現行公開 meta 的 houseSourceSha256 一致；檔案最後修改為2026-10-26。這確認該已記錄來源仍在本機，不等於完成全機搜尋或證明沒有更晚人工版本。

唯讀實讀 `input_words_單字主表` 第3560列，`word_id=W003558`、`word=interact`、`pos=v.`、`status=draft`，`meaning_zh=互相影響；交互作用；幕間劇；幕間休息`；`input_senses_義項表` 對應0列。正式words與S+A包相同。匯入器直接讀主表摘要，沒有把義項合併回摘要；不是本批解析造成。讀取前後母表SHA一致，沒有儲存、上傳或改寫。

最小建議仍是一格：來源 `meaning_zh` 刪除「幕間劇；幕間休息」，保留「互相影響；交互作用」、ID、詞性、draft狀態及全部其他欄位，不新增Sense ID。若後續批准修正，先依確認來源的SHA與身分／欄名定位、備份，再產生隔離候選，不以歷史列號直接覆蓋新檔。既有 `interact + N; interact to V` 搭配另留審閱，不混改。本輪只讀、沒有套用這項建議，正式字庫仍有該缺口。

## 十題完整新增文字

### disorder

ID：`CHOICE-CLOZE-ORIG-LV4U20-disorder`

原句：The room is in disorder after the boxes fall.

原中譯：箱子倒下後，房間一片雜亂。

既有答案：A · disorder

| 選項 | 完整解析 |
|---|---|
| A · disorder（正解） | disorder 在這裡作名詞「雜亂、無秩序」。in disorder 表示「處於雜亂狀態」；箱子倒下後房間變亂，符合句意。 |
| B · learned | learned 可作形容詞「有學問的」，也可作 learn 的過去式「學會了」。這兩種用法都不能接成 room is in learned，表示箱子倒下後的雜亂狀態。 |
| C · passive | passive（形容詞）是「被動的、消極的」，不是東西散亂的意思；文法上的被動語態也不是本句在說的房間狀況。 |
| D · freshman | freshman（名詞）是「一年級新生」。它指人，不指房間的整齊或雜亂，放在 in 後也不能表達箱子倒下造成的狀況。 |

### freshman

ID：`CHOICE-CLOZE-ORIG-LV4U20-freshman`

原句：The freshman arrives at college with a map and a bag.

原中譯：這位大一新生帶著地圖和背包來到大學。

既有答案：D · freshman

| 選項 | 完整解析 |
|---|---|
| A · harsh | harsh（形容詞）是「嚴厲的、苛刻的」。它不能在這裡單獨當作一位帶著地圖和包包到校的人；若要形容某人，還需要人物名詞。 |
| B · partnership | partnership（名詞）是「合作關係、合夥」。本句寫的是一個帶著地圖和包包到大學的人，不是在說一段合作關係抵達。 |
| C · privacy | privacy（名詞）是「隱私、獨處的空間」。它不是人，不能作本句帶著地圖和包包到校的主角。 |
| D · freshman（正解） | freshman（名詞）是「一年級新生」。college 是大學；這裡以 freshman 指到大學的新生，符合帶著地圖和包包到校的情境。 |

### harsh

ID：`CHOICE-CLOZE-ORIG-LV4U20-harsh`

原句：The coach is too harsh on the young player.

原中譯：這位教練對年輕選手太嚴厲了。

既有答案：A · harsh

| 選項 | 完整解析 |
|---|---|
| A · harsh（正解） | harsh（形容詞）是「嚴厲的、苛刻的」。be harsh on someone 表示「對某人很嚴厲」；too 又表示過了頭，符合教練對年輕選手太嚴厲的句意。 |
| B · partnership | partnership（名詞）是「合作關係、合夥」。這裡的 too 要修飾教練待人的態度，不能用合作關係這個名詞接成 too partnership on someone。 |
| C · privacy | privacy（名詞）是「隱私」。它不表示教練待人嚴厲，也不能直接放在 too 後，接成 too privacy on the player。 |
| D · ferry | ferry 作名詞是「渡輪、渡船」，作動詞是「用渡輪運送」。兩者都不能用在 is too ferry on someone 中，形容教練對選手的態度。 |

### privacy

ID：`CHOICE-CLOZE-ORIG-LV4U20-privacy`

原句：She closes the curtain for privacy.

原中譯：她拉上簾子以保有隱私。

既有答案：C · privacy

| 選項 | 完整解析 |
|---|---|
| A · ferry | ferry 的名詞義是「渡輪、渡船」，不是拉上簾子想保留的私人空間。若指某艘渡輪，通常還需要 a 或 the，不能只用 for ferry 表達本句的目的。 |
| B · sway | sway 可作名詞「搖擺、影響力」或動詞「搖擺、影響」。這些意思都不表示避免別人看見或打擾自己的私人空間。 |
| C · privacy（正解） | privacy（名詞）是「隱私、獨處的空間」。for 在這裡說明目的；她拉上簾子，是為了不被別人看見或打擾，符合句意。 |
| D · nowadays | nowadays（副詞）是「現今、現在」。它說明時間，不是拉簾的目的；for nowadays 也不能表示「為了隱私」。 |

### sway

ID：`CHOICE-CLOZE-ORIG-LV4U20-sway`

原句：The palm trees sway back and forth in the wind.

原中譯：棕櫚樹在風中來回搖擺。

既有答案：A · sway

| 選項 | 完整解析 |
|---|---|
| A · sway（正解） | sway 在這裡作動詞「搖擺」。back and forth 是「來回」，in the wind 是「在風中」；合起來說棕櫚樹隨風來回搖動，符合句意。 |
| B · nowadays | nowadays（副詞）是「現今」。它只能補充時間，不能當作本句 trees 後的主要動詞，表達樹木來回搖動。 |
| C · dense | dense（形容詞）是「密集的、濃密的」。它能描述樹木的樣子，卻不是搖動的動作；這裡不能少了動詞，直接寫 trees dense back and forth。 |
| D · overnight | overnight 常表示「在夜間、一夜之間」，作動詞時也可指「過夜」。本句的 back and forth in the wind 要表達樹木來回搖動，不是它們在哪裡過夜。 |

### dense

ID：`CHOICE-CLOZE-ORIG-LV4U20-dense`

原句：They walk through a dense forest.

原中譯：他們走過一片茂密的森林。

既有答案：C · dense

| 選項 | 完整解析 |
|---|---|
| A · overnight | overnight 作副詞可表示「在夜間、一夜之間」，作形容詞也能形容過夜的停留，並不表示樹木茂密。另外它開頭讀母音，若直接放在這裡，前面應是 an，不能接原句的 a。 |
| B · socket | socket（名詞）是「插座、承窩」。它不表示樹木密集；socket forest 也不是本句描述一般森林樣子的自然搭配。 |
| C · dense（正解） | dense（形容詞）是「密集的、濃密的」。dense forest 指樹木長得密的森林；它修飾 forest，符合他們走過一片茂密森林的句意。 |
| D · alcohol | alcohol（名詞）是「酒精、酒」。本句描述森林，不是在說酒精；而且 alcohol 開頭讀母音，若直接接在這裡，前面應用 an，不能用原句的 a。 |

### alcohol

ID：`CHOICE-CLOZE-ORIG-LV4U20-alcohol`

原句：The adult pours a drink that contains alcohol.

原中譯：這位大人倒了一杯含酒精的飲料。

既有答案：B · alcohol

| 選項 | 完整解析 |
|---|---|
| A · messenger | messenger（名詞）是「送信者、快遞員」。contains 在這裡說明飲料含有的成分，不是在說飲料裡裝著一位送信的人。 |
| B · alcohol（正解） | alcohol（名詞）是「酒精、酒」。a drink that contains alcohol 就是「含有酒精的飲料」，符合大人倒飲料的情境。 |
| C · settler | settler（名詞）是「移居者、定居者」。它指搬到某地生活的人，不是飲料中的成分。 |
| D · equality | equality（名詞）是「平等、相等」。它是抽象的觀念，不是飲料含有的物質，與 contains 後的成分意思不合。 |

### messenger

ID：`CHOICE-CLOZE-ORIG-LV4U20-messenger`

原句：The bike messenger delivers a small package.

原中譯：腳踏車快遞送來一個小包裹。

既有答案：C · messenger

| 選項 | 完整解析 |
|---|---|
| A · settler | settler（名詞）是「移居者、定居者」。它不是送件職業；bike settler 也不是表示自行車快遞員的常見搭配。這不表示定居者不能送包裹，而是這個字本身不表示快遞員。 |
| B · equality | equality（名詞）是「平等、相等」。它是觀念，不是騎車送包裹的人，不能作本句的送件主角。 |
| C · messenger（正解） | messenger（名詞）是「送信者、快遞員」。bike messenger 指自行車快遞員；delivers a small package 說他送一個小包裹，符合這個工作。 |
| D · bargain | bargain 可作名詞「便宜貨、交易」，也可作動詞「講價」。這裡需要騎車送件的人，便宜貨或講價動作都不是快遞員。 |

### equality

ID：`CHOICE-CLOZE-ORIG-LV4U20-equality`

原句：The equal shares show that everyone is treated with equality.

原中譯：相同的分量表示每個人都受到平等對待。

既有答案：A · equality

| 選項 | 完整解析 |
|---|---|
| A · equality（正解） | equality（名詞）是「平等、相等」。equal shares 表示每人分到相同的分量，直接支持大家受到平等對待，符合句意。 |
| B · bargain | bargain 可作名詞「便宜貨、交易」，也可作動詞「講價」。每人分量相同，說明的是對待是否平等，沒有說東西便宜或有人講價。 |
| C · resign | resign（動詞）是「辭職、放棄」。with 後這裡要接表示對待方式的名詞，不能直接用這個動詞，也與相同分量無關。 |
| D · resignation | resignation（名詞）可指「辭職」，也可指「無奈地接受」。它雖是名詞，卻不表示分配平等；equal shares 沒有提供辭職或無奈接受的線索。 |

### bargain

ID：`CHOICE-CLOZE-ORIG-LV4U20-bargain`

原句：The lamp was a real bargain.

原中譯：這盞燈實在很划算。

既有答案：B · bargain

| 選項 | 完整解析 |
|---|---|
| A · resign | resign（動詞）是「辭職、放棄」。a real 後這裡要接說明這盞燈是什麼的名詞，不能直接用這個動詞。 |
| B · bargain（正解） | bargain 在這裡作名詞「便宜貨、划算的東西」。a real bargain 表示買得很划算，用來說這盞燈物超所值，符合句意。 |
| C · resignation | resignation（名詞）可指「辭職」，也可指「無奈地接受」。它說的是離職或接受事情的態度，不是可以用划算價格買到的物品，不能把這盞燈稱為一次辭職。 |
| D · miserable | miserable（形容詞）是「悲慘的、令人難受的」。它可以形容很糟的燈，例如 a miserable lamp；但原句的 a real 後需要名詞，miserable 不能單獨表示一件便宜貨。 |
