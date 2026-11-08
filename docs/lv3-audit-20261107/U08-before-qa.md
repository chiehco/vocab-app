# LV3 U08 before QA

Status: BEFORE capture complete at frozen HEAD b7f55393aec303f7bc0b57948f518b8d989ee02d. No U08 content changes, compiler manifest, ledger/chain changes, commit, push or deployment were made by this capture. The new U08 browser session is closed; its persistent isolated profile and the unrelated LV1 session remain intact.

## Actual coverage

- Read-only snapshots span 2026-11-08 02:33:51.764–02:39:22.584 UTC.
- Opened all 147 curriculum cards: 98 vocabulary and 49 grammar. Opened all 81 unique mapped general cards and all 278 dynamically enumerated tab pages, with exact ID coverage and no duplicate or omitted card IDs. The 82 mapped textbook rows include two distinct suspect entries sharing one official ID. Sixteen vocabulary rows remain unmapped.
- Captured actual route, identity, timestamps, rendered text, HTML and screenshots. All five actual tab types were visited: 字卡, 字義, 相關詞, 搭配 and 記憶法. There are 506 desktop screenshots and 98 responsive screenshots, 604 total.
- The imported curriculum runtime module equals source and remains text_only/read_only, with no authored item image/example fields or questions. It is explicitly separate from ContentDB. No curriculum images rendered. All nonempty textbook target meanings/explanations were found in actual captured DOM; vocabulary example-pending and unmapped-card fallbacks remain intact.
- Separately inspected installed metadata matches all selected source rows: 81 words, 99 examples, 33 notes, 6 senses and 15 media records. Notes use the actual word relation; media uses assetId. This metadata comparison is not a display claim.
- before-source-dom-observations.json retains 2,519 source string observations against actual tab text: 1,529 verbatim substring matches and 990 values not found. The latter include IDs, statuses and optional/non-visible metadata. Substring presence does not establish a distinct UI field, and unseen fields are not marked as displayed.

## Images, captions and provenance

All 22 actually rendered image URLs returned HTTP 200, decoded in the browser, had nonzero natural dimensions, and matched the executed resolver and independent original source byte hashes. HTTP bytes, SHA256, content type, dimensions, source paths and consumer relationships are retained. All 22 image occurrences across the tab HTML are covered by these decoded images; no additional tab-image source was missed. Source images and resolver inputs were unchanged at the end.

All existing caption text is preserved with no mismatches: 18 English and 21 Chinese captions. Four original English captions are missing: protect, purify, substantial and chew. Chew also has no Chinese caption. Blank optional captions are recorded as missing, not treated as proof of complete caption coverage. Chew shows a literal chewing image and a separate metaphorical chewing-over example; that is a semantic review concern, not an image-caption approval or new curriculum content. No image, example or caption was invented or changed.

## Preservation and responsive evidence

The complete initial ContentDB/ProgressDB/settings/localStorage/sessionStorage snapshot exactly equals the prior sealed U07 after2 final snapshot. Final ContentDB and every non-settings progress table remain identical. Only the normal learning:last-location bookmark changed from mound to elementary. Both existing groups and both reviews remain unchanged; wallet balance is 10 and dailyNewWordCap is 15. Local/session storage remain empty. No group creation, quiz answering, rewards, SRS activity, database injection or profile clearing occurred. Comparisons are complete serialized table rows, not physical IndexedDB byte comparisons.

Sixteen representative routes and 48 views at 390×844 cover long grammar headings and explanations, long vocabulary meanings, null-ID fallback, long general titles, all actual tab types, images and missing-caption cases. Normal scrolling retained chrome and fixed navigation. Metrics found no horizontal overflow; centered text samples found no occlusion. Selected screenshot pixels were also inspected. These are sampled responsive-browser results, not a claim that every scroll position is unobscured or that a physical phone was tested.

## Input and evidence stability

All 144 canonical input_paths were independently read before and after, computing raw-byte and CRLF-to-LF-only SHA256 from the same byte read. Every byte length and both hashes match. HEAD stayed b7f55393aec303f7bc0b57948f518b8d989ee02d and tracked product diff is empty.

U07 original before seal (804 files), original first after seal (1,067 files), corrected first after seal (1,071 files), and original after2 seal (196 files) were checked before and after. Every sealed member and index remained unchanged. No old evidence was modified.

Browser console: 0 errors and 0 warnings. No browser capture batch failed. Two offline checker errors are retained: the first lacked optional chaining for a null source image; the second accidentally changed an input filename during an output-name replacement. The corrected verify-u08-v3.cjs uses the original captures and unchanged expectations and reports no verification failures. No browser recapture was used to fix these checker errors. The JSON evidence retains correct Unicode; terminal Tee output may display encoding artifacts and is not the authoritative data.

## Artifacts and limits

Evidence directory: output/playwright/lv3-u08/.

- before-verification-v3.json: authoritative combined verification.
- before-curriculum.json / before-general.json / before-fields.json: original actual DOM, routes and timestamps.
- before-runtime-metadata-v3.json: separately captured installed/source metadata.
- before-dom-checks-v3.json / captions-v3.json: textbook text and original caption checks.
- before-initial-state.json / before-final-state.json / initial-state-preservation.json: complete read-only snapshots and prior continuity.
- before-summary.json / before-http-images/ / all-tab-image-consumers.json / static-image-inventory.json / image-source-stability.json: original HTTP bytes, decode dimensions, resolver and consumers. before-summary.json was written before responsive capture, so its screenshot count is desktop-only; the final verification contains the full count.
- before-responsive-01.json through before-responsive-16.json and corresponding PNGs: actual viewport, scrolling and sampled readability.
- before-input-hashes-start.json / before-input-hashes-end.json / before-input-stability.json: 144 independent raw/LF hashes and comparison.
- prior-evidence-verification-start.json / prior-evidence-verification-end.json: unchanged U07 seals and every referenced member.
- checker-correction-history.json: retained offline checker history.
- before-seal-index.json: complete final new-evidence inventory, plus this report and U08-before-capture.json hashes.

This is the U08 BEFORE baseline only. It does not establish all-card semantic correctness, art approval, full LV3 completion, real-user/full-pack behavior, physical-phone compatibility, offline/practice-mode coverage or production deployment. No protected state changed unexpectedly.
