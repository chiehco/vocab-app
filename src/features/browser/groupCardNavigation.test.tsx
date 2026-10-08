import { beforeEach, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import WordDetailScreen from './WordDetailScreen';
import GroupsScreen from '../direct/GroupsScreen';
import { templateGroup, type CustomGroup } from '../direct/model';
import { groupWordIds } from '../direct/groupScope';
import { wordCatalog } from '../direct/groupWords';
import { useStudyBookmark } from '../modes/useStudyBookmark';
import type { WordList } from '../modes/wordLists';
import type { WordRecord } from '../../db/types';
import { contentDb } from '../../db/contentDb';
import saPack from '../../../public/data/v1/sa-pack.json';

vi.mock('dexie-react-hooks', () => ({ useLiveQuery: vi.fn() }));
vi.mock('../modes/useStudyBookmark', () => ({ useStudyBookmark: vi.fn() }));
vi.mock('../../hooks/useCardPronunciation', () => ({ useCardPronunciation: vi.fn() }));
vi.mock('../wordbeast/useIllustrationMedia', () => ({ useIllustrationMedia: vi.fn() }));

const unit = { ...templateGroup('LV4-U17'), id: 'unit / 17' };
const custom = { ...unit, id: 'custom', itemIds: [], wordIds: ['W000002', 'W002618', 'W000003'] };
const mixed = { ...unit, id: 'mixed', wordIds: [groupWordIds(unit)[0], 'W000002'] };
const list: WordList = { ...custom, id: 'list', returnTo: '/textbook/LV4/17' };

function word(wordId: string): WordRecord {
  return { ...wordCatalog.find(w => w.wordId === wordId)!, wordId, level: 'LV4', pos: 'n.', posAll: ['n.'], meaningZh: '字義', meaningEn: null, usagePattern: null, syllables: null, stressPattern: null, phoneticUs: null, familyKey: null, isCore: false, sourceNote: null, status: 'reviewed' };
}
function renderCard(group: CustomGroup | WordList | undefined, wordId: string, query = '', cards: WordRecord[] | null = group ? groupWordIds(group).map(word) : []) {
  vi.mocked(useLiveQuery).mockReturnValue(undefined).mockReturnValueOnce(group).mockReturnValueOnce(word(wordId)).mockReturnValueOnce(cards ?? undefined);
  return renderToStaticMarkup(<MemoryRouter initialEntries={[`/word/${wordId}${query}`]}><Routes><Route path="/word/:wordId" element={<WordDetailScreen />} /></Routes></MemoryRouter>).replaceAll(' data-discover="true"', '');
}
function renderGroup(group: CustomGroup) {
  vi.mocked(useLiveQuery).mockReturnValue(undefined).mockReturnValueOnce([group]).mockReturnValueOnce(groupWordIds(group).map(word)).mockReturnValueOnce([]);
  return renderToStaticMarkup(<MemoryRouter initialEntries={[`/groups?group=${encodeURIComponent(group.id)}`]}><GroupsScreen /></MemoryRouter>).replaceAll(' data-discover="true"', '');
}
beforeEach(() => { vi.restoreAllMocks(); vi.clearAllMocks(); });

it.each([['custom', custom], ['Unit itemIds only', unit], ['mixed and deduplicated', mixed], ['saved list', list]] as const)('%s: first/middle/last navigation, count, bookmark and return path agree', (_, group) => {
  const ids = groupWordIds(group);
  const isList = 'returnTo' in group;
  const query = `?${isList ? 'list' : 'group'}=${encodeURIComponent(group.id)}`;
  for (const index of [0, 1, ids.length - 1]) {
    const html = renderCard(group, ids[index], query);
    const nav = html.match(/<nav class="dossier-group-nav"[^>]*>(.*?)<\/nav>/)?.[1];
    expect(nav).toBeDefined();
    expect(nav).toContain(`<span>${index + 1} / ${ids.length}</span>`);
    expect(nav).toContain(`href="${isList ? group.returnTo : `/groups?group=${encodeURIComponent(group.id)}`}"`);
    if (index > 0) expect(nav).toContain(`href="/word/${ids[index - 1]}${query}">上一字</a>`);
    else expect(nav).not.toContain('上一字');
    if (index < ids.length - 1) expect(nav).toContain(`href="/word/${ids[index + 1]}${query}">下一字 →</a>`);
    else expect(nav).not.toContain('下一字');
    expect(useStudyBookmark).toHaveBeenLastCalledWith(expect.objectContaining({ href: `/word/${ids[index]}${query}`, position: index + 1, total: ids.length }));
  }
});

it.each([custom, unit, mixed])('group $id enters the first resolved card, including itemIds-only Units', group => {
  expect(renderGroup(group)).toContain(`href="/word/${groupWordIds(group)[0]}?group=${encodeURIComponent(group.id)}">依序看字卡</a>`);
});

it('empty or unresolved groups do not offer a card entry', () => {
  expect(renderGroup({ ...custom, wordIds: [] })).not.toContain('依序看字卡');
  expect(renderGroup({ ...custom, wordIds: [], itemIds: ['missing-item'] })).not.toContain('依序看字卡');
});

it('a missing group or a word outside the group hides group navigation', () => {
  expect(renderCard(undefined, 'W000002', '?group=missing')).not.toContain('群組字卡導覽');
  expect(renderCard(custom, 'W000004', '?group=custom')).not.toContain('群組字卡導覽');
  expect(useStudyBookmark).toHaveBeenLastCalledWith(undefined);
});


it.each([[1, 97, 97], [2, 116, 116], [1, 97, 32], [2, 116, 34]])('LV3 U%s: %s mapped, %s installed controls every navigation link and count', async (unitNumber, mappedCount, installedCount) => {
  const group = { ...templateGroup(unitNumber), id: `unit-${unitNumber}` };
  // Exercise both the complete shipped pack and a partially installed older library.
  const mappedIds = new Set(groupWordIds(group));
  const allowedIds = new Set([...mappedIds].slice(0, installedCount));
  const packWords = saPack.words.filter(w => !mappedIds.has(w.wordId) || allowedIds.has(w.wordId)) as WordRecord[];
  const installedIds = new Set(packWords.map(w => w.wordId));
  const expected = groupWordIds(group).filter(id => installedIds.has(id));
  expect(groupWordIds(group)).toHaveLength(mappedCount);
  expect(expected).toHaveLength(installedCount);
  vi.spyOn(contentDb.words, 'toArray').mockResolvedValue(packWords);
  const query = `?group=${group.id}`;
  // Execute the component's actual live-query callback against the shipped pack.
  renderCard(group, expected[0], query, []);
  const readCards = vi.mocked(useLiveQuery).mock.calls[2][0];
  const cards = await readCards() as WordRecord[];
  expect(cards.map(w => w.wordId)).toEqual(expected);
  for (const [index, id] of expected.entries()) {
    const html = renderCard(group, id, query, cards);
    const nav = html.match(/<nav class="dossier-group-nav"[^>]*>(.*?)<\/nav>/)?.[1];
    expect(nav).toContain(`<span>${index + 1} / ${installedCount}</span>`);
    expect(nav).toContain(`href="/groups?group=${group.id}"`);
    if (index) expect(nav).toContain(`href="/word/${expected[index - 1]}${query}">上一字</a>`);
    else expect(nav).not.toContain('上一字');
    if (index + 1 < expected.length) expect(nav).toContain(`href="/word/${expected[index + 1]}${query}">下一字 →</a>`);
    else expect(nav).not.toContain('下一字');
    expect(useStudyBookmark).toHaveBeenLastCalledWith(expect.objectContaining({ position: index + 1, total: installedCount }));
  }
});

it('saved lists skip missing cards and keep their return path', async () => {
  const installed = [word(custom.wordIds![0]), word(custom.wordIds![2])];
  vi.spyOn(contentDb.words, 'toArray').mockResolvedValue(installed);
  renderCard(list, installed[0].wordId, '?list=list', []);
  const cards = await vi.mocked(useLiveQuery).mock.calls[2][0]() as WordRecord[];
  expect(cards).toEqual(installed);
  const html = renderCard(list, installed[0].wordId, '?list=list', cards);
  expect(html).toContain('<span>1 / 2</span>');
  expect(html).toContain(`href="/word/${installed[1].wordId}?list=list">下一字 →</a>`);
  expect(html).toContain('href="/textbook/LV4/17"');
});

it('does not publish navigation or a bookmark before installed cards load', () => {
  const html = renderCard(custom, custom.wordIds![0], '?group=custom', null);
  expect(html).not.toContain('群組字卡導覽');
  expect(useStudyBookmark).toHaveBeenLastCalledWith(undefined);
});
