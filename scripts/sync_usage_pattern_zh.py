"""Sync the master workbook's collocations into the published app snapshot.

Only ``usagePattern`` and ``usagePatternZh`` are changed in ``words.json``.
The remaining public datasets stay byte-for-byte untouched.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import openpyxl

from build_sa_pack import build_sa_pack


CONTENT_FILES = [
    "words.json", "senses.json", "examples.json", "relations.json", "morphemes.json",
    "notes.json", "exam_priority.json", "hooks.json", "media.json",
]


def segments(value: str | None) -> list[str]:
    return [part.strip() for part in re.split(r"[;；]", value or "") if part.strip()]


def write_json(path: Path, data) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")


def content_hash(data_dir: Path) -> str:
    digest = hashlib.sha256()
    for name in CONTENT_FILES:
        digest.update((data_dir / name).read_bytes())
    return digest.hexdigest()


def read_master(source: Path) -> dict[str, tuple[str | None, str | None]]:
    workbook = openpyxl.load_workbook(source, read_only=True, data_only=True)
    sheet = workbook["input_words_單字主表"]
    rows = sheet.iter_rows(values_only=True)
    headers = next(rows)
    next(rows)
    index = {str(value).strip(): position for position, value in enumerate(headers) if value}
    required = {"word_id", "usage_pattern", "usage_pattern_zh"}
    if missing := required - set(index):
        raise SystemExit(f"母表缺少欄位：{', '.join(sorted(missing))}")

    result = {}
    for row in rows:
        word_id = row[index["word_id"]]
        if not word_id:
            continue
        english = row[index["usage_pattern"]]
        chinese = row[index["usage_pattern_zh"]]
        english = str(english).strip() if english not in (None, "") else None
        chinese = str(chinese).strip() if chinese not in (None, "") else None
        if english and not chinese:
            raise SystemExit(f"母表有英文搭配但缺少中文：{word_id}")
        if not english and chinese:
            raise SystemExit(f"母表缺少英文搭配但有中文：{word_id}")
        if english and len(segments(english)) != len(segments(chinese)):
            raise SystemExit(f"母表中英文搭配段數不一致：{word_id}")
        result[str(word_id).strip()] = (english, chinese)
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--data-dir", type=Path, default=Path("public/data/v1"))
    args = parser.parse_args()

    master = read_master(args.source)
    words_path = args.data_dir / "words.json"
    words = json.loads(words_path.read_text(encoding="utf-8"))
    app_ids = {word["wordId"] for word in words}
    missing = sorted(app_ids - set(master))
    extra = sorted(set(master) - app_ids)
    if missing or extra:
        raise SystemExit(f"App／母表 word_id 不一致：App only={missing[:10]}，master only={extra[:10]}")

    english_changed = 0
    chinese_changed = 0
    translated = 0
    for word in words:
        english, chinese = master[word["wordId"]]
        if word.get("usagePattern") != english:
            english_changed += 1
        if word.get("usagePatternZh") != chinese:
            chinese_changed += 1
        word["usagePattern"] = english
        word["usagePatternZh"] = chinese
        translated += bool(chinese)

    if translated != sum(bool(chinese) for _, chinese in master.values()):
        raise SystemExit("同步後中文搭配筆數與母表不一致")
    write_json(words_path, words)

    meta_path = args.data_dir / "meta.json"
    meta = json.loads(meta_path.read_text(encoding="utf-8"))
    meta["generatedAt"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    meta["wordsHash"] = hashlib.sha256(words_path.read_bytes()).hexdigest()
    meta["contentHash"] = content_hash(args.data_dir)
    write_json(meta_path, meta)
    build_sa_pack(args.data_dir)

    print(json.dumps({
        "words": len(words),
        "translated": translated,
        "blankEnglish": len(words) - translated,
        "englishChanged": english_changed,
        "chineseChanged": chinese_changed,
        "wordsHash": meta["wordsHash"],
        "contentHash": meta["contentHash"],
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
