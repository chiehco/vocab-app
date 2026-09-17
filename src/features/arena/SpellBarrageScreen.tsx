import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { getKnownWords, getLogicalCardStates } from "../../db/progressIdentity";
import { contentDb } from "../../db/contentDb";
import { getSetting, progressDb } from "../../db/progressDb";
import type { WordRecord } from "../../db/types";
import SpeakerButton from "../../components/SpeakerButton";
import ResilientBeastImage from "../wordbeast/ResilientBeastImage";
import { getWordBeastAsset } from "../wordbeast/wordBeastAssets";
import {
  ARENA_DIFFICULTIES,
  buildLetterTiles,
  composeArenaAnswer,
  getCpuFinishMs,
  normalizeArenaAnswer,
  selectArenaWords,
  selectScopedArenaWords,
  type ArenaDifficulty,
  type LetterTile,
} from "./spellBarrage";
import "./arena.css";
import { useToday } from "../../hooks/useToday";
import { useGroupScope } from "./useGroupScope";

type Stage = "setup" | "playing" | "result";
type Fighter = "player" | "cpu";
interface RoundOutcome { winner: Fighter; matchOver: boolean }
interface ArenaRecord { wins: number; losses: number }

const MATCH_POINT = 3;
const RECORD_KEY = "arenaSpellRecord";
const OPPONENT_ASSET = getWordBeastAsset("W999999", "pest");

