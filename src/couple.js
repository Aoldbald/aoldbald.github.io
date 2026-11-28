// 两个小人：胶囊身体 + 球形脑袋 + 发型 / 眼镜 / 衣服（造型表 LOOKS）；聚焦时沿路线一岛一岛跳过去
import * as THREE from 'three';
import { TOP } from './layout.js';
import { C } from './kit.js';

// 小人在岛上站的位置
export const standOf = p => new THREE.Vector3(p.x + 2.2, TOP, p.z + 3);

// 定稿造型：a = 齐肩棕发侧分 + 浅蓝外套黑内搭，b = 黑发短马尾 + 深灰外套灰内搭，旁边一只小柴犬
export const LOOKS = {
  final: {
    a: { hair: C.hairBrown, hairStyle: 'bob',  top: C.blue,     inner: C.ink },
    b: { hair: C.hairBlack, hairStyle: 'pony', top: C.charcoal, inner: C.stone },
    dog: true,
  },
};
export const DEFAULT_LOOK = 'final';

const tag = (o, part) => { o.userData.part = part; return o; };

export function person(kit, look) {
  const { C, mesh, ball, box } = kit;
  const p = new THREE.Group();
  p.add(mesh(new THREE.CapsuleGeometry(0.32,0.5,3,8),look.top,0,0.6,0));
  if (look.inner != null) p.add(box(0.14,0.5,0.05,look.inner,0,0.85,0.31));   // 胸前露出的内搭
  p.add(ball(0.33,C.skin,0,1.35,0,1));
  // 头发（整体往后挪一点，露出额头和眼镜）
  const dome = mesh(new THREE.SphereGeometry(0.375,10,6,0,Math.PI*2,0,Math.PI/2),look.hair,0,1.43,-0.06);
  p.add(tag(dome, 'hair'));
  if (look.hairStyle === 'bob') {
    // 两侧和后面的发帘：开口圆柱（只包住头的侧面和后面），垂到下巴
    const dm = kit.mat(look.hair).clone(); dm.side = THREE.DoubleSide;
    const cur = mesh(new THREE.CylinderGeometry(0.37,0.34,0.5,10,1,true,1.0,Math.PI*2-2.0),dm,0,1.2,-0.05);
    p.add(tag(cur, 'hair'));
    const sw = ball(0.17,look.hair,-0.12,1.63,0.2,1); sw.scale.set(1,0.45,0.8); sw.rotation.z = 0.25; p.add(tag(sw, 'hair'));   // 侧分：额前一缕轻扫
  } else {
    // 短马尾：脑后一小截（朝后微微向下）+ 发绳；再加一圈后脑发帘，背面不露头皮
    const dm = kit.mat(look.hair).clone(); dm.side = THREE.DoubleSide;
    p.add(tag(mesh(new THREE.CylinderGeometry(0.37,0.34,0.24,10,1,true,1.7,Math.PI*2-3.4),dm,0,1.31,-0.05), 'hair'));
    const tail = ball(0.15,look.hair,0,1.2,-0.54,1); tail.scale.set(1,1,1.9); tail.rotation.x = -0.6;
    p.add(tag(tail, 'ponytail'));
    const tie = mesh(new THREE.TorusGeometry(0.075,0.026,5,8),C.ink,0,1.31,-0.37); tie.rotation.x = -0.45; p.add(tag(tie, 'hair'));
  }
  // 眼睛（在镜框后面）
  p.add(ball(0.045,C.ink,-0.14,1.38,0.29,0)); p.add(ball(0.045,C.ink,0.14,1.38,0.29,0));
  // 黑框眼镜：两个镜框（顺着脸的弧度微微外转，只贴在脸正面）+ 细横梁
  for (const s of [-1, 1]) {
    const f = mesh(new THREE.TorusGeometry(0.105,0.026,5,12),C.ink,s*0.14,1.38,0.3); f.rotation.y = s*0.4;
    p.add(tag(f, 'glasses'));
  }
  p.add(tag(box(0.07,0.028,0.028,C.ink,0,1.4,0.315), 'glasses'));
  p.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return p;
}

