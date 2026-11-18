import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import proof from '../../../docs/lv3-audit-20261107/U16-example-images-resolver-integration.json';
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
export function validateU16ImageSourceProof(value:unknown=proof){assert.equal(hash(JSON.stringify(value)), 'cd0ea9919b48190bd2fdf098324e6597c4734f64ccf598dd4a61e259b04ba0a1', 'Immutable U16 source proof drift');}
// The next verified registry revision adds the one U20 approval after U16.
const U20_REGISTRY_SHA256='ee4fb308f355c6ae094a6c4901b896a47a4a167616ca4ac8a038607a9de913d9';
export function beforeU16ExampleImageSource(path:string,value:string){
 validateU16ImageSourceProof();
 const text=value.replace(/\r\n/g,'\n');
 const entry=proof.files.find(file=>file.path===path);
 if(!entry)return text;
 const previous=path==='src/features/vocabulary/approvedCurriculum.ts'&&hash(text)===U20_REGISTRY_SHA256
  ? entry.afterText : text;
 assert.equal(hash(previous),entry.afterLfSha256,'Unrecorded U16 source drift');
 assert.equal(previous,entry.afterText,'Unrecorded U16 source bytes');
 assert.equal(hash(entry.beforeText),entry.beforeLfSha256,'Historical U16 source proof drift');
 return entry.beforeText;
}
