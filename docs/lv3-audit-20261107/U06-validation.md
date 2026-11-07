# U06 actual-after technical validation

## Result

Passed on 2026-11-07 UTC against the actual applied U06 product. The final integrity check completed at **21:33:29 UTC**. Product application is commit `e11780b4b33cfb688a3a2e96151536e0fb3936f5`; validation started at documentation HEAD `f43f3ec96d0abc305b386594726646e76a5dc65f`, with the five test-only changes described below. No product, source, sealed manifest, scope, expected historical checksum or shared validation helper was changed during this work.

- **Final combined Vitest: 28 files, 368/368 tests passed, zero skipped**, in one 145.12-second invocation using one worker and unchanged timeouts.
- **Python: 123/123 unittest methods passed** in one eight-module invocation, 404.349 seconds. This includes all 58 G015 cases. The wage method contains 31 subcases; counting those individually gives 153 cases, not 153 unittest methods.
- **Final forced whole-project TypeScript: exit 0**, rebuilding both app and node projects from the absolute project configuration, 54.12 seconds.
- **Full lint: exit 0**, 419 warning diagnostics and no errors. None of the five changed test files produced a warning. No warning was suppressed.
- **Production build: exit 0**, 130.49 seconds overall. Vite transformed 713 modules and reported 29.33 seconds; PWA generation produced 268 precache entries and both service-worker files.
- **Final integrity: passed.** All 144 actual input raw and CRLF-to-LF hashes match the validation-start snapshot and the committed checkpoint. All 719 before artifacts and 795 after artifacts match their original sealed indexes. The final five test-file hashes also match the code used by the successful combined run, final typecheck, lint and build.

The source and built starter packs have identical SHA256:

`f92450744cde5a7a9475130593da3f17296a519052004cfba8258cbfefbefb25`

The source and built puppet image also match exactly:

`8a3480a548f04c0a5fd4f89606eddab205f4656e3b3d1eaeae5ce550e9ea2bca`

The U06 receipt and chain entry remain committed. Manifest hash `c59130eba2f8aeae6f0012dbdf1b052f3663dbbdebfcf875d183fddfd0730581` and scope hash `e00d9e122b980f9452f2c3be0d4ea10fc5549f37e044622e2d96342d98a9290d` remain unchanged.

## Coverage

The new `lv3Unit6Audit.test.ts` has seven actual-after tests. It authenticates the sealed manifest and scope, all **144 accepted fields / 56 complete rows**, all **six published files**, and all **31 affected starter rows**. It checks the actual 134-item runtime, all 20 reviewed supplemental meanings and their metadata/null mappings/read-only status, all 113 original example records outside the ten accepted POS changes, eight unchanged senses, historical source bytes, 13 new verb-form records including both squirrel spellings, and 15 unchanged existing forms. G015's restored printed `for`, koala, donkey's corrected English definition, ten example POS changes and both reason notes receive explicit checks. No test is skipped merely because a unit is prepared or absent.

The combined selection additionally covers U01/U05 actual-after and historical projections, U04 and U05/U06 text delivery, current/prepared checkpoint rejection, the typed starter-media migration and its real committed checkpoint, G015/wage guards, puppet/confirm/replace/bank image history, retained caption proofs, image resolution, and browser/book-scoped meaning display. The exact 28 paths are recorded in `vitest-selection.json` in the evidence directory.

Runtime data/transform assertions are not DOM or visual assertions. Browser coverage and its separate 124 DOM-value / 20 metadata boundary are documented in [U06 runtime QA](U06-runtime-qa.md). Application receipts, raw backups and idempotence belong to [U06 application](U06-application.json).

## Preserved failures and bounded test corrections

1. **Initial U06-only run: 7/7 passed.** Explicit final manifest/scope hash assertions were then added; these also pass in the final combined run.
2. **First combined run: 352/355 passed across 28 files.** Its three failures were retained:
   - `lv3Unit56Text.test.ts` compared corrected G015 directly with the historical import that omits `for`. Only the caller changed: it authenticates the complete actual runtime document and projects it to the recorded migration parent before comparing the unchanged original source expectation. An unknown-pattern drift rejection was added within the existing case.
   - `recoveredUnitIntegration.test.ts` exceeded its unchanged five-second timeout. An unchanged isolated rerun reproduced the failure: 3/4 passed, with the historical case taking 13.987 seconds. The caller now derives changed paths from the strictly validated chain. All 131 direct JSON files must remain in the authenticated domain: four receive full raw projection, and the other 127 have their actual normalized bytes checked against the immutable U01 checkpoint. Unknown paths are rejected. Every original fingerprint for 124 historical units, every question checksum and every installed-runtime comparison remains. Added negative tests cover changed-file drift, unchanged-file drift and unknown JSON paths. The final historical case took 2.742 seconds without changing its timeout.
   - `illustrationCaptions.test.ts` assumed the current starter still had 742 approved scenario captions. The unchanged 742-caption translation checks now use an authenticated pre-migration projection. A new current-state test verifies all 302 added scenario captions retain the exact Chinese fallback with no invented English, preserves every original media row, and rejects unknown pack drift. The current approved scenario count is 1044; this is not a claim that all 1044 have authored English translations.
