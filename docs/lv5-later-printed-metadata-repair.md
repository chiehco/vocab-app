# LV5 photographed source metadata repair

The textbook import dropped printed labels from related and usage rows. This
cumulative repair restores each literal label using independently observed
original photographs, preserving truly unmarked rows and the existing grammar
schema. The fixture records photo hashes, explicit numbered-group evidence and
exact source/compiled differences.

Adopted units in this revision: U7, U8, U9, U10.
The U1/U3-U6 repair is inherited through d3dc78cca72d94ef8812ee81184c2cdd92219f7d
from f5c89aaa2ac2946f6318b671910b95eab3916aae. Original commits and frozen QA
evidence remain available. Corrected source acceptance uses these exact repair
commits; historical runtime results remain separately recorded.

The mother dictionary, mappings, learning-item IDs, counts, ordering, images,
examples, question pools, starter pack and compiler stay unchanged in this
metadata repair. Source-only usage markers do not add a compiled grammar field.
Existing null mappings stay readable and excluded from formal pools. The current
textbook UI does not render printed labels or numbers; this repair validates
their source, compiled vocabulary and frozen-bundle values without new UI.

U8 also corrects the stale correction-note spelling 撇硬幣 to 擲硬幣.

U9 restores the photographed murmur noun 低語聲, retaining both verb glosses.
