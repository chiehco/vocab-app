import { Link } from 'react-router-dom';
import { useUnitProgress } from './useUnitProgress';
import {
  availableTracks, publisherName, publishersFor, textbookUnits, trackInfo, unitKey, unitTitle, volumesFor,
  type TextbookScope, type TextbookUnit,
} from '../features/vocabulary/textbookCatalog';
import '../styles/scope-picker.css';

interface PickerProps {
  scope: TextbookScope;
  onChange: (scope: TextbookScope) => void;
  units?: TextbookUnit[];
}

/**
 * 類別 → 出版社 → 等級／年級。只剩一個選項的層級不顯示（目前只有常春藤 7000 單，
 * 所以只看得到等級）；有第二家出版社或課本資料後會自動出現。
 */
export function ScopePicker({ scope, onChange, units = textbookUnits }: PickerProps) {
  const tracks = availableTracks(units);
  const publishers = publishersFor(scope.track, units);
  const volumes = volumesFor(scope.track, scope.publisher, units);
  const info = trackInfo(scope.track);
  function pickTrack(track: TextbookScope['track']) {
    const publisher = publishersFor(track, units)[0];
    onChange({ track, publisher, volume: volumesFor(track, publisher, units)[0] });
  }
  function pickPublisher(publisher: string) {
    onChange({ ...scope, publisher, volume: volumesFor(scope.track, publisher, units)[0] });
  }
  return <div className="scope-picker">
    {tracks.length > 1 && <div className="scope-segment" role="group" aria-label="類別">
      {tracks.map(t => <button type="button" key={t.id} aria-pressed={scope.track === t.id} onClick={() => pickTrack(t.id)}>{t.label}</button>)}
    </div>}
    {publishers.length > 1 && <div className="scope-layer">
      <span className="scope-label" id="scope-publisher">出版社</span>
      <div className="scope-chips" role="group" aria-labelledby="scope-publisher">
        {publishers.map(p => <button type="button" key={p} aria-pressed={scope.publisher === p} onClick={() => pickPublisher(p)}>{publisherName(p)}</button>)}
      </div>
    </div>}
    {volumes.length > 0 && <div className="scope-layer">
      <span className="scope-label" id="scope-volume">{info.volumeLabel}</span>
      <div className="scope-chips" role="group" aria-labelledby="scope-volume">
        {volumes.map(v => <button type="button" key={v} aria-pressed={scope.volume === v} onClick={() => onChange({ ...scope, volume: v })}>{v}</button>)}
      </div>
    </div>}
  </div>;
}

interface TilesProps {
  units: TextbookUnit[];
  /** 連到單元頁；不給就用 onSelect 當按鈕 */
  to?: (unit: TextbookUnit) => string;
  onSelect?: (unit: TextbookUnit) => void;
  selected?: string;
  /** 每格副標，預設顯示詞數 */
  detail?: (unit: TextbookUnit) => string;
}

export function UnitTiles({ units, to, onSelect, selected, detail }: TilesProps) {
  const progress = useUnitProgress(units);
  return <ul className="unit-tiles">
    {units.map(u => {
      const key = unitKey(u);
      const learned = progress?.get(key) ?? 0;
      const total = u.wordIds.length;
      const pct = total ? Math.round(learned / total * 100) : 0;
      const body = <>
        <strong>{unitTitle(u)}</strong>
        <small>{detail ? detail(u) : `${u.count} ${u.partial ? '組圖句' : '個詞彙'}`}</small>
        {total > 0 && learned > 0 && <small className="unit-tile-status">{learned >= total ? '已學完' : `已學 ${learned}／${total}`}</small>}
        <span className="unit-tile-track" aria-hidden="true"><i style={{ width: `${pct}%` }} /></span>
      </>;
      return <li key={key}>
        {to ? <Link to={to(u)} className="unit-tile">{body}</Link>
          : <button type="button" className="unit-tile" aria-pressed={selected === key} onClick={() => onSelect?.(u)}>{body}</button>}
      </li>;
    })}
  </ul>;
}
