export type TrialCategory = "名詞" | "動詞" | "形容詞" | "抽象詞" | "關係詞" | "多義詞";

export interface TrialSense {
  label: string;
  cue: string;
}

export interface PriestTrial {
  word: string;
  level: 1 | 2 | 3 | 4 | 5;
  meaning: string;
  category: TrialCategory;
  cue: string;
  challenge: string;
  verdict: string;
  image?: string;
  senses?: TrialSense[];
}

const BASE = import.meta.env.BASE_URL;

export const CATEGORIES: TrialCategory[] = ["名詞", "動詞", "形容詞", "抽象詞", "關係詞", "多義詞"];

export const PRIEST_TRIALS: PriestTrial[] = [
  { word: "volcano", level: 5, meaning: "火山", category: "名詞", cue: "volcano", image: `${BASE}wordbeast/priest-volcano.png`, challenge: "具體場景基準題", verdict: "保留專屬字獸。山體、熔岩與爆發輪廓能在一眼內共同命中。" },
  { word: "microscope", level: 4, meaning: "顯微鏡", category: "名詞", cue: "microscope", image: `${BASE}wordbeast/priest-microscope.png`, challenge: "精密人造物的細節", verdict: "用器物本身，不硬塞臉。鏡筒、載物台與底座是辨認關鍵。" },
  { word: "harvest", level: 3, meaning: "收穫", category: "名詞", cue: "harvest", image: `${BASE}wordbeast/priest-harvest.png`, challenge: "場景型名詞", verdict: "用一組已割下的麥穗、鐮刀與滿籃作物，畫的是完成收成的時刻。" },
  { word: "ancestor", level: 4, meaning: "祖先", category: "名詞", cue: "ancestor", image: `${BASE}wordbeast/priest-ancestor.png`, challenge: "人物概念", verdict: "年長靈體、家族枝脈與祭壇三層線索，避開只畫『老人』。" },
  { word: "burden", level: 2, meaning: "負擔", category: "名詞", cue: "burden", challenge: "半抽象隱喻", verdict: "讓小獸被遠大於身體的石塊壓彎；重量必須改變姿態，才不是普通行李。" },

  { word: "chew", level: 4, meaning: "咀嚼", category: "動詞", cue: "chew", image: `${BASE}wordbeast/priest-chew.png`, challenge: "動作基準題", verdict: "同一獸的三個咬合階段加上碎屑，靜圖也能讀出重複咀嚼。" },
  { word: "melt", level: 3, meaning: "熔化", category: "動詞", cue: "melt", challenge: "狀態變化", verdict: "固體輪廓正在滴落並匯成液體；保留一半原形，鎖定『過程中』。" },
  { word: "whisper", level: 3, meaning: "耳語", category: "動詞", cue: "whisper", image: `${BASE}wordbeast/priest-whisper.png`, challenge: "聲音視覺化＋互動", verdict: "兩獸靠近、遮嘴，只有細小聲紋進入對方耳邊；排除 shout。" },
  { word: "hesitate", level: 3, meaning: "猶豫", category: "動詞", cue: "hesitate", challenge: "心理動詞", verdict: "獸停在岔路正中央，腳尖前後擺動但沒有選路。" },
  { word: "imply", level: 4, meaning: "暗示", category: "動詞", cue: "imply", challenge: "話中有話", verdict: "表層聲紋很淡，真正訊息藏在投影裡；看見的不是說出口的全部。" },

  { word: "slippery", level: 3, meaning: "滑的", category: "形容詞", cue: "slippery", challenge: "質感表現", verdict: "用高光斜面、失衡腳印與滑行殘影共同表現，避免只畫水滴。" },
  { word: "fragile", level: 4, meaning: "易碎的", category: "形容詞", cue: "fragile", challenge: "材質＋裂痕", verdict: "薄殼容器的裂紋正在擴散；重點是『還沒全碎、但禁不起碰』。" },
  { word: "transparent", level: 5, meaning: "透明的", category: "形容詞", cue: "transparent", challenge: "透視渲染", verdict: "背景格線完整穿過獸身，只留下玻璃高光與輪廓。" },
  { word: "jealous", level: 3, meaning: "嫉妒的", category: "形容詞", cue: "jealous", image: `${BASE}wordbeast/priest-jealous.png`, challenge: "情緒與眼神", verdict: "視線明確指向別獸得到的金果，羨慕的對象與不悅表情必須同框。" },
  { word: "vague", level: 5, meaning: "含糊的", category: "形容詞", cue: "vague", challenge: "後設模糊", verdict: "多個不完全重合的輪廓持續失焦，連獸種都無法被確定。" },

  { word: "justice", level: 2, meaning: "正義", category: "抽象詞", cue: "justice", challenge: "借用圖像傳統", verdict: "直接借秤的文化符號，但讓兩端主動回到平衡，強調公平而非交易。" },
  { word: "courage", level: 2, meaning: "勇氣", category: "抽象詞", cue: "courage", image: `${BASE}wordbeast/priest-courage.png`, challenge: "用構圖說故事", verdict: "小獸仍害怕，卻提燈面對巨影；勇氣不是不怕，是怕了仍向前。" },
  { word: "fate", level: 2, meaning: "命運", category: "抽象詞", cue: "fate", challenge: "註定感", verdict: "紅線先於角色存在，從過去節點一路牽到尚未抵達的終點。" },
  { word: "instinct", level: 4, meaning: "本能", category: "抽象詞", cue: "instinct", challenge: "內在驅力", verdict: "胸口核心先亮，身體才轉向；把『還沒思考就行動』畫成時間差。" },
  { word: "tendency", level: 4, meaning: "趨向", category: "抽象詞", cue: "tendency", challenge: "統計式方向", verdict: "不是所有墨點都同向，而是大多數逐漸偏往一側；保留例外才叫 tendency。" },

  { word: "beneath", level: 3, meaning: "在…下方", category: "關係詞", cue: "beneath", challenge: "空間關係", verdict: "關係圖騰：主體固定在參照物下方。它不是怪物，而是一條可套用到任何物體的規則。" },
  { word: "beyond", level: 2, meaning: "超過、在彼方", category: "關係詞", cue: "beyond", challenge: "空間＋延伸", verdict: "墨點越過明確邊界後仍繼續前進，同時容納『彼方』與『超越』。" },
  { word: "throughout", level: 3, meaning: "遍及", category: "關係詞", cue: "throughout", challenge: "分布概念", verdict: "墨點不是排成線，而是從區域一端到另一端都有分布。" },
  { word: "barely", level: 3, meaning: "幾乎不、勉強", category: "關係詞", cue: "barely", challenge: "程度臨界", verdict: "進度只越過門檻一絲，畫出『有做到，但只差一點就失敗』。" },
  { word: "seldom", level: 2, meaning: "很少", category: "關係詞", cue: "seldom", challenge: "低頻率", verdict: "長時間軸上只有三枚稀疏腳印；用間距記頻率，不靠數字。" },

  { word: "spring", level: 1, meaning: "春天／彈簧／跳躍", category: "多義詞", cue: "spring", challenge: "三義跨概念", verdict: "不硬揉成怪獸：共用『向上釋放』動勢，三個義項各保留一面。", senses: [{ label: "春天", cue: "嫩芽從土中冒出" }, { label: "彈簧", cue: "線圈壓縮後回彈" }, { label: "跳躍", cue: "獸突然躍離地面" }] },
  { word: "bank", level: 1, meaning: "銀行／河岸", category: "多義詞", cue: "bank", challenge: "經典雙義", verdict: "一字兩卡面：石造金庫與河流邊界分開記，避免生成無意義的『河邊銀行』。", senses: [{ label: "銀行", cue: "硬幣進入石造金庫" }, { label: "河岸", cue: "水流被兩側陸地約束" }] },
  { word: "present", level: 1, meaning: "禮物／現在／呈現", category: "多義詞", cue: "present", challenge: "三義跨詞性", verdict: "三個義項分面呈現；答題時由例句決定翻哪一面，而不是押單一圖。", senses: [{ label: "禮物", cue: "綁帶盒子被遞出" }, { label: "現在", cue: "時間線中央亮起" }, { label: "呈現", cue: "雙手把事物展示出來" }] },
  { word: "bear", level: 1, meaning: "熊／忍受", category: "多義詞", cue: "bear", challenge: "圖像陷阱", verdict: "預設主卡面必須是『忍受』：熊只留作次義；負重不倒的姿態才是考試真正陷阱。", senses: [{ label: "忍受", cue: "承受壓力仍站立" }, { label: "熊", cue: "熊形獸的剪影" }] },
  { word: "charge", level: 2, meaning: "費用／衝鋒／電荷", category: "多義詞", cue: "charge", challenge: "義項最分散", verdict: "用共同核心『累積後釋放／施加』串聯，但答題仍保留三卡面。", senses: [{ label: "費用", cue: "帳單上增加一枚硬幣" }, { label: "衝鋒", cue: "獸蓄力後向前衝" }, { label: "電荷", cue: "兩極之間跳出電弧" }] },
];
