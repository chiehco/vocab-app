# U05 confirm image runtime QA

Date: 2026-11-07 UTC. Verified checkout HEAD: `4b4f1ee6230d9474f4595e97bcb0ae2770b9489f`. Local development origin: `http://127.0.0.1:5186`.

This is the confirm image-consumer verification only. Pending U05 textbook text edits and unrelated caption/builder investigation are outside this report. No product code, source manifest, builder, workbook or existing user progress was changed. These QA checks did not commit, push or deploy changes.

## Actual consumer results

- Ordinary card `#/word/W002185`: displayed the new completed puzzle image. Visual inspection showed three blue pieces joined on one flat plane, with empty hands and Doudou looking at the puzzle. Exact English caption: “The puzzle piece fits perfectly, confirming that Doudou has placed it correctly.” Exact Chinese caption: “拼圖正好吻合，豆豆確認這一塊放對了。”
- Actual group image quiz: a new empty group was created through the normal visible UI, searched for confirm, and populated with the ordinary W002185 card only. The group’s “單字自由練習” link and “看圖喚名” option produced a real confirm question. It displayed the same new image and exact Chinese caption, with 確認 highlighted. Confirm was selected and submitted using the normal two-click answer flow. The UI reported 答對了, 答案已保存 and +5 coins.
- Close/reopen: Chrome was closed, then reopened using the same dedicated QA profile. The ordinary card still showed the same image, exact bilingual captions, served bytes/hash and dimensions. Quiz/progress/reward records were exactly preserved.
- Responsive subset: at 390 × 844, the document width was exactly 390 px. Normal scrolling moved the image and both complete captions into view above the fixed bottom navigation. No CSS was injected and the navigation was not hidden. The scrolled viewport screenshot was visually inspected. This is desktop-browser responsive coverage, not a physical-phone test.

## Served bytes and retained original

The actual ordinary, quiz and reopened image URLs were fetched and independently SHA-256 hashed in the browser:

- Asset URL: `/wordbeast/lv3-reviewed/W002185-confirm-v2-99268c449270.webp?v=local`.
- HTTP 200; 57,484 bytes; natural dimensions 1254 × 1254 in all three consumers/captures.
- SHA-256: `99268c4492700f1d99c51c8b03143dd1aebf704f45451feb90202a4360f29d2d`.
- Original `public/wordbeast/a/W002185.webp` remains present with SHA-256 `a77d2e67e070921bf85de53fed7460441bc0124c46257ac016a04762643bcc9c`.

The same profile was reopened without clearing storage or cache, and no stale original image appeared. The development origin reported no service worker registrations and no Cache Storage entries. The later performance-resource query returned no image entries, so this report does not claim a measured memory/disk-cache hit, production service-worker update, offline-PWA update or old-version migration.

## Authored curriculum boundaries

All four exact authored routes were opened in the real browser. Every selected confirm article showed no image and “例句待核對。” The general image was not forced into these cards:

- LV3 U05: `LI-LV3U05-V034`, 34/112, source page 50.
- LV6 U08: `LI-LV6U08-V060`, 60/127, source page 72.
- LV6 U14: `LI-LV6U14-V072`, 72/115, source page 133.
- LiveABC Basic U05: `LI-LIVEABC_BASICU05-V011`, 11/15, source page 31.

Read-only source inspection independently found all four records without `illustration` or `originalExample`. LiveABC was checked in the actual array source, `src/features/direct/liveabcBasic.json`. These are runtime checks plus source checks, not static-only claims.

## Isolated state and normal changes

A fresh dedicated QA Chrome profile outside the watched checkout was used. The U05 before profile, prior U04 profile and real-user profile were not opened. Every initial VocabProgressDB table was empty. No direct database writes or progress injection, clock manipulation, selector injection, storage reset or seeded progress were used. All database inspection transactions were read-only.

Normal UI interaction created:

- One group (`3b907549-ce21-4902-9e18-e72eb97c24ae`) containing only W002185 and no authored item IDs.
- One confirm quiz-stat row: asked 1, correct 1.
- One `quiz-image` review log with `schedulingApplied: false`.
- One new-state confirm card with `practicePending: true`, one check-in, one reward round, one +5 answer ledger row and wallet balance 5.

All progress/reward tables, including empty tables, were compared exactly against the post-answer snapshot through reopen and final inspection. The only excluded table was settings, where normal navigation updates `learning:last-location`; the complete before/post/reopened/final records are retained for review. App-local date fields were 2026-11-08 while UTC timestamps were 2026-11-07; the clock was not changed. This was one practice answer, not an SRS scheduling exercise or a completed end-of-round rewards flow.

## Startup issue and limits

An initial disposable profile placed under the watched checkout encountered a 60-second navigation timeout and blank page with repeated aborted requests. The existing Vite listener and HTTP 200 response for main.tsx were confirmed. Closing only that QA session and starting a second fresh dedicated profile outside the checkout allowed normal operation, with stable subsequent pages. This is consistent with a profile/watch interaction, but no direct watcher causal trace was captured. Both profiles were preserved; the initial empty-state record and startup observations are separate from the successful acceptance profile.

The natural daily route `#/wordbeast` selected retain (1/9), not confirm. It was not answered, forced or rescheduled. Confirm on the daily consumer remains unverified. Arena and SRS consumers were not exercised. No full test suite, production build, production deployment, physical-device, Safari/Firefox or offline-PWA verification is claimed here. The QA browser is closed.

## Evidence

Evidence is retained in `output/playwright/lv3-u05-confirm/`:

- `ordinary.json/png`, `quiz.json/png`, `reopened.json/png`: exact DOM copy and actual HTTP byte/hash/dimension checks.
- `initial-state.json`, `post-quiz-state.json`, `reopened-state.json`, `final-state.json`: read-only QA state snapshots.
- `authored.json` and four `authored-LI-*.png` files: actual curriculum boundaries; `source-refs.json`: exact source records.
- `responsive.json`, `scrolled.json`, `responsive-390.png`, `responsive-scrolled.png`: 390 × 844 layout and normal scrolling.
- `daily.json/png`, `cache.json`, `original-asset.json`, `startup-note.json`, `initial-stalled-profile.json`: limits and preservation evidence.
- `verify.cjs`: passed exact-caption, served-byte/hash/dimension, initial-empty-state, only-confirm group, +5 reward, progress persistence, four source/runtime boundaries and responsive-scroll assertions.

An initial curriculum capture waited for a level-one confirm heading, while the actual card heading is level two. The corrected captures above completed for all four exact references. JSON artifacts are UTF-8 and are the canonical text evidence, independent of terminal display encoding.
