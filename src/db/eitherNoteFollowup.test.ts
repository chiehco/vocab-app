import {readFileSync} from 'node:fs';
import {expect,it} from 'vitest';
import patch from '../../docs/unit-audit-20261105/LV1-U10-either-note-followup.json';
import lv2Patch from '../../docs/unit-audit-20261105/LV2-U32-notes-patches.json';
import {beforeUnitAudit,restoreRecordedAuditPatch} from './unitAudit.testSupport';

const read=(file:string)=>JSON.parse(readFileSync(`public/data/v1/${file}.json`,'utf8'));
const change=patch.patches[0];

it('publishes the same precise formal/informal rule in full and starter notes',()=>{
  const expected={...change.before,content:'either 單獨作主詞時接單數動詞；either of + 複數名詞／代名詞作主詞時，正式寫作採單數動詞，較口語的用法也可採複數動詞。'};
  for(const notes of [read('notes'),read('sa-pack').notes]){
    expect(notes.filter((row:{noteId:string})=>row.noteId===change.id)).toEqual([expected]);
    expect(beforeUnitAudit('notes',notes).find((row:{noteId:string})=>row.noteId===change.id)).toEqual(change.before);
  }
});

it('cannot hide a stale rule or unrelated title/status edits through reversal',()=>{
  for(const changes of [{content:change.before.content},{title:'unverified'},{status:'draft'}]){
    const row={...change.before,...change.after,...changes};
    expect(()=>restoreRecordedAuditPatch('notes',row,change)).toThrow();
  }
});

it('reconciles shared LV1 and LV2 either evidence without reversing the edit twice',()=>{
  expect(lv2Patch.patches).toHaveLength(1);
  for(const key of ['dataset','key','id','before','after','evidence'] as const){
    expect(lv2Patch.patches[0][key]).toEqual(change[key]);
  }
  const current={...change.before,...change.after};
  expect(beforeUnitAudit('notes',[current])).toEqual([change.before]);
  expect(()=>beforeUnitAudit('notes',[change.before])).toThrow();
  expect(()=>beforeUnitAudit('notes',[{...current,title:'unrecorded'}])).toThrow();
});
