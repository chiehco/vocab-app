# U01/U02 general-image runtime QA

Date: 2026-11-07. Tested commit: b23ffa69617d52f1fc6b9f64c377e97c330a7e28.

## Passed actual browser checks

One new isolated Chrome profile, separate from the U02 preservation profile and real browsing data, tested the local development server at http://127.0.0.1:5186. Chrome was closed after evidence capture. No product source or U02 text data changed, and no commit was made.

- Ordinary card `#/word/W000061`: bank replacement loaded at 1254×1254. Actual screenshot shows two seated shore characters and two boats. Exact English and Chinese captions match the integration proof.
- Ordinary card `#/word/W005669`: permissible replacement loaded at 1254×1254. Actual screenshot shows an open pale-blue gate, one passing character and one holding it. Exact English and Chinese captions match the integration proof.
- Actual image-clue quiz at `#/quiz?group=a0d6bf0f-5d04-4208-93d5-002cfca33a27`: both images and their exact Chinese captions rendered correctly, with the same HTTP asset bytes as the ordinary cards. The disposable two-word group was created and populated through the visible group UI. Permissible was answered correctly only in that isolated profile to reach bank. No real-user progress was touched.
- Authored card `#/vocabulary?level=LV3&unit=1&kind=word&item=LI-LV3U01-bank`: no illustration; unchanged sentence “We rested on the grassy bank and watched the water flow past.”
- Authored card `#/vocabulary?level=LV3&unit=2&kind=word&item=LI-LV3U02-permissible`: no illustration; unchanged sentence “Only small bags are permissible inside the exhibition hall.”

## Exact served assets

Each URL below was served from the local origin above with `?v=local`; HTTP response bytes were hashed inside the browser, not inferred from filenames.

- `/wordbeast/lv3-reviewed/W000061-bank-v2-9bd9d7283b45.webp`: SHA-256 `9bd9d7283b458d811690c5c0c2c6dd7b9134e887344eb6919e881e67d5c8f01a`.
- `/wordbeast/lv3-reviewed/W005669-permissible-v2-a5af5eaebfa9.webp`: SHA-256 `a5af5eaebfa9058347db55aa708d3c0bf01dc4481bee4000a11661667d5a467d`.

Bank captions: “The children sat on the river bank and watched the boats go by.” / “孩子們坐在河岸邊看船隻經過。”

Permissible captions: “The gate is open, and it is permissible for Doudou to pass through.” / “大門敞開，豆豆獲准通過。”

## Explicit coverage limits

The dynamic `#/wordbeast` route was opened separately. Its daily encounter began with retain (1/9), with no target-selection control. Neither target was observed there, and the archive/gallery stage was not traversed. Daily state, dates and internal selection were not modified to manufacture coverage. Thus dynamic WordBeast target rendering is **not runtime-verified**. The existing `src/features/vocabulary/lv3ImageRepairs.test.ts` covers shared asset/caption resolvers statically; that is distinct from actual consumer rendering. No static tests were rerun by this QA worker.

The historical static LV1 gallery is a separate published-unit-pair surface. Existing integration proof/tests establish that these two pairs are absent there, so no gallery update is required by these replacements.

SRS review and arena consumers were not exercised. This is development-server desktop-browser evidence, not offline-PWA, production deployment, or physical-phone acceptance.

## Retained local evidence

`output/playwright/lv3-image-repairs/` contains:

- `runtime-evidence.json`: lossless DOM text, exact routes, image URLs, dimensions and response hashes.
- `ordinary-bank.png`, `ordinary-permissible.png`: visually inspected actual card screenshots.
- `quiz-bank.png`, `quiz-permissible.png`: visually inspected actual image-clue screenshots.
- `authored-bank.png`, `authored-permissible.png`: authored-card boundary captures.
- `wordbeast-daily.png`, `daily.txt`: observed dynamic-route limitation.
- `verify.cjs`: exact proof-caption, hash, dimensions and authored-boundary assertions; passed.

The earlier `cards.txt` shell capture has console-encoding artifacts. Use the lossless `runtime-evidence.json` or `cards-ascii.txt` instead.
