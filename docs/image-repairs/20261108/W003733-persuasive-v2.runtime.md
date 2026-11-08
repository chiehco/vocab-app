# W003733 persuasive: ordinary reopen verification

Verified on 2026-11-08 against main commit `c2c02cec2ed7aa8139f129aa2039bc3f7e344961`, served by the existing Vite process at `http://127.0.0.1:5186`. This is development-browser verification, **not production PWA or offline acceptance**.

## Result

- All 23 receipt checks passed. No product, ledger, existing documentation or commit was changed during this runtime check.
- The active image decoded at 1024 × 1024, returned HTTP 200 and 58,956 bytes, and matched SHA-256 `da5d078153142abfcbdbfadfc330c86bf8e5823067af53050dbd438e8d71d6d4`.
- Actual URL: `http://127.0.0.1:5186/wordbeast/candidates-20261108/W003733-persuasive-v2-da5d07815314.webp?v=local`.
- The original file remains unchanged: 21,596 bytes, SHA-256 `b0eebf77d0bb4c3249d35bb9bb3dadc40529329e589c8678d66fc66b4c2e7381`.
- The right friend visibly holds an open blue umbrella. The left demonstration, seedling, character style and watercolor composition remain. Minor generative stroke differences exist; this is not pixel-identical preservation outside the repaired umbrella.

The original captions remain exact:

EN: Doudou's practical demonstration is persuasive, and a friend opens an umbrella too.

ZH: 豆豆用實際示範說服朋友也撐起雨傘。

## Normal routes exercised

- General card `#/word/W003733`: 字卡、字義、相關詞、搭配 at 1365 × 900 and 390 × 844. The image and bilingual caption appear on 字卡; the other three tabs contain no image. No horizontal overflow was detected.
- Normal browse link, LV4 filter and persuasive search: `#/browse?level=LV4`. Desktop and mobile thumbnails decoded the same new asset.
- Existing 30-word unit catalog, LV4, alphabetic order: opened Unit 25 at its first card and used 下一字 22 times, reaching persuasive at `#/units/LV4/25?index=22&order=alphabet`, position 23/30. Desktop and mobile show the new image and original captions. No group was created.
- `LI-LV3U09-V089` and `LI-LV4U01-V042`: desktop/mobile textbook cards contain no authored image. Returning to each textbook unit and using browser Back restores the same card text without an image.
- Both served curriculum rows remain `text_only`, `read_only`, `source_checked_text_only`, with `officialWordId: W003733` and no authored illustration or original example. These textbook cards do not expose a direct general-card hyperlink. The mapping and separately reopened general-card route were verified; a direct textbook-to-general click is not claimed.
- Closed only the QA session, reopened the same retained profile, waited through the delayed refresh, and verified the general image, captions and text again on desktop/mobile. Two console captures report zero errors and zero warnings.

## State and source preservation

Read-only full snapshots were taken initially, after the first refresh window, before closing, after reopening, and after the second refresh window. All were compared with the preserved U09 before-final state.

- ContentDB: all 9 tables, including every word, sense, example, relation, morpheme, note, media row, exam-priority row and installed metadata, remain equal.
- ProgressDB: all 14 tables remain equal except the normal `learning:last-location` navigation setting. `dailyNewWordCap`, all groups, card states, attempts, sessions, quiz statistics, review logs, reward tables and other settings remain unchanged. LocalStorage and sessionStorage remain equal.
- The actual installed pack identity, not merely a sync flag, matches the served U08 pack: generatedAt `2026-11-08T02:57:00Z`, wordsHash `sa:9cd802846b5c2a2153871c61f044c53e22d86a279503b2fbe6174dd107b6fad4`, contentHash `sa:057a74c865c36915223fc6684afdcc4d9639372e1d5e5c893034d36581897d1e`.
- All 144 frozen product/text input files, 10 independent source/caption/renderer/proof files, and the integrated registry hash match the integration proof. All 805 previously sealed before artifacts and their 2 external documents remain byte-identical.
- The unrelated LV1 browser session remains open. Only `lv3-u09-persuasive` was closed.

## Evidence

- Complete receipt: `output/playwright/lv3-u09-persuasive/runtime-verification.json`, SHA-256 `dd0dc9dfd683ff9a43bb73ab6dca71f7f12a1e89bc01ee1cf2c200cb0a6dbfac`.
- Full artifact seal: `output/playwright/lv3-u09-persuasive/runtime-seal-index.json`.
- Four reviewed PNGs: `general-mobile-caption-viewport.png`, `unit30-mobile.png`, `textbook-LV3-U09-mobile.png`, `textbook-LV4-U01-mobile.png`, all under `output/playwright/lv3-u09-persuasive/`. Desktop and all-tab PNGs are retained alongside them.
- A single early harness read used an ambiguous `main` locator after successful unit navigation. Its failure log is preserved. A fresh snapshot established the resulting route; the scoped follow-up read succeeded without repeating navigation. This was a locator failure, not an application or permission failure.

## Remaining release boundaries

Conditional quiz, Home due cards, Review, daily and game consumers were not forced into new state. The existing pure resolver tests remain their evidence. No answer, reward/SRS write, database injection, cleanup or synthetic group/record was used.

The accepted isolated integration result remains 313 passing tests plus typecheck, lint and build. These expensive technical checks were not rerun during this unchanged main-tree runtime check.

The mapping is compiled into the App bundle, so a dictionary-only refresh does not update an already installed old App bundle. The immutable hash path avoids reusing the old image URL, but production service-worker update and a normal online image load must precede an offline-availability claim. No production service worker, installed PWA, cold offline or offline reopen test was performed here.
