import nextTail from '../../../docs/lv4-releases-20261125/U21-U24-next-tail-approved.json';
import nextSecond from '../../../docs/lv4-releases-20261125/U11-U16-next-second-approved.json';
import nextMorning from '../../../docs/lv4-releases-20261125/U01-U10-next-morning-approved.json';
import tail from '../../../docs/lv4-releases-20261125/U21-U24-tail-approved.json';
import revisions from '../../../docs/lv4-releases-20261125/U13-U16-approved-revisions.json';
import second from '../../../docs/lv4-releases-20261125/U10-U16-second-approved.json';
import morning from '../../../docs/lv4-releases-20261125/U01-U10-morning-approved.json';
import nextPairs from '../../../docs/lv4-releases-20261125/U01-next-pairs.json';
import supplement from '../../../docs/lv4-releases-20261124/U01-pairs.json';
import unit24 from '../../../docs/lv4-releases-20261122/U24.json';
import unit23 from '../../../docs/lv4-releases-20261122/U23.json';
import unit22 from '../../../docs/lv4-releases-20261122/U22.json';
import unit21 from '../../../docs/lv4-releases-20261122/U21.json';
import unit20 from '../../../docs/lv4-releases-20261122/U20.json';
import unit19 from '../../../docs/lv4-releases-20261122/U19.json';
import unit18 from '../../../docs/lv4-releases-20261122/U18.json';
import unit17 from '../../../docs/lv4-releases-20261122/U17.json';
import unit16 from '../../../docs/lv4-releases-20261122/U16.json';
import unit15 from '../../../docs/lv4-releases-20261122/U15.json';
import unit14 from '../../../docs/lv4-releases-20261122/U14.json';
import unit13 from '../../../docs/lv4-releases-20261122/U13.json';
import unit12 from '../../../docs/lv4-releases-20261122/U12.json';
import unit11 from '../../../docs/lv4-releases-20261122/U11.json';
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
const layers=[{unit:24,manifest:unit24,pin:'1508417eea545ea0a5f6e2f492abfc20f7e0ab327a304fa7de77b56e377956c7'},{unit:23,manifest:unit23,pin:'02cbb6847a98757f5742468decc0e6e0aa2aa7413b24b6f034970405909d5761'},{unit:22,manifest:unit22,pin:'80ee2cd905a1ac1b2733279df574a8545505685532782122e943982a8a008b6c'},{unit:21,manifest:unit21,pin:'740d7504eba2e353169e7a7212e22e355b8dac3e7782d69e4c08ea92505fc771'},{unit:20,manifest:unit20,pin:'42469b26df121686cdb03d4fdc6146b59e638c786d350fc24cd2c40a4fee8fa4'},{unit:19,manifest:unit19,pin:'d6121349e6f709e9671edd181e42514666cb4df5959e237ba05d43333b15840e'},{unit:18,manifest:unit18,pin:'c4bba42b398df530d6ec2077cba459e751e3bbff66495ca2889df944bcbd7196'},{unit:17,manifest:unit17,pin:'c95e1b9b4b932ae2a8d5084d885bff8e4a86279407415955bf10fa6dab82b70a'},{unit:16,manifest:unit16,pin:'6ce7f6ff0ba7386d61ff01805482245a552cd6f61c9127afdd8f7ccc17ea8737'},{unit:15,manifest:unit15,pin:'a42d90502af08ae33ef05085c3eddec8b82f7ac582471a6ca80d503f2707037d'},{unit:14,manifest:unit14,pin:'d5f1cca20ebd526fd41b15d9487fcf903b9868c506897f4e1ec26096bec25d1c'},{unit:13,manifest:unit13,pin:'4bc19a907fdb094b861b0060765e4759efa321ddd24875ea70635a5a6c1abef0'},{unit:12,manifest:unit12,pin:'d79a38e9a052c763747324a20d03495258a99ae70b3ea0c98032635b869d9e07'},{unit:11,manifest:unit11,pin:'879c32c99dbeff85d6b981c59d2e0f9624519388a7726202c0aa996bfae357f6'},{unit:10,manifest:unit10,pin:'6f0725434710316fc04d096264d5c3ee190a8edb30a70d9744add3889c56860d'},{unit:9,manifest:unit09,pin:'28d43fed408c84d9be5c7fb2ba6be0cb1f351f75b39e02501ccd9d838daa3798'},{unit:8,manifest:unit08,pin:'612916bfcd2aa09210efbb4fe622398d6d0594698b8c7fca1bb4e06183bd8b2f'},{unit:7,manifest:unit07,pin:'88d95b15bc194ad6bd13a9f26c34ae6ff803359bb68949aedf953725fb5fb316'},{unit:6,manifest:unit06,pin:'822e943e2d5b0fe0e40894da457f7b75f1942f75e01a8ca528a3779d6b4c305a'},{unit:5,manifest:unit05,pin:'6712a246587467b27b9c6c5be12d968693f92a67e6444d4254de090519746427'},{unit:4,manifest:unit04,pin:'5de47824a3c85ed89ae7ffe4d67ba875f0678c54c79f2e12c2fd430a57e5bff4'},{unit:3,manifest:unit03,pin:'3b8067666a74a1fb0338b9a04bc6c125e563eddc5d5906914b4e216ccd2c70bc'},{unit:2.5,manifest:assure,pin:'9454367917fc875b4ed6d32113d052c92c38a7763831c1ac1d080a7752990df5'},
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
function matchingFor(operations:Operation[]){
 // Index only keys that stay immutable throughout this inverse step. Rebuild
 // after each step/append removal, and retain recursive selection for structural
 // replacements. Indexes are local to this call, never a global data cache.
 const mutated=new Set(operations.flatMap(op=>op.field.split('.')));
 const containsRecord=(value:unknown):boolean=>Array.isArray(value)?value.some(containsRecord):value!==null&&typeof value==='object';
 const structural=operations.some(op=>containsRecord(op.before)||containsRecord(op.after));
 const roots=new WeakMap<object,{rows:Row[];keys:Map<string,Map<unknown,Row[]>>}>();
 return (value:unknown,selector:Row):Row[]=>{
  const entries=Object.entries(selector),primary=entries.find(([key])=>!mutated.has(key));
  if(structural||!primary||!value||typeof value!=='object')return find(value,selector);
  let root=roots.get(value);
  if(!root){
   const rows:Row[]=[];
   const visit=(item:unknown):void=>{
    if(Array.isArray(item)){for(const child of item)visit(child);}
    else if(item&&typeof item==='object'){rows.push(item as Row);for(const child of Object.values(item))visit(child);}
   };
   visit(value);root={rows,keys:new Map()};roots.set(value,root);
  }
  const [key,wanted]=primary;let index=root.keys.get(key);
  if(!index){
   index=new Map();
   for(const row of root.rows){const id=row[key],matches=index.get(id);if(matches)matches.push(row);else index.set(id,[row]);}
   root.keys.set(key,index);
  }
  // Recheck every selector field against the live row. Preserve duplicate
  // occurrences and strict equality, including NaN/undefined edge cases.
  return (index.get(wanted)??[]).filter(row=>entries.every(([k,v])=>row[k]===v));
 };
}
function reverse(value:unknown,operation:Operation,partial=false,matching=find){
 const rows=matching(value,operation.selector);if(partial&&!rows.length)return;
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
  const matching=matchingFor(spec.operations);
  for(const op of [...spec.operations].reverse())reverse(op.dataset?value[op.dataset]:value,op,false,matching);
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
   const matching=matchingFor(spec.operations);
   for(const op of [...spec.operations].reverse())reverse(copy,op,true,matching);
  }
 }return copy;
}