3. **The three corrected callers passed 20/20 together.** The next unchanged 28-file selection passed **356/357**. Its sole failure was `additionalCaptionRepair.test.ts`: the existing eleven-file proof loop took 5.623 seconds against the unchanged five-second limit. The original run had passed at 4.911 seconds. One unchanged isolated rerun passed 6/6, with the long case displayed at 5000 ms; this borderline pass was not treated as a clean combined result.
4. **The eleven independent caption-proof file checks were given separate named cases.** The original core/source/image/text checks, authenticated 144-file domain, exact six-domain/five-independent/eleven-file set assertions, all actual file reads, strict inverses, immutable hashes and existing negative checks remain. No cache or timeout changed. This adds eleven case names, not eleven new areas of product coverage. The final caption file passed 17/17; its slowest individual file guard was the pack at 1.718 seconds.
5. **Final same-selection combined run: 368/368 passed.** This is a real single combined pass after the corrections, not the sum of successful reruns. Earlier 352/355, 356/357 and isolated results remain separately available. Both forced TypeScript checks passed; the second was run after the final caption-case organization. Final lint/build used that same final test code.

The new U06 file and four narrow caller changes are the only test-source changes. Shared pipeline logic, proof caches, product data, source imports, manifests, scopes, historical hashes and timeout settings were not relaxed or replaced.

## Warnings and limits

Lint retained 322 unused-expression, 82 constant-condition, 13 unused-variable, one function-reassignment and one duplicate-key warning. They come from existing scripts and generated evidence, not the five changed test files. The duplicate-key diagnostic remains in `scripts/save_u25_audit_checkpoint.mjs`; no unrelated cleanup was attempted.

Build warnings remain for plugin time and chunks over 500 kB. The main bundle is approximately 10,009 kB before gzip and the town-scene bundle approximately 603 kB. These warnings were not suppressed or treated as build errors.

The complete 2000-plus-test project suite was **not run** and remains the final LV batch gate. The long real U06 fixture suite was not rerun: its preserved eight-first-run-plus-one-focused-method history and separate TypeScript parity are documented in [U06 fixture validation](U06-fixture-validation.md). This report does not turn that history into an earlier single-run 9/9 pass.

No browser activity, physical-phone test, full-pack installed-profile verification, complete offline matrix, real-user SRS verification, push or deployment was performed by these technical checks. Database tests use test fixtures and do not establish preservation of a real user's profile. The source and built artifacts were verified locally; publication remains separate.

## Reproduction and evidence

Evidence directory: `output/lv3-audit-20261107/u06-technical-final-20261107T210404775Z/`.

Run the 28 paths in `vitest-selection.json` together with `LV3_REAL_MEDIA_STATE=committed` and `--maxWorkers=1`. Archive the existing `output/lv3-audit-20261107/starter-media-ts-committed/observed.json` before rerunning the real-checkpoint test. Every overwritten observation in this validation has a byte-preserved archive and SHA256 evidence.

The Python invocation was:

```text
python -B -m unittest test_apply_lv3_unit_audit test_lv3_audit_pipeline test_prepare_lv3_audit_manifest test_apply_lv3_approved_review test_apply_lv3_nostalgic test_lv3_wage_forms test_lv3_starter_media_migration test_lv3_u06_pattern -v
```

It ran from `scripts` with Python 3.13, the existing compatible audit dependencies first and cached pure-Python openpyxl dependencies second. Nothing was downloaded, installed or permanently reconfigured.

Final serial gates were:

```text
node node_modules/typescript/bin/tsc -b <absolute tsconfig.json> --noEmit --force --verbose
npm.cmd run lint
npm.cmd run build
```

Key evidence:

- `u06-first.*`, `combined-first.*`, `recovered-isolated-first.*`, `caller-focused-first.*`, `combined-final.*`, `additional-isolated-first.*`, and `combined-organized-final.*` preserve every test attempt. The file named `combined-final` is the unsuccessful second combined attempt; `combined-organized-final` is the successful final attempt.
- `python-first.log` and `python-first-command.json` preserve the single successful 123-method run.
- `typecheck-first.*`, `typecheck-final.log`, `lint-final.log`, `build-final.log`, and `final-command-results.json` preserve the compiler/lint/build results.
- Original caller bytes, the caller diff, and `final-organized-source-hashes.json` retain code provenance.
- `previous-real-checkpoint/`, subsequent `real-checkpoint-after-combined-*.json` archives and `real-checkpoint-final-observed.json` preserve checkpoint evidence without discarding earlier observations.
- `input-start.json`, `input-end.json`, and `final-integrity.json` record the final 144-input, five-test-file, source/dist pack, puppet asset and frozen-browser-evidence checks.

Before-seal index SHA256: `04f0c33ad57e3e207a24ea73ff605d04f7069c50fda45a02ef2979fc9f8b6036`.

After-seal index SHA256: `d66440e30cbd6bc2daf4143fc661858f875d2cddf566251c5ce9b9fa860db792`.
