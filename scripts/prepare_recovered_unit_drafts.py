"""Prepare the three recovered-source drafts without registering or publishing them."""
import argparse
import hashlib
import json
import re
import tempfile
import unicodedata
from pathlib import Path

from build_text_unit import build

ROOT = Path(__file__).resolve().parent.parent
DRAFTS = ROOT / "scripts/drafts/recovered-units"
NAMES = ("LV3Unit12", "LV3Unit18", "LV6Unit21")


def encoded(value):
    return json.dumps(value, ensure_ascii=False, indent=2) + "\n"


def slug(word):
    ascii_word = unicodedata.normalize("NFKD", word).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", ascii_word.lower()).strip("-")


def prepare_source(transcript, words):
    level, unit = transcript["level"], transcript["unit"]
    start, end = transcript["sourcePages"]
    if [p["page"] for p in transcript["pages"]] != list(range(start, end + 1)):
        raise ValueError("Full printed page sequence required")
    boundary = transcript["nextUnitBoundary"]
    if (boundary["page"], boundary["unit"]) != (end + 1, unit + 1):
        raise ValueError("Next-unit boundary required")
    prefix = f"LI-{level}U{unit:02d}"
    heads, related, usage, photos, numbers = [], [], [], [], []
    for page in transcript["pages"]:
        if not re.fullmatch(r"[0-9a-f]{64}", page["sha256"]):
            raise ValueError("Pinned photo SHA256 required")
        photos.append({"sourcePage": page["page"], "file": page["file"],
                       "sha256": page["sha256"], "pageType": "content",
                       "pixelReview": page["pixelReview"], "scopeEvidence": page["scopeEvidence"]})
        for word, number, role, pos, meaning in page["items"]:
            matches = [w for w in words if w["word"].lower() == word.lower()
                       or word.lower() in [v.lower() for v in w.get("wordVariants", [])]]
            if len(matches) > 1:
                raise ValueError(f"Ambiguous existing mapping: {word}")
            official = matches[0] if matches else None
            if official and official.get("status") in ("rejected", "disabled", "inactive"):
                raise ValueError(f"Unavailable existing mapping: {word}")
            row = {"word": word, "sourcePage": page["page"], "printedNumber": number,
                   "role": role, "sourcePos": pos, "chapterMeaningsZh": meaning,
                   "officialWordId": official["wordId"] if official else None,
                   "officialWord": official["word"] if official else None,
                   "mappingEvidence": "exact_headword" if official and official["word"].lower() == word.lower()
                   else "existing_word_variant" if official else "unmapped_textbook_supplement",
                   "learningItemId": f"{prefix}-P{page['page']}-{slug(word)}"}
            (heads if role in ("main", "unnumbered_headword") else related).append(row)
            if number is not None:
                numbers.append(number)
        for pattern in page["usage"]:
            label, explanation, *owner = pattern
            key = hashlib.sha256(label.encode()).hexdigest()[:12]
            usage.append({"sourcePage": page["page"], "label": label,
                          "explanationZh": explanation, "sourceWord": owner[0] if owner else None,
                          "learningItemId": f"{prefix}-P{page['page']}-G{key}"})
    if numbers != list(range(1, max(numbers) + 1)):
        raise ValueError("Numbered entries must cover the observed printed sequence exactly")
    photos.append({"sourcePage": boundary["page"], "file": boundary["file"],
                   "sha256": boundary["sha256"], "pageType": "boundary",
                   "printedUnit": f"Unit {boundary['unit']}", "pixelReview": boundary["pixelReview"]})
    all_ids = [r["learningItemId"] for r in heads + related + usage]
    if len(set(all_ids)) != len(all_ids):
        raise ValueError("Duplicate stable source identity")
    return {"level": level, "unit": unit, "sourcePages": [start, end],
            "revision": "20261029-recovered-text-draft-1", "publicationStatus": "draft_not_registered",
            "sourceReview": "printed_page_sequence_and_next_unit_boundary_visually_checked; pending_data_release",
            "headwordOrder": [r["word"] for r in heads], "headwords": heads,
            "related": related, "usage": usage, "photos": photos,
            "notes": ["No original photographs, running examples, artwork, assessment questions or sense approvals are adopted.",
                      "Only existing exact headwords/wordVariants map to official IDs; missing IDs remain supplements.",
                      "Stable item IDs use the printed page and spelling; existing published IDs and progress are untouched."],
            "sourceCorrections": [{"sourcePage": p["page"], "notes": p["notes"]}
                                  for p in transcript["pages"] if p.get("notes")]}


