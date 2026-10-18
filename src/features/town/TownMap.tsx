import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import TownBuilding from './TownBuilding';
import { getTownLayout } from './townLayout';

export default function TownMap({ plots, selectedId, onSelect, label, focusOnMount = false }: {
  plots: { id: string; word: string; built: boolean }[];
  selectedId: string;
  onSelect: (id: string) => void;
  label: string;
  focusOnMount?: boolean;
}) {
  const map = useRef<HTMLDivElement>(null);
  const [columns,setColumns]=useState(6);
  const layout = useMemo(() => getTownLayout(plots.length,columns), [plots.length,columns]);
  const [scale, setScale] = useState(0.55);
  const [fitted, setFitted] = useState(false);
  const fitScale = useRef(0.1);
  const initialFocus = useRef(focusOnMount ? selectedId : '');
  const focused = useRef(false);
  useEffect(() => {
    const viewport = map.current;
    if (!viewport) return;
    const observer = new ResizeObserver(() => {
      let bestColumns=6, bestFit=0;
      for(let count=6;count<=20;count++) {
        const candidate=getTownLayout(plots.length,count);
        const candidateFit=Math.min(1,viewport.clientWidth/candidate.width,viewport.clientHeight/candidate.height);
        if(candidateFit>bestFit) {bestColumns=count;bestFit=candidateFit;}
      }
      setColumns(bestColumns);
      const fit = Math.max(0.1,bestFit);
      fitScale.current = fit;
      setScale(fit);
      setFitted(true);
      viewport.scrollLeft = Math.max(0, (layout.width * fit - viewport.clientWidth) / 2);
    });
    observer.observe(viewport, { box: 'border-box' });
    return () => observer.disconnect();
  }, [layout.width, layout.height, plots.length]);
  const drag = useRef<{ id: number; x: number; y: number; left: number; top: number; moved: boolean } | null>(null);
  const suppressClick = useRef(0);
  useEffect(() => {
    if (!fitted || !initialFocus.current || focused.current) return;
    const tile = Array.from(map.current?.querySelectorAll<HTMLElement>('[data-town-item]') ?? [])
      .find(element => element.dataset.townItem === initialFocus.current);
    if (!tile || !map.current) return;
    map.current.scrollTo({ left: (tile.offsetLeft + tile.offsetWidth / 2) * scale - map.current.clientWidth / 2,
      top: (tile.offsetTop + tile.offsetHeight / 2) * scale - map.current.clientHeight / 2 });
    focused.current = true;
  }, [scale, fitted]);
  function centerSelected() {
    const tile = Array.from(map.current?.querySelectorAll<HTMLElement>('[data-town-item]') ?? [])
      .find(element => element.dataset.townItem === selectedId);
    if (!tile || !map.current) return;
    map.current.scrollTo({ left: (tile.offsetLeft + tile.offsetWidth / 2) * scale - map.current.clientWidth / 2,
      top: (tile.offsetTop + tile.offsetHeight / 2) * scale - map.current.clientHeight / 2,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }
  function centerPlaza() {
    map.current?.scrollTo({ left: layout.width * scale / 2 - map.current.clientWidth / 2,
      top: layout.height * scale / 2 - map.current.clientHeight / 2,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }
  return <>
    <div className="town-map-bar"><span>全貌預覽 · 可放大看單字</span><div className="town-map-tools">
      <button onClick={() => setScale(current => Math.max(fitScale.current, current - 0.1))} disabled={scale <= fitScale.current} aria-label="縮小城鎮">−</button>
      <button onClick={() => setScale(current => Math.min(1, current + 0.1))} disabled={scale >= 1} aria-label="放大城鎮">＋</button>
      <button onClick={() => {setScale(fitScale.current);centerPlaza();}}>看全貌</button><button onClick={centerSelected}>回到這棟</button>
    </div></div>
    <div className="town-map" ref={map} aria-label={label}
      onClickCapture={event => { if (performance.now() < suppressClick.current) { event.preventDefault(); event.stopPropagation(); } }}
      onPointerDown={event => { if (event.pointerType === 'mouse' && event.button === 0) drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, left: event.currentTarget.scrollLeft, top: event.currentTarget.scrollTop, moved: false }; }}
      onPointerMove={event => {
        const d = drag.current; if (!d || d.id !== event.pointerId) return;
        const dx = event.clientX - d.x, dy = event.clientY - d.y;
        if (!d.moved && Math.hypot(dx, dy) < 6) return;
        if (!d.moved) { d.moved = true; event.currentTarget.setPointerCapture(d.id); }
        event.preventDefault(); event.currentTarget.scrollLeft = d.left - dx; event.currentTarget.scrollTop = d.top - dy;
      }}
      onPointerUp={event => { const d = drag.current; if (d?.moved) { suppressClick.current = performance.now() + 100; if (event.currentTarget.hasPointerCapture(d.id)) event.currentTarget.releasePointerCapture(d.id); } drag.current = null; }}
      onPointerCancel={() => { drag.current = null; }} onPointerLeave={() => { if (!drag.current?.moved) drag.current = null; }}>
      <div className="town-world-frame" style={{ width: layout.width * scale, height: layout.height * scale }}>
      <div className="town-world" style={{ width: layout.width, height: layout.height, transform: `scale(${scale})`, '--town-scale':scale } as CSSProperties}>
        <div className="town-river" aria-hidden="true" />
        {layout.entrances.map((street, i) => <i key={i} className="town-street" style={street} aria-hidden="true" />)}
        <div className="town-square" style={layout.square} aria-hidden="true" />
        <div className="town-plaza" style={layout.plaza} aria-label="中央廣場">
          <span className="town-plaza-label">中央廣場</span><span className="town-plaza-paving" aria-hidden="true" />
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
