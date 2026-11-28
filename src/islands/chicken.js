// 红白条纹炸鸡桶 + 小圆桌（两罐饮料、掌机）+ 张口的空钱包：桶顶热气上升循环
import * as THREE from 'three';
export const color = '#e56b6b';

export function build(g, k) {
  const { C, TOP, box, cyl, ball, mesh } = k;

  // 大桶：8 片红白相间的楔形竖条，上宽下窄
  const bucket = new THREE.Group(); bucket.position.set(-0.8, TOP, -0.6);
  const H = 3.4;
  for (let i = 0; i < 8; i++) {
    const geo = new THREE.CylinderGeometry(1.7, 1.3, H, 8, 1, false, i / 8 * Math.PI * 2, Math.PI * 2 / 8);
    bucket.add(mesh(geo, i % 2 ? C.cream : C.red, 0, H / 2, 0));
  }
  bucket.add(cyl(1.85, 1.85, 0.2, 8, C.red, 0, H + 0.05, 0));      // 桶口沿
  bucket.add(cyl(1.5, 1.5, 0.1, 8, C.fried, 0, H - 0.05, 0));      // 桶内
  // 桶口的炸鸡块
  [[-0.7, 0.2, 0.5, 0.6], [0.5, 0.4, 0.6, 0.55], [0, -0.7, 0.8, 0.5], [0.6, -0.4, 0.2, 0.5], [-0.3, 0.7, 0.2, 0.5]]
    .forEach(([x, z, dy, r]) => { const c = ball(r, C.fried, x, H + dy, z, 0); c.scale.y = 0.85; c.rotation.y = x * 3; bucket.add(c); });
  g.add(bucket);

  // 热气：3 个白球上升、变小、循环
  const steam = [[-0.8, -0.6], [-0.4, -0.2], [-1.2, -0.9]].map(([x, z], i) => {
    const s = ball(0.4, C.snow, x, 0, z, 1); s.userData.noShadow = true; s.userData.ph = i / 3; g.add(s); return s;
  });
  const lift = t => steam.forEach(s => {
    const p = (t * 0.25 + s.userData.ph) % 1;
    s.position.y = TOP + H + 1.6 + p * 3.0;
    s.scale.setScalar(0.5 + Math.sin(p * Math.PI) * 0.7);
  });
  lift(0);

  // 小圆桌 + 两罐饮料 + 掌机
  const tb = new THREE.Group(); tb.position.set(3.0, TOP, -1.0);
  tb.add(cyl(1.0, 1.0, 0.15, 8, C.wood, 0, 1.3, 0));
  tb.add(cyl(0.15, 0.2, 1.25, 6, C.darkwood, 0, 0.65, 0));
  tb.add(cyl(0.6, 0.6, 0.12, 8, C.darkwood, 0, 0.06, 0));
  tb.add(cyl(0.22, 0.22, 0.65, 8, C.blue, -0.4, 1.7, 0.2));
  tb.add(cyl(0.22, 0.22, 0.65, 8, C.pink, 0.0, 1.7, -0.3));
  tb.add(cyl(0.2, 0.2, 0.04, 8, C.snow, -0.4, 2.04, 0.2));
  tb.add(cyl(0.2, 0.2, 0.04, 8, C.snow, 0.0, 2.04, -0.3));
  const con = box(0.7, 0.08, 0.45, C.charcoal, 0.4, 1.42, 0.3); con.rotation.y = -0.4; tb.add(con);
  const scr = box(0.5, 0.02, 0.3, C.glass, 0.4, 1.47, 0.3); scr.rotation.y = -0.4; tb.add(scr);   // 屏幕
  const b1 = ball(0.06, C.red, 0.68, 1.5, 0.45, 0), b2 = ball(0.06, C.yellow, 0.74, 1.5, 0.35, 0); tb.add(b1, b2);
  g.add(tb);

  // 地上张口的空钱包：两片 wine 扁 box 呈 V 字
  const w = new THREE.Group(); w.position.set(-0.8, TOP, 2.9); w.rotation.y = 0.3;
  const wa = box(1.1, 0.12, 0.9, C.wine, -0.5, 0.3, 0); wa.rotation.z = -0.5;
  const wb = box(1.1, 0.12, 0.9, C.wine, 0.5, 0.3, 0); wb.rotation.z = 0.5;
  w.add(wa, wb, box(0.3, 0.1, 0.25, C.gold, 0, 0.06, 0));
  g.add(w);

  return {
    update(t) { lift(t); },
    sig: () => steam[0].position.y.toFixed(3),
  };
}
