import {beforeLV2PrideImageSource} from './lv2PrideImageSource.testSupport';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import proof from '../../../docs/lv3-audit-20261107/U16-example-images-resolver-integration.json';
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
export function validateU16ImageSourceProof(value:unknown=proof){assert.equal(hash(JSON.stringify(value)), 'cd0ea9919b48190bd2fdf098324e6597c4734f64ccf598dd4a61e259b04ba0a1', 'Immutable U16 source proof drift');}
export function beforeU16ExampleImageSource(path:string,value:string){validateU16ImageSourceProof();const n=beforeLV2PrideImageSource(path,value);const r=proof.files.find(f=>f.path===path);if(!r)return n;assert.equal(hash(n),r.afterLfSha256,'Unrecorded U16 source drift');assert.equal(n,r.afterText,'Unrecorded U16 source bytes');assert.equal(hash(r.beforeText),r.beforeLfSha256,'Historical U16 source proof drift');return r.beforeText;}

