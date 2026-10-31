# LV4 U20 五題逐選項解析：內容審閱稿

基底main：`25592eab53d37e394da9cd7f3b5ea1a3d9aee402`（PR50）。這是小批內容示範，沒有孩子最新作答紀錄，不宣稱是任何孩子的錯題。未授權本批合併或部署。

本批沿用既有解析機制，新增5題20項配對；ferry原解析保留，其他題維持既有fallback。所有題目ID、原句、中譯、選項ID／文字／順序及答案不變。只替cubes選項補入既有可選meaningZh欄位，說明它是cube的複數；不增加詞條ID或全庫詞形規則。

## 獨立內容審閱注意

- biography原英文未明說作者與旅行家是否同一人，因此不靠捏造作者身分排除自傳。原題空格前是a，而autobiography／interaction開頭讀母音，前面應用an；以原句已有的冠詞即可判斷。解析明確說明這項搭配，原題與答案均不改。
- interact現有公開詞條摘要混有「幕間劇；幕間休息」，不是本批採用的動詞義。本批解析採既有教材的「互動／互相影響」並核對Oxford搭配；未改寫字庫或母表，摘要缺口仍在。
- 下表為完整新增解析。現行UI仍顯示既有詞條的公開詞義；解析本身會明確指出本句採用的詞性／詞義，不把陣列第一義當作頻率。

## 核對依據

原題與教材義：`curriculumLV4Unit20.json`；現有詞義：`public/data/v1/sa-pack.json`。形狀義cubic沿用現有核定教材與W006089，沒有新增字義。外部詞義／搭配核對採原出版方資料並自行用繁中解釋，未搬用詞典例句：

- [Cambridge a/an](https://dictionary.cambridge.org/grammar/british-grammar/the)
- [Cambridge cube](https://dictionary.cambridge.org/dictionary/english/cube)、[murmur](https://dictionary.cambridge.org/us/dictionary/english/murmur)
- [Cambridge biography](https://dictionary.cambridge.org/us/dictionary/english/biography)、[autobiography](https://dictionary.cambridge.org/us/dictionary/english/autobiography)
- [Oxford interact](https://www.oxfordlearnersdictionaries.com/definition/english/interact)、[interaction](https://www.oxfordlearnersdictionaries.com/definition/english/interaction)

## cube

ID：`CHOICE-CLOZE-ORIG-LV4U20-cube`

原句：She builds a tower with colorful cubes.

原中譯：她用彩色方塊堆成一座塔。

既有答案：A · cubes

| 選項 | 完整解析 |
|---|---|
| A · cubes（正解） | cubes 是名詞 cube（立方體、方塊）的複數。with 在這裡表示「用」；她用多個彩色方塊堆塔，符合句意。 |
| B · cubic | cubic 是形容詞「立方體的」，用來形容物品；這個空格要放拿來堆塔的東西，只有 cubic 還缺少物品名稱。 |
| C · murmur | murmur 可作名詞「低語」或動詞「低聲說」；它說的是聲音或說話動作，不是能一塊塊堆成塔的物品。 |
| D · biography | biography（名詞）是「傳記」，記述人的生平；本句需要搭塔用的彩色方塊，不是在談人物生平。 |

## cubic

ID：`CHOICE-CLOZE-ORIG-LV4U20-cubic`

原句：Every block has a cubic shape.

原中譯：每一塊積木都是立方體的形狀。

既有答案：B · cubic

| 選項 | 完整解析 |
|---|---|
| A · murmur | murmur 的名詞義是「低語」，動詞義是「低聲說」。這些都與說話或聲音有關，不能說明積木是什麼幾何形狀。 |
| B · cubic（正解） | cubic（形容詞）表示「立方體的」。它放在 shape（形狀）前，說明每塊積木的外形，符合句意。 |
| C · biography | biography（名詞）是「傳記」，寫的是人的生平；這裡的 shape 問的是積木外形，不是人物故事。 |
| D · autobiography | autobiography（名詞）是「自傳」，由本人寫自己的生平；本句說的是積木的形狀，不是一本自傳。 |

## murmur

ID：`CHOICE-CLOZE-ORIG-LV4U20-murmur`

原句：They murmur to each other in the quiet library.

原中譯：他們在安靜的圖書館裡彼此低聲說話。

既有答案：C · murmur

| 選項 | 完整解析 |
|---|---|
| A · biography | biography（名詞）是「傳記」；They 後這裡要接說話的動作，人物傳記不是說話動作，不能填在這裡。 |
| B · autobiography | autobiography（名詞）是「自傳」，也就是自己寫的生平。這個空格要表達他們低聲說話，不是指一本自傳。 |
| C · murmur（正解） | murmur 在這裡作動詞「低聲說」。quiet library 是「安靜的圖書館」；murmur to each other 表示彼此低聲說話，符合句意。 |
| D · interact | interact（動詞）是「互動」，通常說 interact with each other。本句是 to each other，且要表達「低聲說話」；互動不等於低聲說。 |

## biography

ID：`CHOICE-CLOZE-ORIG-LV4U20-biography`

原句：She writes a biography about the famous traveler.

原中譯：她為這位著名旅行家寫傳記。

既有答案：D · biography

| 選項 | 完整解析 |
|---|---|
| A · autobiography | autobiography（名詞）是「自傳」，由本人寫自己。原句未交代她是否在寫自己；但這個字開頭讀母音，前面要用 an，不能接本句的 a。 |
| B · interact | interact（動詞）是「互動」；a 後這裡要接她寫的作品名稱，不能用這個動詞表示一本傳記。 |
| C · interaction | interaction（名詞）是「互動、交流」，不是記述人物生平的作品；而且開頭讀母音，前面應用 an，不能接本句的 a。 |
| D · biography（正解） | biography（名詞）是「傳記」，由別人寫某人的生平。a biography 表示「一本傳記」，後面的 about the famous traveler 說明寫的是這位旅行家，符合句意。 |

## autobiography

ID：`CHOICE-CLOZE-ORIG-LV4U20-autobiography`

原句：He writes his autobiography beside old pictures of himself.

原中譯：他在自己的舊照片旁撰寫自傳。

既有答案：A · autobiography

| 選項 | 完整解析 |
|---|---|
| A · autobiography（正解） | autobiography（名詞）是「自傳」，由本人寫自己的生平。himself 表示「他自己」；本題他在自己的舊照旁撰寫自傳，符合句意。 |
| B · interact | interact 是動詞「互動」；writes his 後這裡要接作品名稱，不能用這個動詞。 |
| C · interaction | interaction（名詞）是「互動、交流」，指彼此來往的過程；本句說他在寫自己的生平，並不是在描述互動過程。 |
| D · interactive | interactive（形容詞）是「互動的」，用來形容事物，例如互動遊戲。這裡要填作品名稱，不能把這個形容詞單獨當作自傳。 |
