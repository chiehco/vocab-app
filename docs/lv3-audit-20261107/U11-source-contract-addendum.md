# U11 source-contract addendum

This supplements U11-source-review.md without changing that earlier phase record or any original source evidence. U11 products have not been applied. The integration inputs are now accepted-proposals-merged-v3.json, independent-expected-after-v4.json and final-source-index-v3.json in output/lv3-audit-20261107/u11-source-review/.

## Review-provenance correction

Contract review found 92 proposed meaningSource values used textbook_transcription, the original transcription state. These entries were actually reviewed against the original photographs, so their correct existing reviewed state is textbook_source_review. The source candidate was explicitly revised; the compiler does not silently translate values and the validator's allowed values are not expanded.

Only these 92 proposed values and their associated reason/source explanations changed. Every before row, before presence/value and finding identity is preserved. The other 405 proposals are exactly unchanged. The candidate remains 497 fields/213 rows: curriculum 400/167, words 88/37, examples 8/8 and notes 1/1. Whole senses/media documents remain read-only, and meta/sa-pack remain downstream derived products. Independent reconstruction again confirms all fields, rows and six complete documents from the frozen originals, not compiler output.

All earlier source packages, both old final indexes and the immutable BEFORE seal remain preserved. The new source index covers 151 artifacts. The three previously proposed special grammar/translation patches are byte-for-byte unchanged in their source proposals and complete expected rows.

## One remaining source-format compatibility issue

Debut's word record W004264 has direct Dictionary.com evidence that debuted is the past tense and past participle. The current generic verb-form validator only admits Collins dictionary/conjugation URLs. Direct checking of the Collins conjugation URL led to spellcheck, without the two tense columns; the main entry listed debuted/debuting without explicitly labeling both required forms. The source URL is therefore not falsely replaced with Collins.

The proposed resolution is a fourth narrow U11 compatibility exception, binding only this exact complete debut word patch and its existing source evidence. It must retain the ordinary Collins-only rule for every other record and reject any change to the unit, word, original row, after values, status or source evidence. This is being validated separately in Python and TypeScript before any main-code or product change; it is not a broad source allowlist change or an already-passing compatibility claim.

The other exceptions remain only the exact G001 and G050 grammar corrections and EXa746dcc7 Chinese place-name correction. Exact-six-file fixture registration must retain U10's exact-five-file rule, all historical cases and negative checks. Existing U56/puppet five-second failures and original whole-lint failure still block the eventual LV3 release.

Evidence: meaning-source-contract-diff-v3.json, three-guard-exact-patch-proof-v3.json, finite-contract-review-v3.json and U11-source-contract-addendum-v3.md in the source package; independent reconstruction is recorded in output/lv3-audit-20261107/u11-parent-source-verification-v2.json.
