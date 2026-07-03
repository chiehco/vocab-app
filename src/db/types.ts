// ---- 內容資料（VocabContentDB，可由 JSON 重灌）----

export interface WordRecord {
  wordId: string;
  word: string;
  level: string; // LV1–LV6
  pos: string | null;
  posAll: string[];
  meaningZh: string | null;
  meaningEn: string | null;
  usagePattern: string | null;
  syllables: string | null;
  stressPattern: string | null;
  phoneticUs: string | null;
  familyKey: string | null;
  isCore: boolean;
  sourceNote: string | null;
  status: string;
}

export interface ExampleRecord {
  exampleId: string;
  word: string;
  sensePos: string | null;
  meaningHint: string | null;
  exampleType: string | null;
  sentenceEn: string;
  sentenceZh: string | null;
  blankSentence: string | null;
  answer: string | null;
  difficulty: string | null;
  status: string;
}

export interface RelationRecord {
  relationId: string;
  word: string;
  relatedWord: string;
  relationType: string | null;
  direction: string | null;
  note: string | null;
  strength: number | null;
  status: string;
}

export interface MorphemeRecord {
  rowId: string;
  word: string;
  morpheme: string;
  morphemeType: string | null;
  meaningZh: string | null;
  meaningEn: string | null;
  origin: string | null;
  order: number | null;
  note: string | null;
  status: string;
}

export interface ContentMetaRecord {
  key: string; // "current"
  wordsHash: string;
  generatedAt: string;
  counts: Record<string, number>;
}

// ---- 使用者進度資料（VocabProgressDB，永不清除）----

export type CardStateName = "new" | "learning" | "review" | "relearning";

export interface CardState {
  word: string; // PK：以單字字串為主鍵，與內容資料重灌完全脫鉤
  state: CardStateName;
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  dueDate: string; // "YYYY-MM-DD"
  lastReviewedAt: string | null;
  lapses: number;
  createdAt: string;
}

export type Grade = 0 | 1 | 2 | 3; // Again / Hard / Good / Easy

export type ReviewMode = "flashcard" | "quiz-w2m" | "quiz-m2w" | "fill-blank";

export interface ReviewLogEntry {
  id?: number;
  word: string;
  reviewedAt: string;
  sessionId: string;
  grade: Grade;
  intervalBefore: number;
  intervalAfter: number;
  easeFactorBefore: number;
  easeFactorAfter: number;
  mode: ReviewMode;
}

export interface CheckInRecord {
  date: string; // PK "YYYY-MM-DD"
  reviewCount: number;
  newWordsCount: number;
  sessionsCount: number;
}

export interface QuizStatRecord {
  word: string;
  timesAsked: number;
  timesCorrect: number;
  lastAskedAt: string | null;
}

export interface SettingRecord {
  key: string;
  value: unknown;
}
