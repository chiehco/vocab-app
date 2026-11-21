"""Read-only U03 projection for the immutable pre-U03 audit fixtures."""
from contextlib import contextmanager
import copy
import hashlib
import json
from pathlib import Path
import shutil
import tempfile
import apply_lv3_unit_audit as v1

UNIT = 'src/features/direct/curriculumLV3Unit3.json'
SOURCE = 'scripts/sources/LV3Unit3.json'
MANIFEST = 'docs/lv3-u03-recovery-20261122/starter-extension.json'
PACK = 'public/data/v1/sa-pack.json'
MANIFEST_HASH = '9356a7533c440303716999e0e45fa3be5fa0e93c7d1ecbb2b4d9c7a909a76db0'
SOURCE_HASHES = {
    UNIT: 'c7bbf7549fe0ee8377a87a6a6def39c8b0c6f64f96c46110de8865d8f906b3dc',
    SOURCE: '0aa5aa15a0a9984dcb538a4436afb2e999c175fea41aefe5eb919e7beb172e3e',
}


def digest(data):
    return hashlib.sha256(data).hexdigest()


def encoded(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':'), allow_nan=False).encode('utf-8')


def present(root):
    return (Path(root) / UNIT).exists() or (Path(root) / MANIFEST).exists()


def authenticate(root):
    root = Path(root)
    for path, expected in SOURCE_HASHES.items():
        if digest(v1.safe_path(root, path).read_bytes().replace(b'\r\n', b'\n')) != expected:
            raise ValueError('U03 source drift: ' + path)
    manifest = v1.read_json(v1.safe_path(root, MANIFEST))
    if digest(encoded(manifest)) != MANIFEST_HASH:
        raise ValueError('U03 extension manifest drift')
    return manifest


def historical_domain(root, paths):
    paths = set(paths)
    if not present(root):
        return paths
    authenticate(root)
    if UNIT not in paths:
        raise ValueError('U03 missing from current input domain')
    return paths - {UNIT}


def before_pack(raw, manifest):
    if digest(encoded(manifest)) != MANIFEST_HASH:
        raise ValueError('U03 extension manifest drift')
    raw = raw.replace(b'\r\n', b'\n')
    if digest(raw) != manifest['afterByteHash']:
        raise ValueError('U03 current starter byte drift')
    pack = json.loads(raw)
    if pack['meta'] != manifest['afterMeta']:
        raise ValueError('U03 current starter metadata drift')
    for dataset, added in manifest['addedRows'].items():
        for entry in reversed(added):
            if pack[dataset][entry['index']] != entry['row']:
                raise ValueError('U03 added starter row drift')
            del pack[dataset][entry['index']]
    pack['meta'] = copy.deepcopy(manifest['beforeMeta'])
    result = encoded(pack) + b'\n'
    if digest(result) != manifest['beforeByteHash']:
        raise ValueError('U03 complete historical starter drift')
    return result


@contextmanager
def historical_view(root, paths):
    """Copy only the original input domain into TEMP; never run a transaction."""
    root = Path(root)
    manifest = authenticate(root)
    original = {path: v1.safe_path(root, path).read_bytes() for path in paths}
    domain = historical_domain(root, paths)
    with tempfile.TemporaryDirectory(prefix='lv3-u03-historical-fixture-') as temp:
        view = Path(temp)
        for path in domain:
            target = view / path
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(before_pack(original[path], manifest) if path == PACK else original[path])
        shutil.copytree(v1.safe_path(root, 'docs/lv3-audit-20261107'), view / 'docs/lv3-audit-20261107', symlinks=True)
        for unit in (18, 19, 20):
            path = f'scripts/sources/LV3Unit{unit}.json'
            target = view / path
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(v1.safe_path(root, path), target)
        yield view
        if any(v1.safe_path(root, path).read_bytes() != raw for path, raw in original.items()):
            raise ValueError('Concurrent source change during U03 historical projection')
        authenticate(root)
