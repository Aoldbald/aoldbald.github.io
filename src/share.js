// 分享图：卡片上“保存分享图” → 弹出 <dialog id="share">，显示 1080×1350 的图，可存到相册 / 发给别人。
// manifest = data/share.json（{id: {src, fp}}，没有就是 {}）；resolve 同照片：加密站点换成 blob: 地址，明文原样返回。
// 分享图只在点开弹窗时才下载（不占首屏流量）。
export function createShare({ manifest = {}, resolve = u => Promise.resolve(u), title = '' } = {}) {
  const root = document.documentElement;
  const box = document.getElementById('share');
  const img = box.querySelector('img');
  const saveBtn = box.querySelector('.share-save');
  box.setAttribute('aria-label', title ? `${title} 分享图` : '分享图');

  const has = id => !!manifest?.[id]?.src;
  let current = null;            // { id, url: Promise<string> }

  function cleanup() {
    root.classList.remove('share-open');
    img.removeAttribute('src');
    current = null;
  }
  function close() { if (box.open) box.close(); cleanup(); }

  async function open(place) {
    if (!has(place.id)) return;
    const id = place.id;
    const url = Promise.resolve(resolve(manifest[id].src));
    const cur = current = { id, url, file: null };
    img.alt = place.name ? `${place.name} 分享图` : '分享图';
    root.classList.add('share-open');
    saveBtn.disabled = true;          // 文件准备好之前不能点（点击时要同步调 navigator.share）
    if (!box.open) box.showModal();
    try {
      const u = await url;
      if (current !== cur) return;
      img.src = u;
      const blob = await (await fetch(u)).blob();
      if (current !== cur) return;
      cur.file = new File([blob], `our-little-world-${id}.jpg`, { type: 'image/jpeg' });
      saveBtn.disabled = false;
    } catch (e) { console.warn('分享图读取失败：', id, e); }
  }

  function download(file) {
    const a = document.createElement('a');
    const href = URL.createObjectURL(file);
    a.href = href; a.download = file.name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 10000);
  }

  // 点击处理必须同步调用 navigator.share（Safari 的“用户操作”许可经不起 await）：文件在 open() 里已备好
  function save() {
    const file = current?.file;
    if (!file) return;
    if (navigator.canShare?.({ files: [file] })) {
      let p;
      try { p = Promise.resolve(navigator.share({ files: [file] })); } catch (e) { p = Promise.reject(e); }
      p.catch(e => {
        if (e?.name === 'AbortError') return;      // 用户取消分享不算错
        console.warn('分享失败，改为下载：', e);
        download(file);
      });
    } else {
      download(file);
    }
  }

  saveBtn.addEventListener('click', save);
  box.querySelector('.share-close').addEventListener('click', close);
  box.addEventListener('cancel', e => { e.preventDefault(); close(); });
  box.addEventListener('close', cleanup);
  // 捕获阶段先拿到 Esc：只关弹窗（preventDefault 告诉 ui.js 别再回全景）
  addEventListener('keydown', e => {
    if (box.open && e.key === 'Escape') { e.preventDefault(); close(); }
  }, true);
  // 点背景（弹窗内容之外）关闭
  box.addEventListener('click', e => { if (!e.target.closest('img, button')) close(); });

  return { has, open, close, isOpen: () => box.open };
}
