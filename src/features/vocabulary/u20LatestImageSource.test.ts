import {expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import proof from '../../../docs/u16-latest-integration-20261119/u20-addition-proof.json';
import {beforeLatestU20Source,validateLatestU20Proof} from './u20LatestImageSource.testSupport';
it('preserves exact additive U20 integration and rejects proof/source drift',()=>{
 validateLatestU20Proof();
 for(const key of Object.keys(proof)){const bad:Record<string,unknown>=structuredClone(proof);bad[key]='mutated';expect(()=>validateLatestU20Proof(bad)).toThrow(/Immutable/);}
 const actual=readFileSync(proof.path,'utf8');
 expect(beforeLatestU20Source(proof.path,actual)).toBe(proof.beforeText);
 expect(beforeLatestU20Source(proof.path,actual.replace(/\r?\n/g,'\r\n'))).toBe(proof.beforeText);
 for(const changed of [actual+' ',actual+'\n','\ufeff'+actual,proof.beforeText,actual.replace('import','import /* drift */')])expect(()=>beforeLatestU20Source(proof.path,changed)).toThrow(/drift|bytes/);
 expect(beforeLatestU20Source('unrelated.ts','unchanged')).toBe('unchanged');
});
