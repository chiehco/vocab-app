# Pending-manifest preparation and named checkpoints

This extension preserves the U01/U02 manifests, scopes, baseline hashes and chain. It does not authorize or perform a U04 product application.

## Curriculum scope

Vocabulary rows may change only `sensePos`, `targetMeaningZh`, `chapterMeaningsZh`, and `meaningSource`, with exact row scope and individual field evidence. `meaningSource` accepts only `textbook_source_review` or `textbook_and_dictionary_review`; these identify review provenance, not a claim of verbatim transcription. Grammar rows still allow only `explanationZh`. IDs, kind, review, practice mode, status and original examples remain protected.

New units U04 through U24 use their canonical `curriculumLV3UnitN.json` path. The builder and physical-document application/inverse checks validate the template ID, LV3 level, numeric unit, and every learning-item ID's unit and V/G namespace. A ledger remap does not authorize a different unit. Existing U01/U02 naming stays under its original immutable contracts. New-unit `questions` collections are currently unsupported and fail closed; this extension does not claim to support U04 option editing.

## Named checkpoint projection

`lv3AfterUnitRows(afterUnit, dataset, value)`, `lv3AfterUnitFile(afterUnit, path, value)`, and `lv3AfterUnitPublishedText(afterUnit, path, text)` reverse only later committed steps. Unknown or uncommitted targets fail. U01 wrapper APIs remain available. Full-file projections verify the target even when there is no later step; row subset projections retain their existing complete-row checks.

Raw projection keeps exact normalized-byte hashes. For untouched parsed documents with noncanonical formatting, the file API verifies repository bytes against the target byte hash before comparing the supplied parsed value. It never replaces an expected hash with a new serialization. Later modified files are checked against the recorded target semantic hash. Python `project_checkpoint` verifies both the actual committed head and the requested destination; a latest-v2/no-tail request no longer uses the U01 anchor by mistake.

## Read-only candidate compiler

Run `scripts/prepare_lv3_audit_manifest.py` with `--unit`, `--accepted`, `--capture`, and a new `--output` directory under repository output. Optional `--root` selects the worktree. The compiler never edits products, docs manifests, or chain, and never seals or applies.

Each accepted proposal supplies dataset/path/key/id/field, beforePresent/beforeValue/afterValue, reason, sources, originFindingIds and a complete beforeRow, either inline or in the top-level beforeRows map. Same-row fields merge into one patch with per-field evidence. Duplicate fields, no-ops, incomplete or drifting before rows, private source paths, unresolved findings, and overlapping aggregate/granular options are rejected. Aggregate options plus an option leaf are rejected in either order rather than allowing last-write-wins.

The capture must be the independently read exact pipeline input map, currently 144 paths, not the separate broader 505-path inventory. Values are SHA-256 of actual bytes with CRLF-to-LF normalization only. The compiler rechecks input bytes, input domain, parent chain and recovery state. Pending output records the immutable parent hash. Existing pending predecessors block preparation. CLI output includes the raw accepted/capture artifact hashes. A later, separately authorized seal operation remains required; preparation alone does not register or commit a step.

## Verification for this extension

- Small builder tests: 10 passed, including both overlap orders, ledger remap, template/namespace rejection after rehashing, independent capture domain/drift, and concurrent parent-chain change.
- Existing synthetic pipeline tests: 13 passed.
- Four focused TypeScript files: 29 tests passed (pipeline plus U01, recovered-unit, and caption-repair historical regressions).
- Changed TypeScript syntax diagnostics: zero. No whole-project typecheck, default full suite, build, or browser run was performed for this extension.
- An intermediate focused run exposed unchanged JSON with noncanonical formatting; this was fixed using authenticated original bytes without changing historical hashes. The final focused rerun passed.
- Real U04 accepted input SHA-256: `85fc6f9ec155a8eed474ef64d5a346975f30814077b40822569e9c80c361864e`.
- Fresh output-only preparation: 173 fields merged into 79 rows, exact 144-input capture, zero before-format fixtures needed. Candidate canonical hash: `1e225bd953dbb5173cff9584c7b468875dcfc5166e4a2244c91824699b44afbc`.
- Output status remains pending only: not registered, sealed, or applied. These checks are not a new whole-project release validation.
