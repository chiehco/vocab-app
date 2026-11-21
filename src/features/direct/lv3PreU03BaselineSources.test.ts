import {afterEach,expect,it,vi} from 'vitest';

const drift=vi.hoisted(()=>({path:''}));
vi.mock('node:fs',async importOriginal=>{
  const actual=await importOriginal<typeof import('node:fs')>();
  return {...actual,readFileSync:(...args:Parameters<typeof actual.readFileSync>)=>{
    const value=Reflect.apply(actual.readFileSync,actual,args) as string|Buffer;
    const path=String(args[0]).replace(/\\/g,'/');
    if(drift.path&&path.endsWith('/'+drift.path))return typeof value==='string'?value+' ':Buffer.concat([value,Buffer.from(' ')]);
    return value;
  }};
});

import {readFileSync} from 'node:fs';
import {lv3AfterUnitFile} from './lv3PreU03Baseline.testSupport';
const packPath='public/data/v1/sa-pack.json';
const pack=JSON.parse(readFileSync(packPath,'utf8'));
afterEach(()=>{drift.path='';});

it.each([18,19,20])('retains the frozen reference current-source guard for U%s',unit=>{
  drift.path=`scripts/sources/LV3Unit${unit}.json`;
  expect(()=>lv3AfterUnitFile('LV3-U06',packPath,pack)).toThrow(`U${unit} source current checkpoint drift`);
});
