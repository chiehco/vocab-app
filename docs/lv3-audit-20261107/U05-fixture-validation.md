# LV3 U05 fixture validation

## Result

Passed on 2026-11-07 UTC. This report covers isolated operating-system TEMP fixtures only. U05 remains prepared and unapplied in the working product tree. All 144 repository inputs remained byte-for-byte unchanged throughout the Python run; the final pre-application check also matches all 144 independently captured normalized input hashes.

- Sealed manifest SHA-256: `f7ad8f7a18f1b52eeb0be70ae233648de464032ed4819ad7f42cc9f6dc84de77`.
- Scope SHA-256: `a7311a6598b6531f4aaa500bd97ffd7efdfed134445ec6f2da5b7919d4b97d08`.
- Independent capture raw SHA-256: `2ebcd83c539265f482304609f1cc60f9d001362e0198008c7df2f8a765289fd9`.
- Parent U04 manifest SHA-256: `cbd33aa366048230b645bb45560892bc50380704f6b0273f275631ce9c465074`.
- 146 reviewed fields in 56 rows: 4 examples, 25 curriculum items, 4 notes, and 23 words.
- Six affected physical files: four source JSON files plus metadata and study pack. Senses remain unchanged.

## Executed checks

1. Real Python fixture suite: **9/9 passed**, 602.123 seconds. Setup projects the real committed chain to U04 and compares every one of the 144 inputs against the independently captured before map. The capture is not synthesized from the manifest.
2. TypeScript/Python parity: **1/1 passed**, 1.57 seconds total. All 56 rows and complete source documents agree forward and inverse. All six published files match normalized before/after byte hashes; an extra unknown raw byte is rejected for each file.
3. Final pre-application integrity: **passed**. All 144 normalized input hashes and both seals match; U05 chain status is prepared, product state is before, and no pending receipt or lock exists.

The Python suite verifies dry-run zero writes, exactly six apply writes with one replacement per affected file, exact source and rebuilt metadata/pack after hashes, idempotent zero writes, and deliberate failure of the second replacement with restoration of every input's original raw bytes. The rolled-back receipt state, manifest identity, six file identities, and all before/after receipt hashes are checked.

Failure-closed coverage includes an unknown unpatched row, changed source-file raw bytes, unchanged-input bytes, input-domain drift, pending receipt, lock, and unknown bytes supplied to an after-state checkpoint caller. The real registered builder is copied, hash-checked, and executed during staging and historical projection.

U05-to-U04 projection restores all 144 normalized input byte sequences. U05-to-U01 projection restores all original 137 unchanged-input guards, all 144 anchor hashes, and the U01 dataset after hashes. Every inverse step also validates its historical before/after input guards, including U02; this is not merely an endpoint comparison.

## Reproduction and evidence

Run explicitly from the audited worktree with the existing compatible Python audit dependencies available:

```powershell
python scripts/verify_lv3_unit_fixture.py --unit U05 --capture output/playwright/lv3-u05/independent-before-input-hashes.json
$env:LV3_UNIT_FIXTURE_PARITY='U05'
node node_modules/vitest/vitest.mjs run src/features/direct/lv3UnitFixtureParity.test.ts --maxWorkers=1
```

Evidence directory: `output/lv3-audit-20261107/u05-validation/`.

- Original logs: `fixture-first-run.log`, `typescript-parity-first-run.log`, `final-preapply-integrity.log`.
- Machine-readable results: `python-real-fixture-results.json`, `python-parity.json`, `checkpoint-projection.json`, `typescript-parity.json`, `final-preapply-integrity.json`.
- The six applied fixture JSON artifacts are retained under `applied-fixture/`. No copied test-source tree was placed inside repository output.

No test failure occurred in these validation runs. The earlier preparation failure remains separately preserved in `output/lv3-audit-20261107/u05-preparation-first-failure.txt`; successful fixture validation does not erase or reclassify that earlier builder rejection.

The existing opt-in Python runner and TypeScript parity test were reused unchanged. No generic guard, manifest, scope, expected hash, timeout, builder, pack count, or product input was changed for validation. No dependencies were downloaded.

## Scope limits

This is a pre-application fixture gate, not actual-after acceptance. No main product application, full test suite, compiler, lint, production build, commit, push, deployment, or phone validation was performed by these validation commands. Browser/runtime evidence and starter-media migration remain separate. Actual U05 application and after-state checks require their own subsequent evidence.
