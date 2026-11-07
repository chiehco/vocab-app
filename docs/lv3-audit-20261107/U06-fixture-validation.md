# LV3 U06 fixture validation

## Current state

Validated on 2026-11-07 UTC for separate application review. U06 remains **prepared + ready** and the working product remains in its exact **before** state. No U06 product application or committed-chain promotion occurred. Application, rollback and inverse operations below ran only in operating-system TEMP.

**Nine distinct methods have passing evidence: eight from the original full run, plus one complete method after a narrow harness correction. This is not a single-run 9/9 pass or a complete rerun.** TypeScript parity passed separately, 1/1.

## Sealed identity and provenance

- Ready manifest: `c59130eba2f8aeae6f0012dbdf1b052f3663dbbdebfcf875d183fddfd0730581`.
- Scope: `e00d9e122b980f9452f2c3be0d4ea10fc5549f37e044622e2d96342d98a9290d`.
- Immediate parent: committed typed migration `starter-media-actual-names-v1`, manifest `88ba19b48f296fc26b7abdac6468bc1dc26f474523ac78b309aabfed0456578b`.
- Independent capture artifact raw SHA-256: `1b346d84081f545734d3c1372d23d250e5f681a82f33c8c1006f281235baf58b`.
- Canonical reviewed draft raw SHA-256: `51435e3b078d8af9e52100035562e8a46f234159b36ba41ae935b08728bc38c8`.
- Actual compiler-input raw SHA-256: `1fa65e6f0804ae923efd727d719d461f7e8367863c115c246b7f9377fb45b8b9`.
- Guard code checkpoint: `978eb0319672bbb6b08451a2cb2721f4930e7af7`; the later local change is restricted to the self-contained fixture method 05 harness described below.

The canonical draft and compiler input are distinct artifacts. The adapter preserves dataset/path/key/id/field, before presence/value, after value, full before row, reason and original finding IDs exactly. Original sources are an exact ordered prefix. Extra findingId/classification/locator metadata is retained in an additional public-safe source record bound to the canonical raw hash and original proposal index, including the three grammar finding IDs that differ from their origin references. An unchanged raw canonical copy and per-proposal comparison proof are retained beside the adapter. No content value was changed by adaptation.

144 reviewed fields merge into 56 rows: 25 curriculum, 19 words, 10 examples and 2 notes. Thirteen verified verb-form records are added. The six affected physical files are curriculumLV3Unit6.json, words.json, examples.json, notes.json, meta.json and sa-pack.json. senses.json remains unchanged. No new historical before-format fixtures were needed.

## Executed gate and failure boundaries

1. Compiler preparation, pending registration, seal and dry-run passed. The final dry-run again reports 56 patches, six files and **zero product writes**.
2. Original complete Python fixture invocation: **8 passed, 1 failed**, all nine methods executed, 723.881 seconds. The original result remains unsuccessful and is not overwritten. Method 05's added-file scenario was correctly rejected earlier by the typed migration guard with `Migration requires original 144-input domain`; its old matcher expected `Input set changed`.
3. Only method 05's harness was changed. Its anchored matcher accepts exactly `Input set changed or missing guards` or `Migration requires original 144-input domain`. After creating the extra file, it now also snapshots every original input and verifies no changes and no transaction directory after rejection; the original extra-file content assertion remains. The first half testing unchanged senses-file drift is unchanged. All other module/method ASTs were compared with the committed version and remain identical.
4. Focused invocation of the **entire method 05 passed**, 1/1, 68.701 seconds (69.097-second process duration). Both unchanged-input drift and added-file domain drift ran. This supplies the ninth distinct method's passing evidence without rerunning the other eight.
5. Existing TypeScript/Python parity: **1/1 passed**, 3.31-second Vitest duration. It reused the original method 02's six verified after artifacts, whose raw hashes still match the archived first-run copies. All 56 rows and complete changed source documents agree forward and inverse; all six normalized published files match Python before/after hashes and reject appended unknown bytes.

