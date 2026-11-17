// 照片：卡片里的横向轮播（renderGallery）+ 全屏查看（createLightbox）。
// 只在打开卡片时才往页面里放 <img>，首屏不下载任何照片。
const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};

const clamp = (i, n) => Math.min(Math.max(i, 0), n - 1);
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// srcset 的键就是这一档的像素宽度："800" → "…-800.webp 800w"
const tiers = ph => Object.keys(ph.srcset ?? {}).map(Number).sort((a, b) => a - b);
const srcsetOf = ph => tiers(ph).map(w => `${ph.srcset[w]} ${w}w`).join(', ');

// 加密站点不能用 srcset（浏览器自己挑档、直接下载的是密文）：自己按显示像素挑一档。
// 返回 ≥ px 的最小档；都比 px 小就用最大档
export function pickTier(list, px) {
  const t = [...list].sort((a, b) => a - b);
  return t.find(w => w >= px) ?? t[t.length - 1];
}

// 加密时代替 loading="lazy"：照片滑到横条里（或紧挨着的下一张）才去下载、解密。
// root = 横条，左右各多看一屏；不支持 IntersectionObserver 的老浏览器直接加载
function lazyIn(root) {
  if (typeof IntersectionObserver === 'undefined') return (img, load) => load();
  const jobs = new Map();
  const io = new IntersectionObserver(es => es.forEach(e => {
    const load = jobs.get(e.target);
    if (!load || !(e.isIntersecting || !e.target.isConnected)) return;
    jobs.delete(e.target); io.unobserve(e.target);   // 已经从页面拿掉的（全屏关了）：只清掉，不加载
    if (e.target.isConnected) load();
  }), { root, rootMargin: '0px 100%' });
  return (img, load) => { jobs.set(img, load); io.observe(img); };
}

// enc 不传（明文）：srcset + sizes 交给浏览器挑档。
// enc = { resolve, px, lazy }（加密）：px() 是这张照片要显示的物理像素宽，挑一档，解密成 blob: 地址再放进 src
function photoImg(place, ph, n, sizes, enc) {
  const img = el('img');
  img.alt = `${place.name ?? ''} 照片 ${n}`;
  img.loading = 'lazy';
  img.decoding = 'async';
  img.draggable = false;
  if (ph.w && ph.h) { img.width = ph.w; img.height = ph.h; }   // 没加载完也知道比例，不跳版
  const t = tiers(ph);
  if (enc) {
    if (t.length) enc.lazy(img, () => enc.resolve(ph.srcset[pickTier(t, enc.px())])
      .then(u => { img.src = u; }, () => { img.classList.add('failed'); }));
    return img;
  }
  img.sizes = sizes;
  img.srcset = srcsetOf(ph);
  if (t.length) img.src = ph.srcset[t.find(w => w >= 1600) ?? t[t.length - 1]];  // 不认 srcset 的老浏览器用
  return img;
}

// 卡片里这张照片实际显示多宽（contain）：min(照片区宽, 照片区高 × 宽高比)，竖图比照片区窄得多。
// 照片区还没排版（宽 0）时按整屏宽兜底。ar = 宽 / 高
export function cardSizes(container, ar = 4 / 3) {
  const W = container?.clientWidth, H = container?.clientHeight;
  return W && H ? `${Math.round(Math.min(W, H * ar))}px` : '100vw';
}
const arOf = ph => (ph.w && ph.h ? ph.w / ph.h : 4 / 3);
// 换排版后（ui.layout()）按新的照片区大小重算每张照片的 sizes（铺底和照片一起改，仍然只下载一次）
export function resizeGallery(container) {
  container.querySelectorAll('.gal-slide').forEach(s => {
    const sizes = cardSizes(container, +s.dataset.ar);
    s.querySelectorAll('img').forEach(img => { if (img.sizes !== sizes) img.sizes = sizes; });
  });
}

