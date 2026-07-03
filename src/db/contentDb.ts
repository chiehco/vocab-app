import Dexie, { type Table } from "dexie";
import type {
  ContentMetaRecord,
  ExampleRecord,
  MorphemeRecord,
  NoteRecord,
  RelationRecord,
  WordRecord,
} from "./types";

/** 內容資料庫：唯讀、可隨資料更新整批重灌。與進度資料庫實體分離。 */
export class VocabContentDB extends Dexie {
  words!: Table<WordRecord, string>;
  examples!: Table<ExampleRecord, string>;
  relations!: Table<RelationRecord, string>;
  morphemes!: Table<MorphemeRecord, string>;
  notes!: Table<NoteRecord, string>;
  meta!: Table<ContentMetaRecord, string>;

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
  }
}

export const contentDb = new VocabContentDB();
