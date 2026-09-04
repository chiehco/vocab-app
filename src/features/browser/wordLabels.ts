export const NOTE_TYPE_LABEL: Record<string, string> = {
  grammar: "文法",
  usage: "用法",
  phrase: "片語",
  mnemonic: "記憶法",
  culture: "文化",
};

export const STATE_LABEL: Record<string, string> = {
  new: "還不熟",
  learning: "儲存中",
  review: "記憶穩定",
  relearning: "再複習一次",
};

export const RELATION_TYPE_LABEL: Record<string, string> = {
  synonym: "同義",
  antonym: "反義",
  derivative: "衍生",
  word_form: "詞形變化",
  confuse: "易混淆",
  root_family: "同族詞",
  topic: "主題關聯",
  exam_distractor: "容易混淆的字",
};

// 反向查閱標籤：one_way 關聯在「終點字」的頁面顯示來源時用這個名稱。
// 只有語意明確、對學習者有用的類型才給標籤；沒列到的一律不反向顯示
// （exam_distractor 就是——在干擾項頁面冒出答案字沒有教學意義）。
export const REVERSE_RELATION_LABEL: Record<string, string> = {
  derivative: "詞基",
  topic: "相關詞",
};

export const MORPHEME_TYPE_LABEL: Record<string, string> = {
  prefix: "字首｜前印",
  root: "字根｜真核",
  base: "字基｜真核",
  suffix: "字尾｜尾印",
  combining_form: "結合形｜合印",
};
