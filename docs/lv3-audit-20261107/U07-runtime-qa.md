# U07 runtime QA: attempt 1

Status: **not fully passed**. One actual content/render mismatch remains for observe. Ordinary cards, installed content, image consumers and profile persistence were checked; the two target image questions were not executed.

## Frozen inputs and method

- Frozen applied HEAD: efe2da1f65ee2d0ee6d312537b6bd7acc1231bf6.
- Transaction: output/lv3-audit-20261107/transactions/20261107T230053068849Z/transaction.json; committed; raw SHA-256 1a165632bca52be31b2daa96f8cf8563b3fd4b6dcc88d0a48ee778246ad900af. The committed U07-application.json binds the receipt and the five committed product files. An output receipt need not itself be Git-tracked.
- Ready seal: 40530f567c4bc3f8f51e592748503fcc6585b11f1698a2c6a4e5bad2be20c0ac. Scope hash: 2d976360eace86bcc313f40b1edf74264d78ab11ff17e1ea420d1abeea548da9.
- HTTP starter pack raw/LF SHA-256: 8da05cd9cbadc91fb188781b787acf52f7534cc3fb6b3e35e36200e2af786f72.
- Output: output/playwright/lv3-u07/after-preparation/. Independent prepared inputs and original gate/helpers are retained under prepared-originals/ and as the original files. Effective gate v2 validates the receipt, committed application and five committed products. No receipt/product edit was made.
- The 113-file preparation index and all 804 before artifacts were rehashed at entry. The 144 inputs were independently byte-read at start and end; raw SHA and CRLF-to-LF-only SHA are separately recorded. All 144 were unchanged during this attempt.
- Browser session lv3-u07-after-audit used only the isolated lv3-u05-confirm-20261107-independent profile at http://127.0.0.1:5186/. No IndexedDB injection, profile clear, forced content install, product patch, test, build, commit or push was performed.

## Normal update and real runtime evidence

The first readonly profile snapshot at 2026-11-07T23:11:02.903Z still exactly matched the old ContentDB. Normal background synchronization completed before the confirmed snapshot at 23:11:19.353Z. Only words/examples/meta changed. The probe waited readonly; it did not invoke an update control or install helper.

All 171 changed fields matched the independent accepted values in the installed database or imported curriculum module. Eight installed collections matched independent complete sorted-row hashes: 5,779 words, 7,436 examples, 4,111 notes, 1,128 media, 771 senses, 3,696 morphemes, 31 relations and 3,613 exam priorities. The five full HTTP collections independently matched expected rows (6,090 words, 7,871 examples, 4,290 notes, 772 senses and 1,177 media). This is serialized row/hash evidence, not physical IndexedDB file-byte equality. Curriculum is a separate imported module, not a ContentDB table.

## Full card and field coverage

- Actually opened 153 textbook items: 100 vocabulary and 53 grammar. All remained text_only/read_only without authored textbook images, examples or questions.
- Actually opened 84 unique general cards and all 282 dynamically enumerated tabs. No baseline tab disappeared and no additional tab appeared. Five tab types were observed: 字卡、字義、相關詞、搭配、記憶法.
- Saved each captured main DOM, URL/identity, timestamp, component metadata and screenshot. 519 main desktop screenshots + 124 normal responsive screenshots + 8 textbook-consumer screenshots + 5 ordinary/Back/reopen screenshots = 656 runtime PNGs.
- Of 101 planned directly rendered fields, **100 passed and observe usagePatternZh failed**. Twenty verbForms passed visible base/past/past-participle checks; status/sourceRef remain metadata evidence. Twenty-four shared mirrors and 26 metadata-only fields were not falsely attributed to DOM merely because another source field displays the same text.
- The 20 new forms and 9 existing forms matched installed metadata and actual visible form nodes. The 15 null-linked supplements remained null and visibly used the supplemental fallback. All 52 unaffected grammar rows matched the retained row hashes and their headings were visible. G036 visibly explains cropped and the original textbook copped typo.
- All 115 existing example EN/ZH sentences were preserved and found in their actual rendered sentence nodes. Blank sentences, answers, status, type and difficulty were independently preserved as metadata. Existing notes/senses/media/morphemes/relations/exam-priority tables were unchanged.

## Open defect: observe Chinese collocations

Identity: words W002582 / observe / usagePatternZh. Both the independent expected value and installed value are correct as stored, but the expected Chinese is absent from the actual 搭配 DOM.

