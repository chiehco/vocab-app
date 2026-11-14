import 'fake-indexeddb/auto';
import {readFileSync} from 'node:fs';
import {expect,it} from 'vitest';
import {auditHash,lv3AfterUnitFile,lv3AfterUnitPublishedText} from './lv3Audit.testSupport';
import manifest from '../../../docs/lv3-audit-20261107/U18-patches.json';
import current0 from '../../../public/data/v1/words.json';
import current1 from '../../../scripts/sources/LV3Unit18.json';
import current2 from '../../../src/features/direct/curriculumLV3Unit18.json';
import current3 from '../../../public/data/v1/examples.json';
// Independent expected source documents SHA256 251422970bf38fdbf59ebcecdfaf2138b3912c64707f2cf120e51f59c18268d7.
// Constants below are derived from that accepted source package, not compiler output.
const expectedDocuments:[string,unknown,string][]=[
 ["public/data/v1/words.json",current0,'4382c2262b7be13445a6fc4e30e58c465b54ef2d4429e757fac18fd365191c33'],
 ["scripts/sources/LV3Unit18.json",current1,'bf6014177cbeafe1be520548be680f52cff7a799951ea24ab34a021b0a2dfc39'],
 ["src/features/direct/curriculumLV3Unit18.json",current2,'45bda690f50e458346162473a82ec8e65ca20aeed0fd881b446c564749bdc1f6'],
 ["public/data/v1/examples.json",current3,'b423f1afb14d5874d73af1ab17cda4bc0eeb536eca31be830455e663872340c2'],
];
it.each(expectedDocuments)('matches independently reviewed entire U18 document %s',(path,imported,hash)=>{
 const current=JSON.parse(readFileSync(new URL('../../../'+path,import.meta.url),'utf8'));
 expect(imported).toEqual(current);expect(auditHash(lv3AfterUnitFile('LV3-U18',path,current))).toBe(hash);
});
it('retains only the independently accepted 22 rows and32 fields',()=>{
 expect(manifest.unit).toBe('LV3-U18');expect(manifest.patches).toHaveLength(22);
 expect(manifest.patches.flatMap(p=>Object.keys(p.after).map(field=>[p.dataset,p.id,field])).sort()).toEqual([["curriculum", "LI-LV3U18-P189-boast", "chapterMeaningsZh"], ["curriculum", "LI-LV3U18-P189-boast", "sensePos"], ["curriculum", "LI-LV3U18-P189-boast", "targetMeaningZh"], ["examples", "EX13efba69", "sensePos"], ["examples", "EX38e25325", "sensePos"], ["examples", "EXf3bd3ef3", "sensePos"], ["source", "LI-LV3U18-P189-boast", "chapterMeaningsZh"], ["source", "LI-LV3U18-P189-boast", "sourcePos"], ["words", "W002096", "meaningEn"], ["words", "W002432", "usagePattern"], ["words", "W002432", "usagePatternZh"], ["words", "W002476", "usagePattern"], ["words", "W002476", "usagePatternZh"], ["words", "W002643", "pos"], ["words", "W002643", "posAll"], ["words", "W002647", "meaningZh"], ["words", "W002741", "usagePattern"], ["words", "W002741", "usagePatternZh"], ["words", "W002742", "meaningZh"], ["words", "W002828", "meaningEn"], ["words", "W002828", "meaningZh"], ["words", "W002828", "usagePattern"], ["words", "W002828", "usagePatternZh"], ["words", "W002848", "meaningZh"], ["words", "W002867", "meaningZh"], ["words", "W002884", "meaningZh"], ["words", "W002990", "meaningZh"], ["words", "W003076", "meaningZh"], ["words", "W003130", "meaningZh"], ["words", "W003227", "meaningEn"], ["words", "W003783", "meaningZh"], ["words", "W004824", "meaningZh"]]);
 expect(Object.keys(manifest.files).sort()).toEqual(["public/data/v1/examples.json", "public/data/v1/words.json", "scripts/sources/LV3Unit18.json", "src/features/direct/curriculumLV3Unit18.json"]);
});
it('restores the whole supplementary source at U17 without changing the original144 domain',()=>{
 const path='scripts/sources/LV3Unit18.json';
 const text=readFileSync(new URL('../../../'+path,import.meta.url),'utf8').replace(/\r\n/g,'\n');
 const before=lv3AfterUnitPublishedText('LV3-U17',path,text);
 expect(auditHash(JSON.parse(before))).toBe('ba31d795dbee8537c70199932abd633dcecf495a150018991b8cea066dc84df0');
 expect(()=>lv3AfterUnitPublishedText('LV3-U17',path,text+' ')).toThrow();
});
