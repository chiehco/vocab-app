import {expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import proof from '../../../docs/lv4-releases-20261122/U04.json';
import {beforeLV4LaterUnitsText,beforeLV4PublishedText} from './lv4Published.testSupport';
import {getIllustrationCaption} from '../wordbeast/illustrationCaptions';
const hash=(text:string|Buffer)=>createHash('sha256').update(text).digest('hex');
it('keeps legitimate distinguish noun usage and synchronizes the reviewed textbook constructions',()=>{
 const pack=JSON.parse(readFileSync('public/data/v1/sa-pack.json','utf8'));
 for(const rows of [pack.words,JSON.parse(readFileSync('public/data/v1/words.json','utf8'))]){
  const row=rows.find((r:{wordId:string})=>r.wordId==='W003309');
  expect(row.usagePattern).toBe('distinguish + N; distinguish A from B; distinguish between A and B; distinguish oneself');
  expect(row.usagePatternZh).toBe('區別某事物；區別 A 與 B；區分 A 和 B；使自己出眾／揚名');
 }
 for(const rows of [pack.examples,JSON.parse(readFileSync('public/data/v1/examples.json','utf8'))]){
  for(const [id,pos]of [['EX034d80e8','v.'],['EX2746080a','n.'],['EX2d2c692c','v.'],['EX3c76c391','n.'],['EX614767af','v.'],['EX8e5a9b0a','v.'],['EXc16afcc8','v.']])expect(rows.find((r:{exampleId:string})=>r.exampleId===id).sensePos).toBe(pos);
 }
 for(const rows of [pack.notes,JSON.parse(readFileSync('public/data/v1/notes.json','utf8'))]){
  for(const id of ['NX66f052c4','NXdb8a8b42'])expect(rows.find((r:{noteId:string})=>r.noteId===id).word).toBe('intend');
 }
});
it('corrects enormous and distinctive captions while preserving the exact existing images',()=>{
 const pack=JSON.parse(readFileSync('public/data/v1/sa-pack.json','utf8'));const zh='兩隻豆豆身後堆著大量紙張、杯子與電子裝置，形成一座巨大的雜物堆。';
 expect(pack.media.find((r:{assetId:string})=>r.assetId==='AX5a9354ff').captionZh).toBe(zh);
 expect(getIllustrationCaption(zh)).toEqual({en:'An enormous pile of papers, cups, and electronic devices towers behind two Doudous.',zh});
 expect(getIllustrationCaption('帶白色條紋的石頭具有鮮明特色。')?.en).toBe("The stone's white stripe gives it a distinctive appearance.");
 expect(hash(readFileSync('public/wordbeast/s/W003358.webp'))).toBe('78d40fb19f07d3e9c66745693b62b04cdea9d5db76adef13676f103ec55d4127');
 expect(hash(readFileSync('public/wordbeast/a/W004312.webp'))).toBe('0122f27e4dd11b1c80dca0edaed0d9e6227f88f6ff1a2b149615a6cb1ee8ff5a');
});
for(const [path,spec]of Object.entries(proof.files))it(`authenticates U04 successor and exact prior bytes: ${path}`,()=>{
 const raw=beforeLV4LaterUnitsText(path,readFileSync(path,'utf8').replace(/\r\n/g,'\n'),4);expect(hash(raw)).toBe(spec.afterHash);
 const previous=beforeLV4LaterUnitsText(path,raw,3);expect(hash(previous)).toBe(spec.beforeHash);
 expect(beforeLV4LaterUnitsText(path,raw,3)).toBe(previous);
 expect(()=>beforeLV4LaterUnitsText(path,raw+' ',3)).toThrow(/complete file drift/);
 const oldest=beforeLV4PublishedText(path,raw);expect(beforeLV4PublishedText(path,oldest)).toBe(oldest);
});
