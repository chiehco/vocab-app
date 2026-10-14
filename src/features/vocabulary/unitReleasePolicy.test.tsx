// @vitest-environment happy-dom
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { Link, MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { contentDb } from '../../db/contentDb';
import { progressDb } from '../../db/progressDb';
import type { WordRecord } from '../../db/types';
import { createComponentHarness } from '../../test/componentHarness';
import pack from '../../../public/data/v1/sa-pack.json';
import unit2 from '../direct/curriculumLV4Unit2.json';
import { curriculumUnits, findUnit, learningItems, templateGroup, validGroup } from '../direct/model';
import { saveGroup } from '../direct/store';
import GroupsScreen from '../direct/GroupsScreen';
import SiegeScreen from '../siege/SiegeScreen';
import TextbookScreen from './TextbookScreen';
import VocabularyScreen from './VocabularyScreen';
import { textbookUnits } from './textbookCatalog';
import { isUnitPublished, unitReleaseHold } from './unitReleasePolicy';

let view: ReturnType<typeof createComponentHarness>;
const heldIds = unit2.learningItems.map(i=>i.learningItemId);
const rootText = () => view.container.textContent ?? '';
function CurrentRoute(){const location=useLocation();return <output data-testid="url">{location.pathname+location.search}</output>;}
function button(text:string){return [...view.container.querySelectorAll('button')].find(b=>b.textContent===text);}
beforeEach(async()=>{
  await Promise.all([...contentDb.tables,...progressDb.tables].map(t=>t.clear()));
  await contentDb.words.bulkPut(pack.words as WordRecord[]);
  view=createComponentHarness();
});
afterEach(async()=>{await view.unmount();await Promise.all([...contentDb.tables,...progressDb.tables].map(t=>t.clear()));});

it('publishes exactly23 LV4 units while retaining all24 packages, all164 held IDs and legacy groups',()=>{
  expect(textbookUnits.filter(u=>u.level==='LV4').map(u=>u.unit)).toEqual([1,...Array.from({length:22},(_,i)=>i+3)]);
  expect(curriculumUnits.filter(u=>u.level==='LV4')).toHaveLength(24);
  expect(findUnit(2,'LV4')!.items.map(i=>i.learningItemId)).toEqual(heldIds);
  expect(heldIds).toHaveLength(164);
  expect(heldIds.every(id=>learningItems.some(i=>i.learningItemId===id))).toBe(true);
  expect(validGroup({...templateGroup(2,'LV4'),itemIds:[...heldIds].reverse()})).toBe(true);
  expect(unitReleaseHold('LV4',2)).toMatchObject({status:'source_page_pending'});
  expect(isUnitPublished('LV3',2)).toBe(true);
  expect(isUnitPublished('LV1',2)).toBe(true);
  expect(textbookUnits.filter(u=>u.level==='LV4').every(u=>!u.partial)).toBe(true);
});

it.each([
  ['/textbook/LV4/2','/textbook/:level/:unit',<TextbookScreen key="textbook"/>],
  ['/vocabulary?level=LV4&unit=2','/vocabulary',<VocabularyScreen key="vocabulary"/>],
  ['/arena/word-siege?level=LV4&unit=2','/arena/word-siege',<SiegeScreen key="siege"/>],
] as const)('keeps explicit held URL %s pending without falling back, creating a group or starting practice',async(url,path,screen)=>{
  await view.render(<MemoryRouter initialEntries={[url]}><CurrentRoute/><Routes><Route path={path} element={screen}/></Routes></MemoryRouter>);
  await view.waitFor(()=>expect(rootText()).toContain('p22 完整來源待補'));
  expect(view.container.querySelector('[data-testid="url"]')?.textContent).toBe(url);
  expect(view.container.querySelector('a[href="/textbook?level=LV4"]')).not.toBeNull();
  expect(view.container.querySelector('.vocab-card')).toBeNull();
  expect(view.container.querySelector('iframe')).toBeNull();
  expect(button('進入守城')).toBeUndefined();
  expect([...view.container.querySelectorAll('button')].some(b=>b.textContent?.includes('建立我的群組')||b.textContent?.includes('做題目'))).toBe(false);
  expect(rootText()).not.toContain('LV4 Unit 1');
  expect(await progressDb.customGroups.count()).toBe(0);
  expect(await progressDb.directSessions.count()).toBe(0);
  expect(await progressDb.settings.count()).toBe(0);
});

it('keeps the vocabulary dropdown and new template tiles to23 without changing complete units',async()=>{
  await view.render(<MemoryRouter initialEntries={['/vocabulary?level=LV4&unit=1']}><VocabularyScreen/></MemoryRouter>);
  await view.waitFor(()=>expect(view.container.querySelector('select[aria-label="教材單元"]')).not.toBeNull());
  const options=[...view.container.querySelectorAll('select[aria-label="教材單元"] option')].map(o=>(o as HTMLOptionElement).value);
  expect(options).toEqual([1,...Array.from({length:22},(_,i)=>i+3)].map(String));
  expect(view.container.querySelector('.vocab-card')).not.toBeNull();
  await view.unmount();view=createComponentHarness();
  await view.render(<MemoryRouter initialEntries={['/groups?create=1']}><GroupsScreen/></MemoryRouter>);
  await view.waitFor(()=>expect(button('LV4')).toBeDefined());await view.click(button('LV4'));
  const tiles=[...view.container.querySelectorAll('.unit-tile strong')].map(t=>t.textContent);
  expect(tiles).toHaveLength(23);expect(tiles).not.toContain('Unit 02');expect(tiles).toContain('Unit 01');expect(tiles).toContain('Unit 24');
});

it('keeps an edited164-item U2 group readable and filters only new held教材 additions',async()=>{
  const group={...templateGroup(2,'LV4'),id:'retained-u2-policy',name:'我的 U2 排序',itemIds:[...heldIds].reverse()};
  await saveGroup(group);
  const saved = await progressDb.customGroups.get(group.id);
  await view.render(<MemoryRouter initialEntries={['/groups?group='+group.id]}><GroupsScreen/></MemoryRouter>);
  await view.waitFor(()=>expect(rootText()).toContain(group.name));
  expect(rootText()).toContain('p22 完整來源待補');
  expect(view.container.querySelectorAll('.direct-items > li')).toHaveLength(164);
  expect(await progressDb.customGroups.get(group.id)).toEqual(saved);
  expect(view.container.querySelector('a[href^="/quiz?group="]')).not.toBeNull();
  await view.click(button('編輯'));
  const offered=[...view.container.querySelectorAll('[data-learning-item-id]')].map(e=>e.getAttribute('data-learning-item-id'));
  expect(offered.length).toBeGreaterThan(0);expect(offered.every(id=>!heldIds.includes(id!))).toBe(true);
  expect(await progressDb.customGroups.get(group.id)).toEqual(saved);
});

it('removes an active battle when navigation explicitly requests held U2',async()=>{
  await view.render(<MemoryRouter initialEntries={['/arena/word-siege?level=LV4&unit=1']}><Link to="/arena/word-siege?level=LV4&unit=2">held U2 URL</Link><SiegeScreen/></MemoryRouter>);
  await view.waitFor(()=>expect(button('進入守城')?.disabled).toBe(false));await view.click(button('進入守城'));
  expect(view.container.querySelector('iframe')).not.toBeNull();
  await view.click([...view.container.querySelectorAll('a')].find(a=>a.textContent==='held U2 URL'));
  await view.waitFor(()=>expect(rootText()).toContain('p22 完整來源待補'));
  expect(view.container.querySelector('iframe')).toBeNull();expect(button('進入守城')).toBeUndefined();
});
