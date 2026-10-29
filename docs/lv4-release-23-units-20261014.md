# LV4 23-unit release preparation

> 2026-10-29訂正：使用者已查閱實體LV4書並確認p22為空白筆記頁，原空頁確認缺口已解決，不再要求補拍。本文下方pending／23單元描述保留為2026-10-14歷史狀態；本批入口修正與驗收見 [本次訂正](lv4-u2-notes-confirmation-20261029.md)。

LV4 publishes Unit 01 and Units 03–24. Unit 02 remains held because the complete p22 source photograph or traceable original confirmation is still missing. Its checked p11–21 data, all 164 learning-item IDs and existing personal groups remain available to compatibility and backup validation.

The shared public-entry policy removes held U2 from textbook tiles, vocabulary options and new group templates/search. Its old textbook, vocabulary and siege URLs display the p22 pending message and a return link, without silently opening another unit. Previously saved groups retain their contents and order and can continue ordinary dictionary practice.

The source-complete release consists of 19 newly transcribed text-only units plus the four existing main units U17–U20. All 24 raw packages, 1,799 distinct LV4 formal-word IDs and the 3,094-word starter package are unchanged from `2d0694b4ae47ebf2da07356bb50118431efcdb2b`. That base includes the U1/U2 source repairs and the later U5 p45 usage repair. There are no mother-table, sense-ID, art, example, question, SRS, rewards, schema or PWA-configuration changes.

Validation at the fixed preparation checkpoint: lint and typecheck pass; six focused test files / 34 tests pass. The tests exercise the actual held routes, active siege navigation, 23 public choices, retained edited 164-item group, all 13 nonempty progress tables, valid backup export, content refresh and exact retained payloads. Two invalid historical synthetic attempt/reward IDs were corrected to the existing production backup contract; the validator was not changed.

Build results and candidate hashes are in the external release handoff under `C:/Users/USER/Documents/Codex/2026-10-14/task-4/lv4-release-evidence/`. Candidate isolated fresh/offline browser checks and normal Settings PWA update with imported nonempty progress remain pending until recorded there. Earlier source/browser evidence is inherited only for unchanged data objects, not treated as candidate browser acceptance. No merge or deployment is authorized by this checkpoint.

Source release plan and independent final binding are preserved in `C:/Users/USER/Documents/Codex/2026-10-14/task-5/acceptance-evidence/lv4-final-binding-2d0694b/`.
