export const NOTE_TYPE_LABEL: Record<string, string> = {
  grammar: "文法",
  usage: "用法",
  phrase: "片語",
  mnemonic: "記憶法",
  culture: "文化",
};

export const STATE_LABEL: Record<string, string> = {
  new: "尚未穩定",
  learning: "正在封印",
  review: "封印穩定",
  relearning: "重新加固",
};

export const RELATION_TYPE_LABEL: Record<string, string> = {
  synonym: "同義",
  antonym: "反義",
  derivative: "衍生",
  word_form: "詞形變化",
  confuse: "易混淆",
  root_family: "同根字族",
  topic: "主題關聯",
  exam_distractor: "斬妄形",
};
