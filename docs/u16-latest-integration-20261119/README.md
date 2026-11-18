# Four-image integration onto latest main

## Scope and preservation

- Candidate: `55aed403f8b27a4c1e0b55711dc35dba643f82aa`.
- Incoming main: `8a227fc3a6d98213ec91dc529a8d2aa772611efb`.
- Isolated branch: `integration/u16-latest-20261119`.
- LV1 U16 guess / lake / pond and LV2 pride image assets and registry entries are unchanged from the candidate.
- LV3 U20 import image, approved card, VocabularyScreen behavior and its direct tests are byte-identical to incoming main. No textbook sentence, review status, dictionary data or progress data was changed.
- The registry merged additively. The only merge conflict was historical source-proof test support. An exact-hash reversible layer now removes the verified U20 addition before traversing the existing LV1 / pride / U16 historical layers. Historical proof files are untouched. Mutation tests reject unrecorded bytes.

## Checks

- Initial default-heap typecheck failed with JavaScript heap out of memory. A process-local `NODE_OPTIONS=--max-old-space-size=4096` retry passed. This is not a product setting change.
- Typecheck and lint passed before final test-helper mutation coverage was added.
- Focused six files / 17 tests passed.
- Python unit audit guards: 104 tests passed.
- Final typecheck and lint: PASS.
- Final full 15-second suite: 302 files passed, 3 skipped; 6,589 tests passed, 4 skipped; 1,503.87 seconds.
- Final production build: PASS, existing large-chunk/plugin timing warnings.
- Default 5-second full suite and remote CI for this integration: NOT RUN.
- Exit receipts are zero; logs are retained in this directory.
- `git diff --check`: passed.

## Not completed

Browser reopening, normal update, offline continuation, physical phone acceptance and Windows source-image comparison are NOT verified by this integration. Historical cloud preview failure was ERR_CONNECTION_REFUSED. Do not treat unit tests or build as browser acceptance.

No production publication has been performed. Resume by checking final receipts, then provide an accessible approved preview and reopen the four cards plus import to verify the combined behavior. Preserve the original candidate and current main; never overwrite current main with an older whole-file snapshot.

## Follow-up browser regression
- At a 375×812 viewport, press Next card ten times and check that no scroll is needed to reach the control. Record this as simulated viewport acceptance, separately from physical-phone acceptance. Not yet run here.
