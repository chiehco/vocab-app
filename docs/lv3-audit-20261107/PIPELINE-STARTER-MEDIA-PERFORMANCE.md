# Starter media proof reuse

The TypeScript test helper retains at most one deeply frozen parsed proof. Its key hashes the entire ordered manifest using deterministic type-tagged structural encoding (including property order and negative zero), plus SHA256 digests of all four actual fixture texts and both actual media/priority source texts. It does not trust path, object identity, mtime, migration ID or an earlier chain validation.

Each call still checks the manifest contract, all 144 guard-map domains and changed paths, supplied parent adjacency, fixed fixture paths, actual fixture raw and normalized hashes, and actual source normalized hashes. It rereads all six dependencies even on a hit. Only the already authenticated parsing and full media/metadata derivation are reused. A miss runs the complete original proof before replacing the single entry. Returned objects are deeply frozen to prevent caller poisoning.

Parent hash consistency with the chain, chain status, current checkpoint guards and each inverse input's bytes remain live checks in their original callers. The captured beforeMeta remains authenticated historical metadata, not a demand that future units retain current meta.json. CRLF normalization and raw forensic APIs are unchanged. No product inputs, sealed manifests, hashes, chain statuses or test timeouts change.

Direct tests cover repeated identical results, fresh structurally equivalent manifests, dependency rereads, immutable returned objects, warm-cache changes to manifest/delta/metadata/domain/adjacency, raw fixture and source drift, changed input/unchanged guards, fully rehashed whitespace and duplicate keys, and a same-path same-mtime filesystem mutation.

Current validation: all 52 direct tests passed, and after the narrow caller-domain routing the original seven-file command passed all 35 tests. Earlier timeout failures remain recorded below. Final forced compilation, lint and build have since passed; see [final technical validation](STARTER-MEDIA-TS-validation.md). Lint retained 310 warning lines and zero errors. Existing test timeouts are unchanged.

## Serialization boundary

Before any manifest field access or cache lookup, a recursive descriptor-based check requires plain JSON data: finite primitives, plain objects and dense arrays with no extra fields. Reflect.ownKeys exposes and rejects symbol keys, and descriptors reject getters without invoking them, hidden fields, non-JSON values, cycles and nonstandard prototypes. This closes the independently reproduced warm/cold Symbol-key mismatch in V8 serialization. The initial implementation was not accepted before this correction. Dedicated cold/warm tests cover those representations and fully rehashed status/order changes.

The first focused run failed one positive cache-hit assertion (28 passed, 1 failed, 20 unrelated cases skipped): V8 serialization produced different encodings for structurally equivalent cloned objects. The proof remained safe but did not reliably reuse content. V8 was replaced with deterministic type-tagged encoding after the plain-JSON gate; key order and negative zero remain distinct. The first log is preserved at output/lv3-audit-20261107/starter-media-cache-validation/focused-first.log.

## Recorded validation attempts

All artifacts below are in `output/lv3-audit-20261107/starter-media-cache-validation/`. Failures remain preserved rather than overwritten.

- `focused-first.log`: 28 passed, 1 failed, 20 skipped. The failed structurally equivalent clone cache-hit assertion led to deterministic encoding, not a weakened assertion.
- `focused-second.log`: 29 passed, 20 unrelated cases skipped; 0.709 seconds.
- `seven-first.log`: same original seven-file committed command and unchanged default 5-second timeout; 33 passed, 2 timed out (U05 7.900 seconds, caption 11.467 seconds), 103.43 seconds total. The pre-repair result was 27 passed / 8 failed, 209.37 seconds.
- `direct-full-first.log`: complete original 20 plus new 29 direct cases, 49 passed, 6.80 seconds.
- `projection-diagnostic-buffer.log` and `projection-diagnostic-string-control.log`: 11 identical high-level projection calls each, 11 passed each; 3.67 versus 5.91 seconds. Each warm operation made two validations, 12 dependency reads, 47,583,692 bytes. The initial cold operation included chain validation and made three validations. The controlled string version intentionally decoded the same freshly read bytes before validation; this diagnostic isolates representation cost, not all historical timing variability. Diagnostic source is retained as `.txt`, not as an extra runnable test in the repository.
- `direct-full-buffer.log`: all 52 direct cases passed, 4.90 seconds, including Buffer/string parity, CRLF normalization and invalid UTF-8 rejection.
- `seven-buffer.log`: 34 passed, 1 caption timeout (5.384 seconds), 52.54 seconds total. This is improved but not a successful regression run.

The Buffer loader still reads and hashes every actual dependency. LF bytes use one digest for identical raw and normalized content. CRLF normalization uses a byte-preserving Latin-1 roundtrip that removes only CR before LF; decoding on a miss is strict UTF-8 and preserves BOMs. Neither malformed UTF-8 replacement nor BOM stripping is permitted.

Original `observed.json` and subsequent intermediate observations are byte-for-byte archived with checked SHA256 files before the real test rewrites its normal output. Command, HEAD and code hashes identify each run. No product, manifest, chain, expected checksum or timeout was changed. At that historical attempt, compilation and accepted regression were pending; final results below and the linked technical report supersede that status.

