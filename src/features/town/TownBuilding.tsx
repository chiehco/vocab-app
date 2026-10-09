export default function TownBuilding({ built }: { built: boolean }) {
  return <span className={`town-building ${built ? 'is-built' : 'is-empty'}`} aria-hidden="true">
    <span className="town-house-shadow" /><span className="town-house-side" />
    <span className="town-house-front"><i className="town-house-window" /><i className="town-house-door" /></span>
    <span className="town-house-roof-side" /><span className="town-house-roof" />
    {built && <span className="town-resident"><i /></span>}
  </span>;
}
