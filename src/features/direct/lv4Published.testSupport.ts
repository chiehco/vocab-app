import unit10 from '../../../docs/lv4-releases-20261122/U10.json';
import unit09 from '../../../docs/lv4-releases-20261122/U09.json';
import unit08 from '../../../docs/lv4-releases-20261122/U08.json';
import unit07 from '../../../docs/lv4-releases-20261122/U07.json';
import unit06 from '../../../docs/lv4-releases-20261122/U06.json';
import unit05 from '../../../docs/lv4-releases-20261122/U05.json';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import manifest from '../../../docs/lv4-releases-20261122/U01.json';
import unit02 from '../../../docs/lv4-releases-20261122/U02.json';
import unit04 from '../../../docs/lv4-releases-20261122/U04.json';
import unit03 from '../../../docs/lv4-releases-20261122/U03.json';
import {BoundedTextCache} from './boundedTextCache.testSupport';
import assure from '../../../docs/lv4-releases-20261122/U02-assure.json';
import resolver from '../../../docs/lv4-releases-20261122/resolver-U01.json';
type Row=Record<string,unknown>;
type Operation={dataset?:string;selector:Row;field:string;before?:unknown;beforePresent?:boolean;after:unknown};
type AppendedRow={dataset?:string;index:number;key:string;row:Row};
type File={beforeHash:string;afterHash:string;operations:Operation[];appendedRows?:AppendedRow[];beforeMeta?:unknown;indent:number|null};
const layers=[{unit:10,manifest:unit10,pin:'6f0725434710316fc04d096264d5c3ee190a8edb30a70d9744add3889c56860d'},{unit:9,manifest:unit09,pin:'28d43fed408c84d9be5c7fb2ba6be0cb1f351f75b39e02501ccd9d838daa3798'},{unit:8,manifest:unit08,pin:'612916bfcd2aa09210efbb4fe622398d6d0594698b8c7fca1bb4e06183bd8b2f'},{unit:7,manifest:unit07,pin:'88d95b15bc194ad6bd13a9f26c34ae6ff803359bb68949aedf953725fb5fb316'},{unit:6,manifest:unit06,pin:'822e943e2d5b0fe0e40894da457f7b75f1942f75e01a8ca528a3779d6b4c305a'},{unit:5,manifest:unit05,pin:'6712a246587467b27b9c6c5be12d968693f92a67e6444d4254de090519746427'},{unit:4,manifest:unit04,pin:'5de47824a3c85ed89ae7ffe4d67ba875f0678c54c79f2e12c2fd430a57e5bff4'},{unit:3,manifest:unit03,pin:'3b8067666a74a1fb0338b9a04bc6c125e563eddc5d5906914b4e216ccd2c70bc'},{unit:2.5,manifest:assure,pin:'9454367917fc875b4ed6d32113d052c92c38a7763831c1ac1d080a7752990df5'},
 {unit:2,manifest:unit02,pin:'e3715fdbdf76b2d165327797bc2549ae00d8cfc9c902eaa3bda351ec3aaee292'},
 {unit:1,manifest,pin:'b3e64bec21ee412d7ccaa468b5036a548bfc8ac9b562781b4a59335a6bc79818'}];