// 一屏一张的 scroll-snap 横条：记住当前第几张，scroll 时更新；程序滚动的途中不乱报
function snapStrip(strip, count, onIndex) {
  let cur = 0, want = null;
  const w = () => strip.clientWidth || 1;
  strip.addEventListener('scroll', () => {
    const pos = strip.scrollLeft / w();
    if (want != null) { if (Math.abs(pos - want) > 0.02) return; want = null; }
    const i = clamp(Math.round(pos), count());
    if (i !== cur) { cur = i; onIndex(i); }
  }, { passive: true });
  for (const t of ['pointerdown', 'wheel', 'touchstart']) strip.addEventListener(t, () => { want = null; }, { passive: true });
  return {
    get index() { return cur; },
    to(i, smooth = true) {
      cur = i = clamp(i, count());
      const left = i * w();
      onIndex(i);
      if (!smooth || reduceMotion()) { want = null; strip.scrollLeft = left; return; }
      want = Math.abs(strip.scrollLeft - left) < 1 ? null : i;
      strip.scrollTo({ left, behavior: 'smooth' });
    },
    step(d) {                                   // 已经在头/尾就别再滚（免得打断正在进行的平滑滚动）
      const base = want ?? cur, i = clamp(base + d, count());
      if (i !== base) this.to(i);
    },
  };
}

function arrow(cls, label) {
  const b = el('button', cls);
  b.type = 'button';
  b.setAttribute('aria-label', label);
  return b;
}

// 卡片顶上的照片区。0 张：岛屿颜色的渐变占位。返回 { show(i) } 让全屏关掉后同步到同一张。
export function renderGallery(container, place, { onOpen = () => {}, resolve } = {}) {
  const photos = place.photos ?? [], n = photos.length;
  container.replaceChildren();
  container.classList.toggle('has-photos', n > 0);
  if (!n) {
    const ph = el('div', 'card-ph');
    ph.append(el('span', 'card-ph-icon', '✨'), el('span', 'card-ph-text', '还没有照片'));
    container.append(ph);
    return { show() {} };
  }

  const strip = el('div', 'gal-strip');
  container.append(strip);
  const lazy = resolve && lazyIn(strip);
  photos.forEach((ph, i) => {
    const b = el('button', 'gal-slide');
    b.type = 'button';
    b.dataset.ar = String(arOf(ph));
    const sizes = cardSizes(container, arOf(ph));
    b.setAttribute('aria-label', `查看大图 ${i + 1} / ${n}`);
    // 照片完整显示（contain），空白处铺同一张照片的模糊放大版；两张 srcset/sizes 一样，浏览器只下载一次
    // 加密时两张挑同一档 → vault.url 缓存同一个 blob，也只下载、解密一次
    const enc = resolve && { resolve, lazy, px: () => (container.clientWidth || innerWidth) * (devicePixelRatio || 1) };
    const bg = photoImg(place, ph, i + 1, sizes, enc);
    bg.className = 'gal-bg'; bg.alt = ''; bg.setAttribute('aria-hidden', 'true');
    const img = photoImg(place, ph, i + 1, sizes, enc);
    img.className = 'gal-photo';
    b.append(bg, img);
    b.addEventListener('click', () => onOpen(i));
    strip.append(b);
  });

  let dots = [], prev = null, next = null;
  if (n > 1) {
    const d = el('div', 'gal-dots');
    d.setAttribute('aria-hidden', 'true');
    dots = photos.map(() => d.appendChild(el('span')));
    prev = arrow('gal-prev', '上一张');
    next = arrow('gal-next', '下一张');
    container.append(d, prev, next);
  }
  const s = snapStrip(strip, () => n, i => {
    dots.forEach((x, k) => x.classList.toggle('on', k === i));
    if (prev) { prev.disabled = i === 0; next.disabled = i === n - 1; }
  });
  prev?.addEventListener('click', () => s.step(-1));
  next?.addEventListener('click', () => s.step(1));
  s.to(0, false);              // 永远从第 1 张开始、从左往右（cover 只给海报用）
  // focus：用户关掉全屏时把焦点放回这张（键盘用户接着从这里走）
  return { show(i, focus = false) { s.to(i, false); if (focus) strip.children[s.index]?.focus({ preventScroll: true }); } };
}

