# LV3 U01 文字修正驗證紀錄（2026-11-07）

## 範圍與結論

產品基準為 99883751926bd6cb4feff70daff56c07afc130cb；28 列來源限定修正及最初測試接線已提交於 39a8f4f。此紀錄涵蓋後續歷史測試投影修補與驗證，不新增產品修正或圖片 mapping。

**本次首次全套並非全綠。** 已補正兩項確切歷史讀入投影，相關 focused 全過；五項資料庫安裝／刷新超時有完整原碼重跑及對照紀錄。最終 LV3 批次發布前仍須在低負載下，以原預設門檻重新完成全套驗收。

沒有改舊 fixture、任何歷史 hash、測試 timeout、seed、Response 行為、資料庫、原斷言或依賴版本；沒有為波動加入無關產品效能改版。

## 首次全套及精準修補

命令：node node_modules/vitest/vitest.mjs run。原 vite.config.ts 已設定 maxWorkers: 1，測試預設 5000ms 未變。

- 246 個測試檔：239 通過、7 失敗。
- 2013 項測試：2006 通過、7 失敗。
- 總耗時 1747.39 秒，其中 import 659.28 秒、tests 994.26 秒。
- 兩個內容失敗是缺少後續已驗 U01 投影，不是更新預期 hash 解決：
  - recoveredUnitIntegration：僅對 U01 learningItems 執行 strict inverse，還原新修的 explanationZh。原 itemsHash 與空 questionsHash 全保留。
  - additionalCaptionRepair：保留獨立舊 raw-file hashes，先驗證完整 U01 after rows，再還原 words/examples/notes；meta 和 sa-pack metadata 必須完整等於本次已驗 transaction 結果才還原。保留原序列化格式與 LF，未知欄位或格式漂移仍拒絕／被原 hash 揭露。
- 另五項失敗均為完整 starter 的 fresh install 或 content refresh 超過 5000ms，詳如下節。

U01 helper 取代舊 helper 原本的一次 clone，不是為整個歷史鏈疊加另一遍 clone。五項 async DB 失敗路徑不呼叫該 inverse。實際觀察為單一 forks worker持續輪替；無重複啟動全套。

## 五個超時的原碼重跑

保留全量 starter、所有原斷言、真實 Response JSON 解析及 DB 安裝路徑，不先做 fixture 優化。以 --maxWorkers=1 --reporter=verbose 順序重跑五檔；系統可用 RAM 約 5.7GB，無其他由本驗證啟動的 heavy test。系統仍有其他 Chrome 程序，沒有擅自關閉使用者程序，因此不宣稱全系統瀏覽器皆已關閉。

| 原失敗項目 | 首次全套 | 五檔原碼重跑 |
| --- | ---: | ---: |
| LV1 U19 content refresh | 5053ms timeout | 3191ms，通過 |
| LV2 U30 fresh starter | 5027ms timeout | 3862ms，通過 |
| LV6 U4 content refresh | 5068ms timeout | 3596ms，通過 |
| LV5 U18 fresh starter | 5052ms timeout | 4602ms，通過 |
| LV5 U25 fresh starter | 5039ms timeout | 5011ms，仍 timeout |

五檔重跑結果：4 檔通過、1 檔失敗；41/42 tests 通過，耗時 65.15 秒。不能將這一輪寫成全過。

### U25 分段與原碼 baseline/current 對照

僅一次暫時加入時間觀察，所有行為、斷言與 5 秒門檻不變；finally 已逐 byte 還原原測試。還原 SHA256：6c1400a27f224f691bbbbd8a490dab27bcedc66d8b3d95cc313a456f0dc982eb。

- 該次分段測試 fresh 4403ms、5/5 tests 通過。
- stringify 約 67ms；Response 準備約 36ms；JSON parse 約 126ms。
- 安裝完成累計 4246ms，其中解析後 DB 寫入約 4016ms；bulkGet 與全表解析檢查再約 151ms。
- 預序列化至多省少量時間，並非主要瓶頸，未採用 fixture 改版。

接著在同時段順序執行 -t 'resolves every formal card'，兩次皆保持原碼、原完整資料、原 5000ms：

- 乾淨 lv2-release-20261107（9988375）baseline：4534ms，通過。
- current U01：3579ms，通過。

這些數據顯示此本機 DB 測試有時間波動，不能據此將首次全套失敗抹除，也不主張已證明所有環境必定通過。最終發布仍須低負載全套。

## 其餘驗證結果

- 初次 focused：U01、unitAudit historical guards、LV2 U50，共 3 檔、127 tests，全過，33.89 秒。
- 兩項歷史投影修補後 focused：recoveredUnitIntegration、additionalCaptionRepair、U01（含新增 raw metadata/format mutation guards），3 檔、16 tests，全過，25.68 秒。
- npm run typecheck：exit 0。
- npm run build：exit 0；713 modules，Vite built in 14.11 秒；PWA 268 precache entries。存在既有大 chunk／plugin timing 提示，沒有藉此修改產品。
- npm run lint：exit 0；既有 scripts 與 output/playwright 暫存 JS 警告，無本次測試碼 error。
- Python 3.13：-m unittest discover -s scripts -p test_apply_lv3_unit_audit.py -v，10/10 通過，53.790 秒。涵蓋 full-row guards、路徑穿越、重複 patch、status 保護、無關資料漂移、mixed state、dry-run 零寫、替換失敗回復、冪等及精準逆轉。

### TypeScript 共用快取限制

隔離樹 node_modules 是指向相同 release 的 junction，可能共用 .tmp/tsbuildinfo；本次 typecheck/build 執行期間可能與另一隔離樹 typecheck 重疊，無法回溯證明完全隔離。因此 exit 0 不等於無快取的獨立完整證明。最終整合樹需串行執行 tsc -b --noEmit --force，再做發布驗收；未更動依賴或快取策略掩蓋此限制。

## 本機 evidence logs

下列檔案位於 output/lv3-audit-20261107（未加入本提交）：

- full-vitest.log
- timeout-diagnostic-original.log
- timeout-u25-profile.log
- timeout-u25-baseline.log
- timeout-u25-current-original.log
- historical-projection-focused.log
- typecheck.log、build.log、lint.log
- python-applier-tests.log

此次只提交測試修補與本驗證文，不 push；沒有把首次全套記為已通過。
