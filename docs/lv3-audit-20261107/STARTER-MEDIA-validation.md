# Starter media migration: prepared registration and dry-run

**Current status:** real product application is verified and the typed migration entry is committed. Runtime after-QA and TypeScript after-application validation remain pending at this checkpoint. The sections below distinguish registration, prior TEMP validation and real main application.

## Status at this checkpoint

The bounded starter media migration is **registered as prepared, not applied**.
The product builder and starter pack remain at the committed U05 checkpoint.
No product file was replaced with an after fixture. No Git staging or commit was
performed by the registration operation.

- Registration base: `67972ab5e2b306c6e8f5dae5de9f5702da786e21`.
- Committed U05 parent manifest: `f7ad8f7a18f1b52eeb0be70ae233648de464032ed4819ad7f42cc9f6dc84de77`.
- New descriptor: `docs/lv3-audit-20261107/starter-media-actual-names-v1-manifest.json`.
- Migration manifest hash: `88ba19b48f296fc26b7abdac6468bc1dc26f474523ac78b309aabfed0456578b`.

Manifest and entry hashes use the existing pipeline Node `JSON.stringify`
contract. Fixture and capture hashes below are literal raw SHA-256 values.

## Independent input evidence

The original QA capture had raw SHA-256
`1c0cacb817f9a4b8bb268cd7ab3fd7b6555efe89edc49e80222f659348a38fc8`,
capture base `90bb66c644335e2e2b295254cc469a42e37a45fe`, and capture time
`2026-11-07T18:05:12.336879+00:00`. The subsequent registration-base commit changed
only status documentation. The original capture was not edited.

An explicit adapter renamed `files` to `normalized` and `rawFiles` to `raw`,
without changing map values. Registration reread all 144 actual files and matched
both maps exactly. The same actual144 raw and normalized maps were verified again
after registration and after the standard dry-run. No expected hash was inserted
into an observed map.

The tracked tree was clean before registration; recovery checks found no pending
receipt or existing apply lock. Registration used the existing exclusive lock
while installing the five evidence files and prepared chain. The lock was released
before the normal applier dry-run and recovery state remained clear afterward.

## Exact registration delta

Only the descriptor, four fixtures and prepared chain were installed. This
validation document records the result. The chain envelope changed from version
1 to version 2 and appended the single typed migration immediately after U05.
All old entries, baseline, anchor and anchor hash remained identical.

The original entry-list hash and the prepared chain's original-entry prefix hash
both equal `86e26fd8deeb31df235add9ee82d9da06aa353b77b12a161893dec2ab583f6ce`.
No old manifest, scope, checkpoint or historical expected hash changed.

Chain raw hashes at registration:
- Before: `2fcbe4fbe21aba1af9b0b3feb695668aede3cfa1c7f63c055b3f4a05f3227fbb`.
- Prepared: `2567cb0478235f9e273183e7a7857a6cfc1e0b378ecc624d72c0c4e25bbd66e2`.

## Fixture integrity before staging

All four fixtures are under
`docs/lv3-audit-20261107/starter-media-actual-names-v1/`:

- `before-builder.py`: `ce7fa30c583fe2171d439675a3068fc77a027012a04ff3de732dd25605e61c83`.
- `after-builder.py`: `6bf7f32ccb3b8937e78027814fffd58339d3876f7594aa40890ef0b2aad96d0e`.
- `before-pack.json`: `28874ebee1562eae9cc1fc71534d87e470094cad268e2af3f43a209724bf8add`.
- `after-pack.json`: `c198a371ad72a5f8d8b7d013bd9cc8b2b97c29ecc3fd56abbe2e785f7a19a3e8`.

Each installed file was reread and matched its manifest raw hash. `git check-attr`
reported `text: unset` for each exact fixture path. For the actual installed bytes,
Git `hash-object --path` with both `core.autocrlf=true` and `false` produced the
same blob ID as `hash-object --no-filters`. These checks did not modify the index
or write Git objects. The fixtures therefore retain their captured raw bytes
through the configured clean-filter path; they must not be renormalized manually.

## Standard dry-run

Executed from the repository root:

    python scripts/apply_lv3_unit_audit.py --manifest docs/lv3-audit-20261107/starter-media-actual-names-v1-manifest.json --dry-run