## One explicit worker-limit comparison

One additional run used the same seven files, Node executable and committed-state environment with only `--maxWorkers=1` added. No code or timeout changed. `vite.config.ts` already specifies `test: { maxWorkers: 1 }`, so this is an explicit-setting comparison, not proof that the preceding run used multiple workers.

Result: 34 passed, 1 failed; caption body 7.308 seconds against its unchanged 5-second limit, caption file 7.488 seconds, total 71.07 seconds. Log: `seven-controlled-once.log`; exact command: `seven-controlled-command.txt`. The preceding default-command result remains separately recorded as 34/35, 52.54 seconds, caption 5.384 seconds. This controlled comparison was unsuccessful; no successful combined result is claimed for it. The later reviewed caller-domain run is recorded separately below.

Per-file durations below come from the Vitest results cache captured immediately after this run, filtered to these exact seven files and archived as `seven-controlled-file-results.json`:

- `src/features/direct/starterMediaRealCheckpoint.test.ts`: 23.709 seconds; passed.
- `src/features/direct/lv3PreparedCheckpoint.test.ts`: 5.866 seconds; passed.
- `src/features/direct/lv3Unit5Audit.test.ts`: 2.505 seconds; passed.
- `src/features/direct/lv3Unit1Audit.test.ts`: 11.454 seconds; passed.
- `src/features/direct/lv3AuditPipeline.test.ts`: 2.041 seconds; passed.
- `src/features/vocabulary/lv3ConfirmImageRepair.test.ts`: 1.435 seconds; passed.
- `src/features/vocabulary/additionalCaptionRepair.test.ts`: 7.488 seconds; failed.

The prior observed output was archived and hash-checked before this run, and this run's observed bytes are also archived. No operation-scoped read snapshot has been introduced. At this comparison checkpoint, the timeout was unresolved and compilation pending. The later reviewed caller-domain correction and final typed-code checks below supersede those pending states.

## Narrow caller-domain routing

The caption-proof test previously sent all eleven independently checked files through the LV3 text-audit projection, although five are outside the authenticated 144-file domain and all historical text-audit steps return them unchanged. The caller now obtains that domain from the fully validated chain and asserts the exact six-domain/five-independent path split and eleven-file total. Only words, examples, senses, notes, meta and sa-pack JSON files use text-audit projection. The five explicit independent paths cannot silently expand to arbitrary unknown paths.

Every original file read, CRLF-only normalization, image-registry inverse, U01 before helper, all eleven proof SHA256 comparisons, source and English assertions, and existing negative checks remains. No operation snapshot or additional cache was introduced. An independent exact HEAD/current comparison confirmed the bounded caller diff before the original seven-file command was launched once. The earlier failed runs remain distinct evidence.

## Final focused regression after caller routing

The single reviewed caller-domain run used the original seven-file command, Node executable and `LV3_REAL_MEDIA_STATE=committed`, without a worker override or timeout change. Result: **7 files passed, 35 tests passed, 56.59 seconds**. Log: `seven-caller-domain-once.log`; command: `seven-caller-domain-command.txt`; code hashes: `caller-domain-code-hashes.json`. Per-file timings archived immediately after completion:

- `src/features/direct/starterMediaRealCheckpoint.test.ts`: 19.644 seconds; passed.
- `src/features/direct/lv3PreparedCheckpoint.test.ts`: 3.183 seconds; passed.
- `src/features/direct/lv3Unit5Audit.test.ts`: 2.782 seconds; passed.
- `src/features/direct/lv3Unit1Audit.test.ts`: 9.064 seconds; passed.
- `src/features/direct/lv3AuditPipeline.test.ts`: 1.437 seconds; passed.
- `src/features/vocabulary/lv3ConfirmImageRepair.test.ts`: 1.142 seconds; passed.
- `src/features/vocabulary/additionalCaptionRepair.test.ts`: 4.706 seconds; passed.

These are whole-file durations, not individual test-body durations. The default successful reporter did not print a separate caption-body duration; its unchanged 5-second test limit passed. This does not relabel any earlier failed combined run as successful. The helper and its 52-case complete direct test were unchanged after their passing run; only the reviewed caption caller changed before the final seven-file pass. No full-project suite is claimed. Final forced compile, lint and build subsequently passed on the explicit loader-typed code, documented in [STARTER-MEDIA-TS-validation.md](STARTER-MEDIA-TS-validation.md); the type-only correction did not change the runtime statements of the 35/35 or 52/52 runs. No operation-scoped snapshot was added.

## Final status

Closed locally at technical-report commit 30ed97b92cec8a465e8cddce0ce96e9847291586: original seven-file command 35/35, separate complete direct-helper run 52/52, forced tsc exit 0, lint exit 0 (310 warning lines, zero errors), build exit 0. The initial final forced compile failure and explicit MigrationLoader parameter correction remain recorded in the technical report. All earlier failed runs, captured observations and unchanged timeout limits remain preserved. No whole-project suite, phone, offline or publication result is implied.
