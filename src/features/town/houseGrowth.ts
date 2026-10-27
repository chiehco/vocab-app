import type { HouseGrowthEvidence } from '../../db/types';
export type HouseStage = 0 | 1 | 2 | 3 | 4;
export const HOUSE_STAGE_LABELS = ['等待開工', '下層半牆', '門與半牆', '一樓與窗戶', '屋頂完成'] as const;

/** Pure projection, no writes or historical review inference. Legacy houses
 * keep their appearance; new evidence can never demolish or multiply them. */
export function houseGrowth(events: readonly {id:string; at:number; evidence?:HouseGrowthEvidence}[]) {
  if (events.some(event => event.evidence === undefined)) return {stage:4 as HouseStage, legacy:true};
  let stage:HouseStage=0, firstDay='';const seen=new Set<string>(), reviewDays=new Set<string>();
  for(const event of [...events].sort((a,b)=>a.at-b.at || a.id.localeCompare(b.id))) {
    const evidence=event.evidence;
    if(seen.has(event.id) || !Number.isFinite(event.at) || !evidence || !/^\d{4}-\d{2}-\d{2}$/.test(evidence.day) || evidence.kind==='none')continue;
    seen.add(event.id);
    if(evidence.kind!=='learning' && evidence.kind!=='due-review')continue;
    if(stage===0){stage=1;firstDay=evidence.day;continue;}
    if(evidence.kind==='due-review' && evidence.day>firstDay && !reviewDays.has(evidence.day)) {
      reviewDays.add(evidence.day);stage=Math.min(4,stage+1) as HouseStage;
    }
  }
  return {stage,legacy:false};
}
