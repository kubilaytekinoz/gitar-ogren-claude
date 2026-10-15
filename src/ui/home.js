// "Bugün" sayfası: seri, haftalık takvim, günün ısınması, son şarkı.
import { getProgress, today, dayNumber, dayKey, dayStatus, streak } from '../lib/store.js';
import { dailyRoutine } from '../music/warmups.js';
import { input } from '../audio/input.js';
import { h, esc } from '../lib/dom.js';
import { startWarmup } from './warmup.js';

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
  const routine = dailyRoutine(dayNumber());
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
