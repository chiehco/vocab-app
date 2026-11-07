# LV3 bank / permissible image-only integration

Base: `39a8f4f3d829eb4546edbfa8ef255b312706aac5`.
Candidate source: `1107d15d45008d33a01dd09430d31852f4f71e41`; imported locally as `d63c199`.
Isolated branch: `content/lv3-image-integration-20261107`.

## Exact scope

- General bank row `LV1-U14-37` / `W000061`: replace only illustration path with the versioned reviewed bank image. Both original captions remain exact.
- Append one uniquely identified general permissible row `LV3-GENERAL-W005669-20261107` / `W005669`. Captions are copied exactly from the existing illustration caption registry.
- Source and replacement SHA-256 hashes checked before mapping; all original image bytes retained. No generation occurred in this integration.
- No changes to dictionary/master data, SRS, stable IDs, original media, published curriculum image registry, practice sentences, or unknown/achieve pending decisions.
- No manual-user-approval claim: integration follows the user-authorized audit/fix, with parent reviewer pixel inspection after hash verification. Visual app acceptance remains pending.

## Consumer review

`approvedWordIllustration` selects exact word ID plus alias. `getWordBeastAsset` uses that mapping and versions the new path. Ordinary WordDetail, WordBrowser thumbnails, WordsWorkspace, ReviewScreen, general UnitStudyScreen, HomeScreen thumbnails, WordBeastPrototype, and arena targets use this shared asset function.

`StudyIllustration` resolves exact image-path captions through `approvedCurriculumIllustration`; `useIllustrationMedia` clears stale target hints when the override applies. QuizScreen uses `resolveWordImageClue`, which selects the new exact Chinese caption rather than an unrelated practice sentence. WordBeastPrototype likewise uses the exact caption and clears the old hint.

The LV1 static gallery linked by GroupsScreen is a separate published-unit-pair surface. It intentionally retains its original assets and captions; it is not a general resolver consumer. Exact inspection found zero W000061 or W005669 records in lv1ReviewedImages.json; public/wordbeast/lv1-reviewed/index.html contains neither LV1-U14-37 nor the selected bank/permissible captions. Thus these pairs are absent, rather than a known mismatched bank pair remaining there. A scan of all public HTML found no LV1-U14-37, selected bank caption, or W005669 references. Neither U01 bank's grassy-bank exercise nor U02 permissible's small-bags exercise gains an illustration. Their authored sentences remain unchanged. New tests explicitly assert these boundaries.

## Provenance and regression protection

The candidate manifest's original `createdAtUtc=2026-11-07T21:36:00Z` remains preserved with its normalized JSON hash. Parent reviewer confirms local +08:00 time was mislabeled Z, so integration proof records the corrected `2026-11-07T13:36:00Z`. Separately, source commit time `2026-11-07T21:38:59+08:00` converts to `13:38:59Z`; it is not substituted for generation time.

The new guard pins the complete integration proof, 338-row current registry hash, both exact changed rows, unique IDs, order, and 337-row original registry hash. It restores only the bank old path and removes only the exact appended permissible row. Existing praise/LV2/LV1 historical hashes and negative tests are retained behind this stricter newest projection. Historical asset checks continue checking original bytes; current resolver checks explicitly use the validated current row.

JSON provenance hashes normalize JSON serialization to avoid Windows CRLF versus CI LF differences; image hashes remain byte-exact.

## Verification status

Passed: source/candidate byte hashes, pure Node exact projection through the prior praise layer, malformed order/duplicates/pre-repair input rejection, and Git whitespace check. Focused Vitest (serial, 30-second timeout): six image/history files passed 82 tests in 52.67 seconds; after adding the gallery exclusion assertion, the final LV3 file passed all five tests in 2.82 seconds. `tsc -b --noEmit` completed with exit 0 (local +08 start 21:49:55, end approximately 21:52; exact end seconds were not captured). Dependency junctions share a node_modules target and potentially incremental tsbuildinfo with another concurrent worktree check, so this is preliminary evidence only; parent will run serial `tsc -b --noEmit --force` on the merged tree for authoritative verification.

Pending: full suite, lint/build, and actual browser consumer visual acceptance. Only parent-released focused tests and typecheck ran. No browser opened; no full suite/build, push, merge, or deployment.
