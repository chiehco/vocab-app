# U16 / pride integration checkpoint — 2026-11-18

- Base: main `11dbdd1b9ef66978b17a2bf3afa380212f009947` (includes PR #58).
- Candidate: `fe712c8`, containing LV1 U16 guess/lake/pond and LV2 pride.
- Merged in an isolated checkout without conflicts. PR #58 files are preserved.
- No dictionary sentences, workbook, review statuses, or user progress were changed.
- Actual image pixels were inspected again: scientists speculating about ancient temple construction (thought bubble), picnic beside lake, feeding ducks at park pond, grandmother proud of garden. All support their registered captions; the thought bubble is visualization, not a factual claim about construction history.
- Assets decoded successfully; hashes are in assets.json.

## This integration's checks
- Typecheck: PASS.
- Lint: PASS.
- Focused registry/source/SSR: 4 files, 8 tests PASS.
- Unit audit Python guards: 104 tests PASS.
- Production build: PASS (existing large-chunk warning).
- Full 15-second suite: PASS. 301 files passed, 3 skipped; 6,587 tests passed, 4 skipped. Duration 1,404.14 seconds. Followed by another successful production build.
- Default 5-second full suite: not run locally at this checkpoint; remote CI required.
- Browser display/reopen: NOT PASSED. Local Vite served on 127.0.0.1:5198, but the cloud browser returned ERR_CONNECTION_REFUSED. This is not a Windows safety bypass and not a successful screen test.
- Actual phone, normal update and offline continuation: NOT VERIFIED.
- Windows original-image comparison: NOT VERIFIED.

This is an integration candidate, not a production release or whole-unit completion. Do not merge to main until remaining applicable checks are resolved. Original validation receipts are kept unchanged as historical evidence.

## Remote checkpoint
The integration was saved to GitHub as `9559de5b96e8952a8076c0c6d1fd76a27eb2271d`; the tree matches the locally tested merge. CI run 44237119291 started for this commit. This documentation-only follow-up does not change application code or assets. The CLI push had no configured GitHub credentials; the connected GitHub API was used, and the remote ref was verified.
