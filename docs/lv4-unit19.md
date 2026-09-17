# LV4 Unit19 · 2026-09-17

Adds the approved Unit19 vocabulary to textbook cards, general word cards, thumbnails, groups and practice. Includes 46 vocabulary items, 31 usage items, 123 questions, 62 related-word notes and 39 illustrations. The 39 official headwords are included in the fresh-install bundle; seven supplemental words retain no invented official IDs.

Approval: `20260917-LV4U19-FULL-REVIEW-2`. The user approved the hardware caption about the screen and the revised autograph illustration with five additional fans, then authorized pushing. Image/text hashes are checked by `scripts/import_unit19.py` against the source pack's approval file. Earlier units retain their default illustrations and meanings.

Practice uses approved captions plus authored usage examples. `sledge` cloze accepts `sled`; `sleigh` remains a different word. The specified CEEC 111 vocabulary list was checked with inflections reduced to lemmas; no unmatched non-target words remain. Textbook targets absent from the list and proper names are separately recorded in the source pack.

Validation: 237 tests passed; build, lint and diff checks passed. Isolated browser initialized normally without a preloaded test dictionary: all 46 textbook images decoded, last card reachable, both revisions correct, 77-item group created, basic and advanced answers accepted, general hardware card and thumbnail visible, 390px layout and offline general-card reload passed. Physical phone shortcut not tested.

Two pre-existing build errors were also corrected: the group scope fixture supplied null to an optional string, and the quiz treated WordList as lacking itemIds despite extending CustomGroup. Both group types now use their common resolver.

Follow-up image-quiz verification found that the image clue still used a legacy dictionary example. It now resolves the caption against the exact rendered approved image, including its version query, and preserves the old fallback for non-curriculum images. All 238 tests pass; the browser image question for hardware displays the approved screen caption. Build and lint pass.

Master spreadsheet, dictionary source rows, SRS and user progress are unchanged.

The general-card usage display for hardware/software also uses the p.207 reviewed uncountable pattern `a piece of …`, overriding the legacy generic `a/the …` display without changing the dictionary source.
