import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { getKnownWords, getLogicalCardStates } from "../../db/progressIdentity";
import { contentDb } from "../../db/contentDb";
import { getSetting, progressDb } from "../../db/progressDb";
import type { WordRecord } from "../../db/types";
import { speak } from "../../lib/speech";
import ResilientBeastImage from "../wordbeast/ResilientBeastImage";
import { getWordBeastAsset } from "../wordbeast/wordBeastAssets";
import { useToday } from "../../hooks/useToday";
import type { ArenaDifficulty } from "./spellBarrage";
import {
  CPU_THINK_MS,
  KARUTA_DIFFICULTIES,
  MATCH_REVEAL_MS,
  MISS_REVEAL_MS,
  PAIR_COUNT,
  cardById,
  chooseCpuCard,
  countTaken,
  dealBoard,
  flipCard,
  isCardAvailable,
  karutaWinner,
  observeCard,
  resolveTurn,
  selectKarutaWords,
  type CpuMemory,
  type KarutaState,
} from "./meaningKaruta";
import "./arena.css";
import "./karuta.css";

type Stage = "setup" | "playing" | "result";
interface KarutaRecord { wins: number; losses: number; draws: number }

const RECORD_KEY = "arenaKarutaRecord";
const EMPTY_RECORD: KarutaRecord = { wins: 0, losses: 0, draws: 0 };
const OPPONENT_ASSET = getWordBeastAsset("W999999", "pest");