- English has 2 semicolon-delimited entries: observe N closely; observe a rule/custom/holiday.
- Chinese has 3: 仔細觀察……；遵守規則或習俗；慶祝／紀念節日.
- src/features/vocabulary/usagePattern.ts splits both on semicolons (lines 6–7), then only returns Chinese when counts align (line 16, used on line 19). UsagePatternList.tsx renders the optional Chinese (line 18). Thus both visible entries have English only.
- Canonical failure detail: after-observe-display-failure-v2.json. Complete installed word row, actual DOM, full renderer-source copies and relevant line numbers are retained. Screenshot: after-tab-W002582-3.png. The first derived failure JSON had only a screenshot-name typo and is retained unchanged; v2 corrects that pointer.
- after-dom-metadata-verification.json and its first failed checker logs remain unchanged. This field remains direct_dom with domPass=false. It was not relabeled metadata-only to conceal the defect.

## Images and textbook consumers

All 26 actual general-card images returned HTTP 200, matched expected resolved paths and hashes, decoded, and had nonzero dimensions. Twenty-five active image byte streams were unchanged. Attraction used the approved new 1,254×1,254 WebP (366,450 bytes), SHA-256 3fc80dd19b36c698552dc530d1f3becee61867478774bf99d13f3c4f203a5079. All 26 old source image files, including the replaced original attraction file, were also retained byte-for-byte.

The attraction runtime screenshot visibly retains four characters and the central bean's intended skewer/chest arm and right-side arm, without the extra exterior arm. Its original English and Chinese captions remain unchanged. Observation retained the same image, visibly consistent with paired-barrel binoculars; its English is now “Doudou uses binoculars for close observation of the bird in the tree.” Its Chinese remains “豆豆用望遠鏡觀察樹上的小鳥。” Other captions, including execute's pre-existing missing English, were preserved exactly.

All four attraction textbook consumers (LV3U07-V047, LV3U16-V059, LV4U11-V084, LV4U03-V042) and four observation consumers (LV3U07-V093, LV4U02-V001, LV5U25-V097, LV5U03-V089) were opened. Their actual DOM had no images and their independent module rows remained text_only. Static resolver matches alone were not used as runtime proof.

## Narrow viewport and persistence

Twenty-one representative routes, 59 tab views and all five tab types were captured at 390×844 with ordinary scrolling and unchanged page chrome/navigation. No horizontal overflow or sampled text-center occlusion was found. The long G036 correction wraps and remains readable after normal scrolling. This is desktop responsive emulation, not physical-phone testing.

Normal browser Back returned from observation to attraction. The QA session was then closed and reopened using the same isolated profile. Attraction and observation both displayed the same expected image bytes and exact captions again. Snapshot times: pre-close 23:22:26.100Z, reopened 23:22:57.505Z, final 23:23:07.962Z on 2026-11-07 UTC.

Every original non-settings progress table and every old row remained exactly equal throughout all nine snapshots. The original confirm/puppet groups and 2 review records remain; wallet is 10 and dailyNewWordCap is 15. localStorage/sessionStorage remained empty. Only learning:last-location changed through normal navigation (final: observation). Confirmed ContentDB content did not change during navigation or restart.

## Unexecuted activity and limits

The attempted command to create the first persistent QA group was rejected before execution. It was not retried or routed around. No QA group, image question, answer, reward or review record was created. Stage names post-activity/pre-activity are retained script labels; their snapshots confirm **zero** activity delta. Two target image-question/thumbnail surfaces are therefore **not verified** in this attempt, and the prepared activity checker was not run or claimed to pass. See after-blocked-activity.json and after-progress-readonly-verification.json.

Only the lv3-u07-after-audit session was closed at the end. The unrelated existing LV1 headless session was left untouched. Both captured browser console logs contain only the React development-tools informational entry. This report makes no full-pack, physical-mobile, offline, full-practice or SRS-scheduling claim.

## Archive and next step

Canonical local evidence: after-attempt1-summary.json, after-dom-metadata-verification.json, after-progress-readonly-verification.json, after-preservation-verification.json, after-update-transition.json, after-input-stability.json, after-observe-display-failure-v2.json and after-seal-index-v2.json. The seal indexes all attempt files and binds this report separately; it rehashes the original 804 before artifacts and their unchanged index (90d70213941e3defa38d58fa346f7462b8197826ff88572fae609a87f09856d6).

Preserve this entire attempt. Fix the observe content/render alignment through a separately reviewed transaction, then capture a new after2 directory under a new frozen window. Do not overwrite this failed attempt or mark U07 fully reviewed on its basis.
