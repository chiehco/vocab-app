"""xlsx -> JSON data pipeline for the vocab app.

Usage:
    python scripts/import_data.py --source <path-to-xlsx> [--out public/data/v1]

Reads the user's vocabulary spreadsheet (read-only) and writes versioned,
git-diffable JSON bundles consumed by the app at build time.
"""

import argparse
import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import openpyxl

VALID_LEVELS = {"LV1", "LV2", "LV3", "LV4", "LV5", "LV6"}

SHEETS = {
    "words": "input_words_單字主表",
    "examples": "input_examples_例句表",
    "relations": "input_relations_關聯詞",
    "morphemes": "input_morphemes_字根拆解",
    "media": "input_media_prompts_圖卡",
}

# 選配工作表：Excel 裡還沒有也不會報錯，輸出空陣列
OPTIONAL_SHEETS = {
    "notes": "input_notes_補充說明",
}

ID_PREFIX = {"words": "W", "examples": "E", "relations": "R", "morphemes": "M", "media": "A", "notes": "N"}


def clean(v):
    if v is None:
        return None
    if isinstance(v, str):
        v = v.strip()
        return v if v else None
    return v


def gen_id(sheet_key, *parts):
    h = hashlib.sha256(("|".join(str(p) for p in parts)).encode("utf-8")).hexdigest()[:8]
    return f"{ID_PREFIX[sheet_key]}X{h}"


def read_rows(ws):
    """Yield cleaned row tuples starting from row 3 (row1=header, row2=instructional sample)."""
    rows = ws.iter_rows(min_row=1, values_only=True)
    header = next(rows, None)
    sample = next(rows, None)
    if header is None:
        return []
    # Row 2 of every input_* sheet is a 填表說明 row, not data. If the template
    # shape ever changes this assert fails loudly instead of silently dropping a word.
    if sample is not None and clean(sample[0]) is not None:
        first = str(sample[0])
        if not ("可空" in first or "填" in first or "說明" in first):
            raise SystemExit(
                f"錯誤：工作表「{ws.title}」第 2 列看起來是真實資料（{first!r}），"
                "與預期的填表說明列不符。請檢查模板結構或調整 import_data.py。"
            )
    out = []
    for row in rows:
        vals = [clean(v) for v in row]
        if all(v is None for v in vals):
            continue
        out.append(vals)
    return out


def parse_words(ws):
    words = []
    seen = {}
    for r in read_rows(ws):
        (word_id, word, level, pos, meaning_zh, meaning_en, usage_pattern, syllables,
         stress, phonetic_us, family_key, is_core, source_note, status) = (list(r) + [None] * 14)[:14]
        if word is None:
            continue
        if word in seen:
            raise SystemExit(
                f"錯誤：單字「{word}」在 input_words 中重複出現（{seen[word]} 與 {word_id}）。"
                "進度資料以 word 為主鍵，必須唯一；請先在 Excel 中修正。"
            )
        seen[word] = word_id
        if level not in VALID_LEVELS:
            raise SystemExit(f"錯誤：單字「{word}」的 level 值「{level}」不在 LV1–LV6 範圍內。")
        pos = pos or ""
        pos_all = [p.strip() for p in pos.split("/") if p.strip()]
        words.append({
            "wordId": word_id or gen_id("words", word),
            "word": word,
            "level": level,
            "pos": pos or None,
            "posAll": pos_all,
            "meaningZh": meaning_zh,
            "meaningEn": meaning_en,
            "usagePattern": usage_pattern,
            "syllables": syllables,
            "stressPattern": stress,
            "phoneticUs": phonetic_us,
            "familyKey": family_key,
            "isCore": bool(is_core) if is_core is not None else False,
            "sourceNote": source_note,
            "status": status or "draft",
        })
    words.sort(key=lambda w: w["wordId"])
    return words


def parse_examples(ws):
    out = []
    for r in read_rows(ws):
        (ex_id, word, sense_pos, hint, ex_type, sen_en, sen_zh, blank, answer,
         difficulty, status) = (list(r) + [None] * 11)[:11]
        if word is None or sen_en is None:
            continue
        out.append({
            "exampleId": ex_id or gen_id("examples", word, sen_en),
            "word": word,
            "sensePos": sense_pos,
            "meaningHint": hint,
            "exampleType": ex_type,
            "sentenceEn": sen_en,
            "sentenceZh": sen_zh,
            "blankSentence": blank,
            "answer": answer,
            "difficulty": difficulty,
            "status": status or "draft",
        })
    out.sort(key=lambda x: x["exampleId"])
    return out


def parse_relations(ws):
    out = []
    for r in read_rows(ws):
        (rel_id, word, related, rel_type, direction, note, strength, status) = (list(r) + [None] * 8)[:8]
        if word is None or related is None:
            continue
        out.append({
            "relationId": rel_id or gen_id("relations", word, related, rel_type),
            "word": word,
            "relatedWord": related,
            "relationType": rel_type,
            "direction": direction,
            "note": note,
            "strength": strength,
            "status": status or "draft",
        })
    out.sort(key=lambda x: x["relationId"])
    return out


