# LV3 U07 attraction / observation isolated integration

Base: b1f9f3523d40d33586e180dc826103a6511dd6c0 (U06 product checkpoint).
Branch: fix/lv3-u07-image-integration-20261107.
Candidate source: a55645b64c7434e420123ae2432ac04a07a5ea68, preserved by local cherry-pick 4d62c59.

## Exact product scope

- Replace only the existing audited registry row 128, LV1-U09-62 / W003081 attraction, image path. Registry stays 341 rows. Original source WebP remains. Captions and formal EX3de55eef are unchanged.
- Replace only the English translation for observation with exact Chinese key 豆豆用望遠鏡觀察樹上的小鳥。: `Doudou uses a telescope for close observation of the bird in the tree.` becomes `Doudou uses binoculars for close observation of the bird in the tree.` The actual data field is `en`. All other translation bytes, row order, line endings, Chinese text, media AX6c587f4d and its starter mirror remain.
- No curriculum, word, sense, example, status, SRS, master Excel, source manifest, starter pack/builder, cache or product resolver code changes.

## Pixel review and scope inventory

Both attraction source and candidate were opened with view_image. The candidate removes the viewer-left exterior arm/hand beside the stall post. The bent chest arm holding three skewered food balls and the viewer-right arm remain. Four characters, food, canopy, lanterns, posts, palette and composition remain. Generative texture differs; preservation is visual/semantic, not pixel-identical.

The unchanged observation source was also opened. It visibly has two telescope barrels and is binoculars. This supports the one English-token correction, not a rewrite of the two formal examples.

Candidate: public/wordbeast/lv1-reviewed/W003081-attraction-v2-3fc80dd19b36.webp, 366450 bytes, 1254 x 1254, SHA256 3fc80dd19b36c698552dc530d1f3becee61867478774bf99d13f3c4f203a5079.
Original attraction: 58ea5c6aa13d086f4b422cf50d4122a3191babdb85c753c661ef381b41f9a647.
Unchanged observation: eec947eb5dbbec95e2598b94ed98f8ae6db1fd29ba93adbd6b2ab6a4012fa22b.

Recursive inspection of every direct JSON schema found eight same-ID references, not image consumers:
- attraction: LV3U07-V047, LV3U16-V059, LV4U11-V084, LV4U03-V042.
- observation: LV3U07-V093, LV4U02-V001, LV5U25-V097, LV5U03-V089.

Every reference remains text_only/read_only with no illustration or originalExample. The LV1 reviewed registry, approval registry, exact example-image registry and static LV1 gallery contain no additional attraction/observation pair. Historical LV1-U09 ledger and original-image review retain their source image evidence unchanged. wordCatalog and source/exam text references are not rendered image bindings. Tests independently enumerate all wordId/word/imageWordId resolver results and all direct JSON nested schemas.

All 26 source images remain byte-identical, including the replaced attraction source. Other 24 review decisions remain unchanged; execute receives no invented English, and hollow/marker stay unbound to U07.

## Evidence and strict inverse

Immutable proof: docs/unit-audit-20261105/LV3-U07-image-caption-repairs.json.
Semantic proof SHA256: c05db0cdf1af09f8573527020798f0782661a1dad498e3fbf0a83403ab98e535.

New guard: scripts/lv3_u07_image_caption_guard.mjs (with typed declarations).
It validates the full normalized current byte hash before parsing and permits exactly one full path token or one English token replacement. Before/after row identity, count, unrelated rows and the final original LF hash are checked. CRLF normalization is the only formatting allowance. Unknown whitespace, reordered properties/rows, duplicated keys/rows, different captions, unrelated fields, changed proof and already-reversed input are rejected.

Registry current LF SHA256 adf487c70c1cd01ebea6b13b1837a34ca265e230cfde832c851002433dfbd803 reverses to 9c5a5557f847be5e3a8206f2dd9ebb662ece9d209631ae7c7ef3f69a8804748f, exactly the puppet after checkpoint, then puppet -> confirm -> replace -> bank/permissible and older history.

