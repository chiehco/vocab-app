# LV3 U10 technical validation

Checkpoint: `6ff08e87fc63774ac26a0f0e8619b476fdc51a56`. This phase changed only `lv3Unit910Text.test.ts` and `recoveredUnitIntegration.test.ts`. All 144 product inputs retained their exact raw bytes, LF hashes and lengths. No commit, push, deployment or real-user database operation was performed.

## Results and blockers

The complete selected run covered 36 files and 488 tests in 317.859 seconds: 485 passed and three timed out at the unchanged 5000 ms limit. This is not a full-project Vitest run or an all-green result.

- `lv3Unit56Text.test.ts`: starter update took 5037.597 ms. One authorized unchanged full-file isolated rerun passed 8/10; the U06 fresh install and starter update timed out at 5006.334/5007.009 ms. Both runs are retained. No further unchanged retry was made.
- `lv3Unit6Audit.test.ts`: six-file raw authentication and 31 starter rows took 5628.411 ms. A separately stored candidate reuses the same already authenticated complete raw pack instead of projecting it twice. It preserves all six byte hashes and every original assertion, and adds a fixed complete pack semantic anchor from the authenticated U07-before raw backup. That candidate is not applied or tested; parent review is pending.
- `lv3PuppetImageRepair.test.ts`: proof/asset/historical guard test took 5487.570 ms. One authorized unchanged full-file isolated rerun passed 2/3, with the same test timing out at 5794.338 ms. All guards and original inputs remain intact; no further retry was made.

Both modified files passed in the first complete selected run. The U09/U10 fresh installs and complete starter update retain their original bodies, all 75 existing expect lines and the original 5-second limits. U10 validation binds all 407 fields, 166 complete rows and three complete documents to source-independent expectations; all per-field source arrays and all 13 explicit verb-form sources are checked. Unknown whole-document and raw-pack drift is rejected. Shared words/examples/pack are strictly projected to the sealed U10 checkpoint for later-unit compatibility. U10 curriculum and siege remain current-runtime assertions. The independently derived current U10 siege contains 122 exact rows; historical U10 98 and U09 historical 84/current 103 are retained.

## Compilation, lint and build

- Forced TypeScript `tsc -b --force --noEmit` passed in 78.703 seconds.
- Both modified files passed focused lint with zero diagnostics; `git diff --check` passed.
- Original whole lint exited 1: 4505 warnings and one React hooks error in the retained U09 generated `production-dist/assets/createTownScene-ClS0rRm4.js` bundle. This failure and all diagnostics remain preserved; no evidence was deleted or lint configuration changed.
- A separately named `retained-build-artifacts-excluded-lint` passed with CLI exclusions for only the precise U09 and U10 retained `production-dist/**` directories. It reported 1244 warnings: 1238 in research/generated output and six in repository scripts. No baseline comparison established these warnings as pre-existing, and this scoped result does not turn the original whole-lint failure into a pass.
- One isolated production build passed in 89.281 seconds. Existing plugin/chunk warnings are retained. Five built JSON files (`words`, `examples`, `notes`, `meta`, `sa-pack`) are byte-identical to product files. Both original/replacement persuasive assets and the exact registry path, bilingual captions and identifiers in the bundle match their proof.

## Integrity and evidence reuse

Three full source documents match the independent expected-after documents. Starter changes are exactly 26 word rows/61 fields and 11 example rows/22 fields: 37 rows/83 fields. Starter identities/order, all other collections and all 1128 media records are unchanged. The 4975-file protected inventory permits only the two reviewed test edits. U09/U10 existing seals and stages, images, registry, captions and all other scanned source code remain unchanged. Source review and BEFORE checks cover 142 source artifacts, three source documents, 918 BEFORE files and two external BEFORE documents.

Of the previous 23 guard dependencies, 21 are unchanged. The two fixture registration files are intentionally updated and match their separately recorded 33 passing small tests; the old blanket 23-unchanged claim is not reused. Current-chain consumers were included in this run. Previously completed nine TEMP transactions, parity, 1296 ancestor LF checks and raw backup validation were not repeated.

Evidence: `output/lv3-audit-20261107/u10-final-technical-20261108/`, including exact commands, all run status/stdout/stderr/JSON, original test copies and diffs, complete protection inventory, source seals, compiler compatibility, lint classifications, build verification and the unapplied U06 candidate. `FINAL-REPORT.json` retains the failed runs and exact durations; `artifact-index.json` lists file hashes.

Remaining: resolve the retained performance blockers before describing technical validation as passing. Browser AFTER, physical phone, production PWA/offline checks and publication were not part of this phase.
