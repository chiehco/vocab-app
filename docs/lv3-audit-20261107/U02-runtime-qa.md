# LV3 U02 執行階段驗收

驗收日期：2026-11-07。結果：通過本次桌面瀏覽器驗收範圍。

## 實際涵蓋範圍

- 修改前、後均實際瀏覽 178 張教材卡：138 張詞彙卡、40 張文法卡。
- 修改前、後均實際瀏覽 116 張不同 officialWordId 的一般字卡；此數字不是原創例句題數。
- 已套用 manifest 的 37 列、57 個變更欄位，均與執行中的內容資料逐欄完全相符。另實際切換 26 個受影響一般詞條的字卡、字義、搭配等頁籤並保存文字與截圖。
- 透過畫面上的「做題目（整單元 40 題）」進入正常文法流程，實際完成 32 次作答，涵蓋全部 7 題變更題：02、05、15、19、21、22、40。各題原題幹、全部選項文字、目標說明、正解解釋均在題目／回饋畫面核對通過，並保存逐題截圖。每題僅沿一個實際選項作答分支驗證回饋；未逐一走完四個選項的所有解釋分支。

## 圖片與內容保全

- 實際可達且成功載入 48 筆圖片呈現：教材 1 筆、一般卡 47 筆，共 47 個不同圖片路徑。所有圖像均完成載入且具有有效原始尺寸。
- 舊來源清單的第 49 筆 weakness 是沒有正式一般字卡連結的別名候選，不計入實際呈現；原清單未遭覆寫。
- 唯一可達圖片變更為一般字卡 permissible，更新至 wordbeast/lv3-reviewed/W005669-permissible-v2-a5af5eaebfa9.webp，SHA-256 為 a5af5eaebfa9058347db55aa708d3c0bf01dc4481bee4000a11661667d5a467d。實際畫面為開門與獲准通行，符合原雙語圖說；其他圖片路徑與原始檔案雜湊均維持不變。
- 教材 permissible 仍為無圖卡，原展覽館小袋例句保持不變。全單元 learningItemId、originalExample 物件及文法 questionId、題幹、正解均與修改前相同。
- 8 筆 A 級圖片原本不在一般卡呈現雙語圖說，不將來源清單的描述誤算為畫面缺漏；其餘 40 筆可達圖片呈現保有原圖說。

## 狀態與重開驗證

- 使用同一個隔離測試設定檔，修改後首次重開與真正修改前終態比較，進度資料及儲存內容不變；唯一差異為再次造訪 permissible 所更新的導覽時間戳記。
- 正常文法測試產生 32 筆測試作答與 1 個測試練習階段。關閉、重開同一設定檔後，完整狀態逐值相同，原作答回饋仍可見。
- 正式複習相關 cardStates、reviewLogs、quizStats 始終為空；未建立金幣紀錄。最終狀態另存，舊快照均保留。驗收後瀏覽器已關閉。

## 證據與限制

本機驗收證據保存於 output/playwright/lv3-u02/：before-curriculum.json、before-general.json、after-curriculum.json、after-general.json、after-exact-fields.json、after-fields.json、after-grammar-dom-checks.json、after-quiz-changes.json、after-quiz-reopen-state.json、after-acceptance-summary.json，以及逐卡／逐題截圖。

真正修改前終態為 actual-final-before-state.json，最終修改後終態為 actual-final-after-state.json。另保留不含 manifest 預期值抄錄、由實檔獨立計算的 144 項 input hash map，供套用前封存核對。

本次為桌面 Chrome、全新隔離測試設定檔驗收，未執行 390px 響應式模擬子集，不代表既有使用者歷史 SRS、實體手機或離線 PWA 已通過測試。沒有發布、實體裝置或離線功能的驗證宣稱。
