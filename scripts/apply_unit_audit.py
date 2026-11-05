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
FORM_IDS = set('W000044 W000086 W000102 W000107 W000130 W000133 W000175 W000205 W000209 W000248 W000287 W000311 W000322 W000353 W000374 W000383 W000453 W000460 W000473 W000502 W000517 W000518 W000610 W000646 W000704 W000750 W000764 W000794 W000828 W000842 W000947'.split())
FOLLOWUP_FORM_IDS = set('W000113 W000155 W000183 W000184 W000343 W000363 W000507 W000633 W000650 W000695 W000740 W000823 W000851 W000858 W000894 W000995'.split())
U05_U06_FORM_IDS = set('W000348 W000309 W000270 W000933 W000493 W000881 W000618 W000500 W000986 W000870 W000256 W000242 W000074 W000864 W000049 W000055 W000772 W000136 W000480 W000741 W000199 W000968 W000628 W000262 W000824 W000080 W000302 W000595 W000319 W000924 W000688 W000403 W000450 W000685 W000121 W000365 W000147 W000661 W000494 W000486 W000922 W000950 W001054 W005996 W000559 W001723'.split())
assert not FOLLOWUP_FORM_IDS & U05_U06_FORM_IDS
FOLLOWUP_FORM_IDS |= U05_U06_FORM_IDS
U07_FORM_IDS = set('W000008 W000041 W000046 W000082 W000146 W000387 W000432 W000476 W000498 W000525 W000529 W000534 W000541 W000569 W000613 W000632 W000672 W000699 W000724 W000732 W000745 W000755 W000784 W000822 W000920 W001086 W001523 W001598 W001768 W001779 W002047 W003270 W003306 W003352 W003553 W003959 W004780'.split())
assert not FOLLOWUP_FORM_IDS & U07_FORM_IDS
FOLLOWUP_FORM_IDS |= U07_FORM_IDS
U08_U09_FORM_IDS = set('W000635 W000655 W003289 W000630 W000366 W000653 W004820 W000011 W000376 W001594 W000976 W000504 W000016 W001390 W000572 W000224 W001045 W003329 W000478 W000169 W003154 W000204 W001708 W001932 W000125 W000291 W002227 W000718 W001456 W000328 W000677 W000707 W000364 W000326 W000316 W000207 W002711 W001184 W001307 W002292 W000117 W000467 W004786 W004804 W003584 W000239 W000622 W000892 W000945 W000266 W001331 W000194 W000992 W000219'.split())
assert not FOLLOWUP_FORM_IDS & U08_U09_FORM_IDS
FOLLOWUP_FORM_IDS |= U08_U09_FORM_IDS
U10_FORM_IDS = set('W000023 W002636 W003416 W003020 W000698 W001517 W002983 W000171 W000201 W000170 W004944 W001261 W001454 W002734 W000645 W000307 W000709 W000243 W001159 W000313 W000826 W000814 W000949 W003672 W000748 W000895 W000700'.split())
assert not FOLLOWUP_FORM_IDS & U10_FORM_IDS
FOLLOWUP_FORM_IDS |= U10_FORM_IDS
U11_FORM_IDS = set('W000409 W000980 W000591 W000522 W001854 W000018 W001259 W000156 W000889 W005939 W000305 W000711 W000955 W003188 W000497 W000444 W000730 W000701 W000310 W000454 W000674 W000908 W000785 W000819 W000110 W000670'.split())
assert not FOLLOWUP_FORM_IDS & U11_FORM_IDS
FOLLOWUP_FORM_IDS |= U11_FORM_IDS
U12_FORM_IDS = set('W000035 W001726 W001729 W000389 W000916 W000683 W000296 W000684 W001528 W000312 W002996 W001566 W004689 W001291 W000216 W000673 W000919 W000212 W000662 W000405 W001919 W001927 W002461 W004866 W000852 W000651 W000694 W000665'.split())
assert not FOLLOWUP_FORM_IDS & U12_FORM_IDS
FOLLOWUP_FORM_IDS |= U12_FORM_IDS
U13_FORM_IDS = set('W000715 W000393 W002042 W000829 W000401 W001376 W001188 W000767 W000910 W000790 W004016 W000143 W000693 W000301 W000084 W000097 W000627 W002229 W000951'.split())
assert not FOLLOWUP_FORM_IDS & U13_FORM_IDS
FOLLOWUP_FORM_IDS |= U13_FORM_IDS
U14_FORM_IDS = set('W000503 W000911 W000544 W000058 W000558 W000119 W000776 W000722 W000061 W000341 W000604 W000318 W000159 W001326 W000989 W000723 W005813 W000138'.split())
assert not FOLLOWUP_FORM_IDS & U14_FORM_IDS
FOLLOWUP_FORM_IDS |= U14_FORM_IDS
TRANSLATION_IDS = {'EX50693488', 'EXddc4d110', 'EX66703666', 'EX1f033d08', 'EX51e703b4'}
FOLLOWUP_TRANSLATION_IDS = {'EX4c5b9769', 'EX299bccf8'}
ABSENT = {"$absent": True}

