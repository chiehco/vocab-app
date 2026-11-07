# U05 actual-after validation

## Result

Passed on 2026-11-07 UTC against the actual U05-applied product tree. Application provenance is recorded in `U05-application.json`; the earlier isolated fixture gate is separately recorded in `U05-fixture-validation.md`.

The initial code checkpoint was `30f961115fd69e2b0d3a1a50cf507b1c0c2884e0`, including the wage display correction and migration support only. Runtime documentation was saved separately at `7e5f0ec`. The U05 coverage and historical confirm-caller corrections were saved at `80ddf47180a36fb573be766df1aee1649633ce04`. Final evidence includes the additional test-only typing corrections described below.

## Final results

- Scoped TypeScript: **32 files and 271 unique tests** have passing final evidence, with no skipped tests. These were run in isolated serial processes with targeted reruns, not as one combined suite. The original 31-file pass covered 269 tests: 267 passed and 2 failed. Both failures were resolved as detailed below, and the new U05 file added 2 passing tests.
- Additional historical U04 real-fixture parity: **1/1 passed**, separate from the U05 parity included above. U01/U02 historical guards, U04 exact published-byte projection, prepared-checkpoint rejection, image-repair chain, wage validation, and migration-support regressions remain covered.
- Python: **65 unittest methods passed**, comprising U01 applier 11, pure pipeline 13, manifest preparation 10, approved-review 8, nostalgic 6, wage 1 method containing all **31 subcases**, and migration support 16. If wage subcases are counted individually, this is **95 cases**, not 95 unittest methods. All seven invocations passed on their first run.
- Final explicit-fixture-shape verification: **63/63 affected TypeScript tests passed**, then forced whole-project TypeScript **exit 0**, rebuilding both referenced projects from the explicit current project configuration.
- Lint: **exit 0**, 283 warning lines, no errors. Warnings include existing scripts and generated browser evidence; no warnings were suppressed.
- Production build: **exit 0**, 713 transformed modules, Vite build 24.22 seconds, 268 PWA precache entries. Plugin-timing and large-chunk warnings remain.
- Final read-only integrity: **passed**. All 144 actual raw input hashes match the validation-time capture; all 138 unchanged-input guards, four source semantic/normalized after hashes, both derived after hashes, all six receipt after-byte hashes, and all six backup raw/normalized before hashes match. Receipt and U05 chain state are committed. No migration entry or pending recovery exists. Validation made zero product writes.

The successful lint/build ran after the unused-parameter fixes and an intermediate test-only return annotation. The final version replaces that annotation with the explicit fixture shape, with no executable statement, assertion, fixture value, application code, or build configuration change. The final version received the 63-test rerun and a fresh forced whole-project typecheck; lint/build were not redundantly rerun for this annotation-only refinement. This distinction is retained rather than claiming all commands ran against an identical source snapshot.

## Initial failures and narrow corrections

1. **U19 refresh timeout.** The original `lv3Unit19Text.test.ts` run passed 6/7 tests; the content-refresh test exceeded the unchanged 5000 ms timeout, reported at 5043 ms. A subsequent isolated fresh-process rerun passed **7/7**, with no source, expectation, or timeout change. No root cause beyond this observed timing behavior is asserted.
2. **Historical confirm proof caller.** The confirm image proof was created before U05 and pinned the original examples file hash `a9cd292f...`. Its test directly compared the correct current U05 examples hash `160a6913...` against that historical value. Only this caller was corrected: the examples bytes are authenticated and projected through the recorded chain to U04 with `lv3AfterUnitPublishedText`, then compared against the unchanged original proof hash. An added unknown-byte negative assertion rejects drift. All other proof files remain directly checked, and no proof, asset, expected hash, or image registry was changed. The corrected file passed **3/3**.
3. **Forced compile exposed four test typing errors.** Two wage `it.each` callback labels were unused; they were renamed `_label`. The migration reorder test inferred one return branch as only a media field, so access to its real metadata failed type checking. Its final input annotation now uses an explicit `MigrationPackFixture` containing the actual metadata, word, and media shapes. No assertions or fixture values changed. The original forced typecheck and build both exited 2; the build stopped at TypeScript and did not reach Vite. Those logs are retained.
4. An intermediate annotation reused the surrounding test's dynamic-record style and passed typecheck/build. It was then replaced with the explicit fixture shape. The final annotation does not add `any`; the final affected tests and forced typecheck passed again. The intermediate and final logs are separately retained.

