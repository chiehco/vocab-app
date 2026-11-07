# LV3 U01 runtime acceptance — 2026-11-07

Scope: local app at http://127.0.0.1:5186, baseline 99883751926bd6cb4feff70daff56c07afc130cb and the 28 rows in U01-patches.json. Product images were not changed. No production publish or real-user browser/database access was performed by this QA.

Subsequent image acceptance: this is the earlier text-only checkpoint. The bank issue below was later repaired and verified on its ordinary card and image-clue quiz. Current image results and remaining consumer limits are in [U01–U02 image runtime QA](U01-U02-image-runtime-qa.md).

## Results

- Before and after reopening: all 176 curriculum cards (123 vocabulary + 53 grammar) and all 99 distinct corresponding general cards were opened, with exact DOM text and image metadata recorded.
- All 41 bound images (1 curriculum + 40 general) load successfully; image URLs, alt text and dimensions are unchanged. Probability briefly returned complete=false during the after inventory despite valid dimensions; an explicit complete/naturalWidth wait and fresh recheck passed. This transient observation is retained, not rewritten.
- All 24 patched content rows / 38 changed fields match the actual IndexedDB values exactly. Relevant tabs of 22 affected general cards were read. 37 field groups pass scoped DOM checks (usage strings compared by semicolon-separated segments; all three verb forms checked). Example sensePos is metadata and checked in IndexedDB rather than claimed as independently visible. Verb-form sourceRef/status are also stored-data checks.
- Curriculum G35's exact revised explanation is present in its rendered DOM.
- Grammar questions 12, 16 and 35 were encountered in a normal disposable 53-question session, with options and feedback captured. All three patched grammar records match the actual browser-loaded module. Questions 12 and 16 show the revised options; question 35 shows the revised besides/beside explanation. All option rationale values are checked in loaded data; not all four answer branches were separately exercised.
- Quiz session was closed and reopened at question 48 (golden). Full feedback text is identical before/after reopening. This test session is disposable and separate from the preservation profile.
- Preservation profile: all captured progress stores and content table counts are unchanged after reopening, except learning:last-location.updatedAt: 1794041983589 → 1794042074858. The location itself remains /word/W003591 (lecturer), position 1/1. localStorage and sessionStorage are identical. The profile has no historical SRS/review records; this is not proof of real historical progress migration.

## Visual scope and open issue

All 41 original bound image files were inspected individually for the separate image audit. Runtime screenshots were reviewed for critical before cards and an after contact sheet covering determine meaning, politics usage, G35 and reopened golden feedback. Not every unchanged runtime screenshot was manually inspected. Full-page screenshot stitching can place fixed bottom navigation over content; this is not reported as a UI defect. Desktop Chromium only; physical mobile devices were not tested.

Bank remains pending: public/wordbeast/audited-20261105/LV1-U14-37-21952a2bb4d4.webp, W000061. Selected caption says “The children sat on the river bank and watched the boats go by.” Only one character is on the bank; two are in boats. No replacement artwork is approved or installed by this report. Text-only entries are not automatically missing-art defects.

## Evidence

Evidence stays in output/playwright/lv3-u01/: before/after-curriculum.json, before/after-general.json, before-state.txt, after-reopen-state.txt, after-final-state.txt, after-fields.json, quiz-changes.json, quiz-reopen.txt, probability-recheck.txt, after-acceptance-summary.json and PNGs. Original image review: output/lv3-audit-20261107/u01-image-review.md and u01-image-inventory.json.

Both isolated QA browsers were closed after verification. The local service and isolated profiles are retained for follow-up checks. Run only one QA browser at a time to avoid resource pressure during tests. Reuse instructions are local-only in output/playwright/lv3-u01/REUSE.md.
