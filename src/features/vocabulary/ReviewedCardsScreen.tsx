import { Link, useParams, useSearchParams } from 'react-router-dom';
import SpeakerButton from '../../components/SpeakerButton';
import { useStudyBookmark } from '../modes/useStudyBookmark';
import images from './lv1ReviewedImages.json';
import { textbookPath } from './textbookCatalog';
import '../modes/learning-home.css';

export default function ReviewedCardsScreen() {
  const { unit } = useParams();
  const [params, setParams] = useSearchParams();
  const cards = images.filter(i => i.unit === Number(unit));
  const index = Math.max(0, cards.findIndex(i => i.id === params.get('item')));
  const card = cards[index];
  const path = textbookPath('LV1', Number(unit));
  const saveFailed = useStudyBookmark(card ? { href: `${path}/cards?item=${encodeURIComponent(card.id)}`,
    title: `LV1 Unit ${String(unit).padStart(2,'0')} · 圖句`, position: index + 1, total: cards.length } : undefined);
  const next = (n: number) => { setParams({item:cards[n].id}); window.scrollTo({top:0,behavior:'instant'}); };
  return <div className="learning-page">
    <header className="learning-header"><Link to={cards.length ? path : '/textbook'}>← 課本單元</Link><Link to="/">首頁</Link></header>
    {!card ? <h1>找不到這個單元</h1> : <>
      <p className="learning-muted">LV1 Unit {String(unit).padStart(2,'0')} · {index + 1}／{cards.length} 張</p>
      <h1>{card.displayWord}</h1><SpeakerButton text={card.displayWord}/>
      <figure className="learning-illustration"><img key={card.id} src={`${import.meta.env.BASE_URL}${card.illustration.path}`} alt={card.illustration.captionZh} width="768" height="768"/><figcaption><p lang="en">{card.illustration.captionEn}</p><p>{card.illustration.captionZh}</p></figcaption></figure>
      <div className="learning-card-nav"><button className="learning-secondary" disabled={index===0} onClick={() => next(index-1)}>上一張</button>{index < cards.length-1 ? <button className="learning-primary" onClick={() => next(index+1)}>下一張 →</button> : <Link className="learning-primary" to={path}>本單元看完了</Link>}</div>
      {card.officialWordId && <details><summary>更多詞義與搭配</summary><Link to={`/word/${card.officialWordId}`}>查看完整單字卡 →</Link></details>}
      {saveFailed && <p role="alert">這張字卡的位置尚未保存，請確認儲存空間後重新整理。</p>}
    </>}
  </div>;
}
