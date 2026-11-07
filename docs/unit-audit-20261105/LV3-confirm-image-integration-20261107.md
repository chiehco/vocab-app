# LV3 confirm general-image integration, 2026-11-07

## Scope and pixel evidence

- Base: `40d69303445dd3e462c28fa67c46d945740f54cf`.
- Candidate source: `7a594f83678100e7d1996e045ed681615c5d0917` on `assets/lv3-confirm-20261107`; isolated cherry-pick: `a1c8111`.
- Candidate: `public/wordbeast/lv3-reviewed/W002185-confirm-v2-99268c449270.webp`, SHA-256 `99268c4492700f1d99c51c8b03143dd1aebf704f45451feb90202a4360f29d2d`, 57,484 bytes, 1254 x 1254 (decoded locally with Pillow).
- Generated PNG SHA-256 from generation manifest: `4df7caec9981bf5a6aca4578324de1ec4f2f89c974435a9e108144d4836c10e3`. The PNG itself is not included in this branch; candidate WebP bytes were independently hashed and viewed.
- Source and candidate pixels were independently opened. Original has an empty central slot and a loose piece in Doudou's hands. Candidate has three pale-blue pieces lying on one flat plane with two closed interlocking seams; the middle is filled, both hands are empty, and open eyes face the completed puzzle. Short curved antennae, oval body, watercolor and ivory-paper style are preserved.
- Exactly one final general-registry row was appended: `LV3-GENERAL-W002185-20261107`, W002185, alias confirm. The preceding 339 ordered rows remain identical.
- Original EN/ZH captions are copied from the exact confirm + complete Chinese-caption source row. No independent caption ID exists. AX88b4f3dd remains unchanged. Original image, formal examples, media and caption-source files are retained.
- All four references remain without authored illustration or originalExample: LI-LV3U05-V034, LI-LV6U08-V060, LI-LV6U14-V072, LI-LIVEABC_BASICU05-V011. The LiveABC source is the array in `src/features/direct/liveabcBasic.json`, not a curriculum-prefixed filename.
- This is agent visual review under the comprehensive repair task, not manual user approval or publication acceptance. No curriculum, SRS, source workbook, source manifest, sa-pack or builder changes are included.

## Strict inverse and historical compatibility

`LV3-confirm-image-repair.json` pins the entire before/after registry, exact appended row, candidate manifest identity, original/new asset metadata, caption and media evidence, and unchanged source/proof/guard hashes. Its pinned semantic SHA-256 is checked before accepting it.

`beforeLV3ConfirmText` checks current LF-normalized raw SHA-256 before JSON parsing. Thus duplicate keys, extra whitespace, property order, row order, duplicates and unrelated drift fail closed. CRLF-to-LF normalization is the sole tolerated byte variation, matching the existing repair contract. It returns the exact historical canonical 339-row LF text, whose SHA-256 must match the previous replace guard's current input. Running the inverse twice fails.

Historical callers compose confirm inverse, replace inverse, then bank/permissible inverse. Existing proof files, old guard modules and all historical expected hashes are unchanged. `lv3ReplaceImageRepair.testSupport.ts` verifies imported current rows against disk before returning the older projection. `additionalCaptionRepair` performs the new raw inverse first. The replace suite uses the verified prior text rather than weakening its expectations.

Hashes:

- Original image: `a77d2e67e070921bf85de53fed7460441bc0124c46257ac016a04762643bcc9c`
- Before registry LF: `b6a29b346bfcb63969fb787d5e4db52177abd8e2ec4fe09e1025466e34448071`
- After registry LF: `820c8dfc8ced77d15d98518980971ef0efbc37415c00afd82b680604d547e47b`
- New proof semantic pin: `ffded71e7bfb416c381dba72b3fb00e0b3757f8275750d9a92c4c492c702508e`

Rollback: apply only the verified confirm inverse to the current registry; write its exact canonical LF output. Do not alter or delete the original image. The content-addressed candidate may remain inactive as provenance.

## Validation and limits

- Seven historical affected image suites: 59 tests passed, one worker.
- Final run of confirm, replace, wordBeastAssets, imageClue and lv1ReviewedImages: 5 suites, 52 tests passed, one worker. Total distinct passing coverage across runs: 11 suites, 108 tests.
- Initial confirm test failed only because its file enumeration omitted the existing LiveABC source. The enumeration now handles both curriculum learningItems and LiveABC items; all four references are checked in the final passing run.
- Negative cases cover every top-level proof field, mapping identity/path/caption fields, raw formatting, duplicate keys/rows, property/row order, unrelated mutation, source/candidate asset mutation, and repeated inverse. CRLF behavior is explicitly checked.
- Resolver tests cover general illustration, versioned gallery asset URL, exact Chinese image clue, wrong word/ID/path rejection and no textbook binding.
- Focused oxlint passed. `git diff --check` passed. Original image and old proof/guard files compare unchanged against the exact base.
- Full suite, project compile/build, browser/reopen/cache-update acceptance and physical-device checks were intentionally not run here. Parent owns merged-head validation and actual app consumer acceptance. No push or deployment performed.
