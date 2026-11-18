import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import proof from '../../../docs/u16-latest-integration-20261119/u20-addition-proof.json';
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
export function validateLatestU20Proof(value:unknown=proof){
 assert.equal(hash(JSON.stringify(value)), 'bab5a1b6e9283a718671cf249ca6c14654f683263ce94f35d9e56c802fd0f56d', 'Immutable U20 integration proof drift');
}
export function beforeLatestU20Source(path:string,value:string){
 validateLatestU20Proof();
 const text=value.replace(/\r\n/g,'\n');
 if(path!==proof.path)return text;
 assert.equal(hash(text),proof.afterSha256,'Unrecorded U20 integration source drift');
 assert.equal(text,proof.afterText,'Unrecorded U20 integration source bytes');
 assert.equal(hash(proof.beforeText),proof.beforeSha256,'Historical U20 integration source drift');
 return proof.beforeText;
}
