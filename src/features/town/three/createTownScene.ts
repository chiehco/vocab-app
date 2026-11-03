import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { residentPose, town3DPositions, type Town3DPlot } from './town3dModel';
import type { OwnedDecoration } from '../decorations/model';

export interface TownScene {
  update(plots: Town3DPlot[], selected: string, decorations: OwnedDecoration[]): void;
  zoom(factor: number): void; reset(): void; focus(id: string): void;
  pause(value: boolean): void; dispose(): void;
}

/** All meshes are original procedural geometry. No remote assets, textures or CDN. */
export function createTownScene(host: HTMLElement, onSelect: (id: string) => void, onLost: () => void): TownScene {
  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.35));
  renderer.setClearColor('#c7e3e5');
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-label', 'LV1 Unit 1 立體小鎮，拖曳旋轉，滾輪或雙指縮放；也可使用上方單字目錄');
  canvas.setAttribute('role', 'img');
  host.append(canvas);
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog('#c7e3e5', 95, 180);
  scene.add(new THREE.HemisphereLight('#fff5d9', '#6e908a', 2));
  const sun = new THREE.DirectionalLight('#fff0d0', 2.2);
  sun.position.set(-25, 40, 20); scene.add(sun);
  const camera = new THREE.OrthographicCamera(-30, 30, 30, -30, .1, 200);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = false;
  controls.minPolarAngle = .25; controls.maxPolarAngle = Math.PI / 2.45;
  controls.minZoom = .7; controls.maxZoom = 3.4;
  controls.screenSpacePanning = false;
  controls.maxTargetRadius = 22;
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Map<string, THREE.MeshLambertMaterial>();
  const geometry = <T extends THREE.BufferGeometry>(g: T) => { geometries.add(g); return g; };
  const box = geometry(new THREE.BoxGeometry(1, 1, 1));
  const sphere = geometry(new THREE.IcosahedronGeometry(1, 1));
  const cylinder = geometry(new THREE.CylinderGeometry(1, 1, 1, 12));
  const disc = geometry(new THREE.CircleGeometry(1, 20));
  const roofShape = new THREE.Shape();
  roofShape.moveTo(-1.28, 0); roofShape.lineTo(1.28, 0); roofShape.lineTo(0, .95); roofShape.closePath();
  const roofGeometry = geometry(new THREE.ExtrudeGeometry(roofShape, { depth: 2.2, bevelEnabled: false }));
  function material(color: string) {
    if (!materials.has(color)) materials.set(color, new THREE.MeshLambertMaterial({ color, flatShading: true }));
    return materials.get(color)!;
  }
  function mesh(parent: THREE.Object3D, g: THREE.BufferGeometry, color: string, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1) {
    const m = new THREE.Mesh(g, material(color));
    m.position.set(x, y, z); m.scale.set(sx, sy, sz); parent.add(m); return m;
  }
  function groundDisc(parent: THREE.Object3D, color: string, x: number, z: number, sx: number, sz: number, y = .14) {
    const m = mesh(parent, disc, color, x, y, z, sx, sz, 1); m.rotation.x = -Math.PI / 2; return m;
  }
  // Faceted bedrock, sandy rim and grass have actual depth and lit side faces.
  mesh(scene, geometry(new THREE.CylinderGeometry(24.6, 21, 4.2, 14)), '#9b9c7a', 0, -2.5, 0, 1.13, 1, 1);
  mesh(scene, geometry(new THREE.CylinderGeometry(25.1, 24.5, .7, 14)), '#e5d9ac', 0, -.45, 0, 1.13, 1, 1);
  mesh(scene, geometry(new THREE.CylinderGeometry(24.4, 24.8, .55, 14)), '#a8c98b', 0, -.08, 0, 1.13, 1, 1);
  groundDisc(scene, '#aed4d6', 0, 0, 31, 28, -4.7);
  const sea = mesh(scene, geometry(new THREE.PlaneGeometry(500, 500)), '#bcdde0', 0, -4.8, 0); sea.rotation.x = -Math.PI / 2;
  // A connected walking road around an open central square.
  mesh(scene, box, '#e6d7b5', 0, .22, -10, 23, .12, 2.5);
  mesh(scene, box, '#e6d7b5', 0, .22, 10, 23, .12, 2.5);
  mesh(scene, box, '#e6d7b5', -10, .22, 0, 2.5, .12, 23);
  mesh(scene, box, '#e6d7b5', 10, .22, 0, 2.5, .12, 23);
  mesh(scene, box, '#e6d7b5', 0, .22, 0, 2.4, .12, 40);
  mesh(scene, box, '#e6d7b5', 0, .22, 0, 43, .12, 2.4);
  mesh(scene, box, '#eee5cb', 0, .29, 0, 14.6, .25, 14.6);
  groundDisc(scene, '#ddd6b8', 0, 0, 4.6, 4.6, .43);
  groundDisc(scene, '#eee5cb', 0, 0, 4.3, 4.3, .44);
  function tree(x: number, z: number, scale = 1) {
    groundDisc(scene, '#95b781', x + .3, z + .2, scale * 1.1, scale * .7);
    mesh(scene, cylinder, '#8c7453', x, 1 * scale, z, .16 * scale, 1.8 * scale, .16 * scale);
    mesh(scene, sphere, '#719c70', x, 2.5 * scale, z, 1.2 * scale, 1.6 * scale, 1.1 * scale);
    mesh(scene, sphere, '#89b27a', x - .3 * scale, 3 * scale, z, .9 * scale, 1.1 * scale, .9 * scale);
  }
  for (let i = 0; i < 25; i++) {
    const a = i * 2.399;
    if (Math.abs(Math.sin(a)) < .13 || Math.abs(Math.cos(a)) < .1) continue;
    tree(Math.cos(a) * 24.1, Math.sin(a) * 21.7, .75 + (i % 4) * .15);
  }
  [[-6, -6], [6, -6], [6, 6], [-6, 6]].forEach(([x, z]) => tree(x, z, .8));
  // Rocks and a small jetty create a shoreline without introducing a locked landmark.
  for (let i = 0; i < 8; i++) mesh(scene, sphere, '#aeb1a0', -22 + i * .75, -.2, 12 + i % 3, 1.3, .8, 1.1);
  for (let i = 0; i < 9; i++) mesh(scene, box, '#ac8c60', 0, -.4, 22.5 + i * .48, 2.4, .2, .4);
  const plotsGroup = new THREE.Group(), residentsGroup = new THREE.Group(), decorationGroup = new THREE.Group();
  scene.add(plotsGroup, residentsGroup, decorationGroup);
  const selection = mesh(scene, geometry(new THREE.RingGeometry(1.3, 1.47, 32)), '#faefbd', 0, .4, 0);
  selection.rotation.x = -Math.PI / 2;
  let plots: Town3DPlot[] = [], plotKey = '', decorationKey = '', selectedId = '';
  let positions = town3DPositions(0);
  const residents: { root: THREE.Group; body: THREE.Mesh; legs: THREE.Mesh[] }[] = [];
  function addHouse(plot: Town3DPlot, index: number) {
    const p = positions[index], root = new THREE.Group(); root.position.set(p.x, .25, p.z); root.rotation.y = p.rotation;
    root.userData.itemId = plot.id; plotsGroup.add(root);
    const stage = plot.stage ?? (plot.built ? 4 : 0), color = ['#b87556', '#6f9496', '#b69a66', '#9a88ab'][index % 4];
    groundDisc(root, '#91b17b', .2, .2, 1.48, 1.14, .01);
    mesh(root, box, '#d5c6a0', 0, .12, 0, 2.25, .22, 2);
    if (stage === 0) {
      // Vacant plots remain visibly vacant; no fabricated learning progress.
      mesh(root, box, '#ac9367', -.83, .52, -.6, .13, .85, .13);
      mesh(root, box, '#e9d9b3', -.83, .8, -.6, .65, .4, .12);
      return;
    }
    const height = stage <= 2 ? .85 : 1.85;
    mesh(root, box, '#f4deb2', 0, .22 + height / 2, .85, 2.2, height, .17);
    mesh(root, box, '#e2c99a', -1.01, .22 + height / 2, 0, .18, height, 1.7);
    mesh(root, box, '#e2c99a', 1.01, .22 + height / 2, 0, .18, height, 1.7);
    mesh(root, box, '#ebd4a7', 0, .22 + height / 2, -.85, 2.2, height, .17);
    if (stage >= 2) mesh(root, box, '#7b8c6a', 0, .75, .96, .5, 1.05, .09);
    if (stage >= 3) for (const x of [-.65, .65]) mesh(root, box, '#a4c4c5', x, 1.43, .96, .38, .44, .09);
    if (stage === 4) {
      mesh(root, roofGeometry, color, 0, 2.05, -1.1);
      mesh(root, box, '#ddc9a3', .65, 2.85, -.45, .3, .8, .3);
    }
  }
  function makeResident(index: number) {
    const root = new THREE.Group(); root.userData.itemId = plots[index]?.id; residentsGroup.add(root);
    groundDisc(root, '#bcb593', 0, 0, .6, .4, .08);
    const color = ['#edc369', '#b5ced0', '#d7a8a1'][index];
    const body = mesh(root, sphere, color, 0, 1.05, 0, .58, .72, .48);
    for (const x of [-.2, .2]) {
      mesh(root, sphere, '#f9f2dc', x, 1.26, .4, .14, .17, .09);
      mesh(root, sphere, '#425e57', x, 1.26, .48, .065, .085, .04);
      const antenna = mesh(root, cylinder, color, x * 1.4, 1.88, 0, .055, .55, .055); antenna.rotation.z = -x * .8;
      mesh(root, sphere, color, x * 1.7, 2.14, 0, .11, .11, .11);
    }
    const legs = [-.27, .27].map(x => mesh(root, sphere, '#8d805f', x, .28, .08, .16, .23, .25));
    residents.push({ root, body, legs });
  }
  function addDecoration(row: OwnedDecoration) {
    const p = row.placement!;
    const root = new THREE.Group(); root.position.set((p.x - 2.5) * 1.65, .47, (p.y - 2.5) * 1.65); decorationGroup.add(root);
    if (row.sku === 'plant' || row.sku === 'flowerbed') {
      mesh(root, box, '#b39169', 0, .17, 0, row.sku === 'flowerbed' ? 2.4 : .7, .35, .7);
      for (let i = 0; i < (row.sku === 'flowerbed' ? 4 : 1); i++) mesh(root, sphere, '#759c65', (i - (row.sku === 'flowerbed' ? 1.5 : 0)) * .5, .62, 0, .35, .45, .35);
    } else if (row.sku === 'bench') {
      mesh(root, box, '#9d7957', .65, .55, 0, 2.4, .2, .7); mesh(root, box, '#9d7957', .65, 1, -.3, 2.4, .8, .12);
      for (const x of [-.2, 1.5]) mesh(root, box, '#59675e', x, .25, 0, .14, .5, .65);
    } else if (row.sku === 'lamp') {
      mesh(root, cylinder, '#637469', 0, 1.3, 0, .09, 2.6, .09); mesh(root, box, '#f5d593', 0, 2.7, 0, .5, .6, .5);
    } else {
      mesh(root, cylinder, '#c7c2ab', .6, .2, .6, 1.25, .4, 1.25); groundDisc(root, '#84b8c4', .6, .6, 1.08, 1.08, .42);
      mesh(root, cylinder, '#c7c2ab', .6, .8, .6, .24, 1.2, .24); mesh(root, sphere, '#8bbfc8', .6, 1.45, .6, .3, .48, .3);
    }
  }
  let disposed = false, paused = false, frame = 0, last = 0, time = 0;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  function draw(now = performance.now()) {
    if (disposed) return;
    const moving = !paused && !reduced.matches && !document.hidden;
    if (!last || now - last >= 1000 / 30 || !moving) {
      if (moving && last) time += Math.min((now - last) / 1000, .1);
      last = now;
      residents.forEach((r, i) => {
        const p = residentPose(time, i); r.root.position.set(p.x, .22, p.z); r.root.rotation.y = p.rotation;
        const step = moving && p.walking ? Math.sin(time * 9 + i) : 0;
        r.body.position.y = 1.05 + Math.abs(step) * .08;
        r.legs.forEach((leg, n) => { leg.position.z = .08 + step * (n ? -.16 : .16); });
      });
      canvas.dataset.camera = [...camera.position.toArray(), ...controls.target.toArray(), camera.zoom].map(n => n.toFixed(3)).join(',');
      renderer.render(scene, camera);
    }
    if (moving) frame = requestAnimationFrame(draw);
  }
  function redraw() { cancelAnimationFrame(frame); last = 0; draw(); }
  function resize() {
    const width = host.clientWidth, height = host.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height);
    const aspect = width / height, halfHeight = aspect < 1 ? 30 / aspect : 29;
    camera.left = -halfHeight * aspect; camera.right = halfHeight * aspect;
    camera.top = halfHeight; camera.bottom = -halfHeight; camera.updateProjectionMatrix(); redraw();
  }
  function reset() { camera.position.set(34, 38, 42); camera.zoom = 1; controls.target.set(0, 0, 0); camera.updateProjectionMatrix(); controls.update(); redraw(); }
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
  let down: { x: number; y: number; moved: boolean } | undefined;
  const pointers = new Set<number>();
  function pick(event: PointerEvent) {
    const rect = canvas.getBoundingClientRect();
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects([...plotsGroup.children, ...residentsGroup.children], true)[0];
    let object = hit?.object as THREE.Object3D | undefined;
    while (object && !object.userData.itemId) object = object.parent ?? undefined;
    return object?.userData.itemId as string | undefined;
  }
  function pointerDown(event: PointerEvent) {
    pointers.add(event.pointerId);
    if (pointers.size > 1) { if (down) down.moved = true; return; }
    if (event.button === 0) down = { x: event.clientX, y: event.clientY, moved: false }; else down = undefined;
  }
  function pointerMove(event: PointerEvent) {
    if (down && Math.hypot(event.clientX - down.x, event.clientY - down.y) > 6) down.moved = true;
    if (!down) { const id = pick(event); canvas.style.cursor = id ? 'pointer' : 'grab'; canvas.title = plots.find(p => p.id === id)?.word ?? ''; }
  }
  function pointerUp(event: PointerEvent) { pointers.delete(event.pointerId); if (down && !down.moved) { const id = pick(event); if (id) onSelect(id); } down = undefined; }
  function cancel(event: PointerEvent) { pointers.delete(event.pointerId); down = undefined; }
  function contextLost(event: Event) { event.preventDefault(); onLost(); }
  canvas.addEventListener('pointerdown', pointerDown); canvas.addEventListener('pointermove', pointerMove);
  canvas.addEventListener('pointerup', pointerUp); canvas.addEventListener('pointercancel', cancel); canvas.addEventListener('webglcontextlost', contextLost);
  controls.addEventListener('change', redraw);
  document.addEventListener('visibilitychange', redraw); reduced.addEventListener('change', redraw);
  const observer = new ResizeObserver(resize); observer.observe(host); reset(); resize();
  return {
    update(nextPlots, selected, decorations) {
      const key = nextPlots.map(p => `${p.id}:${p.stage}:${p.built}:${p.word}`).join('|');
      if (key !== plotKey) {
        plotKey = key; plots = nextPlots; positions = town3DPositions(plots.length);
        // Cached geometry/materials live until scene disposal; clearing groups does not allocate textures.
        plotsGroup.clear(); residentsGroup.clear(); residents.length = 0;
        plots.forEach(addHouse); for (let i = 0; i < Math.min(3, plots.length); i++) makeResident(i);
      }
      const placed = decorations.filter(d => d.placement?.town === 'LV1/1'), dKey = JSON.stringify(placed);
      if (dKey !== decorationKey) { decorationKey = dKey; decorationGroup.clear(); placed.forEach(addDecoration); }
      selectedId = selected;
      const p = positions[plots.findIndex(plot => plot.id === selectedId)]; selection.visible = !!p;
      if (p) selection.position.set(p.x, .4, p.z);
      redraw();
    },
    zoom(factor) { camera.zoom = THREE.MathUtils.clamp(camera.zoom * factor, controls.minZoom, controls.maxZoom); camera.updateProjectionMatrix(); redraw(); },
    reset,
    focus(id) { const p = positions[plots.findIndex(plot => plot.id === id)]; if (!p) return; const delta = new THREE.Vector3(p.x, 0, p.z).sub(controls.target); controls.target.add(delta); camera.position.add(delta); camera.zoom = 2; camera.updateProjectionMatrix(); controls.update(); redraw(); },
    pause(value) { paused = value; redraw(); },
    dispose() {
      disposed = true; cancelAnimationFrame(frame); observer.disconnect(); controls.dispose();
      document.removeEventListener('visibilitychange', redraw); reduced.removeEventListener('change', redraw);
      canvas.removeEventListener('pointerdown', pointerDown); canvas.removeEventListener('pointermove', pointerMove);
      canvas.removeEventListener('pointerup', pointerUp); canvas.removeEventListener('pointercancel', cancel); canvas.removeEventListener('webglcontextlost', contextLost);
      geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); scene.clear(); renderer.dispose(); renderer.forceContextLoss(); canvas.remove();
    },
  };
}
