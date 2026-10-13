# LV4 文字教材工作線盤點

主線與遠端分支於 2026-10-13 UTC 直接透過 GitHub API 核對。main 為 `03cebe42444eef66e26a7f7d1e8be83979ca32c6`；遠端全部 19 個分支無 LV4 新文字教材分支。通用名 `prep/ivy-unit-batch-20261009` 也另外核對了 direct 目錄，LV4 只有既有 U17–20。本機 U18／U19／U20 分支內容已在 main，沒有重做。main 的 LV4 教材登錄是 U17–20。

独立 clone：`C:/Users/USER/Documents/Codex/2026-10-14/task/vocab-app-lv4-local`。第一批分支 `draft/lv4-u1-u2-textbook`。這個 clone 的 origin refs 是來源本機快照；最新遠端 main 證據另以 GitHub API 核對，不能用舊 origin/main 代替。

## 原件

- 真实照片：`C:/Users/USER/Downloads/Mobile Devices/LV1/LV4/`。較短的 `Downloads/Mobile Devices/LV4/` 曾混入 LV3 照片，不作冊別依據。
- 原文字初稿：`C:/Users/USER/OneDrive/桌面/單字APP/書頁快抽/書頁快抽_p*_Terra初稿.md`；狀態原為 raw_capture，本輪以照片重新核對已採用範圍。
- LV4 全頁整理原件：`C:/Users/USER/OneDrive/文件/萬詞譜/outputs/019ffcec-79df-7700-8ec1-e57bc07bd9c0/`。其匯入稽核涵蓋 p.1–266、975 主詞列、603 note 列、647 關聯列，記錄無缺少頁面區塊；這是既有稽核結果，不冒充本輪已目視所有 266 頁。
- 本輪已目視 p.1–21 的可讀照片、p.19 補拍、p.23–42 U3／U4全文與p43的U5起點。p.10 為空白 Notes。p.22 照片原已損毀／不存在，既有原件 `書頁快抽_p021-025_Terra初稿.md` 與 `母表合併前置/全冊_缺頁與補拍清單.md` 明記使用者確認該頁無內容；本輪未猜補正文。
- 9/26 的 LV4 Markdown 依母表 level／字母排序，明示沒有完整 Unit 對照；不能作教材單元劃分。

## 首批與後續順序

| Unit | 本輪狀態 | 已確認頁範圍 | 主詞 | 補充詞 | 用法 |
|---|---|---|---:|---:|---:|
| 1 | 已推送文字候選，父任務獨立QA | 1–9；10 Notes；11 U2 起點 | 45（23 編號＋22 無編號） | 56 | 32 |
| 2 | 已推送文字候選，父任務獨立QA | 11–21；22 無內容的既有確認；23 U3 起點 | 46（30 編號＋16 無編號） | 81 | 37 |
| 3 | 第二批文字候選 | 23–32；33 U4 起點 | 46（28編號＋18無編號） | 60 | 40 |
| 4 | 第二批文字候選 | 33–42；43 U5 起點 | 46（25編號＋21無編號） | 77 | 43 |
| 5–16 | 待依序逐頁重核；每批兩單元 | 本輪尚未驗完後續分界 | — | — | — |
| 17–20 | 已在主線上線，保留 | 依既有來源／核准包 | — | — | — |
| 21 以後 | 待依原件確認單元數與分界再續作 | 不由資料夾名稱或固定字数猜測 | — | — | — |

重要原稿修正：p.9 的 persuasive／relieve／addict 印刷側欄仍是 **Level 4 Unit 01**，不是初稿標的 Unit 02；p.20–21 印刷側欄仍是 **Level 4 Unit 02**，不是初稿標的 Unit 03。atmosphere 在 p.19 開始，p.20 為續頁，不再建第二個主詞。獨立藍色詞目／對應專屬例句保留為無編號主詞；例句本文不匯入。

## 共用程式變更交集中驗收

- `scripts/build_text_unit.py`：新來源若提供逐頁核對的補充詞義／詞性及用法中文，保留原件文字；既有無此欄位的來源仍沿用既有字典／待核對退回行為。revision 可由來源指定。沒有重產或改寫 LV3 單元。
- `scripts/build_sa_pack.py`：LV4 的 `text_only` 單元纳入既有正式 ID；既有 U17–20 仍須 content_reviewed＋illustration。只重建本分支啟動包，交父任务集中整合時需由合併後所有單元重建。
- `src/features/direct/model.ts`：第一批新增 U1／U2，第二批新增 U3／U4；既有題目與 revision 不变。
- `src/db/saPack.test.ts`：驗收期望包含 LV4 text_only 對應詞。

本分支不得合併／部署；PR 與集中整合由父任务協調。母表、正式 words.json、SRS、進度資料庫 schema、小鎮／金幣程式与其他工作樹未改。

首批固定commit `03bd97ab14e7a2df30b843bdd4ad8996a10ec5b4`，分支 `draft/lv4-u1-u2-textbook`，exact-head CI [38477589199](https://github.com/chiehco/vocab-app/actions/runs/38477589199) success。第二批以此commit為基底，分支 `draft/lv4-u3-u4-textbook`，詳見 `lv4-unit3-4-textbook-20261014.md`。集中整合時不能以單一批啟動包覆蓋其他工作線，須依整合後教材重產。
