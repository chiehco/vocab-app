import {expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import proof from '../../../docs/lv4-releases-20261122/U02-assure.json';
import {beforeLV4LaterUnitsText,beforeLV4PublishedText,beforeLV4Rows} from './lv4Published.testSupport';
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
it('keeps the legal noun pattern and synchronizes all three bilingual patterns in full and starter dictionaries',()=>{
 for(const path of ['public/data/v1/words.json','public/data/v1/sa-pack.json']){
  const value=JSON.parse(readFileSync(path,'utf8'));const rows=Array.isArray(value)?value:value.words;
  const row=rows.find((r:{wordId:string})=>r.wordId==='W003075');
  expect(row.usagePattern).toBe('assure + N; assure sb that + clause; assure sb of sth');
  expect(row.usagePatternZh).toBe('保證……；向某人保證……；向某人保證某事');
  expect(beforeLV4Rows('words',[row])[0].usagePattern).toBe('assure + N; assure to V');
  expect(row.usagePattern).not.toContain('assure to V');
 }
});
it('restores exact published U02 bytes and permits only authenticated older boundaries on repeated projections',()=>{
 for(const [path,spec]of Object.entries(proof.files)){
  const raw=beforeLV4LaterUnitsText(path,readFileSync(path,'utf8').replace(/\r\n/g,'\n'),2.5);expect(hash(raw)).toBe(spec.afterHash);
  const previous=beforeLV4LaterUnitsText(path,raw,2);expect(hash(previous)).toBe(spec.beforeHash);
  const oldest=beforeLV4PublishedText(path,raw);expect(beforeLV4PublishedText(path,oldest)).toBe(oldest);
  expect(()=>beforeLV4PublishedText(path,raw+' ')).toThrow(/complete file drift/);
 }
});
