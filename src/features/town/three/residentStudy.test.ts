import { expect, it } from 'vitest';
import * as THREE from 'three';
import reviewed from '../../vocabulary/lv1ReviewedImages.json';
import { RESIDENT_STUDIES, residentStudies } from './residentIdentity';
import { createResidentStudy, poseResident } from './createResidentStudy';

it('binds only the two reviewed illustration actors by source ID, dictionary ID and spelling', () => {
  const plots = reviewed.filter(card => card.unit === 1).map(card => ({id:card.id,wordId:card.officialWordId ?? undefined,word:card.displayWord,built:false}));
  expect(residentStudies([...plots].reverse()).map(study => study.word)).toEqual(['boy','girl']);
  expect(residentStudies(plots.filter(plot => plot.word==='man'))).toEqual([]);
  expect(residentStudies(plots.map(plot => ({...plot,wordId:'wrong'})))).toEqual([]);
  expect(residentStudies(plots.map(plot => ({...plot,id:'wrong'})))).toEqual([]);
  for (const study of RESIDENT_STUDIES) {
    const card=reviewed.find(card => card.id === study.itemId)!;
    expect(card).toMatchObject({unit:1,officialWordId:study.wordId,displayWord:study.word,illustration:{path:study.source}});
  }
});

it('keeps the entire face and accessories on the walking rig without accumulating geometry', () => {
  const geometries = new Set<THREE.BufferGeometry>(), materials = new Map<string,THREE.Material>();
  const geometry = <T extends THREE.BufferGeometry>(g:T) => {geometries.add(g);return g;};
  const material = (color:string) => {if(!materials.has(color))materials.set(color,new THREE.MeshBasicMaterial({color}));return materials.get(color)!;};
  let triangles=0, meshes=0;
  for (const study of RESIDENT_STUDIES) {
    const rig=createResidentStudy(study,geometry,material), count=geometries.size;
    expect(rig.root.userData.itemId).toBe(study.itemId);
    expect(rig.upper.getObjectByName(study.appearance==='scarf'?'blue-scarf':'pink-bow')).toBeDefined();
    if(study.appearance==='bow-backpack')expect(rig.upper.getObjectByName('backpack')).toBeDefined();
    const eye=rig.upper.getObjectByName('eye-1')!, body=rig.upper.getObjectByName('bean-body')!;
    const offset=eye.getWorldPosition(new THREE.Vector3()).sub(body.getWorldPosition(new THREE.Vector3()));
    for(const step of [-1,0,.5,1,0]) {
      poseResident(rig,step);rig.root.updateMatrixWorld(true);
      expect(eye.getWorldPosition(new THREE.Vector3()).sub(body.getWorldPosition(new THREE.Vector3())).distanceTo(offset)).toBeLessThan(1e-10);
      expect(rig.legs[0].rotation.x).toBe(-rig.legs[1].rotation.x);
    }
    expect(geometries.size).toBe(count);
    rig.root.traverse(object=>{if(object instanceof THREE.Mesh){meshes++;triangles+=(object.geometry.index?.count ?? object.geometry.attributes.position.count)/3;}});
    // Exercise the larger touch volume outside the visible body's silhouette.
    const ray=new THREE.Raycaster(new THREE.Vector3(.79,1.2,6),new THREE.Vector3(0,0,-1));
    expect(ray.intersectObject(rig.root,true).some(hit=>hit.object.userData.residentHitArea)).toBe(true);
  }
  expect(triangles).toBeLessThan(18_000);expect(meshes).toBeLessThan(90);
  geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
});
