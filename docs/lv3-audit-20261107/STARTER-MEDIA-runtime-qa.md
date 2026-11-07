# Starter media migration runtime QA

## Before and after: complete with recovery-flow limitation

Captured 2026-11-07 UTC against base `90bb66c644335e2e2b295254cc469a42e37a45fe` at local Vite origin `http://127.0.0.1:5186/vocab-app/`. No product, source data, pipeline, or progress database was directly modified. These checks did not create a Git commit or publish a release. All QA Chrome sessions are closed.

### Existing starter state

Reused the successful isolated confirm QA profile outside the watched checkout, with its prior normal-UI confirm practice. Full read-only snapshots retain every content and progress table, installed metadata, localStorage and sessionStorage. The original confirm group contains only W002185. One quiz stat/review log, schedulingApplied false, practicePending true and the +5 reward/wallet remain exactly unchanged from the prior confirm acceptance. No practice was injected or repeated.

Startup installed the current U05 text normally. Starter has 5779 words, 7436 examples, 4111 notes and 746 media. Its contentHash is `sa:d455a7ca10769a701e3e0c85a1cb9abb40354715307a13737d8b2b39e570f00d`; wordsHash is `sa:4eae3009761b1b482d852a894760e7dca323f05dd00a935592f440eb996549f3`.

After the original state capture, the normal Settings button changed dailyNewWordCap to 15 as an explicit retention case. This is a new QA setting, not an original pre-existing value. Normal card navigation updated learning:last-location; its complete record is retained. All other progress and reward rows compare exactly.

### Real DOM and images

- All six cards (decade W002224, significant W002797, detect W002239, source W001828, capacity W003126, lengthen W003594) show an image but no figcaption in starter.
- All 33 existing U05 image cards were opened and captured. Each image decoded and returned HTTP 200; actual URL, bytes, SHA-256 and natural dimensions are preserved. The app's real read-only image resolver matches each URL.
- Confirm still uses the reviewed 57,484-byte image, SHA-256 `99268c4492700f1d99c51c8b03143dd1aebf704f45451feb90202a4360f29d2d`.
- Nonapproved source controls: except (draft) and although (needs_redraw) display their independently reviewed curriculum images/captions, not the draft/needs_redraw media caption. This is not a claim that every nonapproved image is hidden or every source image received a new visual review.

### Full-profile control

There is no full-download button in the current UI. A separate fresh isolated profile used the supported CLI network route to return HTTP 503 only for sa-pack requests. The existing normal startup then downloaded the full source files and installed them itself. No internal seed function or direct IndexedDB write was invoked. Requests show sa-pack 503 and full files 200. Interception was removed afterward.

The successful full profile has 6090 words, 7871 examples, 4290 notes and 1177 media. Every installed full content table matches the actual full source rows. Full contentHash is `5edf980e850bcbf4898ce0059ca25552a741102663ac918520bfa67a09ec0eaf`. All six Chinese-only captions appear in full, with no invented English caption, and their image bytes match starter. The two nonapproved controls retain the same reviewed captions.

An earlier fresh-profile attempt using an inline page.route handler did not trigger the intended interception and installed starter instead. Its profile and full-before-* evidence are retained as a failed setup, not full acceptance. The successful artifacts are explicitly full2-before-*. An initial sandboxed Chrome launch also failed before navigation; the permitted execution route subsequently opened the original QA profile successfully.

### Frozen evidence

All evidence is under `output/playwright/starter-media/`:

- `before-state.json`: complete initial installed rows and original progress.
- `before-custom-state.json`, `before-final-state.json`: normal custom-setting and final closed-session baseline.
- `before-cards.json` and screenshots: six missing captions and status controls.
- `before-images.json`, `before-resolver.json`: all 33 actual image consumers, HTTP hashes and executed resolver.
- `full2-startup-requests.txt`, `full2-unroute.txt`, `full2-before-state.json`, `full2-before-cards.json`: successful controlled startup fallback and full counterpart.
- `inputs-before.json`, `inputs-before-end.json`, `inputs-before-final.json`: independently read raw and CRLF-to-LF normalized SHA-256 maps for all 144 pipeline inputs. Both hashes came from the same individual byte read; no expected manifest values were copied. All maps compare exactly across captures.
- `verify-before.cjs`, `freeze-before.cjs`, `before-summary.json`: passing before assertions and provenance.

The final input capture is `inputs-before-final.json`, SHA-256 `1c0cacb817f9a4b8bb268cd7ab3fd7b6555efe89edc49e80222f659348a38fc8`. Envelope shape: `{time, base, files, rawFiles}`; files contains normalized hashes, rawFiles contains raw hashes. Final capture timestamp: 2026-11-07T18:05:12.336879+00:00.

The after results below supersede the earlier pending status. This is local desktop-browser QA, not production deployment, physical-device testing or offline-PWA validation.


## After migration: 2026-11-07 UTC

