import 'fake-indexeddb/auto';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {contentDb} from './contentDb';
import {progressDb} from './progressDb';
import {ensureContentAvailable,refreshInstalledContent,updateDictionaryContent} from './seed';
import words from '../../public/data/v1/words.json';
import senses from '../../public/data/v1/senses.json';

const house=words.find(w=>w.wordId==='W000415')!;
const approved=senses.filter(s=>s.wordId===house.wordId);
function pack(scope:string,modern:boolean) {
 const {verbForms,...old}=house;void verbForms;
 const rows={words:[modern?house:old],senses:modern?approved:[{...approved[0],status:'draft',meaningZh:'容納、收藏'}],examples:[],relations:[],morphemes:[],notes:[],examPriorities:[],media:[]};
 return {meta:{schemaVersion:2,generatedAt:'2026-10-26T06:21:08Z',wordsHash:modern?'new-words':'old-words',contentHash:`${scope==='starter'?'sa:':''}${modern?'new':'old'}`,counts:{words:1,senses:rows.senses.length,examples:0,relations:0,morphemes:0,notes:0,examPriority:0,media:0}},...rows};
}
function serve(incoming:ReturnType<typeof pack>,fail?:string) {
 const files:Record<string,unknown>={'sa-pack.json':incoming,'meta.json':incoming.meta};
 for(const [key,value]of Object.entries(incoming))if(key!=='meta')files[`${key==='examPriorities'?'exam_priority':key}.json`]=value;
 vi.stubGlobal('fetch',vi.fn(async(url:string)=>{const name=url.split('?')[0].split('/').pop()!;return new Response(JSON.stringify(files[name]),{status:name===fail?503:200})}));
}
const progress={cardStates:[{word:'synthetic-retained',state:'review',dueDate:'2026-10-18'}],reviewLogs:[{id:41,word:'synthetic-retained'}],checkIns:[{date:'2026-10-18'}],quizStats:[{word:'synthetic-retained',timesAsked:3}],settings:[{key:'fontScale',value:1.15}],customGroups:[{id:'synthetic-group',name:'保留順序',itemIds:['second','first']}],directSessions:[{id:'synthetic-direct',index:1}],directAttempts:[{id:'synthetic-direct:1',choice:'A'}],writtenSessions:[{id:'synthetic-written',answers:{q:'retained'}}],writtenSubmissions:[{id:'synthetic-written:1',rawAnswer:'retained'}],rewardWallet:[{id:'local',balance:60}],rewardRounds:[{id:'synthetic-round',questionCount:1}],rewardLedger:[{id:'synthetic-event',amount:30}],townDecorations:[{id:'synthetic-owned',sku:'plant'}]};
const snapshot=()=>Promise.all(progressDb.tables.map(t=>t.toArray()));
beforeEach(async()=>{await Promise.all([...contentDb.tables,...progressDb.tables].map(t=>t.clear()));for(const[name,rows]of Object.entries(progress))await progressDb.table(name).bulkPut(rows);});
afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers()});

