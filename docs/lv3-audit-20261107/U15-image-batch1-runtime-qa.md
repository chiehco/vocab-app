# U15 image batch 1 local runtime QA

Qualified checkpoint only. Not deployed and not U15 complete.

Base HEAD b10483a4a4b57e77de928951935c54b77c6ffce1; new image product files are fixed uncommitted WIP, not represented by this commit. All 5080 protected source/WIP files and 2408 build files match.

Three selected original examples for mobile, vivid and complain render correctly in general cards, all four tabs, original caption/meaning pages, Back, normal original-profile reopen and actual service-worker offline reload. All nine content stores and fourteen progress stores retain exact rows; storage unchanged except normal navigation bookmark.

96 raw screenshots were actually pixel reviewed: 18 initial online, 31 initial responsive, 16 lifecycle, 31 reopened responsive. First responsive check failed because of the normal staged-update toast; original failure is preserved. After normal reopen, supplemental 390x844 checks cover six routes, fifteen views and thirty-one checkpoints without overflow or text occlusion. No caches/profile/DB were cleared.

## Retained limitations
- Only selected first example of mobile/vivid/complain is illustrated; other three original examples remain unillustrated.
- U15 curriculum entries remain text-only with example-pending; not claimed repaired or complete.
- Browse thumbnails map to correct assets but object-fit crop cuts mobile luggage/workcase, vivid adult remembering figure, complain empty-table/lower scene. Main card scenes are complete. Thumbnail semantic completeness is not passed.
- Initial update toast obscuration remains a captured lifecycle UX limitation; it naturally disappears on normal profile reopen.
- Existing curriculum level picker rightmost button clipped in its internal horizontal rail; no horizontal-swipe claim.
- Independent pre-browser full tests retain two timeouts; not a full-green claim.
- No physical phone, audio, deployment or whole-unit acceptance.
- All prior U15 text/source/meaning-review limitations remain. Only this fixed image WIP and its three general-card consumers were tested.

Original text AFTER seal was rechecked unchanged. Profile is closed. Preview PID 22052 remains at http://127.0.0.1:5186 with the pinned batch1 production build for parent coordination. See JSON and sealed evidence for exact pins.
