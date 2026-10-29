"""Build the accepted recovered text units; publication requires a separate release."""
import argparse
import json
import tempfile
from pathlib import Path

from build_text_unit import build
from prepare_recovered_unit_drafts import DRAFTS, NAMES, ROOT, encoded, prepare_source


def integrate(check=False):
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
        if check:
            if source_path.read_text(encoding="utf-8") != encoded(source):
                raise ValueError(f"Stale accepted source: {name}")
        else:
            source_path.write_text(encoded(source), encoding="utf-8", newline="\n")
        with tempfile.TemporaryDirectory(prefix="check-", dir=scratch) as directory:
            Path(directory).resolve().relative_to(scratch)
            pack = build(source_path, Path(directory) / "pack.json")
        owners = {u["learningItemId"]: u["sourceWord"] for u in source["usage"] if u["sourceWord"]}
        for item in pack["learningItems"]:
            if item["learningItemId"] in owners:
                item["sourceWord"] = owners[item["learningItemId"]]
        pack["releaseReview"] = {"status": "accepted_text_pending_publication", "registered": True,
                                 "requiresSeparateDataRelease": True, "senseApprovalChange": False,
                                 "artworkAdopted": False, "authoredQuestionsAdopted": False}
        if check:
            if pack_path.read_text(encoding="utf-8") != encoded(pack):
                raise ValueError(f"Stale accepted curriculum: {name}")
        else:
            pack_path.write_text(encoded(pack), encoding="utf-8", newline="\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    integrate(parser.parse_args().check)
