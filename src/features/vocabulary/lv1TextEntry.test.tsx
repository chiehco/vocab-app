import { expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import VocabularyScreen from './VocabularyScreen';

it('opens the requested LV1 text unit instead of falling back to LV3', () => {
  const html = renderToStaticMarkup(<MemoryRouter initialEntries={['/vocabulary?level=LV1&unit=16']}><VocabularyScreen /></MemoryRouter>);
  expect(html).toContain('guess');
  expect(html).toContain('教材第 142 頁');
  expect(html).toContain('詞彙字卡（79）');
  expect(html).toContain('用法與搭配（57）');
  expect(html).toContain('/textbook/LV1/16');
  expect(html).not.toContain('illustration');
});