export function beforeNextTailResolverSource(path:string,text:string):string{
 if(path!==nextTail.path)return text;
 assert.equal(hash(JSON.stringify(nextTail)),'2e42759be46ce69c3017a3f4317cbdb74e88e10dce8df1ee887812cadd6be78a','LV4 next tail proof drift');
 if(hash(text)!==nextTail.afterLfSha256)return text;
 assert.equal(text,nextTail.afterText,'LV4 next tail resolver bytes drift');
 assert.equal(text.split(nextTail.importLine).length,2,'LV4 next tail import drift');
 assert.equal(text.split(nextTail.afterSpread).length,2,'LV4 next tail spread drift');
 const previous=text.replace(nextTail.importLine,'').replace(nextTail.afterSpread,nextTail.beforeSpread);
 assert.equal(hash(previous),nextTail.beforeLfSha256,'LV4 next tail exact prior resolver drift');
 assert.equal(previous,nextTail.beforeText,'LV4 next tail prior bytes drift');
 return previous;
}

export function beforeNextSecondResolverSource(path:string,text:string):string{
 text=beforeNextTailResolverSource(path,text);
 if(path!==nextSecond.path)return text;
 assert.equal(hash(JSON.stringify(nextSecond)),'47c3abe97acb87d0c1c4caf21675ad555c8273b6d0376802b2611346acdb788e','LV4 next morning proof drift');
 if(hash(text)!==nextSecond.afterLfSha256)return text;
 assert.equal(text,nextSecond.afterText,'LV4 next morning resolver bytes drift');
 assert.equal(text.split(nextSecond.importLine).length,2,'LV4 next morning import drift');
 assert.equal(text.split(nextSecond.afterSpread).length,2,'LV4 next morning spread drift');
 const previous=text.replace(nextSecond.importLine,'').replace(nextSecond.afterSpread,nextSecond.beforeSpread);
 assert.equal(hash(previous),nextSecond.beforeLfSha256,'LV4 next morning exact prior resolver drift');
 assert.equal(previous,nextSecond.beforeText,'LV4 next morning prior bytes drift');
 return previous;
}

