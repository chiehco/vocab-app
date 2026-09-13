"""Build the import lookup from existing LV1–LV6 records; never modifies the source."""
import json
from pathlib import Path

root = Path(__file__).resolve().parent.parent
words = json.loads((root / 'public/data/v1/words.json').read_text(encoding='utf-8'))
catalog = [dict(wordId=w['wordId'], word=w['word'], variants=w.get('wordVariants') or [])
           for w in words if w['level'] in ['LV1', 'LV2', 'LV3', 'LV4', 'LV5', 'LV6']]
(root / 'src/features/direct/wordCatalog.json').write_text(
    json.dumps(catalog, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
print(f'Indexed {len(catalog)} existing records. This is not a count of ready cards.')
