# Verified form followups: U03–U04

Sixteen existing words now have source-verified principal parts in their previously absent `verbForms` field. This is a field-level supplement to the completed unit audits; it does not approve other meanings, examples, images or pending fields.

- Base checkpoint: `d26603868f60e60069d29ea00613d2e86f94d7bd` (U11).
- Independent branch: `content/lv1-verified-followups-20261105`.
- Research input: `08aaf5f92c375e29635ea623aa5b5339a1280418`, U03–U04 source verification. The cited primary pages and current headword/POS/field values were checked before application.
- Exact changes and reversal: `LV1-U03-U04-verified-forms-patches.json`.
- Exact source allowlist: `VERIFIED-FOLLOWUP-VERB-FORMS-SOURCES.json`.
- Original 31 form source facts and all their product rows remain unchanged. `house` is unchanged.

| Unit | Cards checked for this supplement | Missing fields filled | Cards reopened | Existing images loaded | Usage panels opened |
| --- | ---: | ---: | ---: | ---: | ---: |
| U03 | 6 | 6 | 6 | 6 | 6 |
| U04 | 10 | 10 | 10 | 10 | 10 |

U03: chair, get, love, pen, rain, say. U04: box, color, come, green, place, star, take, teach, time, yellow.

`can` remains pending: can/could and lexical can/canned/canned cannot be presented as one unrestricted paradigm. No key was added. `get` retains both `got` and `gotten` as participles, with only `got` as past; the directly read Canadian government reference is the saved source. Its usage restrictions remain in the source record. `pen` uses the current writing verb's `penned`; the restricted enclosing-verb variant `pent` is not claimed to be nonexistent.

No English, Chinese example, cloze, answer, meaning, usage field, word/POS identity, word status, sense status or image changed. Only the nested form record receives `approved`. No image was generated or repaired in this batch; unrelated missing-image/pending queues are not marked complete.

The starter bundle retains its exact word identities/count (5,779). Twelve changed words are in that bundle; box, green, pen and teach are intentionally omitted. All sixteen were reopened from the full 6,090-word content database. The isolated test origin used the existing `seedContentIfNeeded` loader diagnostically to install the full dictionary; this is not evidence that a normal starter installation exposes omitted cards. No progress was cleared.

The saved values matched the visible forms on both card and meaning tabs for all sixteen words. Existing images loaded at nonzero dimensions, and all sixteen usage tabs were opened and captured. The 32 individual screenshots and eight contact sheets were visually inspected. A 390px get card also passed the horizontal-overflow check. These screenshots retain the prior illustration/caption pairings and do not certify new art.

Local validation: 12 Python write-boundary tests; 4 Vitest files / 24 tests with one worker and the unchanged default timeout; typecheck; lint; build; exact comparison against the base; publication scan. The full suite was not run locally. Push CI is to be checked against the resulting commit, separately from these local results. CI now explicitly runs the audit write-boundary tests as well.

Application to a later main-audit checkpoint must re-read each current row, check the exact absence guard and source fact, and apply only the listed field. An existing different value or explicit null is a conflict to preserve, not an overwrite. Reversal deletes `verbForms` rather than writing null. Keep the original historical hashes and the original 31 facts. Do not merge an old product baseline or automatically copy this branch's whole snapshot into the continuing audit.

Next batch: U05–U06, 46 researched form candidates, beginning with give (`W000348`). They have not been applied here. Optional text precision candidates remain research, not completed corrections. New U11 evidence has been fetched separately and is outside this first checkpoint.
