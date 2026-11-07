# LV3 U07 來源審查與修正候選

## 目前狀態

本單元已完成詞彙、用法及現行圖片來源審查的整合覆核。文字狀態為 **reviewed_draft_not_compiled_sealed_or_applied**，不是已套用、已發布或after QA通過。

G036精確單列guard已另案驗證並保存於d75d134005df6227180ceb599088d1646ad03541；本次整合沒有重跑或替代該驗證。正式compiler、fixture、seal、apply、文字技術與after runtime驗收尚待後續進行。

attraction新圖及observation英文圖說已由獨立整合接入本機，素材提交3dbd336、整合提交6e5fe303c559dc899b5251fa7637ad41dc460872。其隔離14檔149項測試、forced tsc及focused lint由該整合記錄提供，不能當作本次文字候選驗收。圖片狀態為**integrated_awaiting_runtime**，尚未進行實際after瀏覽器驗收。兩項圖句修正不混入下述171欄計數。

本次只新增review與output，不改ledger、chain、教材source、產品或既有before證據；未commit或push。

## 範圍與精確變更數

教材p63–72共153項，含100詞彙及53用法；p73僅作U08邊界核對。85筆教材映射連至84個正式詞，adviser與advisor共用W002017。15個無正式ID補充詞維持officialWordId／officialSenseId為null，lexemeRef仍為原拼字，且維持read_only，不新增一般字卡。另覆核115例句、33筆記與13個senses。

- curriculum：82欄／23列，其中詞彙80欄／22列，G036兩欄／同一列。
- words：77欄／33列。
- examples：12欄／8列，僅sensePos及meaningHint。
- 合計**171欄／64列**。notes與senses零修改。

整合逐筆確認exact proposal字段、完整beforeRow、beforePresent／beforeValue、來源、保護欄、重複及no-op。100詞彙、53用法、84詞、115例句、33筆記與13 senses均與目前來源一致；正式表亦對上封存的runtime來源列。七個相關pipeline輸入與獨立before raw／LF hash相符，另有一個不在144輸入集合內的教材source檔，對上grammar獨立raw／LF記錄。這是靜態資料覆核，不是重新執行compiler或瀏覽器驗收。

## 詞彙裁示與來源

15個教材佔位詞補上原頁已有詞性及義項：trendy、charming、appealing、copilot、enslave、necessarily、insensible、sufficiency、insufficient、crisp、apricot、widely、weakness、handbag、observant。necessarily原印「adv. 必然的」，候選依副詞功能寫「必然地」，原source不改。其餘補回原頁缺漏核心義、solid名詞詞性，修正cabbage「甘蘭」為「甘藍」及rally「跌停回升」為「止跌回升」。

一般詞補既有詞性所需的中英文義，保留已成立的其他義：crop啃草／剪短、heap與hollow動詞、pile與sum動詞、pilot駕駛／試行、tide sb over、marker麥克筆／標誌、reminder提醒物、camp營地、crunchy食物鮮脆、junior年少／資淺、hell宗教義、summary形容詞及advisory名詞。almond英文原定義在hard g...截斷，候選改成完整樹木與種子雙義，未刪除其中一義。

搭配修正針對誤導的通用「+ N／to V」樣板、介詞與中文對應，不把所有舊搭配視為錯誤。glance／stare／peep保留特殊及物義，但瞥視、凝視、偷看的常用框架明列at／through；observe節日區分慶祝／紀念；avenue保留道路與方法；junior／senior區分比較與年級；cholesterol及spinach不以a/the誤示可數份量。rally只移除「必須先跌停」的錯誤限制，集合等義保留。

