// 场景、灯光、正交相机、轨道控制、水面；负责镜头飞行和阴影范围
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { C, onNewMaterial } from './kit.js';

const OFFSET = new THREE.Vector3(0, 60, 44);       // 相机相对目标点的偏移（俯角约 54°）
const SUN_OFFSET = new THREE.Vector3(-25, 45, 22);  // 太阳相对路线中心的偏移（只取方向，距离按路线大小算）

const v3 = p => new THREE.Vector3(p.x, p.y ?? 0, p.z);

const FOAM_DARK = 0.18;                 // 深色下泡沫圈的透明度（浅色是原来的 0.45）
// 主题：浅色 = 原来的白天；深色 = 月光 + 暖灯（只换灯光、背景、水色，黄 / 金 / 红 / 南瓜 / 玻璃色的东西自己微微发光）
const LOOKS = {
  light: { bg:C.water, water:C.water, sky:0xfff6e8, ground:0xa9cfc4, hemi:1.7, sun:0xfff0d8, sunI:1.9, glow:0 },
  dark:  { bg:0x1d3640, water:0x2f5866, sky:0x9fb4d8, ground:0x22323a, hemi:0.8, sun:0xc6d4ff, sunI:0.85, glow:0.7,
           foam:FOAM_DARK },
};
const GLOW = new Set([C.yellow, C.gold, C.red, C.pumpkin, C.glass]);
const THEME_DUR = 0.6;                 // 运行中切换的渐变秒数
const hex = c => c.getHexString();

// 聚焦构图用的包围盒（世界坐标），同 Box3.setFromObject，但跳过隐藏的物体和 userData.noFrame === true 的物体（连同子物体）。
// 岛屿主题作者：飘走的云、粒子、很高的装饰这类不该让镜头为它缩小的东西，设 obj.userData.noFrame = true。
const _ob = new THREE.Box3();
export function framingBox(root, box = new THREE.Box3()) {
  box.makeEmpty();
  root.updateWorldMatrix(true, true);
  (function walk(o) {
    if (o.visible === false || o.userData?.noFrame === true) return;
    const g = o.geometry;
    if (g !== undefined) {
      if (o.boundingBox !== undefined) { if (o.boundingBox === null) o.computeBoundingBox(); _ob.copy(o.boundingBox); }
      else { if (g.boundingBox === null) g.computeBoundingBox(); _ob.copy(g.boundingBox); }
      box.union(_ob.applyMatrix4(o.matrixWorld));
    }
    o.children.forEach(walk);
  })(root);
  return box;
}

