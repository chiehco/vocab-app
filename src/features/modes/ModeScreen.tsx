import { Link } from 'react-router-dom';
import './modes.css';

type Mode = 'home' | 'words' | 'exam' | 'games' | 'story';
function Entry({to,title,description,index}:{to:string;title:string;description:string;index?:string}) {
  return <Link className="mode-entry" to={to}><span className="mode-number" aria-hidden="true">{index ?? '—'}</span><div><h2>{title}</h2><p>{description}</p></div><span className="mode-arrow" aria-hidden="true">↗</span></Link>;
}
function Pending({title,description}:{title:string;description:string}) {
  return <div className="mode-pending"><div><h2>{title}</h2><p>{description}</p></div><span>準備中</span></div>;
}
export default function ModeScreen({mode='home'}:{mode?:Mode}) {
  const titles = {home:'萬詞譜',words:'單字模式',exam:'大考模式',games:'遊戲模式',story:'劇情模式'};
  return <div className="mode-page">
    <header className="mode-top"><Link to="/">{mode==='home'?'學習入口':'← 萬詞譜'}</Link><Link to="/settings">設定</Link></header>
    <div className="mode-heading"><p>WANCI PU</p><h1>{titles[mode]}</h1><span>{({home:'選擇今天的學習方式。',words:'從字卡開始，依自己的步調練習。',exam:'選擇考試，再選擇練習內容。',games:'用不同方式練習熟悉的單字。',story:'在故事裡遇見單字。'})[mode]}</span></div>
    {mode==='home'&&<>
      <section aria-label="選擇模式" className="mode-list">
        <Entry index="01" to="/modes/words" title="單字模式" description="LV1–LV6 · 字卡與複習 · 自建群組"/>
        <Entry index="02" to="/exam" title="大考模式" description="學測 · 會考 · 歷屆考題與高頻單字"/>
        <Entry index="03" to="/games" title="遊戲模式" description="單字遊戲 · 聽音與看圖逐步開放"/>
        <Entry index="04" to="/story" title="劇情模式" description="故事學習 · 準備中"/>
      </section><footer className="mode-footer"><Link to="/progress">學習紀錄 →</Link><span>照自己的步調就好。</span></footer>
    </>}
    {mode==='words'&&<>
      <section className="mode-section"><h2 className="mode-section-title">選擇等級</h2><div className="mode-levels">{[1,2,3,4,5,6].map(n=><Link key={n} to={`/units?level=LV${n}&order=exam`}><b>LV{n}</b><small>查看單字卡</small></Link>)}</div></section>
      <Entry to="/units" title="連續看字卡" description="原有圖卡與內容 · 每 30 字一組 · 學測優先或字母排序"/>
      <Entry to="/groups" title="自建群組" description="建立自己的清單，或直接帶入教材 Unit"/>
      <Entry to="/review" title="複習模式" description="目前提供 S+A 高頻字的到期複習"/>
      <details className="mode-more"><summary>更多單字工具</summary><Link to="/browse?level=全部">全部單字卡</Link><Link to="/vocabulary">教材義項與文法補充 · LV3 Unit 1–2</Link><Link to="/placement">程度測驗</Link></details>
    </>}
    {mode==='exam'&&<>
      <section className="mode-section"><h2 className="mode-section-title">學測</h2><Entry to="/exam/papers" title="學測考古" description="110–115 年 · 選擇、混合與非選擇題"/><Entry to="/exam/high-frequency" title="高頻單字" description="S+A 單字 · 字表、複習與練習"/></section>
      <section className="mode-section"><h2 className="mode-section-title">會考</h2><Pending title="會考考古" description="歷屆試題"/><Pending title="高頻單字" description="會考常見詞彙"/></section>
    </>}
    {mode==='games'&&<>
      <Entry to="/arena" title="字母轟炸" description="已開放 · 與電腦對手練習拼字"/>
      <Pending title="聽音" description="聽音辨字遊戲"/><Pending title="看圖" description="圖像單字遊戲"/>
    </>}
    {mode==='story'&&<Pending title="故事篇章" description="依開發順序，於單字與大考模式後推出。"/>}
  </div>;
}
