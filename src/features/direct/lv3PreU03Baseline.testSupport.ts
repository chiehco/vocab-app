/** Keep the frozen algorithm and its target guards on the pre-U03 input. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import * as frozen from './lv3Audit.preBatch.testSupport';
import {beforeU03StarterText} from './lv3U03Starter.testSupport';
export * from './lv3Audit.preBatch.testSupport';

const packPath='public/data/v1/sa-pack.json';
export function lv3AfterUnitFile<T>(afterUnit:string,path:string,value:T):T {
  if(path!==packPath)return frozen.lv3AfterUnitFile(afterUnit,path,value);
  const raw=readFileSync(path,'utf8').replace(/\r\n/g,'\n');
  const current=JSON.parse(raw);
  assert.ok(isDeepStrictEqual(value,current),'unknown whole-file strict semantic drift');
  const previous=JSON.parse(beforeU03StarterText(raw)) as T;
  const chain=frozen.loadLV3Chain().filter(step=>step.entry.status==='committed');
  const positions=chain.flatMap((step,index)=>step.entry.unit===afterUnit?[index]:[]);
  assert.equal(positions.length,1,'unknown frozen reference checkpoint');
  const checkpoint=chain[positions[0]];
  assert.ok(frozen.isAuditUnitStep(checkpoint));
  const expected=checkpoint.manifest.derivedAfter?.[path];
  assert.equal(typeof expected,'string','missing frozen reference target guard');
  const result=frozen.reverseFileAuditSteps(chain.slice(positions[0]+1),path,previous);
  assert.equal(createHash('sha256').update(JSON.stringify(result)+'\n').digest('hex'),expected,'frozen reference target drift');
  return result;
}

export function lv3AfterUnitPublishedText(afterUnit:string,path:string,text:string):string {
  return frozen.lv3AfterUnitPublishedText(afterUnit,path,path===packPath?beforeU03StarterText(text):text);
}
