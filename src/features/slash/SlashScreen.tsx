import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { contentDb } from "../../db/contentDb";
import type { WordRecord } from "../../db/types";
import { ALL_LEVELS } from "../../db/progressDb";
import { buildTodayQueue } from "../../srs/queue";
import { gradeFlashcard, recordQuizAnswer } from "../../checkin/recordActivity";
import { speak, speechAvailable } from "../../lib/speech";
import { shuffle } from "../../quiz/distractors";
import {
  DIFFICULTIES,
  MAX_HP,
  MODE_LABELS,
  ROUND_SIZE,
  buildRound,
  cardFontSize,
  comboReward,
  needsPlaque,
  type DifficultySpec,
  type SlashQuestion,
  type SlashMode,
} from "../../game/slash";
import "./slash.css";

const BASE = import.meta.env.BASE_URL;
const ART_URLS = {
  bg: `${BASE}game/bg-tile.webp`,
  idle: `${BASE}game/swordsman-idle.webp`,
  attack: `${BASE}game/swordsman-attack.webp`,
  hit: `${BASE}game/swordsman-hit.webp`,
  card: `${BASE}game/card.webp`,
  cardSlashed: `${BASE}game/card-slashed.webp`,
};
const ART_VARS = {
  "--slash-bg": `url("${ART_URLS.bg}")`,
  "--slash-sw-idle": `url("${ART_URLS.idle}")`,
  "--slash-sw-attack": `url("${ART_URLS.attack}")`,
  "--slash-sw-hit": `url("${ART_URLS.hit}")`,
  "--slash-card": `url("${ART_URLS.card}")`,
  "--slash-card-slashed": `url("${ART_URLS.cardSlashed}")`,
} as CSSProperties;

const LEVEL_CHOICES = ["全部", ...ALL_LEVELS];

type Phase = "start" | "playing" | "result";
type CardStatus = "slashed" | "fading";
type Pose = "idle" | "attack" | "hit";

interface FloatFx {
  id: number;
  x: number;
  y: number;
  text: string;
  ok: boolean;
}

/** 一局的可變核心狀態。放 ref 避免計時器回呼吃到過期 state。 */
interface GameCore {
  /** 開局當下快照的難度，整局固定，不受之後的選單狀態影響 */
  diff: DifficultySpec;
  questions: SlashQuestion[];
  qIndex: number;
  hp: number;
  score: number;
  combo: number;
  maxCombo: number;
  correct: number;
  wrong: number;
  mistake: boolean;
  resolved: boolean;
  cardStatus: Record<number, CardStatus>;
  missed: WordRecord[];
  won: boolean;
}

function freshCore(): GameCore {
  return {
    diff: DIFFICULTIES[0],
    questions: [],
    qIndex: 0,
    hp: MAX_HP,
    score: 0,
    combo: 0,
    maxCombo: 0,
    correct: 0,
    wrong: 0,
    mistake: false,
    resolved: false,
    cardStatus: {},
    missed: [],
    won: false,
  };
}

const MODE_HINTS: Record<SlashMode, string> = {
  zh2en: "斬出正確的英文牌！",
  en2zh: "斬出它的中文意思！",
  audio: "聽音辨字，斬出你聽到的字！",
};

