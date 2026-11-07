# U02 sealed-manifest fixture validation

## State and scope

- Baseline remains 99883751926bd6cb4feff70daff56c07afc130cb.
- U01 product checkpoint remains 39a8f4f3d829eb4546edbfa8ef255b312706aac5.
- U02 manifest is sealed and ready; its chain entry remains prepared.
- No product application occurred in either worktree. All applications below used newly created TemporaryDirectory fixtures.
- The 37 patches retain complete before rows and exact narrow scopes. Four physical source files plus meta.json and sa-pack.json are written by the fixture transaction.
- The separately authorized illustration mapping/public image changes are outside the unchanged 144-path text/pack input domain. No existing guard was removed.

## Independent before capture

The browser worker independently reread all original-worktree input files and hashed bytes after CRLF-to-LF normalization only. All 144 paths matched the isolated worktree before sealing and again after all tests.

The public-safe capture summary is U02-before-capture.json. The sealed manifest canonical SHA-256 is 3ca25889cb2154233e88b1c543a818a2999e76ed7959bc892633f807490a6c24. generatedAt was fixed once at sealing; later apply does not regenerate it.

## Executed checks

1. Real U01 Python fixture suite: 11/11 passed, including original hash/row/path/status guards, rollback, idempotence, and exact-after bytes with pending receipt/stale lock.
2. Real U02 Python fixture suite: final 7/7 passed (204.279 seconds):
   - seal and dry-run leave all fixture inputs unchanged;
   - all 37 changes apply with six writes; the shared curriculum file is replaced once;
   - exact source and derived hashes match; reapply performs zero product writes;
   - injected second replacement failure restores every input and records rolled_back;
   - unpatched-row, unchanged-input and input-set drift reject without application;
   - exact-after pending/stale-lock states reject both dry-run and apply;
   - committed TEMP-chain inversion restores all 144 U01 checkpoint inputs and the original 137 unchanged-input guards.
3. Final focused TypeScript run: 2 files, 8/8 tests passed. This includes seven scope/chain negatives and one real parity test covering all 37 rows, four complete source documents, and exact inverse normalized bytes for six files including meta/pack. Unknown raw drift is rejected for every file.
4. Focused TypeScript diagnostics for the extracted raw inverse helper and parity test: zero errors.
5. Final independent capture comparison: 144/144 unchanged. U02 worktree state is before. Git product JSON, pack/builder/registry and U01 manifest diffs against the U01 product checkpoint are empty.

The first U02 run had six passes and one harness-only failure: its unknown-drift test mistakenly required a parent output directory left empty by earlier tests not to exist. The product rejection and byte-preservation assertions had passed. The assertion now checks that no transaction directory was created. The complete seven-test suite was rerun successfully; the original failed summary is retained rather than erased.

## Local evidence

Under output/lv3-audit-20261107/fixture-validation/:
- u01-real-fixture-results.json
- python-real-fixture-results.json
- u02-fixture-final.log
- first-run-harness-failure.json
- python-parity.json
- typescript-parity.json
- checkpoint-projection.json
- worktree-unchanged.json
- applied-fixture/ contains only copies of the successful TEMP transaction outputs for parity checking.

The complete independent map is output/lv3-audit-20261107/independent-before-input-hashes.json. It is not regenerated from the manifest.

The Python real suite runs explicitly as python -B scripts/test_lv3_audit_pipeline_fixtures.py. Generic discovery skips it unless LV3_PIPELINE_REAL_FIXTURES=1, since the independent capture is an external prerequisite. The real TS parity test likewise requires LV3_PIPELINE_FIXTURE_PARITY=1 and the Python-produced TEMP artifacts.

## Still not claimed

No default full suite, whole-project build/lint/typecheck, browser after-QA, production deployment or push was run here. The previous initial full-suite failures and their follow-up remain recorded in U01-validation.md. Parent integration, explicit worktree application, chain promotion after verified application, and after-QA remain separate next steps.
