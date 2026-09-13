import { expect, it } from 'vitest';
import { learningItems, reviewedExample, practiceIds } from './model';
it('opens only reviewed original examples and maps every curriculum item to a practice question',()=>{
  const unit1=learningItems.filter(i=>!i.learningItemId.startsWith('LI-LV3U02-'));
  const vocabulary=unit1.filter(i=>i.kind==='vocabulary');
  expect(vocabulary).toHaveLength(123);
  expect(vocabulary.every(i=>!!reviewedExample(i))).toBe(true);
  const item=vocabulary[0];
  expect(reviewedExample({...item,originalExample:{...item.originalExample!,provenance:'unknown'}})).toBeUndefined();
  expect(practiceIds(unit1)).toHaveLength(176);
  expect(new Set(practiceIds(unit1)).size).toBe(176);
});
