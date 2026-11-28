// 页面上的 DOM 部分：岛屿标签 + 卡片（宽屏右侧面板 / 手机底部抽屉）。不碰 three.js。
// 排版只认两个东西：<html data-layout="panel|drawer"> 和 CSS 变量 --panel-w（都由 layout() 写入）。
import { formatDate, nameParts, displayName } from './data.js';
import { layoutMode, panelWidth, uiWidth, labelBase, labelFit, DRAWER_PEEK, DRAWER_FULL } from './layout.js';
import { renderGallery, createLightbox, resizeGallery } from './gallery.js';

const CLOSE_PULL = 0.15;   // 抽屉从 peek 再往下拖超过屏高 15% 就关掉
const TAP_PX = 6;          // 按下到松开移动不超过这么多像素算“点一下”

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};

// resolve：加密站点把照片地址换成解密后的 blob: 地址（vault.url）；明文不传
export function createUI({ places, colors = [], onFocus, onHome, onDrawer = () => {}, resolve, share }) {
  const root = document.documentElement;
  const card = document.getElementById('card');
  const q = s => card.querySelector(s);
  const handle = q('.card-handle'), body = q('.card-body'), gallery = q('.card-gallery');
  const nameEl = q('.card-name'), metaEl = q('.card-meta'), storyEl = q('.card-story');
  const prevBtn = q('.card-prev'), nextBtn = q('.card-next'), countEl = q('.card-count'), shareBtn = q('.card-share');

  let state = 'closed';      // closed / peek / full（面板模式下 peek、full 都算“打开”）
  let mode = null;
  let current = -1;          // 卡片上是第几站（上一站 / 下一站按钮用）

  // ---------- 标签 ----------
  const labelsEl = document.getElementById('labels');
  const labels = places.map((p, i) => {
    const b = el('button', 'label');
    b.type = 'button';
    const nm = el('span', 'label-name');
    nameParts(p.name).forEach((s, k) => { if (k) nm.append(document.createElement('br')); nm.append(s); });
    b.append(nm, el('small', null, formatDate(p.date) || '？？？'));
    b.addEventListener('click', () => onFocus(i));
    labelsEl.appendChild(b);
    return b;
  });

  // 标签宽度缓存（每帧读 offsetWidth 会逼浏览器重排）；排版变化时清掉
  let widths = [];
  const halfW = i => (widths[i] ??= labels[i].offsetWidth / 2);
  document.fonts?.addEventListener?.('loadingdone', () => { widths = []; });   // 字体晚到会改变标签宽度

  // 标签字号、最宽跟着岛在屏幕上的大小（pxPerUnit = 每世界单位多少像素）；变了才写 CSS 变量，并清掉宽度缓存
  // （labelFit 取了台阶，镜头飞一趟只变几次；refits 记次数，测试用）
  let fitKey = '', refits = 0;
  function fitLabels(pxPerUnit) {
    const f = labelFit(pxPerUnit, labelBase(innerWidth));
    const key = f.font.toFixed(2) + '/' + Math.round(f.maxW);
    if (key === fitKey) return;
    fitKey = key; widths = []; refits++;
    labelsEl.style.setProperty('--label-fs', f.font.toFixed(2) + 'px');
    labelsEl.style.setProperty('--label-max', Math.round(f.maxW) + 'px');
  }

  function updateLabels(project, pxPerUnit) {
    if (pxPerUnit) fitLabels(pxPerUnit);
    // 卡片挡住的地方不放标签，免得半截标签从卡片边上探出来
    const open = state !== 'closed';
    const coverX = open && mode === 'panel' ? innerWidth - panelWidth(innerWidth) : Infinity;
    const coverY = open && mode === 'drawer'
      ? innerHeight * (1 - (state === 'full' ? DRAWER_FULL : DRAWER_PEEK)) : Infinity;
    labels.forEach((b, i) => {
      const s = project(i);
      const off = s.x < -200 || s.x > innerWidth + 200 || s.y < -100 || s.y > innerHeight + 200;
      b.style.visibility = off ? 'hidden' : '';
      if (off) return;
      b.style.transform = `translate(${s.x}px,${s.y}px) translate(-50%,-100%)`;
      const cov = s.x + halfW(i) > coverX - 8 || s.y > coverY - 8;
      if (b.classList.contains('covered') !== cov) {   // 被挡住的标签也别让 Tab 停上去
        b.classList.toggle('covered', cov);
        b.tabIndex = cov ? -1 : 0;
      }
    });
  }

  function setActive(index) {
    labels.forEach((b, k) => b.classList.toggle('active', k === index));
    root.classList.toggle('focused', index != null);
  }

  // ---------- 卡片 ----------
  function setState(s, notify = true) {
    if (s === state) return;
    state = s;
    card.dataset.state = s;
    card.inert = s === 'closed';
    card.setAttribute('aria-hidden', String(s === 'closed'));
    if (notify && s !== 'closed') onDrawer(s);
  }

  // 照片：卡片里横向轮播，点开全屏；全屏关掉时卡片停到刚才看的那张
  let shown = { show() {} };
  const lightbox = createLightbox({ onClose: (i, user) => shown.show(i, user), resolve });

  function showCard(place) {
    const i = current = places.indexOf(place);
    lightbox.close(); share?.close?.();
    countEl.textContent = `${i + 1} / ${places.length}`;
    shareBtn.hidden = !share?.has(place.id);
    prevBtn.disabled = i <= 0;
    nextBtn.disabled = i >= places.length - 1;
    card.style.setProperty('--island', colors[i] ?? '#e98a6b');
    nameEl.textContent = displayName(place.name);
    metaEl.textContent = [place.sub, formatDate(place.date)].filter(Boolean).join(' · ');
    storyEl.textContent = place.story ?? '';
    // 先填文字再画照片：面板里照片区高度取决于文字占多少，照片按最终大小挑档
    shown = renderGallery(gallery, place, { onOpen: k => lightbox.open(place, k), resolve });
    body.scrollTop = 0;
    if (state === 'closed' || state === 'full') setState('peek', false);
  }

  function hideCard() { cancelDrag(); lightbox.close(); share?.close?.(); setState('closed'); }

  shareBtn.addEventListener('click', () => { if (current >= 0) share?.open(places[current]); });
  q('.card-close').addEventListener('click', () => onHome());
  // 上一站 / 下一站：和点岛、点标签走同一条路（main.js 的 focus）
  // 走到头按钮变灰（disabled）会丢掉键盘焦点：交给另一个方向的按钮
  const step = (d, btn, other) => btn.addEventListener('click', () => {
    const i = current + d;
    if (i < 0 || i >= places.length) return;
    onFocus(i);
    if (btn.disabled && document.activeElement !== other) other.focus();
  });
  step(-1, prevBtn, nextBtn);
  step(+1, nextBtn, prevBtn);
  // 全屏查看在捕获阶段先处理 Esc 并 preventDefault：那时只关全屏，不回全景
  addEventListener('keydown', e => { if (e.key === 'Escape' && !e.defaultPrevented) onHome(); });

  // ---------- 抽屉拖动（pointer 事件：鼠标、触摸都行） ----------
  let drag = null;
  const peekOffset = () => (DRAWER_FULL - DRAWER_PEEK) * innerHeight;   // peek 时卡片往下挪的像素

  let noClickUntil = 0;       // 从照片上拖过抽屉后，紧跟着的 click 别再打开全屏
  card.addEventListener('pointerdown', e => {
    if (mode !== 'drawer' || state === 'closed' || !e.isPrimary || e.button > 0) return;
    cancelDrag();                // 上一次拖动的 up / cancel 丢了：作废，从这次重新开始
    const onHandle = handle.contains(e.target);
    // peek 时从照片上开始的先“待定”：竖着滑才算拖抽屉，横着滑留给浏览器翻照片，点一下留给 click 开全屏
    const pending = !onHandle && state === 'peek' && !!e.target.closest('.card-gallery')
      && !e.target.closest('.gal-prev, .gal-next');
    // full 时只有拖动条能拖（内容区要留给滚动）；peek 时整张卡都能往上拉，按钮除外
    if (!onHandle && !pending && (state !== 'peek' || e.target.closest('button, .card-gallery'))) return;
    drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, base: state === 'full' ? 0 : peekOffset(),
             off: null, onHandle, pending };
    if (!pending) e.preventDefault();
  });
  addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;     // 只认按下的那根手指
    if (e.pointerType === 'mouse' && e.buttons === 0) { cancelDrag(); return; }   // 鼠标键早松了（up 丢在窗口外）
    const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
    if (drag.off == null) {
      if (Math.abs(dy) <= TAP_PX) return;
      if (drag.pending && Math.abs(dy) <= Math.abs(dx)) { cancelDrag(); return; }  // 横着滑：交给照片横条
    }
    card.classList.add('dragging');
    drag.off = Math.min(Math.max(drag.base + dy, 0), DRAWER_FULL * innerHeight);
    card.style.transform = `translateY(${drag.off}px)`;
  });
  function cancelDrag() {                    // 不切档，回到原来那一档
    if (!drag) return null;
    const d = drag; drag = null;
    card.classList.remove('dragging');
    card.style.transform = '';
    return d;
  }
  const endDrag = e => {
    if (!drag || e.pointerId !== drag.id) return;
    const d = cancelDrag();
    if (d.pending && d.off != null) noClickUntil = performance.now() + 500;
    if (d.off == null) {                       // 点一下：拖动条切换两档，peek 时点内容展开（点照片是开全屏，不切档）
      if (d.pending) return;
      if (d.onHandle) setState(state === 'full' ? 'peek' : 'full');
      else if (state === 'peek') setState('full');
      return;
    }
    const visible = DRAWER_FULL - d.off / innerHeight;       // 露出来占屏高的比例
    if (visible < DRAWER_PEEK - CLOSE_PULL) { onHome(); return; }
    setState(Math.abs(visible - DRAWER_FULL) < Math.abs(visible - DRAWER_PEEK) ? 'full' : 'peek');
  };
  addEventListener('pointerup', endDrag);
  card.addEventListener('click', e => {
    if (performance.now() < noClickUntil && e.target.closest('.card-gallery')) { e.stopPropagation(); e.preventDefault(); }
    noClickUntil = 0;
  }, true);
  addEventListener('pointercancel', e => { if (drag && e.pointerId === drag.id) cancelDrag(); });

  // ---------- 响应式 ----------
  function layout() {
    const w = innerWidth, h = innerHeight, m = layoutMode(w), panelW = panelWidth(w);
    if (mode && m !== mode) {                  // 换排版时别播滑动动画
      card.classList.add('dragging');
      requestAnimationFrame(() => requestAnimationFrame(() => card.classList.remove('dragging')));
    }
    mode = m; widths = [];
    root.dataset.layout = m;
    root.style.setProperty('--panel-w', panelW + 'px');
    root.style.setProperty('--ui-w', uiWidth(w) + 'px');      // 文字、标签按这个缩放（面板变宽了字不跟着变大）
    root.style.setProperty('--drawer-peek', String(DRAWER_PEEK));
    root.style.setProperty('--drawer-full', String(DRAWER_FULL));
    resizeGallery(gallery);                    // 换排版后卡片照片按新大小挑档
    return { w, h, mode: m, panelW, drawerFrac: state === 'full' ? DRAWER_FULL : DRAWER_PEEK };
  }

  card.dataset.state = state; card.inert = true;
  layout();

  const labelHeight = i => labels[i]?.offsetHeight ?? 0;
  return { setActive, showCard, hideCard, updateLabels, fitLabels, layout, labelHeight,
           get state() { return state; }, get refits() { return refits; } };
}
