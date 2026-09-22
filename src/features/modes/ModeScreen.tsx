import { Link } from 'react-router-dom';
import './modes.css';

type Mode = 'exam' | 'games';
function Entry({to,title,description}:{to:string;title:string;description:string}) {
  return <Link className="mode-entry" to={to}><div><h2>{title}</h2><p>{description}</p></div><span className="mode-arrow" aria-hidden="true">↗</span></Link>;
}
export default function ModeScreen({mode}:{mode:Mode}) {
  const titles = {exam:'大考練習',games:'單字遊戲'};
  return <div className="mode-page">
    <header className="mode-top"><Link to="/">← 萬詞譜</Link><Link to="/settings">設定</Link></header>
    <div className="mode-heading"><h1>{titles[mode]}</h1><span>{mode==='exam'?'選擇想練習的內容。':'用不同方式練習熟悉的單字。'}</span></div>
    {mode==='exam'&&<>
      <section className="mode-section"><h2 className="mode-section-title">學測</h2><Entry to="/exam/papers" title="學測考古" description="110–115 年 · 選擇、混合與非選擇題"/><Entry to="/exam/high-frequency" title="高頻單字" description="S+A 單字 · 字表、複習與練習"/></section>
    </>}
    {mode==='games'&&<>
      <Entry to="/arena/word-siege" title="拼字守城" description="選 Unit 拼字召喚援軍、冰凍與爆破，守住 60 秒"/>
      <Entry to="/arena/spell-barrage" title="字母轟炸" description="與電腦對手練習拼字"/>
      <Entry to="/arena/meaning-karuta" title="搶義花牌" description="翻牌配對英文與字義，和電腦搶對子"/>
    </>}
  </div>;
}
