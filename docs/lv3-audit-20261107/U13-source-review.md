# LV3 U13 independent source review

The source candidate and independent six-document expected-after are complete. This is source review only, not application, AFTER runtime acceptance, user artwork approval, or release approval.

## Original scope and evidence

- All 185 curriculum rows were reviewed against the original textbook: 112 vocabulary and 73 grammar rows. Vocabulary consists of 33 numbered headwords, 12 unnumbered headwords and 67 supplemental occurrences. There are 93 mapped occurrences, 89 unique formal word IDs and 19 null-ID entries.
- All 13 exact-hash original photos were located. The actual pixels of pages 131–142 and the page 143 Unit 14 boundary were viewed using readable EXIF-oriented previews. Unit 13 starts with cast and ends with bookcase; Unit 14 starts with swear. No missing photo was substituted or inferred from a directory name. Raw originals are unchanged and their paths/hashes are pinned.
- All 89 linked general words, 129 examples, 47 notes, 14 senses and 20 media metadata rows were read. The general review directly opened 91 Collins headwords, including the two split spellings in merged entries. Direct dictionary bodies and source hashes are retained. Rare or specialist details not established by that reading remain explicitly unresolved.
- The main Excel was read without writing, automation or recalculation. Its 64-sheet scan retains 820 matching rows, and a supplemental scan retains 190 rows for unmapped terms and LV3 source pages. The scans overlap in 107 rows, giving 903 unique original rows. Every stored cell, address, type, cached value and formula is retained. All 299 corresponding input words/examples/notes/senses/media rows were semantically read. The workbook contains 829 stored formulas; its before/after raw SHA256 is ba048a3f16b5de935b953fac28b87f07211e53b3ebfce34edaf5aaea5dcf3f25.
- Excel staging is historical reference, not independent dictionary authority. It incorrectly calls p142 empty and places several p141/p142 items on earlier pages. Actual photos show bookcase on p142, and the current curriculum already has the correct pages. Those source inconsistencies are recorded without modifying the workbook or promoting its raw_capture/needs-review rows.

## Candidate changes

451 fields across 189 complete rows:

- Curriculum: 321 fields across 140 rows. All 73 placeholder grammar explanations are replaced with page-supported explanations. Five patterns, G024/G025/G026/G031/G051, receive narrowly evidenced corrections for human-race scope, definite articles, mankind/humankind usage, yell contexts and optional that after hint. Their original printed wording remains in complete beforeRows and source evidence.
- All 67 existing supplemental curriculum occurrences receive their printed chapter meanings rather than inherited whole-dictionary summaries or unresolved placeholders. This includes die as a die/dice noun and plot as story events. Seventeen unmapped supplemental rows have printed Chinese text and are transcribed without inventing IDs; all 19 null IDs, review labels and read_only modes remain unchanged. Designer purse has no printed POS abbreviation, so its empty sensePos remains.
- Every textbook source separates printedExcerpt from editorialSummary. The v1/v2 evidence descriptions are preserved but superseded by v3. Scope qualifications, normalized comparisons and dictionary-supported explanations are not falsely labelled verbatim printed wording. All 321 candidate values are unchanged between v2 and v3.
- General words: 124 fields across 43 rows, comprising 94 POS/meaning/usage fields and 30 new directly supported verb-form records. Twenty existing verb-form records were rechecked and retained. The approved value inside verbForms is the existing technical data contract, not new art, example or user approval. The merged bridegroom/groom entry receives only groom/groomed/groomed with the direct groom dictionary source.
- Examples: six contextual POS labels only, for award, cast, budget, plot, rash and venture. No sentence, translation, blank, answer, ID, original provenance or approval status is rewritten.
- Notes, senses and media remain unchanged. Meta and sa-pack are not source candidates; they require separate independent downstream reconstruction and integration checks.

## Images and retained meaning boundaries

The independent image inventory records 89 general selections: 28 active images and 61 allowed nullable selections. Registry/resolver inputs, raw asset hashes, captions and cross-curriculum consumers are pinned. Actual artwork and responsive UI acceptance are recorded separately by the browser reviewer, not inferred from these hashes or media metadata.

