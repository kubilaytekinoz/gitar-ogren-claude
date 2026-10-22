// "Bugün" sayfası: seri, haftalık takvim, günün ısınması, son şarkı.
import { getProgress, today, dayNumber, dayKey, dayStatus, streak } from '../lib/store.js';
import { dailyRoutine, WARMUPS } from '../music/warmups.js';
import { input } from '../audio/input.js';
import { h, esc } from '../lib/dom.js';
import { startWarmup } from './warmup.js';
import { PHASES, currentPhase, goalStatus, setPhase, daysInPhase, todayRoutine } from '../music/path.js';
import { playSong } from './songs.js';

const DAYS = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
const routineIds = (d) => dailyRoutine(dayNumber(d)).map((w) => w.id);

function greeting() {
  const hr = new Date().getHours();
  if (hr < 6) return 'Gece çalışması';
  if (hr < 12) return 'Günaydın';
  if (hr < 18) return 'İyi günler';
  return 'İyi akşamlar';
}

export function renderHome(root, app) {
  const p = getProgress();
  const t = today();
  const routine = todayRoutine(t);
  const doneCount = routine.filter((w) => t.warmups[w.id] != null).length;
  const st = streak(routineIds);
  const minutes = Math.round(t.seconds / 60);
  const totalMin = Math.round(Object.values(p.days).reduce((a, d) => a + (d.seconds || 0), 0) / 60);

  const week = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const status = dayStatus(dayKey(d), routineIds(d));
    week.push(`<div class="d ${status === 'done' ? 'done' : status === 'part' ? 'part' : ''} ${i === 0 ? 'today' : ''}"><i></i>${DAYS[d.getDay()]}</div>`);
  }

  const headline =
    doneCount === routine.length
      ? 'Bugünün ısınması tamam. Şimdi bir şarkı çal.'
      : doneCount
        ? `Isınmada ${routine.length - doneCount} egzersiz kaldı.`
        : 'Önce 5 dakikalık ısınma, sonra şarkı.';

  const page = h(`
    <div class="page">
      <div class="page-head">
        <div>
          <h1>${greeting()}</h1>
          <p class="muted">${headline}</p>
        </div>
      </div>

      ${input.running ? '' : `
      <div class="panel connect-card">
        <h2>Gitarını bağla</h2>
        <ol class="muted">
          <li>Blackstar ID:Core'u arkadaki USB girişinden bilgisayara tak.</li>
          <li>Amfiyi aç, gitarı amfiye bağla.</li>
          <li>Ayarlar'da girişi seç ve bir tel çal; ses çubuğu hareket etmeli.</li>
        </ol>
        <a class="btn primary" href="#/ayarlar">Girişi ayarla</a>
      </div>`}

      ${pathPanel()}

      <div class="today-hero">
        <div class="streak">
          <span class="num">${st}</span>
          <span>günlük seri</span>
          <div class="week">${week.join('')}</div>
          <div class="goal">
            <div class="g"><span>Isınma <b>${doneCount}/${routine.length}</b></span><div class="meter"><i style="width:${Math.round((doneCount / routine.length) * 100)}%"></i></div></div>
            <div class="g"><span>Çalışma <b>${Math.min(minutes, 10)}/10 dk</b></span><div class="meter"><i style="width:${Math.min(100, minutes * 10)}%"></i></div></div>
            <span class="small muted">İkisinden biri tamamlanınca gün seriye eklenir.</span>
          </div>
        </div>
        <div class="panel" style="flex:1">
          <div class="row">
            <h2>Günün ısınması</h2>
            <div class="spacer"></div>
            <span class="muted small">${doneCount}/${routine.length}</span>
          </div>
          <div class="routine">
            ${routine.map((w) => {
              const acc = t.warmups[w.id];
              const tempo = p.warmupTempo[w.id] ?? w.startTempo;
              return `<div class="routine-item ${acc != null ? 'done' : ''}">
                <span class="check">${acc != null ? '✓' : ''}</span>
                <div><div class="t">${esc(w.title)}</div><div class="s">${esc(w.focus)}</div></div>
                <span class="tempo-pill">${acc != null ? `%${acc}` : `${tempo} BPM`}</span>
                <button class="btn ${acc != null ? 'ghost' : ''}" data-w="${w.id}">${acc != null ? 'Tekrar' : 'Başla'}</button>
              </div>`;
            }).join('')}
          </div>
          ${doneCount < routine.length ? '<div class="row" style="margin-top:14px"><button class="btn primary" data-a="all">Isınmaya başla</button><span class="muted small">Üç egzersiz arka arkaya, toplam ~5 dakika</span></div>' : ''}
        </div>
      </div>

      <div class="grid2">
        <div class="panel">
          <h2>Çalışma süren</h2>
          <div class="stat-row">
            <div><b>${minutes} dk</b><span class="muted small">bugün</span></div>
            <div><b>${totalMin} dk</b><span class="muted small">toplam</span></div>
            <div><b>${Object.keys(p.songBest).length}</b><span class="muted small">çalınan şarkı</span></div>
          </div>
        </div>
        <div class="panel">
          <h2>Şarkı çal</h2>
          <p class="muted small" style="margin:6px 0 14px">Hazır şarkılardan birini seç ya da kendi Guitar Pro dosyanı ekle.</p>
          <a class="btn" href="#/sarkilar">Şarkılara git</a>
        </div>
      </div>
    </div>`);
  root.appendChild(page);

  wirePath(page, app, () => { root.innerHTML = ''; renderHome(root, app); });

  page.querySelectorAll('[data-w]').forEach((b) => {
    b.onclick = () => {
      const idx = routine.findIndex((w) => w.id === b.dataset.w);
      startWarmup(app, routine, idx, true);
    };
  });
  const all = page.querySelector('[data-a="all"]');
  if (all) {
    all.onclick = () => {
      const first = routine.findIndex((w) => t.warmups[w.id] == null);
      startWarmup(app, routine, Math.max(0, first), true);
    };
  }
}

