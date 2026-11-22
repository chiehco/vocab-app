/** Keep the frozen algorithm and its target guards on the pre-U03 input. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isDeepStrictEqual} from 'node:util';
import * as frozen from './lv3Audit.preBatch.testSupport';
import {beforeU03StarterText} from './lv3U03Starter.testSupport';
import {hasLV4PublishedFile,beforeLV4PublishedText,beforeLV4Rows} from './lv4Published.testSupport';
export * from './lv3Audit.preBatch.testSupport';

const packPath='public/data/v1/sa-pack.json';
export function lv3AfterUnitFile<T>(afterUnit:string,path:string,value:T):T {
  if(path!==packPath){
    if(!hasLV4PublishedFile(path))return frozen.lv3AfterUnitFile(afterUnit,path,value);
    const raw=readFileSync(path,'utf8').replace(/\r\n/g,'\n');
    assert.ok(isDeepStrictEqual(value,JSON.parse(raw)),'unknown whole-file strict semantic drift');
    return JSON.parse(frozen.lv3AfterUnitPublishedText(afterUnit,path,beforeLV4PublishedText(path,raw))) as T;
  }
  const raw=readFileSync(path,'utf8').replace(/\r\n/g,'\n');
  const current=JSON.parse(raw);
  assert.ok(isDeepStrictEqual(value,current),'unknown whole-file strict semantic drift');
  // The frozen public projection authenticates all supplementary source files,
  // the complete chain and the target checkpoint before returning the old pack.
  return JSON.parse(frozen.lv3AfterUnitPublishedText(afterUnit,path,beforeU03StarterText(raw))) as T;
}

export function lv3AfterUnitPublishedText(afterUnit:string,path:string,text:string):string {
  return frozen.lv3AfterUnitPublishedText(afterUnit,path,path===packPath?beforeU03StarterText(text):beforeLV4PublishedText(path,text));
}

export function lv3BeforeAudit<T>(dataset:string,value:T,options:{allowMissing?:boolean}={}):T {
  return frozen.lv3BeforeAudit(dataset,beforeLV4Rows(dataset,value),options);
}
