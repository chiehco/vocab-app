# LV3 U07 exact pattern guard validation

Status: guard implementation validated; U07 content remains unapplied. No build, full real-fixture run, browser recapture, commit or publication was performed in this validation window.

## Scope

The new Python and TypeScript guards permit only curriculum LI-LV3U07-G036 at p69 in LV3-U07. The complete before row, collection/path/key/ID and both exact after fields are required: the corrected `crop, cropped, cropped` pattern and its explicit original-book `copped` erratum explanation. Unknown/missing row fields, extra after fields, protected statuses/IDs and other grammar patterns remain rejected. Explanation-only edits still use the existing general grammar rule.

The same pattern-field evidence record must contain the reviewed textbook photo (`20260815_092552.jpg`, p69, exact SHA256, `pixelsViewed: true`, original printed forms) and the direct Collins crop entry with the recorded retrieval and complete word-form evidence. A source marker, evidence on another field, split findings, invented viewing flag or mismatched dictionary entry cannot enable the exception. Existing U06 and wage rules were not changed. Source/import data and the U07 curriculum were not edited.

## Checks

- Python U07/U06/wage/compiler checks: 161/161 passed on the final run, exit 0, 55.84 seconds. U07 has 92 shared cases; each tests the exact guard and real manifest validator with recomputed row/scope hashes.
- TypeScript U07/U06/wage checks: 181/181 passed across three files, exit 0, 1.68 seconds. One worker; existing timeouts unchanged.
- Forced whole-project TypeScript: `tsc -b --force --noEmit`, exit 0, 55.48 seconds.
- Focused oxlint: both changed TypeScript files, 103 rules, no diagnostics, exit 0. Python AST checks cover both Python files; JSON parsing confirms all 92 fixture cases.
- Working-tree whitespace check passed. No skips, timeout changes, cache invalidation, contract loosening or hash bypass was used.

## First-run history

The initial Python run passed 160 of 161 tests. The new `no_field_evidence` case expected `Disallowed after field`, but validation correctly rejected it earlier as `Missing curriculum field source`. Only that case's Python and matching TypeScript expected error text was corrected. Its invalid/guard-rejection expectations were retained; guard logic and source evidence were unchanged. The original fixture, preparation manifest, patch and failed run's complete stdout/stderr/exit/timing records remain retained separately. The unchanged full focused Python selection was rerun successfully.

Original fixture raw SHA256: `dbd740bee2b667fe7ff199c26a5a608f2028c86a39e6c3f5f97313b18f7dcf80`.
Final fixture raw SHA256: `c2e5e71eaf829e4bb731983f5be92500ee0ca9884aa93d9f985a38844c8fff17`.

## Preservation

Independent reads before application and after validation confirmed all 144 protected pipeline inputs unchanged in byte count, raw SHA256 and CRLF-to-LF SHA256. All 804 sealed U07 before-evidence files and the before QA report remained unchanged. Both existing U07 proposal files and the U06/wage/compiler/source reference files also retained their raw hashes.

Before-evidence index SHA256: `90d70213941e3defa38d58fa346f7462b8197826ff88572fae609a87f09856d6`.
Final before-verification v2 SHA256: `cdc63c9817816a3a45132e65c9d66e92f4d5bf87ba3506fffd228ac942c2659e`.

This validates the bounded guard, not the later U07 content compiler/application, full real-fixture pipeline, complete app suite or deployment. Those remain separate release gates.

Validation execution logs, result and integrity summaries, and original preparation archives: `output/lv3-audit-20261107/u07-pattern-guard-validation/`.
