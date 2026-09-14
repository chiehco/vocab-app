// Imports the LV4 Unit 17 content pack (大叔 2026-09-14) into the app's curriculum format.
// Source pack: OneDrive/文件/萬詞譜/work/lv4_unit17_20260914 (unit17.json + assets/web/*.webp)
// Output: src/features/direct/curriculumLV4Unit17.json and public/curriculum/lv4-u17/*.webp
//
// ID mapping to the app's practice-mode convention (see direct/model.ts questionForMode):
//   vocabulary advanced  CLOZE-ORIG-LV4U17-<w>          -> unchanged
//   vocabulary basic     CHOICE-ORIG-LV4U17-<w>         -> CHOICE-CLOZE-ORIG-LV4U17-<w>
//   usage (basic only)   CHOICE-ORIG-LV4U17-USAGE-nnn   -> USAGE-LV4U17-nnn (keeps options in both modes)
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from "node:fs";
import { basename, join, resolve } from "node:path";

const packDir = process.argv[2] ?? "C:/Users/USER/OneDrive/文件/萬詞譜/work/lv4_unit17_20260914";
const root = resolve(new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const pack = JSON.parse(readFileSync(join(packDir, "unit17.json"), "utf8"));
const assetDir = join(root, "public", "curriculum", "lv4-u17");
mkdirSync(assetDir, { recursive: true });

const copied = new Set();
function assetPath(path) {
  const file = basename(path);
  if (!copied.has(file)) {
    const src = join(packDir, path);
    if (!existsSync(src)) throw new Error(`missing asset ${src}`);
    copyFileSync(src, join(assetDir, file));
    copied.add(file);
  }
  return `curriculum/lv4-u17/${file}`;
}

const learningItems = pack.learningItems.map((item) => {
  const base = {
    learningItemId: item.learningItemId, kind: item.kind, level: item.level, unit: item.unit,
    sourcePage: item.sourcePage, review: item.review,
    originalExample: item.originalExample,
  };
  if (item.kind === "vocabulary") {
    return {
      ...base, displayWord: item.displayWord, lexemeRef: item.lexemeRef, officialWordId: item.officialWordId,
      officialSenseId: item.officialSenseId, sensePos: item.sensePos, targetMeaningZh: item.targetMeaningZh,
      chapterMeaningsZh: item.chapterMeaningsZh, printedNumber: item.printedNumber, cardEligible: item.cardEligible,
      practiceMode: item.practiceMode,
      illustration: item.illustration && item.illustration.exists
        ? { path: assetPath(item.illustration.path), captionEn: item.illustration.caption.en, captionZh: item.illustration.caption.zh }
        : undefined,
    };
  }
  return { ...base, parentWord: item.parentWord, pattern: item.pattern, explanationZh: item.explanationZh, targetMeaningZh: item.explanationZh };
});

function mapId(q) {
  if (q.mode === "advanced") return q.questionId;
  const m = /^CHOICE-ORIG-LV4U17-USAGE-(\d+)$/.exec(q.questionId);
  if (m) return `USAGE-LV4U17-${m[1]}`;
  return q.questionId.replace(/^CHOICE-ORIG-/, "CHOICE-CLOZE-ORIG-");
}
const questions = pack.questions.map((q) => {
  const isVocabBasic = q.mode === "basic" && !/USAGE/.test(q.questionId);
  return {
    questionId: mapId(q),
    // Basic vocabulary twins mirror LV3: the cloze question owns the learning item.
    ...(isVocabBasic ? {} : { learningItemId: q.learningItemId }),
    sourceType: isVocabBasic ? "original_target_word_choice" : q.mode === "advanced" ? "original_target_word_cloze" : "original_usage_choice",
    targetWord: q.targetWord, targetMeaningZh: q.targetMeaningZh, stem: q.stem, options: q.options, answer: q.answer,
    sentenceEn: q.sentenceEn, sentenceZh: q.sentenceZh, ...(q.answerForms && q.answerForms.length > 1 ? { answerForms: q.answerForms } : {}),
  };
});
const relatedNotes = pack.relatedNotes.map((n) => ({ parentWord: n.parentWord, word: n.word, meaningZh: n.meaningZh, officialWordId: n.officialWordId ?? null }));

const out = { template: pack.template, learningItems, questions, relatedNotes };
writeFileSync(join(root, "src", "features", "direct", "curriculumLV4Unit17.json"), JSON.stringify(out, null, 1) + "\n");
console.log(JSON.stringify({ items: learningItems.length, questions: questions.length, images: copied.size, relatedNotes: relatedNotes.length, revision: pack.template.revision }));