export default function MeaningKarutaScreen() {
  const today = useToday();
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
    return (row?.value as KarutaRecord | undefined) ?? EMPTY_RECORD;
  }, []);

  const [stage, setStage] = useState<Stage>("setup");
  const [difficulty, setDifficulty] = useState<ArenaDifficulty>("apprentice");
  const [roundWords, setRoundWords] = useState<WordRecord[]>([]);
  const [game, setGame] = useState<KarutaState | null>(null);
  const gameRef = useRef<KarutaState | null>(null);
  gameRef.current = game;
  const cpuMemory = useRef<CpuMemory>(new Set());
  const recorded = useRef(false);

  const wordById = useMemo(() => new Map(roundWords.map((word) => [word.wordId, word])), [roundWords]);
  const recall = KARUTA_DIFFICULTIES[difficulty].recall;

  /** 所有翻牌都走這裡：引擎更新、豆魔觀察、英文牌發音。 */
  const flip = useCallback((cardId: string) => {
    const current = gameRef.current;
    if (!current) return;
    const next = flipCard(current, cardId);
    if (next === current) return;
    gameRef.current = next;
    setGame(next);
    cpuMemory.current = observeCard(cpuMemory.current, cardId, recall);
    const card = cardById(next, cardId);
    if (card?.face === "en") speak(card.label);
  }, [recall]);

  function startMatch() {
    if (!poolData) return;
    const selected = selectKarutaWords(poolData.words, poolData.known, poolData.levels, PAIR_COUNT, Math.random, poolData.selectionContext);
    if (selected.length < PAIR_COUNT) return;
    setRoundWords(selected);
    cpuMemory.current = new Set();
    recorded.current = false;
    setGame(dealBoard(selected, Math.floor(Math.random() * 0xffffffff)));
    setStage("playing");
  }

  function handleCard(cardId: string) {
    if (!game || game.phase !== "pick" || game.current !== "player" || !isCardAvailable(game, cardId)) return;
    flip(cardId);
  }

  // 兩張牌亮完之後結算
  useEffect(() => {
    if (!game || game.phase !== "resolve") return;
    const timer = window.setTimeout(() => setGame((current) => current ? resolveTurn(current) : current), game.lastResult === "match" ? MATCH_REVEAL_MS : MISS_REVEAL_MS);
    return () => window.clearTimeout(timer);
  }, [game]);

  // 豆魔回合：每張牌之間停一拍
  useEffect(() => {
    if (!game || game.phase !== "pick" || game.current !== "cpu") return;
    const timer = window.setTimeout(() => {
      const current = gameRef.current;
      if (!current || current.phase !== "pick" || current.current !== "cpu") return;
      const choice = chooseCpuCard(current, cpuMemory.current);
      if (choice) flip(choice);
    }, CPU_THINK_MS);
    return () => window.clearTimeout(timer);
  }, [flip, game]);

  // 終局：寫戰績並切到結算畫面
  useEffect(() => {
    if (!game || game.phase !== "over" || recorded.current) return;
    recorded.current = true;
    const winner = karutaWinner(game);
    const timer = window.setTimeout(async () => {
      const row = await progressDb.settings.get(RECORD_KEY);
      const current = (row?.value as KarutaRecord | undefined) ?? EMPTY_RECORD;
      await progressDb.settings.put({
        key: RECORD_KEY,
        value: {
          wins: current.wins + (winner === "player" ? 1 : 0),
          losses: current.losses + (winner === "cpu" ? 1 : 0),
          draws: current.draws + (winner === "draw" ? 1 : 0),
        },
      });
      setStage("result");
    }, 900);
    return () => window.clearTimeout(timer);
  }, [game]);

  if (stage === "setup") {
    const enoughWords = Boolean(poolData && selectKarutaWords(
      poolData.words,
      poolData.known,
      poolData.levels,
      PAIR_COUNT,
      () => 0.5,
      poolData.selectionContext,
    ).length >= PAIR_COUNT);
    return (
      <div className="spell-arena karuta-arena setup-screen">
        <header className="spell-arena-nav"><Link to="/arena">← 遊戲</Link><span>搶義花牌</span><b>離線</b></header>
        <main className="spell-setup-main">
          <div className="spell-duel-mark"><span>你</span><i>VS</i><span>豆</span></div>
          <p className="spell-eyebrow">MEANING KARUTA · TEN PAIRS</p>
          <h1>二十張牌，<br />把真名和字義配成對。</h1>
          <p className="spell-setup-copy">一次翻兩張。英文配上中文就收走、再翻一次；配不上就蓋回去換豆魔。誰收的對子多誰贏。</p>

          <section className="spell-difficulty" aria-label="選擇豆魔難度">
            <p>選擇對手</p>
            {Object.entries(KARUTA_DIFFICULTIES).map(([key, item]) => (
              <button key={key} className={difficulty === key ? "active" : ""} onClick={() => setDifficulty(key as ArenaDifficulty)}>
                <span>{item.label}</span><small>{item.note}</small>
              </button>
            ))}
          </section>

          <div className="spell-record"><span>本機戰績</span><b>{record?.wins ?? 0} 勝</b><i>{record?.losses ?? 0} 敗</i><small>{record?.draws ?? 0} 平</small></div>
          <button className="spell-start" onClick={startMatch} disabled={!enoughWords}>{poolData ? enoughWords ? "洗牌開局" : `至少需要 ${PAIR_COUNT} 個可入陣的單字` : "正在整理花牌"}<span>→</span></button>
        </main>
      </div>
    );
  }

  if (!game) return null;
  const playerCount = countTaken(game, "player");
  const cpuCount = countTaken(game, "cpu");

  if (stage === "result") {
    const winner = karutaWinner(game);
    const copy = winner === "player"
      ? { seal: "勝", eyebrow: "KARUTA CLAIMED", title: "花牌盡歸你手", note: "這十個字都認得你了。" }
      : winner === "cpu"
        ? { seal: "再", eyebrow: "THE BEAN REMEMBERS", title: `豆魔帶走了 ${cpuCount} 個字`, note: "牠們在豆魔那邊等你來搶回來。" }
        : { seal: "平", eyebrow: "EVEN HANDS", title: "五五平分", note: "你和豆魔各留一半，下一局再分高下。" };
    return (
      <div className={`spell-arena karuta-arena result-screen ${winner === "player" ? "won" : "lost"}`}>
        <header className="spell-arena-nav"><Link to="/arena">← 遊戲</Link><span>牌局終了</span><b>{playerCount}：{cpuCount}</b></header>
        <main className="spell-result-main">
          <div className="spell-result-seal">{copy.seal}</div>
          <p>{copy.eyebrow}</p>
          <h1>{copy.title}</h1>
          <span>{copy.note}</span>
          <div className="spell-final-score"><b>{playerCount}</b><i>—</i><b>{cpuCount}</b></div>
          <ul className="karuta-recap" aria-label="本局出現的單字">
            {roundWords.map((word) => (
              <li key={word.wordId} className={game.taken[word.wordId]}>
                <Link to={`/word/${word.wordId}`}><b>{word.word}</b><span>{word.meaningZh}</span></Link>
              </li>
            ))}
          </ul>
          <button onClick={() => setStage("setup")}>調整對手再戰</button>
          <Link to="/arena">返回競技場</Link>
        </main>
      </div>
    );
  }

  const matchedWord = game.phase === "resolve" && game.lastResult === "match" ? wordById.get(cardById(game, game.faceUp[0])!.wordId) : undefined;
  const matchedAsset = matchedWord ? getWordBeastAsset(matchedWord.wordId, matchedWord.word, matchedWord.imageWordId) : null;
  const playerTurn = game.current === "player" && game.phase === "pick";
  const status = game.phase === "over"
    ? "牌桌清空"
    : game.phase === "resolve"
      ? game.lastResult === "match" ? "配對成功，再翻一次" : "不是這一對，蓋回去"
      : game.current === "player" ? (game.faceUp.length ? "再翻一張" : "翻開第一張") : "豆魔正在想";

  return (
    <div className={`spell-arena karuta-arena battle-screen turn-${game.current}`}>
      <header className="spell-arena-nav"><Link to="/arena">× 離開</Link><span>搶義花牌</span><b>{PAIR_COUNT} 組</b></header>
      <section className="spell-scoreboard" aria-label="目前比分">
        <div className="player"><span>召喚者</span><b>{playerCount}</b></div>
        <div className="karuta-turn" aria-live="polite">{status}</div>
        <div className="cpu"><b>{cpuCount}</b><span>{KARUTA_DIFFICULTIES[difficulty].label}</span></div>
      </section>

      <main className="karuta-table">
        <div className="karuta-opponent">
          {OPPONENT_ASSET && <img src={OPPONENT_ASSET} alt="豆魔對手" />}
          {game.current === "cpu" && game.phase !== "over" && <div className="cpu-casting"><i /><i /><i /></div>}
        </div>
        <div className="karuta-board" role="grid" aria-label="花牌桌">
          {game.cards.map((card) => {
            const owner = game.taken[card.wordId];
            const faceUp = game.faceUp.includes(card.id);
            const state = owner ? `taken taken-${owner}` : faceUp ? `up ${game.phase === "resolve" ? game.lastResult : ""}` : "down";
            return (
              <button
                key={card.id}
                className={`karuta-card ${card.face} ${state}`}
                onClick={() => handleCard(card.id)}
                disabled={!playerTurn || Boolean(owner) || faceUp}
                aria-label={owner || faceUp ? card.label : "蓋著的牌"}
              >
                <span className="karuta-card-back" aria-hidden="true">{card.face === "en" ? "名" : "義"}</span>
                <span className="karuta-card-face">{card.label}</span>
              </button>
            );
          })}
        </div>

        {matchedWord && (
          <div className="karuta-reward" role="status">
            {matchedAsset && <ResilientBeastImage src={matchedAsset} word={matchedWord.word} alt={`${matchedWord.word} 字獸`} />}
            <b>{matchedWord.word}</b>
            <span>{matchedWord.meaningZh}</span>
          </div>
        )}
      </main>
    </div>
  );
}
