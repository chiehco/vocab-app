# U02 integrated-tree validation

**Passed on 2026-11-07.** Audited local worktree, base `90ff1edf86fea9d99c912cef95aba6b73c7f7a0c`, with the actual 37-row U02 application and final test callers saved in `5559c5ae061b8bdfac4ac69db623eae6c51cc156`. Validation commands ran sequentially.

## Final results
- Original focused Vitest command: **8 files, 37 tests passed; 0 failures, 0 skipped**, 67.51s. Real Python/TypeScript parity enabled; one worker; original default timeouts unchanged.
- Python U01 applier: **11 passed**, 0 failures/errors.
- Python pure pipeline: **13 passed**, 0 failures/errors.
- Python real U02 fixtures: **8 passed**, 0 failures/errors, 274.661s. Actual-after reconstruction into TEMP reproduced all 144 captured BEFORE inputs and preserved all 137 original U01 unchanged guards.
- Final forced TypeScript: **exit 0**, both referenced projects forcibly rebuilt.
- Lint: **exit 0**, 147 warnings in existing scripts and generated QA scripts; no errors.
- Build: **exit 0**, 713 modules transformed; 268 PWA precache entries. Chunk-size and plugin-timing warnings remain.
- Final command exit sequence: **0, 0, 0, 0** for focused tests, forced TypeScript, lint, build.

## Reproduction commands
Run from the audited worktree. Python used version 3.13, `PYTHONDONTWRITEBYTECODE=1`, and the available audit dependencies on `PYTHONPATH`.

```powershell
python scripts/test_apply_lv3_unit_audit.py
python scripts/test_lv3_audit_pipeline.py
python scripts/test_lv3_audit_pipeline_fixtures.py
$env:LV3_PIPELINE_FIXTURE_PARITY='1'
./node_modules/.bin/vitest.cmd run src/features/direct/lv3AuditPipeline.test.ts src/features/direct/lv3AuditPipeline.fixture.test.ts src/features/direct/lv3Unit1Audit.test.ts src/features/direct/recoveredUnitIntegration.test.ts src/features/vocabulary/additionalCaptionRepair.test.ts src/features/vocabulary/lv3ImageRepairs.test.ts src/features/vocabulary/lv3ApprovedReview.test.ts src/features/vocabulary/lv3NostalgicReview.test.ts --maxWorkers=1
node ./node_modules/typescript/bin/tsc -b (Join-Path (Get-Location) 'tsconfig.json') --noEmit --force --verbose
npm.cmd run lint
npm.cmd run build
```

The final Vitest command used no output exclusion or configuration change. Absolute project resolution was used for TypeScript, with cwd/config/source evidence retained locally. Shared `node_modules` build-info can make incremental-only checks insufficient; the successful final forced build resolves that verification caveat. Cache staleness was investigated but **was not the cause** of the earlier diagnostic.

## Initial failures and test-only corrections
1. Initial focused run: **2 failed, 33 passed, 1 skipped**. The recovered-unit caller compared installed U02 AFTER items against restored historical BEFORE items. Separate installed/historical maps now preserve both exact checks. The caption-history caller lacked the approved bank/permissible registry inverse; it now uses the pinned image proof, checks current raw canonical bytes first, and rejects trailing spaces/newlines, indentation changes and duplicate keys. The original expected historical SHA remains unchanged.
2. Initial real-fixture setup: **0 tests, 1 error**, because its independent capture artifact was absent at the expected location. The genuine capture was copied only after verifying SHA-256 `6b1f9884f07dbc99101a04f462edb9c0a7f1279fbf5082dd6c35257a51b2a32b`. Python/TypeScript fixture callers now reconstruct BEFORE through existing strict chain helpers. No expected hash was regenerated.
3. TypeScript/build initially exited **2** for TS2345 in the image test: nullable `officialWordId` passed to string-array `includes`. Compiler API diagnostics proved SourceFile and disk hashes identical, correcting the initial cache/caption hypothesis. An explicit string guard preserves null-as-nonmatch behavior; no cast or expectation relaxation. A nonempty caption guard remains.
4. An intermediate run collected eight incomplete browser source-snapshot copies under `output` and failed their imports, while all **37 actual source tests passed**. The 505-file snapshot was moved outside repository discovery with all file hashes preserved. The final original command passed without exclusions.

Five test files were adjusted: `recoveredUnitIntegration.test.ts`, `additionalCaptionRepair.test.ts`, `lv3AuditPipeline.fixture.test.ts`, `test_lv3_audit_pipeline_fixtures.py`, and `lv3ImageRepairs.test.ts`. Existing negative guards, timeouts, immutable expected hashes and fixtures were retained; after-state and raw-byte tamper coverage was added.

## Integrity and evidence
- Transaction: `output/lv3-audit-20261107/transactions/20261107T142701719549Z/transaction.json`, state `committed`, manifest hash `3ca25889cb2154233e88b1c543a818a2999e76ed7959bc892633f807490a6c24`.
- All **six product after-byte hashes** still match after final validation: `output/lv3-audit-20261107/u02-validation/product-after-check.json`.
- Previously completed real repeat-apply: `already_applied`, 37 patches, **zero product writes**, exit 0; not repeated during these checks.
- Python/TypeScript parity verifies 37 patches, four physical source files, six exact raw inverses, all before/after/inverse hashes, and unknown raw-drift rejection. Evidence: `output/lv3-audit-20261107/fixture-validation/`.
- All attempts and failures are retained under `output/lv3-audit-20261107/u02-validation/`. Final logs: `vitest-final-original.log`, `typecheck-final-confirmed.log`, `lint-final-confirmed.log`, `build-final-confirmed.log`.

Validation made no product, manifest, scope, source identity/order/count, progress-database, commit, push or production changes. Only approved test callers and local verification artifacts changed.

## Limits
The full Vitest suite was **not run** and remains required for the final LV3 batch. A local production build does not establish deployed production correctness. Browser QA is documented separately; these checks do not validate offline/PWA operation, a physical phone/Android install, or real user profile/progress data.
