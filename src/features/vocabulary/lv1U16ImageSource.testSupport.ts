import {beforeLatestU20Source} from './u20LatestImageSource.testSupport';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import proof from '../../../docs/lv1-u16-image-candidates-20261117/resolver-proof.json';
const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
export function validateLV1U16SourceProof(value:unknown=proof){assert.equal(hash(JSON.stringify(value)), '0eaecc76cd8e8ec83d7669cbd464e7a1bac103aa519ad3f8e5d9db80ad9147d5', 'Immutable LV1 U16 source proof drift');}
export function beforeLV1U16ImageSource(path:string,value:string){
 validateLV1U16SourceProof();
 const normalized=beforeLatestU20Source(path,value);
 const row=proof.files.find(file=>file.path===path);
 if(!row)return normalized;
 assert.equal(hash(normalized),row.afterLfSha256,'Unrecorded LV1 U16 source drift');
 assert.equal(normalized,row.afterText,'Unrecorded LV1 U16 source bytes');
 assert.equal(hash(row.beforeText),row.beforeLfSha256,'Historical LV1 U16 source proof drift');
 return row.beforeText;
}
