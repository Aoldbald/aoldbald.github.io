// 转机野餐：海边沙地小公园，野餐垫上有粥、包子、饭团，头顶小飞机绕圈
import * as THREE from 'three';
export const color = '#8fb8de';
export const ground = 'sand';
export const trees = false;

export function build(g, k) {
  const { C, TOP, box, cyl, cone, ball } = k;

  // 野餐垫：粉/奶油格子，2x2 四块
  [[-2.2, -0.25, C.pink], [-0.2, -0.25, C.snow], [-2.2, 1.25, C.snow], [-0.2, 1.25, C.pink]]
    .forEach(([x, z, c]) => g.add(box(2.0, 0.08, 1.5, c, x, TOP + 0.04, z)));

  // 一碗粥
  g.add(cyl(0.6, 0.4, 0.5, 8, C.snow, -2.7, TOP + 0.33, 0.1));
  g.add(cyl(0.5, 0.5, 0.06, 8, C.cream, -2.7, TOP + 0.6, 0.1));
  g.add(ball(0.12, C.leaf2, -2.6, TOP + 0.68, 0.1, 0));        // 葱花

  // 蒸笼：木笼 + 三个白包子，盖子斜靠一边
  g.add(cyl(0.9, 0.9, 0.5, 8, C.wood, -1.7, TOP + 0.33, -0.1));
  [[-2.0, -0.3], [-1.4, -0.3], [-1.7, 0.2]].forEach(([x, z]) => {
    const b = ball(0.38, C.snow, x, TOP + 0.75, z, 1); b.scale.y = 0.85; g.add(b);
  });
  const lid = cone(0.95, 0.5, 8, C.wood, -1.1, TOP + 0.3, -0.9); lid.rotation.x = -1.1; g.add(lid);

  // 大饭团卷：压扁的白球 + 一圈黄色馅料
  const roll = ball(0.9, C.snow, -0.2, TOP + 0.55, 1.0, 1); roll.scale.set(1.2, 0.65, 0.8); roll.rotation.y = 0.3; g.add(roll);
  g.add(box(0.3, 0.1, 0.3, C.yellow, -0.2, TOP + 1.0, 1.0));

  // 木长椅（坐面朝 +z，对着镜头）
  const bench = new THREE.Group(); bench.position.set(0.8, TOP, -3.0);
  bench.add(box(2.6, 0.18, 0.8, C.wood, 0, 0.8, 0));
  bench.add(box(2.6, 0.7, 0.14, C.darkwood, 0, 1.3, -0.4));
  bench.add(box(0.2, 0.8, 0.7, C.darkwood, -1.1, 0.4, 0));
  bench.add(box(0.2, 0.8, 0.7, C.darkwood, 1.1, 0.4, 0));
  g.add(bench);

  // 三丛芦苇
  [[-3.6, 2.0], [3.6, -1.2], [-3.3, -2.5]].forEach(([x, z], j) => {
    [0, 1, 2].forEach(i => {
      const r = cone(0.12, 1.8 + i * 0.3, 4, C.leaf2, x + (i - 1) * 0.28, TOP + 0.9 + i * 0.15, z + (i % 2) * 0.2 - j * 0.05);
      r.rotation.z = (i - 1) * 0.15; g.add(r);
    });
  });

  // 小白飞机：空 Group 绕 y 转，机头沿圆周切线
  const pivot = new THREE.Group(); g.add(pivot);
  const plane = new THREE.Group(); plane.position.set(3.8, TOP + 7, 0); plane.rotation.z = 0.15; pivot.add(plane);
  plane.add(box(0.5, 0.5, 1.9, C.snow, 0, 0, 0));
  plane.add(ball(0.3, C.blue, 0, 0, -0.95, 0));                // 机头
  plane.add(box(2.0, 0.08, 0.5, C.snow, 0, 0, -0.1));          // 主翼
  plane.add(box(0.9, 0.07, 0.35, C.snow, 0, 0.05, 0.8));       // 平尾
  plane.add(box(0.08, 0.6, 0.4, C.pink, 0, 0.4, 0.8));       // 垂尾
  plane.add(box(0.52, 0.08, 0.9, C.blue, 0, 0.2, -0.3));       // 窗带

  return {
    update(t, dt) { pivot.rotation.y = t * 0.5; },
    sig: () => pivot.rotation.y.toFixed(3),
  };
}
