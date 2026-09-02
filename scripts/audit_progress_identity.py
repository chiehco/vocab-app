"""Read-only release gate: compare content identities, never open user progress DBs."""
import json
import argparse
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(directory, name):
    return json.loads((ROOT / directory / f"{name}.json").read_text(encoding="utf-8"))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--candidate", default="output/sa-master-20260830/data/v1")
    args = parser.parse_args()
    baseline, candidate = "public/data/v1", args.candidate
    # progressRenames.ts is a literal JSON array plus `as const`, not executable input.
    source = (ROOT / "src/db/progressRenames.ts").read_text(encoding="utf-8")
    mappings = json.loads(source.split("export const PROGRESS_RENAMES = ", 1)[1].rsplit(" as const;", 1)[0])
    covered = {(row["wordId"], row["oldWord"], row["word"]) for row in mappings}
    old = {r["wordId"]: r for r in read(baseline, "words")}
    new = {r["wordId"]: r for r in read(candidate, "words")}
    new_names = {r["word"] for r in new.values()}
    priorities = {r["wordId"]: r["priorityTier"] for r in read(candidate, "exam_priority")}
    renamed = [{"wordId": wid, "oldProgressKey": row["word"],
                "candidateProgressKey": new[wid]["word"], "tier": priorities.get(wid),
                "oldKeyStillResolvable": row["word"] in new_names,
                "status": "alias_covered" if (wid, row["word"], new[wid]["word"]) in covered
                    and row["word"] not in new_names else "identity_review_required"}
               for wid, row in sorted(old.items())
               if wid in new and row["word"] != new[wid]["word"]]
    sa = [r for r in renamed if r["tier"] in ("S", "A")]
    deleted = [{"wordId": wid, "oldProgressKey": row["word"]}
               for wid, row in sorted(old.items()) if wid not in new]
    report = {
        "status": "not_release_ready",
        "baseline": baseline, "candidate": candidate,
        "baselineGeneratedAt": read(baseline, "meta")["generatedAt"],
        "candidateGeneratedAt": read(candidate, "meta")["generatedAt"],
        "scope": "Content identity comparison only; no user progress was read or modified.",
        "risk": "Identity aliases are gated by current wordId/name; this audit verifies mapping coverage, not runtime tests or content approval.",
        "identityPolicy": "Retain original progress keys. Current-name card wins collisions; old rows remain archived in schema-1 backups. No merging or derivative mastery copying.",
        "uncoveredRenames": [r for r in renamed if r["status"] != "alias_covered"],
        "renamedCount": len(renamed), "saRenamedCount": len(sa),
        "saRenamed": sa, "allRenamed": renamed, "removedWordIds": deleted,
        "releaseConditions": [
            "Approve the candidate content source and correction workflow before replacing public content.",
            "Keep identity alias regression tests green, including backups, collisions, failed updates and retries.",
            "Run final S/A practice, recall and mobile checks against the approved content and identity policy."
        ]
    }
    target = ROOT / "output/sa-progress-identity-audit.json"
    target.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k: report[k] for k in ("status", "renamedCount", "saRenamedCount")}, ensure_ascii=False))


if __name__ == "__main__":
    main()
