# U09 runtime AFTER QA

## Result and scope

Scoped runtime verification passed at frozen HEAD 4181d4859a838117cc29d70f54e05b410ec74848 on branch content/lv3-unit-audit-20261107. The normal Vite app was used at http://127.0.0.1:5186 with the retained QA profile. No product or test changes, commit, push or deployment were performed during this capture.

- Opened all 171 curriculum items (108 vocabulary, 63 grammar), 81 general cards and all 278 dynamically enumerated tab pages.
- All 394 changed fields across 183 rows match independently frozen expectations. Component DOM directly verifies 241 fields and the displayed subset of 16 verb-form records. Another 64 shared mirrors and 73 metadata-only fields are explicitly separate from direct visible rendering. Four changed notes were verified in the actual note components.
- All 254 selected formal rows match: 81 words, 115 examples, 30 notes, 13 senses and 15 media rows. All eight installed starter tables match independent whole-table expectations derived from the sealed baseline and the 56 approved changed full rows. This is not full-pack acceptance.
- All 21 active images returned HTTP 200 and matched expected bytes, dimensions, decode and captions. The separately approved persuasive image is the sole intended image difference from original U09 BEFORE. The 60 permitted no-active-image cases remain unchanged.
- Responsive capture covers 51 routes, 96 views and 202 screenshots at 390x844, including all 27 null-ID cases and actual longest text cases. Recorded overflow and occlusion checks found no failures. This is desktop emulation, not physical-phone acceptance.

## Ordinary update lifecycle

The first complete snapshot at 2026-11-08T07:03:10.796Z still contained the old installed pack. Six not-ready probes are retained. At 2026-11-08T07:03:26.336Z, installed hashes and all 254 selected / 56 changed full rows matched the independently expected values. Full-card captures began only after that confirmation. No manual update, internal update API, data clearing or injection was used. Ordinary same-profile reopen was ready on its first probe.

## Navigation, persistence and preservation

Back restored the stop route on the card tab. An explicit ordinary reselect of the meaning tab reproduced identical text. Automatic tab persistence is not claimed. After closing and reopening only the audit browser session, all 394 fields / 183 rows still matched. All tabs of eight representative general cards and four curriculum cards reproduced identical sections and text.

Seven complete snapshots record all nine ContentDB and fourteen ProgressDB stores, using a single readonly transaction per database. The most recent sealed persuasive final-state is the protected-progress baseline. Two groups, two review records, wallet 10 and daily cap 15 remain. Every non-navigation progress/settings value and local/session storage is preserved; only learning:last-location changes through normal navigation. No group, answer, reward, SRS or image-question action was performed. Both console checks recorded zero errors and zero warnings. The audit session is closed and the unrelated LV1 session remains open.

All 144 canonical input raw/LF hashes and byte lengths are unchanged across capture. The original U09 BEFORE 805-file seal and two documents, persuasive 94-file seal, original source-review seals and 114-file preparation package remain unchanged. No final runtime assertion failed. Preparation-only diagnostics remain separately recorded.

## Limits

- All 108 curriculum examples remain pending, and all 27 null-ID cases preserve read-only fallback. No textbook questions or images were invented.
- Metadata-only fields include 64 provenance enums, eight example POS labels with no meaningHint and the France blankSentence. Shared mirrors include 53 target meanings and eleven primary POS fields; matching visible mirrors do not prove those fields directly rendered.
- Only base, past and past participle are visible for the 16 verb-form records; sourceRef and status remain metadata.
- No physical-phone, PWA/offline, full-LV3, full-pack or production-release claim is made.

## Evidence

Authoritative verification: output/playwright/lv3-u09/after/after-verification.json
SHA256: bad9c2f5bdace5f6d61126f9051e4027fe19f80fe32ded8c86ab263ab6a4f728

The capture contains 765 screenshots. Representative images and observations are listed in after-visual-review.json. U09-after-capture.json records verification and snapshot identities. The separate after-seal-index.json seals all runtime evidence and these two new documents.