export const hasLV4PublishedFile=(path:string)=>layers.some(layer=>Object.hasOwn(layer.manifest.files,path));
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
export function isLV4PublishedAfterText(path:string,text:string):boolean{
 authenticate();return layers.some(layer=>(layer.manifest.files as Record<string,File>)[path]?.afterHash===hash(text));
}
function authenticate(){for(const layer of layers)assert.equal(hash(JSON.stringify(layer.manifest)),layer.pin,`LV4 U${layer.unit} manifest drift`);}
function find(value:unknown,selector:Row):Row[]{
 if(Array.isArray(value))return value.flatMap(v=>find(v,selector));
 if(value&&typeof value==='object'){
  const row=value as Row;return [...(Object.entries(selector).every(([k,v])=>row[k]===v)?[row]:[]),...Object.values(row).flatMap(v=>find(v,selector))];
 }return [];
}
function reverse(value:unknown,operation:Operation,partial=false){
 const rows=find(value,operation.selector);if(partial&&!rows.length)return;
 assert.equal(rows.length,1,'LV4 U01 selector identity drift');const row=rows[0];
 if(partial&&operation.beforePresent!==false&&JSON.stringify(row[operation.field])===JSON.stringify(operation.before))return;
 assert.deepEqual(row[operation.field],operation.after,'LV4 U01 field drift');
 if(operation.beforePresent===false)delete row[operation.field];else row[operation.field]=structuredClone(operation.before);
}
function reverseAppended(value:unknown,addition:AppendedRow,partial=false){
 assert.ok(Number.isInteger(addition.index)&&addition.index>=0&&Object.hasOwn(addition.row,addition.key),'LV4 appended row specification drift');
 const matches=find(value,{[addition.key]:addition.row[addition.key]});if(partial&&!matches.length)return;
 assert.equal(matches.length,1,'LV4 appended row identity drift');assert.ok(Array.isArray(value),'LV4 appended row container drift');
 const index=value.indexOf(matches[0]);assert.ok(index>=0,'LV4 appended row container drift');
 if(!partial){assert.equal(index,addition.index,'LV4 appended row position drift');assert.equal(value.length,addition.index+1,'LV4 appended row count drift');}
 assert.deepEqual(matches[0],addition.row,'LV4 appended row drift');value.splice(index,1);
}
/** Authenticate and reverse this content-only successor for immutable older-release tests. */
export function beforeLV4PublishedText(path:string,text:string):string{
 return beforeLV4LaterUnitsText(path,text,0);
}
/** Reverse only authenticated successor units; released manifests stay immutable. */
const projections=new BoundedTextCache();
export function beforeLV4LaterUnitsText(path:string,text:string,unit:number):string{
 // Authenticate proofs and hash the entire current input on EVERY call, including hits.
 authenticate();
 if(!Number.isFinite(unit))return projectUncached(path,text,unit);
 const inputHash=hash(text);const key=JSON.stringify([path,unit,layers.map(layer=>layer.pin),inputHash]);
 const cached=projections.get(key);if(cached!==undefined)return cached;
 const result=projectUncached(path,text,unit,inputHash);projections.set(key,result);return result;
}
function projectUncached(path:string,text:string,unit:number,inputHash?:string):string{
 const chain=layers.flatMap(layer=>{
  const spec=(layer.manifest.files as Record<string,File>)[path];
  return spec?[{unit:layer.unit,spec}]:[];
 });
 const boundary=chain.findIndex(layer=>layer.unit<=unit);
 const stop=boundary<0?chain.length:boundary;if(stop===0)return text;
 // Authenticated before/after links prove every intermediate serialization.
 // The complete input and final restored file are still hashed, and each field is checked.
 for(let i=0;i<chain.length-1;i++)assert.equal(chain[i].spec.beforeHash,chain[i+1].spec.afterHash,'LV4 proof chain drift');
 const fingerprint=inputHash??hash(text);let start=chain.findIndex(layer=>layer.spec.afterHash===fingerprint);
 if(start<0){
  assert.ok(chain.length&&chain[chain.length-1].spec.beforeHash===fingerprint,'LV4 U01 complete file drift');
  start=chain.length;
 }
 if(start>=stop)return text;
 let value=JSON.parse(text) as Row;
 for(const {spec}of chain.slice(start,stop)){
  for(const addition of [...(spec.appendedRows??[])].reverse())reverseAppended(addition.dataset?value[addition.dataset]:value,addition);
  for(const op of [...spec.operations].reverse())reverse(op.dataset?value[op.dataset]:value,op);
  if(spec.beforeMeta){if(path.endsWith('sa-pack.json'))value.meta=structuredClone(spec.beforeMeta);else value=structuredClone(spec.beforeMeta) as Row;}
 }
 const last=chain[stop-1].spec;const restored=JSON.stringify(value,null,last.indent??undefined)+'\n';
 assert.equal(hash(restored),last.beforeHash,'LV4 U01 historical file drift');return restored;
}
export function beforeLV4Published<T>(path:string,value:T):T{
 const spec=layers.map(layer=>(layer.manifest.files as Record<string,File>)[path]).find(Boolean);return spec?JSON.parse(beforeLV4PublishedText(path,JSON.stringify(value,null,spec.indent??undefined)+'\n')) as T:value;
}
export function beforeLV4Rows<T>(dataset:string,value:T):T{
 const path='public/data/v1/'+dataset+'.json';if(!hasLV4PublishedFile(path))return value;
 authenticate();const copy=structuredClone(value);
 for(const layer of layers){const spec=(layer.manifest.files as Record<string,File>)[path];
  if(spec){
   for(const addition of [...(spec.appendedRows??[])].reverse())reverseAppended(copy,addition,true);
   for(const op of [...spec.operations].reverse())reverse(copy,op,true);
  }
 }return copy;
}

export function beforeLV4ResolverSource(path:string,text:string):string{
 if(path!==resolver.path)return text;
 assert.equal(hash(JSON.stringify(resolver)),'19932e4b4c2ae4da239d710001bb15b8fb06652ff33fa91b61b5f7b0490af3b9','LV4 U01 resolver proof drift');
 if(hash(text)===resolver.beforeLfSha256)return text;
 assert.equal(hash(text),resolver.afterLfSha256,'LV4 U01 resolver source drift');
 assert.equal(text,resolver.afterText,'LV4 U01 resolver bytes drift');
 assert.equal(hash(resolver.beforeText),resolver.beforeLfSha256,'LV4 U01 resolver historical bytes drift');
 return resolver.beforeText;
}
