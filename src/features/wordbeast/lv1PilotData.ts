export type PilotKind = "concrete" | "action" | "emotion" | "relation" | "abstract" | "multi";

export interface Lv1PilotWord {
  word: string;
  meaning: string;
  kind: PilotKind;
  recipe: string;
  cue: string;
}

export const PILOT_KIND_LABEL: Record<PilotKind, string> = {
  concrete: "具體物",
  action: "動作",
  emotion: "情緒／狀態",
  relation: "關係",
  abstract: "抽象概念",
  multi: "多義詞",
};

export const LV1_PILOT_WORDS: Lv1PilotWord[] = [
  { word: "ability", meaning: "能力；才能", kind: "abstract", cue: "ability", recipe: "小獸同時操控三種工具，表示能完成事情的內在能力。" },
  { word: "able", meaning: "能夠的；有能力的", kind: "emotion", cue: "able", recipe: "小獸成功抬起閘門，直接表現『做得到』。" },
  { word: "about", meaning: "關於；大約；在周圍", kind: "relation", cue: "about", recipe: "兩獸的話都指向同一主題，先鎖定『談論關於某事』，避開 around 的繞行印象。" },
  { word: "above", meaning: "在上方；超出", kind: "relation", cue: "above", recipe: "主體固定在參照線上方，並留出明顯高度。" },
  { word: "abroad", meaning: "在國外；往國外", kind: "relation", cue: "abroad", recipe: "墨點帶著行囊越過國界，移動到另一片土地。" },
  { word: "across", meaning: "穿過；越過；在對面", kind: "relation", cue: "across", recipe: "墨點從一側橫越障礙抵達對面。" },
  { word: "act", meaning: "行動；表演", kind: "multi", cue: "act", recipe: "一半是跨出行動的一步，一半是舞台聚光燈下的表演。" },
  { word: "add", meaning: "增加；添加", kind: "action", cue: "add", recipe: "兩枚墨點加入原本的一枚，總量明顯增加。" },
  { word: "afraid", meaning: "害怕的", kind: "emotion", cue: "afraid", recipe: "小獸縮在巨影前，顫抖但仍看著威脅。" },
  { word: "after", meaning: "在……之後；後來", kind: "relation", cue: "after", recipe: "時間線先發生一件事，第二枚印記在其後亮起。" },
  { word: "age", meaning: "年齡；變老", kind: "abstract", cue: "age", recipe: "同一生命由幼小、成熟到老去，沿年輪排列。" },
  { word: "air", meaning: "空氣", kind: "concrete", cue: "air", recipe: "看不見的空氣被氣球輪廓留住，以漂浮微粒與內部氣流顯形，不再混成 wind。" },
  { word: "all", meaning: "全部；所有的", kind: "abstract", cue: "all", recipe: "範圍內每一枚墨點都被同時圈選，沒有遺漏。" },
  { word: "allow", meaning: "允許；准許", kind: "action", cue: "allow", recipe: "守門者主動打開閘門，讓另一枚墨點通行。" },
  { word: "almost", meaning: "幾乎；差不多", kind: "relation", cue: "almost", recipe: "墨點只差極小距離就碰到終點，但尚未完成。" },
  { word: "along", meaning: "沿著；向前", kind: "relation", cue: "along", recipe: "移動墨點始終貼著一條長路前進。" },
  { word: "always", meaning: "總是；始終", kind: "relation", cue: "always", recipe: "腳印沿無限環循環出現，沒有中斷時段。" },
  { word: "angry", meaning: "生氣的；憤怒的", kind: "emotion", cue: "angry", recipe: "小獸身體緊繃，周圍熱氣與尖刺向外爆出。" },
  { word: "animal", meaning: "動物", kind: "concrete", cue: "animal", recipe: "四足、尾巴、耳朵構成最基礎的非人動物輪廓。" },
  { word: "apple", meaning: "蘋果", kind: "concrete", cue: "apple", recipe: "保留果實、凹頂、果梗與單葉的高辨識輪廓。" },
  { word: "arrive", meaning: "到達；抵達", kind: "action", cue: "arrive", recipe: "移動墨點進入目的地圓環，並在終點停住。" },
  { word: "ask", meaning: "詢問；要求", kind: "action", cue: "ask", recipe: "小獸向另一獸送出帶問號的聲紋。" },
  { word: "baby", meaning: "嬰兒；幼小者", kind: "concrete", cue: "baby", recipe: "比例極小的幼獸躺在搖籃中。" },
  { word: "bank", meaning: "銀行；河岸", kind: "multi", cue: "bank", recipe: "雙卡面並置金庫與河流邊界，不強行揉成同一物件。" },
  { word: "bear", meaning: "忍受；熊", kind: "multi", cue: "bear", recipe: "主畫面是負重仍站立；熊影只作次義提示。" },
  { word: "begin", meaning: "開始", kind: "action", cue: "begin", recipe: "時間線的第一點亮起，嫩芽剛突破地面。" },
  { word: "break", meaning: "打破；中斷；休息", kind: "multi", cue: "break", recipe: "主體在中央斷裂，裂口同時形成一段停頓空白。" },
  { word: "bring", meaning: "帶來；拿來", kind: "action", cue: "bring", recipe: "小獸攜帶物件朝觀看者／指定目的地靠近。" },
  { word: "present", meaning: "現在；禮物；呈現", kind: "multi", cue: "present", recipe: "三面符印分別是當下時間點、禮物盒與展示動作。" },
  { word: "spring", meaning: "春天；彈簧；跳躍", kind: "multi", cue: "spring", recipe: "三義共享『向上釋放』：萌芽、回彈與跳起。" },
];
