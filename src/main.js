// 启动编排：（加密站点先过密码页）读数据 → 搭世界 → 放岛、桥、小人 → 标签和卡片（ui.js）→ 动画循环。这里不造任何几何体。
// 用到 three.js 的模块一开始就动态 import（和密码页同时下载），密码页本身不等 three.js
import { loadPlaces, jsonOf } from './data.js';
import { islandPositions, homeFrame, routeBounds, fitHeight, layoutMode, focusFrame, TOP } from './layout.js';
import { createUI } from './ui.js';
import { initMusic } from './music.js';
import { initTheme } from './theme.js';
import { createVault } from './vault.js';
import { createShare } from './share.js';

const worldModules = Promise.all([
  import('three'), import('./kit.js'), import('./world.js'), import('./islands/index.js'),
  import('./path.js'), import('./couple.js'),
]);
worldModules.catch(() => {});        // 失败留到真正要用时（start 里 await）再报，别先冒“未处理的错误”

const FOCUS_Y = TOP + 1.5;           // 聚焦时对准的高度（岛上小场景的大致中心）
const LABEL_AT = { y: TOP + 8.5, dz: -2 };   // 标签挂在岛上方这个点（标签本身往上长）
const TOP_GAP = 10, BOTTOM_PX = 12;          // 全景：第一排标签和标题之间、最后一排岛和屏幕底之间留的像素

// 收集 console.warn，测试用
const warnings = [];
const origWarn = console.warn.bind(console);
console.warn = (...a) => { warnings.push(a.join(' ')); origWarn(...a); };

const $ = id => document.getElementById(id);

function showFatal(msg) {
  const el = $('fatal'); el.textContent = msg; el.hidden = false;
  $('loading').hidden = true;
  $('lock').hidden = true;
}

const PLACES = 'data/places.json';
const SHARE = 'data/share.json';
const WRONG = '密码不对，再看看相框背面～';
const NO_SUBTLE = '这个浏览器打不开小世界，请点右上角 ··· 选择「在浏览器打开」';

// 显示密码页，等用户输对密码（vault.unlock 成功）才返回；#loading 先藏起来，解锁后再亮出来（接着搭世界）
function askPassword(vault) {
  const form = $('lock'), pw = form.querySelector('.lock-pw'), btn = form.querySelector('button');
  const remember = form.querySelector('input[type=checkbox]'), msg = form.querySelector('.lock-msg');
  window.__locked = true;              // index.html 的 15 秒“加载失败”兜底别再改 #loading 的字
  $('loading').hidden = true;
  form.hidden = false;
  pw.focus();
  return new Promise(resolve => {
    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (btn.disabled) return;
      btn.disabled = true; msg.textContent = '';
      const ok = await vault.unlock(pw.value, remember.checked);
      btn.disabled = false;
      if (!ok) { msg.textContent = WRONG; pw.select(); return; }
      form.hidden = true;
      $('loading').hidden = false;
      resolve();
    });
  });
}

// 不支持 WebCrypto（微信内置浏览器等）：密码页只留标题和一句“去浏览器打开”，不让输密码
function noCrypto() {
  const form = $('lock');
  window.__locked = true;
  form.querySelector('.lock-fields').hidden = true;
  form.querySelector('.lock-msg').textContent = NO_SUBTLE;
  $('loading').hidden = true;
  form.hidden = false;
}