def prepare(check=False):
    words = json.loads((ROOT / "public/data/v1/words.json").read_text(encoding="utf-8"))
    # This is the historical pre-integration plan, even after the starter expands.
    baseline = json.loads((ROOT / "scripts/fixtures/recovered-unit-integration-baseline.json").read_text(encoding="utf-8"))
    additions = set(baseline["additionalWordIds"])
    starter_ids = {w["wordId"] for w in words} - additions
    summaries = []
    for name in NAMES:
        transcript = json.loads((DRAFTS / f"{name}.transcript.json").read_text(encoding="utf-8"))
        source = prepare_source(transcript, words)
        source_path, pack_path = DRAFTS / f"{name}.source.json", DRAFTS / f"{name}.curriculum.json"
        if check:
            if source_path.read_text(encoding="utf-8") != encoded(source):
                raise ValueError(f"Stale source draft: {name}")
        else:
            source_path.write_text(encoded(source), encoding="utf-8", newline="\n")
        scratch = (ROOT / "output/recovered-unit-draft-check").resolve()
        scratch.relative_to(ROOT)
        scratch.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(prefix="check-", dir=scratch) as directory:
            Path(directory).resolve().relative_to(scratch)
            pack = build(source_path, Path(directory) / "pack.json")
        pack["releaseReview"] = {"status": "pending_owner_data_release", "registered": False,
                                 "holdChange": False, "publicDataChange": False}
        owners = {u["learningItemId"]: u["sourceWord"] for u in source["usage"] if u["sourceWord"]}
        for item in pack["learningItems"]:
            if item["learningItemId"] in owners:
                item["sourceWord"] = owners[item["learningItemId"]]
        if check:
            if pack_path.read_text(encoding="utf-8") != encoded(pack):
                raise ValueError(f"Stale curriculum draft: {name}")
        else:
            pack_path.write_text(encoded(pack), encoding="utf-8", newline="\n")
        mapped = sorted({r["officialWordId"] for r in source["headwords"] + source["related"] if r["officialWordId"]})
        summaries.append({"name": name, "sourcePages": source["sourcePages"], "headwords": len(source["headwords"]),
                          "numbered": max(r["printedNumber"] or 0 for r in source["headwords"]),
                          "related": len(source["related"]), "usage": len(source["usage"]),
                          "mappedUnique": len(mapped), "missingFromCurrentStarter": [i for i in mapped if i not in starter_ids],
                          "missingFromCurrentStarterWords": [{"wordId": w["wordId"], "word": w["word"]}
                                                             for w in words if w["wordId"] in mapped and w["wordId"] not in starter_ids],
                          "unmapped": [{"word": r["word"], "page": r["sourcePage"]}
                                       for r in source["headwords"] + source["related"] if not r["officialWordId"]]})
    plan = {"baseMain": "a5f7701f77967f4a7540ba616f76278e54c51ba9", "publicationStatus": "draft_not_registered",
            "requiresSeparateDataRelease": True, "motherWorkbookWrite": False,
            "releaseHoldUnchanged": True, "units": summaries}
    plan_path = DRAFTS / "integration-plan.json"
    if check:
        if plan_path.read_text(encoding="utf-8") != encoded(plan):
            raise ValueError("Stale integration plan")
    else:
        plan_path.write_text(encoded(plan), encoding="utf-8", newline="\n")
    print(encoded({"check": check, "units": [{k:v for k,v in s.items() if k != "unmapped"} for s in summaries]}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Compare committed drafts without changing them")
    prepare(parser.parse_args().check)
