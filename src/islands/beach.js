// 海滩：沙地、遮阳伞、棕榈树、海里摇晃的小船
import * as THREE from 'three';
export const color = '#6fb6b0';
export const ground = 'sand';
export const trees = false;

export function build(g, k) {
  const { C, TOP, box, cyl, cone, ball } = k;
  g.add(cyl(0.06,0.06,2.6,5,0xffffff,-0.6,TOP+1.3,-0.8));
  g.add(cone(1.8,0.8,8,C.roof,-0.6,TOP+2.7,-0.8));
  g.add(box(1,0.05,2,C.blue,0.4,TOP+0.03,0));
  g.add(ball(0.35,C.yellow,-1.8,TOP+0.35,0.8,1));
  [[-3.4,-2.2],[3.2,-2.8]].forEach(([x,z])=>{
    const p=new THREE.Group(); p.position.set(x,TOP,z);
    for (let i=0;i<5;i++) p.add(cyl(0.18,0.22,0.8,5,C.trunk,i*0.12,0.4+i*0.75,0));
    for (let i=0;i<6;i++){ const a=i/6*Math.PI*2; const l=box(1.8,0.08,0.5,C.leaf);
      l.position.set(0.6+Math.cos(a)*0.8,4,Math.sin(a)*0.8); l.rotation.y=-a; l.rotation.z=-0.35; p.add(l); }
    g.add(p);
  });
  const boat=new THREE.Group(); boat.position.set(7.6,0.25,3.5); boat.rotation.y=0.5;
  boat.add(box(2.2,0.5,0.9,C.cream,0,0,0)); boat.add(cyl(0.05,0.05,2,4,C.trunk,0,1.2,0));
  boat.add(cone(0.8,1.6,3,0xffffff,0.35,1.3,0));
  g.add(boat);
  return {
    update(t) {
      boat.position.y = 0.25+Math.sin(t*1.6)*0.08;
      boat.rotation.z = Math.sin(t*1.3)*0.05;
    },
    sig: () => boat.position.y.toFixed(3),
  };
}
