// Ayarlar: gitar girişi, seviye, gecikme, zorluk, güncelleme.
import { input } from '../audio/input.js';
import { getSettings, setSetting } from '../lib/store.js';
import { label as noteLabel } from '../music/notes.js';
import { h, esc, toast } from '../lib/dom.js';

export function renderSettings(root, app) {
  const s = getSettings();
  const seg = (key, opts) =>
    `<div class="seg" data-seg="${key}">${opts.map(([v, l]) => `<button data-v="${v}" class="${String(s[key]) === String(v) ? 'sel' : ''}">${l}</button>`).join('')}</div>`;

  const page = h(`
    <div class="page">
      <div class="page-head"><div><h1>Ayarlar</h1></div></div>

      <div class="panel" style="display:flex;flex-direction:column;gap:20px">
        <h2>Gitar girişi</h2>
        <div class="field">
          <label for="dev">Ses girişi</label>
          <div class="row">
            <select id="dev" style="flex:1"><option>Aranıyor…</option></select>
            <button class="btn" data-a="refresh">Yenile</button>
            <button class="btn" data-a="toggle">${input.running ? 'Durdur' : 'Dinlemeye başla'}</button>
          </div>
          <div class="hint">Blackstar ID:Core USB ile bağlıysa listede "Blackstar" ya da "USB Audio" olarak görünür. Görmüyorsan kabloyu çıkarıp tak, sonra Yenile'ye bas.</div>
        </div>
        <div class="field">
          <label>Giriş seviyesi</label>
          <div class="meter"><i data-r="meter"></i></div>
          <div class="row small"><span class="muted">Duyulan nota:</span><b data-r="note">–</b></div>
          <div class="hint">Bir tel çaldığında çubuk yarıya kadar dolmalı. Çok düşükse amfideki USB kayıt seviyesini artır ya da aşağıdaki kazancı yükselt.</div>
        </div>
        <div class="field">
          <label for="gain">Yazılım kazancı: <span data-r="gainv">${s.inputGain.toFixed(1)}×</span></label>
          <input id="gain" type="range" min="0.5" max="6" step="0.1" value="${s.inputGain}" />
        </div>
      </div>

      <div class="settings-grid">
        <div class="panel field">
          <h2>Zorluk</h2>
          ${seg('difficulty', [['kolay', 'Kolay'], ['normal', 'Normal'], ['zor', 'Zor']])}
          <div class="hint">Notaya ne kadar erken ya da geç basarsan kabul edileceğini belirler. Kolay: ±0,23 sn · Normal: ±0,16 sn · Zor: ±0,10 sn.</div>
        </div>
        <div class="panel field">
          <h2>Gecikme düzeltmesi</h2>
          <label for="lat"><span data-r="latv">${s.latencyMs}</span> ms</label>
          <input id="lat" type="range" min="0" max="250" step="5" value="${s.latencyMs}" />
          <div class="hint">Tam zamanında çaldığın halde sürekli "geç" diyorsa bu değeri artır, "erken" diyorsa azalt.</div>
        </div>
        <div class="panel field">
          <h2>Nota akış hızı</h2>
          <input id="zoom" type="range" min="0.1" max="0.45" step="0.01" value="${s.zoom}" />
          <div class="hint">Notaların ekranda ne kadar aralıklı aktığı. Şarkının hızını değiştirmez.</div>
        </div>
        <div class="panel field">
          <h2>Eşlik</h2>
          <label for="vol">Ses seviyesi</label>
          <input id="vol" type="range" min="0.1" max="1.5" step="0.05" value="${s.volume}" />
          <label class="row"><input type="checkbox" id="countIn" ${s.countIn ? 'checked' : ''}/> Başlamadan önce bir ölçü say</label>
        </div>
      </div>

      <div class="panel field">
        <h2>Uygulama</h2>
        <p class="muted">Sürüm ${esc(app.info?.version || '?')} · ${app.info?.soundfont ? 'Gerçekçi enstrüman sesleri (GeneralUser GS) yüklü' : 'Basit enstrüman sesleri kullanılıyor'}</p>
        <div class="row">
          <button class="btn" data-a="update">Güncellemeleri denetle</button>
          <button class="btn ghost" data-a="releases">Sürüm notları</button>
        </div>
        <div class="hint">Program her açılışta güncellemeye bakar; yeni sürüm arka planda iner ve kapatıp açınca kurulur.</div>
      </div>
    </div>`);
  root.appendChild(page);
  const $ = (r) => page.querySelector(`[data-r="${r}"]`);
  const sel = page.querySelector('#dev');

  async function fillDevices() {
    const devices = await input.listDevices();
    sel.innerHTML = devices.map((d) => `<option value="${esc(d.id)}">${esc(d.label)}</option>`).join('') || '<option value="">Ses girişi bulunamadı</option>';
    const cur = input.deviceId || getSettings().inputDeviceId || input.pickBest(devices)?.id;
    if (cur) sel.value = cur;
  }
  fillDevices();

  sel.onchange = async () => {
    const d = await app.startInput(sel.value);
    if (d) toast('Dinleniyor: ' + d.label);
    page.querySelector('[data-a="toggle"]').textContent = 'Durdur';
  };
  page.querySelector('[data-a="refresh"]').onclick = fillDevices;
  page.querySelector('[data-a="toggle"]').onclick = async (e) => {
    if (input.running) {
      await input.stop();
      e.target.textContent = 'Dinlemeye başla';
    } else {
      const d = await app.startInput(sel.value);
      if (d) e.target.textContent = 'Durdur';
    }
  };
  page.querySelector('#gain').oninput = (e) => {
    const v = Number(e.target.value);
    setSetting('inputGain', v);
    input.setGain(v);
    $('gainv').textContent = v.toFixed(1) + '×';
  };
  page.querySelector('#lat').oninput = (e) => {
    setSetting('latencyMs', Number(e.target.value));
    $('latv').textContent = e.target.value;
  };
  page.querySelector('#zoom').oninput = (e) => setSetting('zoom', Number(e.target.value));
  page.querySelector('#vol').oninput = (e) => setSetting('volume', Number(e.target.value));
  page.querySelector('#countIn').onchange = (e) => setSetting('countIn', e.target.checked);
  page.querySelectorAll('[data-seg]').forEach((g) => {
    g.querySelectorAll('button').forEach((b) => {
      b.onclick = () => {
        setSetting(g.dataset.seg, b.dataset.v);
        g.querySelectorAll('button').forEach((x) => x.classList.toggle('sel', x === b));
      };
    });
  });
  page.querySelector('[data-a="update"]').onclick = async () => {
    const r = await window.gitar.update.check();
    toast(r.state === 'dev' ? 'Geliştirme sürümünde güncelleme yok' : r.state === 'error' ? 'Denetlenemedi: ' + r.message : 'Denetleniyor…');
  };
  page.querySelector('[data-a="releases"]').onclick = () => window.gitar.app.openReleases();

  let raf = 0;
  const frame = () => {
    const st = input.state;
    $('meter').style.width = `${Math.round(st.level * 100)}%`;
    $('note').textContent = st.midi != null ? noteLabel(st.midi) : '–';
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(raf);
}
