"""Read-only S/A delivery audit. Structural coverage does not certify semantic quality."""
import argparse
import json
import re
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path):
    return json.loads(path.read_text(encoding="utf-8"))


def audit(directory):
    data = {name: read(directory / f"{name}.json") for name in
            ["words", "exam_priority", "examples", "senses", "media", "meta"]}
    words = {row["word"]: row for row in data["words"]}
    priorities = [row for row in data["exam_priority"] if row["priorityTier"] in ["S", "A"]]
    examples, senses, media = defaultdict(list), defaultdict(list), defaultdict(list)
    for row in data["examples"]:
        examples[row["word"]].append(row)
    for row in data["senses"]:
        senses[row["word"]].append(row)
    for row in data["media"]:
        if row["targetType"] == "word" and row["mediaType"] == "image" and row["status"] == "approved":
            media[row["targetWord"]].append(row)
    asset_ids = {}
    for tier in ["s", "a"]:
        source = ROOT / f"src/features/wordbeast/{tier}GradeAssetIds.ts"
        asset_ids[tier] = set(re.findall(r'"(W\d{6})"', source.read_text(encoding="utf-8")))
    assets_missing = [f"{tier}/{wid}.webp" for tier, ids in asset_ids.items() for wid in ids
                      if not (ROOT / f"public/wordbeast/{tier}/{wid}.webp").is_file()]
    issues = defaultdict(list)
    summary = {}
    words_by_id = {row["wordId"]: row for row in data["words"]}
    for tier in ["S", "A"]:
        counts = Counter()
        for priority in [row for row in priorities if row["priorityTier"] == tier]:
            counts["words"] += 1
            label = f"{priority['wordId']} {priority['word']}"
            word = words.get(priority["word"])
            if not word or word["wordId"] != priority["wordId"]:
                issues["priorityMismatch"].append(label)
                continue
            counts["functionWords"] += bool(priority["isFunctionWord"])
            if (word.get("meaningZh") or "").strip():
                counts["withMeaning"] += 1
            else:
                issues["missingMeaning"].append(label)
            if re.search(r"DOS|Windows|Microsoft|HTML|ASCII|计算机|電腦命令|白癡", word.get("meaningZh") or "", re.I):
                issues["meaningNoiseCandidates"].append({"word": label, "meaning": word["meaningZh"]})
            bilingual = [e for e in examples[word["word"]] if e.get("sentenceEn") and e.get("sentenceZh")]
            if bilingual:
                counts["withBilingualExample"] += 1
            else:
                issues["missingBilingualExample"].append(label)
            fills = [e for e in bilingual if e.get("blankSentence") and e.get("answer")]
            if fills and not priority["isFunctionWord"]:
                counts["withFillQuestion"] += 1
            for example in fills:
                reconstructed = re.sub(r"_{3,}", lambda _: example["answer"], example["blankSentence"], count=1)
                norm = lambda value: " ".join(value.replace("’", "'").split()).casefold()
                if norm(reconstructed) != norm(example["sentenceEn"]):
                    issues["blankMismatch"].append({"word": label, "exampleId": example["exampleId"]})
            approved_senses = [s for s in senses[word["word"]] if s["status"] in ["approved", "reviewed"] and s.get("meaningZh")]
            counts["withReviewedSense"] += bool(approved_senses)
            asset_id = word.get("imageWordId") or word["wordId"]
            asset_source = words_by_id.get(asset_id)
            has_asset = any(asset_id in ids for ids in asset_ids.values())
            if not has_asset and re.fullmatch(r"W000(?:2[5-9][0-9]|300)", asset_id):
                has_asset = (ROOT / f"public/wordbeast/lv1/{asset_id}.png").is_file()
            if has_asset:
                counts["withRegisteredImage"] += 1
                captions = [m for m in media[asset_source["word"] if asset_source else word["word"]] if (m.get("captionZh") or "").strip()]
                if captions:
                    counts["withApprovedImageCaption"] += 1
                else:
                    issues["imageMissingApprovedCaption"].append(label)
            else:
                issues["withoutRegisteredImage"].append(label)
        summary[tier] = dict(counts)
    return {"directory": str(directory), "generatedAt": data["meta"]["generatedAt"],
            "summary": summary, "missingRegisteredAssetFiles": assets_missing,
            "issueCounts": {key: len(value) for key, value in issues.items()}, "issues": dict(issues)}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--report", default="output/sa-data-audit.json")
    parser.add_argument("--dirs", nargs="+", default=["public/data/v1", "dist-qa/data/v1", "dist-private/data/v1"])
    args = parser.parse_args()
    results = [audit(ROOT / directory) for directory in args.dirs]
    target = ROOT / args.report
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(results, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps([{key: value for key, value in result.items() if key != "issues"} for result in results], ensure_ascii=False, indent=2))
