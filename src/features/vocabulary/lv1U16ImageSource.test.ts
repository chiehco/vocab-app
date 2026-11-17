import {expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import proof from '../../../docs/lv1-u16-image-candidates-20261117/resolver-proof.json';
import {beforeLV1U16ImageSource,validateLV1U16SourceProof} from './lv1U16ImageSource.testSupport';
it('reverses only the exact LV1 U16 resolver addition and rejects drift',()=>{
 validateLV1U16SourceProof();
 for(const key of Object.keys(proof)){const bad:Record<string,unknown>=structuredClone(proof);bad[key]='mutated';expect(()=>validateLV1U16SourceProof(bad)).toThrow(/Immutable/);}
 for(const row of proof.files){const actual=readFileSync(row.path,'utf8');expect(beforeLV1U16ImageSource(row.path,actual)).toBe(row.beforeText);expect(beforeLV1U16ImageSource(row.path,actual.replace(/\r?\n/g,'\r\n'))).toBe(row.beforeText);for(const changed of [actual+' ',actual+'\n','\ufeff'+actual,row.beforeText,actual.replace('import','import /* drift */')])expect(()=>beforeLV1U16ImageSource(row.path,changed)).toThrow(/drift|bytes/);}
 expect(beforeLV1U16ImageSource('unrelated.ts','unchanged')).toBe('unchanged');
});
