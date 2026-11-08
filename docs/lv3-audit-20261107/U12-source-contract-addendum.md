# U12 source-contract addendum

Local-only LV3 audit. This document does not authorize publication or new artwork.

## Narrow compatibility changes

The original U12 curriculum has 182 unique page-based IDs, not the V/G three-digit namespace used by preceding units. Rewriting these IDs would invalidate existing references. The Python and TypeScript guards now admit only U12's original ordered (learningItemId, kind, sourcePage) matrix, SHA256 9db01d5dc830b3fa779690e87dd99f8520994691283f941aea60f28ab43271da. Template, unit and path checks remain. Source-reviewed text fields may change through the complete manifest/scope/evidence guard. Other units retain their original namespace contract.

The one U12 pattern correction, LI-LV3U12-P126-G5f07b0a1c417, admits only the exact complete before row, pattern and explanation after fields, reason, sources and field evidence frozen in the source-reviewed proposal. The revised pattern is shake one's fist (at sb). The Chinese explanation preserves the original textbook wording difference. Missing or altered evidence, single-field partial changes, extra fields, another unit or another row do not receive this exception. No generic pattern-edit permission was added.

The real fixture registers U12's exact three source files (curriculum, words, examples) and two generated files (meta, sa-pack). Notes, senses and media remain unchanged; the old units' fixture shapes are unchanged.

## Evidence and regressions

Output package: output/lv3-audit-20261107/u12-integration/identity-proof-v1.

- Identity regressions: 203 shared cases plus TypeScript path/other-unit controls; 204 TypeScript tests passed. Python checks the shared cases and original namespace controls.
- Pattern regressions: 80 shared cases exercise every scalar leaf, missing top-level fields, missing pattern/explanation or evidence, null evidence, extra source/field, wrong unit and key-order equivalence. Python 80/80 and TypeScript 80/80 passed against the candidate helpers. Valid cases project forward and inverse against the complete original 182-item curriculum.
- The first pattern harness run exposed missing-field envelope construction and expected key-order reconstruction errors in the test harness. These were corrected without changing the validator; original failure logs are retained. The second run passed all cases. No assertions or cases were removed and no timeouts increased.
- Exact candidate file index: candidate-integration-index-v1.json; original helper bytes retained in main-helper-originals, integration receipt in main-helper-integration-receipt.json.
- Source candidate and full expected documents were independently reviewed by another coordinator. The incorrectly named v1 Node hashes were preserved and corrected in independent-expected-after-v2.json; see the source hash addendum. No value changes resulted from that correction.

These are helper/candidate checks only, not a substitute for the full nine-method fixture, parity, ancestor projections, technical tests or AFTER browser acceptance. Those outcomes are recorded separately. Existing timeout, lint, source uncertainty and device/release blockers remain in force.