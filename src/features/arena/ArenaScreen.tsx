import { Link } from "react-router-dom";
import { getWordBeastAsset } from "../wordbeast/wordBeastAssets";
import "./arena.css";

const OPPONENT_ASSET = getWordBeastAsset("W999999", "pest");

export default function ArenaScreen() {
  return (
    <div className="arena-hub">
      <header className="arena-hub-header">
        <Link to="/">← 萬詞譜</Link>
        <span>OFFLINE ARENA</span>
        <b>單人</b>
      </header>

      <section className="arena-hub-hero">
        <div>
          <p>字獸競技場</p>
          <h1>敲響真名，<br /><em>把妄字轟回去。</em></h1>
          <span>不用登入。你的對手只是一隻很會裝忙的豆魔。</span>
        </div>
        {OPPONENT_ASSET && <img src={OPPONENT_ASSET} alt="競技場豆魔對手" />}
        <i aria-hidden="true" />
      </section>

      <main className="arena-game-list">
        <Link to="/arena/spell-barrage" className="arena-game-entry live">
          <span className="arena-game-number">01</span>
          <div><p>SPELL BARRAGE</p><h2>字母轟炸</h2><span>比豆魔更快敲完真名，勝者把妄字磚轟向對手。</span></div>
          <b>開戰 →</b>
        </Link>
        <div className="arena-game-entry locked" aria-disabled="true">
          <span className="arena-game-number">02</span>
          <div><p>MEANING KARUTA</p><h2>搶義花牌</h2><span>等待祭司完成真名多相資料後開陣。</span></div>
          <b>整備中</b>
        </div>
      </main>

      <p className="arena-hub-note">電腦對手完全在本機運作，不使用付費 AI，也不會半夜傳戰帖。</p>
    </div>
  );
}
