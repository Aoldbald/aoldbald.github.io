// 冰淇淋小店：屋顶巨型甜筒、弯弯小河、花束和摇尾巴的小柴犬
import * as THREE from 'three';
export const color = '#a58bd0';

export function build(g, k) {
  const { C, TOP, box, cyl, cone, ball, mesh } = k;

  // 小店：奶油墙 + 粉屋檐 + 门窗（门朝 +z）
  const s = new THREE.Group(); s.position.set(0.6, TOP, -1.6);
  s.add(box(3.4, 2.4, 2.4, C.cream, 0, 1.2, 0));
  s.add(box(3.9, 0.35, 2.9, C.pink, 0, 2.55, 0));
  s.add(box(1.0, 1.5, 0.12, C.wood, 0.7, 0.75, 1.23));        // 门
  s.add(box(0.9, 0.8, 0.12, C.glass, -0.9, 1.3, 1.23));       // 窗
  s.add(box(1.1, 0.25, 0.7, C.pink, -0.9, 1.85, 1.5));        // 窗上小雨篷
  g.add(s);

  // 屋顶巨型甜筒：倒 cone + 巧克力球 + 蓝莓球，整体慢慢转
  const top = new THREE.Group(); top.position.set(0.6, TOP + 2.75, -1.6);
  const waf = cone(0.95, 2.2, 8, C.fried, 0, 1.1, 0); waf.rotation.x = Math.PI; top.add(waf);
  top.add(ball(1.0, C.choco, 0, 2.5, 0, 1));
  top.add(ball(0.85, C.berry, 0, 3.4, 0, 1));
  top.add(ball(0.2, C.red, 0, 4.3, 0, 0));
  g.add(top);

  // 小河：4 段扁 box 首尾重叠 + 每个拐点一个同色扁圆盘，从左后斜着弯到前方
  const pts = [[-3.6, -0.4], [-2.6, 1.0], [-2.2, 2.4], [-1.2, 3.5], [0.2, 4.2]];
  const segRot = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, z0] = pts[i], [x1, z1] = pts[i + 1];
    const len = Math.hypot(x1 - x0, z1 - z0) + 0.3;
    const r = box(len, 0.04, 0.95, C.blue, (x0 + x1) / 2, TOP + 0.03, (z0 + z1) / 2);
    r.rotation.y = -Math.atan2(z1 - z0, x1 - x0); segRot.push(r.rotation.y);
    r.userData.noShadow = true; g.add(r);
  }
  pts.forEach(([x, z]) => {
    const j = cyl(0.475, 0.475, 0.04, 10, C.blue, x, TOP + 0.03, z); j.userData.noShadow = true; g.add(j);
  });
  // 小木板桥：架在第 2、3 段交界处，桥身垂直于水流
  const br = new THREE.Group(); br.position.set(-2.4, TOP, 1.7); br.rotation.y = segRot[1];
  br.add(box(1.0, 0.12, 1.9, C.wood, 0, 0.18, 0));
  br.add(box(0.1, 0.4, 1.9, C.darkwood, -0.5, 0.35, 0));
  br.add(box(0.1, 0.4, 1.9, C.darkwood, 0.5, 0.35, 0));
  g.add(br);

  // 花束：三朵小花 + 绿色细茎，放在店门口小路旁
  const fl = new THREE.Group(); fl.position.set(1.8, TOP, 0.9);
  fl.rotation.z = 0.15;
  fl.add(cyl(0.05, 0.05, 0.9, 5, C.leaf, 0, 0.45, 0));
  fl.add(ball(0.22, C.pink, -0.18, 1.0, 0, 1));
  fl.add(ball(0.22, C.yellow, 0.18, 1.0, 0.05, 1));
  fl.add(ball(0.22, C.snow, 0, 1.15, -0.1, 1));
  fl.add(cone(0.35, 0.4, 5, C.cream, 0, 0.15, 0));
  g.add(fl);

  return {
    update(t) {
      top.rotation.y = t * 0.4;
    },
    sig: () => top.rotation.y.toFixed(3),
  };
}
