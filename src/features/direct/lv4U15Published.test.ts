import {expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import proof from '../../../docs/lv4-releases-20261122/U15.json';
import {beforeLV4LaterUnitsText,beforeLV4PublishedText} from './lv4Published.testSupport';
const hash=(text:string)=>createHash('sha256').update(text).digest('hex');
for(const [path,spec]of Object.entries(proof.files))it(`authenticates U15 successor and exact prior bytes: ${path}`,()=>{
 const raw=beforeLV4LaterUnitsText(path,readFileSync(path,'utf8').replace(/\r\n/g,'\n'),15);expect(hash(raw)).toBe(spec.afterHash);
 const previous=beforeLV4LaterUnitsText(path,raw,14);expect(hash(previous)).toBe(spec.beforeHash);
 expect(beforeLV4LaterUnitsText(path,raw,14)).toBe(previous);
 expect(()=>beforeLV4LaterUnitsText(path,raw+' ',14)).toThrow(/complete file drift/);
 const oldest=beforeLV4PublishedText(path,raw);expect(beforeLV4PublishedText(path,oldest)).toBe(oldest);
});

it('retains chorus noun and verb meanings with matching POS labels',()=>{
 const words=JSON.parse(beforeLV4LaterUnitsText('public/data/v1/words.json',readFileSync('public/data/v1/words.json','utf8').replace(/\r\n/g,'\n'),15));
 const row=words.find((r:{wordId:string})=>r.wordId==='W003144');
 expect(row.pos).toBe('n./v.');expect(row.posAll).toEqual(['n.','v.']);
 expect(row.meaningZh).toBe('合唱隊；齊聲；齊聲說道；合唱；（歌曲的）副歌');
 expect(row.meaningEn).toContain('the part of a song that is repeated after each verse');
 expect(row.meaningEn).toContain('(v., literary) to say the same words together as a group');
});