Runtime captures started against `0844941720cf8679b081f38247a3c95a2b8b5296`. The only normalized pipeline-input changes from before are `scripts/build_sa_pack.py` and `public/data/v1/sa-pack.json`. The 144 raw/normalized input maps remain identical across the entire after window. The pack raw SHA-256 is `c198a371ad72a5f8d8b7d013bd9cc8b2b97c29ecc3fd56abbe2e785f7a19a3e8`.

### Failed update and recovery

The retained starter profile was first opened at about:blank. Before the first app navigation, the CLI route returned HTTP 503 for sa-pack.json, including query strings. The normal Settings update button displayed the failure message. `after-failed-state.json` exactly matches every ContentDB and ProgressDB row and installed metadata in `before-final-state.json`; localStorage also matches. No partial installation, lost reward, lost group or changed custom setting was observed.

After removing the scoped route, a page reload cleared the Settings failure state and the normal background updater installed the new content before the intended retry click. That retry selector therefore timed out. The observed recovery is **automatic recovery after network restoration**, not a demonstrated first successful manual retry. The profile was not reset or rolled back to manufacture a manual-success result. Subsequent normal Settings updates, including after closing and reopening the same profile, reported that the data was current. The initial failure-action script also used an incorrect button label before being corrected to the actual visible label; the successful manual-failure capture is separate from that preparation error.

This is a controlled network-failure test, not a physical offline/PWA or production service-worker test.

### Exact installed data and retained progress

- Starter media is exactly 1128 rows. Every row matches the actual new starter pack. All original 746 media rows retain identical field names and values. The 382 additions retain 316 approved, 52 draft and 14 needs_redraw statuses.
- Installed contentHash is `sa:dfd6834da6d08dbb81d90244086fba7e997ffd6bffe48cdbb8668a39b3b22bbc`. wordsHash remains unchanged. Every non-media content table is exactly unchanged from before.
- All non-settings progress tables match before through failed update, recovered update, final navigation and close/reopen. This includes the one-word confirm group, quiz stat, review log, card state, check-in, reward round, reward ledger and wallet balance 5. No new SRS/practice records were created.
- The normal-UI dailyNewWordCap=15 setting remains exact. Only the expected learning:last-location navigation bookmark changes; full records are retained rather than discarded.
- The original full-profile control remains at 1177 media, with every content table and installed metadata exactly unchanged. Its normal Settings refresh reports current.

### Real image consumers

All six formerly missing Chinese captions now appear in the starter DOM and exactly match the previously captured full-profile captions. None acquires an English figcaption. All 33 U05 image consumers retain exact served URLs, HTTP success, byte lengths, SHA-256 hashes and dimensions; the real resolver results are unchanged. Confirm remains the reviewed `99268c449270...` image. The draft/needs_redraw control captions remain their independently approved curriculum captions, not the nonapproved source captions. The full-profile card images and captions are also unchanged.

At 390×844, each of the six Chinese captions was reached by normal scrolling, with document width exactly 390 and the complete caption between y=0 and y=775. Screenshots were captured without hiding navigation or injecting CSS. The captured `navTop` field refers to the card's upper navigation, not bottom navigation, and is not used as a bottom-overlay assertion. Representative responsive and failure screenshots were visually inspected. This is desktop responsive coverage, not physical-phone testing.

### After evidence and limits

New after evidence remains alongside, without overwriting frozen before artifacts:

- `after-failed-ui.json/png`, `after-failed-requests.txt`, `after-failed-state.json`: actual normal-UI 503 failure and complete preservation.
- `after-unroute.txt`, `after-updated-state.json`: removed interception and recovered installed content. `after-updated-ui.txt` records the unsuccessful intended retry selector and must not be treated as manual-update success.
- `after-cards.json`, `after-images.json`, `after-resolver.json`, their screenshots and `after-responsive.json`: six captions, status controls, all 33 image hashes, resolver and 390px views.
- `after-final-state.json`, `after-reopen-state.json`, `after-current-ui.json/png`: retained content/progress through closing and reopening, and normal current-state refresh.
- `full2-after-state.json`, `full2-after-current-ui.json/png`, `full2-after-cards.json`: unchanged full-profile control.
- `inputs-after-start.json`, `inputs-after-end.json`, `verify-after.cjs`, `verify-after-result.txt`, `summarize-after.cjs`, `after-summary.json`: direct input rechecks and strict passing assertions. The original 107-artifact before inventory still verifies exactly.

All QA browsers are closed. Browser assertions passed with the explicitly stated automatic-recovery limitation. The separate complete technical regression remains pending and is not claimed to have passed by this report.

Final supplemental assertion: the full-profile control also retains every non-settings progress table and all non-navigation settings exactly; only its normal navigation bookmark is added. The other 142 pipeline inputs match before in both raw and normalized SHA-256, not merely normalized hashes. See `verify-final-preservation.cjs` and its result.