def parse_morphemes(ws):
    out = []
    for r in read_rows(ws):
        (row_id, word, morpheme, m_type, m_zh, m_en, origin, order, note, status) = (list(r) + [None] * 10)[:10]
        if word is None or morpheme is None:
            continue
        out.append({
            "rowId": row_id or gen_id("morphemes", word, morpheme, order),
            "word": word,
            "morpheme": morpheme,
            "morphemeType": m_type,
            "meaningZh": m_zh,
            "meaningEn": m_en,
            "origin": origin,
            "order": order,
            "note": note,
            "status": status or "draft",
        })
    out.sort(key=lambda x: x["rowId"])
    return out


def parse_media(ws):
    out = []
    for r in read_rows(ws):
        (asset_id, target_type, target_word, target_hint, media_type, image_type,
         prompt_en, caption_zh, status, license_note) = (list(r) + [None] * 10)[:10]
        if target_word is None or prompt_en is None:
            continue
        out.append({
            "assetId": asset_id or gen_id("media", target_word, prompt_en),
            "targetType": target_type,
            "targetWord": target_word,
            "targetHint": target_hint,
            "mediaType": media_type,
            "imageType": image_type,
            "promptEn": prompt_en,
            "captionZh": caption_zh,
            "status": status or "draft",
            "licenseNote": license_note,
        })
    out.sort(key=lambda x: x["assetId"])
    return out


def parse_notes(ws):
    out = []
    for r in read_rows(ws):
        (note_id, word, note_type, title, content, status) = (list(r) + [None] * 6)[:6]
        if word is None or content is None:
            continue
        out.append({
            "noteId": note_id or gen_id("notes", word, note_type, title or content[:40]),
            "word": word,
            "noteType": note_type or "usage",
            "title": title,
            "content": content,
            "status": status or "draft",
        })
    out.sort(key=lambda x: x["noteId"])
    return out


def write_json(path, data):
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--source", required=True)
    ap.add_argument("--out", default="public/data/v1")
    args = ap.parse_args()

    src = Path(args.source)
    if not src.exists():
        raise SystemExit(f"錯誤：找不到來源檔案 {src}")
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    wb = openpyxl.load_workbook(src, read_only=True, data_only=True)
    for key, sheet_name in SHEETS.items():
        if sheet_name not in wb.sheetnames:
            raise SystemExit(f"錯誤：找不到工作表「{sheet_name}」。")

    words = parse_words(wb[SHEETS["words"]])
    examples = parse_examples(wb[SHEETS["examples"]])
    relations = parse_relations(wb[SHEETS["relations"]])
    morphemes = parse_morphemes(wb[SHEETS["morphemes"]])
    media = parse_media(wb[SHEETS["media"]])
    notes_sheet = OPTIONAL_SHEETS["notes"]
    notes = parse_notes(wb[notes_sheet]) if notes_sheet in wb.sheetnames else []

    word_set = {w["word"] for w in words}
    for label, rows, field in [
        ("例句", examples, "word"),
        ("關聯詞", relations, "word"),
        ("字根", morphemes, "word"),
        ("圖卡", media, "targetWord"),
        ("補充說明", notes, "word"),
    ]:
        missing = sorted({r[field] for r in rows if r[field] not in word_set})
        if missing:
            print(f"警告：{label}表中有 {len(missing)} 個單字不存在於單字主表：{', '.join(missing[:10])}"
                  + ("…" if len(missing) > 10 else ""), file=sys.stderr)

    write_json(out_dir / "words.json", words)
    write_json(out_dir / "examples.json", examples)
    write_json(out_dir / "relations.json", relations)
    write_json(out_dir / "morphemes.json", morphemes)
    write_json(out_dir / "media.json", media)
    write_json(out_dir / "notes.json", notes)

    words_hash = hashlib.sha256((out_dir / "words.json").read_bytes()).hexdigest()
    # contentHash 涵蓋所有 App 會載入的資料檔：任何一張表變動都會觸發前端重灌
    h = hashlib.sha256()
    for name in ["words.json", "examples.json", "relations.json", "morphemes.json", "notes.json"]:
        h.update((out_dir / name).read_bytes())
    content_hash = h.hexdigest()
    meta = {
        "schemaVersion": 1,
        "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "sourceFile": src.name,
        "counts": {
            "words": len(words),
            "examples": len(examples),
            "relations": len(relations),
            "morphemes": len(morphemes),
            "media": len(media),
            "notes": len(notes),
        },
        "wordsHash": words_hash,
        "contentHash": content_hash,
    }
    write_json(out_dir / "meta.json", meta)

    print("匯入完成：")
    for k, v in meta["counts"].items():
        print(f"  {k}: {v}")
    print(f"  wordsHash: {words_hash[:16]}…")


if __name__ == "__main__":
    main()