20個新verbForms逐筆對上來源審查記錄中的直接Collins三態證據：crop、glance、heap、hollow、observe、pile、pilot、remind、slave、stare、sum、threaten、peep、summarize、ally、execute、rally、stack、tide、mound。mound使用[Collins conjugation](https://www.collinsdictionary.com/conjugation/english/mound)，其餘保留各自字典URL。原9個verbForms不變；新verbForms.status=approved不改原詞row.status。

189筆跨單元consumer、59個檔案逐列與目前來源比對，沒有改別課教材。glance礦物、peep使露出、crispy捲曲、lettuce紙幣等罕見義有直接字典審查證據，仍保留。spinach貨幣／胡說及onion使掉淚等本輪未取得充分新證據的義，也不因未查到而刪除。

## G036是原書誤植，不是錄入錯誤

p69照片20260815_092552.jpg確印「crop, copped, cropped」；照片SHA256為a50bf1194b4b624fec6fd98cf6d5cfe345cfeec5186421443d54d7acfa735ed4。[Collins crop](https://www.collinsdictionary.com/dictionary/english/crop)直接列出「past tense, past participle cropped」。兩份來源候選的完整beforeRow相同，整合後仍是同一列兩個欄位：

- pattern：crop, cropped, cropped（三態；原書第二態 copped 為誤植）
- explanationZh：crop 的正確三態為 crop, cropped, cropped。教材 p69 原書第二態印作 copped，屬拼字誤植，不是 crop 的正確過去式。

原source歷史記錄未改，不代表仍認可copped。U06 G015是錄入漏for，不能與本次原書印錯混為一談。其餘52用法保留，52筆可選解說不採用。G018「不可說drive a plane」警語、G029與G031各自的In sum均保留，不去重。

## 原句、筆記及來源疑問

115句中英文、blank、answer、穩定ID與原status完整保留，105 reviewed／7 approved／3 draft不升級。115組填空用完整底線段替換原answer後皆可還原原句，僅忽略大小寫。crop、pile、stack、sum四句修正動詞詞性；四句enough依實際句法修正詞性及義提示。Joy句的n.依App既有分類及[Collins所收Webster’s New World詞條](https://www.collinsdictionary.com/dictionary/english/enough)列出的數量名詞義；套用到該句仍屬句法分析，不宣稱字典已逐句裁定。Ron「pays him enough」的名詞／代名詞或程度分析有差異，維持原metadata。

- necessary下punch in筆記及cholesterol下suspension筆記缺原課上下文，保留，不擅移或刪。
- enough名詞sense保留，歷史「罕用建議刪列」不等於刪除授權。
- crispy、hollow、vacant考題來源未讀到官方原題，不升級draft或聲稱原題已核證。
- bamboo幼稻竹竿情境不典型，沒有確定來源支持修改，原句保留。
- LV6 U16 hell的adj.只列跨課待核，不在本單元改動。

## 現圖與圖說邊界

現行coverage為100教材詞彙列：26列有現圖、59列映射但無圖、15列無正式映射。26張現圖已由原圖片審查逐張目視，不是53張歷史U7待審稿。圖句採一般字卡現有綁定，不注入text_only／read_only教材。

- attraction：原圖前景多出第三臂，另案目視可用的新圖已接入；保留夜市美食、四角色、構圖及原中英圖說，待after runtime。
- observation：僅英文圖說a telescope改為binoculars，符合現圖雙筒望遠鏡。本次直接讀取現在caption已與候選after一致；原中文、圖檔及兩條正式例句不改。
- 其餘24張現圖保留。execute原英文圖說缺漏不補造；hollow、marker既有一般義圖不硬綁成本課義。

原image inventories／handoff／caption候選及before records仍維持當時bytes，不能拿整合後caption hash回寫before，也不將該正常差異判為原證據失敗。

## Before證據與未驗範圍

[既有before報告](U07-before-qa.md)封存153教材卡、84一般卡、282一般分頁與610截圖。390×844覆蓋16路徑／43視圖；26圖HTTP／bytes／decode／resolver／caption均有證據。144輸入raw與LF hash穩定，804個證據檔已封存。本次只核對提供的index及v2檔hash，沒有重跑804檔驗證、重拍或改寫。

首次checker誤用mediaId的歷史保留，修正版以assetId鍵讀取既有快照後通過，不是重拍。curriculum由JSON module import，不是ContentDB table。隔離profile保留confirm及puppet群組／reviews、wallet 10與dailyNewWordCap 15，只變更正常導航bookmark。這些是before報告的範圍，不是本次新增操作。

未驗文字套用後runtime、實體手機、full-pack installed、offline matrix、練習模式、SRS scheduling或正式站。本次整合未執行compiler、seal、apply、fixture、測試、typecheck、lint、build或browser。

## 候選、獨立預期值與公開邊界

- Canonical候選：output/lv3-audit-20261107/u07-source-review/U07-accepted-proposals-draft.json。
- 原始bytes SHA256：9b125499fee0a4f4adb9e28eff8bbd762d6a9937a1425b2aa0802aa7e0b64bb9。
- Node JSON.stringify值SHA256：4e26aaccd846d91ee86a4e5718eadad57c74734c93b9cda4bebb0ac98478823f。此為保留插入順序的JSON值hash，不是sorted-key或原始檔案hash。
- 獨立逐列／逐欄預期值及hash：同目錄U07-independent-accepted-hashes.json，64完整before／expected-after rows及171欄，直接由審查候選與目前before rows產生，不從未來manifest倒造。原始bytes SHA256為6b96721c5c12c3b022b725f2bada0afa7fe19a578c1403ac3717ceb0b650f469。
- 整合驗證：同目錄U07-independent-review-validation.json。19份來源原件保留於sources/，完整檔案索引另列artifact-hashes.json。來源proposal、sources array及metadata完整保留，G036兩欄採原作者精確字串。

本次獨立核對記錄、語義範圍、before rows及證據一致性，沒有重新開字典網站或重看全部原圖；原始來源讀取／目視方法與限制保留在各審查文件。Hash本身不能證明語義或圖片正確。

原件以bytes不變複製，含歷史本機路徑的inventory／image provenance僅留untracked output，不加入Git或作附件。canonical與本公開review私人絕對路徑掃描均為0；未改既有產品media.licenseNote，也不把該歷史欄位列為新增發布內容。
