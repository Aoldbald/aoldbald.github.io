// 造型小工具箱：颜色表、材质缓存、基本几何体、可复现随机数、树、画布贴图
import * as THREE from 'three';
import { TOP, R } from './layout.js';

export { TOP, R };

export const C = { water:0xa8d8d3, grass:0xb9d98c, earth:0xe6c99a, wood:0xc9a27a, cream:0xf6ecd6, roof:0xe98a6b,
  pink:0xf4b6c2, blue:0x8fb8de, leaf:0x86b96d, leaf2:0x9ccc7f, pine:0x5e9a5a, trunk:0xa47551,
  stone:0xa9b8c6, snow:0xffffff, sand:0xf1dfae, yellow:0xffd66b, skin:0xf6d7b8,
  // 命名配色：小人和新岛屿场景只用这些名字，不写裸色值
  ink:0x3a3028, darkwood:0x8a6a4f, glass:0xbfe3f0, red:0xe56b6b, gold:0xf2c14e, choco:0x8b5e46, berry:0xa58bd0,
  fried:0xd9a05b, sage:0x9aa97a, charcoal:0x6b6670, wine:0xb5606e, hairBrown:0x5a4636, hairBlack:0x3a3238,
  pumpkin:0xf0a35e, pine2:0x6fae67 };

const mats = {};
// 新建材质时通知一声：world.js 借此让后来才建的材质立刻跟上当前的深色 / 浅色主题。
// 岛屿里自己 new 的材质想跟主题走，就包一层 themed(new THREE.XxxMaterial(...))
let onNew = null;
export const onNewMaterial = f => { onNew = f; };
export const themed = m => { onNew?.(m); return m; };
export const mat = c => mats[c] ||= themed(new THREE.MeshStandardMaterial({ color:c, roughness:1, metalness:0, flatShading:true }));
export const mesh = (g,c,x=0,y=0,z=0) => { const m = new THREE.Mesh(g, typeof c==='number'?mat(c):c); m.position.set(x,y,z); return m; };
export const box  = (w,h,d,c,x,y,z) => mesh(new THREE.BoxGeometry(w,h,d),c,x,y,z);
export const cyl  = (rt,rb,h,s,c,x,y,z) => mesh(new THREE.CylinderGeometry(rt,rb,h,s),c,x,y,z);
export const cone = (r,h,s,c,x,y,z) => mesh(new THREE.ConeGeometry(r,h,s),c,x,y,z);
export const ball = (r,c,x,y,z,d=1) => mesh(new THREE.IcosahedronGeometry(r,d),c,x,y,z);
export const flameMat = new THREE.MeshBasicMaterial({ color:0xffd25e });

// 字符串 → 种子（FNV-1a），再用 Park–Miller 出 (0,1) 的随机数；同一个 id 每次长得一样
export function rng(seedStr) {
  let h = 0x811c9dc5;
  for (const ch of String(seedStr)) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  let seed = (h % 2147483646) + 1;
  return () => (seed = (seed * 16807) % 2147483647) / 2147483647;
}

export function tree(g, x, z, s = 1, type = 0, rnd = Math.random) {
  const t = new THREE.Group();
  t.add(cyl(0.15*s,0.2*s,1*s,5,C.trunk,0,0.5*s,0));
  if (type===0) t.add(ball(0.95*s, rnd()<.5?C.leaf:C.leaf2, 0,1.55*s,0,0));
  else { t.add(cone(0.95*s,1.7*s,6,C.pine,0,1.6*s,0)); t.add(cone(0.65*s,1.2*s,6,C.pine2,0,2.35*s,0)); }
  t.position.set(x,TOP,z); t.rotation.y = rnd()*6; g.add(t);
  return t;
}

export function textTexture(lines, w = 512, h = 256, bg = '#f6ecd6') {
  const cv = document.createElement('canvas'); cv.width=w; cv.height=h;
  const ctx = cv.getContext('2d'); ctx.fillStyle=bg; ctx.fillRect(0,0,w,h);
  ctx.fillStyle='#4a4036'; ctx.textAlign='center'; ctx.textBaseline='middle';
  lines.forEach(([t,size,y])=>{ ctx.font=`${size}px Fredoka, "ZCOOL KuaiLe"`; ctx.fillText(t,w/2,y); });
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; return tex;
}

// 示意二维码（假的，只是样子像）
export function qrTexture(rnd = Math.random) {
  const n=21, s=12, cv=document.createElement('canvas'); cv.width=cv.height=n*s+24;
  const ctx=cv.getContext('2d'); ctx.fillStyle='#fff'; ctx.fillRect(0,0,cv.width,cv.height); ctx.fillStyle='#4a4036';
  const finder=(x,y)=>{ ctx.fillRect(12+x*s,12+y*s,7*s,7*s); ctx.fillStyle='#fff'; ctx.fillRect(12+(x+1)*s,12+(y+1)*s,5*s,5*s);
    ctx.fillStyle='#4a4036'; ctx.fillRect(12+(x+2)*s,12+(y+2)*s,3*s,3*s); };
  for(let i=0;i<n;i++) for(let j=0;j<n;j++){ const inF=(i<8&&j<8)||(i>12&&j<8)||(i<8&&j>12); if(!inF && rnd()<.45) ctx.fillRect(12+i*s,12+j*s,s,s); }
  finder(0,0); finder(14,0); finder(0,14);
  const tex=new THREE.CanvasTexture(cv); tex.colorSpace=THREE.SRGBColorSpace; return tex;
}
