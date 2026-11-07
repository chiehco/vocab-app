# Bounded starter media checkpoint support

This change is **support only**. It does not register, seal, apply, commit, or
publish a real migration. Product builder/pack, historical manifests, scopes,
anchor and chain remain untouched. U05 must first finish under the old builder.

## Authorized product transformation

The sole operation changes `row.get("targetWord") in selected_names` to
`row.get("targetWord") in actual_names` exactly once in the authenticated builder.
It adds source media for words already in the starter pack, in source order and
with every field/status unchanged. The observed real inventory is 382 additional
rows (316 approved, 52 draft, 14 needs_redraw); the support tests use small
synthetic rows and do not claim to have applied that inventory.

There is no approved-only packaging rule. Existing media is preserved. Nothing
here approves artwork, changes captions/translations/source images, word IDs,
exam priorities, full metadata or learning progress. UI consumers must continue
rejecting draft/needs_redraw media. Source approval is not evidence that all 316
images have been visually checked against every curriculum sense.

## Fixed protocol

- Chain envelope version 2 admits one typed migration entry immediately after
  committed LV3-U05. Old ordinary entries keep their exact schema. The migration
  uses `kind: migration` and `migrationId: starter-media-actual-names-v1`, never a
  fabricated unit. Envelope version 1 remains valid for old chains.
- Manifest schema 3 is reserved for `kind: starter-media-actual-names` and that
  one identity. Unknown keys, identities, unready manifests, broken parents,
  duplicate identities, committed gaps and wrong predecessor are rejected.
- Both complete 144-path normalized and raw before/after capture maps are required.
  Permanent current/history guards use only CRLF-to-LF normalization; raw maps
  record the independent capture, not a platform-specific permanent checkout rule.
  Only `scripts/build_sa_pack.py` and `public/data/v1/sa-pack.json` may differ.
  Source media, priority and full metadata are separately checked. Full before
  metadata is authenticated against its canonical normalized byte guard so
  later unit changes cannot substitute a newer source hash.
- Four exact raw fixtures live outside the input domain at
  `docs/lv3-audit-20261107/starter-media-actual-names-v1/`: before/after builder
  and before/after pack. Each has an explicit raw SHA-256 matching its raw input
  guard and normalized SHA-256 matching its checkpoint guard. No arbitrary
  fixture paths or generic file replacement operations are supported.
- Media membership is recomputed from unchanged source rows, priorities and
  existing pack word names. The manifest delta must exactly match source indices,
  after indices, row values and order. Semantic inverse removes only those exact
  rows. Non-media arrays and word identity/order remain unchanged. Only media
  count and the correctly recomputed pack contentHash may change in metadata.
- The after pack must be the exact compact LF serialization produced by the builder.
  The captured before pack may differ only by CRLF line endings; its exact original
  raw bytes remain authenticated and restorable.
  Rehashing a whitespace/duplicate-key payload cannot legitimize it. Builder raw
  bytes may retain CRLF, but the only allowed byte replacement remains fixed.

## Seal/apply workflow, once U05 is ready

1. Independently capture `normalized` and `raw` maps for all 144 paths. Keep the
   genuine U05 before capture and historical manifests unchanged.
2. `lv3_starter_media_migration.seal(root, capture)` authenticates the committed
   U05 tip, reproduces the old normalized pack while retaining its captured raw
   fixture, builds the candidate in an external TEMP
   directory and returns a manifest plus raw fixture bytes. It writes no product
   or documentation files. The caller must separately review/save/register them.
3. Save only the fixed fixtures and descriptor, then append the typed prepared
   entry under chain envelope 2. Preserve all old chain entries and hashes.
4. The existing applier dispatches schema 3 to the bounded runner. It checks
   registration/tip, complete input domain and normalized state, metadata,
   source/delta, and independently reproduces both packs with their authenticated
   builders in TEMP. Ordinary v2 count invariants remain unchanged.
5. Apply retains exclusive lock, pending-receipt, exact raw backups,
   compare-before-replace, fsync, concurrent input/chain/manifest revalidation and
   rollback checks. A pending receipt or stale lock blocks even an idempotent
   request. Failed rollback with a concurrent product edit stays pending for
   recovery. It never deletes a foreign lock or overwrites an unexpected edit.
6. Only after separate review/application should the migration entry become
   committed. An applied-but-prepared state is not a historical checkpoint.

## Historical projection and future units

Python reverses later ordinary units first, then authenticates the migration
after state, restores its exact old builder/pack fixtures and verifies all 144
normalized before hashes. The two restored files are the exact captured raw
fixtures; the other 142 files keep their checkout bytes. On the original capture
platform this also reproduces the captured full raw map. On an LF checkout,
unchanged files intentionally remain LF rather than being silently converted. Earlier unit inverses then run the original
builder and their unchanged guards. TypeScript uses the same boundary and
semantic inverse, authenticates raw fixtures before optional LF normalization,
and checks even unchanged input paths when traversing migration.

Known committed migration IDs may be projection targets. Unknown/prepared targets
remain rejected. Future ordinary-unit preparation selects the migration's actual
parent hash without expecting a fabricated `unit` key. The migration does not
relax the selected checkpoint's current/no-tail guards.