it.each(['starter','full'])('updates old %s house in place, then preserves all 14 nonempty progress tables',async scope=>{
 serve(pack(scope,false));await ensureContentAvailable();const before=await snapshot();expect(before).toHaveLength(14);expect(before.every(rows=>rows.length>0)).toBe(true);
 serve(pack(scope,true));expect(await updateDictionaryContent()).toMatchObject({status:'updated',scope});
 expect((await contentDb.words.get(house.wordId))?.verbForms?.past).toBe('housed');expect(await contentDb.senses.bulkGet(['W000415-1','W000415-2'])).toEqual(approved);
 expect(await snapshot()).toEqual(before);
 for(const[url,options]of vi.mocked(fetch).mock.calls){expect(String(url)).toContain('?dictionary-update=1');expect(options?.cache).toBe('no-cache');expect(options?.signal).toBeInstanceOf(AbortSignal);}
});
it.each(['starter','full'])('reports failed %s downloads and retries without a reload or losing old content',async scope=>{
 serve(pack(scope,false));await ensureContentAvailable();const before=await snapshot();
 serve(pack(scope,true),scope==='starter'?'sa-pack.json':'examples.json');await expect(updateDictionaryContent()).rejects.toThrow('503');
 expect((await contentDb.meta.get('current'))?.contentHash).toBe(pack(scope,false).meta.contentHash);expect(await contentDb.senses.get('W000415-2')).toBeUndefined();expect(await snapshot()).toEqual(before);
 serve(pack(scope,true));expect((await updateDictionaryContent()).status).toBe('updated');expect((await contentDb.senses.get('W000415-2'))?.status).toBe('approved');expect((await contentDb.words.get(house.wordId))?.verbForms?.pastParticiple).toBe('housed');expect(await snapshot()).toEqual(before);
});
it.each(['starter','full'])('distinguishes verified current %s content from offline failure',async scope=>{
 serve(pack(scope,true));await ensureContentAvailable();const before=await snapshot();
 serve(pack(scope,true));expect((await updateDictionaryContent()).status).toBe('current');expect(fetch).toHaveBeenCalledTimes(1);
 vi.stubGlobal('fetch',vi.fn(async()=>{throw new TypeError('offline')}));await expect(updateDictionaryContent()).rejects.toThrow('offline');await expect(refreshInstalledContent()).resolves.toBeUndefined();await expect(ensureContentAvailable()).resolves.toBeUndefined();expect(await snapshot()).toEqual(before);expect((await contentDb.senses.get('W000415-2'))?.status).toBe('approved');
 serve(pack(scope,true));expect((await updateDictionaryContent()).status).toBe('current');
});
it('shares duplicate manual clicks and a simultaneous background refresh',async()=>{
 serve(pack('starter',false));await ensureContentAvailable();let finish!:(r:Response)=>void;
 vi.stubGlobal('fetch',vi.fn(()=>new Promise<Response>(resolve=>{finish=resolve})));
 const first=updateDictionaryContent(),second=updateDictionaryContent(),background=refreshInstalledContent();expect(second).toBe(first);
 await vi.waitFor(()=>expect(fetch).toHaveBeenCalledTimes(1));finish(new Response(JSON.stringify(pack('starter',true))));await Promise.all([first,second,background]);expect(fetch).toHaveBeenCalledTimes(1);expect((await contentDb.senses.get('W000415-2'))?.status).toBe('approved');
});
it('rejects incomplete bundles atomically and permits a valid retry',async()=>{
 serve(pack('starter',false));await ensureContentAvailable();const bad=pack('starter',true);bad.senses=[];serve(bad);
 await expect(updateDictionaryContent()).rejects.toThrow('資料筆數不符');expect((await contentDb.meta.get('current'))?.contentHash).toBe('sa:old');expect((await contentDb.senses.get('W000415-1'))?.status).toBe('draft');
 serve(pack('starter',true));await updateDictionaryContent();expect((await contentDb.senses.get('W000415-2'))?.status).toBe('approved');
});
it('times out an unresponsive request and releases the retry lock',async()=>{
 serve(pack('starter',false));await ensureContentAvailable();vi.useFakeTimers();
 vi.stubGlobal('fetch',vi.fn((_url,options)=>new Promise<Response>((_resolve,reject)=>{options?.signal?.addEventListener('abort',()=>reject(new DOMException('Timed out','AbortError')))})));
 const result=updateDictionaryContent();const rejected=expect(result).rejects.toThrow('Timed out');await vi.waitFor(()=>expect(fetch).toHaveBeenCalledTimes(1));await vi.advanceTimersByTimeAsync(30_000);await rejected;vi.useRealTimers();
 serve(pack('starter',true));expect((await updateDictionaryContent()).status).toBe('updated');
});