Caption current LF SHA256 ff5fcd22ddb6e90d1dd9fbdbc05915922d9e04e4dd058c2f9309733cf30783e6 reverses to 51278453fdcd57d8ff7f55585208dd7fcce19c397a4cf22bc60c13af0e764b11. The original source CRLF SHA256 c94e87f99a26cedd404c1b1d13ef6abb4f837cc214b8d5ef456fa9ed50b4f6ee is separately preserved. Existing bank, replace, confirm and puppet proof values and guard bytes are unchanged; only their callers apply this exact new inverse first.

The new proof has six protected text-domain files projected only through the authenticated LV3-U06 checkpoint (manifest c59130eba2f8aeae6f0012dbdf1b052f3663dbbdebfcf875d183fddfd0730581), and seven independent direct-read files. Exact 6/7 path sets, the 144-input migration domain, original hashes and drift rejection are asserted. Historical source/guard files remain additional direct reads. The previous puppet 6/7/13 split is retained, with only its translation file receiving the new caption inverse; it is not bypassed or treated as an unrelated file.

Rollback: apply the strict inverse to each exact current registry/caption file and write its verified canonical LF output (or restore its recorded CRLF form). Keep all original source images. Candidate files can remain inactive provenance. No blind global string replacement is authorized by this report.

## Completed isolated verification

All requested checks passed on the first attempt on 2026-11-07 UTC. No test or compiler fixes, reruns, failures, timeout changes, skipped tests or shared cache changes were needed after the preparation checkpoint.

- Single combined Vitest invocation: **14 files, 149/149 tests passed**, one worker, unchanged timeouts, 50.09 seconds reported by Vitest (50.90 seconds command elapsed).
- Forced whole-project TypeScript: **exit 0**, --noEmit --force --verbose, both app and node projects forcibly rebuilt, 69.61 seconds.
- Focused oxlint: **exit 0**, no diagnostics, all ten changed/new guard, declaration, test and helper files.
- Final independent integrity: exactly the two unique product-token changes; all 13 protected and 12 historical files match their original raw and normalized-LF hashes; all 26 original U07 assets and all four sealed review files retain their original SHA256. The candidate WebP retains its expected SHA256.
- git diff --check: passed.

The 14-suite selection covers the new U07 inverse/proof/negative and preservation checks, puppet, confirm, replace, bank/permissible, LV2 image/building/praise, audited image registry, additional-caption history, LV1 images, asset resolution, image clues and caption rendering. Each protected file is independently read and checked. Runtime enumeration finds only the named general consumer for each image; recursive current direct-JSON inspection finds the eight read-only same-ID references and no authored image/caption binding.

Static React rendering confirms the observation English and unchanged Chinese caption, and verifies an unrevealed observation card does not expose the caption. These are component/runtime checks, not browser image-loaded or visual UI acceptance.

Existing dependencies were linked by a junction; nothing was downloaded or installed. No production build, browser/HTTP/image-loaded check, installed-profile update, complete offline behavior, physical-phone test, main integration, push, CI or deployment was performed. The entire project test suite was not run. Parent-owned final integrated browser and batch checks remain separate.

## Exact local evidence

Directory: output/u07-image-integration/.

- focused-selection.json: exact 14 test paths.
- focused-first-20261107T220458583Z.log and matching command/result JSON: only Vitest attempt, 149/149 pass.
- tsc-first-20261107T220607386Z.log and matching command/result JSON: only TypeScript attempt.
- lint-first-20261107T220733186Z.log and matching command/result JSON: only lint attempt; log is empty because there were no diagnostics.
- final-integrity.json: actual post-check source hashes, exact raw/LF comparisons and command results.
- before/after-registry.json and before/after-captions.json: original checkout-byte snapshots and exact replacements.
- preparation.json and prepare.py: source hashes and bounded preparation provenance, not test results.

The heavy test window was explicitly released after these checks and before report/commit work. No final-code edits followed the checks; only this report was updated.
