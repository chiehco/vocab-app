# LV4文字教材候選依賴

所有候選在 `C:/Users/USER/Documents/Codex/2026-10-14/task/vocab-app-lv4-local` 產製並逐批固定；PR、最終整合、啟動包重產與部署由父任務處理。

| 候選 | 固定commit | 直接基底 |
|---|---|---|
| draft/lv4-u1-u2-textbook | 03bd97ab14e7a2df30b843bdd4ad8996a10ec5b4 | main 03cebe42444eef66e26a7f7d1e8be83979ca32c6 |
| draft/lv4-u3-u4-textbook | 28caaf562d45cff1b3cf83726a15fa2935634e69 | 03bd97ab14e7a2df30b843bdd4ad8996a10ec5b4 |
| draft/lv4-u5-u6-textbook | 2709621707b5e4d90ab808f203a839f556509d54 | 28caaf562d45cff1b3cf83726a15fa2935634e69 |
| draft/lv4-u7-u8-textbook | 539a524764f505e385c983001e9b75c47455eeb6 | 2709621707b5e4d90ab808f203a839f556509d54 |
| draft/lv4-u9-u10-textbook | 772bd4de57ec539af8d0f666d5b6d18e1ae4684b | 539a524764f505e385c983001e9b75c47455eeb6 |
| fix/lv4-u1-u2-source-qa | c301a0b0fd010f9b68828c66836075e17a5e516e | 03bd97ab14e7a2df30b843bdd4ad8996a10ec5b4 |
| 第六批前納入首批修補 | 9cbbd9f80921459d3c63ab997e19624cc8397cd6 | 772bd4de57ec539af8d0f666d5b6d18e1ae4684b |

`draft/lv4-u11-u12-textbook`在9cbbd9f後新增U11／U12，本批exact commit見父交接。此後候選分支依次從上一固定批建立，持續繼承9cbbd9f，因此不回帶修補前的research合併框、世紀註記漏收及氣圍誤字。

9cbbd9f是c301a0b的cherry-pick；產品／來源／測試物件相同，只有工作清單因後批紀錄而手動解文字衝突。最終整合應採用一份首批修補：可納入已包含9cbbd9f的後批歷史，或另依c301a0b修補相同檔案；不要重複套用兩份修補。不能只取新增U11／U12的commit而漏掉修補依賴。p22仍pending，不宣稱缺頁已驗完整。

各批啟動包只包含其分支已登錄教材。與LV3工作線集中整合時，須由最終全部教材重產，不能用某批sa-pack覆蓋另一工作線。既有U17–20與正式字庫／SRS／小鎮／金幣／13表schema均保留；沒有在此工作線自行合併或部署。
