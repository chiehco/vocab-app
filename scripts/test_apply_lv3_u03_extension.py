import copy
import json
from pathlib import Path
import shutil
import tempfile
import unittest

import lv3_u03_extension as extension

ROOT = Path(__file__).resolve().parent.parent


class U03HistoricalExtensionTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='u03-extension-guard-')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        for path in [*extension.SOURCE_HASHES, extension.MANIFEST]:
            target = self.root / path
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(ROOT / path, target)
        self.manifest = extension.authenticate(self.root)

    def test_restores_exact_5779_word_pack_without_source_writes(self):
        raw = (ROOT / extension.PACK).read_bytes()
        before = extension.before_pack(raw, self.manifest)
        self.assertEqual(extension.digest(before), self.manifest['beforeByteHash'])
        self.assertEqual(len(json.loads(before)['words']), 5779)
        self.assertEqual((ROOT / extension.PACK).read_bytes(), raw)

    def test_removes_only_registered_addition_from_historical_domain(self):
        domain = {extension.UNIT, extension.PACK, 'unregistered.json'}
        self.assertEqual(extension.historical_domain(self.root, domain), {extension.PACK, 'unregistered.json'})
        with self.assertRaisesRegex(ValueError, 'missing'):
            extension.historical_domain(self.root, {extension.PACK})

    def test_rejects_changed_source_and_manifest(self):
        source = self.root / extension.SOURCE
        source.write_bytes(source.read_bytes() + b' ')
        with self.assertRaisesRegex(ValueError, 'source drift'):
            extension.historical_domain(self.root, {extension.UNIT})
        shutil.copyfile(ROOT / extension.SOURCE, source)
        manifest = self.root / extension.MANIFEST
        document = json.loads(manifest.read_text(encoding='utf-8'))
        document['beforeByteHash'] = '0' * 64
        manifest.write_text(json.dumps(document), encoding='utf-8')
        with self.assertRaisesRegex(ValueError, 'manifest drift'):
            extension.authenticate(self.root)

    def test_rejects_unknown_pack_and_direct_unsealed_manifest(self):
        raw = (ROOT / extension.PACK).read_bytes().replace(b'\r\n', b'\n')
        for changed in [raw + b' ', raw.replace(b'"words":', b'"unexpected":', 1)]:
            with self.assertRaisesRegex(ValueError, 'byte drift'):
                extension.before_pack(changed, self.manifest)
        changed = copy.deepcopy(self.manifest)
        changed['beforeByteHash'] = '0' * 64
        with self.assertRaisesRegex(ValueError, 'manifest drift'):
            extension.before_pack(raw, changed)


if __name__ == '__main__':
    unittest.main()
