// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {MemoryRouter} from 'react-router-dom';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import SettingsScreen from './SettingsScreen';
import {updateDictionaryContent,type DictionaryUpdateResult} from '../../db/seed';
vi.mock('dexie-react-hooks',()=>({useLiveQuery:()=>undefined}));
vi.mock('../../db/seed',()=>({updateDictionaryContent:vi.fn()}));
let root:Root,container:HTMLDivElement;
const button=(text:string)=>[...container.querySelectorAll('button')].find(b=>b.textContent===text)!;
beforeEach(async()=>{vi.resetAllMocks();Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});container=document.createElement('div');document.body.append(container);root=createRoot(container);await act(async()=>{root.render(<MemoryRouter><SettingsScreen/></MemoryRouter>)});});
afterEach(async()=>{await act(async()=>root.unmount());container.remove();});
it('shows pending, blocks duplicate clicks, and reports a completed update',async()=>{
 let finish!:(r:DictionaryUpdateResult)=>void;const pending=new Promise<DictionaryUpdateResult>(resolve=>{finish=resolve});vi.mocked(updateDictionaryContent).mockReturnValue(pending);
 await act(async()=>{const action=button('更新字典資料');action.click();action.click()});expect(updateDictionaryContent).toHaveBeenCalledTimes(1);expect(button('字典資料更新中…').disabled).toBe(true);expect(container.querySelector('[role=status]')?.textContent).toContain('正在檢查並下載');
 await act(async()=>{finish({status:'updated',scope:'starter',generatedAt:'2026-10-26'});await pending});expect(container.querySelector('[role=status]')?.textContent).toBe('字典資料已更新，學習進度已保留。');expect(button('更新字典資料').disabled).toBe(false);
});
it('shows a recoverable error then verifies current content on the same page',async()=>{
 vi.mocked(updateDictionaryContent).mockRejectedValueOnce(new TypeError('offline')).mockResolvedValueOnce({status:'current',scope:'full',generatedAt:'2026-10-26'});
 await act(async()=>button('更新字典資料').click());expect(container.querySelector('[role=status]')?.textContent).toContain('更新失敗，原有資料與學習進度已保留');
 await act(async()=>button('重試字典資料更新').click());expect(container.querySelector('[role=status]')?.textContent).toBe('字典資料已是最新，學習進度已保留。');expect(updateDictionaryContent).toHaveBeenCalledTimes(2);
});
it('keeps the webpage update action separate from dictionary synchronization',async()=>{
 const event=vi.fn();window.addEventListener('vocab-check-update',event);await act(async()=>button('檢查網頁更新').click());expect(event).toHaveBeenCalledOnce();expect(updateDictionaryContent).not.toHaveBeenCalled();expect(button('更新字典資料')).toBeDefined();window.removeEventListener('vocab-check-update',event);
});
