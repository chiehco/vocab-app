# Starter media: TypeScript real-checkpoint validation

## Current status

Candidate TypeScript validation passed. The real committed-checkpoint integration test also passed, but the wider focused guard run failed and is not accepted as a final pass. Python TEMP validation is not TypeScript validation, and candidate fixtures are not evidence of an applied main checkout.

## Sealed inputs

- Descriptor canonical SHA-256: `88ba19b48f296fc26b7abdac6468bc1dc26f474523ac78b309aabfed0456578b`.
- U05 parent manifest: `f7ad8f7a18f1b52eeb0be70ae233648de464032ed4819ad7f42cc9f6dc84de77`.
- Original 144-input capture raw SHA-256: `1c0cacb817f9a4b8bb268cd7ab3fd7b6555efe89edc49e80222f659348a38fc8`.
- Existing Python evidence: `output/lv3-audit-20261107/starter-media-real-validation-20261108-qa-final/`.

## Execution contract

Test: `src/features/direct/starterMediaRealCheckpoint.test.ts`.

Set `LV3_REAL_MEDIA_STATE=candidate` only after registration. This state requires a prepared migration and the original 144 current input hashes. After-fixture bytes are explicitly candidates. It checks that neither the prepared checkpoint nor candidate after-pack bytes can be presented as published U05 output.

Set `LV3_REAL_MEDIA_STATE=committed` only after the two-file application and committed-chain promotion. When migration is the current committed tip, this state requires all 144 current raw and normalized after hashes, including the 142 unchanged inputs. If later ordinary units have been committed, their changed paths are projected back to the migration checkpoint before checking its 144 normalized after hashes. Raw current-tip verification is explicitly reported separately.

For U05, U04, U02 and U01, the validated chain determines the exact union of later changed paths (ordinary file guards and derived files, plus the migration's fixed two paths). Those paths use the actual published-text helper. The remaining paths retain their current LF bytes because the validated chain proves no intervening change. All 144 resulting hashes are compared with both the recorded Python normalized projections and the original guards reconstructed from the authenticated chain. An unchanged-path helper positive control runs for each target.

Both modes authenticate the descriptor, four raw fixtures, exact source selection and ordered delta, 746-to-1128 media counts, and 316 approved / 52 draft / 14 needs-redraw added rows. The two changed paths use the actual raw/LF inverse APIs. All 142 unchanged paths must have equal before/after guards and retain their bytes; an unchanged-path API positive control also runs. Complete 144-entry inverse maps are compared against the capture and Python evidence. Changed after bytes and unchanged-source drift are rejected. This is complete map coverage with actual changed-path API inversions, not a claim of 144 API calls.

## Boundaries

- Raw forensic migration restoration and LF-normalized published historical restoration are separate claims. Published-text results are compared with Python's normalized projection maps, not mislabeled as raw historical bytes.
- No synthetic suite or full-project suite is implied by this focused test.
- No browser, phone, offline, publication or deployment result is implied.
- Final typed code still requires compilation. Test execution and compilation logs will be retained without overwriting failed attempts.

## Results

- Initial candidate attempt: the real candidate test passed, but two prepared-checkpoint cases failed because their mocked chain retained a migration whose predecessor had been marked prepared. The overall attempt failed. Log: `output/lv3-audit-20261107/starter-media-ts-candidate/run-20261108-022751.log` (301.20 seconds). This log remains unchanged.
- The prepared-checkpoint negative test now isolates the real prefix ending at its selected target, so the intended uncommitted-target assertion is reached without an unrelated invalid migration predecessor. Tail identity explicitly discriminates ordinary units from migrations. Current-tail positive controls remain.
- Final candidate run: **2 files passed; 3 tests passed, 2 committed-only tests skipped; 17.47 seconds**. Log: `output/lv3-audit-20261107/starter-media-ts-candidate/run-20261108-023354.log`. Complete observed maps: `output/lv3-audit-20261107/starter-media-ts-candidate/observed.json`.
- Initial main committed focused run: **5 files failed, 2 passed; 8 tests failed, 27 passed; 209.37 seconds**. Log: `output/lv3-audit-20261107/starter-media-ts-committed/run-20261108-024437.log`. The real-checkpoint integration tests passed and saved complete observed maps to `output/lv3-audit-20261107/starter-media-ts-committed/observed.json`. Seven existing guard tests exceeded their unchanged 5-second timeout. Repeated full migration validation was observed in these execution paths; performance diagnosis is still in progress, and its contribution has not yet been isolated by benchmark. One audit-pipeline negative assertion rejected the correct earlier `migration unchanged input drift` error because its expected message only covered the old raw/derived guard. Its two message matchers now also accept that precise migration error; all other assertions remain unchanged. No timeout, expected hash, or data guard has been relaxed. Final corrected run pending.
- Initial forced TypeScript compilation: failed with index-signature errors in the new integration test's before/after maps. Log: `output/lv3-audit-20261107/starter-media-ts-committed/forced-tsc-20261108-024835.log`. The maps now have explicit `Record<string,string>` annotations, with no permissive cast. Final compilation pending.
- Build: not run.
