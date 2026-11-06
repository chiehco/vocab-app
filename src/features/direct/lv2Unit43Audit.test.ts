import {expect,it} from 'vitest';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import current from './curriculumLV2Unit43.json';
import source from '../../../scripts/sources/LV2Unit43.json';
import corrections from '../../../docs/unit-audit-20261105/LV2-U43-curriculum-patches.json';
import formal from '../../../docs/unit-audit-20261105/LV2-U43-patches.json';
import forms from '../../../docs/unit-audit-20261105/LV2-U43-verified-forms-patches.json';
import {lv2Unit43BeforeAudit as restore} from './lv2Unit43Audit.testSupport';
import {buildUsagePatternItems} from '../vocabulary/usagePattern';
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const words=JSON.parse(readFileSync('public/data/v1/words.json','utf8')) as Record<string,unknown>[];
const examples=JSON.parse(readFileSync('public/data/v1/examples.json','utf8')) as Record<string,unknown>[];
it('restores exactly115 U43 display rows and the old complete hash while retaining original source',()=>{
 expect(corrections.patches).toHaveLength(115);expect(hash(source)).toBe(corrections.sourceHash);expect(hash(current)).toBe(corrections.afterHash);expect(hash(restore(current))).toBe(corrections.beforeHash);
 expect(current.template.deliveryMode).toBe('text_only');expect(current.learningItems.every(i=>i.practiceMode==='read_only'&&!('illustration'in i)&&!('originalExample'in i)&&!i.officialSenseId)).toBe(true);
});
it('rejects unverified after values and protects all unlisted identities order questions and modes',()=>{
 for(const p of corrections.patches)for(const field of Object.keys(p.after)){const bad=structuredClone(current);(bad.learningItems.find(i=>i.learningItemId===p.id)! as Record<string,unknown>)[field]='unverified';expect(()=>restore(bad)).toThrow();}
 const id=structuredClone(current);id.learningItems.find(i=>i.learningItemId===corrections.patches[0].id)!.learningItemId='invented';expect(()=>restore(id)).toThrow();
 for(const field of ['officialWordId','officialSenseId','meaningSource','unlistedField']){const bad=structuredClone(current);(bad.learningItems[0] as Record<string,unknown>)[field]='invented';expect(hash(restore(bad))).not.toBe(corrections.beforeHash);}
 const order=structuredClone(current);order.learningItems.reverse();expect(hash(restore(order))).not.toBe(corrections.beforeHash);
 const q=structuredClone(current);(q.questions as unknown[]).push({questionId:'invented'});expect(hash(restore(q))).not.toBe(corrections.beforeHash);
 const mode=structuredClone(current);mode.template.deliveryMode='changed';expect(hash(restore(mode))).not.toBe(corrections.beforeHash);
 const duplicate=structuredClone(current);duplicate.learningItems.push(duplicate.learningItems[0]);expect(()=>restore(duplicate)).toThrow();
});
it('keeps19 supplements genuinely unmapped and validates each precise displayed value',()=>{
 const a=current.learningItems.filter(i=>i.meaningSource==='unmapped_supplement');expect(a).toHaveLength(19);
 for(const row of a){expect(row.officialWordId).toBeNull();expect(row.officialSenseId).toBeNull();expect(row.targetMeaningZh).not.toBe('教材補充詞；義項待核對。');
  for(const field of ['targetMeaningZh','chapterMeaningsZh']){const bad=structuredClone(current);(bad.learningItems.find(i=>i.learningItemId===row.learningItemId)! as Record<string,unknown>)[field]='unverified';expect(()=>restore(bad)).toThrow();}
  for(const field of ['officialWordId','officialSenseId','meaningSource']){const bad=structuredClone(current);(bad.learningItems.find(i=>i.learningItemId===row.learningItemId)! as Record<string,unknown>)[field]='invented';expect(hash(restore(bad))).not.toBe(corrections.beforeHash);}
 }
});
it('narrows ten cloze POS and six existing hints without filling empty hints or changing English',()=>{const pos:Record<string,string>={EXf6234f78:'v.',EX2d1ff930:'n.',EX437e787d:'n.',EX0a820b42:'v.',EXea63b79e:'v.',EX3cd7fb0d:'adj.',EX3d9e3963:'adv.',EX5480c5d3:'v.',EX952dbbde:'adv.',EXdd821463:'adj.'};for(const[id,value]of Object.entries(pos)){const p=formal.patches.find(p=>p.id===id&&'sensePos'in p.after)!;const hint:Record<string,string>={EX3cd7fb0d:'長的（時間長）',EX3d9e3963:'長久地',EX5480c5d3:'渴望（long to V）',EX952dbbde:'整段期間地（all night long：整晚）',EXdd821463:'長的（長度）'};expect(p.after).toEqual(hint[id]?{sensePos:value,meaningHint:hint[id]}:{sensePos:value});}const hints=formal.patches.filter(p=>p.dataset==='examples'&&'meaningHint'in p.after);expect(hints).toHaveLength(6);for(const p of hints){expect(p.before.meaningHint).toBeTruthy();expect(Object.keys(p.after).sort()).toEqual('sensePos'in p.after?['meaningHint','sensePos']:['meaningHint']);}for(const p of formal.patches.filter(p=>p.dataset==='examples')){const e=examples.find(e=>e.exampleId===p.id)!;const before=p.before as Record<string,unknown>;for(const k of ['sentenceEn','blankSentence','answer'])expect(e[k]).toEqual(before[k]);if(p.id!=='EXb4e6bb31')expect(e.sentenceZh).toEqual(before.sentenceZh);else expect(e.sentenceZh).toBe('未滿六歲的兒童可免費進入科學博物館。');}});
it('adds only seventeen source-verified absent form keys while retaining noun-only host identities',()=>{expect(forms.patches).toHaveLength(17);for(const p of forms.patches){expect(p.before).toEqual({verbForms:{$absent:true}});const w=words.find(w=>w.wordId===p.id)!;expect(w.posAll as string[]).toContain('v.');expect(w.verbForms).toEqual(p.after.verbForms);}for(const id of ['W001989','W004041','W005278'])expect(forms.patches.some(p=>p.id===id)).toBe(false);const dial=forms.patches.find(p=>p.id==='W001249')!;expect(dial.after.verbForms.past).toBe('dialed');expect(dial.after.verbForms.pastParticiple).toBe('dialed');});
it('keeps the official hotel sense distinct from two independently worded practice sources',()=>{const p=formal.patches.find(p=>p.id==='W001682-1')!;expect(p.before.status).toBe('draft');expect(p.after.status).toBe('reviewed');expect(p.after.examEvidence).toContain('選項 C');expect(p.after.note).toContain('非原題逐字引文');expect(examples.find(e=>e.exampleId==='EX5384e71a')?.status).toBe('draft');expect(examples.find(e=>e.exampleId==='EREVIEW20260830_W001682')?.status).toBe('needs_check');expect(formal.patches.some(p=>p.id==='EREVIEW20260830_W001682')).toBe(false);});
it('pairs every changed construction and retains supported rare meanings and exact source qualifications',()=>{for(const p of formal.patches.filter(p=>p.dataset==='words'&&('usagePattern'in p.after||'usagePatternZh'in p.after))){const w=words.find(w=>w.wordId===p.id)!;const items=buildUsagePatternItems(w.usagePattern as string,w.usagePatternZh as string);expect(items.length).toBeGreaterThan(0);expect(items.every(i=>i.chinese)).toBe(true);}expect(words.find(w=>w.wordId==='W001368')?.meaningZh).toContain('再生草');expect(words.find(w=>w.wordId==='W001368')?.meaningZh).toContain('苔蘚');expect(words.find(w=>w.wordId==='W005673')?.meaningZh).toContain('古義');expect(words.find(w=>w.wordId==='W004041')?.meaningEn).toContain('Separate rare verb');expect(words.find(w=>w.wordId==='W001469')?.meaningEn).toContain('computing');expect(current.learningItems.find(i=>i.learningItemId==='LI-LV2U43-G002')?.explanationZh).toContain('不能把所有用法');});

it('makes the derived noun distinction visible while preserving the exact Chinese before and real measure senses',()=>{const p=formal.patches.find(p=>p.dataset==='words'&&p.id==='W006041')!;expect(p.before.meaningZh).toBe('尺寸；量度器；量度標準；測量；度量');expect(p.after.meaningZh).toBe('（measurement）尺寸；測量；度量；（另詞 measure 的名詞義）量度器；量度標準');const w=words.find(w=>w.wordId==='W006041')!;expect(w.meaningZh).toBe(p.after.meaningZh);expect(w.pos).toBe('n.');expect(w.status).toBe('draft');});