// 全屏查看：<dialog id="lightbox">（showModal 自带“其他地方点不到、Tab 出不去”）
export function createLightbox({ onClose = () => {}, resolve } = {}) {
  const box = document.getElementById('lightbox');
  const strip = box.querySelector('.lb-strip'), count = box.querySelector('.lb-count');
  const prev = box.querySelector('.lb-prev'), next = box.querySelector('.lb-next');
  const root = document.documentElement;
  let n = 0, openedAt = -Infinity, downOnBg = false;
  const lazy = resolve && lazyIn(strip);
  const s = snapStrip(strip, () => n, i => {
    count.textContent = `${i + 1} / ${n}`;
    prev.disabled = i === 0; next.disabled = i === n - 1;
  });

  function open(place, i = 0) {
    const photos = place.photos ?? [];
    if (!photos.length) return;
    n = photos.length;
    strip.replaceChildren(...photos.map((ph, k) => {
      const slide = el('div', 'lb-slide');
      const ar = ph.w && ph.h ? ph.w / ph.h : 4 / 3;
      // 按实际显示宽度挑档：宽受屏宽限制，也受屏高 × 宽高比限制
      const enc = resolve && { resolve, lazy, px: () => Math.min(innerWidth, innerHeight * ar) * (devicePixelRatio || 1) };
      const img = photoImg(place, ph, k + 1, `min(100vw, ${+(100 * ar).toFixed(2)}vh)`, enc);
      img.style.setProperty('--ar', String(ar));
      slide.append(img);
      return slide;
    }));
    box.classList.toggle('single', n < 2);
    root.classList.add('lightbox-open');          // 3D 标签藏起来
    if (!box.open) { box.showModal(); openedAt = performance.now(); downOnBg = false; }
    s.to(i, false);
  }

  // user：用户自己关的（Esc / × / 点背景），onClose 据此决定要不要把焦点放回卡片
  function cleanup(user) {                        // 同步收尾（dialog 的 close 事件是异步的，只当兜底）
    if (!root.classList.contains('lightbox-open')) return;
    root.classList.remove('lightbox-open');
    const i = s.index;
    strip.replaceChildren();                      // 关掉就不再下载
    onClose(i, user);
  }
  function close(user = false) { if (box.open) box.close(); cleanup(user); }
  const userClose = () => close(true);
  box.addEventListener('close', () => { if (!box.open) cleanup(true); });   // 兜底：别的途径关掉的（已重新打开就不管）
  box.addEventListener('cancel', e => { e.preventDefault(); userClose(); });

  // 捕获阶段先拿到按键：Esc 只关全屏（preventDefault 告诉 ui.js 别再回全景），←/→ 翻页
  addEventListener('keydown', e => {
    if (!box.open) return;
    if (e.key === 'Escape') { e.preventDefault(); userClose(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); s.step(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); s.step(-1); }
  }, true);

  box.querySelector('.lb-close').addEventListener('click', userClose);
  prev.addEventListener('click', () => s.step(-1));
  next.addEventListener('click', () => s.step(1));
  // 点背景关：按下和松开都要在背景上（从照片拖到背景不算），刚打开的 350ms 内也不算（双击卡片照片的第二下）
  const onBg = e => !e.target.closest('img, button');
  box.addEventListener('pointerdown', e => { downOnBg = onBg(e); });
  box.addEventListener('click', e => {
    if (onBg(e) && downOnBg && performance.now() - openedAt >= 350) userClose();
    downOnBg = false;
  });

  return { open, close: () => close(false), isOpen: () => box.open };
}
