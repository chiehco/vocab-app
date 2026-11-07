# U04 replace image runtime QA

Date: 2026-11-07. Image integration commit: ca4cb389d35e09ed2c3547bbed0232709e43d705. Local development origin: http://127.0.0.1:5186. This verification is independent of the pending U04 text-field audit/apply.

## Actual browser results

A new isolated Chrome profile was created exclusively for this test. The U04 before/after preservation profile and real-user browser data were not opened. The existing development server was reused. No application code or source data was edited, and no commit was made. The QA browser is closed.

- Ordinary card `#/word/W002723`: the actual image shows Doudou fitting a new wooden wheel to a wooden cart, with the broken wheel on the ground. English: “Doudou replaces the cart's broken wheel with a new one.” Chinese: “豆豆把推車的破輪子換成新的。” Both exact captions passed automated assertions and visual inspection.
- Actual image-clue quiz `#/quiz?group=05f4b3cd-7a16-4083-b07e-7ac05d62c5a0`: a disposable one-word group was created and populated through the normal visible UI, then its practice link and 看圖喚名 option were used. The real question displayed the same new wheel image and exact Chinese caption, with 換成 highlighted. Replace was selected and submitted through the normal two-click answer flow. The UI reported a correct answer and +5 coins. This is actual consumer coverage, not a resolver-only test.
- After closing Chrome and reopening the same isolated profile, the ordinary card still displayed the same exact bilingual captions, asset hash and natural dimensions. The recorded quiz/progress/reward tables remained identical to the post-answer state.
- Authored curriculum route `#/vocabulary?level=LV3&unit=4&kind=vocabulary&item=LI-LV3U04-V011`: no image, with 例句待核對。 The general-card image was not forced into this text-only curriculum card. This run checked the replace authored card, not every U04 authored card again.
- 390×844 desktop-browser responsive subset: document scroll width was exactly 390px. An initial full-page capture showed the fixed bottom navigation near the Chinese caption. Normal scrolling moved both captions fully above that navigation and kept the image visible. The scrolled viewport screenshot was inspected. This is not a physical-phone test.

## Served bytes and preservation

All three ordinary/quiz/reopened captures fetched the actual displayed image URL and independently hashed its HTTP response body:

- Asset: `/wordbeast/lv3-reviewed/W002723-replace-v2-cebee8173ee9.webp?v=local`
- HTTP 200, 609410 bytes, natural size 1254×1254.
- SHA-256: `cebee8173ee9d2a633e68212669b6c47178dbbe17cd9a2c69ee7b83e937fe40c`.
- Existing `public/wordbeast/s/W002723.webp` remained present, SHA-256 `20fad955973dbaad0769663d62e354571894d5dd5d6ba035fa70a71aa216f8a3`.

This worker made no sentence or draft-example edits. The two draft examples are not asserted as runtime image consumers by this report.

## Disposable progress and normal changes

Before navigation/practice, all tables in VocabProgressDB were empty, including SRS card states, review logs, quiz stats, groups, wallet, ledger and rounds. No storage, date, question selector or database write was injected.

One correct normal image-quiz answer created one replace quiz-stat row (asked 1, correct 1), one review log (`mode: quiz-image`, `schedulingApplied: false`), a new-state replace card with `practicePending: true`, one check-in, one +5 answer ledger entry and a wallet balance of 5. The new disposable group contains only W002723. These progress/reward rows were exactly preserved across close/reopen. Normal navigation also writes the learning:last-location setting. This does not establish existing-user migration or a completed SRS review flow.

## Coverage limits

The dynamic `#/wordbeast` daily route was opened, but selected retain (1/9), not replace, with no target-selection entry observed. Its selection and clock were not modified. Replace on this dynamic consumer is not runtime-verified; shared resolver coverage, if established separately, must remain labeled static. No static unit suite was rerun by this worker. SRS review and arena consumers were not exercised. No production deployment, offline-PWA or physical-phone acceptance is claimed.

## Evidence

Local evidence is retained in `output/playwright/lv3-u04-replace/`:

- `ordinary.json`, `quiz.json`, `reopened.json` and matching PNG screenshots: exact DOM copy, served image status/hash/size and actual consumer visuals.
- `initial-state.json`, `post-quiz-state.json`, `reopened-state.json`: isolated baseline and normal progress changes.
- `authored.json` / `authored.png`: curriculum boundary.
- `responsive.json`, `responsive-390.png`, `scrolled.json`, `responsive-scrolled.png`: narrow desktop viewport and successful scrolling.
- `daily.json` / `daily.png`: dynamic-route limit.
- `verify.cjs`: passed exact-caption, hash, dimensions, initial-empty-state, reward, persistence, authored-boundary and scrolling assertions.

An initial authored-route attempt used a nonexistent item ID and failed before capture. The final authored capture used the actual route manifest ID above and passed. Evidence JSON was written directly from UTF-8 process output; terminal display encoding is not the canonical text record.
