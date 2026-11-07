# LV3 U01 review and conservative text corrections

## Status

The 28-row text manifest has been applied locally on baseline `99883751926bd6cb4feff70daff56c07afc130cb`. This is not a declaration that the whole unit, its illustrations, or every source variant is complete or approved. Publication and full application regression are separate checks.

Applied datasets: 18 word rows, 3 example rows, 3 formal-note rows, 1 curriculum grammar-note row, and 3 grammar-question rows. The dataset changes are completely specified in [U01-patches.json](U01-patches.json), with complete before rows, changed fields, evidence and before/after dataset hashes.

No word IDs, word POS/status, original example English/Chinese sentences, cloze answers, mother workbook, SRS, or real user progress were changed. The one example POS correction labels the existing verb `rated` correctly. Six verb-form sets were added from explicitly checked Collins Word forms. The three question changes preserve their English stems and intended answers.

## Review coverage

- Read all 123 original unit vocabulary examples and all 166 unique formal examples. The first 60 vocabulary entries contain 53 mapped entries and 89 unique formal examples; the remaining 63 contain 47 mapped entries and 77 unique formal examples. The 100 mapped entries refer to 99 unique general cards. Reading coverage does not mean every item is approved.
- Read all 53 curriculum grammar notes and all 53 grammar questions, including options and rationales: 43 cloze questions and 10 conceptual/whole-sentence questions.
- Compared all 53 questions with the original authoring rows and generator. The G29 disambiguating prefix is explicitly accounted for. Compared all 53 notes with the original production package.
- Visually checked the relevant original textbook passages on U01 pages 1–10. Source photo filenames and SHA-256 fingerprints accompany the corrections. Source text remains historical evidence, not an instruction to preserve known teaching errors.
- Read all 85 formal notes associated with the 99 unique mapped formal words. Supplemental notes originating outside these U01 pages do not all have an independently verified source photo.
- Before-capture inventory was completed separately for 176 curriculum cards and 99 general cards. All 41 currently bound images were individually viewed: one curriculum image for probability and 40 general-card images. Thirteen general-card images illustrate a different sense from the unit target and were not reassigned. Eighty-two curriculum vocabulary entries currently have no image binding; no invented or placeholder image was added. Visual inspection is not blanket semantic or art approval.

## Corrections included

- Retained missing/common meanings while preserving existing uncommon meanings and explicitly labelling separate POS or historical usage where supported.
- Corrected the `politics`/`politic` conflation without silently erasing the inherited adjective information; left unresolved historical `besides` English material untouched.
- Added verified `determine`, `rate`, `process`, `recognize`, `locate` and `unify` verb forms.
- Limited the two body-example meaning hints to their actual physical-body meaning.
- Corrected `trade union` from 商會 to 工會. The original p1 photo genuinely prints 商會, so this is a source-content correction, not an OCR correction.
- Distinguished `unique to` from `native to`/`indigenous to`. The original p5 photo genuinely prints the overbroad equivalence; existing G47 already correctly distinguishes these concepts.
- Removed a lodging example from the formal `stay + adjective` note. The prior note itself acknowledged the mismatch; no original sentence asset was rewritten.
- Disambiguated G12 by replacing the distractor `price`, corrected G16’s Chinese glyph, and clarified additive `besides` in G35.

## Pending and preserved

1. **G33:** The first authored sentence says most repairs were paid for by donations; it does not identify local residents as the donors. The following sentence/rationale therefore overclaims. This remains a pending logic issue. No donor identity was invented and no English premise was rewritten. Per the retained-source decision, an unapplied discussion draft for the second sentence is `The project was _____ funded by donations.` with the intended answer `mainly`; the matching draft rationale would explain that most funding comes from donations, not identify residents. This draft still requires source/context review, including the repairs/project scope, and is not an approved or applied replacement. The original stem and all four rationales remain unchanged.
2. **G02 / NX9f92593f:** The original heading says `with`/`in`, while its examples use `Without unity` and `In unity`. This source discrepancy is recorded without declaring `with unity` ungrammatical or silently changing the source.
3. **Bank illustration resolved after the text checkpoint:** The versioned replacement now shows two seated shore characters and two boats. The original asset and exact caption are retained. The ordinary card and actual image-clue quiz were reopened and verified; see [image runtime acceptance](U01-U02-image-runtime-qa.md). This does not add an illustration to the authored U01 exercise.
4. **Other source pages:** Supplemental formal-note pages outside U01 p1–10, including the `stay` p95 reference, remain independently unverified where relevant.
5. **Coverage limits:** A single question per pattern does not test all alternatives. Examples include G28 `with fright`, G39 `healthy`, G43 `meat processing`, G48 `lie`, and G53 `career woman`.
6. **besides historical material:** The truncated historical English meaning has not been reconstructed. Only the supported additive Chinese usage clarification was changed.
7. **painting sentence:** The time-modifier ambiguity remains an optional clarity issue; the original English and Chinese sentences were preserved.
8. **jealous image:** Its visual concept can fit jealousy, but the selected caption has not been conclusively established. Do not treat conceptual fit as approval of a specific image-caption pairing.
9. **Image-sense and binding limits:** The 13 general-card images for other senses remain on their existing bindings. The 82 curriculum vocabulary entries without image bindings remain without bindings. No whole-unit illustration completion or blanket content approval is claimed.
10. **Remaining release work:** Scoped local text/image UI after-capture is complete in the linked reports. Final LV3 full regression, publication and deployed-version verification remain separate stages.

## Original U01 application checkpoint

The following records the original U01 stage. The later strict multi-unit chain is documented in [PIPELINE.md](PIPELINE.md); this historical scope description is not the current CLI limit.

At that stage, `scripts/apply_lv3_unit_audit.py` supported only the five U01 datasets and this U01 baseline. Its filename allows future extension; it does not yet cover all LV3 units. It defaults to a staged dry run. It fixes the allowed dataset paths/keys/fields, verifies complete before rows and whole-dataset hashes, rejects mixed states and unknown drift, checks 137 unchanged inputs and the existing metadata/pack, and builds the updated metadata/pack in isolation before product writes.

Ten isolated-fixture checks passed: complete-before-row rejection, path traversal rejection, duplicate-patch rejection, protected-status rejection, unrelated dataset drift rejection, mixed-state rejection, dry-run zero writes, injected second-file failure rollback, successful application with idempotent reapplication, and final manifest hashes.

The actual application wrote seven product files. An immediate second application returned `already_applied` with zero product writes. Each replacement is atomic per file; the multi-file operation has a durable recovery backup and exception rollback, not OS-level multi-file atomicity. A pending interrupted transaction blocks another application.


The repeatable Python suite is scripts/test_apply_lv3_unit_audit.py. It reconstructs the baseline fixture by exact full-row inversion of the current verified after datasets, then checks the original before hashes and captured metadata/pack guards. It rejects unknown drift instead of rebaselining expected hashes. Run python scripts/test_apply_lv3_unit_audit.py. CI already covers this file through the existing test_apply_lv3_*.py discovery glob, so no duplicate step was added and no existing timeout or test command was changed.
