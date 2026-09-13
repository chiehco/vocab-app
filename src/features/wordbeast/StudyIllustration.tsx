import { useState } from "react";
import { getIllustrationCaption } from "./illustrationCaptions";
import "./study-illustration.css";

function IllustrationImage({ src, alt }: { src: string; alt: string }) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [attempt, setAttempt] = useState(0);
  return <div className="study-illustration-image" aria-busy={status === 'loading'}>
    <img key={attempt} src={src} alt={alt} decoding="async" fetchPriority="high"
      style={{ visibility: status === 'ready' ? 'visible' : 'hidden' }}
      onLoad={() => setStatus('ready')} onError={() => setStatus('failed')} />
    {status === 'loading' && <span className="illustration-loading" role="status">圖片載入中…</span>}
    {status === 'failed' && <div className="illustration-loading" role="status">
      <span>圖片暫時無法載入</span>
      <button type="button" onClick={() => { setStatus('loading'); setAttempt(n => n + 1); }}>重新載入圖片</button>
    </div>}
  </div>;
}

export default function StudyIllustration({ src, word, caption }: { src: string; word: string; caption?: string | null }) {
  const pair = getIllustrationCaption(caption);
  return (
    <figure className="study-illustration">
      <IllustrationImage key={src} src={src} alt={pair?.zh || `${word} 的情境圖`} />
      {pair && <figcaption>
        {pair.en && <p className="illustration-caption-en" lang="en">{pair.en}</p>}
        <p lang="zh-Hant">{pair.zh}</p>
      </figcaption>}
    </figure>
  );
}
