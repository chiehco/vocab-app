import { progressDb } from '../../db/progressDb';
import { contentDb } from '../../db/contentDb';
import { curriculumUnits, practiceQuestions, REVISION } from '../direct/model';
import images from '../vocabulary/lv1ReviewedImages.json';
import { readWordList } from './wordLists';
import { getExamUnit, getStudyUnit, parseUnitOrder } from '../units/unitPlan';

export const RESUME_KEY = 'learning:last-location';
export interface StudyResume {
  href: string; title: string; position: number; total: number; updatedAt: number;
}
export type StudyLocation = Omit<StudyResume, 'updatedAt'>;

export function isStudyResume(value: unknown): value is StudyResume {
  if (!value || typeof value !== 'object') return false;
  const b = value as StudyResume;
  return typeof b.href === 'string' && /^\/(vocabulary\?|textbook\/LV1\/\d+\/cards\?|word\/|units\/LV[1-6]\/)/.test(b.href)
    && typeof b.title === 'string' && b.title.length > 0 && b.title.length <= 200
    && Number.isInteger(b.position) && Number.isInteger(b.total) && b.position > 0 && b.position <= b.total
    && Number.isFinite(b.updatedAt);
}

export async function rememberStudy(location: StudyLocation) {
  const bookmark = { ...location, updatedAt: Date.now() };
  if (!isStudyResume(bookmark)) throw new Error('無效的學習位置');
  await progressDb.settings.put({ key: RESUME_KEY, value: bookmark });
}

// Validate against current content: removed cards and expired scopes must not become dead links.
export async function resolveStudyBookmark(value: unknown): Promise<StudyResume | undefined> {
  if (!isStudyResume(value)) return undefined;
  const url = new URL(value.href, 'https://local.invalid');
  const p = url.searchParams;
  if (url.pathname === '/vocabulary') {
    const unit = curriculumUnits.find(u => u.level === p.get('level') && u.unit === Number(p.get('unit')));
    const items = unit?.items.filter(i => i.kind === (p.get('kind') === 'grammar' ? 'grammar' : 'vocabulary')) ?? [];
    const index = items.findIndex(i => i.learningItemId === p.get('item'));
    return index >= 0 ? { ...value, title: unit!.name, position: index + 1, total: items.length } : undefined;
  }
  const lv1 = url.pathname.match(/^\/textbook\/LV1\/(\d+)\/cards$/);
  if (lv1) {
    const cards = images.filter(i => i.unit === Number(lv1[1]));
    const index = cards.findIndex(i => i.id === p.get('item'));
    return index >= 0 ? { ...value, position: index + 1, total: cards.length } : undefined;
  }
  const word = url.pathname.match(/^\/word\/([^/]+)$/);
  if (word) {
    const record = await contentDb.words.get(decodeURIComponent(word[1]));
    if (!record) return undefined;
    if (p.has('list') || p.has('group')) {
      const group = p.has('list') ? await readWordList(p.get('list')!) : await progressDb.customGroups.get(p.get('group')!);
      const index = group?.wordIds?.indexOf(record.wordId) ?? -1;
      return index >= 0 ? { ...value, title: group!.name, position: index + 1, total: group!.wordIds!.length } : undefined;
    }
    return { ...value, title: record.word, position: 1, total: 1 };
  }
  const unitPath = url.pathname.match(/^\/units\/(LV[1-6])\/(\d+)$/);
  if (unitPath) {
    const words = await contentDb.words.toArray();
    const unit = p.has('order')
      ? getStudyUnit(words, unitPath[1], Number(unitPath[2]), parseUnitOrder(p.get('order')))
      : getExamUnit(words, await contentDb.examPriorities.toArray(), unitPath[1], Number(unitPath[2]));
    const index = Number(p.get('index') ?? 0);
    return unit && Number.isInteger(index) && index >= 0 && index < unit.words.length
      ? { ...value, position: index + 1, total: unit.words.length } : undefined;
  }
  return undefined;
}

export async function getStudyResume(): Promise<StudyResume | undefined> {
  const bookmark = await resolveStudyBookmark((await progressDb.settings.get(RESUME_KEY))?.value);
  const validIds = new Set(practiceQuestions.map(q => q.questionId));
  const session = await progressDb.directSessions.orderBy('updatedAt').reverse().filter(s =>
    s.revision === REVISION && s.index >= 0 && s.index < s.questionIds.length
    && s.questionIds.every(id => validIds.has(id))).first();
  if (session && (!bookmark || session.updatedAt > bookmark.updatedAt)) {
    return { href: `/practice/direct?session=${encodeURIComponent(session.id)}`, title: session.title ?? '教材練習',
      position: session.index + 1, total: session.questionIds.length, updatedAt: session.updatedAt };
  }
  return bookmark;
}
