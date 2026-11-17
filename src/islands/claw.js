// 娃娃机 + 大头贴亭：爪子左右移动并周期下探，闪光灯跟着闪
import * as THREE from 'three';
export const color = '#f19bb0';

export function build(g, k) {
  const { C, TOP, box, cyl, ball, mesh } = k;

  // 娃娃机：粉色底柜 + 半透明玻璃罩 + 黄色顶盖
  const m = new THREE.Group(); m.position.set(-1.4, TOP, -1.0);
  m.add(box(2.8, 2.0, 2.4, C.pink, 0, 1.0, 0));
  m.add(box(1.2, 0.5, 0.15, C.yellow, -0.6, 1.3, 1.25));     // 控制台
  m.add(ball(0.18, C.red, -0.9, 1.65, 1.3, 0));               // 按钮
  m.add(box(0.8, 0.7, 0.15, C.charcoal, 0.8, 0.7, 1.22));     // 出口
  const plush = [C.red, C.yellow, C.blue, C.berry, C.pumpkin, C.leaf2, C.cream];
  [[-0.8,-0.4],[0,-0.5],[0.8,-0.3],[-0.4,0.4],[0.5,0.4],[-0.9,0.5],[0.1,0]].forEach(([x, z], i) => {
    m.add(ball(0.42, plush[i], x, i === 6 ? 2.95 : 2.45, z, 1));
  });
  const glass = mesh(new THREE.BoxGeometry(2.6, 2.4, 2.2),
    new THREE.MeshStandardMaterial({ color: C.glass, transparent: true, opacity: 0.35, roughness: 1, flatShading: true }), 0, 3.2, 0);
  glass.userData.noShadow = true; m.add(glass);
  // 顶部只留四根角柱和一块小招牌，免得从上往下看把罩子里的娃娃全盖住
  [[-1.3, -1.1], [1.3, -1.1], [-1.3, 1.1], [1.3, 1.1]].forEach(([x, z]) => m.add(box(0.2, 2.5, 0.2, C.yellow, x, 3.25, z)));
  m.add(box(1.4, 0.3, 0.3, C.yellow, 0, 4.55, 0));
  m.add(ball(0.25, C.red, 0, 4.9, 0, 0));
  // 爪子
  const claw = new THREE.Group();
  claw.add(cyl(0.05, 0.05, 1.0, 5, C.charcoal, 0, 0.5, 0));
  claw.add(cyl(0.2, 0.2, 0.2, 6, C.gold, 0, 0, 0));
  [0, 1, 2].forEach(i => {
    const a = i / 3 * Math.PI * 2, f = box(0.1, 0.5, 0.1, C.gold, Math.cos(a) * 0.22, -0.3, Math.sin(a) * 0.22);
    f.rotation.set(Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3); claw.add(f);
  });
  claw.position.set(0, 3.9, 0); m.add(claw);
  g.add(m);

  // 大头贴亭：蓝色亭身 + 粉门帘 + 白色闪光灯
  const b = new THREE.Group(); b.position.set(2.6, TOP, -1.4);
  b.add(box(2.0, 3.6, 2.0, C.blue, 0, 1.8, 0));
  b.add(box(2.3, 0.3, 2.3, C.cream, 0, 3.75, 0));
  b.add(box(1.2, 2.0, 0.12, C.pink, 0, 1.1, 1.03));
  b.add(box(1.4, 0.3, 0.14, C.yellow, 0, 2.4, 1.04));
  const flash = ball(0.3, C.snow, 0, 4.2, 0.6, 1); b.add(flash);
  g.add(b);

  // 两个南瓜 + 三枚金币
  [[-0.6, 2.7, 0.65], [0.5, 3.5, 0.5]].forEach(([x, z, r]) => {
    const p = ball(r, C.pumpkin, x, TOP + r * 0.8, z, 1); p.scale.y = 0.8; g.add(p);
    g.add(cyl(0.08, 0.1, 0.3, 5, C.leaf, x, TOP + r * 1.6, z));
  });
  [[-2.6, 2.2], [-2.0, 2.9], [-3.2, 3.0]].forEach(([x, z]) => g.add(cyl(0.35, 0.35, 0.1, 10, C.gold, x, TOP + 0.05, z)));

  return {
    update(t) {
      claw.position.x = Math.sin(t * 0.8) * 0.7;
      const d = Math.max(0, Math.sin(t * 1.6)) ** 2;
      claw.position.y = 3.9 - d * 0.9;
      flash.scale.setScalar(0.8 + Math.max(0, Math.sin(t * 3)) * 0.5);
    },
    sig: () => claw.position.x.toFixed(3) + ',' + claw.position.y.toFixed(3),
  };
}
