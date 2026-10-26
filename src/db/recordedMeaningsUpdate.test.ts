import 'fake-indexeddb/auto';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { contentDb } from './contentDb';
import { progressDb } from './progressDb';
import { ensureContentAvailable, refreshInstalledContent } from './seed';
import { gradeFlashcard } from '../checkin/recordActivity';

beforeEach(async()=>{await Promise.all([...contentDb.tables,...progressDb.tables].map(table=>table.clear()));});
afterEach(()=>vi.unstubAllGlobals());
it('refreshes sense links/forms without changing any existing progress table or word identity',async()=>{
 const word={wordId:'W999111',word:'zzkeep',level:'LV1',pos:'n./v.',posAll:['n.','v.'],meaningZh:'合成摘要',meaningEn:null,usagePattern:null,syllables:null,stressPattern:null,phoneticUs:null,familyKey:null,isCore:false,sourceNote:null,status:'reviewed'};
 const sense={senseId:'W999111-1',wordId:word.wordId,word:word.word,senseOrder:1,sensePos:'v.',meaningZh:'合成動詞義',isExamSense:true,examEvidence:null,answerForms:[],note:null,status:'reviewed'};
 const pack={meta:{schemaVersion:2,generatedAt:'2026-10-26',wordsHash:'old',contentHash:'sa:old',counts:{words:1,senses:1,examples:0,relations:0,morphemes:0,notes:0,examPriority:0,media:0}},words:[word],senses:[sense],examples:[],relations:[],morphemes:[],notes:[],examPriorities:[],media:[]};
 let incoming:unknown=pack;
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(incoming))));
 await ensureContentAvailable();await gradeFlashcard(word.word,2,'synthetic-existing',true);
 await progressDb.settings.put({key:'fontScale',value:1.15});
 const before=await Promise.all(progressDb.tables.map(table=>table.toArray()));
 expect(before.some(rows=>rows.length>0)).toBe(true);
 incoming={...pack,meta:{...pack.meta,wordsHash:'new',contentHash:'sa:new',counts:{...pack.meta.counts,senses:2}},words:[{...word,verbForms:{base:word.word,past:'zzkept',pastParticiple:'zzkept',sourceRef:'synthetic:checked',status:'approved'}}],senses:[sense,{...sense,senseId:'W999111-2',senseOrder:2,sensePos:'n.',meaningZh:'合成名詞義'}]};
 await refreshInstalledContent();
 expect(await Promise.all(progressDb.tables.map(table=>table.toArray()))).toEqual(before);
 expect((await contentDb.words.get(word.wordId))?.verbForms?.past).toBe('zzkept');
 expect(await contentDb.senses.get(sense.senseId)).toEqual(sense);
 expect(await contentDb.senses.count()).toBe(2);
});
