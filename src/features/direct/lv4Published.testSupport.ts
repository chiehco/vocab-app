import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import manifest from '../../../docs/lv4-releases-20261122/U01.json';
import resolver from '../../../docs/lv4-releases-20261122/resolver-U01.json';
type Row=Record<string,unknown>;
type Operation={dataset?:string;selector:Row;field:string;before?:unknown;beforePresent?:boolean;after:unknown};
type File={beforeHash:string;afterHash:string;operations:Operation[];beforeMeta?:unknown;indent:number|null};
const files=manifest.files as Record<string,File>;
export const hasLV4PublishedFile=(path:string)=>Object.hasOwn(files,path);
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
function authenticate(){assert.equal(hash(JSON.stringify(manifest)),'b3e64bec21ee412d7ccaa468b5036a548bfc8ac9b562781b4a59335a6bc79818','LV4 U01 manifest drift');}
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
/** Authenticate and reverse this content-only successor for immutable older-release tests. */
export function beforeLV4PublishedText(path:string,text:string):string{
 const spec=files[path];if(!spec)return text;authenticate();
 // An already authenticated earlier layer may be supplied by an outer projection.
 if(hash(text)===spec.beforeHash)return text;
 assert.equal(hash(text),spec.afterHash,'LV4 U01 complete file drift');
 let value=JSON.parse(text) as Row;
 for(const op of [...spec.operations].reverse())reverse(op.dataset?value[op.dataset]:value,op);
 if(spec.beforeMeta){if(path.endsWith('sa-pack.json'))value.meta=spec.beforeMeta;else value=spec.beforeMeta as Row;}
 const restored=JSON.stringify(value,null,spec.indent??undefined)+'\n';
 assert.equal(hash(restored),spec.beforeHash,'LV4 U01 historical file drift');return restored;
}
export function beforeLV4Published<T>(path:string,value:T):T{
 const spec=files[path];return spec?JSON.parse(beforeLV4PublishedText(path,JSON.stringify(value,null,spec.indent??undefined)+'\n')) as T:value;
}
export function beforeLV4Rows<T>(dataset:string,value:T):T{
 const path='public/data/v1/'+dataset+'.json';const spec=files[path];if(!spec)return value;
 authenticate();const copy=structuredClone(value);
 for(const op of [...spec.operations].reverse())reverse(copy,op,true);return copy;
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
