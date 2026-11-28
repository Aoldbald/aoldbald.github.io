// 背景音乐：<audio id="music" preload="none" loop> + 左下角 🎵 按钮（#music-btn）。
// 浏览器不许自动出声：第一次点 / 按键之后才开始放（淡入到 VOL），循环；
// 页面切到后台就暂停，回来接着放；🎵 切换静音，选择记在 localStorage（读写失败就当“开”）。
// mp3 本身已经压低了约 8 dB：iPhone 上 audio.volume 只读（永远 1），那就直接按原音量放、不淡入淡出。
// 故意不用 Web Audio：AudioContext 被系统挂起时会“按钮开着、paused 是 false，却没声音”。
const KEY = 'music', VOL = 0.9, FADE_IN = 2.5, FADE_OUT = 0.35;
// 这些事件里浏览器才认“用户真的操作了”（触摸的 pointerdown 不算，要等 pointerup / touchend / click）
const GESTURES = ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'];

function readOn() { try { return localStorage.getItem(KEY) !== 'off'; } catch { return true; } }
function saveOn(on) { try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch { /* 隐私模式等：不记也行 */ } }

export function initMusic({ audio = document.getElementById('music'), button = document.getElementById('music-btn') } = {}) {
  if (!audio || !button) return null;
  let on = readOn(), started = false, resumeOnShow = false, fade = 0, want = false;

  // 能不能调音量（iOS 不能：写进去读出来还是 1）
  const volumeWorks = (() => {
    try { const v = audio.volume; audio.volume = 0.5; const ok = audio.volume === 0.5; audio.volume = v; return ok; }
    catch { return false; }
  })();
  const setVol = v => { if (volumeWorks) audio.volume = Math.min(1, Math.max(0, v)); };

  function fadeTo(target, secs, done) {
    cancelAnimationFrame(fade);
    if (!volumeWorks) { done?.(); return; }
    const from = audio.volume, t0 = performance.now();
    const step = now => {
      // rAF 的时间戳是这一帧开始的时间，可能比 t0 还早：进度夹到 [0, 1]（音量越界会抛错）
      const s = Math.min(1, Math.max(0, (now - t0) / 1000 / secs));
      setVol(from + (target - from) * s);
      if (s < 1) fade = requestAnimationFrame(step); else done?.();
    };
    fade = requestAnimationFrame(step);
  }

  function play() {
    want = true;
    if (audio.paused) setVol(0);
    let p;                                          // 已经在放也照样 play()：直接 resolve，顺便淡回 VOL
    try { p = audio.play(); } catch { return; }
    Promise.resolve(p).then(() => {
      if (!want) { audio.pause(); return; }        // 等待期间又被静音 / 切到后台了
      started = true;
      stopListening();
      fadeTo(VOL, FADE_IN);
    }, () => {});                                   // 被拦了（还不算用户操作）：等下一次操作
  }
  function pause(smooth = true) {
    want = false;
    if (audio.paused) return;
    if (!smooth || !volumeWorks) { cancelAnimationFrame(fade); audio.pause(); return; }
    fadeTo(0, FADE_OUT, () => { if (!want) audio.pause(); });
  }

  // 第一次操作就开始放（点 🎵 本身不算：那一下由按钮自己处理）
  const kick = e => { if (on && !e.target?.closest?.('#music-btn')) play(); };
  function stopListening() { GESTURES.forEach(t => removeEventListener(t, kick, true)); }
  GESTURES.forEach(t => addEventListener(t, kick, true));

  // 名字固定“背景音乐”，开 / 关只靠 aria-pressed 表达
  const render = () => button.setAttribute('aria-pressed', String(on));
  button.addEventListener('click', () => {
    // 还没出过声（也没在启动中）：点 🎵 就是“放音乐”（不管之前存的是开还是关），不是把它关掉
    on = started || !audio.paused ? !on : true;
    saveOn(on); render();
    if (on) play(); else pause();
  });
  button.setAttribute('aria-label', '背景音乐');
  render();

  // 切到后台暂停，回来接着放
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { resumeOnShow = !audio.paused; if (resumeOnShow) pause(false); }
    else if (resumeOnShow && on) { resumeOnShow = false; play(); }
  });

  return { get on() { return on; }, audio };
}
