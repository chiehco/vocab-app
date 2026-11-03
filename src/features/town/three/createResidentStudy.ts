import * as THREE from 'three';
import type { ResidentStudy } from './residentIdentity';

export interface ResidentRig {
  root: THREE.Group; upper: THREE.Group; legs: THREE.Group[]; arms: THREE.Group[];
}
/** Original low-poly reinterpretation of the two already-reviewed context actors.
 * No illustration pixels or third-party models are baked into the meshes. */
export function createResidentStudy(study: ResidentStudy, geometry: <T extends THREE.BufferGeometry>(g: T) => T,
  material: (color: string) => THREE.Material): ResidentRig {
  const root = new THREE.Group(), upper = new THREE.Group();
  root.userData.itemId = study.itemId; root.userData.residentKey = study.key; root.add(upper);
  const bean = '#a8aa70', dark = '#565a3a', limb = '#777e4b';
  const sphere = geometry(new THREE.IcosahedronGeometry(1, 2));
  const box = geometry(new THREE.BoxGeometry(1, 1, 1));
  function part(parent: THREE.Object3D, g: THREE.BufferGeometry, color: string, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1) {
    const mesh = new THREE.Mesh(g, material(color)); mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz); parent.add(mesh); return mesh;
  }
  function tube(parent: THREE.Object3D, color: string, points: number[][], radius: number, segments = 10) {
    return part(parent, geometry(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(p[0], p[1], p[2]))), segments, radius, 5, false)), color, 0, 0, 0);
  }
  part(upper, sphere, bean, 0, 1.14, 0, .61, .88, .45).name = 'bean-body';
  // Dark oval eyes, curved brows, warm cheeks and hook-shaped antennae match the
  // visible features; the former white-eyed toy shapes were unrelated placeholders.
  for (const side of [-1, 1]) {
    part(upper, sphere, dark, side * .19, 1.4, .429, .063, .102, .038).name = `eye-${side}`;
    tube(upper, dark, [[side * .27, 1.64, .37], [side * .2, 1.69, .40], [side * .13, 1.65, .4]], .018, 5);
    part(upper, sphere, '#c4a277', side * .36, 1.18, .361, .09, .065, .025);
    tube(upper, dark, [[side * .23, 1.91, -.01], [side * .31, 2.24, -.01], [side * .48, 2.36, -.01], [side * .57, 2.25, .01]], .038);
  }
  const smile = new THREE.Shape(); smile.moveTo(-.13,.03); smile.lineTo(.13,.03);
  smile.quadraticCurveTo(.09,-.14,0,-.14); smile.quadraticCurveTo(-.09,-.14,-.13,.03); smile.closePath();
  part(upper, geometry(new THREE.ExtrudeGeometry(smile,{depth:.025,bevelEnabled:false,curveSegments:5})), dark, 0, 1.13, .439);
  part(upper, sphere, '#ce9379', 0, 1.025, .471, .065, .03, .015);
  const arms = [-1, 1].map(side => {
    const arm = new THREE.Group(); arm.position.set(side * .51, 1.24, 0); upper.add(arm);
    tube(arm, limb, [[0,0,0],[side * .13,-.2,.03],[side * .12,-.48,.08]], .035, 7);
    part(arm, sphere, limb, side * .12, -.48, .08, .085, .11, .065); return arm;
  });
  const legs = [-1, 1].map(side => {
    const leg = new THREE.Group(); leg.position.set(side * .22, .44, 0); root.add(leg);
    tube(leg, limb, [[0,0,0],[0,-.2,.015],[0,-.35,.09]], .038, 7);
    part(leg, sphere, limb, 0, -.35, .14, .095, .052, .15); return leg;
  });
  // Raycaster includes invisible geometry; a larger pick volume keeps moving
  // limbs and antennae from making touch targets flicker between hits.
  const hit = part(root, sphere, bean, 0, 1.05, 0, .85, 1.35, .7);
  hit.visible = false; hit.userData.residentHitArea = true;
  if (study.appearance === 'scarf') {
    tube(upper, '#698b9a', [[-.53,1.12,.20],[-.32,.94,.40],[0,.87,.47],[.32,.94,.40],[.53,1.12,.20]], .055);
    part(upper, sphere, '#547584', 0, .87, .49, .085, .075, .055).name = 'blue-scarf';
    for (const side of [-1, 1]) {
      const tie = part(upper, sphere, '#698b9a', side * .105, .7, .46, .075, .2, .035); tie.rotation.z = side * -.4;
    }
  } else {
    part(upper, sphere, '#a47b50', 0, 1.11, -.45, .43, .55, .22).name = 'backpack';
    part(upper, box, '#b68b5b', 0, 1.24, -.64, .63, .3, .07);
    part(upper, box, '#d0ad73', 0, 1.08, -.69, .09, .14, .04);
    for (const side of [-1, 1]) tube(upper, '#a78055', [[side*.38,.78,.17],[side*.45,1.45,.14],[side*.32,1.68,-.24],[side*.3,1.3,-.52]], .04);
    const ribbon = new THREE.Shape(); ribbon.moveTo(0,0); ribbon.lineTo(.21,.14); ribbon.lineTo(.25,-.1); ribbon.lineTo(.02,-.03); ribbon.closePath();
    const ribbonGeometry=geometry(new THREE.ExtrudeGeometry(ribbon,{depth:.06,bevelEnabled:false}));
    for (const side of [-1, 1]) part(upper,ribbonGeometry,'#cc8c7b',.28,1.98,.26,side,1,1);
    part(upper, sphere, '#b7796a', .28, 1.98, .31, .07, .075, .045).name = 'pink-bow';
  }
  return { root, upper, legs, arms };
}

export function poseResident(rig: ResidentRig, step: number) {
  rig.upper.position.y = Math.abs(step) * .045;
  rig.legs.forEach((leg, i) => { leg.rotation.x = step * (i ? -.32 : .32); });
  rig.arms.forEach((arm, i) => { arm.rotation.x = step * (i ? .26 : -.26); });
}
