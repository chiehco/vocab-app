# LV3 U09 technical validation

Product checkpoint: `1924863ef26b2d0e8cd1726880f72cc0fa2efce2`. All 144 product inputs remained byte-identical during this validation. Only four test files changed; source JSON, existing audit seals, image proof, and product data were preserved. No commit, push, or deployment was performed.

## Test results and retained failures

- The first focused run covered 36 files and 469 tests: 465 passed and four failed (274.781 seconds). Full logs and JSON results are retained.
- Two historical integration assertions expected only U02/U04/U05/U06 changes. The authenticated local audit chain also contains U07/U08/U09. The correction adds those exact paths, preserving the original 131-file domain, checkpoint hash and negative guards; 124 files remain unchanged. The corrected full file passed 5/5.
- U01 and U05 each hit the unchanged 5000 ms limit (5791.379/5263.367 ms). One unchanged full-file rerun each also timed out (5491.161 and 5113.459 ms); these failures are retained. No further unchanged reruns were performed.
- U01 now reuses the same fully authenticated immutable raw projection within its synchronous test. U05 projects all six complete raw files once, checks all six original byte hashes, parses the same four source documents, checks their complete semantic target hashes, and retains every original 56-row/146-field assertion. No shared helper, dataset, assertion, test partition, or timeout was weakened. The updated full files passed U01 7/7 and U05 2/2; the formerly timed-out tests took 3245.493 and 4078.950 ms.
- The other 33 passing files retain valid evidence because their code and product dependencies did not change. These combined records cover all 469 selected tests; they are not a single all-green rerun or a full-project Vitest pass.
- U09/U10 full-pack fresh installs passed in 3462.372/2767.158 ms. The complete starter update retained progress, settings and personal groups in 3720.373 ms. Both original install/update bodies and their 5000 ms limit are unchanged.

The U09 suite retains original source/provenance assertions and the historical 84 siege clues through complete-document authentication and exact U08 projection. Current runtime coverage independently verifies all 103 siege rows, 24 reviewed supplements, 27 null IDs, protected grammar qualifications, France's factual correction, verb-form limits, retained rare senses and all four notes. Unknown changes to metadata, untouched rows, ordering and reviewed fields are rejected. Historical siege tests restore and verify the original runtime object/array identity and complete document.

## Compile, lint and build

- Forced TypeScript compilation (`tsc -b --force --noEmit`): passed in 55.907 seconds.
- All four changed tests: focused lint passed with no diagnostics. `git diff --check` passed.
- Whole-project lint exited zero in 4.265 seconds, with 1035 warnings across 863 files: 1029 warnings in generated/research output and 6 in repository scripts. No warnings were suppressed. No old-baseline comparison was performed, so these are not labelled pre-existing. Script locations: scripts/save_u25_audit_checkpoint.mjs:20:16; scripts/prepare_lv2_u40_audit_manifest.mjs:7:429; scripts/prepare_lv2_u39_audit_manifest.mjs:7:429; scripts/save_u16_audit_checkpoint.mjs:10:93; scripts/prepare_lv2_u29_audit_manifest.mjs:7:96; scripts/prepare_lv2_u29_audit_manifest.mjs:79:85.
- One production build completed in 90.687 seconds, with 268 PWA precache entries. Plugin-timing and large-chunk warnings are retained. The output is local and was not deployed.

## Product and artifact integrity

All four complete source documents match the independently prepared expected-after data (394 fields/183 rows). The starter contains exactly 34 changed words, 18 examples and four notes: 56 rows/120 fields. All 1128 starter media records and every other starter collection remain unchanged.

All five built JSON copies (`words`, `examples`, `notes`, `meta`, `sa-pack`) match the product bytes. Both original and replacement persuasive assets match their recorded hashes. The built bundle contains the exact new registry row, asset path and bilingual captions. The 161 persuasive tests passed, including the complete 144-file U09-to-U08 projection and the two text-only textbook consumers. Image proof and original captions were not rewritten.

The 4964-file protection inventory found only the four authorized test changes. The 23 prior guard dependencies remain byte-identical. The pure guard portion of the recorded 608 TypeScript scope/guard checks, plus the 593-case Python matrix, 16 smoke and 27 fixture checks, was reused. Tests that read the current chain or product files were run again. Expensive transaction/rollback/parity/ancestor validation was not repeated. A preparatory message/hash transcription error stopped before source edits or tests; its diagnostic and unchanged-input verification remain preserved separately.

Evidence: `output/lv3-audit-20261107/u09-final-technical-20261108/`, including `FINAL-REPORT.json`, `final-integrity.json`, `product-build-verification.json`, `guard-dependency-reuse.json`, lint diagnostics, exact commands and every execution log. Hashes in these records are read directly from files.

Limits: no browser AFTER validation, physical phone testing, complete offline matrix, real-user database changes, or publication was performed in this phase.
