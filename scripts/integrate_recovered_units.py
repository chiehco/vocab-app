"""Build the accepted recovered text units; publication requires a separate release."""
import argparse
import hashlib
import json
import tempfile
from pathlib import Path

from apply_lv3_unit_audit import file_hash, node_hash, read_json
from build_text_unit import build
from prepare_recovered_unit_drafts import DRAFTS, NAMES, ROOT, encoded, prepare_source


def recovered_audit_guards():
    directory = ROOT / "docs/lv3-audit-20261107"
    chain = read_json(directory / "chain.json")
    owners = {
        "LV3-U12": {"src/features/direct/curriculumLV3Unit12.json"},
        "LV3-U18": {"scripts/sources/LV3Unit18.json", "src/features/direct/curriculumLV3Unit18.json"},
    }
    guards = {}
    for unit, paths in owners.items():
        entries = [entry for entry in chain["entries"] if entry.get("unit") == unit]
        if len(entries) != 1 or entries[0]["status"] != "committed":
            raise ValueError(f"Missing committed recovered-unit audit: {unit}")
        entry = entries[0]
        manifest = read_json(directory / f"{unit.removeprefix('LV3-')}-patches.json")
        if (manifest["unit"] != unit or manifest["baseline"] != chain["baseline"]
                or node_hash(manifest) != entry["manifestHash"]):
            raise ValueError(f"Recovered-unit audit manifest drift: {unit}")
        guards.update({path: manifest["files"][path] for path in sorted(paths)})
    return guards


def verify_or_write(path, expected, guard, check):
    text = encoded(expected)
    if guard is not None:
        if hashlib.sha256(text.encode("utf-8")).hexdigest() != guard["beforeByteHash"]:
            raise ValueError(f"Stale recovered-unit source projection: {path}")
        if file_hash(path) != guard["afterByteHash"]:
            raise ValueError(f"Audited recovered-unit file drift: {path}")
    elif check:
        if path.read_text(encoding="utf-8") != text:
            raise ValueError(f"Stale accepted recovered-unit file: {path}")
    else:
        path.write_text(text, encoding="utf-8", newline="\n")


def integrate(check=False):
    guards = recovered_audit_guards()
    words = json.loads((ROOT / "public/data/v1/words.json").read_text(encoding="utf-8"))
    scratch = ROOT / "output/recovered-unit-integration-check"
    scratch.resolve().relative_to(ROOT)
    scratch.mkdir(parents=True, exist_ok=True)
    for name in NAMES:
        transcript = json.loads((DRAFTS / f"{name}.transcript.json").read_text(encoding="utf-8"))
        source = prepare_source(transcript, words)
        source.update(revision="20261029-text-1", publicationStatus="release_candidate",
                      sourceReview="complete_printed_source_checked; owner_accepted_text; pending_publication")
        source_path = ROOT / f"scripts/sources/{name}.json"
        pack_path = ROOT / f"src/features/direct/curriculum{name}.json"
        source_relative = source_path.relative_to(ROOT).as_posix()
        verify_or_write(source_path, source, guards.get(source_relative), check)
        with tempfile.TemporaryDirectory(prefix="check-", dir=scratch) as directory:
            scratch_dir = Path(directory).resolve()
            scratch_dir.relative_to(scratch)
            # Compile the accepted transcript, even if the installed source now
            # contains a later audit. Reattach its stable public source path.
            historical_source = scratch_dir / source_path.name
            historical_source.write_text(encoded(source), encoding="utf-8", newline="\n")
            pack = build(historical_source, scratch_dir / "pack.json")
        pack["template"]["sourceManifest"] = source_relative
        owners = {u["learningItemId"]: u["sourceWord"] for u in source["usage"] if u["sourceWord"]}
        for item in pack["learningItems"]:
            if item["learningItemId"] in owners:
                item["sourceWord"] = owners[item["learningItemId"]]
        pack["releaseReview"] = {"status": "accepted_text_pending_publication", "registered": True,
                                 "requiresSeparateDataRelease": True, "senseApprovalChange": False,
                                 "artworkAdopted": False, "authoredQuestionsAdopted": False}
        pack_relative = pack_path.relative_to(ROOT).as_posix()
        verify_or_write(pack_path, pack, guards.get(pack_relative), check)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    integrate(parser.parse_args().check)