export default function SlashScreen() {
  const [phase, setPhase] = useState<Phase>("start");
  const [loading, setLoading] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [levelSel, setLevelSel] = useState("全部");
  const [diffIdx, setDiffIdx] = useState(0);
  const [freePlay, setFreePlay] = useState(false);
  const [pose, setPose] = useState<Pose>("idle");
  const [flash, setFlash] = useState(false);
  const [floats, setFloats] = useState<FloatFx[]>([]);
  const [burst, setBurst] = useState<{ id: number; text: string } | null>(null);
  const [, setTick] = useState(0);

  const g = useRef<GameCore>(freshCore());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const advanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const poseRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const fxIdRef = useRef(0);
  const sessionId = useRef(crypto.randomUUID());
  const sessionStarted = useRef(false);

  const rerender = () => setTick((t) => t + 1);

  // 預載圖檔，開局不閃白
  useEffect(() => {
    Object.values(ART_URLS).forEach((src) => {
      const img = new Image();
      img.src = src;
    });
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (advanceRef.current) clearTimeout(advanceRef.current);
      if (poseRef.current) clearTimeout(poseRef.current);
      window.speechSynthesis?.cancel();
    };
  }, []);

  function playSound(type: "correct" | "wrong" | "combo") {
    try {
      audioRef.current ??= new AudioContext();
      const ac = audioRef.current;
      if (ac.state === "suspended") void ac.resume();
      const beep = (freq: number, endFreq: number, gain: number, at: number, dur: number) => {
        const o = ac.createOscillator();
        const gn = ac.createGain();
        o.connect(gn);
        gn.connect(ac.destination);
        o.frequency.setValueAtTime(freq, ac.currentTime + at);
        if (endFreq !== freq) {
          o.frequency.exponentialRampToValueAtTime(endFreq, ac.currentTime + at + dur / 2);
        }
        gn.gain.setValueAtTime(gain, ac.currentTime + at);
        gn.gain.exponentialRampToValueAtTime(0.01, ac.currentTime + at + dur);
        o.start(ac.currentTime + at);
        o.stop(ac.currentTime + at + dur);
      };
      if (type === "correct") beep(523, 1046, 0.28, 0, 0.3);
      else if (type === "wrong") beep(220, 100, 0.35, 0, 0.3);
      else [523, 659, 784, 1046].forEach((f, i) => beep(f, f, 0.22, i * 0.08, 0.22));
    } catch {
      // 音效失敗不影響遊戲
    }
  }

  function setPoseFor(p: Pose, ms: number) {
    setPose(p);
    if (poseRef.current) clearTimeout(poseRef.current);
    poseRef.current = setTimeout(() => setPose("idle"), ms);
  }

  function addFloat(x: number, y: number, text: string, ok: boolean) {
    const id = ++fxIdRef.current;
    setFloats((fs) => [...fs, { id, x, y, text, ok }]);
    setTimeout(() => setFloats((fs) => fs.filter((f) => f.id !== id)), 800);
  }

  function showBurst(text: string) {
    setBurst({ id: ++fxIdRef.current, text });
    setTimeout(() => setBurst(null), 650);
  }

  function flashScreen() {
    setFlash(true);
    setTimeout(() => setFlash(false), 160);
  }

  async function gradeWord(q: SlashQuestion, success: boolean) {
    const isNewSession = !sessionStarted.current;
    sessionStarted.current = true;
    if (!success && !g.current.missed.some((w) => w.word === q.target.word)) {
      g.current.missed.push(q.target);
    }
    try {
      if (freePlay) {
        await recordQuizAnswer(q.target.word, success, "slash", sessionId.current, isNewSession);
      } else {
        await gradeFlashcard(
          q.target.word,
          success ? 2 : 0,
          sessionId.current,
          isNewSession,
          "slash",
        );
      }
    } catch (e) {
      console.error("千單斬進度寫入失敗", e);
    }
  }

  function endGame(won: boolean) {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (advanceRef.current) clearTimeout(advanceRef.current);
    g.current.won = won;
    setPhase("result");
  }

  function ask(index: number) {
    const core = g.current;
    if (index >= core.questions.length) {
      endGame(core.hp > 0);
      return;
    }
    core.qIndex = index;
    core.mistake = false;
    core.resolved = false;
    core.cardStatus = {};
    const q = core.questions[index];
    if (q.mode !== "zh2en") speak(q.target.word);
    timerRef.current = setTimeout(onTimeout, core.diff.timerMs);
    rerender();
  }

  function onTimeout() {
    const core = g.current;
    if (core.resolved || phaseRef.current !== "playing") return;
    core.resolved = true;
    core.hp -= 1;
    core.combo = 0;
    core.wrong += 1;
    core.questions[core.qIndex].options.forEach((_, j) => {
      core.cardStatus[j] ??= "fading";
    });
    playSound("wrong");
    setPoseFor("hit", 400);
    flashScreen();
    void gradeWord(core.questions[core.qIndex], false);
    if (core.hp <= 0) {
      rerender();
      advanceRef.current = setTimeout(() => endGame(false), 500);
      return;
    }
    rerender();
    advanceRef.current = setTimeout(() => ask(core.qIndex + 1), 700);
  }

  // onTimeout 由 setTimeout 呼叫，需要讀到當下的 phase
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  function onSlash(optIndex: number, e: React.MouseEvent) {
    const core = g.current;
    if (phase !== "playing" || core.resolved || core.cardStatus[optIndex]) return;
    const q = core.questions[core.qIndex];
    const opt = q.options[optIndex];
    setPoseFor("attack", 380);

    if (opt.isCorrect) {
      if (timerRef.current) clearTimeout(timerRef.current);
      core.resolved = true;
      core.cardStatus[optIndex] = "slashed";
      q.options.forEach((_, j) => {
        core.cardStatus[j] ??= "fading";
      });
      core.correct += 1;
      core.combo += 1;
      core.maxCombo = Math.max(core.maxCombo, core.combo);
      const reward = comboReward(core.combo);
      core.score += reward.points;
      if (reward.heal > 0) core.hp = Math.min(MAX_HP, core.hp + reward.heal);
      playSound(reward.points >= 30 ? "combo" : "correct");
      if (reward.burst) showBurst(`COMBO x${core.combo} 🔥`);
      addFloat(e.clientX - 20, e.clientY - 40, `+${reward.points}`, true);
      if (q.mode === "zh2en") speak(q.target.word);
      void gradeWord(q, !core.mistake);
      rerender();
      advanceRef.current = setTimeout(() => ask(core.qIndex + 1), 700);
    } else {
      core.mistake = true;
      core.wrong += 1;
      core.combo = 0;
      core.hp -= 1;
      core.cardStatus[optIndex] = "fading";
      playSound("wrong");
      setPoseFor("hit", 400);
      flashScreen();
      addFloat(e.clientX - 20, e.clientY - 40, "-1 ❤️", false);
      if (core.hp <= 0) {
        if (timerRef.current) clearTimeout(timerRef.current);
        core.resolved = true;
        void gradeWord(q, false);
        rerender();
        advanceRef.current = setTimeout(() => endGame(false), 500);
        return;
      }
      rerender();
    }
  }

  async function startGame() {
    setLoading(true);
    setStartError(null);
    try {
      audioRef.current ??= new AudioContext();
      if (audioRef.current.state === "suspended") void audioRef.current.resume();
    } catch {
      // 不支援 WebAudio 就靜音玩
    }
    try {
      const sessionLevels = levelSel === "全部" ? undefined : [levelSel];
      let items = await buildTodayQueue(sessionLevels);
      items = items.filter((it) => it.wordRecord.meaningZh);
      let free = false;
      if (items.length === 0) {
        const levels = levelSel === "全部" ? ALL_LEVELS : [levelSel];
        const pool = await contentDb.words
          .where("level")
          .anyOf(levels)
          .filter((w) => !!w.meaningZh)
          .toArray();
        items = shuffle(pool)
          .slice(0, ROUND_SIZE)
          .map((w) => ({ wordRecord: w, isNew: false }));
        free = true;
      }
      if (items.length === 0) {
        setStartError(`${levelSel} 沒有可出戰的單字`);
        return;
      }
      const poolAll = await contentDb.words.filter((w) => !!w.meaningZh).toArray();
      const modes: SlashMode[] = speechAvailable()
        ? ["zh2en", "en2zh", "audio"]
        : ["zh2en", "en2zh"];
      const spec = DIFFICULTIES[diffIdx];
      const questions = buildRound(items, poolAll, spec.cards, modes);
      g.current = freshCore();
      g.current.diff = spec;
      g.current.questions = questions;
      setFreePlay(free);
      setPhase("playing");
      ask(0);
    } finally {
      setLoading(false);
    }
  }

  // ---- 畫面 ----

  const core = g.current;
  const diff = core.diff;

  if (phase === "start") {
    return (
      <div className="slash-game" style={ART_VARS}>
        <div className="slash-bg" />
        <div className="relative z-40 flex h-full flex-col items-center justify-center gap-6 bg-black/55 p-6 text-center">
          <div>
            <h1 className="slash-title text-5xl">千單斬</h1>
            <p className="mt-3 text-sm tracking-widest text-amber-100/80">
              今日該複習的字，會化作怪物牌現身
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-1.5">
            {LEVEL_CHOICES.map((lv) => (
              <button
                key={lv}
                onClick={() => setLevelSel(lv)}
                className={`rounded-full px-3 py-1 text-sm ${
                  levelSel === lv
                    ? "bg-amber-400 font-bold text-black"
                    : "border border-amber-200/40 text-amber-100"
                }`}
              >
                {lv}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            {DIFFICULTIES.map((d, i) => (
              <button
                key={d.label}
                onClick={() => setDiffIdx(i)}
                className={`rounded px-3 py-2 text-sm ${
                  diffIdx === i
                    ? "bg-amber-400 font-bold text-black"
                    : "border border-amber-200/40 text-amber-100"
                }`}
              >
                {d.label}
                <span className="block text-xs opacity-70">
                  {d.cards} 牌 {d.timerMs / 1000}s
                </span>
              </button>
            ))}
          </div>

          {startError && <p className="text-sm text-red-300">{startError}</p>}

          <button
            onClick={() => void startGame()}
            disabled={loading}
            className="rounded bg-gradient-to-b from-amber-300 to-amber-500 px-14 py-3.5 text-xl font-black tracking-[0.5em] text-amber-950 shadow-lg disabled:opacity-50"
          >
            {loading ? "備戰中…" : "開 局"}
          </button>

          <p className="max-w-xs text-xs leading-5 text-amber-100/60">
            斬對＝完成一次複習、斬錯或放走正解＝標記忘記，戰果直接記入記憶曲線。
            沒有到期複習時自動改為自由練習。
          </p>

          <Link to="/" className="text-sm text-amber-100/70 underline">
            離開道場
          </Link>
        </div>
      </div>
    );
  }

  if (phase === "result") {
    const total = core.correct + core.wrong;
    const acc = total === 0 ? 0 : Math.round((core.correct / total) * 100);
    return (
      <div className="slash-game" style={ART_VARS}>
        <div className="slash-bg" />
        <div className="relative z-40 flex h-full flex-col items-center justify-center gap-5 overflow-y-auto bg-black/60 p-6 text-center">
          <h1
            className={`text-4xl font-black tracking-[0.3em] ${
              core.won ? "text-amber-300" : "text-red-400"
            }`}
          >
            {core.won ? "闖關成功 ⚔️" : "武士陣亡 💀"}
          </h1>
          {freePlay && <p className="text-xs text-amber-100/70">自由練習（今日無到期複習）</p>}

          <div className="grid grid-cols-4 gap-3">
            {[
              ["斬殺", core.correct],
              ["失誤", core.wrong],
              ["最大連擊", core.maxCombo],
              ["得分", core.score],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg bg-white/10 px-3 py-2">
                <p className="text-2xl font-black text-amber-200">{value}</p>
                <p className="mt-0.5 text-xs text-amber-100/70">{label}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-amber-100/80">命中率 {acc}%</p>

          {core.missed.length > 0 && (
            <div className="w-full max-w-sm">
              <p className="mb-2 text-sm font-bold text-red-300">逃走的怪物（點進去深析）</p>
              <div className="flex flex-wrap justify-center gap-2">
                {core.missed.map((w) => (
                  <Link
                    key={w.word}
                    to={`/word/${w.wordId}`}
                    className="rounded-full bg-white/15 px-3 py-1 text-sm text-white underline"
                  >
                    {w.word}
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="mt-2 flex gap-3">
            <button
              onClick={() => setPhase("start")}
              className="rounded bg-gradient-to-b from-amber-300 to-amber-500 px-8 py-3 font-black text-amber-950"
            >
              再戰一場
            </button>
            <Link
              to="/"
              className="rounded border border-amber-200/50 px-8 py-3 font-bold text-amber-100"
            >
              回首頁
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const q = core.questions[core.qIndex];
  return (
    <div className="slash-game playing" style={ART_VARS}>
      <div className="slash-bg" />
      <div className={`slash-flash ${flash ? "on" : ""}`} />

      {/* HUD */}
      <div className="relative z-40 flex items-center justify-between gap-2 p-3">
        <Link to="/" className="rounded bg-black/40 px-2.5 py-1 text-sm text-white/80">
          ✕
        </Link>
        <div className="text-lg tracking-wider" aria-label={`血量 ${core.hp}/${MAX_HP}`}>
          {Array.from({ length: MAX_HP }, (_, i) => (
            <span key={i} className={i < core.hp ? "" : "opacity-25 grayscale"}>
              ❤️
            </span>
          ))}
        </div>
        <div className="rounded bg-black/40 px-3 py-1 text-lg font-black text-amber-300">
          {core.score}
        </div>
      </div>
      <div className="relative z-40 mx-auto flex w-56 items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/20">
          <div
            className="h-full rounded-full bg-amber-400 transition-all"
            style={{ width: `${(core.qIndex / core.questions.length) * 100}%` }}
          />
        </div>
        <span className="text-xs text-white/70">
          {core.qIndex + 1}/{core.questions.length}
        </span>
      </div>

      {/* 題目 */}
      <div className="relative z-40 mt-4 px-4 text-center">
        <p className="text-xs tracking-widest text-amber-200/80">
          【{MODE_LABELS[q.mode]}】{MODE_HINTS[q.mode]}
          {q.isNew && (
            <span className="ml-2 rounded-full bg-green-500/80 px-2 py-0.5 text-xs font-bold text-white">
              新字
            </span>
          )}
        </p>
        {q.mode === "zh2en" && (
          <p
            className="mt-2 text-3xl font-black"
            style={{ textShadow: "2px 2px 0 #000, 0 0 16px rgba(0,0,0,0.8)" }}
          >
            {(q.target.meaningZh ?? "").split(/[；;]/)[0]}
            {q.target.pos && <span className="ml-2 text-base text-white/60">{q.target.pos}</span>}
          </p>
        )}
        {q.mode === "en2zh" && (
          <p
            className="mt-2 text-4xl font-black"
            style={{ textShadow: "2px 2px 0 #000, 0 0 16px rgba(0,0,0,0.8)" }}
          >
            {q.target.word}
            {q.target.pos && <span className="ml-2 text-base text-white/60">{q.target.pos}</span>}
          </p>
        )}
        {q.mode === "audio" && (
          <button
            onClick={() => speak(q.target.word)}
            className="mt-2 rounded-full bg-black/50 px-6 py-2 text-3xl"
            aria-label="重播發音"
          >
            🔊
          </button>
        )}
        {core.combo >= 2 && (
          <p className="mt-1 text-sm font-bold text-amber-300">🔥 COMBO x{core.combo}</p>
        )}
      </div>

      {/* 敵人牌 */}
      <div className="slash-enemies">
        {q.options.map((opt, j) => {
          const status = core.cardStatus[j];
          return (
            <div
              key={`${core.qIndex}-${j}`}
              className={`slash-card ${status ?? "running"}`}
              style={{ "--timer-ms": `${diff.timerMs}ms` } as CSSProperties}
              onClick={(e) => onSlash(j, e)}
            >
              <div className="slash-card-inner">
                <div className="slash-card-sprite" />
                <div
                  className={`slash-card-word ${needsPlaque(opt.label) ? "plaque" : ""}`}
                  style={{ fontSize: cardFontSize(opt.label) }}
                  lang={/[一-鿿]/.test(opt.label) ? "zh-TW" : "en"}
                >
                  {opt.label}
                </div>
              </div>
              <div className="slash-card-timer">
                <div className="slash-card-timer-bar" />
              </div>
            </div>
          );
        })}
      </div>

      <div className={`slash-swordsman ${pose}`} />

      {floats.map((f) => (
        <div
          key={f.id}
          className={`slash-float ${f.ok ? "ok" : "bad"}`}
          style={{ left: f.x, top: f.y }}
        >
          {f.text}
        </div>
      ))}
      {burst && (
        <div key={burst.id} className="slash-combo-burst">
          {burst.text}
        </div>
      )}
    </div>
  );
}
