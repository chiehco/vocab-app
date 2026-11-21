import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {expect,it} from 'vitest';
import pack from './curriculumLV3Unit3.json';
import source from '../../../scripts/sources/LV3Unit3.json';
import starter from '../../../public/data/v1/sa-pack.json';
import words from '../../../public/data/v1/words.json';
import extension from '../../../docs/lv3-u03-recovery-20261122/starter-extension.json';
import {beforeU03Starter,beforeU03StarterText,beforeU03DirectNames} from './lv3U03Starter.testSupport';
import {findUnit,templateGroup} from './model';
import {groupWordIds} from './groupScope';
import {textbookUnits} from '../vocabulary/textbookCatalog';

it('makes all 24 LV3 units available and retains the recovered 35 main words and six phrases',()=>{
  expect(textbookUnits.filter(u=>u.level==='LV3').map(u=>u.unit)).toEqual(Array.from({length:24},(_,n)=>n+1));
  expect(findUnit(3,'LV3')?.items).toEqual(pack.learningItems);
  expect(pack.learningItems).toHaveLength(122);
  expect(pack.learningItems.filter(i=>i.kind==='vocabulary')).toHaveLength(116);
  expect(source.headwords).toHaveLength(35);
  expect(source.usage.map(i=>i.label)).toEqual(['in practice','in the beginning','the subtropical zone','the temperate zone','the frigid zone','have a runny nose']);
  expect(pack.learningItems.every(i=>!('illustration' in i)&&!('originalExample' in i)&&i.practiceMode==='read_only')).toBe(true);
});

it('provides every one of the 96 existing mappings on a fresh starter installation',()=>{
  const ids=groupWordIds(templateGroup(3,'LV3'));
  expect(ids).toHaveLength(96);
  expect(ids.every(id=>starter.words.some(w=>w.wordId===id))).toBe(true);
  for(const id of ids)expect(starter.words.find(w=>w.wordId===id)).toEqual(words.find(w=>w.wordId===id));
  expect(starter.words).toHaveLength(5798);
  expect(extension.addedRows.words).toHaveLength(19);
  expect(pack.learningItems.filter(i=>i.kind==='vocabulary'&&!i.officialWordId)).toHaveLength(20);
});

it('restores the exact preceding starter without altering the current pack',()=>{
  const raw=readFileSync('public/data/v1/sa-pack.json','utf8').replace(/\r\n/g,'\n');
  const original=JSON.stringify(starter);
  const before=beforeU03StarterText(raw);
  expect(createHash('sha256').update(before).digest('hex')).toBe(extension.beforeByteHash);
  expect(JSON.parse(before).words).toHaveLength(5779);
  expect(beforeU03Starter(starter)).toEqual(JSON.parse(before));
  expect(JSON.stringify(starter)).toBe(original);
});

it('rejects changes to added or original rows, order, metadata and raw formatting',()=>{
  for(const mode of ['added','original','order','metadata','removed']) {
    const altered=structuredClone(starter);
    if(mode==='added')altered.words[extension.addedRows.words[0].index].meaningZh='drift';
    if(mode==='original')altered.words[0].meaningZh='drift';
    if(mode==='order')altered.words.reverse();
    if(mode==='metadata')altered.meta.generatedAt='drift';
    if(mode==='removed')altered.words.pop();
    expect(()=>beforeU03Starter(altered)).toThrow(/drift/);
  }
  expect(()=>beforeU03StarterText(JSON.stringify(starter)+'\n ')).toThrow(/drift/);
});

it('keeps all 131 historical direct files and leaves unknown additions visible',()=>{
  const names=readdirSync('src/features/direct').filter(name=>name.endsWith('.json'));
  const before=beforeU03DirectNames(names);
  expect(before).toHaveLength(131);
  expect(before).toEqual(names.filter(name=>name!=='curriculumLV3Unit3.json'));
  expect(beforeU03DirectNames([...names,'unregistered.json'])).toContain('unregistered.json');
  expect(()=>beforeU03DirectNames(before)).toThrow(/identity drift/);
});
