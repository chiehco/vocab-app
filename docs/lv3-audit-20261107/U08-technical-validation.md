# LV3 U08 technical validation

Validated product checkpoint: 3c0ee294ecd03091a7560e389307afb52c34c6a9. All 144 product inputs remained unchanged throughout this technical phase. Only lv3Unit78Text.test.ts changed.

## Results

- Final focused tests: 17 files, 277/277 passed.
- Full-pack fresh installs: U07 3247 ms, U08 3107 ms. Full starter update with progress and personal-group retention: 4109 ms. Original 5000 ms limits and complete install/update test bodies remain unchanged.
- Final forced project TypeScript compilation without emit: passed after the test edit, 62.952 seconds.
- Final changed-test lint: passed with zero warnings. git diff --check passed.
- Production build into a dedicated local output directory: passed, 79.262 seconds, 268 PWA precache entries. The four published JSON data copies match the product files byte for byte. Plugin-timing and large-chunk diagnostics are retained; the build was not deployed.
- All validation processes had finished before the browser handoff.

## Retained first result and test correction

The first unchanged-test run completed with 274 passes and one failure. It still expected U08 historical existing_dictionary provenance after the reviewed correction to textbook_source_review. No timeout or product failure was observed. Its full exit-1 log remains preserved.

The test repair strictly authenticates the complete current U08 document, including metadata and all runtime items, then projects it to the U07 checkpoint for historical assertions. Original expectations and source JSON remain intact. Current data still drives the unchanged full-pack install and update tests.

New tests verify the actual fuel correction, protect provenance, all 14 reviewed unmapped supplements, native/unique/indigenous explanations, rare morale meaning, fuel spelling variants, trusted Oxford discomfort forms, cattle usage and ad noun POS. Unknown changes to reviewed and unmodified rows, provenance, explanations or template metadata are rejected. U07 correction/drift tests remain unchanged.

## Lint warnings and limitations

Whole-project lint exited 0 with 786 warnings across 661 files: 780 warnings in generated/research output files and six warnings in five repository scripts. No older-baseline comparison was made, so these are not labelled pre-existing. The script locations are save_u25_audit_checkpoint.mjs:20:16; save_u16_audit_checkpoint.mjs:10:93; prepare_lv2_u40_audit_manifest.mjs:7:429; prepare_lv2_u39_audit_manifest.mjs:7:429; and prepare_lv2_u29_audit_manifest.mjs:7:96,79:85. No warning was suppressed or unrelated source changed. Full lint ran before the test-only edit; final focused lint covers that edit.

This is a focused test pass, not full-project Vitest. Browser AFTER verification, physical devices, full offline coverage and production release were not performed in this phase. Earlier transaction/rollback/parity/ancestor checks were not redundantly rerun.

Evidence: output/lv3-audit-20261107/u08-final-technical-20261108/. FINAL-REPORT.md, focused-files.json, final-integrity.json, lint-warnings.json and execution logs preserve exact scope, commands, outcomes and warnings. The 2718-file protection check found only the approved test changed. An initial UTF-8 setup decoding issue occurred before tests started and is recorded separately from test results.
