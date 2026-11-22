import {expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import proof from '../../../docs/lv4-releases-20261122/U14.json';
import {beforeLV4LaterUnitsText,beforeLV4PublishedText} from './lv4Published.testSupport';
const hash=(text:string)=>createHash('sha256').update(text).digest('hex');
for(const [path,spec]of Object.entries(proof.files))it(`authenticates U14 successor and exact prior bytes: ${path}`,()=>{
 const raw=beforeLV4LaterUnitsText(path,readFileSync(path,'utf8').replace(/\r\n/g,'\n'),14);expect(hash(raw)).toBe(spec.afterHash);
 const previous=beforeLV4LaterUnitsText(path,raw,13);expect(hash(previous)).toBe(spec.beforeHash);
 expect(beforeLV4LaterUnitsText(path,raw,13)).toBe(previous);
 expect(()=>beforeLV4LaterUnitsText(path,raw+' ',13)).toThrow(/complete file drift/);
 const oldest=beforeLV4PublishedText(path,raw);expect(beforeLV4PublishedText(path,oldest)).toBe(oldest);
});
