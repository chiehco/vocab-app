"""Package a checked textbook transcription without adopting images or examples."""
import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def build(source_path: Path, output_path: Path) -> dict:
    source = json.loads(source_path.read_text(encoding="utf-8"))
    words = {w["wordId"]: w for w in json.loads((ROOT / "public/data/v1/words.json").read_text(encoding="utf-8"))}
    level, unit = source["level"], source["unit"]
    prefix = f"LI-{level}U{unit:02d}"
    headwords = {r["word"]: r for r in source["headwords"]}
    ordered = [headwords[word] for word in source["headwordOrder"]]
    rows = ordered + source["related"]
    items = []
    for index, row in enumerate(rows, 1):
        word_id = row["officialWordId"]
        official = words.get(word_id) if word_id else None
        if word_id and (official is None or official["word"] != row["officialWord"]):
            raise ValueError(f"Invalid existing word mapping: {row['word']} / {word_id}")
        is_headword = index <= len(ordered)
        meaning = row["chapterMeaningsZh"] if is_headword else official["meaningZh"] if official else "教材補充詞；義項待核對。"
        items.append({
            "learningItemId": f"{prefix}-V{index:03d}", "kind": "vocabulary",
            "displayWord": row["word"], "lexemeRef": word_id or row["word"],
            "officialWordId": word_id, "officialSenseId": None,
            "sensePos": row["sourcePos"] if is_headword else official["pos"] if official else "",
            "targetMeaningZh": meaning, "chapterMeaningsZh": meaning,
            "sourcePage": row["sourcePage"], "printedNumber": row.get("printedNumber"),
            "sourceRole": row["role"], "printedLabel": row.get("printedLabel", ""),
            "meaningSource": "textbook_transcription" if is_headword else "existing_dictionary" if official else "unmapped_supplement",
            "review": "source_checked_text_only", "practiceMode": "read_only",
        })
    for index, row in enumerate(source["usage"], 1):
        items.append({
            "learningItemId": f"{prefix}-G{index:03d}", "kind": "grammar",
            "sourcePage": row["sourcePage"], "pattern": row["label"],
            "explanationZh": "教材用法標記；例句與教材題目尚未提供。",
            "review": "source_checked_text_only", "practiceMode": "read_only",
        })
    pack = {
        "template": {"templateId": f"TEXTBOOK-{level}-U{unit:02d}", "level": level, "unit": unit,
                     "title": f"{level} Unit {unit}", "revision": "20261011-text-1", "deliveryMode": "text_only",
                     "sourcePages": source["sourcePages"], "sourceManifest": str(source_path.relative_to(ROOT)).replace("\\", "/")},
        "learningItems": items, "questions": [], "relatedNotes": [],
    }
    output_path.write_text(json.dumps(pack, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    counts = {"vocabulary": len(rows), "headwords": len(ordered), "related": len(source["related"]),
              "usage": len(source["usage"]), "mapped": sum(bool(r["officialWordId"]) for r in rows),
              "unmapped": [r["word"] for r in rows if not r["officialWordId"]]}
    print(json.dumps(counts, ensure_ascii=False))
    return pack


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, default=ROOT / "scripts/sources/LV3Unit4.json")
    parser.add_argument("--out", type=Path, default=ROOT / "src/features/direct/curriculumLV3Unit4.json")
    args = parser.parse_args()
    build(args.source, args.out)
