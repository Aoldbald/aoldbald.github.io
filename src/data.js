// 纯逻辑：places.json 规整（不依赖 three.js）
export const NEXT_PLACE = {
  id: 'next', name: '下一站？', sub: '待解锁', date: '', theme: 'next',
  caption: '留给我们的下一个故事',
  story: '这座岛还空着。以后每去一个新地方，这里就会多一座小岛。',
  photos: [], cover: 0, visibility: 'exact',
};

// 排序键："YYYY-MM-DD" → "YYYYMMDD"，"YYYY-MM" → "YYYYMM00"（排在同月具体日期前）；不合法 → null
export function dateKey(s) {
  const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(String(s ?? ''));
  if (!m || +m[2] < 1 || +m[2] > 12 || (m[3] != null && (+m[3] < 1 || +m[3] > 31))) return null;
  return m[1] + m[2] + (m[3] ?? '00');
}

export function normalizePlaces(raw) {
  const places = (raw.places || [])
    .filter(p => p.visibility !== 'hidden')
    .map(p => {
      const photos = p.photos || [];
      const cover = Math.min(Math.max(p.cover ?? 0, 0), Math.max(photos.length - 1, 0));
      const key = dateKey(p.date);
      if (key == null) console.warn('地点日期缺失或格式不对，排到最后：', p.id, p.date);
      return [key, { ...p, photos, cover }];
    })
    // 路线按 date 从早到晚（数据里的编号/顺序无意义）；sort 是稳定的，同一天保持表格顺序；没日期的排最后
    .sort(([a], [b]) => (a == null) - (b == null) || (a == null ? 0 : a < b ? -1 : a > b ? 1 : 0))
    .map(([, p]) => p);
  places.push({ ...NEXT_PLACE, photos: [] });
  return { title: raw.title, subtitle: raw.subtitle, places };
}

export const formatDate = s => (s ? String(s).replaceAll('-', '.') : '');

// 同一天去了几个地方：表格里用分号分开（"Octmon; eSpot"）。标签里一个地方一行，卡片/分享图用 & 连起来
export const nameParts = s => String(s ?? '').split(/[;；]/).map(x => x.trim()).filter(Boolean);
export const displayName = s => nameParts(s).join(' & ');

// 读一个 fetch 回来的 JSON 响应：不是 2xx 就报错
export function jsonOf(res) {
  if (!res.ok) throw new Error('places.json 读取失败：' + res.status);
  return res.json();
}

// json：怎么把地址变成 JSON（加密站点传 vault.json，解密后再解析）；不传就是普通 fetch
export async function loadPlaces(url = 'data/places.json', json = u => fetch(u).then(jsonOf)) {
  return normalizePlaces(await json(url));
}
