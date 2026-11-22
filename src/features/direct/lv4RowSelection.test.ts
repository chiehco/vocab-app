import {expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {beforeLV4LaterUnitsText,beforeLV4Rows} from './lv4Published.testSupport';
import proof from '../../../docs/lv4-releases-20261122/U11.json';

type Row=Record<string,unknown>;
const wordPath='public/data/v1/words.json';
const word=(JSON.parse(beforeLV4LaterUnitsText(wordPath,readFileSync(wordPath,'utf8').replace(/\r\n/g,'\n'),11)) as Row[]).find(row=>row.wordId==='W003866')!;
const previous={...word};
for(const op of proof.files['public/data/v1/words.json'].operations)if(op.selector.wordId===word.wordId)previous[op.field]=op.before;

it('retains nested partial-fixture selection, unrelated fields and the caller input',()=>{
 const input={outer:[{rows:[{...word,unlisted:'keep'}]}],unrelated:{wordId:'other',usagePattern:'untouched'}};
 const saved=structuredClone(input);
 expect(beforeLV4Rows('words',input)).toEqual({outer:[{rows:[{...previous,unlisted:'keep'}]}],unrelated:input.unrelated});
 expect(input).toEqual(saved);
});

it('rejects duplicate identities at different depths, including shared object references',()=>{
 expect(()=>beforeLV4Rows('words',{one:[word],two:{row:structuredClone(word)}})).toThrow(/selector identity drift/);
 expect(()=>beforeLV4Rows('words',{one:[word],two:{row:word}})).toThrow(/selector identity drift/);
});

it('still rejects unknown recorded fields instead of treating an indexed identity as approval',()=>{
 expect(()=>beforeLV4Rows('words',[{...word,usagePattern:'unrecorded'}])).toThrow(/field drift/);
 expect(()=>beforeLV4Rows('words',[{...word,usagePatternZh:'unrecorded'}])).toThrow(/field drift/);
});

it('keeps missing rows and primitive partial fixtures unchanged',()=>{
 for(const input of [undefined,null,[],[null,3,'unchanged'],{rows:[{wordId:'other',note:'keep'}]}])expect(beforeLV4Rows('words',input)).toEqual(input);
});
