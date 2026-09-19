"""Import Unit20 only after verifying exact approved source text and image hashes."""

from pathlib import Path
import hashlib
import json
import shutil
import sys


ROOT = Path(__file__).resolve().parent.parent
SOURCE = Path(sys.argv[1]).resolve()


def read(name: str):
    return json.loads((SOURCE / name).read_text(encoding="utf-8"))


pack = read("unit20.json")
current = read("unit20-review.json")
approval = read("approval.json")
assert approval == pack["approval"] and approval["status"] == "approved"
assert approval["revision"] == "20260918-LV4U20-FULL-REVIEW-5"
assert len(current["cards"]) == len(approval["cards"]) == 46
assert len(pack["learningItems"]) == 82
assert len(pack["questions"]) == 128
assert len(pack["relatedNotes"]) == 71
assert len(pack["assets"]) == 42

approved = {item["reviewId"]: item for item in approval["cards"]}
learning_items = {
    item.get("approval", {}).get("reviewId"): item
    for item in pack["learningItems"]
    if item.get("approval")
}
for card in current["cards"]:
    approved_card = approved[card["reviewId"]]
    assert approved_card["artApproval"] == approved_card["pairApproval"] == "approved"
    assert approved_card["imageSha256"] == hashlib.sha256((SOURCE / card["image"]).read_bytes()).hexdigest()
    text_value = {
        key: card[key]
        for key in ["word", "pos", "meaningZh", "captionEn", "captionZh"]
    }
    assert approved_card["textSha256"] == hashlib.sha256(
        json.dumps(text_value, ensure_ascii=False, sort_keys=True).encode("utf-8")
    ).hexdigest()
    item = learning_items[card["reviewId"]]
    assert (
        item["displayWord"],
        item["officialWordId"],
        item["sensePos"],
        item["targetMeaningZh"],
        item["illustration"]["captionEn"],
        item["illustration"]["captionZh"],
    ) == (
        card["word"],
        card["wordId"],
        card["pos"],
        card["meaningZh"],
        card["captionEn"],
        card["captionZh"],
    )
    expected_path = "curriculum/lv4-u20/" + Path(card["image"]).stem + ".webp"
    assert item["illustration"]["path"] == expected_path

destination = ROOT / "public/curriculum/lv4-u20"
destination.mkdir(parents=True, exist_ok=True)
for asset in pack["assets"]:
    source_file = SOURCE / "assets/web" / asset["file"]
    assert hashlib.sha256(source_file.read_bytes()).hexdigest() == asset["sha256"]
    shutil.copy2(source_file, destination / asset["file"])

(ROOT / "src/features/direct/curriculumLV4Unit20.json").write_text(
    json.dumps(
        {key: pack[key] for key in ["template", "learningItems", "questions", "relatedNotes"]},
        ensure_ascii=False,
        indent=1,
    )
    + "\n",
    encoding="utf-8",
)
print("Imported 82 items, 128 questions, 71 related notes and 42 approved images")