export function beforeNextMorningResolverSource(path:string,text:string):string{
 text=beforeNextSecondResolverSource(path,text);
 if(path!==nextMorning.path)return text;
 assert.equal(hash(JSON.stringify(nextMorning)),'081017d7d072ef22550b96e37268d144e50e9ddb1e40f4f0d5208cde5937701b','LV4 next morning proof drift');
 if(hash(text)!==nextMorning.afterLfSha256)return text;
 assert.equal(text,nextMorning.afterText,'LV4 next morning resolver bytes drift');
 assert.equal(text.split(nextMorning.importLine).length,2,'LV4 next morning import drift');
 assert.equal(text.split(nextMorning.afterSpread).length,2,'LV4 next morning spread drift');
 const previous=text.replace(nextMorning.importLine,'').replace(nextMorning.afterSpread,nextMorning.beforeSpread);
 assert.equal(hash(previous),nextMorning.beforeLfSha256,'LV4 next morning exact prior resolver drift');
 assert.equal(previous,nextMorning.beforeText,'LV4 next morning prior bytes drift');
 return previous;
}

export function beforeTailResolverSource(path:string,text:string):string{
 text=beforeNextMorningResolverSource(path,text);
 if(path!==tail.path)return text;
 assert.equal(hash(JSON.stringify(tail)),'caf7348307c25c6e4356b4402402e8e77ccb0b6c8ca4aa70acfe8c34953c1297','LV4 tail proof drift');
 if(hash(text)!==tail.afterLfSha256)return text;
 assert.equal(text,tail.afterText,'LV4 tail resolver bytes drift');
 assert.equal(text.split(tail.importLine).length,2,'LV4 tail import drift');
 assert.equal(text.split(tail.afterSpread).length,2,'LV4 tail spread drift');
 const previous=text.replace(tail.importLine,'').replace(tail.afterSpread,tail.beforeSpread);
 assert.equal(hash(previous),tail.beforeLfSha256,'LV4 tail exact prior resolver drift');
 assert.equal(previous,tail.beforeText,'LV4 tail prior bytes drift');
 return previous;
}

export function beforeSecondRevisedResolverSource(path:string,text:string):string{
 text=beforeTailResolverSource(path,text);
 if(path!==revisions.path)return text;
 assert.equal(hash(JSON.stringify(revisions)),'5a2f9094a146f6643389aae46fd4bcce69cbc70ed6239bd5458e9a1b079f281a','LV4 approved revisions proof drift');
 if(hash(text)!==revisions.afterLfSha256)return text;
 assert.equal(text,revisions.afterText,'LV4 approved revisions resolver bytes drift');
 assert.equal(text.split(revisions.importLine).length,2,'LV4 approved revisions import drift');
 assert.equal(text.split(revisions.afterSpread).length,2,'LV4 approved revisions spread drift');
 const previous=text.replace(revisions.importLine,'').replace(revisions.afterSpread,revisions.beforeSpread);
 assert.equal(hash(previous),revisions.beforeLfSha256,'LV4 approved revisions exact prior resolver drift');
 assert.equal(previous,revisions.beforeText,'LV4 approved revisions prior bytes drift');
 return previous;
}

