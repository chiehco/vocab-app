# 字卡列出已收錄字義

字卡現在逐項列出已收錄且可公開的義項與詞性，不再以考點或一個預設義取代列表。一般字卡、字義頁、複習翻面、連續瀏覽、教材卡與 LV1 圖句入口共用顯示元件。未拆分的詞條摘要仍完整保留並標明；「已收錄」不表示字典所有義項已整理完成。

公開匯入器支援的 approved/reviewed/draft/needs_check 狀態可呈現，後兩者標為待核對；private_only、未知分發範圍、停用、拒絕及未知狀態不呈現。動詞三態須有完整結構欄位、核定狀態與來源，缺少時顯示尚未收錄，不從答案形或拼字規則推算。

## house 的核定資料

- 保留詞條 `W000415`、舊動詞義 `W000415-1` 與所有既有例句 ID。
- 新增 `W000415-2`：n. 房屋，房子；動詞為 v. 容納，收藏。兩義於 2026-10-26 核定。
- 三態：house / housed / housed，來源標記 `user:house-meanings-20261026`。
- 修正 museum houses 與 to house those stray dogs 的詞性／提示，並將 house 例句明確連到名詞或動詞義。
- 保留已發布的 daily 例句，另接入現行母表已有的住宅圖說句。原句不改派舊 ID。
- 住宅門口圖句 `LV1-U06-06` 綁名詞；舊書庫與咖啡館媒體綁動詞。未建立可靠 senseId 關係的其他圖句明示「義項未連結」，沒有自動猜配。
- 原詞條摘要中的住宅、機構、議院仍保留；本批沒有為其他意思或其他字新增語義。

## 更新流程

`import_data.py` 以欄名讀取可選的 verb_base / verb_past / verb_past_participle / verb_forms_source / verb_forms_status，以及例句、媒體的 sense_id；舊格式仍可讀。

`python scripts/apply_house_meanings.py --source <canonical-master.xlsx>` 只接入核定 house 記錄、保留其餘字與舊 IDs，再更新內容 hash 與 starter。不要以完整母表重匯覆蓋本批以外的已整合內容。來源 XLSX 與備份不加入公開 repo。

進度仍以原 word 身分保存，這次沒有更動 SRS、計分、錢包或進度資料庫結構。

## 驗證範圍

新增合成測試涵蓋零／單／多義、跨詞性、非公開資料排除、規則與不規則三態、缺欄位與待審三態不猜補，以及內容更新保留原進度。瀏覽器檢查使用隔離合成資料，涵蓋 320/390/1280px、40 義項手機捲動、一般與教材入口、house 圖句標籤及未連結例句。

本批以 draft PR 交審，不包含合併或部署。原使用者截圖仍受附件流程的 Windows 相容性限制，不能聲稱已比對其像素；實體手機、Safari、Firefox 尚未驗證。
