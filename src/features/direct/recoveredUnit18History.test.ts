import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {expect,it} from 'vitest';
import {recoveredUnit18OriginalItems} from './recoveredUnit18History.testSupport';
import {lv3AfterUnitPublishedText} from './lv3Audit.testSupport';
import {findUnit} from './model';
import historical from '../../../scripts/drafts/recovered-units/LV3Unit18.curriculum.json';

const path='src/features/direct/curriculumLV3Unit18.json';
const readCurrent=()=>readFileSync(new URL('./curriculumLV3Unit18.json',import.meta.url),'utf8');
it('restores the authenticated complete U18 historical draft without changing installed items',()=>{
 const items=findUnit(18,'LV3')!.items;
 const snapshot=structuredClone(items);
 const text=readCurrent();
 expect(items).toEqual(JSON.parse(text).learningItems);
 expect(recoveredUnit18OriginalItems(items)).toEqual(historical.learningItems);
 expect(items).toEqual(snapshot);
 expect(createHash('sha256').update(lv3AfterUnitPublishedText('LV3-U17',path,text)).digest('hex'))
  .toBe('b2f53a9db6ea2e6521a89f0f07fcbd0cf9f6530b52ed4e430962c54585296833');
});
it('rejects changed, missing, reordered and extra caller rows before any historical projection',()=>{
 const items=findUnit(18,'LV3')!.items;
 const changed=structuredClone(items);changed[0].targetMeaningZh='unrecorded';
 for(const caller of [changed,items.slice(1),[...items].reverse(),[...items,items[0]]])
  expect(()=>recoveredUnit18OriginalItems(caller)).toThrow(/Installed U18 items differ/);
});
it('rejects unknown current U18 bytes, root fields, and unrecorded item content',()=>{
 const text=readCurrent();
 expect(()=>lv3AfterUnitPublishedText('LV3-U17',path,text+' ')).toThrow();
 expect(()=>lv3AfterUnitPublishedText('LV3-U17',path,JSON.stringify({...JSON.parse(text),unrecorded:true})+'\n')).toThrow();
 const changed=JSON.parse(text);changed.learningItems[0].targetMeaningZh='unrecorded';
 expect(()=>lv3AfterUnitPublishedText('LV3-U17',path,JSON.stringify(changed,null,2)+'\n')).toThrow();
});
