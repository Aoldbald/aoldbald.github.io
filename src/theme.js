// 深色 / 浅色：默认跟系统（prefers-color-scheme）；点左下角 🌙/☀️ 手动切换，选择记在 localStorage，以后都听手动的。
// index.html <head> 里有一段同样规则的小脚本，首帧之前就把 <html data-theme> 定好（不闪）；这里负责之后的切换。
// 按钮上的 🌙/☀️ 由 CSS 按 data-theme 画，这里只管 aria-pressed（true = 现在是深色）。
export const KEY = 'theme';

const valid = t => t === 'dark' || t === 'light';
// 手动选过就用手动的，否则跟系统
export const resolveTheme = ({ stored, systemDark } = {}) => valid(stored) ? stored : (systemDark ? 'dark' : 'light');
export const nextTheme = t => t === 'dark' ? 'light' : 'dark';

function readStored() { try { return localStorage.getItem(KEY); } catch { return null; } }
function save(t) { try { localStorage.setItem(KEY, t); } catch { /* 隐私模式等：这次会话里照样生效，只是不记 */ } }

// onChange(theme)：主题变了（按钮或系统设置）就调用；初始主题不调用，由调用方自己按 .theme 设置
export function initTheme({ button = document.getElementById('theme-btn'), onChange = () => {} } = {}) {
  const root = document.documentElement;
  const mq = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null;
  let theme = resolveTheme({ stored: readStored(), systemDark: !!mq?.matches });
  let manual = valid(readStored());        // 存不进去时（隐私模式）也记住“这次会话里手动选过”

  const render = () => {
    root.dataset.theme = theme;
    button?.setAttribute('aria-pressed', String(theme === 'dark'));
  };
  const set = t => { if (t === theme) return; theme = t; render(); onChange(theme); };

  button?.addEventListener('click', () => { const t = nextTheme(theme); manual = true; save(t); set(t); });
  // 系统切深色 / 浅色：没手动选过才跟着变
  const follow = e => { if (!manual && !valid(readStored())) set(e.matches ? 'dark' : 'light'); };
  if (mq?.addEventListener) mq.addEventListener('change', follow); else mq?.addListener?.(follow);   // 老 Safari 只有 addListener
  render();

  return { get theme() { return theme; } };
}