The browser reviewer confirmed that the die and plot textbook cards have no image or caption. The general die card depicts a dying-down campfire, and plot depicts a planted plot of land. Their general-word candidates preserve these existing meanings and add the textbook noun meanings rather than replacing valid general meanings. This does not claim the general illustrations depict dice or a story plot, or that all U13 image meanings are identical to the textbook targets.

No artwork, mapping, caption, image-question approval or media status is changed. Rotate and reputation retain their pre-existing missing English-caption fields. Heal's stored caption contains a literal backslash and is retained as an explicit issue, not silently corrected or newly approved.

## Unresolved details retained

Seventeen words retain specific rare/mixed-sense questions: cast, doughnut, wipe, spin, reputation, boredom, passionate, romantic, scar, boring, bridegroom/groom, suggest, rush, arouse, present, scream and jet. Their details are in general/retained-pending-v1.json. Unsupported original details were not silently deleted or newly certified. The pimple note headed console/consolation remains a possible misattachment; no replacement destination ID was invented. Reputation's note on related repute is preserved as cross-word information.

Phonetics, syllables, stress and historical exam-source claims are not newly certified. No new sentences or formal senses were fabricated. Original source_checked_text_only labels and practiceMode are preserved. No SRS, learning progress or rewards data was read or changed by this source review.

## Authoritative artifacts

Under output/lv3-audit-20261107/u13-source/:

- accepted-proposals-merged-v1.json
- independent-expected-after-v2.json: complete before/after documents for curriculum, words, examples, notes, senses and media; full changed rows and field evidence. Generated only from frozen originals and reviewed proposals, never compiler/applier/live AFTER output.
- independent-source-verification-v1.json and independent-node-recheck-v2.json
- frozen-source-documents-v2.json and coordinator/original-source-bytes/; v1's media key label was corrected to assetId in v2 without changing any original document value or raw bytes.
- source-scope-v1.json and source-input-pins-v2.json
- coordinator/curriculum-proposals-v3.json, curriculum-per-row-review-v3.json, pattern-pairs-v3.json, provenance-audit-v3.json and mapping-review-v1.json
- coordinator/master-excel-u13-reference.json and master-excel-u13-supplemental-reference.json
- general/accepted-proposals-v1.json, linked-row-review-v1.json, meaning-preservation-v1.json, retained-pending-v1.json, source-index-v1.json and verification-v1.json
- images/U13-image-inventory-draft.json and registry-source-pins-v1.json
- final-source-index-v1.json and source-integrity-final-v1.json

Candidate raw SHA256: 7802a08dfd25fe27a004866babe8bf1c1d17f412bec6cde7171972e46c84be93.
Independent expected-after raw SHA256: b04535fb760caa0d40c28aa9d9e895a6996f8bf9432f5453590d8f158f09ca17.

True Node JSON.stringify hashes and sorted-JSON hashes are separately labelled. An independent Node reconstruction rechecked all 451 fields, 189 changed rows and six full documents, including protected curriculum fields and unchanged notes/senses/media. A preflight syntax failure in the first merge harness was corrected before any merge; the original harness and failure record remain, and its corrected known-answer hash test passed.

No product, ledger/chain, workbook, Git commit, push or deployment was performed by this source-review worker. Existing LV3 test, lint, source uncertainty and device/release blockers are not cleared by this source review. Full-project integration, physical phone, audio, PWA/offline, real practice/SRS/reward and production release acceptance remain separate.
## Evidence and schema addendum

For G024, G025, G026, G031 and G051, the shared explanation proposal reason saying that it does not change the pattern describes that individual explanation-field patch only. Each of these five rows also has a separate, exact pattern-field proposal with its own printed and dictionary evidence. The full row therefore includes both accepted changes. The reason is not a claim that the complete row retains the old pattern. Candidate values, proposal objects and the pinned merged-v1 candidate remain unchanged.

Expected-after v2 supersedes v1 only for explicit Node/Canonical hash aliases and originFindingIds required by the checker. Every alias was recomputed with Node; none substitutes sorted serialization for Node serialization. All six before/after document values and all 451 field changes are identical to v1. Historical versions remain available.
