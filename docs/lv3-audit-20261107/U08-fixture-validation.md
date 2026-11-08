# U08 TEMP fixture 與套用驗證

## 結果

258個欄位、87個完整列、3個來源完整文件與預先獨立計算的expected-after完全相同。原候選與預期沒有從compiler／actual-after回填。

- 官方compiler、prepared登錄、獨立TEMP seal、零寫入dry-run全部通過。
- 完整9-method TEMP fixture一次全跑通過，0失敗、0跳過；每個方法的TEMP及journal保留。
- Python／TypeScript parity：1檔1測試通過，3個整doc一致，5檔CRLF→LF正規化文字反向一致，非原始byte還原；raw備份／回滾另有獨立的原始位元證據。未知raw漂移拒絕。未調timeout。
- 五檔各寫一次；零寫入冪等、第二個replace故障完整回滾、非修改列／輸入集合漂移與pending receipt拒絕全過。
- 9個方法共留下5份receipt，逐一驗證25份raw backup；不是9份receipt。詳細journal陣列與final-forms-and-journal-counts.json為精確數量依據。
- 7個祖先checkpoint共1008個LF雜湊完全相同，U01原137guard保留。主樹套用後另做直接U07父checkpoint的144輸入反投影，全部通過。

## 主樹套用

官方transaction只實際寫入words.json、examples.json、curriculumLV3Unit8.json、meta.json、sa-pack.json五檔。receipt為committed；5份備份raw／LF吻合原before，139其他輸入raw／LF／長度完全不變。第二次官方--apply回報already_applied、0寫入、0新receipt。只有U08 chain狀態升為committed，既有chain項目不動。

19新三態、8既有三態、81原word.status均核對；原99句英文／中文／填空／答案等由完整doc精確相等保障。starter的29詞及1句共30列與獨立候選一致，無缺席提案，全部starter集合與預期相同，1128 media不變。

## 不可變來源與交付

原U08-before-capture.json及807產物before-seal-index保持原位不變；新封存資料另置U08-sealed-capture.json。候選、獨立expected-after與原144capture未改。

證據目錄：output/lv3-audit-20261107/u08-integration。主要檔案：compiler-independent-verification.json、full-result.json、parity-process.json、independent-after-and-journal-proof.json、all-ancestor-projection-proof.json、main-postapply-verification.json、main-idempotence.json、main-parent-projection.json、final-handback.json。

公開套用摘要：U08-application.json。此次未commit、push、deploy；未跑套用後技術測試或瀏覽器回開，兩者由後續工作完成。TEMP不是實體手機或真實使用者驗收。
