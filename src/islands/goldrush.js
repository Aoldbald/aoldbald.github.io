// 淘金小镇：两栋深色木屋 + 红灯笼拱门 + 金块矿车 + 三明治与小蜜蜂
import * as THREE from 'three';
export const color = '#c9a27a';
export const trees = false;

export function build(g, k, rnd) {
  const { C, TOP, box, cyl, ball, mesh, tree } = k;

  // 木屋：深木墙 + 人字顶（两片斜板）+ 门窗，门朝 +z
  const cabin = (x, z, w, h, d) => {
    const c = new THREE.Group(); c.position.set(x, TOP, z);
    c.add(box(w, h, d, C.darkwood, 0, h / 2, 0));
    [-1, 1].forEach(s => {
      const r = box(w + 0.4, 0.18, d * 0.75, C.wood, 0, h + 0.4, s * d * 0.25);
      r.rotation.x = s * 0.6; c.add(r);
    });
    c.add(box(0.7, 1.2, 0.1, C.wood, -w * 0.18, 0.6, d / 2 + 0.03));       // 门
    c.add(box(0.6, 0.55, 0.1, C.cream, w * 0.25, h * 0.6, d / 2 + 0.03));   // 窗
    g.add(c);
  };
  cabin(-2.4, -2.0, 2.6, 1.7, 2.0);
  cabin(2.5, -2.2, 2.4, 1.5, 1.9);

  // 拱门：两根红柱 + 横梁，下挂 5 个红灯笼
  const arch = new THREE.Group(); arch.position.set(0, TOP, -0.2);
  [-1.9, 1.9].forEach(x => arch.add(box(0.3, 3.4, 0.3, C.red, x, 1.7, 0)));
  arch.add(box(4.4, 0.35, 0.4, C.red, 0, 3.5, 0));
  arch.add(box(4.9, 0.12, 0.5, C.gold, 0, 3.78, 0));
  const lanterns = [];
  for (let i = 0; i < 5; i++) {
    const p = new THREE.Group(); p.position.set(-1.5 + i * 0.75, 3.3, 0.05);
    p.add(cyl(0.02, 0.02, 0.3, 4, C.ink, 0, -0.15, 0));
    const b = ball(0.28, C.red, 0, -0.6, 0, 1); b.scale.y = 0.8; p.add(b);
    p.add(cyl(0.12, 0.12, 0.08, 6, C.gold, 0, -0.35, 0));
    p.add(cyl(0.12, 0.12, 0.08, 6, C.gold, 0, -0.83, 0));
    arch.add(p); lanterns.push(p);
  }
  g.add(arch);

  // 矿车：炭灰车斗 + 四个轮子 + 三块金子 + 一小段轨道
  const cart = new THREE.Group(); cart.position.set(-3.1, TOP, 1.3); cart.rotation.y = 0.4;
  cart.add(box(2.2, 0.08, 0.1, C.darkwood, 0, 0.04, 0.6));
  cart.add(box(2.2, 0.08, 0.1, C.darkwood, 0, 0.04, -0.6));
  cart.add(box(1.6, 0.8, 1.1, C.charcoal, 0, 0.7, 0));
  [[-0.5, 0.65], [0.5, 0.65], [-0.5, -0.65], [0.5, -0.65]].forEach(([x, z]) => {
    const w = cyl(0.22, 0.22, 0.12, 8, C.ink, x, 0.28, z); w.rotation.x = Math.PI / 2; cart.add(w);
  });
  [[-0.35, 0.05], [0.3, 0.2], [0.05, -0.25]].forEach(([x, z]) => cart.add(ball(0.32, C.gold, x, 1.2, z, 0)));
  g.add(cart);

  // 小桌 + 三明治 + 蜜蜂
  const tx = -0.4, tz = 3.0;
  g.add(cyl(0.12, 0.12, 0.8, 5, C.wood, tx, TOP + 0.4, tz));
  g.add(cyl(0.75, 0.75, 0.12, 8, C.wood, tx, TOP + 0.86, tz));
  g.add(box(0.8, 0.14, 0.6, C.fried, tx, TOP + 0.99, tz));
  g.add(box(0.76, 0.1, 0.56, C.leaf, tx, TOP + 1.11, tz));
  g.add(box(0.8, 0.14, 0.6, C.fried, tx, TOP + 1.23, tz));
  const wingMat = new THREE.MeshStandardMaterial({ color: C.snow, transparent: true, opacity: 0.6, roughness: 1, flatShading: true });
  const bee = new THREE.Group();
  bee.add(ball(0.18, C.yellow, 0, 0, 0, 1));
  [-0.07, 0.07].forEach(x => { const s = box(0.04, 0.3, 0.3, C.ink, x, 0, 0); bee.add(s); });
  [-1, 1].forEach(s => {
    const w = mesh(new THREE.BoxGeometry(0.22, 0.03, 0.14), wingMat, s * 0.16, 0.18, 0);
    w.userData.noShadow = true; w.rotation.z = s * 0.4; bee.add(w);
  });
  g.add(bee);

  // 两棵松树，躲在站位区外
  tree(g, -4.0, -0.2, 0.8, 1, rnd);
  tree(g, 4.0, -0.8, 0.75, 1, rnd);

  let beeAng = 0;
  return {
    update(t) {
      lanterns.forEach((p, i) => { p.rotation.z = Math.sin(t * 1.6 + i * 0.8) * 0.15; });
      beeAng = t * 2.2;
      bee.position.set(tx + Math.cos(beeAng) * 0.65, TOP + 1.8 + Math.sin(t * 5) * 0.06, tz + Math.sin(beeAng) * 0.65);
      bee.rotation.y = -beeAng;
    },
    sig: () => bee.position.x.toFixed(3),
  };
}