def validate_patch_shape(patch):
    """Reject incomplete evidence before the idempotent check or any write."""
    assert patch["dataset"] in IDENTITY_KEYS
    assert patch["key"] == IDENTITY_KEYS[patch["dataset"]], "Unexpected row identity field"
    assert patch.get("reason") and patch.get("evidence")
    assert isinstance(patch.get("before"), dict) and isinstance(patch.get("after"), dict)
    assert patch["after"], "Empty correction"
    assert set(patch["after"]) <= EDITABLE_FIELDS | {'verbForms', 'sentenceZh'}, "Unlisted editable field"
    assert set(patch["after"]) <= set(patch["before"]), "Every after field needs an explicit before value"
    assert patch["key"] not in patch["after"], "Row identity cannot change"
    if "examEvidence" in patch["after"]:
        assert patch["dataset"] == "senses", "Exam-source evidence belongs to the sense row"
    if 'verbForms' in patch['after']:
        assert patch['dataset'] == 'words' and patch['id'] in FORM_IDS | FOLLOWUP_FORM_IDS, 'Only individually verified existing verbs may acquire principal parts'
        assert patch['before'] == {'verbForms': ABSENT} and set(patch['after']) == {'verbForms'}, 'Only an explicitly absent verbForms field may be added'
        facts = read(ROOT / 'docs/unit-audit-20261105/VERIFIED-VERB-FORMS-SOURCES.json')['facts']
        assert len(facts) == 31 and {f['wordId'] for f in facts} == FORM_IDS
        followups = read(ROOT / 'docs/unit-audit-20261105/VERIFIED-FOLLOWUP-VERB-FORMS-SOURCES.json')['facts']
        assert len(followups) == len(FOLLOWUP_FORM_IDS) and {f['wordId'] for f in followups} == FOLLOWUP_FORM_IDS
        assert not FORM_IDS & FOLLOWUP_FORM_IDS, 'Preserve the original 31 source facts independently'
        facts += followups
        fact = next(f for f in facts if f['wordId'] == patch['id'])
        assert patch['after']['verbForms'] == fact['verbForms'], 'Unverified principal parts or source'
    if 'sentenceZh' in patch['after']:
        assert patch['dataset'] == 'examples' and patch['id'] in TRANSLATION_IDS | FOLLOWUP_TRANSLATION_IDS, 'Only individually verified Chinese translations are editable'
        assert set(patch['before']) == {'sentenceEn', 'sentenceZh'} and set(patch['after']) == {'sentenceZh'}, 'Exact unchanged English guard required'
        facts = read(ROOT / 'docs/unit-audit-20261105/VERIFIED-TRANSLATION-SOURCES.json')['facts']
        assert len(facts) == 5 and {f['exampleId'] for f in facts} == TRANSLATION_IDS
        followups = read(ROOT / 'docs/unit-audit-20261105/VERIFIED-FOLLOWUP-TRANSLATION-SOURCES.json')['facts']
        assert len(followups) == 2 and {f['exampleId'] for f in followups} == FOLLOWUP_TRANSLATION_IDS
        assert not TRANSLATION_IDS & FOLLOWUP_TRANSLATION_IDS
        facts += followups
        fact = next(f for f in facts if f['exampleId'] == patch['id'])
        assert patch['before'] == {'sentenceEn': fact['sentenceEn'], 'sentenceZh': fact['before']} and patch['after'] == {'sentenceZh': fact['after']}, 'Unverified translation or English guard'
        if patch['id'] in FOLLOWUP_TRANSLATION_IDS:
            assert patch['evidence'] == fact['evidence'], 'Unverified translation source'

def apply_to_row(row, patch):
    """Validate guards even for idempotent rows; missing optional keys stay distinct from null."""
    if 'verbForms' in patch['after']:
        assert row['word'] == patch['after']['verbForms']['base'] and 'v.' in row['pos'], 'Forms belong only to this existing verb'
    for key, value in patch['before'].items():
        if key not in patch['after']:
            assert key in row and row[key] == value, 'Immutable source guard changed'
    if all(key in row and row[key] == value for key, value in patch['after'].items()):
        return False
    for key, value in patch['before'].items():
        if key == 'verbForms' and value == ABSENT:
            assert key not in row, 'Expected a genuinely missing optional field, not null or existing data'
        else:
            assert key in row and row[key] == value, 'Recorded old field/value differs'
    row.update(copy.deepcopy(patch['after']))
    return True

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
        if not apply_to_row(row, patch):
            continue
        if name == "examples":
            immutable = ("exampleId", "word", "sentenceEn", "blankSentence", "answer")
            if 'sentenceZh' not in patch['after']:
                immutable += ('sentenceZh',)
            for key in immutable:
                assert row.get(key) == before.get(key), (patch["id"], key)
        changes.append({"dataset": name, "id": patch["id"], "before": before, "after": row.copy(),
                        "reason": patch["reason"], "evidence": patch["evidence"]})
    receipt = {"manifest": str(args.manifest), "baseCommit": manifest["baseCommit"],
               "checkedAt": datetime.now(timezone.utc).isoformat(), "changeCount": len(changes), "changes": changes,
               "masterTouched": False, "sentencesChanged": any('sentenceZh' in p['after'] for p in manifest['patches']), "englishSentencesChanged": False, "imagesChanged": False,
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
                      "datasets": list(datasets), "masterTouched": False, "sentencesChanged": receipt['sentencesChanged'], "englishSentencesChanged": False}))

if __name__ == "__main__":
    main()
