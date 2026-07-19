# 萬詞譜 S 級 179 圖卡・部署交接

## 已完成

- S 級 185 筆資料已匯入；179 個實詞有完整例句、誘答與圖卡，6 個功能詞維持無圖題型。
- 179 張原始 PNG 已審圖並保存；發布版 179 張 WebP 已逐一確認可解碼、尺寸均為 1024×1024。
- S 級圖卡已接入正式看圖測驗、複習與單字詳情的共用資產解析器。
- S 級看圖測驗實測可載入圖卡、正確作答、顯示「真名確認／封印完成」，並進入下一題。
- PWA 核心預快取約 6.7 MB；圖卡改為按需下載與快取，不再首次載入約 152 MB。

## 驗證紀錄

- npm test：7 個測試檔、42 項測試全數通過。
- npm run lint：通過。
- npm run build：通過；PWA service worker 與 manifest 成功產生。
- S 級 manifest／發布資產：179／179、ID 全唯一、零缺檔、零多檔。
- 瀏覽器：抽測兩張 S 級圖卡皆為 1024×1024 WebP，console 無 error／warn。

## 發布方式

專案已設定 GitHub Pages workflow（.github/workflows/deploy.yml）。確認變更內容後，由專案擁有者提交並推送 main：

~~~bash
npm test
npm run lint
npm run build
git add -A
git commit -m "完成萬詞譜 S 級 179 圖卡與題庫整合"
git push origin main
~~~

GitHub Actions 成功後，測試網址為：

<https://chiehco.github.io/vocab-app/>

本交接只整理到可部署狀態；未代替專案擁有者提交或推送。
