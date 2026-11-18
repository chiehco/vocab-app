import {expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import proof from '../../../docs/lv2-image-candidates-20261117/pride-resolver-proof.json';
import {beforeLV2PrideImageSource,validateLV2PrideSourceProof} from './lv2PrideImageSource.testSupport';
it('reverses only the exact pride resolver addition and rejects drift',()=>{
 validateLV2PrideSourceProof();
 for(const key of Object.keys(proof)){const bad:Record<string,unknown>=structuredClone(proof);bad[key]='mutated';expect(()=>validateLV2PrideSourceProof(bad)).toThrow(/Immutable/);}
 for(const row of proof.files){const actual=readFileSync(row.path,'utf8');expect(beforeLV2PrideImageSource(row.path,actual)).toBe(row.beforeText);expect(beforeLV2PrideImageSource(row.path,actual.replace(/\r?\n/g,'\r\n'))).toBe(row.beforeText);for(const changed of [actual+' ',actual+'\n','\ufeff'+actual,row.beforeText,actual.replace('import','import /* drift */')])expect(()=>beforeLV2PrideImageSource(row.path,changed)).toThrow(/drift|bytes/);}
 expect(beforeLV2PrideImageSource('unrelated.ts','unchanged')).toBe('unchanged');
});