export function createWorld(canvas, { mobile = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias:true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(C.water);

  const camera = new THREE.OrthographicCamera(-1,1,1,-1,0.1,500);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.minPolarAngle = 0.35; controls.maxPolarAngle = 1.1;
  controls.minZoom = 0.6; controls.maxZoom = 4;

  const L0 = LOOKS.light;
  const hemi = new THREE.HemisphereLight(L0.sky, L0.ground, L0.hemi);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(L0.sun, L0.sunI);
  sun.position.copy(SUN_OFFSET); sun.castShadow = true;
  const size = mobile ? 2048 : 4096;
  sun.shadow.mapSize.set(size, size);
  Object.assign(sun.shadow.camera, { left:-40, right:40, top:40, bottom:-40, near:1, far:170 });
  sun.shadow.bias = -0.0004;
  scene.add(sun, sun.target);

  const water = new THREE.Mesh(new THREE.PlaneGeometry(400,400).rotateX(-Math.PI/2),
    new THREE.MeshStandardMaterial({ color:C.water, roughness:1 }));
  water.receiveShadow = true; scene.add(water);

  let homeH = 50, homeT = null, tween = null;
  let theme = 'light', themeTw = null;

  // 材质第一次见到时把原样（颜色、emissive、透明度）记进 userData.base，之后都按原样算，来回切不漂移
  const baseOf = m => m.userData.base ??=
    { color: m.color.getHex(), emissive: m.emissive?.getHex(), ei: m.emissiveIntensity, opacity: m.opacity };
  // 泡沫圈这类不受光照的白色半透明材质：深色下调淡，不然像一圈发光的白边
  const isFoam = m => m.isMeshBasicMaterial && m.transparent && baseOf(m).color === 0xffffff;
  // 场景里所有带颜色的材质（去重）
  function sceneMats() {
    const set = new Set();
    scene.traverse(o => [o.material].flat().forEach(m => { if (m?.color) set.add(m); }));
    return [...set];
  }
  // 一个材质切到 look 要做什么：颜色、发光强度（null = 不管发光）、透明度（null = 不管），连同起点
  function matTask(m, look) {
    const b = baseOf(m), toHex = b.color === C.water ? look.water : b.color;
    let glow = m.emissive && GLOW.has(b.color) ? look.glow : null;
    if (glow != null && !m.userData.glowing) {
      if (glow === 0) glow = null;              // 本来就没在发光
      // 开始发光：emissive 换成自己的颜色、强度从 0 起（看起来和不发光一样），再渐变上去
      else { m.emissive.setHex(b.color); m.emissiveIntensity = 0; m.userData.glowing = true; }
    }
    const opacity = isFoam(m) ? (look.foam ?? b.opacity) : null;
    return { m, toHex, from: m.color.clone(), to: new THREE.Color(toHex), glow, ei: m.emissiveIntensity, opacity, op: m.opacity };
  }
  // 渐变一步：s = 0..1；s = 1 时直接写目标值（精确，中途反悔再切回来也不留插值误差）
  function stepMat(t, s) {
    const m = t.m, b = m.userData.base, end = s >= 1;
    if (end) m.color.setHex(t.toHex); else m.color.lerpColors(t.from, t.to, s);
    if (t.opacity != null) m.opacity = end ? t.opacity : t.op + (t.opacity - t.op) * s;
    if (t.glow == null) return;
    m.emissiveIntensity = end ? t.glow : t.ei + (t.glow - t.ei) * s;
    // 不发光了：还原成原来的 emissive（黑色、强度 1），和从没切过一模一样
    if (end && t.glow === 0) { m.emissive.setHex(b.emissive); m.emissiveIntensity = b.ei; m.userData.glowing = false; }
  }
  function stepTheme(s) {
    const tw = themeTw, look = LOOKS[tw.theme];
    if (s >= 1) {
      scene.background.setHex(look.bg);
      hemi.color.setHex(look.sky); hemi.groundColor.setHex(look.ground); hemi.intensity = look.hemi;
      sun.color.setHex(look.sun); sun.intensity = look.sunI;
    } else {
      const lerp = (a, b) => a + (b - a) * s;
      scene.background.lerpColors(tw.bg, tw.to.bg, s);
      hemi.color.lerpColors(tw.sky, tw.to.sky, s); hemi.groundColor.lerpColors(tw.ground, tw.to.ground, s);
      sun.color.lerpColors(tw.sun, tw.to.sun, s);
      hemi.intensity = lerp(tw.hemi, look.hemi); sun.intensity = lerp(tw.sunI, look.sunI);
    }
    tw.mats.forEach(t => stepMat(t, s));
    if (s >= 1) themeTw = null;
  }
  // 之后才新建的材质（kit.mat / kit.themed）：立刻套上当前主题，不用等下次切换
  onNewMaterial(m => { if (m.color) stepMat(matTask(m, LOOKS[theme]), 1); });
  const off = new THREE.Vector3();

  function frustum(H) {
    const aspect = innerWidth / innerHeight;
    Object.assign(camera, { left:-H*aspect/2, right:H*aspect/2, top:H/2, bottom:-H/2 });
    camera.updateProjectionMatrix();
  }

  const world = {
    renderer, scene, camera, controls, sun,
    shadowHalf: 40,
    // 全景：目标点 + 视锥高度；第一次调用时把镜头直接摆过去。
    // 之后（视口大小变了）目标点跟着变：镜头平移同样多，用户自己转过、拖过的保留
    setHome(target, height) {
      homeH = height; frustum(homeH);
      const t = v3(target);
      if (!homeT) {
        controls.target.copy(t); camera.position.copy(t).add(OFFSET);
        controls.update();
      } else {
        const d = t.clone().sub(homeT);
        controls.target.add(d); camera.position.add(d);
        if (tween) tween.tt.add(d);
      }
      homeT = t;
    },
    // 太阳和阴影相机跟着路线走，保证每座岛都在阴影范围里
    fitShadow(b) {
      const cx = (b.minX + b.maxX) / 2, cz = (b.minZ + b.maxZ) / 2;
      const half = Math.max(b.maxX - b.minX, b.maxZ - b.minZ) / 2 + 12;
      // 太阳离中心 half + 60：路线再长，离太阳最近的岛也在近裁剪面外面（不会被切掉阴影）
      const dist = half + 60;
      sun.target.position.set(cx, 0, cz);
      sun.position.set(cx, 0, cz).add(SUN_OFFSET.clone().setLength(dist));
      Object.assign(sun.shadow.camera, { left:-half, right:half, top:half, bottom:-half,
        far: dist + half * 2 });
      sun.shadow.camera.updateProjectionMatrix();
      world.shadowHalf = half;
    },
    // 默认偏移（全景用）；frustumHeight = zoom 为 1 时的视锥高度（世界单位）
    defaultOffset: OFFSET.clone(),
    get frustumHeight() { return camera.top - camera.bottom; },
    get flying() { return !!tween; },
    // offset：可选，飞行途中把相机偏移也插值过去（全景要回到默认俯角）；dur 为 0 直接到位
    // 拖完松手后 OrbitControls 还会靠阻尼惯性转一会儿；飞行前把这点余量一次用掉，免得落点被带偏
    stopInertia() {
      controls.enableDamping = false; controls.update(); controls.enableDamping = true;
    },
    flyTo(target, zoom, { offset, dur = 1.1 } = {}) {
      world.stopInertia();
      const fo = camera.position.clone().sub(controls.target);
      tween = { t:0, dur, ft:controls.target.clone(), tt:v3(target), fz:camera.zoom, tz:zoom,
        fo, to: offset ? offset.clone() : fo.clone() };
      if (dur <= 0) world.update(0);
    },
    // theme = 'light' | 'dark'；instant 直接到位（首次打开、减少动态效果），否则约 0.6 秒渐变
    setTheme(t, { instant = false } = {}) {
      const look = LOOKS[t]; if (!look) return;
      theme = t;
      const col = h => new THREE.Color(h);
      themeTw = { theme: t, s: 0, dur: instant ? 0 : THEME_DUR,
        bg: scene.background.clone(), sky: hemi.color.clone(), ground: hemi.groundColor.clone(), sun: sun.color.clone(),
        hemi: hemi.intensity, sunI: sun.intensity,
        to: { bg: col(look.bg), sky: col(look.sky), ground: col(look.ground), sun: col(look.sun) },
        mats: sceneMats().map(m => matTask(m, look)) };
      if (instant) stepTheme(1);
    },
    get theme() { return theme; },
    // 测试用：当前主题下的背景、灯光、每个材质的颜色（十六进制）
    themeState() {
      const mats = sceneMats().map(m => ({ base: baseOf(m).color.toString(16).padStart(6, '0'), color: hex(m.color),
        emissive: m.emissive ? hex(m.emissive) : null, ei: m.emissiveIntensity ?? null, opacity: m.opacity }));
      return { theme, tweening: !!themeTw, bg: hex(scene.background),
        hemi: [hex(hemi.color), hex(hemi.groundColor), hemi.intensity], sun: [hex(sun.color), sun.intensity], mats };
    },
    resize() {
      renderer.setSize(innerWidth, innerHeight);
      frustum(homeH);
    },
    update(dt) {
      if (tween) {
        tween.t += dt; let s = tween.dur > 0 ? Math.min(1, tween.t/tween.dur) : 1;
        s = s<.5 ? 2*s*s : 1-Math.pow(-2*s+2,2)/2;
        controls.target.lerpVectors(tween.ft, tween.tt, s);
        camera.position.copy(controls.target).add(off.lerpVectors(tween.fo, tween.to, s));
        camera.zoom = tween.fz + (tween.tz-tween.fz)*s; camera.updateProjectionMatrix(); if (s >= 1) tween = null;
      }
      if (themeTw) {
        themeTw.s += dt;
        const s = Math.min(1, themeTw.s / themeTw.dur);
        stepTheme(s >= 1 ? 1 : s * s * (3 - 2 * s));       // 平滑起止
      }
      controls.update();
    },
    render() { renderer.render(scene, camera); },
  };
  return world;
}
