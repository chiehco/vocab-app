// @vitest-environment happy-dom
import { StrictMode, useState } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { createComponentHarness } from '../test/componentHarness';
import { recordPageView } from '../lib/pageViews';
import SitePageViews from './SitePageViews';

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it('reuses the bootstrap count across StrictMode, answer rerenders, route changes, and remounts', async () => {
  vi.stubEnv('PROD', true);
  vi.stubEnv('MODE', 'production');
  vi.stubEnv('VITE_PAGEVIEW_ENDPOINT', 'https://vocab-pageviews.example.workers.dev/pageviews');
  vi.stubGlobal('location', new URL('https://chiehco.github.io/vocab-app/#/quiz'));
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ total: 1234 }) });
  vi.stubGlobal('fetch', fetchMock);
  // Same entry-point call as main.tsx; counting does not depend on visiting home.
  await recordPageView();
  function Quiz() {
    const [answers, setAnswers] = useState(0);
    return <><button onClick={() => setAnswers(answers + 1)}>答題 {answers}</button><Link to="/">首頁</Link></>;
  }
  function Flow() {
    return <StrictMode><MemoryRouter initialEntries={['/quiz']}><Routes>
      <Route path="/quiz" element={<Quiz />} />
      <Route path="/" element={<><SitePageViews /><Link to="/quiz">測驗</Link></>} />
    </Routes></MemoryRouter></StrictMode>;
  }
  const view = createComponentHarness();
  try {
    await view.render(<Flow />);
    await view.click(view.container.querySelector('button'));
    expect(view.container.textContent).toContain('答題 1');
    await view.click(view.container.querySelector('a'));
    await view.waitFor(() => expect(view.container.textContent).toContain('網站累計瀏覽次數：1,234'));
    await view.render(<Flow />);
    await view.click(view.container.querySelector('a'));
    await view.click(view.container.querySelector('a'));
    await view.waitFor(() => expect(view.container.textContent).toContain('網站累計瀏覽次數：1,234'));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  } finally { await view.unmount(); }
});
