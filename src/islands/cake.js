// 蛋糕：蜡烛火苗闪烁，三只气球上下飘
import * as THREE from 'three';
export const color = '#e7b85c';

export function build(g, k) {
  const { C, TOP, box, cyl, ball, flameMat } = k;
  const c = new THREE.Group(); c.position.set(-0.8, TOP, -1.2);
  const flames = [], balloons = [];
  c.add(cyl(2,2,1.2,12,C.pink,0,0.6,0)); c.add(cyl(2.05,2.05,0.25,12,C.cream,0,1.25,0));
  c.add(cyl(1.4,1.4,1,12,C.cream,0,1.85,0)); c.add(cyl(1.45,1.45,0.2,12,C.pink,0,2.4,0));
  for (let i=0;i<5;i++){ const a=i/5*Math.PI*2, x=Math.cos(a)*0.8, z=Math.sin(a)*0.8;
    c.add(cyl(0.08,0.08,0.7,5,C.blue,x,2.85,z));
    const f=ball(0.14,flameMat,x,3.32,z,0); c.add(f); flames.push(f); }
  g.add(c);
  [[2.6,-0.6,C.roof],[3.4,-1.6,C.blue],[2.2,-2.4,C.yellow]].forEach(([x,z,col],i)=>{
    const b=new THREE.Group(); b.position.set(x,TOP,z);
    b.add(ball(0.55,col,0,4,0,1)); b.add(box(0.03,3.4,0.03,0xffffff,0,2.1,0));
    g.add(b); balloons.push({ b, phase: i*1.7 });
  });
  g.add(box(0.9,0.9,0.9,C.blue,-3,TOP+0.45,1.6)); g.add(box(0.95,0.95,0.22,C.yellow,-3,TOP+0.45,1.6));
  return {
    update(t) {
      flames.forEach((f,i)=>f.scale.setScalar(0.85+Math.sin(t*12+i*2)*0.15));
      balloons.forEach(({b,phase})=>{ b.position.y = TOP+Math.sin(t*1.4+phase)*0.25; });
    },
    sig: () => balloons[0].b.position.y.toFixed(3),
  };
}