function pathPanel() {
  const ph = currentPhase();
  const goals = goalStatus(ph);
  const done = goals.every((g) => g.done);
  const days = daysInPhase();
  const steps = PHASES.map((x) => `<span class="ph ${x.n < ph.n ? 'done' : x.n === ph.n ? 'cur' : ''}" title="${esc(x.title)}">${x.n}</span>`).join('');
  return `
    <div class="panel path">
      <div class="row">
        <div class="phases">${steps}</div>
        <div><h2>Faz ${ph.n} · ${esc(ph.title)}</h2><div class="muted small">${esc(ph.weeks)} · ${esc(ph.focus)}</div></div>
      </div>
      <div class="path-goals">
        ${goals.map((g) => `<div class="g ${g.done ? 'done' : ''}">
          <span>${g.done ? '✓ ' : ''}${esc(g.title)} <b>${g.best || 0}/${g.tempo} BPM</b></span>
          <div class="meter"><i style="width:${Math.min(100, Math.round(((g.best || 0) / g.tempo) * 100))}%"></i></div>
          ${g.done ? '' : `<button class="btn ghost small" data-goal="${g.warmup}">Çalış</button>`}
        </div>`).join('')}
      </div>
      <div class="muted small">Hedef: egzersizi en az %90 doğrulukla o tempoda çalmak. Tempo başarına göre kendiliğinden artar.</div>
      ${ph.songs.length ? `<div class="row path-songs"><span class="muted small">Bu fazın şarkıları:</span>${ph.songs.map((id) => `<button class="btn small" data-song="${esc(id)}">${esc(songName(id))}</button>`).join('')}</div>` : ''}
      ${!done && days >= 8 ? `<div class="path-tip"><b>${days} gündür bu fazdasın.</b> ${esc(ph.stuck)}</div>` : ''}
      <div class="row">
        ${done && ph.n < PHASES.length ? `<button class="btn primary" data-phase="${ph.n + 1}">Faz ${ph.n + 1}'e geç</button><span class="muted small">Hedefler tamam, tebrikler!</span>` : ''}
        <div class="spacer"></div>
        ${ph.n > 1 ? `<button class="btn ghost small" data-phase="${ph.n - 1}">← Önceki faz</button>` : ''}
        ${!done && ph.n < PHASES.length ? `<button class="btn ghost small" data-phase="${ph.n + 1}">Sonraki faza atla →</button>` : ''}
      </div>
    </div>`;
}

const SONG_NAMES = {
  'b:01-daha-dun-annemizin.atex': 'Daha Dün Annemizin',
  'b:02-ege-ruzgari.atex': 'Ege Rüzgârı',
  'b:03-power-chord-yolu.atex': 'Power Chord Yolu',
  'b:riff-01-bozkir-riffi.atex': 'Bozkır Riffi',
  'b:riff-02-palm-mute-yolu.atex': 'Palm Mute Yolu',
  'b:riff-03-hicaz-riffi.atex': 'Hicaz Riffi',
  'b:riff-04-pentatonik-lick.atex': 'Pentatonik Lick',
  'b:riff-05-hammer-pull.atex': 'Hammer-on & Pull-off',
  'b:riff-06-kurdi-solo.atex': 'Kürdi Solo',
  'b:riff-07-uzun-hava-solo.atex': 'Ağır Solo',
  'b:riff-08-hizli-pena.atex': 'Hızlı Pena',
};
const songName = (id) => SONG_NAMES[id] || id.replace(/^b:|\.atex$/g, '');

function wirePath(page, app, rerender) {
  page.querySelectorAll('[data-phase]').forEach((b) => {
    b.onclick = () => {
      const n = Number(b.dataset.phase);
      if (n > currentPhase().n && !goalStatus().every((g) => g.done) && !confirm('Hedefler henüz tamam değil. Yine de sonraki faza geçilsin mi?')) return;
      setPhase(n);
      rerender();
    };
  });
  page.querySelectorAll('[data-goal]').forEach((b) => {
    b.onclick = () => startWarmup(app, WARMUPS, WARMUPS.findIndex((w) => w.id === b.dataset.goal), false);
  });
  page.querySelectorAll('[data-song]').forEach((b) => {
    b.onclick = async () => {
      const song = (await window.gitar.songs.list()).find((s) => s.id === b.dataset.song);
      if (song) playSong(app, song);
    };
  });
}
