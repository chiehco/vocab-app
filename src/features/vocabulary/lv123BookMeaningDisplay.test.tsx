import 'fake-indexeddb/auto';
import { expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import VocabularyScreen from './VocabularyScreen';

it.each([
  ['LV1', 16, 'LI-LV1U16-V073', 'vt.', '寄（信）給……'],
  ['LV1', 17, 'LI-LV1U17-V061', 'adj.', '正確的'],
  ['LV1', 17, 'LI-LV1U17-V066', 'n./vt.', '郵件；郵寄（英）'],
  ['LV1', 18, 'LI-LV1U18-V065', 'vt.', '遺棄（戀人）'],
  ['LV1', 18, 'LI-LV1U18-V048', 'v.', '沐浴；使沈浸於……'],
  ['LV1', 19, 'LI-LV1U19-V046', 'n.', '小羊；羊肉'],
  ['LV1', 20, 'LI-LV1U20-V045', 'n.', '地球'],
  ['LV2', 37, 'LI-LV2U37-V092', 'vi./vt.', '拼寫'],
  ['LV2', 47, 'LI-LV2U47-V090', 'vt.', '避免'],
] as const)('keeps accepted book meaning and provenance for %s %s %s', (level, unit, id, pos, meaning) => {
  const html = renderToString(<MemoryRouter initialEntries={[`/vocabulary?level=${level}&unit=${unit}&item=${id}`]}><VocabularyScreen /></MemoryRouter>);
  const article = html.match(/<article[\s\S]*?<\/article>/)?.[0];
  expect(article).toContain(`${pos} ${meaning}`);
  expect(article).toContain('教材收錄義');
  expect(article).toContain('書上標記：');
  expect(article).not.toContain('這裡顯示既有一般字義');
});
