import type { HouseStage } from './houseGrowth';
export default function TownBuilding({ built, stage = built ? 4 : 0 }: { built: boolean; stage?:HouseStage }) {
  return <span className={`town-building stage-${stage} ${stage>0 ? 'is-built' : 'is-empty'}`} aria-hidden="true">
    <span className="town-house-shadow" /><span className="town-house-side" />
    <span className="town-house-front"><i className="town-house-window" /><i className="town-house-door" /></span>
    <span className="town-house-roof-side" /><span className="town-house-roof" />
    {stage===4 && <span className="town-resident"><i /></span>}
  </span>;
}
