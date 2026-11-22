import {expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import proof from '../../../docs/lv4-releases-20261122/U13.json';
import {beforeLV4LaterUnitsText,beforeLV4PublishedText} from './lv4Published.testSupport';
const hash=(text:string)=>createHash('sha256').update(text).digest('hex');
for(const [path,spec]of Object.entries(proof.files))it(`authenticates U13 successor and exact prior bytes: ${path}`,()=>{
 const raw=beforeLV4LaterUnitsText(path,readFileSync(path,'utf8').replace(/\r\n/g,'\n'),13);expect(hash(raw)).toBe(spec.afterHash);
 const previous=beforeLV4LaterUnitsText(path,raw,12);expect(hash(previous)).toBe(spec.beforeHash);
 expect(beforeLV4LaterUnitsText(path,raw,12)).toBe(previous);
 expect(()=>beforeLV4LaterUnitsText(path,raw+' ',12)).toThrow(/complete file drift/);
 const oldest=beforeLV4PublishedText(path,raw);expect(beforeLV4PublishedText(path,oldest)).toBe(oldest);
});

it('keeps both existing hamper verb and basket noun visible without promoting its draft status',()=>{
 const path='public/data/v1/words.json';
 const rows=JSON.parse(beforeLV4LaterUnitsText(path,readFileSync(path,'utf8').replace(/\r\n/g,'\n'),13)) as Record<string,unknown>[];
 const hamper=rows.find(row=>row.wordId==='W005409')!;
 expect([hamper.word,hamper.pos,hamper.posAll,hamper.status]).toEqual(['hamper','v./n.',['v.','n.'],'draft']);
 expect(hamper.meaningZh).toBe('食籃；阻礙物；食盒；阻礙');
 expect(hamper.meaningEn).toBe('a basket usually with a cover; prevent the progress or free movement of');
 expect(hamper.usagePattern).toContain('a picnic hamper');
});
