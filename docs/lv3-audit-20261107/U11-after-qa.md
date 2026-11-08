# LV3 U11 AFTER QA

Status: after_runtime_qa_passed_with_existing_source_pending_and_release_blockers

## Verified scope

- Application commit 78b6f95da79ae7ec665a4a26bb5909d486e14ed6; tested HEAD d3efb7db993ccfad92ecc09b0d650e584c0a04bd.
- 212 curriculum cards,112 general cards and all384 actual tabs captured.497 fields across213 rows exactly match independently reviewed source expectations after update and reopen. Correct visibility classification:305 direct-visible,93 shared-mirror metadata,99 metadata-only.
- Complete six source documents match. All eight installed starter tables (26565 rows) plus meta match independently derived frozen BEFORE + source patches, never compiler/live-AFTER expected values.
- First updated and reopened readiness probes both passed. Ordinary retained-profile navigation only; no injection, clearing or forced sync/settings changes.
- 96 responsive routes (95 required plus actual-longest steady),241 views,506 checkpoint PNGs and1957 visibility samples at390x844. Every view reaches bottom; no page-horizontal-overflow or sampled text occlusion failure. Intentional efficient morpheme scroller supplemented by normal internal horizontal scrolling to reveal -ient.
- Ordinary Back and same-profile close/reopen passed;167 changed curriculum cards +39 general cards reopened, with497 exact fields/213 rows rechecked.

## Actual pixel review

All212 curriculum and112 general main-card PNGs actually inspected; all28 changed verb-form blocks readable. All34 active images additionally inspected in normal-scroll1280x1800 viewport supplements, with fixed navigation retained and complete image/caption visibility. No demonstrated image/caption mismatch.78 no-active placeholders are allowed.

55 selected responsive checkpoint PNGs were actually viewed, covering all24 null-ID cards, G001/G050/G068, actual-longest vocabulary/grammar and five general tab types, melt restriction, stable/debut forms, deaf/dumb warning, Bermuda translation and track-down note. One separate horizontal-scroll PNG resolves efficient suffix visibility. This is not a claim that every pixel of384 tabs or506 checkpoint PNGs was visually certified. Exact viewed-file ledger: after-visual-review-index.json.

Original full-page captures retain fixed navigation crossing upper headers and some main-card image/placeholder/section areas. Normal-scroll supplements resolve the stated image and selected-content visibility gaps. No CSS, DOM content or navigation was hidden. All137 vocabulary curriculum cards retain example-pending status;24 null-ID supplements remain unlinked/read-only in content.

## Preserved state and evidence

Eight snapshots compare all9 Content stores,14 Progress stores and both web-storage sets. Only learning:last-location may differ. Original2 groups,2 reviews,wallet10 and daily new-word cap15 remain.144 product hashes,7 technical test/helper hashes,227 fixed source evidence pins and18 unchanged registry/resolver files are rechecked. Original U11 BEFORE seal remains verified. No product/tests/helper/chain/ledger/technical report changes, new groups, answers, SRS/reward/practice/image-quiz actions, service restart, commit,push or deployment.

## Retained failures and checker corrections

1. The original screenshot guard persisted on the Playwright page across run-code calls and rejected curriculum02 screenshot output. That failed attempt remains; a new local capture closure and unique retry directory succeeded. The first correction-preparation script syntax error also remains. No product UI change.
2. Original field checker incorrectly classified seven examples.sensePos fields as directly visible. Unchanged WordDetailScreen.tsx line290 only renders this label when meaningHint is present; all seven frozen expected rows have meaningHint:null. Original seven failures remain. New source-backed classification verifies their exact installed values as metadata, without inventing a visible POS label or changing expectations.
3. Original image expectation preparation hashed UTF-8-decoded binary images. Original34 HTTP-hash checker failures remain. Corrected expectations derive only from sealed U11 BEFORE http-images.json and raw archived image bytes; each incorrect hash is reproduced by the UTF-8 conversion. New verifier confirms34 raw HTTP bytes/hashes,decode,dimensions,path and captions. No AFTER-derived expected hashes.

## Source and release limitations

- Ten rare/mixed senses remain unconfirmed; dumb hereditary-causation and foggy specific-cause/slow-response English definitions remain unchanged pending source verification.
- All 24 null-ID/read_only entries, original review statuses, unknown formal-exam source claims and unverified phonetics remain unchanged.
- Nine active-image English captions are originally absent. All 78 no-active words are permitted by current specification; no confirmed image/sentence mismatch requires new artwork.
- Existing U56/puppet five-second failures and original whole-lint failure remain LV3 release blockers. BEFORE is not AFTER, phone/PWA/offline acceptance or publication.

Nine originally absent English captions remain absent: resist, injury, resistant, reservation, preserve, scandal, reputation, trade, impressive. Retained dictionary mixed-label observations are documented separately; impress keeps its baseline noun-like gloss component while appending explicit verb meanings, so its entire meaningZh is not described as unchanged.

Technical phase remains completed_with_release_blockers: exact51 files/1767 tests =1760pass,3 original5000ms timeouts,4 existing opt-in skips. U11 70/70,tsc,changed-file lint,build and parity passed; whole lint,U05/db-helper timeouts and unresolved U56/puppet intermittency remain publication blockers. AFTER acceptance does not clear them.

Not tested: physical phone,PWA/offline update,audio,production deployment. No publication performed.

## Evidence

Runtime: output/playwright/lv3-u11/after-preparation/. Summary: after-final-summary.json. Actual-pixel ledger: after-visual-review-index.json. Selected artifacts/provenance: resume-v1/runs/u11-run-01/. Final corrected verifiers: verification-check-01/. All failed/superseded artifacts retained. Capture index: U11-after-capture.json; seal: after-seal-index.json.
