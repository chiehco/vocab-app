# LV3 U10 technical validation addendum

This addendum supplements `U10-technical-validation.md`; the original report, full-run failures, isolated failures and v1 artifact index remain byte-identical. The original 5000 ms gates have not changed. No commit, push or deployment was performed.

## Approved U06 change and results

A third test file, `src/features/direct/lv3Unit6Audit.test.ts`, now reuses the already authenticated complete raw pack within the same synchronous test. It retains all six original complete raw projections and byte-hash assertions, all 31 complete starter rows, the 1128 media assertion and every original assert. It additionally checks the whole pack against fixed semantic SHA256 `2d1530af3c457ff87b7efd67e4898593949409dfc9f0b355f1e4dbfc07e89014`, independently derived from the original U07-before raw backup that matches U06's sealed after-byte hash. No shared helper, cross-test mutable cache, dataset, timeout or test partition was changed.

The complete U06 file passed 7/7 in one authorized run. The previously timed-out test took 3198.597 ms, down from 5628.411 ms, within the original 5000 ms gate. Forced TypeScript passed again in 65.844 seconds. All three changed tests passed focused lint and `git diff --check`. The other 35 selected files and the production build were not rerun; their recorded code/product dependencies remain unchanged.

## Remaining release blockers

- The unchanged U56 full-file isolated run remains 8/10: U06 fresh install and starter update timed out at 5006.334/5007.009 ms. Both complete bodies and all prior checks are retained.
- The unchanged puppet full-file isolated run remains 2/3: complete proof and historical guards timed out at 5794.338 ms. All positive and negative guards remain.
- The original whole-lint generated-bundle hook error is retained. The separately scoped lint excludes only the two exact retained build directories, not all output, and must not be described as a pass of the original whole lint.

The selected first run was 36 files/488 tests, 485 pass/3 fail. The latest full-file evidence across retained runs also contains 485 passes and three timeout failures, with U06's failure fixed but the isolated U56 fresh-install timeout additionally recorded. This is not one all-green run or full-project Vitest success. Release gates must truly pass before publication; ongoing UI AFTER or later-unit work does not clear these blockers.

## Preserved identities

All 144 product inputs retain their raw/LF/length identities. Across the 4975-file protected inventory, only the three approved test files changed. All 1063 source/BEFORE evidence files and all 2472 v1 indexed artifacts remain unchanged.

Historical U06 code SHA256 `ade49f92b355606f5534d7959e62537dd08cac81820f11d4c255b8b63ea5a7d2` now refers to `original-lv3Unit6Audit.test.ts.before-approved-dedup.txt`, not the current main test. The current test SHA256 is `190ecdf522af6441f95f59a61decfc5b9af250cde0812d492b7263348edaa1ee`. V2 index explicitly separates original and current identities.

Evidence: `output/lv3-audit-20261107/u10-final-technical-20261108/FINAL-REPORT-v2.json`, `artifact-index-v2.json`, `final-integrity-v2.json`, the approved U06 diff, exact commands and all new results/stdout/stderr. Previous product/build, 37-row/83-field starter, five JSON byte copies and two persuasive image/registry/caption proofs remain valid for unchanged inputs.
