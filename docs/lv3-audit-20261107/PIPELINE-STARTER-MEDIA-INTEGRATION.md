# U05 parent integration and deferred real migration gates

## Low-load integration checkpoint

Inspected mainline commit: `8f830a1e98ecc5cd2922842b45a2762e794b06b2`.
Its committed U05 manifest hash is
`f7ad8f7a18f1b52eeb0be70ae233648de464032ed4819ad7f42cc9f6dc84de77`.
This document does not assert that the ongoing U05 browser review is complete.

The isolated branch `audit/starter-media-integration-u05` starts at that exact
mainline commit. The two support commits cherry-picked without conflicts:

1. Original `e91f43a37329ec8b22f21f65510c9a6ec24af3e0` became
   `6883a6d6b5665081f7f6632b8fdd1b958224a415`.
2. Original `6bdda3d06cd01bb1258d393b925b2b3a5c407620` became
   `2f12e17ae85d7402a0081d09f2d104230d6323c3`.
3. Apply the following additive CI/documentation commit after those two.

Use either the original pair or the integrated pair, not both. Preserve all later
mainline work. Do not overwrite complete validator files from the older support
branch, reset the main branch, or reapply the U05 product commit. A fast-forward
to this isolated branch is appropriate only if main has no newer work; otherwise
cherry-pick the three support patches onto its current head.

Lightweight checks performed after cherry-picking:

- Mainline wage helper and enforcement blocks in Python and TypeScript match
  the `8f830a1` versions exactly. The specific wage commit
  `48749c800f70c44cf6e0d3c260ed3e9edab610c1` remains an ancestor.
- Confirm assets/registry, U05 products, chain, historical manifests and scopes
  have no diff against the integration base.
- CI previously did not select `test_lv3_starter_media_migration.py`: its apply
  globs and three explicit small-guard filenames do not match that filename.
  One precise Python unittest step was added after the existing small guards.
- Removing only that two-line CI addition reproduces the prior CI file exactly
  under LF normalization. Deploy workflow is unchanged. All existing jobs,
  commands, timeouts and build steps remain in place.
- The new Python test uses TEMP synthetic inputs and no private before capture.
  Its prerequisites are already present in the check job: Python 3.11, Node 22,
  and Git. The existing normal Vitest invocation discovers the new TS file.
- Git diff checks passed. No fixtures, TypeScript tests, compiler, build, browser
  run, real capture, real seal or product application was run during this
  integration checkpoint. Earlier support-only test results are recorded in
  `PIPELINE-STARTER-MEDIA.md`, not presented as post-integration test results.

## Gates after heavy validation is released

### 1. Freeze and independently capture the real parent

Wait for the parent's release of the heavy-validation gate. Do not disturb its
browser server or profile. Recheck the current Git head, clean product paths,
committed chain tip, exact U05 manifest hash above and recovery state. Later
documentation/support commits are permissible only if all 144 product inputs
still match the committed U05 checkpoint. A later content step requires a new
plan; do not silently choose a different parent.

Use a new, separately named capture artifact, for example
`output/lv3-audit-20261107/starter-media-after-U05-before-capture.json`.
Do not overwrite the genuine U05 before capture, its six-file receipts or browser
evidence. Independently record both normalized and raw SHA-256 maps over the exact
144 paths returned by `input_paths`, plus capture artifact raw hash, Git head and
U05 parent hash. Use CRLF-to-LF only for normalized hashes.

Capture and seal must read the same actual bytes. A Windows product worktree and
a fresh isolated checkout can legitimately differ in raw line endings. Either
run the read-only seal against the captured worktree (it builds only in external
TEMP), or copy all 144 captured inputs byte-for-byte into a separate staging root
with matching chain/docs. Do not apply main's raw capture to an ordinary checkout
and pretend its differing raw bytes were independently captured there.

### 2. Seal read-only and audit the exact real delta

Call `lv3_starter_media_migration.seal(root, capture)` only after the gate opens.
Review its returned descriptor and four fixture blobs before registering them.
Check the parent hash above, all 144 normalized/raw maps, only two changed
product paths, the fixed single builder replacement, and preservation of full
metadata. Keep the four exact fixture paths under the committed `-text` rules.

Recompute the ordered delta directly from authenticated `media.json`, old S/A
priority names and the existing starter word names. Require exactly:

- 382 added source rows and 382 distinct target words.
- 316 approved, 52 draft, 14 needs_redraw, without status changes or filtering.
- Media count 746 -> 1,128 and unchanged 5,779 starter word IDs/order, provided
  those independently read U05 values still match. Any difference blocks sealing
  review rather than changing the expected inventory opportunistically.
- Exact source indices, resulting media indices and complete source row values.
  Compare `(assetId, targetWord, status)` to the 382-record inventory in the
  original `starter-caption-gap-analysis.json`; its record field `word` maps to
  source `targetWord`. It is an inventory cross-check, not a substitute for full
  row/byte validation.
- No caption, translation, source image, exam priority, other pack array, word
  ID/order, source file or full-data metadata changes. Pack metadata may change
  only media count and correctly recomputed starter contentHash.

The source-level approved count is not a claim that 316 images have passed visual
review. Draft/needs_redraw remain packaged as source records but rejected by UI.

### 3. Materialize and validate only in an isolated TEMP copy first

Save the reviewed descriptor/fixtures in the isolated integration branch; append
the one typed prepared migration entry immediately after U05 under chain envelope
2. Preserve every historical entry, manifest, scope and hash. Do not mark it
committed before application verification, and do not use the real product tree
for the first apply test.

Against copied real inputs, verify both authenticated builders, exact expected
delta, deterministic output and full guards. Exercise the existing transaction
runner through the normal applier wrapper for lock/pending receipt, backup,
compare-before-replace, rollback, idempotence and concurrent edits. Verify both
LF/CRLF portable projections and actual-byte receipts/backups for that TEMP
transaction. Permanent history guards stay normalized; rollback evidence stays
raw and platform-specific.

After a verified TEMP apply, promote only that TEMP chain entry to committed and
project back to U05, U04, U02 and U01. Check each original checkpoint's complete
144-input normalized map and existing exact fixture contracts. At the new U05
boundary, verify the captured two changed-path raw fixtures; unchanged files keep
their checkout bytes. Do not fabricate historical original-CRLF expectations.
Reject unknown/prepared targets and applied-but-uncommitted trees.

Run the focused Python/TS migration, pipeline, compiler, wage and historical
parity checks serially as scheduled by the parent. Reconfirm no product changes
in the main worktree. Save explicit pass/fail/skip evidence and both commit and
manifest identities before requesting the separate real apply gate.

### 4. Separate real application and browser verification

Read-only seal, prepared registration and a TEMP pass do not constitute real
product application authorization. Let the parent authorize and coordinate the
actual two-path application after the ongoing U05 browser work is complete.
Afterwards, require normal old-starter update detection by pack contentHash,
progress preservation, same-profile reopen, second update=current, unchanged
full profile, failed/offline update recovery and draft/needs_redraw rejection.
Check the six observed captionless U05 cards. Dress remains an additional source
gap, not a previously proven DOM missing-caption case.