// 小柴犬：橘色 box 身体 + 白肚子 + 锥形耳朵 + 卷尾巴
export function shiba(kit) {
  const { C, mesh, ball, box, cone, cyl } = kit;
  const d = new THREE.Group(); d.position.set(0.95,0,0.5); d.rotation.y = 0.3;   // 在人群侧前方
  d.add(box(0.34,0.3,0.6,C.pumpkin,0,0.4,0));
  d.add(box(0.28,0.1,0.5,C.snow,0,0.27,0.02));
  d.add(ball(0.2,C.pumpkin,0,0.66,0.34,1));
  d.add(box(0.14,0.1,0.14,C.snow,0,0.6,0.5));
  d.add(ball(0.035,C.ink,0,0.64,0.58,0));
  d.add(ball(0.03,C.ink,-0.08,0.7,0.5,0), ball(0.03,C.ink,0.08,0.7,0.5,0));
  d.add(cone(0.07,0.17,4,C.pumpkin,-0.11,0.9,0.3), cone(0.07,0.17,4,C.pumpkin,0.11,0.9,0.3));
  for (const [x, z] of [[-0.11,0.2],[0.11,0.2],[-0.11,-0.2],[0.11,-0.2]]) d.add(cyl(0.05,0.05,0.26,5,C.snow,x,0.13,z));
  const tail = new THREE.Group(); tail.position.set(0,0.55,-0.3);   // 尾巴绕这个点左右摆
  const t = mesh(new THREE.TorusGeometry(0.1,0.04,5,8),C.pumpkin,0,0.1,-0.05); t.rotation.y = Math.PI/2; tail.add(t);
  d.add(tail); d.userData.tail = tail;
  d.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return d;
}

export function createCouple(scene, kit, lookName = DEFAULT_LOOK) {
  const L = LOOKS[lookName] || LOOKS[DEFAULT_LOOK];
  const group = new THREE.Group();
  // a = CC，b = 用户
  const a = person(kit, L.a), b = person(kit, L.b);
  a.position.x = -0.42; b.position.x = 0.42; group.add(a, b);
  const dog = L.dog ? shiba(kit) : null;
  if (dog) group.add(dog);
  group.scale.setScalar(1.3);
  scene.add(group);

  let cur = 0, hops = [], hop = null, stands = [], visited = [];

  return {
    group,
    get current() { return cur; },
    get hopping() { return !!hop || hops.length > 0; },
    get visited() { return visited.slice(); },   // 上次 hopTo 以来落脚过的岛（测试用）
    // 直接站到某座岛上；index 一起更新，后面的跳跃才会从这里出发
    placeAt(stand, index = cur) { group.position.copy(stand); hops = []; hop = null; cur = index; },
    hopTo(index, standList) {
      stands = standList; visited = [];
      const from = hop ? hop.idx : cur;
      hops = []; const step = index > from ? 1 : -1;
      if (index !== from) for (let k = from + step; step > 0 ? k <= index : k >= index; k += step) hops.push(k);
    },
    update(t, dt) {
      if (!hop && hops.length) { const to = hops.shift(); hop = { t:0, from:group.position.clone(), to:stands[to].clone(), idx:to }; }
      if (hop) {
        hop.t += dt/0.45; const s = Math.min(1, hop.t);
        group.position.lerpVectors(hop.from, hop.to, s); group.position.y = TOP + Math.sin(s*Math.PI)*3;
        group.rotation.y = Math.atan2(hop.to.x-hop.from.x, hop.to.z-hop.from.z);
        if (s >= 1) { cur = hop.idx; visited.push(cur); hop = null; if (!hops.length) group.rotation.y = 0; }
      } else { a.position.y = Math.abs(Math.sin(t*2))*0.05; b.position.y = Math.abs(Math.sin(t*2+1))*0.05; }
      if (dog) dog.userData.tail.rotation.y = Math.sin(t*9)*0.5;   // 小尾巴摇一摇
    },
  };
}
