# LV1 U16 補圖隔離接入

基準：LV2 pride 候選 `1762e78205364231b0135efc577c43b92851f8b3`；包含 pride 未發布內容，不能將本分支視為僅 LV1 的正式發布。

## 實際修改
- 一般字卡 guess / W000367 / EXb14d23b8、lake / W000465 / EX86662182、pond / W000664 / EXe0f6bf82 接入三張版本化 WebP。
- 只追加獨立 registry 及 resolver 末端 fallback，既有圖優先順序與 pride 保留。
- 原文字典、六條例句、教材 text_only 卡、母表、學習進度及審核狀態未改。
- 已再次查看三張最終圖片像素，核對英文中文與例句。guess 思考泡泡僅為猜測的視覺化，不代表史實。
- 新增精確可逆來源保護層；舊 pride proof/hash 原樣保存，先逆轉本次五行追加再驗證原有來源。

## 限制
- 尚未讀取 Windows 保存的 Unit_16 原稿舊圖；候選不覆蓋它。
- SSR 測試不等於瀏覽器圖片載入/重開、離線或實體裝置驗收。
- Windows 網址識別安全停止未解除，本次不嘗試繞過。
- 尚未發布，不能將整個 LV1 或 U16 標成通過。

## 接續
先讀 validation/RESULTS.md 的精確測試結果；完成實際畫面/重開/進度與離線驗收後，再決定合併發布。若只要 LV1，應從最新 main 重新套用最小差異並重跑，而非直接合併本含 pride 分支。

## 回復
移除 LV1 registry、其三張無其他引用的 WebP、approvedCurriculum 的新增 import 與兩條 fallback；保留 pride。測試保護層需一併回復，歷史 proof 不修改。