The existing U5/6 test passed unchanged. Its unmapped-source filter did not establish coverage of the newly reviewed supplements. The added `lv3Unit5Audit.test.ts` therefore authenticates the sealed manifest/scope, all **56 complete after rows**, **146 changed fields**, all **six published hashes**, and a nonempty set of exactly **20 runtime unmapped supplements** with precise meaning/provenance fields, null formal IDs, and read-only practice mode. These are added checks, not replacements for historical tests.

## Reproduction

Run each scoped test file in its own process, sequentially. The original selection is retained in `after-vitest-selection.txt`; additionally run `lv3Unit5Audit.test.ts`. Do not copy test-source trees into output.

```powershell
$env:LV3_PIPELINE_FIXTURE_PARITY='1'
$env:LV3_UNIT_FIXTURE_PARITY='U05'
node node_modules/vitest/vitest.mjs run <selected-test-file> --maxWorkers=1
$env:LV3_UNIT_FIXTURE_PARITY='U04'
node node_modules/vitest/vitest.mjs run src/features/direct/lv3UnitFixtureParity.test.ts --maxWorkers=1

python scripts/test_apply_lv3_unit_audit.py
python scripts/test_lv3_audit_pipeline.py
python scripts/test_prepare_lv3_audit_manifest.py
python scripts/test_apply_lv3_approved_review.py
python scripts/test_apply_lv3_nostalgic.py
python scripts/test_lv3_wage_forms.py
python scripts/test_lv3_starter_media_migration.py

node node_modules/vitest/vitest.mjs run src/features/browser/meaningRecords.test.tsx src/features/direct/starterMediaMigration.test.ts --maxWorkers=1
node node_modules/typescript/bin/tsc -b (Join-Path (Get-Location) 'tsconfig.json') --noEmit --force --verbose
npm.cmd run lint
npm.cmd run build
```

Python used the existing compatible audit dependencies first and the existing runtime's pure-Python openpyxl dependencies second, via process-local configuration. Nothing was downloaded, installed, or permanently reconfigured. Test, compiler, lint, and build processes were run serially; no concurrent compiler wrote shared build-info files.

## Evidence

Directory: `output/lv3-audit-20261107/u05-validation/`.

- Original TypeScript selection/results: `after-vitest-selection.txt`, `after-vitest-results.json`, and `after-first-*.test.log`.
- U19, confirm, and new U05 checks: `after-focused-lv3Unit19Text.test.log`, `after-focused-lv3ConfirmImageRepair.test.log`, `after-focused-lv3Unit5Audit.test.log`.
- Historical U04: `after-U04-parity-first.log`.
- Python: `after-python-results.json` and the seven `after-first-test_*.py.log` files.
- Original compiler/build failures and lint result: `after-typecheck-first.log`, `after-build-first.log`, `after-lint-first.log`, `after-serial-results.json`.
- Intermediate typing verification and successful lint/build: `after-typing-*.log`, `after-typecheck-final.log`, `after-lint-final.log`, `after-build-final.log`, `after-serial-final-results.json`.
- Final explicit shape: `after-final-typing-diff.patch`, `after-explicit-shape-focused.log`, `after-typecheck-explicit-shape.log`.
- Product integrity: `after-start-input-raw-hashes.json`, `after-final-product-check.json`, `after-final-product-check.log`.

Application receipt: `output/lv3-audit-20261107/transactions/20261107T171403761440Z/transaction.json`; sealed manifest hash: `f7ad8f7a18f1b52eeb0be70ae233648de464032ed4819ad7f42cc9f6dc84de77`.

## Remaining limits

No blocking failure remains within this scoped technical validation. The complete project-wide Vitest suite was not run and remains a final batch gate. Browser/runtime evidence is separate. Passing local tests and build do not establish production deployment, complete offline/PWA behavior, physical-phone validation, or preservation of a real user's profile. Migration support tests are not evidence that the actual starter-media migration has been sealed or applied. No product reapplication, migration application, push, deployment, or phone action was performed by these validation commands.
