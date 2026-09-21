"""Publish reviewed LV1 image/caption pairs; never import dictionary data.

Usage: python scripts/build_lv1_reviewed_images.py --images PATH --workspace PATH
Requires Pillow. Original PNGs and reviewer files are read-only.
"""
import argparse
import csv
import hashlib
import html
import json
import re
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from PIL import Image, UnidentifiedImageError

ROOT = Path(__file__).resolve().parents[1]


def sha(data):
    return hashlib.sha256(data).hexdigest()


def read(path):
    return path.read_text(encoding="utf-8-sig")


def field(block, key):
    match = re.search(r"^- " + re.escape(key) + r"：([^\r\n]*)", block, re.M)
    if not match:
        raise ValueError(f"Missing field {key}")
    return match[1].strip().strip("*")


def forms(word):
    return {word.lower(), *word.lower().split("/"), re.sub(r"\([^)]*\)", "", word.lower()), word.lower().replace("(", "").replace(")", "")}


def convert(row, target):
    original_sha = sha(row["image"].read_bytes())
    filename = f"{row['id']}-{original_sha[:12]}.webp"
    with Image.open(row["image"]) as image:
        image.load()
        size = image.size
        try:
            with Image.open(target/filename) as existing:
                existing.load()
                assert existing.size == size
        except (FileNotFoundError, UnidentifiedImageError, OSError, AssertionError):
            temporary = target/(filename+".tmp")
            image.convert("RGB").save(temporary, "WEBP", quality=85, method=6)
            temporary.replace(target/filename)
    with Image.open(target/filename) as check:
        check.load()
        assert check.size == size
    return original_sha, filename, size


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--images", type=Path, required=True)
    parser.add_argument("--workspace", type=Path, required=True)
    args = parser.parse_args()
    words = json.loads(read(ROOT / "public/data/v1/words.json"))
    word_by_id = {w["wordId"]: w for w in words}
    u1 = args.workspace / "work/Unit01_圖句審閱包_20260919"
    redraw_path = args.workspace / "work/LV1_U04-U15_同步_20260920/四張重畫核准.json"
    redraws = {x["id"].removeprefix("LV1-"): x for x in json.loads(read(redraw_path))["items"]}
    source_rows = []
    for review in sorted((u1 / "審閱文件").glob("批次_*.md")):
        for match in re.finditer(r"^## (U01-\d{2})｜`([^`]+)`\r?\n([\s\S]*?)(?=^## |\Z)", read(review), re.M):
            short_id, word, block = match.groups()
            assert "通過" in field(block, "美術裁示") and "通過" in field(block, "圖句配對裁示")
            filename = re.search(r"\[([^\]]+)\]", field(block, "圖片檔"))[1]
            source_rows.append(dict(id="LV1-"+short_id, unit=1, word=word, word_id=field(block, "word_id").strip("`"), english=field(block, "英文例句"), chinese=field(block, "中文例句"), image=u1/"Unit_01"/filename, approval=review, pos=field(block,"詞性"), meaning=field(block,"本次義項")))
    assert len(source_rows) == 38
    for unit in range(2, 16):
        directory = args.images / f"Unit_{unit:02}"
        rows = list(csv.DictReader(read(directory/"manifest.tsv").splitlines(), delimiter="\t"))
        review_md = read(directory/"圖句審閱.md")
        if unit == 2:
            approval = directory/"approval.json"
            approved = {x["id"]: x for x in json.loads(read(approval))["items"]}
            orders = {x["id"].rsplit("-",1)[1] for x in approved.values()}
        else:
            approval = directory/"首輪修改核准紀錄.md"
            orders = {n for clause in re.findall(r"核准範圍：([^，\r\n]+)", read(approval)) for n in re.findall(r"\d{2}",clause)}
        for row in rows:
            if row["order"] not in orders:
                continue
            item_id = f"LV1-U{unit:02}-{row['order']}"
            block = review_md.split("## "+item_id+" ·",1)[1].split("\n## ",1)[0]
            assert field(block,"英文例句") == row["english"] and field(block,"中文例句") == row["chinese"], item_id
            image = directory/row["file"]
            if unit == 2:
                pair = approved[item_id]
                assert pair["english"] == row["english"] and pair["chinese"] == row["chinese"]
                assert sha(image.read_bytes()) == pair["imageSha256"].lower(), item_id
            if item_id.removeprefix("LV1-") in redraws:
                pair = redraws[item_id.removeprefix("LV1-")]
                assert sha(image.read_bytes()) == pair["imageSha256"].lower(), item_id
                assert pair["english"] == row["english"] and pair["chinese"] == row["chinese"]
            source_rows.append(dict(row, id=item_id, unit=unit, image=image, approval=approval, pos=field(block,"詞性"), meaning=field(block,"詞義資料")))
    assert len(source_rows) == 434, len(source_rows)
    delegated_approval = args.workspace / "work/LV1_U22-U25_修正_20260922/approval.json"
    delegated = json.loads(read(delegated_approval))
    assert delegated["units"] == [22, 23, 24, 25]
    assert len(delegated["items"]) == 292
    for pair in delegated["items"]:
        assert pair["artworkProxyReviewed"] and pair["imageTextPairProxyReviewed"]
        assert pair["publishAuthorized"] and not pair["userItemByItemApproval"]
        directory = args.images / f"Unit_{pair['unit']:02}"
        rows = list(csv.DictReader(read(directory/"manifest.tsv").splitlines(), delimiter="\t"))
        row = next(row for row in rows if row["order"] == pair["order"])
        assert pair["id"] == f"LV1-U{pair['unit']:02}-{row['order']}"
        assert pair["word"] == row["word"] and pair["english"] == row["english"] and pair["chinese"] == row["chinese"]
        image = directory / row["file"]
        assert pair["imageFile"] == row["file"] and sha(image.read_bytes()) == pair["imageSha256"]
        source_rows.append(dict(row, id=pair["id"], unit=pair["unit"], image=image, approval=delegated_approval,
                                pos=pair.get("pos") or "", meaning=pair.get("meaning") or ""))
    assert len(source_rows) == 726, len(source_rows)
    cards, audit = [], []
    target = ROOT/"public/wordbeast/lv1-reviewed"
    target.mkdir(parents=True, exist_ok=True)
    with ThreadPoolExecutor(max_workers=6) as pool:
        converted = list(pool.map(lambda row: convert(row, target), source_rows))
    for row, (original_sha, filename, size) in zip(source_rows, converted):
        word = word_by_id.get(row["word_id"])
        if not word:
            candidates = [w for w in words if row["word"].lower() in forms(w["word"]) | set(x.lower() for x in w["wordVariants"])]
            assert len(candidates) <= 1, (row["id"], candidates)
            word = candidates[0] if candidates else None
        if word:
            aliases = forms(word["word"]) | set(x.lower() for x in word["wordVariants"]) | {row["word"].lower()}
            assert row["word"].lower() in forms(word["word"]) | set(x.lower() for x in word["wordVariants"]), (row["id"], word["word"])
        else:
            aliases = {row["word"].lower()}
        illustration = dict(path="wordbeast/lv1-reviewed/"+filename, captionEn=row["english"], captionZh=row["chinese"])
        cards.append(dict(id=row["id"], unit=row["unit"], displayWord=row["word"], officialWordId=word["wordId"] if word else None, aliases=sorted(aliases), illustration=illustration))
        audit.append(dict(id=row["id"], sourceImage=row["image"].name, sourceImageSha256=original_sha, publishedImageSha256=sha((target/filename).read_bytes()), textSha256=sha((row["english"]+"\n"+row["chinese"]).encode()), approvalSource=f"Unit_{row['unit']:02}/"+row["approval"].name, approvalSha256=sha(row["approval"].read_bytes()), reviewedPos=row["pos"], reviewedMeaning=row["meaning"], dimensions=size))
    assert len({c["id"] for c in cards}) == len(cards)
    (ROOT/"src/features/vocabulary/lv1ReviewedImages.json").write_text(json.dumps(cards, ensure_ascii=False, indent=2)+"\n",encoding="utf-8")
    audit_dir = ROOT/"scripts/approvals"
    audit_dir.mkdir(exist_ok=True)
    (audit_dir/"lv1-images-20260922.json").write_text(json.dumps(audit, ensure_ascii=False, indent=2)+"\n",encoding="utf-8")
    # A lightweight public index also preserves supplemental words without inventing IDs.
    sections = []
    esc = html.escape
    published_units = sorted({card["unit"] for card in cards})
    for unit in published_units:
        entries = []
        for card in cards:
            if card["unit"] != unit:
                continue
            img = card["illustration"]
            link = '<a href="../../#/word/'+card["officialWordId"]+'">開啟字卡</a>' if card["officialWordId"] else '<span>教材補充詞（尚無獨立字卡）</span>'
            entries.append(f'<article id="{card["id"]}"><h3>{card["id"]} · {esc(card["displayWord"])}</h3><img loading="lazy" width="1254" height="1254" src="{img["path"].rsplit("/",1)[1]}" alt="{esc(img["captionZh"])}"><p lang="en">{esc(img["captionEn"])}</p><p>{esc(img["captionZh"])}</p>{link}</article>')
        sections.append(f'<section id="unit-{unit:02}"><h2>Unit {unit:02} · {len(entries)} 組</h2><div class="grid">'+"".join(entries)+"</div></section>")
    nav=" ".join(f'<a href="#unit-{u:02}">{u:02}</a>' for u in published_units)
    page='<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>LV1 已審閱圖句</title><style>body{max-width:1200px;margin:24px auto;padding:0 20px;background:#f6f0df;color:#272c23;font:18px/1.7 system-ui}nav{display:flex;gap:16px;flex-wrap:wrap}a{color:#405734}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:24px}article{min-width:0;padding:16px;background:#fffdf7}img{width:100%;height:auto}h3{font-size:1rem}p{overflow-wrap:anywhere}</style><h1>LV1 已審閱圖句</h1><p>726 組已審閱圖片與中英例句；Unit 01–15 為使用者核准內容，Unit 22–25 為使用者授權後的代理審查發布內容。補充詞保留素材，不建立虛構單字編號。</p><nav>'+nav+'</nav>'+"".join(sections)+'</html>'
    # Relative to wordbeast/lv1-reviewed/ under any deployment base.
    page=page.replace('<title>', '<link rel="icon" href="../../favicon.svg"><title>', 1)
    (target/"index.html").write_text(page,encoding="utf-8")
    print(json.dumps(dict(total=len(cards), mapped=sum(c["officialWordId"] is not None for c in cards), uniqueWords=len({c["officialWordId"] for c in cards if c["officialWordId"]}), supplemental=[dict(id=c["id"],word=c["displayWord"]) for c in cards if not c["officialWordId"]], megabytes=round(sum(p.stat().st_size for p in target.glob('*.webp'))/1e6,2)),ensure_ascii=False))


if __name__ == "__main__":
    main()
