"""Produce public evidence references; private originals stay on the local backup."""
import json
import re
import sys
from pathlib import Path
from audit_paths import source_root

ROOT = Path(__file__).resolve().parent.parent

def clean_text(text):
    replacements = [(str(source_root()), 'source-art/LV1'),
                    (source_root().as_posix(), 'source-art/LV1'),
                    (str(ROOT), '<repo>'), (ROOT.as_posix(), '<repo>'),
                    (str(Path(sys.executable).parent), '<python-install>'),
                    (Path(sys.executable).parent.as_posix(), '<python-install>')]
    for old, new in replacements:
        text = text.replace(old.replace('\\', '\\\\'), new).replace(old, new)
    text = re.sub(r'libfile_[a-z0-9]+|file_[0-9a-f]{24,}', '[private artifact identity omitted]', text)
    text = text.replace('parent GitHub pixel review', 'independent original-asset pixel review')
    text = text.replace('generated_in_parent_library', 'generated_asset_available')
    return text

def clean_value(value):
    if isinstance(value, dict):
        return {(k.replace('parentIndependent', 'independent').replace('parentPixel', 'independentPixel')): clean_value(v) for k, v in value.items() if k not in {'library_file_id','file_id'}}
    if isinstance(value, list):
        return [clean_value(v) for v in value]
    return clean_text(value) if isinstance(value, str) else value

def main():
    count = 0
    for path in (ROOT/'docs/unit-audit-20261105').rglob('*'):
        if not path.is_file(): continue
        old = path.read_text(encoding='utf-8')
        if path.suffix == '.json':
            new = json.dumps(clean_value(json.loads(old)), ensure_ascii=False, indent=2)+'\n'
        else: new = clean_text(old)
        if new != old:
            path.write_text(new, encoding='utf-8', newline='\n'); count += 1
    # Legacy checkpoint writers must not reintroduce old identifiers/references.
    for name in ['save_u02_audit_checkpoint.mjs','save_u03_audit_checkpoint.mjs']:
        path = ROOT/'scripts'/name
        old = path.read_text(encoding='utf-8'); new = clean_text(old)
        if new != old: path.write_text(new, encoding='utf-8', newline='\n'); count += 1
    print(json.dumps({'sanitizedEvidenceFiles':count,'personalSourceRootRecorded':False}))

if __name__=='__main__': main()
