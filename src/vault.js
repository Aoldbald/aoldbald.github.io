// Site vault (browser/Node side). Decrypts files made by tools/vault.py.
// File format: 12-byte IV || ciphertext+tag (AES-256-GCM). Key: PBKDF2-SHA256, iter/salt from data/lock.json.
const KEY_NAME = 'olw-key';
const MIME = { webp: 'image/webp', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png' };

export function encPath(url) {
  const i = url.indexOf('?');
  return i < 0 ? url + '.enc' : url.slice(0, i) + '.enc' + url.slice(i);
}

export function safeLocalStorage() {
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
}

const b64ToBytes = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const bytesToB64 = (u8) => {
  let s = '';
  for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
  return btoa(s);
};

export function createVault({ fetch = globalThis.fetch, storage = safeLocalStorage(), base = 'data/' } = {}) {
  const subtle = () => globalThis.crypto && globalThis.crypto.subtle;
  let lock = null;
  let key = null;
  const blobUrls = new Map();

  const store = {
    get() { try { return storage ? storage.getItem(KEY_NAME) : null; } catch { return null; } },
    set(v) { try { if (storage) storage.setItem(KEY_NAME, v); } catch { /* private mode */ } },
    del() { try { if (storage) storage.removeItem(KEY_NAME); } catch { /* private mode */ } },
  };

  async function decrypt(k, bytes) {
    const iv = bytes.slice(0, 12);
    const data = bytes.slice(12);
    return new Uint8Array(await subtle().decrypt({ name: 'AES-GCM', iv }, k, data));
  }
  async function checkKey(k) {
    try {
      const plain = await decrypt(k, b64ToBytes(lock.check));
      return new TextDecoder().decode(plain) === 'olw-ok';
    } catch {
      return false;
    }
  }

  const vault = {
    mode: 'plain',
    async init() {
      // 只有 404（真的没有 lock.json）才算明文站点；别的错误（5xx、断网、lock.json 坏了）一律报错，
      // 绝不因为一时读不到就退回明文模式
      const res = await fetch(base + 'lock.json');
      if (res.status === 404) { vault.mode = 'plain'; return 'plain'; }
      if (!res.ok) throw new Error('lock.json 读取失败：' + res.status);
      const l = await res.json();
      if (!l || typeof l.salt !== 'string' || typeof l.check !== 'string' || !(Number.isInteger(l.iter) && l.iter > 0)) {
        throw new Error('lock.json 格式不对');
      }
      lock = l;
      vault.mode = 'locked';
      return 'locked';
    },
    async unlock(password, remember = true) {
      if (!lock) return false;
      try {
        const base0 = await subtle().importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
        const k = await subtle().deriveKey(
          { name: 'PBKDF2', hash: 'SHA-256', salt: b64ToBytes(lock.salt), iterations: lock.iter },
          base0, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
        if (!(await checkKey(k))) return false;
        key = k;
        vault.mode = 'open';
        if (remember) {
          const raw = new Uint8Array(await subtle().exportKey('raw', k));
          store.set(JSON.stringify({ salt: lock.salt, key: bytesToB64(raw) }));
        }
        return true;
      } catch {
        return false;
      }
    },
    async tryRemembered() {
      if (!lock) return false;
      const saved = store.get();
      if (!saved) return false;
      try {
        const { salt, key: raw } = JSON.parse(saved);
        if (salt === lock.salt) {
          const k = await subtle().importKey('raw', b64ToBytes(raw), { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']);
          if (await checkKey(k)) {
            key = k;
            vault.mode = 'open';
            return true;
          }
        }
      } catch { /* fall through: invalid memory */ }
      store.del();
      return false;
    },
    async bytes(url) {
      const res = await fetch(encPath(url));
      if (!res.ok) throw new Error('fetch failed: ' + url + ' ' + res.status);
      return decrypt(key, new Uint8Array(await res.arrayBuffer()));
    },
    async json(url) {
      if (vault.mode !== 'open') {
        const res = await fetch(url);
        if (!res.ok) throw new Error('fetch failed: ' + url + ' ' + res.status);
        return res.json();
      }
      return JSON.parse(new TextDecoder().decode(await vault.bytes(url)));
    },
    async url(url) {
      if (vault.mode !== 'open') return url;
      if (!blobUrls.has(url)) {
        const ext = url.split('?')[0].split('.').pop().toLowerCase();
        const p = vault.bytes(url).then((b) =>
          URL.createObjectURL(new Blob([b], { type: MIME[ext] || 'application/octet-stream' })));
        p.catch(() => blobUrls.delete(url));
        blobUrls.set(url, p);
      }
      return blobUrls.get(url);
    },
    forget() {
      store.del();
    },
  };
  return vault;
}
