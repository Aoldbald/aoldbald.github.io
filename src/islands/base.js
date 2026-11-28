// 每座小岛共用的底座：八角土台、草地（或沙地）、四棵树、十朵小花、白色泡沫圈
import * as THREE from 'three';

const TREE_SPOTS = [[-4,-2.6],[-4.6,0.6],[4.2,-3.2],[-2.4,-4.3]];

export function buildBase(g, theme, rnd, kit) {
  const { C, R, TOP, cyl, ball, tree } = kit;
  g.add(cyl(R+0.2,R-0.7,2,8,C.earth,0,0,0));
  g.add(cyl(R,R+0.2,0.5,8,theme?.ground==='sand'?C.sand:C.grass,0,1.25,0));
  if (theme?.trees !== false)
    TREE_SPOTS.forEach(([x,z]) => tree(g,x,z,0.9+Math.floor(rnd()*3)*0.15,rnd()<.5?0:1,rnd));
  for (let k=0;k<10;k++){
    const a=rnd()*6.28, r=2.5+rnd()*3;
    g.add(ball(0.13,[0xffffff,C.pink,C.yellow][k%3],Math.cos(a)*r,TOP+0.1,Math.sin(a)*r,0));
  }
  const foam = new THREE.Mesh(new THREE.RingGeometry(R+0.3,R+1.1,8).rotateX(-Math.PI/2),
    new THREE.MeshBasicMaterial({ color:0xffffff, transparent:true, opacity:0.45 }));
  foam.position.y = 0.02; foam.userData.noShadow = true; g.add(foam);
  return foam;
}
