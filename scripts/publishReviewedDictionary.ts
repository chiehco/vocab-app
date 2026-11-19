import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';

// Keep the audited source snapshots intact. Both downloadable dictionaries must
// carry the reviewed rows, even for clients that read the JSON directly.
export function publishReviewedDictionary(): Plugin {
  const tables = ['words', 'senses', 'examples', 'relations', 'morphemes', 'notes', 'exam_priority', 'hooks', 'media'];
  const hash = (value: string) => createHash('sha256').update(value).digest('hex');
  return {
    name: 'publish-reviewed-dictionary',
    apply: 'build',
    async writeBundle(options) {
      if (!options.dir) throw new Error('Missing dictionary output directory');
      const dir = resolve(options.dir, 'data/v1');
      const read = (name: string) => readFile(resolve(dir, name + '.json'), 'utf8');
      const save = (name: string, data: unknown, compact = false) =>
        writeFile(resolve(dir, name + '.json'), JSON.stringify(data, null, compact ? undefined : 2) + '\n');
      const corrections = JSON.parse(await readFile(resolve('src/db/lv3U21Dictionary.json'), 'utf8'));
      const patchRow = (rows: Record<string, unknown>[], id: string, patch: Record<string, unknown>) => {
        const matches = rows.filter(row => row[id] === patch[id] && row.word === patch.word);
        if (matches.length !== 1) throw new Error('Expected one reviewed dictionary row for ' + patch[id]);
        Object.assign(matches[0], patch);
      };
      const words = JSON.parse(await read('words'));
      const examples = JSON.parse(await read('examples'));
      const pack = JSON.parse(await read('sa-pack'));
      const meta = JSON.parse(await read('meta'));
      for (const rows of [words, pack.words]) patchRow(rows, 'wordId', corrections.buffet);
      for (const rows of [examples, pack.examples]) patchRow(rows, 'exampleId', corrections.breakExample);
      await Promise.all([save('words', words), save('examples', examples)]);
      const digest = createHash('sha256');
      for (const table of tables) digest.update((await read(table)).replace(/\r\n/g, '\n'));
      meta.wordsHash = hash(await read('words'));
      meta.contentHash = digest.digest('hex');
      const { meta: starterMeta, ...datasets } = pack;
      starterMeta.wordsHash = 'sa:' + hash(JSON.stringify(datasets.words));
      starterMeta.contentHash = 'sa:' + hash(JSON.stringify({ sourceHash: meta.contentHash, datasets }));
      await Promise.all([save('meta', meta), save('sa-pack', pack, true)]);
    },
  };
}
