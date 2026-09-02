import Dexie, { type Table } from "dexie";
import type {
  ContentMetaRecord,
  ExamPriorityRecord,
  ExampleRecord,
  MediaRecord,
  MorphemeRecord,
  NoteRecord,
  RelationRecord,
  SenseRecord,
  WordRecord,
} from "./types";

/** 內容資料庫：唯讀、可隨資料更新整批重灌。與進度資料庫實體分離。 */
export class VocabContentDB extends Dexie {
  words!: Table<WordRecord, string>;
  senses!: Table<SenseRecord, string>;
  examples!: Table<ExampleRecord, string>;
  relations!: Table<RelationRecord, string>;
  morphemes!: Table<MorphemeRecord, string>;
  notes!: Table<NoteRecord, string>;
  meta!: Table<ContentMetaRecord, string>;
  examPriorities!: Table<ExamPriorityRecord, string>;
  media!: Table<MediaRecord, string>;

  constructor() {
    super("VocabContentDB");
    this.version(1).stores({
      words: "wordId, word, level, pos, familyKey, isCore",
      examples: "exampleId, word, exampleType, status",
      relations: "relationId, word, relatedWord, relationType",
      morphemes: "rowId, word, morphemeType",
      meta: "key",
    });
    this.version(2).stores({
      notes: "noteId, word, noteType",
    });
    this.version(3).stores({
      examPriorities: "wordId, word, priorityTier, rank, level, isFunctionWord",
    });
    this.version(4).stores({
      senses: "senseId, wordId, word, sensePos, isExamSense, status",
    });
    // v5：字族網要由字根反查同族字，morpheme 需要索引。
    this.version(5).stores({
      morphemes: "rowId, word, morpheme, morphemeType",
    });
    // v6：看圖辨字需要圖片所屬中文情境與指定提示。
    this.version(6).stores({
      media: "assetId, targetWord, targetType, status, imageType",
    });
  }
}

export const contentDb = new VocabContentDB();
