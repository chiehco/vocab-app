import { useEffect, useState } from 'react';
import { recordPageView } from '../lib/pageViews';

export default function SitePageViews() {
  const [total, setTotal] = useState<number | null>(null);
  useEffect(() => {
    let active = true;
    void recordPageView().then(value => { if (active) setTotal(value); });
    return () => { active = false; };
  }, []);

  // Unconfigured, offline, blocked, and unavailable services show no invented number.
  if (total === null) return null;
  return <p className="learning-muted">網站累計瀏覽次數：{total.toLocaleString('zh-TW')}</p>;
}
