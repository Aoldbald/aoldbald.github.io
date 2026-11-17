// 小岛之间的木桥；最后一段（通往"下一站？"）隔一块铺一块，表示还没修好
import * as THREE from 'three';

export function buildBridges(scene, positions, kit, rnd) {
  const { C, R, TOP, box } = kit;
  if (positions.length < 2) return;
  for (let i = 0; i < positions.length - 1; i++) {
    const a = new THREE.Vector3(positions[i].x,0,positions[i].z), b = new THREE.Vector3(positions[i+1].x,0,positions[i+1].z);
    const dir=b.clone().sub(a).normalize(), s=a.clone().addScaledVector(dir,R-0.3), e=b.clone().addScaledVector(dir,-(R-0.3));
    const L=s.distanceTo(e), n=Math.max(2,Math.floor(L/0.75)), ang=Math.atan2(dir.x,dir.z);
    const last = i === positions.length - 2;
    for (let k = 0; k <= n; k++) {
      if (last && k % 2) continue;
      const pl=box(2.4,0.22,0.5,C.wood); pl.position.copy(s).lerp(e,k/n); pl.position.y=TOP-0.12;
      pl.rotation.y=ang+(rnd()-.5)*0.08; pl.castShadow=pl.receiveShadow=true; scene.add(pl);
    }
  }
}
