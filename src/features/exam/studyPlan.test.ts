import { describe, expect, it } from 'vitest';
import { estimateCoverage } from './studyPlan';
describe('first-pass coverage estimate',()=>{
  it('uses the actual cap rather than a fixed ten-word scenario',()=>{
    expect(estimateCoverage(663,15,126)).toMatchObject({firstPassDays:45,spareDays:81});
    expect(estimateCoverage(663,10,126)).toMatchObject({firstPassDays:67,spareDays:59});
    expect(estimateCoverage(563,10,126)).toMatchObject({firstPassDays:57,spareDays:69});
  });
  it('does not promise completion when new words are paused or time is insufficient',()=>{
    expect(estimateCoverage(663,0,126).firstPassDays).toBeNull();
    expect(estimateCoverage(663,10,30).spareDays).toBe(-37);
    expect(estimateCoverage(0,0,30)).toMatchObject({firstPassDays:0,spareDays:30});
  });
});
