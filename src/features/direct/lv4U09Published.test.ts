import {expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import proof from '../../../docs/lv4-releases-20261122/U09.json';
import {beforeLV4LaterUnitsText,beforeLV4PublishedText} from './lv4Published.testSupport';
const hash=(text:string)=>createHash('sha256').update(text).digest('hex');
for(const [path,spec]of Object.entries(proof.files))it(`authenticates U09 successor and exact prior bytes: ${path}`,()=>{
 const raw=beforeLV4LaterUnitsText(path,readFileSync(path,'utf8').replace(/\r\n/g,'\n'),9);expect(hash(raw)).toBe(spec.afterHash);
 const previous=beforeLV4LaterUnitsText(path,raw,8);expect(hash(previous)).toBe(spec.beforeHash);
 expect(beforeLV4LaterUnitsText(path,raw,8)).toBe(previous);expect(()=>beforeLV4LaterUnitsText(path,raw+' ',8)).toThrow(/complete file drift/);
 const oldest=beforeLV4PublishedText(path,raw);expect(beforeLV4PublishedText(path,oldest)).toBe(oldest);
});

it('keeps three legitimate virtue constructions with three corresponding visible Chinese hints',()=>{
 for(const path of ['public/data/v1/words.json','public/data/v1/sa-pack.json']){
  const parsed=JSON.parse(beforeLV4LaterUnitsText(path,readFileSync(path,'utf8').replace(/\r\n/g,'\n'),9));
  const rows=Array.isArray(parsed)?parsed:parsed.words;
  const virtue=rows.find((r:{wordId:string})=>r.wordId==='W003989');
  expect(virtue.usagePattern.split('; ')).toEqual(['a/the virtue','virtue of N','by virtue of N']);
  expect(virtue.usagePatternZh.split('；')).toEqual(['美德','……的優點','憑藉……／由於……']);
 }
});
