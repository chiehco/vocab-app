import type { WordRecord } from "../../db/types";
import { shortZh } from "../../game/slash";
import { isArenaWordEligible, selectArenaWords, shuffleWith, weightedArenaOrder, type ArenaDifficulty, type ArenaSelectionContext } from "./spellBarrage";

/**
 * 搶義花牌：翻牌配對。引擎是純狀態機，唯一的動作是 flip(cardId)，
 * 本機玩家、豆魔、之後的遠端玩家都走同一條路，畫面只讀狀態不算規則。
 */
export type KarutaSide = "player" | "cpu";
export type KarutaFace = "en" | "zh";
export type KarutaPhase = "pick" | "resolve" | "over";

export interface KarutaCard {
  id: string;
  wordId: string;
  face: KarutaFace;
  label: string;
}

export interface KarutaState {
  seed: number;
  cards: KarutaCard[];
  /** wordId → 收走的人 */
  taken: Record<string, KarutaSide>;
  /** 本回合翻開、尚未結算的牌（最多兩張） */
  faceUp: string[];
  current: KarutaSide;
  phase: KarutaPhase;
  lastResult: "match" | "miss" | null;
  /** 所有 flip 的順序，供連線同步與復盤 */
  history: string[];
}

export const PAIR_COUNT = 10;
/** 指定範圍時的最低對數。 */
export const MIN_PAIR_COUNT = 4;
export const MAX_ZH_LABEL = 6;
export const MISS_REVEAL_MS = 1200;
export const MATCH_REVEAL_MS = 1500;
export const CPU_THINK_MS = 1100;

export const KARUTA_DIFFICULTIES: Record<ArenaDifficulty, { label: string; note: string; recall: number }> = {
  apprentice: { label: "見習豆魔", note: "常常忘牌，慢慢來", recall: 0.35 },
  keeper: { label: "守陣豆魔", note: "記得一半，有來有往", recall: 0.65 },
  priest: { label: "祭司幻影", note: "看過的牌幾乎都記得", recall: 0.9 },
};

/** mulberry32：同一個 seed 兩台手機發出同一副牌。 */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function karutaLabel(word: WordRecord): string {
  return word.meaningZh ? shortZh(word.meaningZh) : "";
}

/** 牌面放得下、也有可用短釋義的字才能入陣。 */
export function isKarutaWordEligible(word: WordRecord): boolean {
  const label = karutaLabel(word);
  return isArenaWordEligible(word) && label.length > 0 && label.length <= MAX_ZH_LABEL;
}

/** 完整釋義拆成分段（「大的；巨大的」→「大的」「巨大的」），逐段比對而不用子字串。 */
export function glossSegments(meaningZh: string | null): string[] {
  return (meaningZh ?? "").split(/[；;，,、]/).map((part) => part.trim()).filter(Boolean);
}

/**
 * 同場兩個字的中文不能互相指涉：短釋義相同，或一方的短釋義是另一方完整釋義的其中一段，
 * 都會讓翻牌出現兩個正解。
 */
export function glossConflicts(a: WordRecord, b: WordRecord): boolean {
  const shortA = karutaLabel(a);
  const shortB = karutaLabel(b);
  if (!shortA || !shortB) return true;
  if (shortA === shortB) return true;
  return glossSegments(b.meaningZh).includes(shortA) || glossSegments(a.meaningZh).includes(shortB);
}

/** 從排好序的候選裡挑不互相撞義的字，最多 count 個。 */
function pickKarutaPairs(ordered: WordRecord[], count: number): WordRecord[] {
  const picked: WordRecord[] = [];
  const seenWords = new Set<string>();
  for (const candidate of ordered) {
    if (picked.length >= count) break;
    if (seenWords.has(candidate.word)) continue;
    if (picked.some((item) => glossConflicts(item, candidate))) continue;
    picked.push(candidate);
    seenWords.add(candidate.word);
  }
  return picked;
}

export function selectKarutaWords(
  words: WordRecord[],
  knownWords: Set<string>,
  learningLevels: string[],
  count = PAIR_COUNT,
  random: () => number = Math.random,
  context: ArenaSelectionContext = {},
): WordRecord[] {
  const ordered = selectArenaWords(words.filter(isKarutaWordEligible), knownWords, learningLevels, words.length, random, context);
  return pickKarutaPairs(ordered, count);
}

/** 指定範圍：範圍內全部可入陣，合格對子不到 count 就打較少對（畫面另以 MIN_PAIR_COUNT 把關）。 */
export function selectScopedKarutaWords(
  words: WordRecord[],
  count = PAIR_COUNT,
  random: () => number = Math.random,
  context: ArenaSelectionContext = {},
): WordRecord[] {
  return pickKarutaPairs(weightedArenaOrder(words.filter(isKarutaWordEligible), context, random), count);
}

