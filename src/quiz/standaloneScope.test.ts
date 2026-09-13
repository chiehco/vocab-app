import { describe, expect, it } from 'vitest';
import prioritiesJson from '../../public/data/v1/exam_priority.json';
import frequency from './gsatSixYear.json';
import type { ExamPriorityRecord } from '../db/types';
import { buildTopExamWordSet, standaloneStudyPriorities } from './examScope';
import { buildExamHubProgress } from '../features/exam/examHub';

const priorities = prioritiesJson as unknown as ExamPriorityRecord[];
describe('six-year standalone study scope',()=>{
  it('excludes flagged functions from study while retaining the original archive',()=>{
    const before=JSON.stringify(priorities);
    const study=standaloneStudyPriorities(priorities);
    expect(study).toHaveLength(663);
    expect(study.some(p=>p.isFunctionWord)).toBe(false);
    for(const word of ['for','on','to','because','and'])expect(study.some(p=>p.word===word)).toBe(false);
    expect(buildTopExamWordSet(priorities).has('for')).toBe(true);
    expect(JSON.stringify(priorities)).toBe(before);
    expect(buildExamHubProgress(priorities,[],'2026-09-12').total).toBe(study.length);
  });
  it('orders by six-year score with stable tie breaks, never historical rank',()=>{
    const expected=standaloneStudyPriorities(priorities).map(p=>p.word);
    const shuffled=priorities.slice().reverse().map(p=>({...p,rank:999999-p.rank}));
    expect(standaloneStudyPriorities(shuffled).map(p=>p.word)).toEqual(expected);
    for(const row of Object.values(frequency))expect(row.years.every(y=>y>=110&&y<=115)).toBe(true);
  });
});
