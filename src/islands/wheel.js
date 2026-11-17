// 摩天轮：缓慢转动，车厢始终保持水平
import * as THREE from 'three';
export const color = '#f19bb0';

export function build(g, k) {
  const { C, TOP, box, cone, ball, mesh } = k;
  const w = new THREE.Group(); w.position.set(-0.8, TOP+4.4, -1.2);
  const cabins = [];
  w.add(mesh(new THREE.TorusGeometry(3,0.15,6,20),C.pink));
  for (let i=0;i<8;i++){
    const a=i/8*Math.PI*2;
    const s=box(0.12,3,0.12,C.cream); s.position.set(Math.cos(a)*1.5,Math.sin(a)*1.5,0); s.rotation.z=a-Math.PI/2; w.add(s);
    const cab=box(0.65,0.65,0.65,[C.roof,C.blue,C.yellow,C.leaf2][i%4]); cab.position.set(Math.cos(a)*3,Math.sin(a)*3,0);
    w.add(cab); cabins.push(cab);
  }
  w.add(ball(0.35,C.cream,0,0,0,0));
  g.add(w);
  [-1,1].forEach(sx=>{ const l=box(0.25,4.8,0.25,C.cream,-0.8+sx*1.25,TOP+2.2,-1.6); l.rotation.z=sx*0.28; g.add(l); });
  g.add(box(1.2,1.4,1.2,C.blue,2.9,TOP+0.7,-0.6));
  const r=cone(1,0.8,4,C.yellow,2.9,TOP+1.8,-0.6); r.rotation.y=Math.PI/4; g.add(r);
  return {
    update(t, dt) {
      w.rotation.z += dt*0.35;
      cabins.forEach(c => { c.rotation.z = -w.rotation.z; });
    },
    sig: () => w.rotation.z.toFixed(3),
  };
}
