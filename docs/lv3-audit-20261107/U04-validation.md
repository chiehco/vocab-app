# U04 actual-after validation

**Passed on 2026-11-07 UTC**, against the actual U04-applied product tree based on local commit `ca211eb0c03bbbd1292b4ef1528fab39208f584e`, with the test-only checkpoint corrections described below.

This is actual-after validation. The earlier isolated TEMP application is separately documented in `U04-fixture-validation.md` and is not used as a claim that the product tree was applied.

## Final results

- Scoped TypeScript evidence covers **27 files and 172 unique tests**, all with passing final evidence and no skipped tests. This is combined evidence from the original run plus targeted isolated reruns, **not a claim that one combined 172-test invocation passed**.
  - Original 26-file/171-test run: 155 passed, 16 failed, 0 skipped, 316.06 seconds.
  - Nine timeout-affected files, each rerun in a separate serial fresh process: **76/76 passed**, original default five-second timeouts unchanged.
  - Final corrected pipeline plus new prepared-checkpoint test: **13/13 passed**, 0.804 seconds.
  - The other 16 original files supplied **83 passing tests**, including actual U04 text delivery, U01/current and historical projections, both opt-in real fixture parities, and bank/permissible/replace image guards.
- Python: **48 tests passed**: U01 applier 11, pure pipeline 13, manifest builder 10, approved-review guards 8, nostalgic guards 6.
- Whole-project TypeScript: **exit 0**, both referenced projects forcibly rebuilt with explicit current project configuration.
- Lint: **exit 0**, 162 warnings, no errors. Warnings include existing scripts and generated browser QA scripts; they were not suppressed.
- Production build: **exit 0**, 713 transformed modules, Vite build 17.70 seconds, 268 PWA precache entries. Plugin-timing and large-chunk warnings remain.
- Final read-only integrity check: all six actual after hashes match, all 138 unchanged-input guards match, complete domain remains 144 inputs, receipt is committed, and every receipt backup and after-byte hash matches. Validation itself made zero product writes.

## Initial failures and narrowly scoped corrections

1. **15 five-second timeouts** affected install/refresh tests in U11, U15, U17, U19, U23, U24, U5/6, U7/8, and U9/10. The first run overlapped other validation activity. After that run and other test activity ended, all nine files passed in serial isolated processes without code, timeout, or expectation changes. This demonstrates passing isolated runs, not a proven root cause for the earlier timeouts.
2. **One checkpoint-caller assertion** still assumed U02 was the latest checkpoint and U04 was uncommitted. Actual U04 legitimately changes three notes, so equality between current notes and the historical U02 projection was invalid. The test now checks current equality at the latest committed checkpoint and preserves exact historical U02 notes semantic and metadata raw hashes from its unchanged manifest. Both checkpoints reject tampered input; U99 remains rejected.
3. A new synthetic test covers a **known registered but prepared checkpoint**, distinct from an unknown target. The exact same current notes and metadata succeed in positive controls, then both semantic and raw APIs reject when only the in-memory chain status is prepared. The mock targets only the chain read, restores modules/mocks in `finally`, and confirms the disk chain remains unchanged. A deliberately failing negative-control run removed the committed-entry filter only during transformation in memory. It failed with `Missing expected exception`, as required; helper and chain hashes stayed identical. Normal configuration then passed again. This expected mutation failure is not an unexpected validation failure.
4. The first corrected pipeline rerun rejected the tampered metadata correctly but its new error-message assertion expected raw drift instead of derived drift. The assertion now precisely accepts raw or derived drift. That failed attempt is retained.
5. Two extra Python guard suites initially could not import `openpyxl`. Reusing an existing runtime dependency path first exposed an incompatible Pillow binary import. The final process-local path order selected the existing Python 3.13-compatible audit Pillow before the existing pure-Python openpyxl package. Both suites then passed. No dependency was downloaded, installed, or permanently reconfigured; both import-failure attempts remain recorded.

Only `src/features/direct/lv3AuditPipeline.test.ts` was corrected and `src/features/direct/lv3PreparedCheckpoint.test.ts` was added during actual-after validation. Product data, chain, source reports, historical manifests/scopes/expected hashes, and timeouts were not changed by validation.

## Reproduction commands

Run from the audited worktree. Set Python's process-local dependency paths to the existing compatible audit dependencies followed by the existing openpyxl dependency directory; do not replace the interpreter's Pillow with an incompatible binary build.

```powershell
python scripts/test_apply_lv3_unit_audit.py
python scripts/test_lv3_audit_pipeline.py
python scripts/test_prepare_lv3_audit_manifest.py
python scripts/test_apply_lv3_approved_review.py
python scripts/test_apply_lv3_nostalgic.py

$env:LV3_PIPELINE_FIXTURE_PARITY='1'
$env:LV3_UNIT_FIXTURE_PARITY='U04'
$files=@(Get-ChildItem src/features/direct/lv3*.test.ts,src/features/vocabulary/lv3*.test.ts | ForEach-Object {$_.FullName})
$files+=@('src/features/direct/recoveredUnitIntegration.test.ts','src/features/vocabulary/additionalCaptionRepair.test.ts')
node node_modules/vitest/vitest.mjs run @files --maxWorkers=1

# Final timeout-file verification used one fresh invocation per selected file.
# The nine stems are lv3Unit11Text, 15Text, 17Text, 19Text, 23Text,
# 24Text, 56Text, 78Text, and 910Text, each with the lv3Unit prefix.
node node_modules/vitest/vitest.mjs run src/features/direct/lv3Unit11Text.test.ts --maxWorkers=1
node node_modules/vitest/vitest.mjs run src/features/direct/lv3AuditPipeline.test.ts src/features/direct/lv3PreparedCheckpoint.test.ts --maxWorkers=1

node node_modules/typescript/bin/tsc -b (Join-Path (Get-Location) 'tsconfig.json') --noEmit --force --verbose
npm.cmd run lint
npm.cmd run build
```

The final forced TypeScript, lint, and build commands ran serially after the tests ended. No whole-project compiler was run concurrently against shared build-info files.

## Evidence

Directory: `output/lv3-audit-20261107/u04-validation/`.

- Original scoped attempt: `after-vitest-first.log`; selection: `after-vitest-selection.txt`.
- Isolated reruns: `after-isolated-lv3Unit*.log` and `after-isolated-results.json`. The latter intentionally retains the intermediate pipeline regex failure rather than rewriting history.
- Final pipeline/prepared result: `after-pipeline-prepared-final.log`.
- Deliberate negative control: `expected-prepared-mutation-failure.log`, `prepared-mutation-integrity.json`; its configuration is diagnostic-only, not a normal CI/build configuration.
- Python original/final logs: `after-test_*.log`, `after-existingdeps-*.log`, `after-python-final-*.log`.
- Final serial checks: `after-typecheck-first.log`, `after-lint-first.log`, `after-build-first.log`, `after-serial-results.json`.
- Final product/receipt integrity: `after-final-product-check.json`.

Application provenance remains in `U04-application.json`, with receipt `output/lv3-audit-20261107/transactions/20261107T154529146156Z/transaction.json` and manifest hash `cbd33aa366048230b645bb45560892bc50380704f6b0273f275631ce9c465074`.

## Remaining limits

No blocking failure remains within this scoped validation. The full 2000-plus Vitest suite was not run and remains a final LV3-batch gate. Browser visual/runtime QA is separate and is not asserted by this report. A successful local build does not prove production deployment, offline/PWA behavior, physical-phone installation, or preservation of a real user's profile. No commit, push, deployment, or phone action was performed by these validation commands.