export function beforeSecondResolverSource(path:string,text:string):string{
 text=beforeSecondRevisedResolverSource(path,text);
 if(path!==second.path)return text;
 assert.equal(hash(JSON.stringify(second)),'93962da8f458260e47290dae5de136c0156c6ac6c808d69829e80fd9272e2eb7','LV4 second proof drift');
 if(hash(text)!==second.afterLfSha256)return text;
 assert.equal(text,second.afterText,'LV4 second resolver bytes drift');
 assert.equal(text.split(second.importLine).length,2,'LV4 second import drift');
 assert.equal(text.split(second.afterSpread).length,2,'LV4 second spread drift');
 const previous=text.replace(second.importLine,'').replace(second.afterSpread,second.beforeSpread);
 assert.equal(hash(previous),second.beforeLfSha256,'LV4 second exact prior resolver drift');
 assert.equal(previous,second.beforeText,'LV4 second prior bytes drift');
 return previous;
}

export function beforeMorningResolverSource(path:string,text:string):string{
 text=beforeSecondResolverSource(path,text);
 if(path!==morning.path)return text;
 assert.equal(hash(JSON.stringify(morning)),'f90e9b9b3f8120a8d9a6e5cdb57363250ac538485c0543ee3be02b17c6df48ee','LV4 morning proof drift');
 if(hash(text)!==morning.afterLfSha256)return text;
 assert.equal(text,morning.afterText,'LV4 morning resolver bytes drift');
 assert.equal(text.split(morning.importLine).length,2,'LV4 morning import drift');
 assert.equal(text.split(morning.afterSpread).length,2,'LV4 morning spread drift');
 const previous=text.replace(morning.importLine,'').replace(morning.afterSpread,morning.beforeSpread);
 assert.equal(hash(previous),morning.beforeLfSha256,'LV4 morning exact d8 resolver drift');
 assert.equal(previous,morning.beforeText,'LV4 morning exact d8 bytes drift');
 return previous;
}

export function beforeLV4ResolverSource(path:string,text:string):string{
 if(path!==resolver.path)return text;
 text=beforeMorningResolverSource(path,text);
 assert.equal(hash(JSON.stringify(nextPairs)),'ce99171cd9aac1af92b894d3f852e501e9957f1240e60206adcb2302656b33d7','LV4 U01 next-pair proof drift');
 if(hash(text)===nextPairs.afterLfSha256){
  assert.equal(text.split(nextPairs.importLine).length,2,'LV4 next-pair import drift');
  assert.equal(text.split(nextPairs.afterSpread).length,2,'LV4 next-pair spread drift');
  text=text.replace(nextPairs.importLine,'').replace(nextPairs.afterSpread,nextPairs.beforeSpread);
  assert.equal(hash(text),nextPairs.beforeLfSha256,'LV4 next-pair exact35 resolver drift');
  assert.equal(text,nextPairs.beforeText,'LV4 next-pair exact35 bytes drift');
 }
 assert.equal(hash(JSON.stringify(supplement)),'30a9efdb7911f8392b8345a10aa8de6b3aff915a1012a20899ba75e09fdeb683','LV4 U01 supplement proof drift');
 if(hash(text)===supplement.afterLfSha256){
  assert.equal(text.split(supplement.importLine).length,2,'LV4 supplement import drift');
  assert.equal(text.split(supplement.afterSpread).length,2,'LV4 supplement spread drift');
  text=text.replace(supplement.importLine,'').replace(supplement.afterSpread,supplement.beforeSpread);
  assert.equal(hash(text),supplement.beforeLfSha256,'LV4 supplement historical resolver drift');
 }
 assert.equal(hash(JSON.stringify(resolver)),'19932e4b4c2ae4da239d710001bb15b8fb06652ff33fa91b61b5f7b0490af3b9','LV4 U01 resolver proof drift');
 if(hash(text)===resolver.beforeLfSha256)return text;
 assert.equal(hash(text),resolver.afterLfSha256,'LV4 U01 resolver source drift');
 assert.equal(text,resolver.afterText,'LV4 U01 resolver bytes drift');
 assert.equal(hash(resolver.beforeText),resolver.beforeLfSha256,'LV4 U01 resolver historical bytes drift');
 return resolver.beforeText;
}
