# LV3 U07 before QA

Status: before capture complete. This is baseline evidence, not approval or application of U07 content/image corrections. The U07 QA browser session is closed; unrelated browser sessions were left untouched.

## Coverage

- Frozen capture HEAD: b1f9f3523d40d33586e180dc826103a6511dd6c0. Actual read-only state snapshots span 2026-11-07 21:44:34.767–21:50:43.856 UTC.
- Opened all 153 curriculum cards (100 vocabulary / 53 grammar), all 84 unique formal general cards and all 282 actual general-tab pages. There are 85 mapped textbook rows because adviser and advisor share W002017. All expected IDs were captured without omissions or duplicates.
- Saved 519 desktop screenshots and 91 responsive screenshots, 610 total. Route IDs, timestamps, actual rendered text and HTML are retained. All five actual general-tab types were covered: 字卡, 字義, 相關詞, 搭配 and 記憶法.
- All 153 textbook target meanings/explanations are present in captured DOM. The 100 vocabulary cards retain the example-pending fallback. All 15 unmapped supplements retain the no-general-card fallback.
- The separately imported curriculum runtime module matches source and remains text_only/read_only, with no authored image/example fields or questions. No curriculum images rendered. This module is not a ContentDB table.
- Read-only installed ContentDB rows match source for all 84 words, 115 examples, 33 notes, 13 senses and 17 media records. This is metadata coverage, not a claim that every stored field is displayed on a tab. Full installed starter counts include 5779 words, 7436 examples, 4111 notes and 1128 media records.

## Images and captions

All 26 actually rendered general-card images returned HTTP 200, decoded successfully in the browser, and matched the executed resolver, source path and independently hashed original source bytes. Original response bytes, SHA256, dimensions and URLs are retained. There were no broken images or caption mismatches.

All 26 original Chinese captions are preserved. The 25 existing English captions are preserved; execute W004367 still has no original English caption. crunchy W003247 actually resolves to curriculum/lv4-u19/19-28.webp. These are existing general-card bindings, not new U07 curriculum-image approval.

## Progress preservation and responsive checks

Complete read-only ContentDB/ProgressDB, settings, localStorage and sessionStorage were captured at both ends. ContentDB and every non-settings progress table are unchanged. Only the normal learning:last-location bookmark changed, from puppet to cholesterol. The previous U06 final non-settings progress rows also match this run's initial rows.

The confirm group and U06 puppet QA group remain intact, with their two existing reviews. Reward balance stays 10; dailyNewWordCap stays 15. No group, quiz, answer, reward, SRS record or other progress was added or injected. Comparisons are of complete serialized table rows, not physical IndexedDB bytes.

At 390×844, 16 routes / 43 views cover long curriculum headings and meanings, grammar, long general titles, images, the missing-English-caption case and every actual tab type. Normal scrolling retains the navigation/chrome. No horizontal overflow or sampled text occlusion was found. cholesterol was added to the representative subset after actual tab enumeration established that the original subset did not cover 記憶法. No controls were hidden or restyled.

## Stability and verification history

All 144 pipeline inputs were independently read at both ends. Each read computes raw-byte and CRLF-to-LF-only SHA256 from the same bytes; raw and normalized formats remain distinct. All 144 beginning/ending byte lengths and both hashes match. HEAD remained b1f9f3523d40d33586e180dc826103a6511dd6c0 throughout capture.

There were no failed browser capture batches and no browser console errors or warnings. The first offline metadata checker mistakenly used mediaId rather than the media table's actual assetId primary key. That checker and all its failed derived outputs remain unchanged. The corrected verify-u07-v2.cjs reuses the original captured snapshots, writes fresh v2 derived files, and reports no failures. No browser evidence was recaptured to fix that checker. Use before-verification-v2.json and before-runtime-metadata-v2.json as the final derived results; the unsuffixed first versions are retained diagnostic history.

## Evidence and limits

Evidence directory: output/playwright/lv3-u07/.

- before-verification-v2.json: final coverage, image, state and responsive verification.
- before-curriculum.json / before-general.json / before-fields.json: actual rendered DOM text and HTML, route IDs and timestamps.
- before-runtime-metadata-v2.json: separate installed metadata comparisons, including media assetId keys.
- before-dom-checks-v2.json / captions-v2.json: observed textbook text and original caption checks.
- before-initial-state.json / before-final-state.json: complete read-only database and storage snapshots.
- before-summary.json / before-http-images/: actual image response status, bytes and hashes.
- before-responsive-01.json through before-responsive-16.json: viewport, scroll and occlusion results, with corresponding screenshots.
- before-input-hashes-start.json / before-input-hashes-end.json / before-input-stability.json: independent raw and LF hashes and unchanged-input comparison.
- metadata-checker-correction.json: exact first-checker error and corrected-output lineage.
- before-seal-index.json: SHA256 index of original and corrected evidence, scripts and HTTP bytes, plus this report's hash.

No product source, image, registry, manifest, SRS or learning data was directly modified. No real-user profile, full-pack installation, physical mobile, offline matrix, practice mode or deployment was tested. This capture does not establish semantic correctness or image approval for every card. No commit or deployment was performed by this QA worker.
