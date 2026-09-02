"""Validate imported QA/private vocab bundles without touching public source data."""

from __future__ import annotations

import argparse
import json
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path


LEVELS = [f"LV{i}" for i in range(1, 7)]
DATA_FILES = {
    "words": "words.json",
    "senses": "senses.json",
    "examples": "examples.json",
    "relations": "relations.json",
    "notes": "notes.json",
}


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def normalized_sentence(value: str) -> str:
    return re.sub(r"\s+", " ", value.replace("’", "'").strip()).casefold()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--qa-dir", default="dist-qa/data/v1")
    parser.add_argument("--private-dir", default="dist-private/data/v1")
    parser.add_argument("--public-dir", default="public/data/v1")
    parser.add_argument("--report", default="dist-qa/qa-validation-report.json")
    args = parser.parse_args()

    qa_dir = Path(args.qa_dir)
    private_dir = Path(args.private_dir)
    public_dir = Path(args.public_dir)
    qa = {key: read_json(qa_dir / filename) for key, filename in DATA_FILES.items()}
    private_relations = read_json(private_dir / "relations.json")
    public_relations = read_json(public_dir / "relations.json")
    meta = read_json(qa_dir / "meta.json")

    errors: list[str] = []
    warnings: list[str] = []
    words = qa["words"]
    word_by_name = {row["word"]: row for row in words}
    word_by_id = {row["wordId"]: row for row in words}
    if len(word_by_name) != len(words):
        errors.append("words.json contains duplicate word values")
    if len(word_by_id) != len(words):
        errors.append("words.json contains duplicate wordId values")

    level_words: dict[str, set[str]] = defaultdict(set)
    for word in words:
        level_words[word["level"]].add(word["word"])
        if not word.get("meaningZh"):
            errors.append(f"missing meaningZh: {word['wordId']} {word['word']}")
    if sorted(level_words) != LEVELS:
        errors.append(f"unexpected levels: {sorted(level_words)}")

    examples_by_word: dict[str, list[dict]] = defaultdict(list)
    blank_missing = []
    answer_missing = []
    reconstruction_mismatches = []
    for example in qa["examples"]:
        word = example["word"]
        examples_by_word[word].append(example)
        if word not in word_by_name:
            errors.append(f"orphan example: {example['exampleId']} -> {word}")
        blank = example.get("blankSentence")
        answer = example.get("answer")
        if not blank:
            blank_missing.append(example["exampleId"])
        if not answer:
            answer_missing.append(example["exampleId"])
        if blank and answer:
            if not re.search(r"_{3,}", blank):
                reconstruction_mismatches.append({"exampleId": example["exampleId"], "reason": "no placeholder"})
            else:
                reconstructed = re.sub(r"_{3,}", str(answer), blank, count=1)
                if normalized_sentence(reconstructed) != normalized_sentence(example["sentenceEn"]):
                    reconstruction_mismatches.append({
                        "exampleId": example["exampleId"],
                        "word": word,
                        "sentenceEn": example["sentenceEn"],
                        "blankSentence": blank,
                        "answer": answer,
                    })

    notes_by_word: dict[str, list[dict]] = defaultdict(list)
    for note in qa["notes"]:
        notes_by_word[note["word"]].append(note)
        if note["word"] not in word_by_name:
            errors.append(f"orphan note: {note['noteId']} -> {note['word']}")
        if not note.get("content"):
            errors.append(f"empty note content: {note['noteId']}")

    relations_by_word: dict[str, list[dict]] = defaultdict(list)
    for relation in qa["relations"]:
        for endpoint in (relation["word"], relation["relatedWord"]):
            relations_by_word[endpoint].append(relation)
            if endpoint not in word_by_name:
                errors.append(f"orphan relation endpoint: {relation['relationId']} -> {endpoint}")

    for sense in qa["senses"]:
        word = word_by_id.get(sense["wordId"])
        if not word or word["word"] != sense["word"]:
            errors.append(f"orphan/mismatched sense: {sense['senseId']}")

    expected_counts = {
        "words": len(words),
        "senses": len(qa["senses"]),
        "examples": len(qa["examples"]),
        "relations": len(qa["relations"]),
        "notes": len(qa["notes"]),
    }
    for key, actual in expected_counts.items():
        if meta["counts"].get(key) != actual:
            errors.append(f"meta count mismatch for {key}: {meta['counts'].get(key)} != {actual}")

    qa_statuses = Counter(row["status"] for row in qa["relations"])
    private_statuses = Counter(row["status"] for row in private_relations)
    public_statuses = Counter(row["status"] for row in public_relations)
    if set(private_statuses) - {"approved", "reviewed", "machine_verified", "draft"}:
        errors.append(f"private relations contain disallowed statuses: {sorted(set(private_statuses))}")
    if "machine_verified" in public_statuses:
        errors.append("public relations contain machine_verified records")
    if set(public_statuses) - {"approved"}:
        errors.append(f"public relations contain non-approved statuses: {sorted(set(public_statuses))}")
    if qa_statuses.get("machine_verified", 0) != 1503:
        warnings.append(
            "machine_verified count differs from the stated 1503 baseline: "
            f"imported QA has {qa_statuses.get('machine_verified', 0)}"
        )

    level_summary = {}
    visual_samples = {}
    for level in LEVELS:
        names = level_words[level]
        with_examples = names & examples_by_word.keys()
        with_notes = names & notes_by_word.keys()
        with_relations = names & relations_by_word.keys()
        full_candidates = sorted(with_examples & with_notes & with_relations)
        level_summary[level] = {
            "words": len(names),
            "examples": sum(len(examples_by_word[name]) for name in names),
            "wordsWithExamples": len(with_examples),
            "notes": sum(len(notes_by_word[name]) for name in names),
            "wordsWithNotes": len(with_notes),
            "relationEndpoints": len(with_relations),
        }
        if not with_examples:
            errors.append(f"{level} has no examples")
        if not with_notes:
            errors.append(f"{level} has no notes")
        if not with_relations:
            errors.append(f"{level} has no relation display candidates")
        if full_candidates:
            sample = word_by_name[full_candidates[0]]
            visual_samples[level] = {"wordId": sample["wordId"], "word": sample["word"]}

    if blank_missing:
        errors.append(f"examples missing blankSentence: {len(blank_missing)}")
    if answer_missing:
        errors.append(f"examples missing answer: {len(answer_missing)}")
    if reconstruction_mismatches:
        warnings.append(f"blank reconstruction mismatches: {len(reconstruction_mismatches)}")

    report = {
        "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "result": "PASS" if not errors else "FAIL",
        "errors": errors,
        "warnings": warnings,
        "counts": expected_counts,
        "levelSummary": level_summary,
        "relationStatuses": {
            "qa": dict(qa_statuses),
            "private": dict(private_statuses),
            "public": dict(public_statuses),
        },
        "blankAnswerChecks": {
            "missingBlankSentence": len(blank_missing),
            "missingAnswer": len(answer_missing),
            "reconstructionMismatchCount": len(reconstruction_mismatches),
            "reconstructionMismatchSamples": reconstruction_mismatches[:20],
        },
        "visualSamples": visual_samples,
    }
    report_path = Path(args.report)
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    raise SystemExit(0 if not errors else 1)


if __name__ == "__main__":
    main()
