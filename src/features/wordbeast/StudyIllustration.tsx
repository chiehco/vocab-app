import ResilientBeastImage from "./ResilientBeastImage";
import "./study-illustration.css";

export default function StudyIllustration({ src, word, caption }: { src: string; word: string; caption?: string | null }) {
  return (
    <figure className="study-illustration">
      <div className="study-illustration-image">
      <ResilientBeastImage src={src} word={word} alt={`${word} 的情境圖`} />
      </div>
      {caption?.trim() && <figcaption><span>這張圖在畫什麼</span><p>{caption}</p></figcaption>}
    </figure>
  );
}
