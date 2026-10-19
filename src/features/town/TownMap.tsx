import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import TownBuilding from './TownBuilding';
import { fitTownLayout, getTownLayout, TOWN_PLOT_SIZE } from './townLayout';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { progressDb } from '../../db/progressDb';
import type { DecorationTown, OwnedDecoration } from './decorations/model';
import PlazaDecorations from './decorations/PlazaDecorations';
import './decorations/decorations.css';

export default function TownMap({ plots, selectedId, onSelect, label, focusOnMount = false, town }: {
  plots: { id: string; word: string; built: boolean }[];
  selectedId: string;
  onSelect: (id: string) => void;
  label: string;
  focusOnMount?: boolean;
  town?:DecorationTown;
}) {
  const map = useRef<HTMLDivElement>(null);
  const placed=useLiveQuery<OwnedDecoration[]>(()=>town?progressDb.townDecorations.where('placement.town').equals(town).toArray():Promise.resolve([]),[town])??[];
  const [columns,setColumns]=useState(7);
  const layout = useMemo(() => getTownLayout(plots.length,columns), [plots.length,columns]);
  const [scale, setScale] = useState(0.55);
  const [fitted, setFitted] = useState(false);
  const [detailMode, setDetailMode] = useState(false);
  const [labelScale, setLabelScale] = useState(.8);
  const fitScale = useRef(0.1);
  const pendingCenter = useRef<{ x:number; y:number; anchorX:number; anchorY:number } | null>(null);
  const dense = scale * TOWN_PLOT_SIZE < 44;
  const initialFocus = useRef(focusOnMount ? selectedId : '');
  const focused = useRef(false);
  useEffect(() => {
    const viewport = map.current;
    if (!viewport) return;
    const observer = new ResizeObserver(() => {
      const fit = fitTownLayout(plots.length, viewport.clientWidth, viewport.clientHeight);
      setColumns(fit.columns);
      fitScale.current = fit.scale;
      setScale(fit.scale);
      setDetailMode(false);
      setLabelScale(Math.min(1, .8 * (parseFloat(getComputedStyle(document.documentElement).fontSize) || 16) / 16));
      setFitted(true);
      pendingCenter.current = null;
      viewport.scrollTo(0, 0);
    });
    observer.observe(viewport, { box: 'border-box' });
    return () => observer.disconnect();
  }, [plots.length]);
  const drag = useRef<{ id: number; x: number; y: number; left: number; top: number; moved: boolean; mouse:boolean } | null>(null);
  const suppressClick = useRef(0);
  // Keep the place under the finger (or viewport center) stable while zooming.
  useLayoutEffect(() => {
    const target = pendingCenter.current, viewport = map.current;
    if (!target || !viewport) return;
    const frame = viewport.firstElementChild as HTMLElement;
    viewport.scrollTo(frame.offsetLeft + target.x * scale - target.anchorX,
      frame.offsetTop + target.y * scale - target.anchorY);
    pendingCenter.current = null;
  }, [scale, detailMode]);
  function zoomTo(nextScale:number, clientX?:number, clientY?:number) {
    const viewport = map.current;
    if (!viewport) return;
    const frame = viewport.firstElementChild as HTMLElement, rect = viewport.getBoundingClientRect();
    const anchorX = clientX === undefined ? viewport.clientWidth / 2 : clientX - rect.left;
    const anchorY = clientY === undefined ? viewport.clientHeight / 2 : clientY - rect.top;
    pendingCenter.current = { x:(viewport.scrollLeft + anchorX - frame.offsetLeft) / scale,
      y:(viewport.scrollTop + anchorY - frame.offsetTop) / scale, anchorX, anchorY };
    setScale(nextScale);
    setDetailMode(true);
  }
  useEffect(() => {
    if (!fitted || !initialFocus.current || focused.current) return;
    const tile = Array.from(map.current?.querySelectorAll<HTMLElement>('[data-town-item]') ?? [])
      .find(element => element.dataset.townItem === initialFocus.current);
    if (!tile || !map.current) return;
    const frame = map.current.firstElementChild as HTMLElement;
    map.current.scrollTo({ left: frame.offsetLeft + (tile.offsetLeft + tile.offsetWidth / 2) * scale - map.current.clientWidth / 2,
      top: frame.offsetTop + (tile.offsetTop + tile.offsetHeight / 2) * scale - map.current.clientHeight / 2 });
    focused.current = true;
  }, [scale, fitted]);
  function centerSelected() {
    const tile = Array.from(map.current?.querySelectorAll<HTMLElement>('[data-town-item]') ?? [])
      .find(element => element.dataset.townItem === selectedId);
    if (!tile || !map.current) return;
    pendingCenter.current = { x:tile.offsetLeft + tile.offsetWidth / 2, y:tile.offsetTop + tile.offsetHeight / 2,
      anchorX:map.current.clientWidth / 2, anchorY:map.current.clientHeight / 2 };
    setScale(Math.max(scale, labelScale));
    setDetailMode(true);
    // Also center when already at this zoom level.
    if (detailMode && scale >= labelScale) {
      const frame = map.current.firstElementChild as HTMLElement, target = pendingCenter.current;
      map.current.scrollTo({ left:frame.offsetLeft + target.x * scale - target.anchorX,
        top:frame.offsetTop + target.y * scale - target.anchorY,
        behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
      pendingCenter.current = null;
    }
  }
  function showOverview() {
    pendingCenter.current = null;
    setScale(fitScale.current);
    setDetailMode(false);
    map.current?.scrollTo(0, 0);
  }
  return <>
    <div className="town-map-bar"><div className="town-map-tools">
      <button onClick={() => scale <= labelScale ? showOverview() : zoomTo(Math.max(labelScale, scale - .1))} disabled={!detailMode} aria-label="縮小城鎮">−</button>
      <button onClick={() => zoomTo(Math.min(1, Math.max(labelScale, scale + .1)))} disabled={scale >= 1 && detailMode} aria-label="放大城鎮">＋</button>
      <button onClick={showOverview}>看全貌</button><button onClick={centerSelected}>回到這棟</button>
    </div><span className="town-map-hint">{dense ? '點圖放大' : detailMode ? '拖動選屋' : '點屋看字卡'}</span></div>
    <div className="town-map" ref={map} aria-label={label} data-dense={dense} data-labels={detailMode && scale >= labelScale}
      onClickCapture={event => { if (performance.now() < suppressClick.current) { event.preventDefault(); event.stopPropagation(); } }}
      onClick={event => { if (dense && !(event.target as HTMLElement).closest('a, button')) zoomTo(Math.max(labelScale, scale), event.clientX, event.clientY); }}
      onPointerDown={event => { if (event.button === 0) drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, left: event.currentTarget.scrollLeft, top: event.currentTarget.scrollTop, moved: false, mouse:event.pointerType === 'mouse' }; }}
      onPointerMove={event => {
        const d = drag.current; if (!d || d.id !== event.pointerId) return;
        const dx = event.clientX - d.x, dy = event.clientY - d.y;
        if (!d.moved && Math.hypot(dx, dy) < 6) return;
        if (!d.moved) { d.moved = true; if (d.mouse) event.currentTarget.setPointerCapture(d.id); }
        if (!d.mouse) return;
        event.preventDefault(); event.currentTarget.scrollLeft = d.left - dx; event.currentTarget.scrollTop = d.top - dy;
      }}
      onPointerUp={event => { const d = drag.current; if (d?.moved) { suppressClick.current = performance.now() + 250; if (event.currentTarget.hasPointerCapture(d.id)) event.currentTarget.releasePointerCapture(d.id); } drag.current = null; }}
      onPointerCancel={() => { suppressClick.current = performance.now() + 250; drag.current = null; }} onPointerLeave={() => { if (!drag.current?.moved) drag.current = null; }}>
      <div className="town-world-frame" style={{ width: layout.width * scale, height: layout.height * scale }}>
      <div className="town-world" style={{ width: layout.width, height: layout.height, transform: `scale(${scale})`, '--town-scale':scale } as CSSProperties}>
        <div className="town-river" aria-hidden="true" />
        {layout.entrances.map((street, i) => <i key={i} className="town-street" style={street} aria-hidden="true" />)}
        <div className="town-square" style={layout.square} aria-hidden="true" />
        <div className="town-plaza" style={layout.plaza} aria-label="中央廣場">
          {!placed.length&&<span className="town-plaza-label">中央廣場</span>}<span className="town-plaza-paving" aria-hidden="true" />
          <PlazaDecorations owned={placed}/>
          {town&&<Link className="town-plaza-open" to={`/town/${town}/decorate`} aria-label="布置中央廣場"/>}
          <i className="town-bench north" aria-hidden="true" /><i className="town-bench south" aria-hidden="true" />
          <i className="town-plaza-tree northwest" aria-hidden="true" /><i className="town-plaza-tree northeast" aria-hidden="true" />
          <i className="town-plaza-tree southwest" aria-hidden="true" /><i className="town-plaza-tree southeast" aria-hidden="true" />
        </div>
        {plots.map((plot, i) => <button key={plot.id} data-town-item={plot.id} data-built={plot.built} className={`town-plot hue-${i % 4}`}
          aria-pressed={selectedId === plot.id} style={{ left: layout.positions[i].left, top: layout.positions[i].top }}
          onClick={() => onSelect(plot.id)} aria-label={`${plot.word}，${plot.built ? '已練過' : '尚未練過'}`}>
          <span className="town-lawn" /><TownBuilding built={plot.built} />
          <span className="town-plot-word">{plot.word}</span>
        </button>)}
      </div>
      </div>
    </div>
  </>;
}
