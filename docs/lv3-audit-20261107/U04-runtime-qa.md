# U04 runtime QA

Status: completed for the local browser scope below. No unresolved product blocker was found in the completed card, image, responsive subset, or profile persistence checks. The initial stale-data window and verification limits remain documented.

## Profile and scope

- Original isolated U04 audit profile; exact local reopen instructions are retained in REUSE.md.
- Before capture: 183 curriculum cards, 106 distinct mapped general cards, 379 actual tab pages, 289 screenshots, 30 actual runtime image URLs. The original before files remain unchanged.
- The profile contains the starter pack: 5,779 words, 7,436 examples, 4,111 notes. Full HTTP source datasets contain 6,090 / 7,871 / 4,290 respectively. These populations are tested separately.
- No direct IndexedDB writes, injected progress, storage reset, CSS hiding of navigation, or fixture changes were used. Browser is currently closed and the profile retained.

## Initial stale-read observation and normal update UI

The first after runtime check recorded 75 mismatching fields across 53 general-dictionary rows: 16 example rows, 34 word rows and 3 note rows. All 183 curriculum rows and complete HTTP source data already matched the applied manifest. Evidence is retained in `output/playwright/lv3-u04/first-failure-stale-starter-exact-fields.json` and `.txt`, with `after-initial-reopen-state.json`. An incomplete first card traversal was stopped and its batch results preserved under `first-pass-stale-starter`.

After reopening the same profile at Settings, the installed content metadata already matched the updated starter pack before the update button was pressed. The normal `更新字典資料` button returned `字典資料已是最新，學習進度已保留。` The before-button and after-button state and content metadata were identical. This does **not** show that the button performed the update, and does not establish that reopening immediately supplies updated dictionary rows. `src/App.tsx:155` schedules `refreshInstalledContent()` 15 seconds after startup, consistent with a startup synchronization window; the exact transition instant was not instrumented. The first stale-read check did not separately record its installed meta row.

Observed updated content version: `sa:ab4f64a492004d1b0767a9b9c1bf842fabc991cfa1da7dc4bc1cceae72f107ae`; generatedAt `2026-11-07T15:30:33Z`. Settings-button evidence: `dictionary-update-ui-result.yml`. Exact state/meta before and after the button are saved as `after-before-ui-update-*` and `after-post-ui-update-*`.

The subsequent read-only verification passed all 173 changed fields / 79 rows. Full source and actual starter IndexedDB inventories had no missing/extra IDs or row-hash mismatches, including rows outside the changed scope. Source curriculum remains `text_only`, all 183 items `read_only`, with an empty questions array and no authored example/image fields. Evidence: `after-exact-fields.json`.

## Completed acceptance

- **All cards:** 183/183 curriculum cards (122 vocabulary + 61 grammar), 106/106 distinct mapped general cards, and all 379 actual general-card tab pages reopened through normal browser routes and UI tab clicks. Exact IDs matched the independently captured route inventory; no missing tabs. 289 per-card screenshots plus full text/HTML were saved. The 16 unmapped vocabulary items remain curriculum supplements.
- **Runtime versus visible UI:** 173/173 changed runtime fields across 79 rows passed read-only comparisons. All source/starter row IDs and counts matched, and all unchanged rows in the four tested collections retained their expected canonical hashes. For visible UI evidence, 147 changed-field value sets were found in rendered card/tab text; 26 meaningSource fields are explicitly runtime-only metadata. This is value-presence evidence, not a claim that 147 source fields render as independently labeled UI controls. Semicolon-separated usage lists, POS arrays and spaced slashes are compared as displayed items. The original stricter string-match output is retained separately.
- **Text-only contract:** All 183 curriculum rows remain read_only, deliveryMode is text_only, the questions array is empty, and no authored example/image fields or curriculum images were introduced. Placeholder example notices are retained rather than treated as authored examples.
- **Images:** 30/30 actual general-card image bindings decoded with nonzero dimensions and returned HTTP 200. The other 29 original image paths and HTTP-byte SHA256 hashes are unchanged. Only replace changed to /wordbeast/lv3-reviewed/W002723-replace-v2-cebee8173ee9.webp, SHA256 cebee8173ee9d2a633e68212669b6c47178dbbe17cd9a2c69ee7b83e937fe40c, 609,410 bytes. Both original English and Chinese caption strings are unchanged. Alias-only assets are not included in this count.
- **390×844 responsive subset:** Ten routes, 18 actual views, 42 normal-scroll checkpoints and 156 text-element visibility samples. All views reached the bottom; zero horizontal-overflow findings and zero sampled text elements remaining occluded after normal scrolling. Fixed navigation was not hidden or changed. The subset covers express, info, collective, long existing meanings, pretend/new verb forms and replace bilingual illustration. Express and replace screenshots were manually inspected. There are 43 responsive screenshots, including actual next/previous navigation.
- **Actual navigation:** From express, the fixed next button opened expression, and previous returned to express. The raw URL-equality assertion initially returned false because the app reordered level/unit query parameters; the original result is retained. Canonical path/query parameters and exact visible headings confirm successful navigation, without changing the app or test timing.
- **Persistence:** The original isolated profile was closed and reopened. Before any resumed navigation, database snapshots (content-table counts and all progress-table values), local/session storage, installed content metadata and saved last-location matched the saved pre-close state exactly. Following the saved express route by normal navigation succeeded; only the expected last-location update occurred. No non-settings progress table changed. The profile's SRS, quiz and reward tables remain empty. The final reopen check did not rerun every full-row hash; it separately verified counts, metadata, progress values and route restoration.

Browser is closed. The original profile remains available for reuse. No product, manifest, chain or test timeout setting was changed by these checks.

## Evidence index

All local evidence is under output/playwright/lv3-u04/:

- after-summary.json: full capture coverage, image decoding, HTTP bytes and hashes.
- after-exact-fields.json: 173 fields and complete tested collection inventories; starter IndexedDB versus full HTTP scopes separated.
- after-acceptance-summary.json: card/tab IDs, image changes, caption preservation, text-only contract, DOM value evidence and progress comparison.
- after-responsive-summary.json: all ten routes, 18 views, scrolling/visibility details, and preserved raw-versus-semantic navigation result.
- after-persistence-summary.json: exact pre-navigation persistence comparisons and normal restored-route evidence.
- after-final-state.json / after-final-meta.json / after-reopen-pre-navigation-state.json / after-reopen-pre-navigation-meta.json / after-reopen-state.json: original state evidence.
- first-failure-stale-starter-exact-fields.json, first-pass-stale-starter/, dictionary-update-ui-result.yml: initial observation and normal update UI chronology.
- after-acceptance-summary-first-text-match.json and after-responsive-navigation.json: original strict-matching outputs, retained rather than silently rewritten.
- REUSE.md: CLI/profile reopening instructions and test contracts.

## Limits

No physical-phone, offline, production-deployment, or historical real-user SRS migration claim is made. This QA profile has empty learning/quiz/reward tables; preserving those empty tables is not equivalent to migrating populated real-user progress. Short-viewport screenshots requiring scroll are not classified as failures without checking whether normal scrolling reveals the content.
