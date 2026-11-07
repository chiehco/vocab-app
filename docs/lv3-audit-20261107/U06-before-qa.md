# LV3 U06 before QA

Status: before capture complete; no U06 correction applied or approved by this report.

- Captured 2026-11-07 19:35:23–19:41:36 UTC on the existing isolated QA profile. Chrome was closed afterward.
- Opened all 134 curriculum cards (105 vocabulary, 29 grammar), all 82 unique general cards and all 282 actual general-tab pages. Saved 498 desktop screenshots plus 50 responsive screenshots. No missing or duplicate route IDs.
- All curriculum target meanings/explanations matched the observed DOM. All 105 vocabulary cards retained the example fallback; all 22 unmapped supplements retained the no-general-card fallback. Runtime remains text_only/read_only, with no authored item image/example fields or questions. Curriculum cards displayed no images.
- Independently read installed metadata: 82 words, 113 examples, 36 notes and 8 senses exactly matched current source rows. This is metadata coverage, not a claim that every field is displayed on every tab; actual visible text and HTML were captured separately.
- All 24 reachable general-card images decoded in the browser and returned HTTP 200. Observed URLs, resolver results and saved response hashes match the original image review. All 24 captions match their original values. profit, constant and warn still have no original English caption; their Chinese captions remain present.
- puppet still displays the original image with SHA256 f4e1c2904f359226c61a9475101dc492dc1b1410a4836b29cfcecf6b1df005a0, including its known extra-arm defect. This is baseline evidence, not image approval. koala has no image; miss retains its valid general-card longing illustration, not a curriculum image binding.
- Full read-only ContentDB/ProgressDB, settings, localStorage and sessionStorage were captured at both ends. ContentDB and all non-settings progress tables are unchanged. Only the normal learning:last-location bookmark changed. The existing one-word group, +5 reward balance, review log and daily cap 15 remain intact; prior archived QA non-settings progress also matches.
- Responsive subset: 10 routes / 24 views at 390×844, with normal scrolling, no horizontal overflow or sampled text occlusion. This is desktop emulation, not a physical-phone or real-user SRS migration test. The later after phase still requires full verification.

## Stability and limitations

All 144 pipeline inputs were independently read, with raw and CRLF-to-LF hashes computed from the same bytes. Beginning and ending hashes are identical. Starting HEAD was 30ed97b92cec8a465e8cddce0ce96e9847291586; final observed HEAD was 4e85ba802994c3c92cda510fd3fb4832c412b8fe after unrelated documentation changes. Those commits do not replace the independent input-byte stability check.

The first attempt at general-card batch 03 lost its browser execution context during a navigation/reload. Its CLI error, partial summary and seven partial screenshots are preserved under first-failure-*; the complete batch was then successfully recaptured in the same profile without resetting progress. The reload cause is unconfirmed. No browser application errors were observed in the retained CLI console log; React development messages were present.

## Evidence

Evidence directory: output/playwright/lv3-u06/.

- before-verification.json: coverage, image bindings, runtime and state comparison.
- before-curriculum.json / before-general.json / before-fields.json: timestamped observed DOM and HTML.
- before-runtime-metadata.json: separate installed metadata/source comparisons.
- before-initial-state.json / before-final-state.json: complete read-only snapshots.
- before-summary.json / before-http-images/: actual image URLs, status, bytes, hashes and browser dimensions.
- captions.json: extracted original first-tab DOM captions.
- before-input-hashes-start.json / before-input-hashes-end.json: explicit raw/LF hashes; independent-before-input-hashes.json retains the compatible LF map.
- before-seal-index.json: SHA256 index including response bytes and preserved first-failure evidence.

No product content, source images, mappings, manifests, SRS or learning data were directly modified. No commit or deployment was performed for this capture.