Raw claims are deliberately bounded: the new U05 migration boundary has complete
independent raw captures and exact changed-path fixtures. Older U01/U02/U04
contracts often authenticate CRLF-normalized bytes, not historical original CRLF
bytes. They remain unchanged. Only genuine existing raw fixtures can establish
historical raw identity; no reconstructed LF content is called original raw.
Normal Windows CRLF and Linux LF checkouts are equivalent under the one existing
normalization rule. Other whitespace, duplicate keys and content changes remain
rejected. No optional raw field was added to ordinary v2 manifests. Raw transaction
receipts, backups, compare-before-replace and rollback always authenticate actual
bytes read for that transaction, including when they differ from the seal platform.
The staged builder preserves the current checkout line endings.

The four fixed fixture paths have explicit Git `-text` attributes. A TEMP Git
repository test checks the staged attributes/index bytes and both core.autocrlf
true/false checkout outputs. The fixtures never use Git newline conversion.
TypeScript published-text APIs still accept/return normalized LF; the explicit
`inverseStarterMediaMigrationRaw` helper strictly authenticates forensic raw
input/output. `inverseStarterMediaMigrationNormalized` requires and returns LF
text. This distinction does not change
any existing published-text API contract.

## Verification scope

The new Python tests generate an independent synthetic 144-file tree entirely
under system TEMP. They test all-row status preservation, raw/normalized round
trips, exact double-inverse rejection, missing guards/domain/parent, source and
builder drift, reordered/duplicate/modified delta, unknown additions, metadata,
recovery locks/pending receipts, idempotence, rollback and concurrent changes.
Typed-chain tests exercise the actual chain loop with only legacy unit validation
mocked. Transaction tests mock chain registration to isolate the real bounded
runner, locks and filesystem writes; they are not a real U05 seal/apply test.

The TypeScript parity test calls the Python fixture exporter into TEMP and checks
all 144 raw and normalized inverse outputs against Python, including CRLF input
bytes, and normalized historical projection across LF and CRLF checkouts. Python
transaction tests verify both variants preserve the other 142 files and roll back
to their own actual raw bytes. A later ordinary-unit regression restores a CRLF
source as allowed normalized LF and still crosses the migration boundary safely. No test source tree is copied under repository output. Existing opt-in real
unit parity suites remain separate and must not be reported as run when skipped.

Before real integration, also verify U05/U04/U02/U01 committed projection against
their original guards and exact fixtures, independent real migration captures,
deterministic two-builder outputs and the actual 382-row inventory. Required
runtime QA remains separate: normal old starter update detects changed pack
contentHash, preserves existing progress, survives reopen, reports current on a
second refresh, retains full profile behavior and recovers after failed/offline
update. Confirm six previously observed U05 missing captions. Dress is a source
gap, not a verified missing-caption DOM case. Do not call source-level semantic
or browser review passed based on these support tests.

## Support-only verification record

Final code checks on the isolated support branch, based on `40d6930`:

- `python scripts/test_lv3_starter_media_migration.py`: **16 passed**, 136.870 s.
  This includes both portable checkout variants, exact transaction raw rollback,
  concurrent post-write CRLF-only tampering, actual Git fixture attributes/index
  and checkout outputs, before-pack CRLF capture, typed-chain adjacency, and a
  later ordinary-unit projection crossing the migration boundary.
- `python -m unittest discover -s scripts -p test_lv3_audit_pipeline.py`:
  **13 passed**, 4.648 s.
- `python -m unittest discover -s scripts -p test_prepare_lv3_audit_manifest.py`:
  **10 passed**, 8.675 s. Ordinary v2 contracts remain unchanged.
- `node node_modules/vitest/vitest.mjs run src/features/direct/starterMediaMigration.test.ts src/features/direct/lv3AuditPipeline.test.ts src/features/direct/lv3PreparedCheckpoint.test.ts src/features/direct/lv3UnitFixtureParity.test.ts src/features/direct/lv3AuditPipeline.fixture.test.ts`:
  **33 passed, 2 pre-existing opt-in tests skipped**, 7.83 s. The new cross-language
  test authenticates Python-exported TEMP fixtures and all 144 raw/normalized
  inverse results; the skipped real-unit fixtures are not claimed as passes.
- Changed TypeScript files parsed with installed TypeScript `createSourceFile`:
  **zero syntax diagnostics** across six files. This is not semantic typechecking.
- Independent targeted static review identified and then confirmed resolution of
  the CRLF future-unit boundary and transaction post-write raw-check issues. It
  found no remaining blocker in its reviewed scope; it did not rerun tests.
- `git diff --check` passed. Existing Windows CRLF conversion warnings are not
  claimed as errors. Product builder/data, chain and historical manifests have
  no diff. No whole-project compiler, full suite, build, browser test, real
  migration seal/application, Git push or publication was performed.

Integration must preserve the separately developed wage(s) verb-form validator
exception and its tests. This support branch predates those main-branch changes;
its patch does not modify the ordinary v2 verb-form validation block. After
integration and U05 commitment, real capture/seal/projection and runtime QA are
still required as listed above.
