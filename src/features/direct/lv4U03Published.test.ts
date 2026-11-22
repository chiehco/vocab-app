import {expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import proof from '../../../docs/lv4-releases-20261122/U03.json';
import {beforeLV4LaterUnitsText,beforeLV4PublishedText} from './lv4Published.testSupport';
import {getIllustrationCaption} from '../wordbeast/illustrationCaptions';
const hash=(text:string)=>createHash('sha256').update(text).digest('hex');
it('synchronizes the selected U03 corrections in the full dictionary, starter and caption lookup',()=>{
 const pack=JSON.parse(readFileSync('public/data/v1/sa-pack.json','utf8'));
 for(const [id,pos]of [['EX7ae87282','n.'],['EX822ffc31','v.'],['EX9af8de99','v.'],['EXa5adfe98','n.']]){
  for(const rows of [pack.examples,JSON.parse(readFileSync('public/data/v1/examples.json','utf8'))])
   expect(rows.find((r:{exampleId:string})=>r.exampleId===id).sensePos).toBe(pos);
 }
 for(const words of [pack.words,JSON.parse(readFileSync('public/data/v1/words.json','utf8'))]){
  expect(words.find((r:{wordId:string})=>r.wordId==='W003674').usagePattern).toBe('...; nevertheless, ...; Nevertheless, S + V');
  expect(words.find((r:{wordId:string})=>r.wordId==='W003445').usagePatternZh).toBe('年輕或年長的一代；代代相傳；三代');
 }
 const caption='豆豆在講台上向聚集的群眾發表公開聲明。';
 expect(pack.media.find((r:{assetId:string})=>r.assetId==='AX3adc2135').captionZh).toBe(caption);
 expect(getIllustrationCaption(caption)).toEqual({en:'Doudou makes a public declaration from a podium before a gathered crowd.',zh:caption});
 expect(createHash('sha256').update(readFileSync('public/wordbeast/s/W003259.webp')).digest('hex')).toBe('104326536de7ff838f02235cd9e9aec09bbf826428056c01ed5f37d8f0334896');
});
for(const [path,spec]of Object.entries(proof.files))it(`preserves U03 fields and restores exact immutable predecessors: ${path}`,()=>{
 const raw=beforeLV4LaterUnitsText(path,readFileSync(path,'utf8').replace(/\r\n/g,'\n'),3);
 expect(hash(raw)).toBe(spec.afterHash);
 const previous=beforeLV4LaterUnitsText(path,raw,2.5);expect(hash(previous)).toBe(spec.beforeHash);
 // Warm hits remain exact; cache cannot hide new bytes or changed field content.
 expect(beforeLV4LaterUnitsText(path,raw,2.5)).toBe(previous);
 expect(()=>beforeLV4LaterUnitsText(path,raw+' ',2.5)).toThrow(/complete file drift/);
 const changed=JSON.parse(raw);if(Array.isArray(changed))changed[0].unapproved='drift';else changed.unapproved='drift';
 expect(()=>beforeLV4LaterUnitsText(path,JSON.stringify(changed,null,spec.indent??undefined)+'\n',2.5)).toThrow(/complete file drift/);
 const oldest=beforeLV4PublishedText(path,raw);expect(beforeLV4PublishedText(path,oldest)).toBe(oldest);
});
it('rejects modified proof pins even after priming a cached projection',()=>{
 const path='public/data/v1/words.json';const raw=readFileSync(path,'utf8').replace(/\r\n/g,'\n');
 beforeLV4LaterUnitsText(path,raw,2.5);const original=proof.scope;
 try{proof.scope+=' unapproved';expect(()=>beforeLV4LaterUnitsText(path,raw,2.5)).toThrow(/manifest drift/);}
 finally{proof.scope=original;}
});
it('handles non-finite boundaries without cache key collisions',()=>{
 const path='public/data/v1/words.json';const raw=readFileSync(path,'utf8').replace(/\r\n/g,'\n');
 expect(beforeLV4LaterUnitsText(path,raw,Infinity)).toBe(raw);
 expect(beforeLV4LaterUnitsText(path,raw,NaN)).toBe(beforeLV4PublishedText(path,raw));
});
