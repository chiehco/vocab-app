# LV3 U09 修改前實際畫面封存

基準：00a7d7d76667d6a3d91c6e7517c9d839e4bbcb4d，content/lv3-unit-audit-20261107。這是修改前紀錄，不是修正後或正式發布驗收。產品、原source、圖片及主Excel均未修改；未compile、product seal、apply、commit、push或deploy。

## 完整實際覆蓋

- 171教材項（108詞彙、63文法）、81唯一一般卡、278動態頁籤全數實際循路讀取，ID集合完全吻合；保存各卡route、heading、DOM HTML、文字、來源欄位觀察及截圖。
- 桌面530張截圖；另13條390×844代表路徑／36個tab視圖、正常Back與關閉重開，共610張截圖。涵蓋長文、長詞、27個null-ID中的代表、所有5種實際tab類型，以及圖說與圖片缺口；沒有橫向溢出或採樣文字遮擋。
- 協調者獨立目視6張窄螢幕代表截圖，逐項記錄於before-visual-review.json；不宣稱所有截圖都另經人眼重看。不是實體手機或離線／正式站測試。

## 來源與已安裝內容

開始時9張ContentDB表、14張ProgressDB表、localStorage及sessionStorage與U08 final完整JSON列完全相等。App啟動延後refresh後再次檢查兩個installed pack hash，以及81 words、115 examples、30 notes、13 senses、15 media共254個完整選定列，均與目前source及starter pack相等，才開始全卡擷取。

Vite實際HTTP的package、U09 JSON、meta與本checkout逐位元相等；實際匯入的U09 runtime module與source相等。教材仍text_only／read_only，無題目或作者圖片。正式metadata列與可見DOM分開：2731個非空來源字串葉值中1665個在tab文字找到，1066個未找到；這是觀察而非所有欄位直接可見的宣稱。notes／examples使用正式word字串關聯及真實主鍵。

## 圖片與原有缺口

21張實際啟用圖完整HTTP 200、decode、尺寸、source bytes／SHA256核對通過；81一般卡與全部278頁籤沒有額外active圖。81詞的圖說與圖路徑均對上圖片審查者直接由source獨立推導的預期。quote／release原缺英文圖說，保留不填。persuasive右側傘收合、原caption卻說撐起，來源審查者與協調者各自目視確認；本次原樣封存並列待圖句批准，沒有採用修改。

## 保存與邊界

初始、refresh穩定、關閉前、重開、最後五階段均以完整table rows比對U08 final：ContentDB及非導航ProgressDB零變更，非導航settings與local/sessionStorage零變更。保留2 groups、2 review logs、wallet10及daily cap15；只有正常學習導航bookmark更新，原值與新值完整列出。沒有建立群組、答題、領獎、SRS變更、DB注入或清除。

正常Back回stop字義tab後文字一致；正常關閉重開同profile、等延後refresh後stop字義tab與原完整擷取文字相等。U09 session已關閉，原無關LV1 session保留。console零errors／warnings。

144個input_paths以獨立單次raw bytes讀取，保存raw／CRLF→LF SHA256及bytes；初末零差異。domain外的原scripts/sources/LV3Unit9.json另行保護且不變。7個U07/U08既有不可變封存索引指紋初末不變；先前逐檔全量驗證由父任務已完成，本次不重複宣稱重驗全部舊檔。

本輪離線verifier初稿因CommonJS保留名稱module而在parse階段失敗，沒有執行或更動任何封存資料；保留原稿、以v2修正本地變數後驗證零失敗。不是重擷取或隱藏產品錯誤。

完整證據：output/playwright/lv3-u09/before-verification.json、before-caption-verification.json、before-version-readiness.json、before-runtime-metadata.json、before-source-dom-observations.json及before-seal-index.json。原BEFORE文件不預填未來compiler manifest；後續product seal應另建U09-sealed-capture而不改本文件。
