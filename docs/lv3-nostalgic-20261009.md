# LV3 nostalgic 正式詞條（2026-10-09）

從已發布 main `3a4d022410e4f3c7dc189d6732fa0e2d517195b7` 接續，只處理使用者批准的 nostalgic。

- 主詞 `W006086`，義項 `W006086-1`，LV3／adj.「懷念往日時光的」。不以 homesick 替代。
- 正式例句 `EX-LV3U01-nostalgic` 沿用既有工作句：Finding her old school notebook made her feel nostalgic.／找到以前的學校筆記本，讓她懷念起往日時光。保留原 `workExampleId` 與 cloze question ID，不標成本次新撰。
- 實際只出現在 U1 的 `LI-LV3U01-nostalgic`；U2 沒有這一項，因此沒有添加或改寫 U2。
- 教材主顯示與一般卡均使用核准中文。舊章節字面「鄉愁的」保留於 `lv3NostalgicReview.json.originalChapterMeaningsZh`，供來源追溯。
- words 6085 → 6086，senses 766 → 767，examples 7865 → 7866；起始包 1529 → 1530。U1 100 個映射入口對應 99 張獨立卡，U2 116 張不變。

只追加母表主詞第 6088 列、義項第 768 列、例句第 7995 列；64 張表、829 個公式、所有原儲存格、表格 metadata 及其餘 ZIP 成員保留。原 SHA256 `0af6602355b3ef31cbb54cbd43fe412566c7582326e47684d2f71caa22af4bdb`，產製 SHA256 `76737ac427b80322a40b72abb50980717f656ea980c61474f28d7d520488aecb`。

`apply_lv3_nostalgic.py` 先在隔離目錄完成母表／資料／教材／離線包生成，全部成功才替換 App 與暫存產物；錯誤會回復，重試不留下重複詞條。`verify_lv3_nostalgic.py` 全量核對母表與整批 delta。正式母表另在全部驗收後備份、替換；寫入前重查 scope audit、App 指紋、原始與產製母表雜湊，既有備份不得覆寫。

正式母表已完成上述寫回流程；同目錄備份為 `萬詞譜母表_SA義項清理整合_20260904_before_nostalgic_20261009.xlsx`。先前 limousine/limo 的備份保留，不覆寫。

本機 lint、typecheck、build、完整 320 項 App 測試與 14 項 Python 套用器回歸通過。隔離 main 副本重跑最終腳本，八項 App 產物相同（僅 generatedAt 可不同），Excel 指紋相同，實際來源及 App 未受重跑影響。新瀏覽器正常安裝有 1530 詞；教材／一般卡的核准主釋義與原句、U1 群組 99 張卡含 nostalgic、正常重新整理保留，以及 390×844 無水平溢出均通過。未驗實體手機。

本批沒有圖片批准或圖片差異；homesick、witch/wizard、原 LV3 圖句批准紀錄、所有無關詞條與資料保留。沒有修改 SRS、使用者學習紀錄、UI 程式或舊工作區的未提交修改。PR 保持 draft，本次不合併、不部署。
