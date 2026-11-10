import {expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import proof from '../../../docs/lv3-audit-20261107/U16-example-images-resolver-integration.json';
import {beforeU16ExampleImageSource,validateU16ImageSourceProof} from './lv3U16ExampleImages.testSupport';
it('pins U16 additive source transformation and rejects mutations',()=>{validateU16ImageSourceProof();for(const key of Object.keys(proof)){const x:Record<string,unknown>=structuredClone(proof);x[key]='mutated';expect(()=>validateU16ImageSourceProof(x)).toThrow(/Immutable/);}for(const f of proof.files){const actual=readFileSync(f.path,'utf8');expect(beforeU16ExampleImageSource(f.path,actual)).toBe(f.beforeText);expect(beforeU16ExampleImageSource(f.path,actual.replace(/\r?\n/g,'\r\n'))).toBe(f.beforeText);for(const x of [actual+' ',actual+'\n','\ufeff'+actual,f.beforeText,actual.replace('import','import /* drift */')])expect(()=>beforeU16ExampleImageSource(f.path,x)).toThrow(/drift|bytes/);}});
