// 下一站：空岛上的“下一站？”木牌、示意二维码木牌（假的）和待铺的木板
import * as THREE from 'three';
export const color = '#b9a7d6';

export function build(g, k, rnd) {
  const { C, TOP, box, cyl, mat, textTexture, qrTexture } = k;
  g.add(cyl(0.12,0.12,2.6,5,C.trunk,-0.8,TOP+1.3,-0.6));
  const wood = mat(C.wood);
  const front = new THREE.MeshStandardMaterial({ map:textTexture([['下一站？',120,128]]), roughness:1 });
  const s = new THREE.Mesh(new THREE.BoxGeometry(2.8,1.4,0.15),[wood,wood,wood,wood,front,wood]);
  s.position.set(-0.8,TOP+2.4,-0.5); g.add(s);
  g.add(cyl(0.1,0.1,1.6,5,C.trunk,2.4,TOP+0.8,-1.2));
  const qr = new THREE.MeshStandardMaterial({ map:qrTexture(rnd), roughness:1 });
  const q = new THREE.Mesh(new THREE.BoxGeometry(1.4,1.4,0.12),[wood,wood,wood,wood,qr,wood]);
  q.position.set(2.4,TOP+1.9,-1.15); q.rotation.y=-0.25; g.add(q);
  for (let i=0;i<4;i++) g.add(box(0.5,0.12,0.5,C.wood,-3+i*0.7,TOP+0.06,1.8+(i%2)*0.4));
}
