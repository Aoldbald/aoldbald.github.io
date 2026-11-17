// 咖啡店：奶油色小屋 + 粉色遮阳篷 + 门口小圆桌
import * as THREE from 'three';
export const color = '#e9a37a';

export function build(g, k) {
  const { C, TOP, box, cyl, cone } = k;
  const h = new THREE.Group(); h.position.set(-0.8, TOP, -1.4);
  h.add(box(4,2.6,3,C.cream,0,1.3,0));
  const roof = cone(3.3,1.8,4,C.roof,0,3.5,0); roof.rotation.y = Math.PI/4; h.add(roof);
  h.add(box(0.9,1.5,0.1,0x8a6a4f,0,0.75,1.52));
  h.add(box(0.8,0.7,0.1,0xbfe3f0,-1.3,1.5,1.52)); h.add(box(0.8,0.7,0.1,0xbfe3f0,1.3,1.5,1.52));
  const aw = box(4.2,0.15,1.1,C.pink,0,2.35,1.95); aw.rotation.x = 0.4; h.add(aw);
  h.add(box(0.3,0.9,0.3,C.trunk,0.6,3.9,-0.6));
  g.add(h);
  g.add(cyl(0.7,0.7,0.12,10,C.cream,0.6,TOP+0.9,2.1));
  g.add(cyl(0.08,0.08,0.9,5,0x8a6a4f,0.6,TOP+0.45,2.1));
  g.add(cyl(0.12,0.1,0.25,8,0xffffff,0.4,TOP+1.08,2.0));
  g.add(cyl(0.12,0.1,0.25,8,0xffffff,0.85,TOP+1.08,2.25));
  g.add(box(0.5,0.5,0.5,C.roof,-0.5,TOP+0.25,2.3)); g.add(box(0.5,0.5,0.5,C.blue,1.7,TOP+0.25,1.9));
}
