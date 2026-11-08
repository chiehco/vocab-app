# U12 technical validation

Technical work is complete with release blockers retained. Runtime AFTER is still pending. No push or deployment.

## Original full affected-scope run

At application commit a71e8c1562994858d3133264f20549c2ab7ce57d, discovery and actual execution matched exactly 218 files. This is a conservative affected scope, not the full project. Result: 3521 tests = 3507 passed, 10 failed and four original opt-in skips. The original report remains unchanged.

All 13 Python regression modules passed 1176 methods; parameterized identity subtests were not counted as extra methods. TypeScript compilation and diff checks passed. U12 guard tests passed 284/284, lv123MainIntegration 3/3 and U56 10/10. The old U56/puppet intermittent history is not declared resolved.

Six failures retain the unchanged 5000ms performance gate:

- db whole-pack: 8233.0396ms.
- db caller invariance: 6726.8668ms.
- LV2 U48 exact operations: 5771.1746ms.
- U05 six published files: 6679.5518ms.
- LV4 notes all datasets: 11595.162ms.
- Puppet repair: 6701.0763ms.

Whole lint failed on three retained generated Three.js useMultisampledRTT hook errors in U09, U10 and U11 production-dist assets. This observed run preceded the new U12 build. It was not replaced by a scoped-lint claim and no retained output was deleted or excluded to hide errors.

## Four historical-assertion corrections

The other four failures were obsolete historical assertions, not extra product drift. The recovered integration test still listed nine changed direct JSON files and 122 unchanged files; the sealed U12 step makes those exact counts ten and 121 within the same complete 131-file domain. Two recovered tests also compared current U12 items directly to the preserved pre-audit draft.

The test-only correction adds one U12-specific support helper and changes the two actual consumer test files. Every call reads the entire current source, checks all caller items against it, then invokes the existing strict published inverse to U11 and verifies an independently recorded original LF hash. The historical draft comparisons remain complete. Current installed/pack equality, U18/U21 comparisons and old negative cases remain; U12 raw/content drift and caller mutation negatives were added. No production file, shared audit helper, timeout, assertion coverage, data set or freshness check was weakened.

Original U12 bytes are CRLF: 90124 bytes and 2736 CRLF sequences, raw SHA256 41dd99db99db60b33190993f6e30ea7205be4b3c8cff35d8fc0279fc4ddc34fe. The independently verified normalized-LF SHA256 is 70e236bc4322124a25d05ba757d0b9d38b02046bf6e2d56d7591d55251ec14ef. A zero before-fixture count means the normalized publication can be regenerated; it does not mean the original file was LF. The helper uses the correct LF constant, checked against both original bytes and BEFORE capture, not a hash derived from projection output.

## Test-only follow-up

Both complete consumer files were uniquely discovered with output candidates excluded and ran without dropping cases: 16/16 passed, no skips/timeouts, slowest 4087.7821ms under the original 5000ms. TypeScript compilation, the three changed files' lint and diff checks passed. This is not a second 218-file run. The original 3507/10/4 result remains the full-run evidence; its six timeout cases and whole lint were not rerun.

All 144 product inputs retained raw and LF hashes across the test-only change. The original 4999 protected pins matched except the explicitly reviewed test changes. Build succeeded and all 2405 files were sealed, including full AST equality of compiled U12, six complete source documents and seven public-data byte comparisons. All build bytes and full compiled U12 were reverified after the test-only correction; runtime sources did not change.

## Evidence

- U12-technical.json: structured results and limits.
- output/lv3-audit-20261107/u12-technical-execution-v1/: original full run, failures, lint, build and 4999 input pins. Artifact index SHA256 586ed1e230b9d0ad8cee76547f1472dbfa8609ad43be0f949d24ea8a18acff09.
- output/lv3-audit-20261107/u12-failure-analysis-new/: independent attribution, original-byte/LF proof and preserved candidate versions.
- output/lv3-audit-20261107/u12-technical-testonly-v2/: two-file follow-up and unchanged product/build proof. Artifact index SHA256 4e4508f5bdd42062229e45d2f31c8c6365285c2450da9a5c9803aa1c2a7677fb.

All source questions and earlier release blockers remain recorded. No full-project Vitest, phone, audio, PWA/offline, practice/SRS/reward or production release acceptance is claimed. AFTER browser work starts only after this technical state is committed and fixed.