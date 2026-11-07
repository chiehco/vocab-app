# LV3 U04 fixture validation

## Result

Passed. This report covers isolated operating-system TEMP fixtures only. U04 has not been applied to the working product tree by these checks. All 144 working-tree input files remained byte-for-byte unchanged.

- Sealed manifest SHA-256: `cbd33aa366048230b645bb45560892bc50380704f6b0273f275631ce9c465074`.
- Scope SHA-256: `0575157cd1dc8e8fbea93eaef080f77ce9bbe54c4afbeb5f619cd5fd0d6253e9`.
- Independent capture raw SHA-256: `50472e9e8264a2b9a204563c4fadc90147ef2df9eed5a9c028a3dcecb6ed34f4`.
- 173 reviewed fields in 79 rows: 16 examples, 26 curriculum items, 34 words, and 3 notes.
- Four source JSON files plus metadata and study pack: six affected physical files.

## Executed checks

1. Real Python fixture suite: **9/9 passed**, 530.902 seconds. The fixture begins with strict projection of the real chain to U02 and comparison against every independently captured before hash, not a capture fabricated from the manifest.
2. Final harness artifact/receipt checks: **2/2 passed**, 249.918 seconds. The second replace is deliberately failed; every input returns to its original raw bytes. Receipt state, manifest identity, six file identities, and all before/after receipt hashes are verified.
3. TypeScript/Python parity: **1/1 passed**, 2.97 seconds. Every full document and all 79 rows agree forward and inverse; all six published files match normalized raw before/after hashes. Unknown extra raw bytes are rejected.
4. Existing small manifest-builder tests: **10/10 passed**. Existing small Python pipeline tests: **13/13 passed**.
5. Existing focused TypeScript pipeline: **12/12 passed**. The new parity test without opt-in: **1 explicitly skipped**, as intended.

The real fixture suite additionally verifies dry-run zero writes; exactly six apply writes with each file replaced once; exact source and rebuilt metadata/pack after hashes; idempotent zero writes; unknown row, changed-file raw bytes, unchanged input bytes, and input-domain drift rejection; pending receipt and lock rejection; U04-to-U02 restoration of all 144 normalized input byte sequences; and U04-to-U02-to-U01 restoration of all 144 anchor hashes, all original 137 unchanged-input guards, and the U01 dataset after hashes. The real registered builder is copied, hash-checked, and executed against actual U04 source kinds during staging and historical projection.

## Reusable validation entry points

- `scripts/verify_lv3_unit_fixture.py --unit U04 --capture output/playwright/lv3-u04/independent-before-input-hashes.json`
- `LV3_UNIT_FIXTURE_PARITY=U04` with Vitest selecting `src/features/direct/lv3UnitFixtureParity.test.ts`.

The Python runner requires an independently captured artifact and its sealed summary. It is explicitly invoked, not default discovery. The TypeScript parity check is explicitly opt-in; ordinary CI does not fabricate missing capture or applied artifacts. No existing default test coverage, U01/U02 manifest, scope, expected hash, or timeout was weakened or changed.

Current Python harness reuse assumes six affected files including changed `examples.json` and untouched `senses.json`, because those two inherited checks have that shape. A unit with a different shape needs those checks adapted before support can be claimed. Source snapshots stay outside the repository; only the six applied JSON artifacts and validation evidence are retained in output.

## Evidence and scope limits

Evidence directory: `output/lv3-audit-20261107/u04-validation/`.

- Original logs: `fixture-first-run.log`, `fixture-artifacts-and-receipt.log`, `typescript-parity-first-run.log`, `builder-focused.log`, `pipeline-focused.log`, `typescript-focused-default.log`.
- Machine-readable results: `python-real-fixture-results.json`, `python-focused-rerun-results.json`, `python-parity.json`, `typescript-parity.json`, `checkpoint-projection.json`.

No test failure occurred in these runs; first-run logs are retained. No full Vitest, forced whole-project TypeScript check, lint, production build, product-tree U04 application, push, deployment, or physical-phone validation is claimed here. Actual application and after-state checks are separate gates.