export default function SpellBarrageScreen() {
  const today = useToday();
  const scope = useGroupScope();
  const poolData = useLiveQuery(async () => {
    const [words, knownKeys, levels, priorities, cardStates] = await Promise.all([
      contentDb.words.toArray(),
      getKnownWords(),
      getSetting<string[]>("learningLevels"),
      contentDb.examPriorities.where("priorityTier").anyOf(["S", "A"]).sortBy("rank"),
      getLogicalCardStates(),
    ]);
    const dueWords = new Set(cardStates
      .filter((card) => card.dueDate <= today || !!card.practicePending)
      .map((card) => card.word));
    return {
      words,
      known: new Set(knownKeys as string[]),
      levels,
      selectionContext: { prioritizedWords: priorities.map((row) => row.word), dueWords },
    };
  }, [today]);
  const record = useLiveQuery(async () => {
    const row = await progressDb.settings.get(RECORD_KEY);
    return (row?.value as ArenaRecord | undefined) ?? { wins: 0, losses: 0 };
  }, []);

  const [stage, setStage] = useState<Stage>("setup");
  const [difficulty, setDifficulty] = useState<ArenaDifficulty>("apprentice");
  const [roundWords, setRoundWords] = useState<WordRecord[]>([]);
  const [roundIndex, setRoundIndex] = useState(0);
  const [playerScore, setPlayerScore] = useState(0);
  const [cpuScore, setCpuScore] = useState(0);
  const [tiles, setTiles] = useState<LetterTile[]>([]);
  const [selectedTileIds, setSelectedTileIds] = useState<string[]>([]);
  const [cpuFinishMs, setCpuFinishMs] = useState(0);
  const [roundStartedAt, setRoundStartedAt] = useState(0);
  const [playerBlockers, setPlayerBlockers] = useState(0);
  const [cpuBlockers, setCpuBlockers] = useState(0);
  const [outcome, setOutcome] = useState<RoundOutcome | null>(null);
  const [matchWinner, setMatchWinner] = useState<Fighter | null>(null);
  const [stunned, setStunned] = useState(false);
  const [feedback, setFeedback] = useState("排好完整拼字後再送出");
  const roundLocked = useRef(false);
  const stunTimer = useRef<number | null>(null);

  const currentWord = roundWords[roundIndex];
  const answer = currentWord ? normalizeArenaAnswer(currentWord.word) : "";
  const entered = composeArenaAnswer(tiles, selectedTileIds);
  const learnedCount = poolData ? poolData.words.filter((word) => poolData.known.has(word.word)).length : 0;
  const scopedEligibleCount = scope.groupId ? selectScopedArenaWords(scope.words ?? [], Infinity, () => 0.5).length : 0;
  const poolReady = scope.groupId ? !scope.loading : !!poolData;

  /** 群組模式只用範圍內的字；否則走已學優先的隨機字池。 */
  const pickRound = useCallback((random: () => number) => {
    if (scope.groupId) return selectScopedArenaWords(scope.words ?? [], 5, random, poolData?.selectionContext);
    return poolData ? selectArenaWords(poolData.words, poolData.known, poolData.levels, 5, random, poolData.selectionContext) : [];
  }, [scope.groupId, scope.words, poolData]);

  const prepareRound = useCallback((words: WordRecord[], index: number, incomingPlayerBlockers: number, incomingCpuBlockers: number) => {
    const word = words[index];
    const nextAnswer = normalizeArenaAnswer(word.word);
    setRoundIndex(index);
    setPlayerBlockers(incomingPlayerBlockers);
    setCpuBlockers(incomingCpuBlockers);
    setTiles(buildLetterTiles(nextAnswer, incomingPlayerBlockers));
    setSelectedTileIds([]);
    setCpuFinishMs(getCpuFinishMs(nextAnswer, difficulty, incomingCpuBlockers, Math.random()));
    setRoundStartedAt(Date.now());
    setStunned(false);
    setFeedback(incomingPlayerBlockers > 0 ? "先敲碎對手轟來的妄磚" : "排好完整拼字後再送出");
    setOutcome(null);
    roundLocked.current = false;
  }, [difficulty]);

  function startMatch() {
    const selected = pickRound(Math.random);
    if (selected.length < 5) return;
    setRoundWords(selected);
    setPlayerScore(0);
    setCpuScore(0);
    setMatchWinner(null);
    setStage("playing");
    prepareRound(selected, 0, 0, 0);
  }

  function handleTile(tile: LetterTile) {
    if (roundLocked.current || stunned) return;
    if (tile.kind === "blocker") {
      setTiles((current) => current.filter((item) => item.id !== tile.id));
      setPlayerBlockers((count) => Math.max(0, count - 1));
      setFeedback("妄磚碎裂");
      return;
    }
    if (playerBlockers > 0) {
      setFeedback("先敲碎妄磚，真名法陣才會回應");
      return;
    }
    setSelectedTileIds((current) => current.length >= answer.length || current.includes(tile.id) ? current : [...current, tile.id]);
    setFeedback("排好完整拼字後再送出");
  }

  function undoTile() {
    if (roundLocked.current || stunned) return;
    setSelectedTileIds((current) => current.slice(0, -1));
  }

  function submitAnswer() {
    if (roundLocked.current || stunned || entered.length !== answer.length) return;
    if (entered !== answer) {
      setStunned(true);
      setSelectedTileIds([]);
      setFeedback("施法失敗——砲管冒煙，稍後再試");
      if (stunTimer.current !== null) window.clearTimeout(stunTimer.current);
      stunTimer.current = window.setTimeout(() => {
        setStunned(false);
        setFeedback("重新排好完整真名，再一起送出");
        stunTimer.current = null;
      }, 1400);
      return;
    }
    roundLocked.current = true;
    const nextScore = playerScore + 1;
    setPlayerScore(nextScore);
    setOutcome({ winner: "player", matchOver: nextScore >= MATCH_POINT });
    setFeedback("答對了——轟擊命中！");
  }

  useEffect(() => () => {
    if (stunTimer.current !== null) window.clearTimeout(stunTimer.current);
  }, []);

  useEffect(() => {
    if (stage !== "playing" || !currentWord || outcome || !cpuFinishMs) return;
    const timer = window.setInterval(() => {
      const elapsed = Date.now() - roundStartedAt;
      if (elapsed < cpuFinishMs || roundLocked.current) return;
      roundLocked.current = true;
      const nextScore = cpuScore + 1;
      setCpuScore(nextScore);
      setOutcome({ winner: "cpu", matchOver: nextScore >= MATCH_POINT });
      setFeedback("豆魔搶先完成，妄磚來襲！");
    }, 90);
    return () => window.clearInterval(timer);
  }, [cpuFinishMs, cpuScore, currentWord, outcome, roundStartedAt, stage]);

  useEffect(() => {
    if (!outcome) return;
    const timer = window.setTimeout(async () => {
      if (outcome.matchOver) {
        const won = outcome.winner === "player";
        const recordRow = await progressDb.settings.get(RECORD_KEY);
        const currentRecord = (recordRow?.value as ArenaRecord | undefined) ?? { wins: 0, losses: 0 };
        await progressDb.settings.put({
          key: RECORD_KEY,
          value: { wins: currentRecord.wins + (won ? 1 : 0), losses: currentRecord.losses + (won ? 0 : 1) },
        });
        setMatchWinner(outcome.winner);
        setStage("result");
        return;
      }
      const nextIndex = roundIndex + 1;
      prepareRound(roundWords, nextIndex, outcome.winner === "cpu" ? 2 : 0, outcome.winner === "player" ? 2 : 0);
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [outcome, prepareRound, roundIndex, roundWords]);

  const backLabel = scope.groupId ? "← 群組" : "← 遊戲";

  if (scope.missing) {
    return (
      <div className="game-shell">
        <header className="game-shell-nav"><Link to="/groups">← 群組</Link><span>字母轟炸</span><b>範圍練習</b></header>
        <section className="game-shell-hero">
          <div><h1>找不到這個群組</h1><p>它可能已被刪除。回群組頁重新選一組再開戰。</p></div>
        </section>
        <Link className="game-shell-start" to="/groups">回群組頁</Link>
      </div>
    );
  }

  if (stage === "setup") {
    const enoughWords = poolReady && pickRound(() => 0.5).length >= 5;
    return (
      <div className="game-shell">
        <header className="game-shell-nav"><Link to={scope.returnTo}>{backLabel}</Link><span>字母轟炸</span><b>{scope.groupId ? "範圍練習" : "單人"}</b></header>
        <section className="game-shell-hero">
          <div>
            {scope.groupId && <p className="game-shell-scope">只出「{scope.group?.name ?? "群組"}」的字 · <b>{scopedEligibleCount} 個可入陣</b></p>}
            <h1>五回合內，先得三分。</h1>
            <p>看中文與圖卡敲出真名。搶先完成會把兩枚妄磚轟進對手的下一題。</p>
          </div>
          {OPPONENT_ASSET && <img src={OPPONENT_ASSET} alt="" />}
        </section>

        <section className="game-shell-options" aria-label="選擇豆魔難度">
          <p>選擇對手</p>
          {Object.entries(ARENA_DIFFICULTIES).map(([key, item]) => (
            <button key={key} aria-pressed={difficulty === key} onClick={() => setDifficulty(key as ArenaDifficulty)}>
              <span>{item.label}</span><small>{item.note}</small>
            </button>
          ))}
        </section>

        <div className="game-shell-record"><span>本機戰績</span><b>{record?.wins ?? 0} 勝</b><b>{record?.losses ?? 0} 敗</b>{!scope.groupId && <small>{learnedCount} 個已收服字可入陣</small>}</div>
        <button className="game-shell-start" onClick={startMatch} disabled={!enoughWords}>{!poolReady ? "正在整理字母磚" : enoughWords ? "敲響開戰鐘" : scope.groupId ? `這個群組只有 ${scopedEligibleCount} 個可拼的字，至少要 5 個` : "至少需要 5 個可拼單字"}</button>
      </div>
    );
  }

  if (stage === "result") {
    const won = matchWinner === "player";
    return (
      <div className="game-shell">
        <header className="game-shell-nav"><Link to={scope.returnTo}>{backLabel}</Link><span>戰局終了</span><b>{playerScore}：{cpuScore}</b></header>
        <main className={`game-shell-result ${won ? "won" : "lost"}`}>
          <div className="game-shell-seal">{won ? "勝" : "再"}</div>
          <h1>{won ? "妄磚盡碎" : "豆魔逃過一劫"}</h1>
          <span>{won ? "你的真名法陣比豆魔快。" : "牠只是今天手感特別好，再轟一次。"}</span>
          <div className="game-shell-score"><b>{playerScore}</b><i>—</i><b>{cpuScore}</b></div>
          <div className="game-shell-actions">
            <button onClick={() => setStage("setup")}>調整對手再戰</button>
            <Link to={scope.returnTo}>{scope.groupId ? "返回群組" : "返回遊戲"}</Link>
          </div>
        </main>
      </div>
    );
  }

  if (!currentWord) return null;
  const targetAsset = getWordBeastAsset(currentWord.wordId, currentWord.word, currentWord.imageWordId);
  const playerLetters = [...answer].map((_, index) => entered[index] ?? "");

  return (
    <div className={`spell-arena battle-screen ${outcome ? `impact-${outcome.winner}` : ""}`}>
      <header className="spell-arena-nav"><Link to={scope.returnTo}>× 離開</Link><span>第 {roundIndex + 1} 回合</span><b>先得三分</b></header>
      <section className="spell-scoreboard" aria-label="目前比分">
        <div className="player"><span>召喚者</span><b>{playerScore}</b></div>
        <div className="round-pips">{Array.from({ length: 5 }, (_, index) => <i key={index} className={index < roundIndex ? "done" : index === roundIndex ? "active" : ""} />)}</div>
        <div className="cpu"><b>{cpuScore}</b><span>{ARENA_DIFFICULTIES[difficulty].label}</span></div>
      </section>

      <main className="spell-battlefield">
        <section className="cpu-field" aria-label="豆魔正在作答">
          <div className="cpu-avatar">{OPPONENT_ASSET && <img src={OPPONENT_ASSET} alt="豆魔對手" />}{cpuBlockers > 0 && <span>{cpuBlockers} 妄磚</span>}</div>
          <div className="cpu-casting"><i /><i /><i /><span>豆魔正在作答</span></div>
        </section>

        <section className="spell-clue">
          <div className="clue-copy"><p>拼出英文單字</p><h1>{currentWord.meaningZh}</h1><span>{currentWord.pos || "詞性待補"} · {currentWord.level}</span></div>
          <div className="clue-visual">
            {targetAsset ? <ResilientBeastImage src={targetAsset} word={currentWord.word} alt={`${currentWord.meaningZh} 字獸線索`} /> : <span>{currentWord.word.charAt(0).toUpperCase()}</span>}
            <SpeakerButton text={currentWord.word} className="spell-speaker" />
          </div>
        </section>

        <section className={`player-field ${stunned ? "stunned" : ""}`} aria-label="玩家拼字區">
          <div className="player-slots">{playerLetters.map((char, index) => <i key={index} className={char ? "filled" : ""}>{char}</i>)}</div>
          <p className="spell-feedback" aria-live="polite">{feedback}</p>
          <div className="letter-bank">
            {tiles.map((tile) => (
              <button
                key={tile.id}
                className={`${tile.kind} ${selectedTileIds.includes(tile.id) ? "selected" : ""}`}
                onClick={() => handleTile(tile)}
                disabled={Boolean(outcome) || stunned || selectedTileIds.includes(tile.id)}
                aria-label={tile.kind === "blocker" ? "敲碎妄磚" : `字母 ${tile.char.toUpperCase()}`}
              >{tile.kind === "blocker" ? "妄" : tile.char.toUpperCase()}</button>
            ))}
          </div>
          <div className="spell-actions">
            <button className="spell-undo" onClick={undoTile} disabled={!selectedTileIds.length || stunned || Boolean(outcome)}>退一格</button>
            <button className="spell-submit" onClick={submitAnswer} disabled={entered.length !== answer.length || stunned || Boolean(outcome)}>送出答案</button>
          </div>
        </section>

        {outcome && <div className={`spell-impact ${outcome.winner}`} role="status"><i /><span>{outcome.winner === "player" ? "轟擊命中" : "妄磚來襲"}</span></div>}
      </main>
    </div>
  );
}
