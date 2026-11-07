import {beforeU07RegistryText} from './lv3U07ImageCaptionRepair.testSupport';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {beforeLV3PuppetText} from '../../../scripts/lv3_puppet_image_guard.mjs';
import proof from '../../../docs/unit-audit-20261105/LV3-puppet-image-repair.json';
export function beforePuppetText(text:string):string{return beforeLV3PuppetText(beforeU07RegistryText(text),proof);}
export function beforePuppetImages<T>(rows:readonly T[]):T[]{
 const text=readFileSync(proof.registryPath,'utf8');
 const before=beforePuppetText(text);
 assert.deepEqual(rows,JSON.parse(text),'Imported registry differs from verified disk bytes');
 return JSON.parse(before) as T[];
}
