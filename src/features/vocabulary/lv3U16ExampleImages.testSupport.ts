import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import proof from '../../../docs/lv3-audit-20261107/U16-example-images-resolver-integration.json';
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
export function validateU16ImageSourceProof(value:unknown=proof){assert.equal(hash(JSON.stringify(value)), 'cd0ea9919b48190bd2fdf098324e6597c4734f64ccf598dd4a61e259b04ba0a1', 'Immutable U16 source proof drift');}
// The next verified registry revision adds the one U20 approval after U16.
const U20_REGISTRY_SHA256='ee4fb308f355c6ae094a6c4901b896a47a4a167616ca4ac8a038607a9de913d9';
const U21_REGISTRY_SHA256='a4bfe2253e9de1365f8c80e041b9c51eb2fd904531f73cf17934b709c625b2d0';
const U22_REGISTRY_SHA256='ddfde30a7f491776bd88a49b0b3a6f7796afa2f8efa1d6037555ad496e694a69';
const U23_REGISTRY_SHA256='69d46b5feedaf6eb6460a0f765d3733aced81d26cfef270217fb93733fc5c519';
export function beforeU16ExampleImageSource(path:string,value:string){
 validateU16ImageSourceProof();
 const text=value.replace(/\r\n/g,'\n');
 // Strip only the authenticated U21 publication plugin when tracing the older Vite checkpoint.
 if(path==='vite.config.ts' && hash(text)==='0514687015efa279bacfeec303e7d1dd639e0daea70f1a7b55f4ec2bba3665ea'){
  return text.replace("import { publishReviewedDictionary } from './scripts/publishReviewedDictionary.ts';\n",'')
    .replace('    publishReviewedDictionary(),\n','');
 }
 const entry=proof.files.find(file=>file.path===path);
 if(!entry)return text;
 const previous=path==='src/features/vocabulary/approvedCurriculum.ts'&&[U20_REGISTRY_SHA256,U21_REGISTRY_SHA256,U22_REGISTRY_SHA256,U23_REGISTRY_SHA256].includes(hash(text))
  ? entry.afterText : text;
 assert.equal(hash(previous),entry.afterLfSha256,'Unrecorded U16 source drift');
 assert.equal(previous,entry.afterText,'Unrecorded U16 source bytes');
 assert.equal(hash(entry.beforeText),entry.beforeLfSha256,'Historical U16 source proof drift');
 return entry.beforeText;
}