// 读数据。先照旧读明文 places.json（本机开发、测试都是它，和以前一模一样，不多发任何请求）；
// 只有它 404 才去看 data/lock.json：有 → 加密站点（密码页、解密）；也 404 → 照旧按“数据读不到”报错。
// 返回 { data, resolve }（resolve = 照片地址 → 可以放进 <img> 的地址；明文为 undefined）
async function openData() {
  const res = await fetch(PLACES);
  const plain = () => loadPlaces(PLACES, () => jsonOf(res));
  // 分享图清单：没有 / 读不到都当空清单（按钮全藏），绝不致命
  const plainShare = () => fetch(SHARE).then(r => (r.ok ? r.json() : {})).catch(() => ({}));
  if (res.status !== 404) return { data: await plain(), share: await plainShare() };
  const vault = createVault();
  if (await vault.init() === 'plain') return { data: await plain(), share: {} };   // 抛 “places.json 读取失败：404”
  if (!globalThis.crypto?.subtle) { noCrypto(); return new Promise(() => {}); }   // 停在提示页
  if (!(await vault.tryRemembered())) await askPassword(vault);
  const share = await vault.json(SHARE).catch(() => ({}));
  return { data: await loadPlaces(PLACES, vault.json), share, resolve: vault.url };
}

// 等两种字体加载完（画布上画字要用），最多等 3 秒；字体下载失败就用系统字体照常打开
function waitFonts(text) {
  const load = (font, t) => document.fonts.load(font, t).catch(() => {});
  return Promise.race([
    Promise.all([load('48px "ZCOOL KuaiLe"', text), load('600 48px Fredoka', 'Untitled Love Story')]),
    new Promise(r => setTimeout(r, 3000)),
  ]);
}

