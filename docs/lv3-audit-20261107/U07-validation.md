# LV3 U07 本機技術驗證

## 範圍

以提交 `67c6cd5358795c801b8d3b0c27f054d81e136930` 的 U07 資料及中文用法顯示修正為基準。後續只修改 lv3Unit78Text.test.ts 的歷史資料斷言，產品資料、顯示程式、原教材來源、pipeline guard、timeout 皆不變。瀏覽器第二輪結果另見 U07-runtime-qa-after2.md。

## 通過結果

- 修正後相同 10 檔 Vitest 一次執行：179/179 通過。
- 最後加強歷史補充詞斷言後，受影響檔案 11/11 通過，forced 全專案 TypeScript、focused lint 及 git diff --check 通過。其餘九檔未變；最後此斷言加強後未再宣稱有一次新的 10 檔全跑。
- 最終實際安裝耗時：U7 3458ms、U8 2778ms、完整 starter 更新／進度保留 3651ms，原 5000ms 限制不變。
- 全專案 lint exit 0（有既有 warnings），production Vite build 通過，均在後續 test-only 修改前完成；產品程式之後沒有改動。

## 保留的失敗與修正理由

初次執行中斷，只留下六項失敗摘要，沒有完整結束或 exit claim。確認程序已不在後，以新目錄續行，完整 no-edit 10 檔結果為 173/178；三項舊斷言仍期待 crop/copped 待裁決及舊 meaningSource，另兩項實際安裝超過 5 秒。

安裝測試先在低負載原樣獨立重跑 3/3 通過：4399／3904／4265ms。不縮減資料、不跳過真實 seed、不改 timeout，也沒有為通過而修改產品。

歷史斷言現在先用既有 lv3AfterUnitFile 驗證整份目前 U07 runtime 文件，再嚴格反向投影至 LV3-U06，比較原來源的文字與 provenance。舊來源與舊預期不改，另外斷言目前 crop 正確三態及 rally 核對來源，並拒絕未記錄的 pattern、provenance 與未修改列漂移。歷史 placeholder 的精確 ID 順序對照非空的原 source.related null-ID 清單（U7 15、U8 14），避免空集合造成假通過。U8 與實際安裝、更新、個人群組／進度測試仍用目前資料。

## 完整性與限制

144 pipeline inputs 的 raw／LF hash 與 bytes 等於原 after1 及本輪開始。1,133 個受保護來源、script 與既有驗證檔中只有指定 test 改變。原失敗、來源、測試版本與命令記錄保留於 output/lv3-audit-20261107/u07-final-technical-20261108/，final-integrity.json 記錄精確 hash。

這是 U07 指定範圍驗證，不是完整 Vitest 套件。U07 的兩個圖片題、ReviewFlashcard browser 路徑、來源疑問仍依各報告保留。LV3 整級發布前仍需最終全套驗證及正式部署版本核對；沒有實體手機、offline 或完整安裝包驗收宣稱。
