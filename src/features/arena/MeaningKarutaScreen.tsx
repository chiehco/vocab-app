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
  MIN_PAIR_COUNT,
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
  selectScopedKarutaWords,
  type CpuMemory,
  type KarutaState,
} from "./meaningKaruta";
import "./arena.css";
import "./karuta.css";
import { useGroupScope } from "./useGroupScope";

type Stage = "setup" | "playing" | "result";
interface KarutaRecord { wins: number; losses: number; draws: number }

const RECORD_KEY = "arenaKarutaRecord";
const EMPTY_RECORD: KarutaRecord = { wins: 0, losses: 0, draws: 0 };
const OPPONENT_ASSET = getWordBeastAsset("W999999", "pest");

export default function MeaningKarutaScreen() {
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
  const requiredPairs = scope.groupId ? MIN_PAIR_COUNT : PAIR_COUNT;
  const scopedEligibleCount = scope.groupId ? selectScopedKarutaWords(scope.words ?? [], Infinity, () => 0.5).length : 0;
  const poolReady = scope.groupId ? !scope.loading : !!poolData;

  /** 群組模式只用範圍內的字，對子不足十組就打較少；否則走已學優先的隨機字池。 */
  const pickRound = useCallback((random: () => number) => {
    if (scope.groupId) return selectScopedKarutaWords(scope.words ?? [], PAIR_COUNT, random, poolData?.selectionContext);
    return poolData ? selectKarutaWords(poolData.words, poolData.known, poolData.levels, PAIR_COUNT, random, poolData.selectionContext) : [];
  }, [scope.groupId, scope.words, poolData]);

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
    const selected = pickRound(Math.random);
    if (selected.length < requiredPairs) return;
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

  const backLabel = scope.groupId ? "← 群組" : "← 遊戲";

  if (scope.missing) {
    return (
      <div className="game-shell">
        <header className="game-shell-nav"><Link to="/groups">← 群組</Link><span>搶義花牌</span><b>範圍練習</b></header>
        <section className="game-shell-hero">
          <div><h1>找不到這個群組</h1><p>它可能已被刪除。回群組頁重新選一組再開局。</p></div>
        </section>
        <Link className="game-shell-start" to="/groups">回群組頁</Link>
      </div>
    );
  }

  if (stage === "setup") {
    const enoughWords = poolReady && pickRound(() => 0.5).length >= requiredPairs;
    return (
      <div className="game-shell">
        <header className="game-shell-nav"><Link to={scope.returnTo}>{backLabel}</Link><span>搶義花牌</span><b>{scope.groupId ? "範圍練習" : "單人"}</b></header>
        <section className="game-shell-hero">
          <div>
            {scope.groupId && <p className="game-shell-scope">只出「{scope.group?.name ?? "群組"}」的字 · <b>{scopedEligibleCount} 個可入陣</b></p>}
            <h1>二十張牌，把真名和字義配成對。</h1>
            <p>一次翻兩張。英文配上中文就收走、再翻一次；配不上就蓋回去換豆魔。誰收的對子多誰贏。</p>
          </div>
          {OPPONENT_ASSET && <img src={OPPONENT_ASSET} alt="" />}
        </section>

        <section className="game-shell-options" aria-label="選擇豆魔難度">
          <p>選擇對手</p>
          {Object.entries(KARUTA_DIFFICULTIES).map(([key, item]) => (
            <button key={key} aria-pressed={difficulty === key} onClick={() => setDifficulty(key as ArenaDifficulty)}>
              <span>{item.label}</span><small>{item.note}</small>
            </button>
          ))}
        </section>

        <div className="game-shell-record"><span>本機戰績</span><b>{record?.wins ?? 0} 勝</b><b>{record?.losses ?? 0} 敗</b><b>{record?.draws ?? 0} 平</b></div>
        <button className="game-shell-start" onClick={startMatch} disabled={!enoughWords}>{!poolReady ? "正在整理花牌" : enoughWords ? "洗牌開局" : scope.groupId ? `這個群組只有 ${scopedEligibleCount} 個可入陣的字，至少要 ${MIN_PAIR_COUNT} 個` : `至少需要 ${PAIR_COUNT} 個可入陣的單字`}</button>
      </div>
    );
  }

  if (!game) return null;
  const playerCount = countTaken(game, "player");
  const cpuCount = countTaken(game, "cpu");

  if (stage === "result") {
    const winner = karutaWinner(game);
    const copy = winner === "player"
      ? { seal: "勝", tone: "won", title: "花牌盡歸你手", note: `這 ${roundWords.length} 個字都認得你了。` }
      : winner === "cpu"
        ? { seal: "再", tone: "lost", title: `豆魔帶走了 ${cpuCount} 個字`, note: "牠們在豆魔那邊等你來搶回來。" }
        : { seal: "平", tone: "draw", title: "平分秋色", note: "你和豆魔各留一半，下一局再分高下。" };
    return (
      <div className="game-shell">
        <header className="game-shell-nav"><Link to={scope.returnTo}>{backLabel}</Link><span>牌局終了</span><b>{playerCount}：{cpuCount}</b></header>
        <main className={`game-shell-result ${copy.tone}`}>
          <div className="game-shell-seal">{copy.seal}</div>
          <h1>{copy.title}</h1>
          <span>{copy.note}</span>
          <div className="game-shell-score"><b>{playerCount}</b><i>—</i><b>{cpuCount}</b></div>
          <p className="game-shell-section-title">本局出現的單字</p>
          <ul className="karuta-recap" aria-label="本局出現的單字">
            {roundWords.map((word) => (
              <li key={word.wordId} className={game.taken[word.wordId]}>
                <Link to={`/word/${word.wordId}`}><b>{word.word}</b><span>{word.meaningZh}</span></Link>
              </li>
            ))}
          </ul>
          <div className="game-shell-actions">
            <button onClick={() => setStage("setup")}>調整對手再戰</button>
            <Link to={scope.returnTo}>{scope.groupId ? "返回群組" : "返回遊戲"}</Link>
          </div>
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
      <header className="spell-arena-nav"><Link to={scope.returnTo}>× 離開</Link><span>搶義花牌</span><b>{game.cards.length / 2} 組</b></header>
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