Result:

    {"state":"dry_run","files":["public/data/v1/sa-pack.json","scripts/build_sa_pack.py"],"mediaAdded":382,"productWrites":0}

The process exited successfully with empty stderr. All 144 product inputs remained
raw-byte-identical to the independent capture. Full metadata, word IDs/order,
source media, captions, translations and exam priorities remained unchanged.
There were no unexpected registration or dry-run gate failures.

## Prior real TEMP validation, separate from product application

The same candidate passed real-data validation in an external temporary fixture:

- Both authenticated builders reproduced guarded outputs.
- The source-derived ordered delta contained 382 distinct added words: 316
  approved, 52 draft and 14 needs_redraw. Media count changed 746 -> 1,128 while
  starter words remained 5,779. All source fields/statuses were preserved.
- A deliberate second-replacement failure restored all 144 raw bytes and recorded
  a rolled-back receipt. This was intentional fault injection, not an unexpected
  gate failure.
- TEMP forward wrote exactly two product files; repeated apply wrote zero.
  Actual raw backups and receipt hashes were checked.
- Applied-but-prepared projection was rejected. After promotion of the TEMP entry
  only, U05/U04/U02/U01 projections passed their original guards.
- The U05 inverse matched all 144 raw and normalized entries of the independent
  capture in that exact-byte TEMP copy. Older checkpoints retain their original
  normalized/fixture contracts; this is not a claim of reconstructed historical
  original-CRLF bytes. Legacy137/144 guards remain unchanged.

These TEMP results do not constitute a real product transaction. The source-level
approved count is not a claim that 316 images were newly visually reviewed against
every curriculum sense. Draft/needs_redraw records remain source records, not new
UI approvals.

## Remaining gates

Real application, its own receipts/backups and committed-chain promotion are still
pending. Runtime after-QA must cover normal starter update detection, existing
progress, same-profile reopen, repeat update=current, unchanged full profile,
failed/offline update recovery and rejection of draft/needs_redraw media. The six
previously observed missing U05 captions remain the known DOM cases; dress is an
additional source gap rather than a previously verified DOM failure.

This registration phase did not rerun the synthetic16 suite, the whole test suite,
TypeScript tests, a build or browser after-QA. Other validation phases must retain
their own identities/results rather than being attributed to this dry-run.


## Real main-product application checkpoint

This later checkpoint supersedes the prepared-only status above; the earlier
registration and TEMP sections remain historical evidence. The migration was
applied by the standard applier, never by copying an after fixture over products.

- Application base: `3bb93dcbd00cb85ba335d7e678c603e030da3656`.
- Manifest: `88ba19b48f296fc26b7abdac6468bc1dc26f474523ac78b309aabfed0456578b`.
- Actual receipt: `output/lv3-audit-20261107/transactions/20261107T184016929302Z/transaction.json` (state committed).
- Product writes: exactly two, builder and starter pack. Repeated apply: zero.
- All 144 actual after raw/normalized hashes matched; the other 142 inputs remained
  byte-identical. Both real backups matched their original raw/normalized guards
  and receipt hashes. Source media and full metadata remained unchanged.
- Media: 746 -> 1,128, exact ordered 382-row delta with original statuses: 316 approved,
  52 draft and 14 needs_redraw. Word IDs/order and 5,779-word count remained fixed.
- New starter contentHash: `sa:dfd6834da6d08dbb81d90244086fba7e997ffd6bffe48cdbb8668a39b3b22bbc`.
- New pack raw SHA-256: `c198a371ad72a5f8d8b7d013bd9cc8b2b97c29ecc3fd56abbe2e785f7a19a3e8`.
- Only the same typed entry changed prepared -> committed; old entries and
  historical manifests/guards were unchanged. Current main 144 checkpoint guards
  and one actual-main U05 inverse passed. That inverse matched all 144 captured
  raw/normalized bytes. Earlier U04/U02/U01 real TEMP projections remain separate
  evidence under their original normalized/fixture contracts.
- No unexpected apply or verification failures occurred; no automatic retry was
  used. The second standard invocation was performed only after independently
  verified after state and proved already_applied with zero writes/no new receipt.

See `STARTER-MEDIA-application.json` for the real receipt identity and exact backup
hashes. Runtime after-QA and TypeScript after-application validation are still
pending at this checkpoint. No synthetic/full suite was rerun, no Git commit was
created, and no push/publication occurred in this operation.
