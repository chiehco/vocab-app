# LV5 U1 and U3–U6 printed metadata repair

The existing text curricula omitted printed classifications on related vocabulary.
Original photos were checked page by page before this patch. It adds 359 literal
labels and preserves 15 unmarked rows, including inline spelling alternatives.
The independent source QA reports for U1, U3/U4 and U5/U6 were reconciled against
the original photos rather than used as a substitute for photo inspection.

| Unit | Related labels restored | Unmarked rows preserved |
| --- | ---: | ---: |
| U1 | 75 | 4 |
| U3 | 76 | 4 |
| U4 | 69 | 2 |
| U5 | 84 | 3 |
| U6 | 55 | 2 |

Three directly starred usage lines receive source metadata only: `in remembrance
of...`, `take office`, and `a grain of...`. Compiled grammar retains its existing
schema. U4 also restores the printed rule requiring `the` before administration
and the president's surname afterward. The Biden phrase remains a quotation of
the textbook's example. U1's comment noun meaning is corrected to 評語; the
commentary headword stays 評論. Incorrect star claims for unstarred neighboring
lines in source metadata are corrected.

Base: `3046f8941cade1c51e4e61290ffa630cb73207fd`. The original commits remain in
history. The checked per-row fixture is
`scripts/sources/LV5PrintedMetadataRepair.json`, with original photo SHA-256 values,
proof receipt SHA-256 values, exact field differences and literal empty rows.
Photo inspection evidence and validation logs are kept in the existing external
LV5 evidence folders.

All learning item IDs, official word mappings, counts, order, source pages, printed
headword numbers and practice restrictions stay fixed. The mother dictionary,
starter pack, compiler, app behavior, examples, images and questions are unchanged.
This patch is carried into later LV5 branches before further source acceptance.
