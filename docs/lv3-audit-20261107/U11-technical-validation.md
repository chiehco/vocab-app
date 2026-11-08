# LV3 U11 技術驗收

狀態：**completed_with_release_blockers**。技術檢查已完成，但不是 all-green，也不是發布批准。AFTER 為後續獨立階段，本次未執行。

## 首輪完整保留

首輪指定51個主檔，但 Vitest positional filter 同時收進 output 的保留候選，實際75檔。共4812 tests：4792 pass、16 fail、4既有 opt-in skip；另有4個額外候選檔 collection failure。213個原 TS2353 型別錯誤、原命令、stdout/stderr、JSON、所有逾時及失敗均保留，未以新版覆寫。正確範圍註記見首輪 FINAL-REPORT-scope-addendum.json，不把首輪稱為精確51檔。

## v2 精確範圍與結果

執行前使用 list --filesOnly --json 與 --exclude output/**，核實恰好51個指定主檔；實際結果再次核對同一集合。沒有收進 output 候選，不代表全專案覆蓋。

- 1767 tests：**1760 pass、3 timeout、4既有 opt-in skip**。
- U11：70/70，包含原54實例、12個 strict-equivalence cases、4個完整 senses/media 控制。完整逆序負例保持原資料及斷言，現已通過。
- recovered update：4/4；歷史 row guard 與 siege 修正通過。
- forced tsc、7檔 changed-file lint、git diff --check 通過。
- 單次 production build 與完整 product/build verification 通過。
- 單獨的新目的地 U11 exact parity：1/1 通過，原14個 assert呼叫與5000ms限制保留。

四個 opt-in skips 保持原 path/title：U02 pipeline fixture parity、unit fixture parity，以及兩個 starter-media real-checkpoint tests。它們沒有被偽稱在51檔run中執行。U11 exact parity 另有獨立成功證據。

## 仍阻擋發布

原5000ms下，本輪三個失敗：
- db-helper 原完整 whole-pack fixture：6728.5637ms。
- db-helper 新 caller-invariance：5598.914ms。
- U05 原完整六檔 proof：5209.9239ms。

Whole lint 仍失敗：保留的 U09、U10 production Three.js chunks 各一個 rules-of-hooks 誤判。設定未改、舊bundle未刪，沒有用 scoped lint 冒稱 whole lint通過。

U56本輪10/10、puppet本輪3/3，但舊5000ms失敗仍保留，不能宣稱已有針對性且穩健的性能修復。Puppet proof本輪約4962ms，僅約38ms裕度。沒有為取綠燈盲目重跑。

## 產品、來源與建置

- 六份完整獨立來源文件、497欄／213列比對通過。
- starter：37 words／88fields、8 examples／8fields、1 note／1field，完整順序與其餘集合不變。
- 五份實際 emitted standalone JSON 逐byte一致。
- 完整 bundled U11 curriculum 透過靜態AST恢復後整份相等；沒有退回token檢查，也沒有宣稱六份standalone JSON。
- persuasive原始／替換資產與registry雙語圖說身份驗證通過。
- 新 exact parity核對213patches、六份完整raw inverse、Python/TS整份after、前後與inverse hashes及unknown raw拒絕。原test、fixtures、expected、舊成功report逐byte保持。

## 不變性與權限邊界

144個產品輸入完全未改。17,548個既有protected files核查，只存在批准的六份整合變更；加上前階段已套用的 recoveredUnitIntegration，共7個授權test/helper tracked修改。另227個固定獨立來源／準備文件身份已保存。

全部原斷言、資料、負例與原時間限制保留。歷史斷言使用嚴格認證projection，不刪斷言、不縮樣本、不拆原timed body，不把原timed work移出測試。原fresh-install/update完整bodies保留。既有明列30000ms的測試未改，普通5000ms門檻亦未改。

先前Python九項TEMP與獨立來源／產品證據僅在輸入及Python-script身份未變下沿用。TypeScript helper有實質修改，因此新U11 exact parity另行重驗，未覆寫舊artifact。

未改ledger、application舊phase報告或產品；未commit、push、部署、AFTER或實體手機驗收。

## 完整證據

- 首輪：output/lv3-audit-20261107/u11-technical-resume-20261108/
- v2：output/lv3-audit-20261107/u11-technical-execution-v2-20261109/
- v2 FINAL-HANDOFF.json：完整命令、耗時、exitcode、失敗、最新pass與blocker對照。
- artifact-index.json：完整v2證據及單次build產物hash。
- discovery-verified.json、run-scope-verification.json、results.json：精確scope與原結果。
- product-build-verification.json、parity-final-verification.json、final-integrity.json：完整產品、parity與不變性證據。

本JSON摘要另記錄7個改動檔案及144產品輸入的確切SHA-256，供後續AFTER引用。