The first run's raw rollback test passed: deliberately failing the second replacement restored every original input byte, with the receipt state, manifest identity, six file paths and all before/after hashes checked. Exactly six apply replacements and zero idempotent replacements were verified in TEMP. Pending-receipt and lock rejection, unknown unpatched rows, unchanged/changed-file drift and checkpoint-caller drift were covered by the passing methods. TEMP receipts were removed by normal fixture cleanup; the main repository has zero U06 transaction receipts, no pending receipt and no lock.

Projection to the typed migration parent restored all 144 normalized input byte sequences. Historical projection through the migration and ordinary predecessors restored all 144 U01 checkpoint hashes, including the original 137 unchanged-input guards and U01 dataset after hashes. Intermediate chain guards were retained. The registered builder was authenticated before staging/projection. All pack counts, ordered word IDs and all 1128 starter media rows are unchanged.

Raw forensic rollback and normalized historical/published-text reconstruction are separate claims. The legacy TypeScript result field `exactRawInverseFiles` names six files, but the parity test explicitly normalizes CRLF to LF. It is not proof of six raw historical byte inversions. Raw rollback and current-tree raw stability are established by separate snapshot/hash checks.

## Source correction and earlier safe stops

The first compiler attempt rejected extra review metadata with `Unknown/missing proposal fields`. It produced no candidate or registration. The exact adapter resolved the evidence-container mismatch without relaxing compiler FIELDS.

The second compiler attempt rejected the unsupported G015 pattern with `Disallowed after field`, again before producing a candidate or registration. The reviewed narrow exception allows only LV3-U06 / curriculumLV3Unit6.json / LI-LV3U06-G015, the exact complete seven-field before row, and the pattern-only correction `be not cut out sth（原書星號註記）` to `be not cut out for sth（原書星號註記）`. It requires the directly viewed p56 photo `20260815_092400.jpg`, SHA-256 `5708b6a8ae64904b56e5912d6771122ec2aa1e273d1a358ea1b59c352b8ff900`. Other grammar patterns, general field allowlists and hard-protected fields remain unchanged. Shared guard validation had 58 cases (3 positive, 55 negative); focused Python 69/69 and TypeScript 89/89 passed.

Existing verb-form guards were not relaxed. The canonical envision record uses the independently read Collins source, retaining the original Oxford supporting evidence. The pre-change canonical draft and verb-form evidence remain archived.

## Final integrity and evidence

Final verification confirms all **144 actual raw and LF-normalized inputs** still match both independently read browser start/end maps. All **719 frozen before artifacts**, the frozen before report, canonical/adapter bytes, ready manifest, scope and typed parent are unchanged. Historical documents are unchanged except the explicitly authorized preparation chain/ledger entries. Original full-run artifacts remain byte-for-byte identical and the unsuccessful full-run result is retained.

- Successful preparation, original fixture failure, focused rerun, TypeScript parity, final dry-run and final integrity logs: `output/lv3-audit-20261107/u06-preparation-gate-final-20261107T200216Z/`.
- Key final records: `fixture-gate-results.json`, `focused-harness-scope-proof.json`, `09-final-dry-run.json`, `final-preapply-integrity.json`.
- First fixture snapshot: `fixture-first-failed-artifacts/` and `fixture-first-failed-artifact-hashes.json` inside that gate directory. Nine JSON files comprise three result records and six candidate data files.
- Reusable outputs: `output/lv3-audit-20261107/u06-validation/`. `python-real-fixture-results.json` intentionally still reports the original failure; `python-focused-rerun-results.json` and `typescript-parity.json` report the later passes.
- First compiler rejection: `output/lv3-audit-20261107/u06-preparation-gate-20261107T194946Z/02-compile-first-run.log`.
- Adapted compiler rejection and adapter proof: `output/lv3-audit-20261107/u06-preparation-gate-adapted-20261107T195307Z/`.
- Narrow G015 guard evidence: `output/lv3-audit-20261107/u06-g015-guard-validation-20261107T195852Z/`.
- An unexecuted report-script construction syntax error is separately retained in `report-preparation-first-failure.txt`; no file, product operation or fixture result was produced by that attempt.

No test-source tree was copied under output. No full-project suite, TypeScript compilation, lint, build, browser-after acceptance, physical-phone test, commit, push, release or deployment is implied. Browser-before evidence is separate and predates the independently handled puppet image-only change. Main product application and actual-after checks remain a later step.
