import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import proof from '../../../docs/lv2-image-candidates-20261117/pride-resolver-proof.json';
const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
export function validateLV2PrideSourceProof(value:unknown=proof){assert.equal(hash(JSON.stringify(value)), 'f90fa6b083222e089e2364246c896a7aef985225020387183e6d574a2e81bacf', 'Immutable LV2 pride source proof drift');}
export function beforeLV2PrideImageSource(path:string,value:string){
 validateLV2PrideSourceProof();
 const normalized=value.replace(/\r\n/g,'\n');
 const row=proof.files.find(file=>file.path===path);
 if(!row)return normalized;
 assert.equal(hash(normalized),row.afterLfSha256,'Unrecorded LV2 pride source drift');
 assert.equal(normalized,row.afterText,'Unrecorded LV2 pride source bytes');
 assert.equal(hash(row.beforeText),row.beforeLfSha256,'Historical LV2 pride source proof drift');
 return row.beforeText;
}
