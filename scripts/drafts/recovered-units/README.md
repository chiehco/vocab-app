# 三個追回來源單元：資料審閱草稿

基底為正式 main `a5f7701f77967f4a7540ba616f76278e54c51ba9`。這批沒有接到學生入口，沒有解除 LV6 U21 hold，也沒有改公開字庫／起始包、主 Excel、既有 ID 或進度。它是可重現的文字教材草稿，待另一批資料接入與發布批准。

## 已完成的來源與整理

| 單元 | 印刷頁 | 獨立字頭 | 其中編號主詞 | 相關／小字補充列 | 用法列 | 唯一正式映射 ID |
|---|---|---:|---:|---:|---:|---:|
| LV3 U12 | 119–130 | 45 | 1–35 | 74 | 63 | 96 |
| LV3 U18 | 187–196 | 45 | 1–28 | 57 | 44 | 85 |
| LV6 U21 | 195–203 | 46 | 1–38 | 73 | 36 | 74 |

31個內容頁與下一單元131／197／204三個起頁均看過像素；頁碼、冊別／單元範圍、編號與詞序交叉核對，SHA256固定於來源資料。無編號但有獨立字頭／勾選框的項目保留，不硬套每單元45字。原圖與私人路徑不入repo；`file`僅為原始檔名，SHA用於追溯。

- **U12 p120**：既有13詞完整保留，11詞有正式映射；dependable／wickedness保留教材補充。p119 rely與p120 reliable跨頁詞族、p122 darken等獨立項目，以及同批已找回的p130也已處理。舊簡表中p124以後的頁碼／漏詞不直接沿用。
- **U18 p193**：tune保留n.曲調／旋律、vi.調頻、vt.調音；dim–dimmed–dimmed保留。p192 knot及三態只建立一次，p193的tie the knot with sb以`sourceWord: knot`接回；這只是可查的教材詞關係，沒有捏造senseId。舊簡表漏掉的athlete／ribbon／saucer／sauce／receiver等按原照補回草稿。
- **U21 p199**：六個編號詞17 panorama、18 pesticide、19 pious、20 Xerox、21 obstinate、22 sly。p201的chimpanzee／restrain／sportsman／awhile及無編號restraint／sportsmanship留在201。沒有把早期staging錯頁內容掛回199，也沒有整本候選覆蓋母表。前四個p199詞沒有正式ID，保留來源意思與補充身分。

`.transcript.json`是逐頁文字；`.source.json`是映射／來源包；`.curriculum.json`由現有`build_text_unit.py`產生，所有項目read_only、無題目／原創例句／圖片／officialSenseId，頂層`releaseReview`明列未登錄、待資料發布審閱。來源查證不等於批准新字典義項。

相關詞列保留來源詞性與意思，未自動建立同反義／衍生關係或批准關聯端點。英文字母大小寫、單複數、原書比較／三態與用法按印刷保留；缺正式ID不猜詞形或新增母表。

## 起始包與開放前條件

目前S+A起始包仍為5728詞。三單元的既有正式映射中，U12有13、U18有16、U21有22個ID尚不在起始包，合計51個不同ID；全部已存在完整正式`words.json`，不是要新增51個字典詞。精確ID／拼字見`integration-plan.json`的`missingFromCurrentStarterWords`。

這次僅驗證「目前起始包＋這51個既有正式記錄」能完整解析三組擬議群組；沒有修改起始包或冒稱全新安裝已能使用三單元。

| 開放條件 | 本批結果／待辦 |
|---|---|
| 完整單元來源、補拍與相鄰起頁 | 已查證；沒有待使用者補交的照片 |
| p193詞性／跨頁與p199/201分流 | 已整理並有回歸 |
| 只採既有正式映射，其他保留補充 | 已完成；完整補充清單在plan，不自動擴寫字庫 |
| 文字內容資料審閱 | 待使用者審閱此草稿；不等同發布批准 |
| 正式來源／教材登錄及群組 | 待另一個明確資料接入批次；目前三個草稿未import至model |
| S+A補入51個既有ID並保留舊資料 | 待資料接入；本批只列需求及驗可解析性 |
| LV6 U21解除hold | **目前保留**；完成上述接入、起始包、完整群組／一般卡／正常更新保留回歸後，再提出明確變更 |
| 圖片、原創例句及教材題目 | 沒有新增；不假裝文字回填已通過圖句審閱 |

對使用者的決定只需聚焦：是否採用這份純文字教材整理、未映射詞維持教材補充。若希望其中某詞進正式字庫，應另列明確母表批次，不能由這批順便增列。沒有需要使用者重抄既有來源的項目。

## 重現與驗證

```text
python scripts/prepare_recovered_unit_drafts.py
python scripts/prepare_recovered_unit_drafts.py --check
npm run test -- src/features/direct/recoveredUnitDrafts.test.ts src/db/lv6MainIntegration.test.ts src/features/vocabulary/lv6ReleasePolicy.test.tsx --maxWorkers=1 --testTimeout=15000
npm run lint
npm run typecheck
npm run build
```

建置器只寫本草稿目錄及workspace內的暫存檢查檔；不寫母表或public。item ID使用單元／印刷頁／詞形，補詞不靠陣列索引改動既有身份。未映射資料不可建立練習或冒用其他wordId。這些測試是草稿資料／發布隔離驗證，不能當成三個尚未登錄單元的正式站UI驗收。
