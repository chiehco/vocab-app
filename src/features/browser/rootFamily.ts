import type { MorphemeRecord } from "../../db/types";

/**
 * 字族網：把「共用同一個字根／字基」的字串起來。
 *
 * 只認 root / base / combining_form 三種構件——字首字尾（re-、-tion）太泛，
 * 串起來會是幾百字的雜訊網，不是字族。
 */
const FAMILY_MORPHEME_TYPES = new Set(["root", "base", "combining_form"]);

export interface RootFamily {
  morpheme: string;
  morphemeType: string;
  meaningZh: string | null;
  /** 同族的其他字（不含自己） */
  siblings: string[];
}

export function isFamilyMorpheme(morpheme: MorphemeRecord): boolean {
  return FAMILY_MORPHEME_TYPES.has(morpheme.morphemeType ?? "");
}

/** 取出這個字用來串字族的構件（依 order 排序，最多回傳 3 個）。 */
export function pickFamilyMorphemes(morphemes: MorphemeRecord[]): MorphemeRecord[] {
  return morphemes
    .filter(isFamilyMorpheme)
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .slice(0, 3);
}

/** 字根比對用的正規化：大小寫與連字號不該讓 eco 與 eco- 分家。 */
export function normalizeMorphemeKey(morpheme: string): string {
  return morpheme.trim().toLowerCase().replace(/-/g, "");
}

/**
 * 依字族構件組出字族網。
 *
 * @param familyMorphemes 這個字的字族構件（pickFamilyMorphemes 的結果）
 * @param candidates      所有共用這些構件的 morpheme 列（含本字自己的列）
 * @param selfWord        本字，會從 siblings 中排除
 * @param limit           每組最多列出幾個同族字
 */
export function buildRootFamilies(
  familyMorphemes: MorphemeRecord[],
  candidates: MorphemeRecord[],
  selfWord: string,
  limit = 8,
): RootFamily[] {
  const siblingsByKey = new Map<string, Set<string>>();
  for (const candidate of candidates) {
    if (!isFamilyMorpheme(candidate)) continue;
    if (candidate.word === selfWord) continue;
    const key = normalizeMorphemeKey(candidate.morpheme);
    if (!key) continue;
    const bucket = siblingsByKey.get(key) ?? new Set<string>();
    bucket.add(candidate.word);
    siblingsByKey.set(key, bucket);
  }

  const seenKeys = new Set<string>();
  const families: RootFamily[] = [];
  for (const morpheme of familyMorphemes) {
    const key = normalizeMorphemeKey(morpheme.morpheme);
    if (!key || seenKeys.has(key)) continue;
    seenKeys.add(key);
    const siblings = [...(siblingsByKey.get(key) ?? [])].sort((a, b) => a.localeCompare(b));
    if (siblings.length === 0) continue;
    families.push({
      morpheme: morpheme.morpheme,
      morphemeType: morpheme.morphemeType ?? "root",
      meaningZh: morpheme.meaningZh,
      siblings: siblings.slice(0, limit),
    });
  }
  return families;
}
