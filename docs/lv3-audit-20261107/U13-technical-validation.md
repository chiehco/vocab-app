# U13 technical validation

Status: completed_with_release_blockers. AFTER browser is pending; this is not release acceptance.

## Immutable original run

Application commit: 1d899286c0e9305bab4923c8f0f9d03375deb089. Exactly 76 discovered files were executed: 3603 tests = 3590 passed + 9 failed + 4 original opt-in skips. The unchanged 5000 ms limit produced eight timeout failures; one additional assertion exposed an unprojected historical U15 consumer. All original logs/results remain unchanged.

All 14 complete Python modules passed, 2448 methods and zero skips. The U13 consumer passed all 20 tests, and U13 review guards passed all 1272 tests. Full TypeScript compilation, changed-code lint, production build and original AST/public-source verification passed. All 5016 protected inputs were unchanged during that run.

## Timeout identities and attribution

- src/db/unitAudit.testSupport.test.ts: reverses only recorded starter corrections while retaining the old whole-pack fixture. Same prior U12 timeout identity.
- src/db/unitAudit.testSupport.test.ts: keeps the caller pack untouched when restoring sealed historical media. Same prior U12 timeout identity.
- src/features/direct/lv2Unit48Audit.test.ts: restores only seventy exact formal operations and rejects recorded-field and identity drift. Same prior U12 timeout identity.
- src/features/direct/lv3Unit5Audit.test.ts: authenticates all 56 actual U05 after rows and all six published files. Same prior U12 timeout identity.
- src/features/direct/lv3Unit6Audit.test.ts: authenticates all six actual published files and all 31 affected starter rows. New timeout identity in this run; prior classification: None
- src/features/direct/lv4NotesConfirmation.test.ts: keeps every public content dataset, including the5779-word starter, exactly unchanged. Same prior U12 timeout identity.
- src/features/direct/recoveredUnitIntegration.test.ts: retains historical curriculum and question identities with the audited cubes gloss addition. New timeout identity in this run; prior classification: assertion_mismatch
- src/features/vocabulary/lv3PuppetImageRepair.test.ts: pins proof, source and candidate assets, original captions/media and historical proofs and guards. Same prior U12 timeout identity.

There are six recurring timeout identities and two newly timing-out identities. The recovered integration case previously failed an assertion and was subsequently corrected separately; its present timeout is not relabelled as an old timeout.

## Authorized historical-consumer correction

Only one line in unitAudit.testSupport.test.ts changed: the full parsed words array is authenticated/projected with existing lv3BeforeAudit before the original U15 contract is tested, matching the adjacent U14 consumer. Independent review traced the overlap to W000771 shout and its audited noun meaning. The original non-form hash was retained, not replaced by the current output. Every original 22-row guard, both prior inverse steps and all negatives remain. Original bytes/hash and exact diff are retained. No product or shared helper changed.

The complete test file was uniquely discovered and executed once at the unchanged limit: 116 tests = 114 passed + 2 failed + 0 skipped. The U15 assertion now passes in 1.102 seconds. The two recurring timeout failures are the old whole-pack reversal and caller-pack historical-media preservation tests. They were not retried or suppressed. Full project TypeScript compilation and changed-test lint passed afterward.

## Product and build integrity

Only the authorized test changed among the original 5016 protected pins before result documentation. All 144 product inputs match the original applied state in raw SHA256, LF SHA256 and byte length. All 2405 files and the complete artifact set in the original build index match. No product rebuild or repeated AST verification is claimed after the test-only correction. The verified original production build is retained at output/lv3-audit-20261107/u13-technical-preparation/execution-v1/production-dist.

## Remaining boundaries

Changed-code lint passes do not clear the three prior generatedThree whole-lint errors; whole lint was not rerun. The original 76-file result remains 3590/9/4, not a full pass. All eight timeout identities remain documented; only the two tests in the targeted file were rerun and still fail. Prior U12 full218-file evidence and separate corrections are preserved. AFTER browser, physical phone, audio, PWA/offline, real practice/SRS/rewards and production release remain pending or untested. No push/deployment occurred. LV3 batch release remains held.

- Seventeen rare/mixed-sense questions remain for cast, doughnut, wipe, spin, reputation, boredom, passionate, romantic, scar, boring, bridegroom/groom, suggest, rush, arouse, present, scream and jet; full details remain in u13-source/general/retained-pending-v1.json.
- The pimple note headed console/consolation remains a possible misattachment; no replacement ID was invented. Reputation/repute cross-word information is retained.
- All 19 null IDs, original review labels and read_only modes remain. Designer purse has no printed POS abbreviation. No new sentences, formal senses or textbook practice content were invented.
- General die campfire and plot land illustrations retain their general meanings; they do not depict textbook dice/story meanings. No artwork, caption, mapping, image-question approval or media status was changed.
- Rotate and reputation retain missing English captions. Heal retains its literal-backslash caption issue.
- Phonetics, syllables, stress and historical exam provenance remain unverified. Excel staging/page inconsistencies remain historical source questions, with workbook unchanged.

## Evidence

U13-technical.json records exact counts and identities. Full original evidence: output/lv3-audit-20261107/u13-technical-preparation/execution-v1/. Follow-up: technical-testonly-v2/ with discovery, full results, stdout/stderr, compilation, lint and integrity.json. U13-application.json and U13-application-review.md remain unchanged phase records.