async function start() {
  initMusic();                         // 背景音乐只跟 #music、#music-btn 打交道，和 3D 无关
  // 深色 / 浅色：页面部分（CSS）马上跟着变；3D 世界搭好以后才接上（见下面 world.setTheme）
  let world = null;
  const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const theme = initTheme({ onChange: t => world?.setTheme(t, { instant: reduceMotion() }) });
  const { data, share: manifest, resolve } = await openData();
  const [THREE, kit, { createWorld, framingBox }, { buildIsland, THEMES }, { buildBridges }, { createCouple, standOf }]
    = await worldModules;
  const places = data.places;
  document.querySelector('#title h1').textContent = data.title ?? '';
  document.querySelector('#title p').textContent = data.subtitle ?? '';
  await waitFonts(places.map(p => p.name).join('') + '下一站？');

  const canvas = $('c');
  // 横屏手机宽度超过断点也要算手机（阴影贴图用 2048）
  const mobile = matchMedia('(pointer: coarse)').matches || layoutMode(innerWidth) === 'drawer';
  world = createWorld(canvas, { mobile });
  const positions = islandPositions(places.length);
  const islands = places.map((p, i) => buildIsland(p, i, positions[i], kit));
  islands.forEach(isl => world.scene.add(isl.group));
  buildBridges(world.scene, positions, kit, kit.rng('bridges'));
  const stands = positions.map(standOf);
  const couple = createCouple(world.scene, kit);
  couple.placeAt(stands[0], 0);
  world.setTheme(theme.theme, { instant: true });   // 岛、桥、小人都放好了再上主题（材质全在场景里）

  const indexOf = id => places.findIndex(p => p.id === id);
  const hashIndex = () => { try { return indexOf(decodeURIComponent(location.hash.slice(1))); } catch { return -1; } };
  let active = null;

  const share = createShare({ manifest: manifest && typeof manifest === 'object' ? manifest : {}, resolve, title: data.title });
  const ui = createUI({
    places, colors: islands.map(isl => isl.color),
    onFocus: i => focus(i),
    onHome: () => home(),
    onDrawer: () => { if (active != null) frame(active, 0.6); },   // 抽屉换档：重新构图
    resolve, share,
  });

  // 全景构图：顶上让出标题 + 第一排标签，见 layout.js homeFrame。标签大小取决于视野，视野又取决于标签多高：
  // 从原来的视野开始，按算出来的视野重新定标签大小、再量，直到视野不再变（留的高度只增不减，最多 3 轮）
  let homeAt;
  const title = $('title');
  const fit = () => {
    world.resize();
    const w = innerWidth, h = innerHeight;
    let height = fitHeight(places.length, w / h), topPx = 0, f;
    for (let k = 0; k < 3; k++) {
      ui.fitLabels(h / height);
      topPx = Math.max(topPx, title.offsetTop + title.offsetHeight + TOP_GAP + Math.max(ui.labelHeight(0), ui.labelHeight(1)));
      f = homeFrame(positions, { w, h, topPx, botPx: BOTTOM_PX, labelY: LABEL_AT.y, labelDz: LABEL_AT.dz,
                                 off: world.defaultOffset });
      if (Math.abs(f.height - height) < 1e-6) break;
      height = f.height;
    }
    homeAt = f.target;
    world.setHome(homeAt, f.height);
  };
  fit();
  const refit = () => { ui.layout(); fit(); if (active != null) frame(active, 0); };
  addEventListener('resize', refit);
  document.fonts?.addEventListener?.('loadingdone', refit);    // 字体晚到：标签大小变了，构图重算
  world.fitShadow(routeBounds(positions));

  // 镜头对准第 i 座岛，并按卡片占的位置把岛挪到剩下的空白中间：
  // 目标 = 锚点 + 右向量·(cx + dx·wpp) + 上向量·(cy − dy·wpp)
  // （dx/dy 是屏幕像素，y 向下；wpp = 每像素多少世界单位；cx/cy = 岛 + 标签整体的中心，相对锚点）
  const right = new THREE.Vector3(), up = new THREE.Vector3();
  const anchorOf = i => new THREE.Vector3(positions[i].x, FOCUS_Y, positions[i].z);
  // 第 i 座岛（含标签挂点）沿相机右/上方向的范围，世界单位，相对锚点
  const bbox = new THREE.Box3(), corner = new THREE.Vector3();
  function islandBox(i) {
    framingBox(islands[i].group, bbox);  // 不算隐藏的和 userData.noFrame 的物体
    const a = anchorOf(i), pts = [];
    for (let k = 0; k < 8; k++) pts.push(corner.set(k & 1 ? bbox.max.x : bbox.min.x, k & 2 ? bbox.max.y : bbox.min.y,
      k & 4 ? bbox.max.z : bbox.min.z).clone());
    pts.push(new THREE.Vector3(positions[i].x, LABEL_AT.y, positions[i].z + LABEL_AT.dz));
    const xs = pts.map(q => q.sub(a).dot(right)), ys = pts.map(q => q.dot(up));
    return { left: Math.min(...xs), right: Math.max(...xs), bottom: Math.min(...ys), top: Math.max(...ys) };
  }
  function frame(i, dur = 1.1) {
    const L = ui.layout();
    world.stopInertia();                 // 先停住惯性，下面取到的方向才是最终方向
    world.camera.updateMatrixWorld();
    right.setFromMatrixColumn(world.camera.matrixWorld, 0);
    up.setFromMatrixColumn(world.camera.matrixWorld, 1);
    const box = islandBox(i), at = () => ({ ...L, frustumH: world.frustumHeight, box, labelH: ui.labelHeight(i) });
    let f = focusFrame(at());
    ui.fitLabels(L.h / world.frustumHeight * f.zoom);   // 标签大小跟着镜头远近：按飞到后的大小再量一次标签高
    f = focusFrame(at());
    const wpp = world.frustumHeight / f.zoom / L.h;
    const t = anchorOf(i).addScaledVector(right, f.cx + f.dx * wpp).addScaledVector(up, f.cy - f.dy * wpp);
    world.flyTo(t, f.zoom, { dur });
  }

  function focus(i, { instant = false } = {}) {
    if (!(i >= 0 && i < places.length)) return;
    active = i;
    ui.setActive(i);
    ui.showCard(places[i]);
    frame(i, instant ? 0 : 1.1);
    couple.hopTo(i, stands);
    history.replaceState(null, '', '#' + encodeURIComponent(places[i].id));
  }
  function home() {
    active = null;
    ui.setActive(null);
    ui.hideCard();
    world.flyTo(homeAt, 1, { offset: world.defaultOffset });   // 回到默认俯角，转过视角也能看全路线
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
  }
  $('home').onclick = home;
  addEventListener('hashchange', () => { const i = hashIndex(); if (i >= 0) focus(i); else home(); });

  // 点小岛：按下和松开距离很近才算点击（拖动旋转不算）
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2(); let down = null;
  const groups = islands.map(isl => isl.group);
  canvas.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
  canvas.addEventListener('pointercancel', () => { down = null; });
  canvas.addEventListener('pointerup', e => {
    const d = down; down = null;          // 用过就清：没有新的按下，后面的松开不算点击
    if (!d || Math.hypot(e.clientX - d[0], e.clientY - d[1]) > 6) return;
    ptr.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    ray.setFromCamera(ptr, world.camera);
    const hit = ray.intersectObjects(groups, true)[0];
    if (hit) focus(hit.object.userData.idx);
  });

  const v = new THREE.Vector3();
  const project = (x, y, z) => {
    v.set(x, y, z).project(world.camera);
    return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight };
  };
  const app = window.__app = {
    ready: false,
    places,
    islandCount: islands.length,
    shadowMapSize: world.sun.shadow.mapSize.x,
    pixelRatio: world.renderer.getPixelRatio(),
    shadowHalf: world.shadowHalf,
    positions,
    themes: THEMES,
    theme: () => theme.theme,
    themeState: () => world.themeState(),
    warnings,
    animSignature: () => islands.map(i => i.sig?.()).filter(Boolean).join('|'),
    labelRefits: () => ui.refits,           // 标签大小重算了几次（每次都要重排）
    focus: id => focus(indexOf(id)),
    home,
    view: () => ({ offset: world.camera.position.clone().sub(world.controls.target).toArray(),
                   zoom: world.camera.zoom, flying: world.flying }),
    islandGroup: id => islands[indexOf(id)]?.group,
    coupleAt: () => ({ index: couple.current, hopping: couple.hopping, visited: couple.visited }),
    screenPos(id) { const p = positions[indexOf(id)]; world.camera.updateMatrixWorld(); return project(p.x, TOP, p.z); },
    // 这座岛在屏幕上的外接矩形（包围盒 8 个角投影）
    islandRect(id) {
      world.camera.updateMatrixWorld();
      framingBox(islands[indexOf(id)].group, bbox);
      const ps = [0, 1, 2, 3, 4, 5, 6, 7].map(k => project(k & 1 ? bbox.max.x : bbox.min.x,
        k & 2 ? bbox.max.y : bbox.min.y, k & 4 ? bbox.max.z : bbox.min.z));
      const xs = ps.map(q => q.x), ys = ps.map(q => q.y);
      return { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) };
    },
  };

  // ---------- 动画循环 ----------
  const clock = new THREE.Clock();
  world.renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
    world.update(dt);
    islands.forEach(isl => isl.update?.(t, dt));
    couple.update(t, dt);
    world.render();
    ui.updateLabels(i => project(positions[i].x, LABEL_AT.y, positions[i].z + LABEL_AT.dz),
                    world.camera.zoom * innerHeight / world.frustumHeight);   // 每世界单位多少像素
    app.ready = true;
  });

  // 带 #id 打开：小人直接站到那座岛上，镜头直接到位
  const i0 = hashIndex();
  if (i0 >= 0) { couple.placeAt(stands[i0], i0); focus(i0, { instant: true }); }
  else if (location.hash) history.replaceState(null, '', location.pathname + location.search);

  // 走到这里说明真的跑起来了：老浏览器检测误报的提示收掉，加载提示也收掉
  window.__started = true;
  $('fatal').hidden = true;
  $('loading').hidden = true;
}

start().catch(err => {
  console.error(err);
  showFatal('小世界加载失败了，刷新试试？或者点右上角「在浏览器打开」');
});
