// Uygulama girişi: menü, sayfalar, gitar girişi ve güncelleme durumu.
import { loadAll, getSettings, setSetting } from './lib/store.js';
import { input } from './audio/input.js';
import { openPractice, setSoundFont } from './ui/practice.js';
import { renderHome } from './ui/home.js';
import { renderSongs } from './ui/songs.js';
import { renderWarmups } from './ui/warmup.js';
import { renderTuner } from './ui/tuner.js';
import { renderSettings } from './ui/settings.js';
import { esc, toast } from './lib/dom.js';

const view = document.getElementById('view');
let pageCleanup = null;
let practice = null;

const ROUTES = {
  ana: renderHome,
  sarkilar: renderSongs,
  isinma: renderWarmups,
  akort: renderTuner,
  ayarlar: renderSettings,
};

export const app = {
  info: null,
  go(route) {
    location.hash = '#/' + route;
  },
  /** Çalma ekranını aç. */
  play(opts) {
    if (pageCleanup) pageCleanup();
    pageCleanup = null;
    document.querySelectorAll('.side a').forEach((a) => a.classList.remove('active'));
    const back = currentRoute();
    practice = openPractice(view, {
      ...opts,
      onExit: () => {
        practice = null;
        render(back);
      },
    });
  },
  async startInput(deviceId) {
    try {
      const d = await input.start(deviceId);
      setSetting('inputDeviceId', d.id);
      input.setGain(getSettings().inputGain);
      return d;
    } catch (e) {
      console.error(e);
      toast('Gitar girişi açılamadı: ' + (e?.message || e));
      return null;
    }
  },
};

function currentRoute() {
  const r = location.hash.replace(/^#\/?/, '');
  return ROUTES[r] ? r : 'ana';
}

function render(route = currentRoute()) {
  if (practice) {
    practice.destroy();
    practice = null;
  }
  if (pageCleanup) pageCleanup();
  pageCleanup = null;
  document.querySelectorAll('.side a').forEach((a) => a.classList.toggle('active', a.dataset.route === route));
  view.innerHTML = '';
  view.scrollTop = 0;
  const cleanup = ROUTES[route](view, app);
  if (typeof cleanup === 'function') pageCleanup = cleanup;
  view.focus({ preventScroll: true });
}

function updateInputStatus() {
  const el = document.getElementById('inputStatus');
  el.classList.toggle('on', input.running);
  el.querySelector('.txt').textContent = input.running ? shortName(input.deviceLabel) : 'Gitar bağlı değil';
  el.title = input.running ? input.deviceLabel : '';
}
const shortName = (l) => (l || 'Ses girişi').replace(/\s*\([0-9a-f]{4}:[0-9a-f]{4}\)\s*$/i, '').slice(0, 28);

function setupUpdates() {
  const box = document.getElementById('updateBox');
  const v = app.info?.version ? `Sürüm ${app.info.version}` : '';
  box.textContent = v;
  window.gitar.update.onStatus((s) => {
    if (s.state === 'downloading') box.textContent = `Yeni sürüm iniyor… %${s.percent ?? 0}`;
    else if (s.state === 'available') box.textContent = `Yeni sürüm bulundu (${s.version})`;
    else if (s.state === 'ready') {
      box.innerHTML = `${esc(s.version)} sürümü hazır<button class="btn primary">Yeniden başlat</button>`;
      box.querySelector('button').onclick = () => window.gitar.update.install();
      toast('Yeni sürüm indirildi. Kapatıp açınca kurulur.');
    } else if (s.state === 'latest') box.textContent = `${v} · güncel`;
    else if (s.state === 'error') box.textContent = `${v} · güncelleme denetlenemedi`;
  });
}

async function boot() {
  try {
    await loadAll();
  } catch (e) {
    console.error('Ayarlar okunamadı', e);
  }
  try {
    app.info = await window.gitar.app.info();
  } catch {
    app.info = { version: '?', soundfont: false };
  }
  setSoundFont(app.info.soundfont);
  setupUpdates();
  input.addEventListener('change', updateInputStatus);
  input.addEventListener('lost', () => toast('Gitar girişi kesildi. Kabloyu kontrol et.'));
  updateInputStatus();

  // Önce ekranı çiz; gitar girişi arka planda aransın (takılırsa ekran boş kalmasın)
  window.addEventListener('hashchange', () => render());
  render();
  autoStartInput();
}

async function autoStartInput() {
  const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('zaman aşımı')), ms))]);
  try {
    const devices = await withTimeout(input.listDevices(), 8000);
    const saved = devices.find((d) => d.id === getSettings().inputDeviceId);
    const best = saved || input.pickBest(devices.filter((d) => /blackstar|id:?\s*core/i.test(d.label)));
    if (best) await withTimeout(app.startInput(best.id), 8000);
  } catch (e) {
    console.warn('Giriş otomatik açılamadı', e);
  }
  try {
    navigator.mediaDevices.addEventListener('devicechange', async () => {
      if (input.running) return;
      const devices = await input.listDevices();
      const bs = devices.find((d) => /blackstar|id:?\s*core/i.test(d.label));
      if (bs) {
        await app.startInput(bs.id);
        toast('Blackstar bağlandı, dinliyorum.');
      }
    });
  } catch {
    /* ses aygıtı desteği yoksa geç */
  }
}

// Beklenmeyen bir hata olursa boş ekran yerine ne olduğunu göster
function showFatal(msg) {
  if (view.childElementCount) return toast('Hata: ' + msg, 6000);
  view.innerHTML = `<div class="page"><h1>Bir sorun çıktı</h1><p class="muted">Bu yazının fotoğrafını Claude'a gönder:</p><pre style="white-space:pre-wrap;color:var(--coral)">${esc(msg)}</pre></div>`;
}
window.addEventListener('error', (e) => showFatal(`${e.message} (${e.filename?.split('/').pop()}:${e.lineno})`));
window.addEventListener('unhandledrejection', (e) => showFatal(String(e.reason?.stack || e.reason)));

window.__input = input; // testler için
boot();
