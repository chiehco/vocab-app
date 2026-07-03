import { Link, useParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { contentDb } from "../../db/contentDb";
import { progressDb } from "../../db/progressDb";

const STATE_LABEL: Record<string, string> = {
  new: "新字",
  learning: "學習中",
  review: "複習中",
  relearning: "重新學習",
};

export default function WordDetailScreen() {
  const { wordId } = useParams<{ wordId: string }>();

  const word = useLiveQuery(
    () => (wordId ? contentDb.words.get(wordId) : undefined),
    [wordId],
  );
  const examples = useLiveQuery(
    () => (word ? contentDb.examples.where("word").equals(word.word).toArray() : []),
    [word?.word],
  );
  const relations = useLiveQuery(
    () => (word ? contentDb.relations.where("word").equals(word.word).toArray() : []),
    [word?.word],
  );
  const morphemes = useLiveQuery(
    () => (word ? contentDb.morphemes.where("word").equals(word.word).toArray() : []),
    [word?.word],
  );
  const cardState = useLiveQuery(
    () => (word ? progressDb.cardStates.get(word.word) : undefined),
    [word?.word],
  );

  if (!word) {
    return <p className="p-6 text-center text-slate-400">載入中…</p>;
  }

  return (
    <div className="p-4">
      <Link to="/browse" className="text-sm text-blue-600">
        ← 回單字列表
      </Link>
      <div className="mt-3 rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex items-baseline gap-2">
          <h1 className="text-3xl font-bold">{word.word}</h1>
          <span className="text-slate-400">{word.pos}</span>
          <span className="ml-auto rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
            {word.level}
          </span>
        </div>
        {word.phoneticUs && <p className="mt-1 text-sm text-slate-400">/{word.phoneticUs}/</p>}
        <p className="mt-3 text-lg">{word.meaningZh}</p>
        {word.meaningEn && <p className="mt-1 text-sm text-slate-500">{word.meaningEn}</p>}
        {word.usagePattern && (
          <p className="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800">
            用法：{word.usagePattern}
          </p>
        )}
        {cardState && (
          <p className="mt-3 text-xs text-slate-400">
            學習狀態：{STATE_LABEL[cardState.state]}｜下次複習：{cardState.dueDate}
          </p>
        )}
      </div>

      {examples && examples.length > 0 && (
        <section className="mt-4">
          <h2 className="mb-2 font-bold">例句</h2>
          {examples.map((ex) => (
            <div key={ex.exampleId} className="mb-2 rounded-xl bg-white p-4 shadow-sm">
              <p>{ex.sentenceEn}</p>
              {ex.sentenceZh && <p className="mt-1 text-sm text-slate-500">{ex.sentenceZh}</p>}
            </div>
          ))}
        </section>
      )}

      {relations && relations.length > 0 && (
        <section className="mt-4">
          <h2 className="mb-2 font-bold">關聯詞</h2>
          <div className="rounded-xl bg-white p-4 shadow-sm">
            {relations.map((r) => (
              <p key={r.relationId} className="py-1 text-sm">
                <span className="font-semibold">{r.relatedWord}</span>
                <span className="ml-2 text-xs text-slate-400">{r.relationType}</span>
                {r.note && <span className="ml-2 text-slate-500">{r.note}</span>}
              </p>
            ))}
          </div>
        </section>
      )}

      {morphemes && morphemes.length > 0 && (
        <section className="mt-4">
          <h2 className="mb-2 font-bold">字根拆解</h2>
          <div className="rounded-xl bg-white p-4 shadow-sm">
            {morphemes
              .slice()
              .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
              .map((m) => (
                <p key={m.rowId} className="py-1 text-sm">
                  <span className="font-semibold">{m.morpheme}</span>
                  <span className="ml-2 text-xs text-slate-400">{m.morphemeType}</span>
                  <span className="ml-2 text-slate-500">{m.meaningZh}</span>
                </p>
              ))}
          </div>
        </section>
      )}
    </div>
  );
}
