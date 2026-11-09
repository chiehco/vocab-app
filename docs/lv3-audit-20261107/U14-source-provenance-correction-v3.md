# U14 complete source-excerpt provenance correction

This addendum supersedes candidate references in the earlier U14 source reports. Those reports and their indexed evidence remain unchanged. Compilation/application remains subject to independent acceptance of this revised provenance.

The independent reviewer found additional normalized grammar strings incorrectly labelled as literal excerpts. The correction was expanded to all 145 curriculum evidence records, rather than patching examples individually: all 53 grammar excerpts now use exact short visible English words/phrases, and all 92 vocabulary excerpts use exact visible headwords/phrases. Only whitespace or line breaks may be collapsed. Editorial reconstruction remains separately labelled normalizedSourceSummary, unchanged. In particular G020 quotes “doubtless” and G021 quotes “doubtlessly”; their exact evidence contracts must be regenerated. The full original patterns, page references and dictionary evidence remain.

The precise mapping is retained in coordinator/grammar-excerpt-correction-v4.json and coordinator/vocabulary-excerpt-correction-v5.json. G001/G029 no longer omit intervening IPA inside a purported quotation, G023/G035/G037/G040/G049 no longer call summarized prose literal, G051/G052/G053 no longer synthesize a word plus parenthetical three-form note, and V066 no longer synthesizes an equality excerpt.

The candidate delta is exactly 231 curriculum proposal objects across 101 rows, changing only sources[0].printedExcerpt and sources[0].excerptNormalization. All normalized summaries, dictionary sources, general proposals, identities, original rows and learner values are unchanged. The 44 unchanged main/unnumbered vocabulary rows receive corrected evidence records only, not product proposals. The complete six before/after documents are identical to the prior revised expectation. Counts remain 348 fields across 144 changed rows.

Authoritative artifacts under output/lv3-audit-20261107/u14-source/:

- coordinator/curriculum-proposals-v5.json and curriculum-per-row-review-v5.json.
- coordinator/pattern-pairs-v5.json, including revised G020/G021 provenance.
- accepted-proposals-merged-v4.json, SHA256 d7aa29a8e310620c6bad8a45190c9d0df5c1d7e78bac5487045a434bea8ed78c.
- independent-expected-after-v9.json, SHA256 beabc475f5b3a9bbc9d56271ecc6ec0f3ea8b0a9ae6eb50c708279467e0b2133.
- independent-source-verification-v4.json and independent-node-recheck-v9.json.
- provenance-only-delta-verification-v1.json independently verifies the exact delta and all unchanged complete documents.
- final-source-index-v3.json, source-integrity-final-v3.json and independent-linked-reconciliation-v3.json.

All six documents were freshly reconstructed from frozen originals and revised proposals, followed by independent Node reconstruction and hash verification. The earlier evidence indexes containing 111 and 134 entries remain byte-exact. No earlier failure was overwritten or relabelled. Intermediate grammar-only candidate versions are retained but not authoritative.

No product edits, compiler/applier execution, artwork approval, commit or publication occurred in this correction. All prior unresolved semantic/image questions, technical blockers and release/device limits remain.
