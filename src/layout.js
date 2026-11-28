// 纯逻辑：岛屿 S 形布局与响应式断点（不依赖 three.js）
export const COL_X = 9, ROW_Z = 19, R = 6, TOP = 1.5;
export const MOBILE_MAX = 767, WIDE_MIN = 2400;
export const DRAWER_PEEK = 0.5, DRAWER_FULL = 0.85;

export function islandPositions(n) {
  const rows = Math.ceil(n / 2);
  return Array.from({ length: n }, (_, i) => {
    const r = Math.floor(i / 2), c = i % 2;
    const z = (r - (rows - 1) / 2) * ROW_Z;
    const x = (r % 2 === 0 ? (c === 0 ? -1 : 1) : (c === 0 ? 1 : -1)) * COL_X;
    return { x, z };
  });
}

export function routeBounds(positions) {
  const xs = positions.map(p => p.x), zs = positions.map(p => p.z);
  return {
    minX: Math.min(...xs) - R, maxX: Math.max(...xs) + R,
    minZ: Math.min(...zs) - R, maxZ: Math.max(...zs) + R,
  };
}

export function homeTarget(positions) {
  const b = routeBounds(positions);
  return { x: (b.minX + b.maxX) / 2, z: (b.minZ + b.maxZ) / 2 - 2 };
}

export function fitHeight(n, aspect) {
  return Math.max((Math.ceil(n / 2) - 1) * ROW_Z * 0.81 + 34, 42 / aspect);
}

export const layoutMode = w => (w <= MOBILE_MAX ? 'drawer' : 'panel');
export const PANEL_FRAC = 0.6;                                   // 宽屏面板占视口宽 60%
export const panelWidth = w => Math.round(w * PANEL_FRAC);
export const uiWidth = w => (w >= WIDE_MIN ? 560 : 440);          // 文字、标签大小的基准（--ui-w）

export function focusOffsetPx({ h, mode, panelW, drawerFrac }) {
  return mode === 'panel' ? { dx: panelW / 2, dy: 0 } : { dx: 0, dy: (h * drawerFrac) / 2 };
}

// 聚焦镜头：zoom 和“盒子中心”（世界单位，沿相机右/上方向，相对岛的锚点）。
// 面板模式：box = 岛（含标签锚点）在屏幕右/上方向上的范围，labelH = 标签本身的像素高（在锚点上面）；
// zoom 让岛本身（box 的宽）占左边空白区宽的 ISLAND_FRAC（用户要“小岛小一点”）；ISLAND_FRAC ≤ 0.8，
// 所以左右各自一定留得出 ≥ 10% 的边距，不用再单独算横向限制。竖向：整块（含标签）上下各留 PAD_Y。不超过原来的 2.4。
// 抽屉模式和以前一样：固定 2.4（拉满 1.6），对准锚点。
export const ZOOM_FOCUS = 2.4, ZOOM_FULL = 1.6, ZOOM_MIN = 0.6;
const PAD_Y = 0.06, ISLAND_FRAC = 0.55;
export function focusFrame({ w, h, mode, panelW, drawerFrac, frustumH, box, labelH = 0 }) {
  const { dx, dy } = focusOffsetPx({ h, mode, panelW, drawerFrac });
  if (mode !== 'panel' || !box) {
    return { zoom: mode === 'drawer' && drawerFrac === DRAWER_FULL ? ZOOM_FULL : ZOOM_FOCUS, cx: 0, cy: 0, dx, dy };
  }
  const k = h / frustumH;                         // zoom 为 1 时每个世界单位多少像素
  const bw = box.right - box.left, bh = box.top - box.bottom;
  const zy = (h * (1 - 2 * PAD_Y) - labelH) / (bh * k);
  const zi = ((w - panelW) * ISLAND_FRAC) / (bw * k);
  const zoom = Math.min(Math.max(Math.min(zi, zy), ZOOM_MIN), ZOOM_FOCUS);
  return { zoom, cx: (box.left + box.right) / 2, cy: (box.bottom + box.top) / 2 + labelH / 2 / (k * zoom), dx, dy };
}

// ---------- 全景标签：跟着岛在屏幕上的大小走 ----------
// 原来的字号：面板 = --ui-w × .034（1080p 14.96px、1440p 19.04px），抽屉 15px
export const labelBase = w => (layoutMode(w) === 'panel' ? uiWidth(w) * 0.034 : 15);
// pxPerUnit = 每个世界单位多少屏幕像素。同排两座岛相距 2·COL_X：标签最宽 = 这段距离 − LABEL_GAP，
// 两个标签各占一半就碰不到。字号 ≈ LABEL_K × pxPerUnit（岛画得小字也小），不小于 12px，不大于原来的。
// 镜头飞行 / 缩放时每帧都在算：取整成台阶（字号 0.5px、宽度往下取 8px，宽度最多 16em —— CSS 本来就封顶），
// 值不变就不用改 CSS、不用重排，飞一趟只变几次。
export const LABEL_GAP = 12, LABEL_MIN_PX = 12, LABEL_K = 0.9;
export function labelFit(pxPerUnit, base) {
  const f = LABEL_K * pxPerUnit;
  const font = f >= base ? base : Math.min(base, Math.max(LABEL_MIN_PX, Math.round(f * 2) / 2));
  const w = 2 * COL_X * pxPerUnit - LABEL_GAP;
  return { font, maxW: w >= 16 * base ? Math.ceil(16 * base) : Math.max(Math.floor(w / 8) * 8, 48) };
}

// 全景构图（默认俯角）：顶上 topPx 像素留给标题 + 第一排标签（标签从挂点往上长），底下留 botPx。
// off = 镜头相对目标点的偏移；相机上向量 u = (0, off.z, −off.y)/|off|，点 p 在屏幕上的高度 = (p − 目标)·u。
// 先用原来的 fitHeight 和 homeTarget；第一排挂点太靠上就把目标点往后挪（内容整体往下移，用掉底下的空），
// 上下合起来都放不下才把视野拉大。labelY / labelDz = 标签挂点相对岛心的高度、前后。
export function homeFrame(positions, { w, h, topPx = 0, botPx = 0, labelY = 0, labelDz = 0, off }) {
  const base = homeTarget(positions), b = routeBounds(positions);
  const len = Math.hypot(off.y, off.z), uy = off.z / len, uz = -off.y / len;
  const top = labelY * uy + (b.minZ + R + labelDz - base.z) * uz;   // 第一排挂点在目标点上方多少（世界单位）
  const bottom = (b.maxZ + 1 - base.z) * uz;                         // 最后一排岛下沿（含浅色水边），负数
  const room = Math.max(h - topPx - botPx, h * 0.4);                 // 标题太高（横屏手机）也至少给内容留 40%
  const height = Math.max(fitHeight(positions.length, w / h), (top - bottom) * h / room);
  const s = Math.max(0, top - (h / 2 - topPx) * height / h);         // 内容要往下挪多少（世界单位，沿屏幕上方向）
  return { target: { x: base.x, z: base.z + s / uz }, height };
}
