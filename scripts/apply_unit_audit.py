"""Apply a small, evidence-backed content audit without reimporting the master.

The manifest is explicit about row identity, old values, new values and evidence.
Every row is validated before any write. Original rows and hashes are retained in
output/unit-audit-20261105/receipts; Git can restore the original public snapshot.
"""
from __future__ import annotations
import argparse
import copy
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

from build_sa_pack import build_sa_pack

ROOT = Path(__file__).resolve().parent.parent
IDENTITY_KEYS = {"examples": "exampleId", "senses": "senseId", "words": "wordId"}
EDITABLE_FIELDS = {"sensePos", "meaningHint", "status", "meaningZh", "meaningEn", "note", "senseId", "usagePattern", "usagePatternZh", "examEvidence"}

def validate_patch_shape(patch):
    """Reject incomplete evidence before the idempotent check or any write."""
    assert patch["dataset"] in IDENTITY_KEYS
    assert patch["key"] == IDENTITY_KEYS[patch["dataset"]], "Unexpected row identity field"
    assert patch.get("reason") and patch.get("evidence")
    assert isinstance(patch.get("before"), dict) and isinstance(patch.get("after"), dict)
    assert patch["after"], "Empty correction"
    assert set(patch["after"]) <= EDITABLE_FIELDS, "Unlisted editable field"
    assert set(patch["after"]) <= set(patch["before"]), "Every after field needs an explicit before value"
    assert patch["key"] not in patch["after"], "Row identity cannot change"
    if "examEvidence" in patch["after"]:
        assert patch["dataset"] == "senses", "Exam-source evidence belongs to the sense row"

def read(path):
    return json.loads(path.read_text(encoding="utf-8"))

def write_json(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2)+"\n", encoding="utf-8", newline="\n")

def content_hash(data_dir):
    # Same LF-canonical file order as import_data.content_hash, without Excel dependencies.
    digest = hashlib.sha256()
    for name in ("words.json", "senses.json", "examples.json", "relations.json", "morphemes.json",
                 "notes.json", "exam_priority.json", "hooks.json", "media.json"):
        digest.update((data_dir/name).read_text(encoding="utf-8").encode("utf-8"))
    return digest.hexdigest()

def sha(path):
    return hashlib.sha256(path.read_bytes().replace(b"\r\n", b"\n")).hexdigest()

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("manifest", type=Path)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    manifest = read(args.manifest)
    assert manifest["baseCommit"] == "29cfc684d7a11b07f09988c478d30358830f1951"
    data_dir = ROOT / "public/data/v1"
    datasets = {}
    changes = []
    for patch in manifest["patches"]:
        validate_patch_shape(patch)
        name = patch["dataset"]
        rows = datasets.setdefault(name, read(data_dir / f"{name}.json"))
        matches = [r for r in rows if r[patch["key"]] == patch["id"]]
        assert len(matches) == 1, patch["id"]
        row = matches[0]
        before = copy.deepcopy(row)
        fields = patch["after"]
        assert set(patch["before"]) <= set(row), "Recorded old field absent from row"
        if all(row.get(k) == v for k, v in fields.items()):
            continue
        assert all(row.get(k) == v for k, v in patch["before"].items()), (patch["id"], row)
        row.update(fields)
        if name == "examples":
            for key in ("exampleId", "word", "sentenceEn", "sentenceZh", "blankSentence", "answer"):
                assert row.get(key) == before.get(key), (patch["id"], key)
        changes.append({"dataset": name, "id": patch["id"], "before": before, "after": row.copy(),
                        "reason": patch["reason"], "evidence": patch["evidence"]})
    receipt = {"manifest": str(args.manifest), "baseCommit": manifest["baseCommit"],
               "checkedAt": datetime.now(timezone.utc).isoformat(), "changeCount": len(changes), "changes": changes,
               "masterTouched": False, "sentencesChanged": False, "imagesChanged": False,
               "sourceHashesBefore": {f: sha(data_dir/f) for f in ("words.json","senses.json","examples.json","meta.json","sa-pack.json")}}
    if args.apply and changes:
        out = ROOT / "output/unit-audit-20261105/receipts"
        out.mkdir(parents=True, exist_ok=True)
        target = out / (args.manifest.stem + ".json")
        assert not target.exists(), "Existing receipt; inspect before applying again"
        # Record the recoverable old rows before modifying the public snapshot.
        write_json(target, {**receipt, "state": "validated_before_write"})
        for name, rows in datasets.items():
            write_json(data_dir/f"{name}.json", rows)
        meta = read(data_dir/"meta.json")
        meta["generatedAt"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        if "words" in datasets:
            meta["wordsHash"] = sha(data_dir/"words.json")
        meta["contentHash"] = content_hash(data_dir)
        write_json(data_dir/"meta.json", meta)
        build_sa_pack(data_dir)
        receipt["sourceHashesAfter"] = {f: sha(data_dir/f) for f in receipt["sourceHashesBefore"]}
        receipt["state"] = "applied_not_ui_verified"
        write_json(target, receipt)
        if "words" not in datasets:
            assert sha(data_dir/"words.json") == receipt["sourceHashesBefore"]["words.json"]
        for patch in manifest["patches"]:
            rows = read(data_dir/f"{patch['dataset']}.json")
            row = next(r for r in rows if r[patch["key"]] == patch["id"])
            assert all(row.get(k) == v for k,v in patch["after"].items())
    print(json.dumps({"mode": "apply" if args.apply else "dry_run", "changedRows": len(changes),
                      "datasets": list(datasets), "masterTouched": False, "sentencesChanged": False}))

if __name__ == "__main__":
    main()
