import { useEffect, useState, type ImgHTMLAttributes } from "react";
import "./resilient-beast-image.css";

interface ResilientBeastImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> {
  src: string;
  word?: string;
}

export default function ResilientBeastImage({ src, word: _word, className = "", alt = "", ...props }: ResilientBeastImageProps) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);

  if (!failed) return <img {...props} className={className} src={src} alt={alt} onError={() => setFailed(true)} />;
  return (
    <div className={`beast-image-fallback ${className}`} role="img" aria-label="圖片載入失敗">
      <svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="43" /><path d="M60 17v22M60 81v22M17 60h22M81 60h22M35 35l16 16M85 35 69 51M35 85l16-16M85 85 69 69" /><text x="60" y="69" textAnchor="middle">?</text></svg>
      <small>圖片載入失敗</small>
    </div>
  );
}