export function dealBoard(words: WordRecord[], seed: number): KarutaState {
  const random = seededRandom(seed);
  const cards = words.flatMap<KarutaCard>((word) => [
    { id: `${word.wordId}-en`, wordId: word.wordId, face: "en", label: word.word },
    { id: `${word.wordId}-zh`, wordId: word.wordId, face: "zh", label: karutaLabel(word) },
  ]);
  return {
    seed,
    cards: shuffleWith(cards, random),
    taken: {},
    faceUp: [],
    current: "player",
    phase: "pick",
    lastResult: null,
    history: [],
  };
}

export function cardById(state: KarutaState, cardId: string): KarutaCard | undefined {
  return state.cards.find((card) => card.id === cardId);
}

export function isCardAvailable(state: KarutaState, cardId: string): boolean {
  const card = cardById(state, cardId);
  return Boolean(card) && !state.taken[card!.wordId] && !state.faceUp.includes(cardId);
}

/** 翻一張牌。不合法的翻牌（已收走、已翻開、不在 pick 階段）原樣回傳。 */
export function flipCard(state: KarutaState, cardId: string): KarutaState {
  if (state.phase !== "pick" || state.faceUp.length >= 2 || !isCardAvailable(state, cardId)) return state;
  const faceUp = [...state.faceUp, cardId];
  const history = [...state.history, cardId];
  if (faceUp.length < 2) return { ...state, faceUp, history };
  const [first, second] = faceUp.map((id) => cardById(state, id)!);
  const matched = first.wordId === second.wordId && first.face !== second.face;
  return { ...state, faceUp, history, phase: "resolve", lastResult: matched ? "match" : "miss" };
}

/** 兩張牌亮完之後結算：配對成功收走並續翻，失敗蓋回換人。 */
export function resolveTurn(state: KarutaState): KarutaState {
  if (state.phase !== "resolve" || state.faceUp.length !== 2) return state;
  if (state.lastResult === "match") {
    const wordId = cardById(state, state.faceUp[0])!.wordId;
    const taken = { ...state.taken, [wordId]: state.current };
    const pairCount = state.cards.length / 2;
    const over = Object.keys(taken).length >= pairCount;
    return { ...state, taken, faceUp: [], phase: over ? "over" : "pick" };
  }
  return { ...state, faceUp: [], phase: "pick", current: state.current === "player" ? "cpu" : "player" };
}

export function countTaken(state: KarutaState, side: KarutaSide): number {
  return Object.values(state.taken).filter((owner) => owner === side).length;
}

export function karutaWinner(state: KarutaState): KarutaSide | "draw" {
  const player = countTaken(state, "player");
  const cpu = countTaken(state, "cpu");
  if (player === cpu) return "draw";
  return player > cpu ? "player" : "cpu";
}

/**
 * 豆魔的記憶：每張被翻開的牌，以 recall 機率記下它的位置。
 * 記住的牌內容直接查 state.cards，所以記憶只需要存 id。
 */
export type CpuMemory = ReadonlySet<string>;

export function observeCard(memory: CpuMemory, cardId: string, recall: number, random: () => number = Math.random): CpuMemory {
  if (memory.has(cardId) || random() >= recall) return memory;
  return new Set([...memory, cardId]);
}

function partnerInMemory(state: KarutaState, memory: CpuMemory, card: KarutaCard): KarutaCard | undefined {
  return state.cards.find((other) =>
    other.id !== card.id && other.wordId === card.wordId && memory.has(other.id) && isCardAvailable(state, other.id));
}

/**
 * 豆魔選牌：先翻記得的一對；沒有就翻一張沒看過的牌來「學」；
 * 已翻一張時，記得對子就直接配，否則再翻一張沒看過的。
 */
export function chooseCpuCard(state: KarutaState, memory: CpuMemory, random: () => number = Math.random): string | null {
  const available = state.cards.filter((card) => isCardAvailable(state, card.id));
  if (!available.length) return null;
  const pickRandom = (cards: KarutaCard[]) => cards[Math.floor(random() * cards.length)].id;
  const unknown = available.filter((card) => !memory.has(card.id));

  if (state.faceUp.length === 1) {
    const partner = partnerInMemory(state, memory, cardById(state, state.faceUp[0])!);
    if (partner) return partner.id;
    return pickRandom(unknown.length ? unknown : available);
  }
  const remembered = available.filter((card) => memory.has(card.id));
  for (const card of remembered) {
    if (partnerInMemory(state, memory, card)) return card.id;
  }
  return pickRandom(unknown.length ? unknown : available);
}
