# Verified translation followups: U11–U12

Two confirmed translation errors are corrected in `sentenceZh` only. All English, cloze, answers, POS, hints, review states and other fields retain the isolated branch's exact prior values.

| Unit | Word / example | Previous Chinese phrase | Corrected phrase | Modified / reopened |
| --- | --- | --- | --- | ---: |
| U11 | tough / EX4c5b9769 | 高三學生 | 高中學生 | 1 / 1 |
| U12 | purchase / EX299bccf8 | 三件以上商品 | 超過三件商品 | 1 / 1 |

Senior high denotes the school stage rather than only the graduating class. Collins and American Heritage definitions were directly rechecked. More than three is strictly greater than three; Collins and Hanlin's explanation of inclusive 以上 were directly rechecked. These sources support the specified minimal translation changes, not a claim that the textbook original was independently verified.

- Exact isolated comparison base: `a57f7283f400503c1634b6b8278483be004d2c41`.
- Original isolated audit base: `d26603868f60e60069d29ea00613d2e86f94d7bd`.
- Branch: `content/lv1-verified-followups-20261105`.
- Research snapshot: `3a15481281a7e8aa34f7c5f8942dc2cb34e2af57`; only the two definite candidates were used.
- Main comparison: requested `3b14fc8ac56ca58dd715a088340d913e5230a0b7` and remote head observed at preflight `26cc432853d13617f19f843c430ccd3ee9543733`.
- Field manifest: `LV1-U11-U12-verified-translations-patches.json`.
- Two-entry source allowlist and exact row comparisons: `VERIFIED-FOLLOWUP-TRANSLATION-SOURCES.json`.
- Recoverable receipt: `receipts/LV1-U11-U12-verified-translations-patches.json`.
- Verification record: `validation/U11-U12-verified-translations.json`.

Both compared main revisions retain the same English and old Chinese, so neither correction was already applied at preflight. Purchase has `sensePos: n.` in this isolated older snapshot and `v.` in both newer main revisions. This batch preserves the local `n.` and records the difference. Reconciliation must apply only `sentenceZh` with the exact ID, English and Chinese guards; it must preserve main's newer `v.` and every other current field. Full before/after receipt rows are recovery evidence, not replacements to copy over main. Inverse tests explicitly preserve either current POS value.

Only the two exact translations and the necessary metadata hashes changed in product data. Full example count remains 7,871; starter example count remains 7,436, and both translations are present there. All word data, including original 31 forms, prior 99 form followups and house, remain byte-identical after LF canonicalization. Original five translation source facts and all prior form sources remain exact. Fixed historical hashes, duplicate detection, immutable row identities and omitted-starter handling were retained. Negative tests reject unknown IDs, changed English, mismatching old Chinese, unverified sources and extra field changes. The old five-source and 99-form-source hashes are pinned independently.

The normal Settings → Update dictionary data flow reported success in the existing isolated profile on port 5187. No database import, clearing, reset or profile replacement was used. Before card navigation, all fourteen progress table counts and payload hashes matched the baseline, including one nonempty table. The 131 protected word rows and five original translation rows retained identical hashes. After normal card navigation, thirteen other progress tables and every setting except `learning:last-location` remained exact; the existing bookmark handler advanced that one setting to purchase. This is isolated-profile evidence, not a claim about real user devices.

Both exact example rows were reopened in the meaning tab, visually inspected in screenshots, and compared with saved IndexedDB rows including every unchanged field. Both original images decoded, and their unchanged captions were checked: tough depicts a strict coach during training; purchase depicts an online phone-case purchase. Both usage panels were opened. Six screenshots plus the normal-update screenshot were inspected. No image was regenerated, no image binding changed, and no missing displayed image was found in these two card views. This supplement does not certify separate illustrations for every example or approve whole cards. Existing purchase pending labels remain visible.

Local checks passed: thirteen Python write-boundary tests, four Vitest files / twenty-five tests using one worker and the unchanged default timeout, typecheck, lint, build, exact full/starter delta verification and publication scan. The full local suite was not run. The new pushed head's complete CI result must be reported separately; this document records validation before first push.

Next unprocessed form supplement remains U08 people (`W000635`), subject to a new latest-field/source check. U08+ form candidates and U14 queued research are outside this batch. No merge, deployment, forced push, shared configuration change or previously denied cleanup/relocation was performed.
