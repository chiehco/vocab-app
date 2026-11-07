# LV3 replace general-image integration, 2026-11-07

## Scope and evidence

- Base: `5559c5ae061b8bdfac4ac69db623eae6c51cc156`.
- Candidate source: `8752688b3d2f376bf743aca46fd98d017a94e543`; isolated cherry-pick: `abd7467`.
- The existing general registry had 338 rows and no mapping for W002723 / replace. Exactly one final row, `LV3-GENERAL-W002723-20261107`, was appended; the preceding 338 rows are unchanged.
- New path: `wordbeast/lv3-reviewed/W002723-replace-v2-cebee8173ee9.webp`. Runtime `getWordBeastAsset` appends its existing asset-revision query; content-addressed path provides independent versioning.
- Source and new WebP pixels were independently opened. Original: hallway lightbulb replacement. Candidate: Doudou fits an intact wheel to a supported wooden cart; detached broken gray wheel is visible. Candidate matches the unchanged current cart caption.
- Original asset, AX88d20367 media record, original EX5074b26d formal bulb example, and both original caption sources are preserved. No image is attached to the formal bulb example.
- U04 remains text_only/read_only: 183 items, 122 vocabulary items, no authored example or illustration binding. No words, examples, notes, meta, sa-pack, curriculum, or source-manifest file is changed by this integration.
- This is agent visual review under the comprehensive audit request, not manual user pair approval. Actual reopened app consumer visual acceptance remains pending. No publication occurred.

## Exact inverse and historical guards

The new immutable proof contains the entire ordered before and after registries, the precise appended row, source/candidate asset metadata, preserved caption/media/formal-example records, and hashes for independent unchanged image sources. Its semantic SHA-256 is pinned in the new guard.

`beforeLV3ReplaceText` validates full LF-normalized current raw SHA-256 **before JSON parsing**, then validates pinned semantic evidence and the unique exact appended row. It returns only the verified 338-row before text. All old projection callers now pass through that layer. The existing bank/permissible proof, its guard and all historical expected hashes remain unchanged. `additionalCaptionRepair` runs the raw inverse before its historical text hash. CRLF/LF normalization is the only tolerated byte variation.

Rollback: apply `beforeLV3ReplaceText(currentRawText, proof)` to the registry only. It rejects any unknown current state. The source image was never overwritten, and the candidate can remain as inactive provenance.

Hashes:

- Original image: `20fad955973dbaad0769663d62e354571894d5dd5d6ba035fa70a71aa216f8a3`
- New image: `cebee8173ee9d2a633e68212669b6c47178dbbe17cd9a2c69ee7b83e937fe40c`
- Before registry LF bytes: `b02869136bc9a23f4632d5267e9b5c886f7c076898748ef589ff53b648949a4a`
- After registry LF bytes: `b6a29b346bfcb63969fb787d5e4db52177abd8e2ec4fe09e1025466e34448071`
- After registry semantic: `1bb5c53d37482dda4e61714a71dfbd9611ca0bd76d94ca5ca816bf20b9105c5f`
- New proof semantic: `db566766a714d2c4e4755394cc37e3292b7f6d8f8949aa1a23c276d20bfa76a8`

## Validation

- Seven affected image-guard suites: 59 tests passed, maxWorkers=1. Includes old bank/permissible, LV2 image layers, audited registry, additional-caption raw-text projection, and the new replace layer.
- Negative tests: appended whitespace/newline, indentation, duplicate keys, property order, row order, duplicate row, unrelated row mutation, every mapping identity/path/caption field, every proof top-level field, original and candidate asset mutation, and attempting inverse twice. CRLF input is accepted only by exact LF normalization.
- Production shared-resolver checks cover ordinary card/gallery path and versioned asset URL, exact image-clue caption, wrong word/ID/path rejection, and no textbook binding.
- Focused lint and git diff whitespace check passed.
- Full build/typecheck intentionally deferred to the parent serial merged-head validation. Browser, reopen/cache refresh and physical-device checks not run here.

- Final focused consumer run: four suites / 49 tests passed (new replace inverse after final edit, LV1 reviewed gallery, wordBeastAssets, imageClue), maxWorkers=1. Combined distinct coverage: ten suites / 105 tests.
