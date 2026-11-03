import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { progressDb } from '../../../db/progressDb';
import { HOUSE_STAGE_LABELS } from '../houseGrowth';
import TownMap from '../TownMap';
import type { TownScene } from './createTownScene';
import type { Town3DPlot } from './town3dModel';
import type { OwnedDecoration } from '../decorations/model';
import './town3d.css';
const NO_DECORATIONS: OwnedDecoration[] = [];

export default function ThreeTownMap({ plots, selectedId, onSelect, reading = false, focusOnMount = false }: {
  plots: Town3DPlot[]; selectedId: string; onSelect: (id: string) => void; reading?: boolean; focusOnMount?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null), scene = useRef<TownScene | null>(null);
  const select = useRef(onSelect); select.current = onSelect;
  const initialFocus = useRef(focusOnMount ? selectedId : '');
  const [flat, setFlat] = useState(typeof WebGL2RenderingContext === 'undefined');
  const [ready, setReady] = useState(false), [failed, setFailed] = useState(false), [paused, setPaused] = useState(false);
  const decorations = useLiveQuery(() => progressDb.townDecorations.where('placement.town').equals('LV1/1').toArray(), []) ?? NO_DECORATIONS;
  const latest = useRef({ plots, selectedId, decorations, pause: paused || reading });
  latest.current = { plots, selectedId, decorations, pause: paused || reading };
  useEffect(() => {
    if (flat || !host.current) return;
    let cancelled = false;
    setReady(false);
    void import('./createTownScene').then(({ createTownScene }) => {
      if (cancelled || !host.current) return;
      scene.current = createTownScene(host.current, id => select.current(id), () => { setFailed(true); setFlat(true); });
      const state = latest.current;
      scene.current.update(state.plots, state.selectedId, state.decorations);
      if (initialFocus.current) { scene.current.focus(initialFocus.current); initialFocus.current = ''; }
      scene.current.pause(state.pause); setReady(true);
    }).catch(() => { if (!cancelled) { setFailed(true); setFlat(true); } });
    return () => { cancelled = true; scene.current?.dispose(); scene.current = null; };
  }, [flat]);
  useEffect(() => { scene.current?.update(plots, selectedId, decorations); }, [plots, selectedId, decorations]);
  useEffect(() => { scene.current?.pause(paused || reading); }, [paused, reading]);
  if (flat) return <>
    <div className="town3d-fallback"><span role="status">{failed ? '立體畫面暫時無法使用，已切換平面地圖。' : '目前使用平面地圖。'}</span>
      <button onClick={() => { setFlat(false); setFailed(false); }}>試用 3D 小鎮</button></div>
    <TownMap town="LV1/1" plots={plots} selectedId={selectedId} onSelect={onSelect} label="LV1 Unit 1 平面備援地圖" />
  </>;
  return <section className="town3d-workspace" aria-label="3D 小鎮">
    <div className="town3d-toolbar">
      <label>選一個字 <select value={selectedId} onChange={e => onSelect(e.target.value)} aria-label="小鎮單字目錄">
        {plots.map(plot => <option key={plot.id} value={plot.id}>{plot.word} · {HOUSE_STAGE_LABELS[plot.stage ?? (plot.built ? 4 : 0)]}</option>)}
      </select></label>
      <button onClick={() => onSelect(selectedId)}>開字卡</button>
      <button onClick={() => setFlat(true)}>平面地圖</button>
    </div>
    <div className="town3d-stage">
      <div className="town3d-canvas" ref={host} />
      {!ready && <p className="town3d-loading" role="status">正在打開立體小鎮…</p>}
      <div className="town3d-orientation"><span>LV1 · UNIT 1</span><b>單字小島</b><small>點空地、小屋或散步角色看字卡</small></div>
      <div className="town3d-controls" aria-label="立體地圖控制">
        <button onClick={() => scene.current?.zoom(1.25)} aria-label="放大城鎮">＋</button>
        <button onClick={() => scene.current?.zoom(.8)} aria-label="縮小城鎮">−</button>
        <button onClick={() => scene.current?.reset()}>看全貌</button>
        <button onClick={() => scene.current?.focus(selectedId)}>回到這棟</button>
        <button aria-pressed={paused} onClick={() => setPaused(!paused)}>{paused ? '繼續散步' : '暫停散步'}</button>
      </div>
      <p className="town3d-note">3D 角色造型示意 · 尚非正式字獸模型</p>
    </div>
    <p className="town3d-gestures">拖曳旋轉 · 右鍵／雙指拖動平移 · 滾輪／雙指縮放</p>
  </section>;
}
