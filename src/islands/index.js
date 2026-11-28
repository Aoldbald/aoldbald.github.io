// 小岛工厂：底座 + 主题小场景。主题模块由 Task 5 登记进 THEMES。
// 主题模块接口：export const color；可选 ground = 'sand'、trees = false；
//               export function build(g, kit, rnd) -> { update?(t, dt) } | void
import * as THREE from 'three';
import { buildBase } from './base.js';

import * as cafe from './cafe.js';
import * as wheel from './wheel.js';
import * as mountain from './mountain.js';
import * as cake from './cake.js';
import * as beach from './beach.js';
import * as next from './next.js';
import * as claw from './claw.js';
import * as chicken from './chicken.js';
import * as layover from './layover.js';
import * as goldrush from './goldrush.js';
import * as icecream from './icecream.js';

export const THEMES = { cafe, wheel, mountain, cake, beach, next, claw, chicken, layover, goldrush, icecream };

const FALLBACK_COLOR = '#b9a7d6';

export function buildIsland(place, index, pos, kit) {
  const g = new THREE.Group(); g.position.set(pos.x, 0, pos.z);
  const rnd = kit.rng(place.id);
  // 不用 Object.hasOwn：Chrome 89–92 认 importmap 但还没有它
  const theme = Object.prototype.hasOwnProperty.call(THEMES, place.theme) ? THEMES[place.theme] : undefined;
  buildBase(g, theme, rnd, kit);
  let anim;
  if (theme) {
    anim = theme.build?.(g, kit, rnd);
  } else {
    console.warn('未知主题', place.theme);
    // 没有主题小场景：中间补三棵不同的树，免得空荡荡
    [[0.4,-0.8,0],[-1.2,0.9,1],[1.6,1.2,0]].forEach(([x,z,type]) =>
      kit.tree(g,x,z,0.9+rnd()*0.3,type,rnd));
  }
  g.traverse(o => {
    o.userData.idx = index;
    if (o.isMesh && !o.userData.noShadow) { o.castShadow = true; o.receiveShadow = true; }
  });
  return { group: g, update: anim?.update, sig: anim?.sig, color: theme?.color ?? FALLBACK_COLOR };
}
