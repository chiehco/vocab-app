import { expect, it } from 'vitest';
import { reviewedExample, practiceIds } from './model';
import { unitItems } from '../direct/model';
it('opens only reviewed original examples and maps every curriculum item to a practice question',()=>{
  const unit1=unitItems(1,'LV3');
  const vocabulary=unit1.filter(i=>i.kind==='vocabulary');
  expect(vocabulary).toHaveLength(123);
  expect(vocabulary.every(i=>!!reviewedExample(i))).toBe(true);
  const item=vocabulary[0];
  expect(reviewedExample({...item,originalExample:{...item.originalExample!,provenance:'unknown'}})).toBeUndefined();
  expect(practiceIds(unit1)).toHaveLength(176);
  expect(new Set(practiceIds(unit1)).size).toBe(176);
});
