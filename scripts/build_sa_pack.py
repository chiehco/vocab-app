"""Build the small S+A bootstrap bundle used by the offline-first app startup."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path


def read_json(path: Path):
    with path.open(encoding="utf-8") as file:
        return json.load(file)


def write_json(path: Path, data) -> None:
    with path.open("w", encoding="utf-8", newline="\n") as file:
        # 機器啟動包不供人工審閱；保持緊湊可降低 CacheStorage 與 Git 體積。
        json.dump(data, file, ensure_ascii=False, separators=(",", ":"))
        file.write("\n")


def rows_hash(rows) -> str:
    payload = json.dumps(rows, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def build_sa_pack(data_dir: Path) -> dict:
    meta = read_json(data_dir / "meta.json")
    priorities = read_json(data_dir / "exam_priority.json")
    selected_priorities = [row for row in priorities if row.get("priorityTier") in {"S", "A"}]
    selected_word_ids = {row["wordId"] for row in selected_priorities}
    selected_names = {row["word"] for row in selected_priorities}

    words = [row for row in read_json(data_dir / "words.json") if row.get("wordId") in selected_word_ids]
    actual_word_ids = {row["wordId"] for row in words}
    actual_names = {row["word"] for row in words}
    selected_priorities = [row for row in selected_priorities if row.get("wordId") in actual_word_ids]

    senses = [row for row in read_json(data_dir / "senses.json") if row.get("wordId") in actual_word_ids]
    examples = [row for row in read_json(data_dir / "examples.json") if row.get("word") in actual_names]
    relations = [
        row for row in read_json(data_dir / "relations.json")
        if row.get("word") in actual_names and row.get("relatedWord") in actual_names
    ]
    morphemes = [row for row in read_json(data_dir / "morphemes.json") if row.get("word") in actual_names]
    notes = [row for row in read_json(data_dir / "notes.json") if row.get("word") in actual_names]
    media = [row for row in read_json(data_dir / "media.json") if row.get("targetWord") in actual_names]

    datasets = {
        "words": words,
        "senses": senses,
        "examples": examples,
        "relations": relations,
        "morphemes": morphemes,
        "notes": notes,
        "examPriorities": selected_priorities,
        "media": media,
    }
    counts = {key: len(rows) for key, rows in datasets.items()}
    counts["examPriority"] = counts.pop("examPriorities")
    missing = selected_word_ids - actual_word_ids
    if missing:
        raise SystemExit(f"S+A pack 缺少 {len(missing)} 個 words 記錄")
    if selected_names != actual_names:
        raise SystemExit("S+A pack 的 priority 與 words 名稱不一致")

    source_hash = meta.get("contentHash") or meta["wordsHash"]
    pack = {
        "meta": {
            "schemaVersion": meta.get("schemaVersion", 2),
            "generatedAt": meta["generatedAt"],
            "counts": counts,
            "wordsHash": f"sa:{rows_hash(words)}",
            "contentHash": f"sa:{source_hash}",
        },
        **datasets,
    }
    write_json(data_dir / "sa-pack.json", pack)
    return counts


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-dir", type=Path, default=Path("public/data/v1"))
    args = parser.parse_args()
    counts = build_sa_pack(args.data_dir)
    size = (args.data_dir / "sa-pack.json").stat().st_size
    print(f"S+A 離線包完成：{counts['words']} 字，{size / 1024 / 1024:.2f} MiB")


if __name__ == "__main__":
    main()
