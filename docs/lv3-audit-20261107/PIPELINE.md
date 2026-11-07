# LV3 audit pipeline: implementation checkpoint

This branch changes infrastructure and audit documents only. Product data and U01-patches.json remain byte-for-byte unchanged in Git. U02 is a prepared 37-row candidate, not an applied correction.

## Immutable history

- Release baseline: 99883751926bd6cb4feff70daff56c07afc130cb.
- U01 product checkpoint: 39a8f4f3d829eb4546edbfa8ef255b312706aac5.
- The U01 manifest and checkpoint hashes are pinned in both helpers.
- U01's original 137 unchanged-input guards, dataset hashes, metadata guards and older LV1/LV2 expected hashes are preserved.
- New manifest beforeByteHash/afterByteHash use normalized CRLF-to-LF UTF-8 bytes. Semantic hashes use Node JSON.stringify.
- All U02 changed files reproduce their original normalized bytes using the fixed pretty serializer. No large duplicate before-fixtures are necessary; a hash-checked fixture fallback exists for future noncanonical files.

## Interfaces

Python scripts/lv3_audit_pipeline.py provides load_chain, validate_manifest, prepare_step, inverse_step, project_checkpoint, seal_step, transaction_lock and run_v2. The existing applier remains the CLI, retains its original U01 contract and dispatches schema-v2 manifests. Its --apply path preflights, acquires an exclusive lock, then repeats checks under the lock.

The document store is keyed by physical file. U02 learningItems and grammarQuestions share one curriculumUnit2.json object and one write.

The scope file records exact permitted rows, before hashes and after values. Changing a manifest alone cannot expand its scope. U01's original POS/title restrictions remain unchanged. Protected identifiers, status, original examples, stems and answers cannot be authorized by a v2 scope.

TS src/features/direct/lv3Audit.testSupport.ts provides:
- projectAuditStep: strict full-document forward/inverse logic.
- lv3AfterUnit1Rows: exact later-row inversion, explicit subset mode only for starter packs.
- lv3AfterUnit1File: full-document later inversion before U01 checks.
- lv3BeforeAudit: later-row inversion followed by the unchanged U01 helper.
- lv3AfterUnit1PublishedText: exact later raw-byte inversion, including beforeMeta and beforePackMeta, before the U01 raw-text helper.

## Gate before U02 application

U02-patches.json is now sealed with readiness=ready and exact derivedAfter/afterMeta values following the independent 144-path capture. Its chain entry remains prepared because no product worktree has been applied. The original pending-capture gate was verified to reject application before sealing. See U02-before-capture.json and U02-fixture-validation.md.

After the parent explicitly clears the full-run/capture gate:
1. Supply seal_step with the independently recorded complete input-path/hash map. It must cover input_paths(root) exactly and match both current inputs and the manifest's immutable before guards.
2. seal_step returns a ready candidate in memory. It builds only in temporary storage, captures generatedAt once, and computes exact derivedAfter guards. It does not write product files or repository documents.
3. Review/save that candidate and update its canonical hash in chain.json. Keep chain entry prepared until its application is verified.
4. Run dry-run and the deferred fixture tests, then explicitly apply using the existing CLI.
5. Verify the transaction receipt and resulting files; mark the chain entry committed before historical projection/full validation. A tree with applied but uncommitted chain data deliberately fails the U01 anchor check rather than accepting drift. Do not describe this separate documentation promotion as part of OS-atomic product replacement.
6. On failure, preserve the pending receipt or stale lock for recovery. Do not bypass or delete another process's lock.

## Deferred checks

Completed: real U01 Python fixture tests; U02 temporary seal/apply/idempotence/rollback/drift/checkpoint fixtures; cross-language 37-row document and six-file raw inverse parity. Still not run: the full historical/default suite, full project typecheck/lint/build/Vitest, or browser after-QA. No product worktree was applied.

The U01 recoveredUnitIntegration/additionalCaptionRepair fixes from 5e81e51 were cherry-picked as 1a79ad8. Their raw callers now receive lv3AfterUnit1PublishedText first, and historical curriculum reads receive lv3AfterUnit1File first. Original hashes and the recorded initial full-suite failures remain unchanged. Two direct dictionary checkpoint callers also use the shared later-step projection.

Already checked after review fixes: 13 small synthetic Python tests; 7 small TypeScript pipeline tests; 3 focused historical projection files with 16 tests; and focused TypeScript diagnostics for seven changed files. These are not a full project pass. The real U01 integration-fixture test simulating exact-after bytes with an uncommitted receipt subsequently passed in the complete 11-test fixture run. The final real U02 suite passed 7/7; final small-plus-real TS parity passed 8/8. See U02-fixture-validation.md for the retained first-run harness failure and successful full rerun.

Recovery checks precede all preflight results, including dry-run and already-applied. Idempotent --apply still acquires the exclusive lock and inspects pending receipts. The synthetic crash-window tests independently cover pending-only, stale-lock-only and combined states; none may report clean success or modify the persisted state. TS scope validation now mirrors Python per-dataset fields, collection contracts, exact scoped values, option protections and form evidence.
