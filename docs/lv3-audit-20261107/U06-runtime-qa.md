# LV3 U06 runtime QA

Status: U06 after QA complete on applied HEAD e11780b4b33cfb688a3a2e96151536e0fb3936f5. Chrome is closed. No commit or deployment was performed by this verification.

## Coverage

- Opened all 134 curriculum cards (105 vocabulary /29 grammar), all 82 unique general cards and all 282 actual tab pages. No missing or duplicate IDs. Saved 574 screenshots, including 498 desktop traversal screenshots and 69 responsive-subset screenshots.
- All 144 changed fields match the sealed manifest in actual runtime data. Of these, 124 have matching text in captured DOM; 20 meaningSource fields are metadata only. Shared text can represent more than one source field, so this is not a claim that each field has its own visual element.
- All 13 new verb-form records are present in runtime and visible text. squirrel shows both squirrelled and squirreled in past and past-participle forms. envision uses the directly verified Collins sourceRef.
- Curriculum remains text_only/read_only, with no authored item image/example fields or questions and no rendered curriculum images. The corrected G015 heading includes the original textbook for.

## Images and captions

All 24 reachable general-card images returned HTTP 200 and decoded in the actual browser. Observed URLs match the executed resolver. Only puppet changed: SHA256 8a3480a548f04c0a5fd4f89606eddab205f4656e3b3d1eaeae5ce550e9ea2bca, 653992 bytes, 1254×1254. The other 23 retain their original paths and hashes. All 24 original captions are unchanged; profit, constant and warn retain their missing English captions and existing Chinese captions. The new puppet image was also verified in the normal quiz and after browser restart.

## Source update and data boundaries

This is the retained isolated **starter QA profile**, not a full-pack installed profile or the user's real learning data. Complete read-only ContentDB/ProgressDB snapshots and full-source HTTP row comparisons do not establish a second installation mode.

The first and an early intermediate snapshot still contained the old source rows/meta. Without pressing an update control, intercepting requests, injecting records or forcing installation, normal background synchronization subsequently installed the new data. The early after-post-sync-state snapshot is preserved but is not treated as successful-update proof. Separate after-confirmed-source-state and exact runtime verification establish the new rows/meta. No manual-update success is claimed.

All rows in the starter curriculum/words/examples/notes collections and corresponding complete HTTP source collections match the independently reconstructed expected rows from the original source plus sealed patches. Original progress remains unchanged through content update, full navigation and the responsive subset, apart from normal navigation settings. Confirmed updated ContentDB remains unchanged through the later quiz and restart.

## Normal QA activity and persistence

Through visible app controls, one new group named U06 puppet QA was created with only W002690 and no textbook items. The original confirm group and activity remain byte-for-byte intact. Its normal image quiz showed the new puppet picture; one correct answer saved a new quiz-image review and +5 reward. The wallet increased from 5 to 10, rather than being reset. The new review records schedulingApplied:false; dailyNewWordCap remains 15.

Group creation, quiz activity and navigation are recorded as separate intentional deltas. Existing cardStates, group, quizStats, review, reward ledger and reward-round rows are preserved. All non-settings progress tables match across close/reopen and final capture; no duplicate reward appeared.

## Responsive and limitations

At 390×844, 13 routes /33 views include squirrel's long dual variants, donkey's complete long English definition, G015 and the puppet card. Normal scrolling found no horizontal overflow or sampled text occlusion. The actual puppet quiz was separately tested at 390×844 before answering: two scroll positions, no overflow or sampled occlusion. Controls were not hidden or restyled.

Not tested: physical mobile, full-pack installed profile, offline matrix, forced daily selection, SRS scheduling or arena selection. The activity check is one normal image quiz, not a claim about every practice mode.

## Provenance and evidence

- Manifest canonical JSON SHA256: c59130eba2f8aeae6f0012dbdf1b052f3663dbbdebfcf875d183fddfd0730581.
- Manifest raw byte SHA256: 796c854059f6bade93abe7c66b60613ef13ef3a7082a42875e4ad7f2852b45ea.
- All 144 source inputs have identical starting/ending raw and CRLF-to-LF hashes, computed independently from the same bytes per read.
- All 719 original before files and their original index remain unchanged. The earlier before QA report is also unchanged.
- Evidence: output/playwright/lv3-u06/after-preparation/. Start with after-acceptance-summary.json, after-dom-field-evidence.json, after-exact-fields.json, after-input-stability.json and after-seal-index.json. Actual DOM, full read-only states, image response bytes, screenshots and UI snapshots remain alongside them.
